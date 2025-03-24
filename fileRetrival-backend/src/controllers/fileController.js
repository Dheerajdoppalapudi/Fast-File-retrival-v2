import path from "path"
import fs from "fs"
import { fileURLToPath } from "url";
import db from "../models/prismaClient.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const ROOT_DIRECTORY = path.join(__dirname, "../../Uploads");
export const VERSION_DIR = path.join(__dirname, "../../Uploads", "Archive");

if (!fs.existsSync(ROOT_DIRECTORY)) fs.mkdirSync(ROOT_DIRECTORY, { recursive: true });
if (!fs.existsSync(VERSION_DIR)) fs.mkdirSync(VERSION_DIR, { recursive: true });


export const getFiles = async (req, res) => {
    try {
        const folderPath = req.query.path || "";
        const userId = req.user.userId;
        const userRole = req.user.role;

        // Normalize the path to ensure consistent format
        const normalizedPath = folderPath ? ('/' + folderPath.split('/').filter(Boolean).join('/')) : "";
        
        // Admin access check shortcut
        const isAdmin = userRole === 'ADMIN';

        // Get current directory info - now directly by path
        let currentDirectory = null;
        if (normalizedPath !== "") {
            currentDirectory = await db.directory.findUnique({
                where: { path: normalizedPath },
                include: {
                    creator: {
                        select: {
                            id: true,
                            username: true,
                            role: true
                        }
                    },
                    permissions: {
                        where: {
                            userId
                        }
                    },
                    parent: {
                        select: {
                            id: true,
                            name: true,
                            path: true,
                            parentId: true,
                            createdAt: true
                        }
                    }
                }
            });

            if (!currentDirectory) {
                return res.status(404).json({ error: "Directory not found in database" });
            }

            // Check permission to access this directory
            const isOwner = currentDirectory.createdBy === userId;
            const hasPermission = isAdmin ||
                isOwner ||
                (currentDirectory.permissions && currentDirectory.permissions.length > 0);

            if (!hasPermission) {
                // Check permission on any parent directory that cascades permissions
                const hasParentPermission = await checkParentDirectoryPermission(normalizedPath, userId);

                if (!hasParentPermission) {
                    return res.status(403).json({
                        error: "Access denied",
                        message: "You don't have permission to access this directory"
                    });
                }
            }
        }

        // Get parent directory info - now simplified with the parent relation
        const parentDirectory = currentDirectory?.parent || null;

        // Get subdirectories with permission filtering - simplified with parentId
        const subdirectories = await db.directory.findMany({
            where: {
                parentId: currentDirectory?.id || null // Null for root directories
            },
            include: {
                creator: {
                    select: {
                        id: true,
                        username: true,
                        role: true
                    }
                },
                permissions: {
                    where: {
                        userId
                    }
                }
            }
        });

        // For non-admins, check for cascading permissions from parent directories
        let userHasParentPermission = false;
        if (!isAdmin && currentDirectory) {
            // If the user has permission on the current directory, all subdirectories are accessible
            userHasParentPermission = currentDirectory.createdBy === userId ||
                (currentDirectory.permissions && currentDirectory.permissions.length > 0);
        }

        // Filter subdirectories based on permissions for non-admins
        const accessibleDirectories = isAdmin || userHasParentPermission ?
            subdirectories :
            subdirectories.filter(dir =>
                dir.createdBy === userId || // User is the owner
                (dir.permissions && dir.permissions.length > 0) // User has explicit permission
            );

        // Get files in the current directory - using directoryId
        const dbFiles = await db.file.findMany({
            where: { 
                directoryId: currentDirectory?.id || null 
            },
            include: {
                creator: {
                    select: {
                        id: true,
                        username: true,
                        role: true
                    }
                },
                versions: {
                    orderBy: { versionNumber: "desc" },
                    include: {
                        creator: {
                            select: {
                                id: true,
                                username: true
                            }
                        }
                    }
                },
                approval: {
                    select: {
                        approvedAt: true,
                        approver: {
                            select: {
                                id: true,
                                username: true
                            }
                        }
                    }
                },
                permissions: {
                    where: {
                        userId
                    }
                }
            }
        });

        // Non-admins need additional permission checking for files
        const accessibleFiles = isAdmin || userHasParentPermission ?
            dbFiles :
            dbFiles.filter(file =>
                file.createdBy === userId || // User is the owner
                (file.permissions && file.permissions.length > 0) // User has explicit permission
            );

        // Format directory data - now with path from database
        const directories = accessibleDirectories.map(dir => ({
            id: dir.id,
            name: dir.name,
            path: dir.path, // Using the stored path instead of building it
            createdAt: dir.createdAt,
            createdBy: dir.creator ? {
                id: dir.creator.id,
                username: dir.creator.username,
                role: dir.creator.role
            } : null,
            permissions: dir.permissions || [],
            permissionType: dir.permissions && dir.permissions.length > 0 ? dir.permissions[0].permissionType : null,
            hasPermission: true, // All directories in this list are accessible
            isOwner: dir.createdBy === userId
        }));

        // Format file data
        const files = accessibleFiles.map(file => {
            const filePermissions = file.permissions || [];
            const currentDirPermissions = currentDirectory?.permissions || [];
            
            return {
                id: file.id,
                name: file.name,
                path: file.path,
                createdDate: file.createdAt,
                approvalStatus: file.approvalStatus,
                uploadedBy: file.creator ? {
                    id: file.creator.id,
                    username: file.creator.username,
                    role: file.creator.role
                } : null,
                approvedBy: file.approval?.approver ? {
                    id: file.approval.approver.id,
                    username: file.approval.approver.username
                } : null,
                approvedAt: file.approval?.approvedAt || null,
                versions: file.versions.map(v => ({
                    versionNumber: v.versionNumber,
                    filePath: v.filePath,
                    createdAt: v.createdAt,
                    version: v.versionNumber,
                    createdBy: v.creator?.username || "Unknown"
                })),
                permissions: filePermissions,
                permissionType: filePermissions.length > 0 ? filePermissions[0].permissionType : null,
                hasPermission: true, // All files in this list are accessible
                isOwner: file.createdBy === userId,
                canEdit: isAdmin ||
                    file.createdBy === userId ||
                    filePermissions.some(p => p.permissionType === 'WRITE') ||
                    (userHasParentPermission && currentDirPermissions.some(p => p.permissionType === 'WRITE'))
            };
        });

        // Check if physical directory exists
        const fullPath = path.join(ROOT_DIRECTORY, folderPath);
        const physicalDirectoryExists = fs.existsSync(fullPath);

        // Create directory if it doesn't exist but is in the database
        if (!physicalDirectoryExists && currentDirectory) {
            try {
                fs.mkdirSync(fullPath, { recursive: true });
                console.log(`Created physical directory: ${fullPath}`);
            } catch (err) {
                console.error(`Error creating physical directory: ${err.message}`);
            }
        }

        res.status(200).json({
            currentDirectory: currentDirectory ? {
                id: currentDirectory.id,
                name: currentDirectory.name,
                path: currentDirectory.path,
                createdAt: currentDirectory.createdAt,
                createdBy: currentDirectory.creator ? {
                    id: currentDirectory.creator.id,
                    username: currentDirectory.creator.username,
                    role: currentDirectory.creator.role
                } : null,
                isOwner: currentDirectory.createdBy === userId,
                permissions: currentDirectory.permissions || [],
                permissionType: currentDirectory.permissions?.length > 0
                    ? currentDirectory.permissions[0].permissionType
                    : null
            } : {
                id: null,
                name: "Root",
                path: "",
                createdAt: null,
                createdBy: null,
                isOwner: false,
                permissions: []
            },
            parentDirectory,
            directories,
            files,
            userAccess: {
                isAdmin,
                userId,
                hasParentPermission: userHasParentPermission
            }
        });
    } catch (error) {
        console.error("Error retrieving files:", error);
        res.status(500).json({ error: "Error retrieving files", details: error.message });
    }
};

// Updated helper function for checking parent directory permissions
async function checkParentDirectoryPermission(dirPath, userId) {
    if (!dirPath) return false;

    // Get all parent paths
    const pathParts = dirPath.split('/').filter(Boolean);
    const parentPaths = [];
    
    // Build up all possible parent paths
    for (let i = 1; i <= pathParts.length; i++) {
        const partialPath = '/' + pathParts.slice(0, i).join('/');
        parentPaths.push(partialPath);
    }
    
    // Sort from deepest to shallowest (closest parents first)
    parentPaths.sort((a, b) => b.length - a.length);
    
    // Check each parent path for permissions
    for (const parentPath of parentPaths) {
        const parentDir = await db.directory.findUnique({
            where: { path: parentPath },
            include: {
                permissions: {
                    where: {
                        userId,
                        cascadeToChildren: true
                    }
                }
            }
        });

        if (parentDir && parentDir.permissions && parentDir.permissions.length > 0) {
            return true;
        }
    }

    return false;
}

export const uploadFile = async (req, res) => {
    try {
        const { folderPath, description } = req.body;
        const userId = req.user.userId;
        const userRole = req.user.role;

        if (!req.file) {
            return res.status(400).json({ error: "No file uploaded." });
        }

        // Normalize the path to ensure consistent format
        const normalizedPath = folderPath ? ('/' + folderPath.split('/').filter(Boolean).join('/')) : "";

        // Find the directory by path
        let directory = null;
        if (normalizedPath) {
            directory = await db.directory.findUnique({
                where: { path: normalizedPath },
                include: {
                    permissions: {
                        where: {
                            userId,
                            permissionType: 'WRITE'
                        }
                    }
                }
            });

            if (!directory) {
                return res.status(404).json({ error: "Directory not found in database" });
            }

            // Check permission to write to this directory (if not admin)
            if (userRole !== 'ADMIN') {
                const isOwner = directory.createdBy === userId;
                const hasWritePermission = directory.permissions && directory.permissions.length > 0;

                if (!isOwner && !hasWritePermission) {
                    // Check parent directories for cascading write permissions
                    const hasParentWritePermission = await checkParentDirectoryWritePermission(normalizedPath, userId);
                    
                    if (!hasParentWritePermission) {
                        return res.status(403).json({
                            error: "Access denied",
                            message: "You don't have permission to upload files to this directory"
                        });
                    }
                }
            }
        }

        // Set up file paths
        const fileSavePath = path.join(ROOT_DIRECTORY, folderPath);
        const fileSaveVersionPath = path.join(VERSION_DIR, folderPath);
        const newFilePath = path.join(fileSavePath, req.file.originalname);
        const versionFilePath = path.join(fileSaveVersionPath, req.file.originalname);

        // Ensure directories exist
        if (!fs.existsSync(fileSavePath)) {
            fs.mkdirSync(fileSavePath, { recursive: true });
        }
        if (!fs.existsSync(fileSaveVersionPath)) {
            fs.mkdirSync(fileSaveVersionPath, { recursive: true });
        }

        // Check if file already exists
        let existingFile = await db.file.findUnique({
            where: { path: newFilePath }
        });

        let fileId;
        if (existingFile) {
            fileId = existingFile.id;

            // Find the latest version of the file
            const latestVersion = await db.version.findMany({
                where: { fileId },
                orderBy: { versionNumber: "desc" },
                take: 1
            });

            const newVersionNumber = latestVersion.length ? latestVersion[0].versionNumber + 1 : 1;

            // Create proper versioned file name
            const fileExt = path.extname(req.file.originalname);
            const fileName = path.basename(req.file.originalname, fileExt);
            const versionedFileName = `${fileName}_v${newVersionNumber}${fileExt}`;
            const versionedFilePath = path.join(fileSaveVersionPath, versionedFileName);

            // Move the existing file to the versions directory
            if (fs.existsSync(newFilePath)) {
                fs.copyFileSync(newFilePath, versionedFilePath);
            }

            // Create a new version record
            await db.version.create({
                data: {
                    fileId,
                    filePath: versionedFilePath,
                    versionNumber: newVersionNumber,
                    createdBy: userId,
                    description: description || `Version ${newVersionNumber}`
                }
            });

            // Update the existing file record
            await db.file.update({
                where: { id: fileId },
                data: {
                    description: description || existingFile.description, // Update description if provided
                    approvalStatus: userRole === "ADMIN" ? "APPROVED" : "PENDING",
                    approvedBy: userRole === "ADMIN" ? userId : null
                }
            });

            console.log(`Existing file versioned as: ${versionedFilePath}`);
        } else {
            // Determine approval status based on user role
            const approvalStatus = userRole === "ADMIN" ? "APPROVED" : "PENDING";
            const approvedBy = userRole === "ADMIN" ? userId : null;

            // Create a new file entry in DB with directoryId
            // No version created for first-time uploads
            const newFile = await db.file.create({
                data: {
                    name: req.file.originalname,
                    description: description, // Add description from request body
                    path: newFilePath,
                    directoryId: directory?.id || null, // Use directoryId instead of directory path string
                    directoryPath: normalizedPath, // Store the normalized path for reference
                    createdBy: userId,
                    approvedBy,
                    approvalStatus,
                    // Create approval entry in the same transaction
                    approval: {
                        create: {
                            approvedBy,
                            approvedAt: approvedBy ? new Date() : null
                        }
                    }
                }
            });

            fileId = newFile.id;

            // Copy any directory permissions that should apply to files
            if (directory) {
                const directoryPermissions = await db.permission.findMany({
                    where: {
                        directoryId: directory.id,
                        resourceType: 'DIRECTORY',
                        cascadeToChildren: true
                    }
                });

                // Create equivalent file permissions
                for (const dirPerm of directoryPermissions) {
                    await db.permission.create({
                        data: {
                            permissionType: dirPerm.permissionType,
                            resourceType: 'FILE',
                            userId: dirPerm.userId,
                            fileId: newFile.id,
                            grantedBy: userId,
                            cascadeToChildren: false // Files don't have children
                        }
                    });
                }
            }
        }

        // Write the uploaded file
        fs.writeFileSync(newFilePath, req.file.buffer);

        res.status(201).json({
            message: "File uploaded successfully",
            filePath: newFilePath,
            fileId,
            description
        });

    } catch (error) {
        console.error("Error uploading file:", error);
        res.status(500).json({ error: "Error uploading file", details: error.message });
    }
};

// Helper function to check parent directories for write permissions
async function checkParentDirectoryWritePermission(dirPath, userId) {
    if (!dirPath) return false;

    // Get all parent paths
    const pathParts = dirPath.split('/').filter(Boolean);
    const parentPaths = [];
    
    // Build up all possible parent paths
    for (let i = 1; i <= pathParts.length; i++) {
        const partialPath = '/' + pathParts.slice(0, i).join('/');
        parentPaths.push(partialPath);
    }
    
    // Sort from deepest to shallowest (closest parents first)
    parentPaths.sort((a, b) => b.length - a.length);
    
    // Check each parent path for WRITE permissions
    for (const parentPath of parentPaths) {
        const parentDir = await db.directory.findUnique({
            where: { path: parentPath },
            include: {
                permissions: {
                    where: {
                        userId,
                        permissionType: 'WRITE',
                        cascadeToChildren: true
                    }
                }
            }
        });

        if (parentDir && parentDir.permissions && parentDir.permissions.length > 0) {
            return true;
        }
    }

    return false;
}

export const getFileContent = async (req, res) => {
    try {
        const requestedPath = req.query.path;

        if (!requestedPath) {
            return res.status(400).json({ error: 'File path is required' });
        }

        // Ensure the path doesn't contain potentially malicious path traversal
        if (requestedPath.includes('..')) {
            return res.status(400).json({ error: 'Invalid file path' });
        }

        // Validate that the path is within the allowed directories
        const normalizedPath = path.normalize(requestedPath);
        const fullPath = normalizedPath;

        // Verify the path is within the allowed directory (either ROOT_DIRECTORY or VERSION_DIR)
        const isInRootDir = fullPath.startsWith(path.resolve(ROOT_DIRECTORY));
        const isInVersionDir = fullPath.startsWith(path.resolve(VERSION_DIR));

        if (!isInRootDir && !isInVersionDir) {
            return res.status(403).json({ error: 'Access denied: Path outside allowed directories' });
        }

        // Check if file exists
        if (!fs.existsSync(fullPath)) {
            return res.status(404).json({ error: 'File not found' });
        }

        // Get file stats to confirm it's a file
        const stats = fs.statSync(fullPath);
        if (!stats.isFile()) {
            return res.status(400).json({ error: 'Requested path is not a file' });
        }

        const ext = path.extname(fullPath).toLowerCase();
        const contentType = getContentType(ext);
        const responseFormat = req.query.format || 'default';

        // For binary files that need to be displayed in the browser (PDF, Word, Excel)
        if (isBinaryFileForDisplay(ext) && responseFormat === 'base64') {
            // Read the file as binary data and convert to base64
            const data = fs.readFileSync(fullPath);
            const base64Data = data.toString('base64');

            return res.json({
                content: base64Data,
                contentType
            });
        }

        // Handle binary files with streaming
        if (isBinaryFile(ext)) {
            if (responseFormat === 'json') {
                // Special case for request from front-end file viewer
                // Return a placeholder for binary content
                return res.json({
                    content: "Binary content - use binary endpoint to view this file",
                    contentType
                });
            }

            // For direct streaming (download or viewing)
            res.setHeader('Content-Type', contentType);
            res.setHeader('Content-Length', stats.size);

            return fs.createReadStream(fullPath).pipe(res);
        } else {
            // For text files, continue with previous approach
            const content = fs.readFileSync(fullPath, 'utf8');
            return res.json({
                content,
                contentType
            });
        }
    } catch (error) {
        console.error('Error serving file:', error);
        return res.status(500).json({
            error: 'Server error while processing file request',
            message: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

function getContentType(extension) {
    const types = {
        '.txt': 'text/plain',
        '.md': 'text/markdown',
        '.js': 'application/javascript',
        '.json': 'application/json',
        '.html': 'text/html',
        '.css': 'text/css',
        '.py': 'text/x-python',
        '.pdf': 'application/pdf',
        '.doc': 'application/msword',
        '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        '.ppt': 'application/vnd.ms-powerpoint',
        '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        '.xls': 'application/vnd.ms-excel',
        '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        '.csv': 'text/csv',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.gif': 'image/gif',
        '.svg': 'image/svg+xml',
    };

    return types[extension] || 'application/octet-stream';
}

function isBinaryFile(extension) {
    const binaryExtensions = [
        '.pdf', '.ppt', '.pptx', '.doc', '.docx',
        '.xls', '.xlsx', '.jpg', '.jpeg', '.png',
        '.gif', '.mp3', '.mp4', '.zip', '.rar'
    ];
    return binaryExtensions.includes(extension);
}

function isBinaryFileForDisplay(extension) {
    const displayableExtensions = [
        '.pdf', '.doc', '.docx', '.xls', '.xlsx',
        '.jpg', '.jpeg', '.png', '.gif', '.ppt', '.pptx'
    ];
    return displayableExtensions.includes(extension);
}

export const createDirectory = async (req, res) => {
    try {
        const { folderPath } = req.body;
        const userId = req.user.userId;
        const userRole = req.user.role;

        // Check if user has sufficient permissions
        if (userRole !== 'ADMIN' && userRole !== 'EDITOR') {
            return res.status(403).json({ message: "Permission denied. Only ADMIN and EDITOR roles can create directories." });
        }

        if (!folderPath) {
            return res.status(400).json({ message: "Directory path is required!" });
        }

        // Normalize the path to ensure consistent format
        // This makes sure we don't have double slashes, we always have leading slash, etc.
        const normalizedPath = '/' + folderPath.split('/').filter(Boolean).join('/');
        
        // Extract directory name and parent path
        const directoryName = path.basename(normalizedPath);
        const parentPath = path.dirname(normalizedPath);
        const parentPathNormalized = parentPath === '/' ? '' : parentPath;

        // Check if a directory with this path already exists
        const existingDirectory = await db.directory.findUnique({
            where: { path: normalizedPath }
        });

        if (existingDirectory) {
            return res.status(400).json({ 
                message: "Directory already exists!", 
                directory: existingDirectory 
            });
        }

        // Find the parent directory by path
        let parentDirectory = null;
        if (parentPathNormalized) {
            parentDirectory = await db.directory.findUnique({
                where: { path: parentPathNormalized }
            });

            if (!parentDirectory) {
                return res.status(404).json({ 
                    message: "Parent directory not found",
                    parentPath: parentPathNormalized
                });
            }

            // Check if user has permission to create in this parent directory
            if (userRole !== 'ADMIN') {
                const isParentOwner = parentDirectory.createdBy === userId;
                const hasWritePermission = await db.permission.findFirst({
                    where: {
                        directoryId: parentDirectory.id,
                        userId,
                        permissionType: 'WRITE'
                    }
                });

                if (!isParentOwner && !hasWritePermission) {
                    return res.status(403).json({ 
                        message: "You don't have permission to create directories in this location" 
                    });
                }
            }
        }

        // Create the physical directory
        const absfolderPath = path.join(ROOT_DIRECTORY, folderPath);
        if (!fs.existsSync(absfolderPath)) {
            fs.mkdirSync(absfolderPath, { recursive: true });
            console.log(`Created physical directory: ${absfolderPath}`);
        }

        // Create the directory in the database with the path field
        const newDirectory = await db.directory.create({
            data: {
                name: directoryName,
                path: normalizedPath,
                parentId: parentDirectory ? parentDirectory.id : null,
                createdBy: userId,
            },
            include: {
                creator: true,
            },
        });

        // Copy permissions from parent directory if it exists (CASCADE permissions)
        if (parentDirectory) {
            // Get all permissions from the parent that have cascadeToChildren=true
            const parentPermissions = await db.permission.findMany({
                where: {
                    directoryId: parentDirectory.id,
                    cascadeToChildren: true
                }
            });

            // Create the same permissions for the new directory
            for (const permission of parentPermissions) {
                await db.permission.create({
                    data: {
                        permissionType: permission.permissionType,
                        resourceType: 'DIRECTORY',
                        userId: permission.userId,
                        grantedBy: userId,
                        directoryId: newDirectory.id,
                        cascadeToChildren: true
                    }
                });
            }
        }

        res.status(201).json({
            message: "Directory created successfully",
            directoryPath: normalizedPath,
            directory: newDirectory,
        });
    } catch (error) {
        console.error("Error creating directory:", error);
        
        // Handle unique constraint violation
        if (error.code === 'P2002') {
            return res.status(400).json({ 
                message: "A directory with this name already exists in this location" 
            });
        }
        
        res.status(500).json({ message: "Error creating directory", error: error.message });
    }
};

export const deleteDirectory = async (req, res) => {
    try {
        const userId = req.user.userId;
        const userRole = req.user.role;
        const { folderPath } = req.body;

        if (userRole !== "ADMIN") {
            return res.status(403).json({ message: "Access denied! Only ADMIN can delete directories." });
        }

        if (!folderPath) {
            return res.status(400).json({ message: "Directory path is required!" });
        }

        const directoryName = path.basename(folderPath);
        const absFolderPath = path.join(ROOT_DIRECTORY, folderPath);

        // Check if directory exists in DB
        const existingDirectory = await db.directory.findFirst({
            where: { name: directoryName },
        });

        if (!existingDirectory) {
            return res.status(404).json({ message: "Directory not found in the database!" });
        }

        // Check if directory exists on the filesystem
        if (fs.existsSync(absFolderPath)) {
            fs.rmdirSync(absFolderPath, { recursive: true });
        }

        // Delete from DB
        await db.directory.delete({
            where: { id: existingDirectory.id },
        });

        res.status(200).json({ message: "Directory deleted successfully" });
    } catch (error) {
        console.error("Error deleting directory:", error);
        res.status(500).json({ message: "Error deleting directory", error: error.message });
    }
};

export const getApprovalList = async (req, res) => {
    try {
        const userId = req.user.userId;
        const userRole = req.user.role;

        // Check if user has permission to view approvals
        if (userRole !== "ADMIN" && userRole !== "EDITOR") {
            return res.status(403).json({ error: "Access denied. Only ADMIN and EDITOR can view approvals." });
        }

        // Different query for ADMIN vs. EDITOR
        let pendingApprovals;
        
        if (userRole === "ADMIN") {
            // Admins can see all pending approvals
            pendingApprovals = await db.file.findMany({
                where: {
                    approvalStatus: "PENDING"
                },
                include: {
                    creator: {
                        select: { username: true }
                    },
                    directory: {  // Include directory information
                        select: {
                            id: true,
                            name: true,
                            path: true,
                            createdBy: true
                        }
                    },
                    approval: {
                        include: {
                            approver: {
                                select: { 
                                    id: true,
                                    username: true 
                                }
                            }
                        }
                    },
                    versions: {
                        orderBy: {
                            versionNumber: 'desc'
                        },
                        include: {
                            approver: {
                                select: { 
                                    id: true,
                                    username: true 
                                }
                            }
                        }
                    }
                }
            });
        } else {
            // EDITOR: Find directories where the user is the creator or has permissions
            const userDirectories = await db.directory.findMany({
                where: {
                    OR: [
                        { createdBy: userId },
                        {
                            permissions: {
                                some: {
                                    userId: userId,
                                    permissionType: 'WRITE'
                                }
                            }
                        }
                    ]
                },
                select: { id: true, path: true }
            });
            
            // Get user's directory IDs for direct matching
            const userDirectoryIds = userDirectories.map(dir => dir.id);
            
            // For path-based matching, we'll use multiple OR conditions
            const pathConditions = userDirectories.map(dir => ({
                directoryPath: {
                    startsWith: dir.path
                }
            }));
            
            // Create the OR array with directoryId condition and path conditions
            const orConditions = [
                {
                    directoryId: {
                        in: userDirectoryIds.length > 0 ? userDirectoryIds : [""]
                    }
                },
                ...pathConditions
            ];
            
            // Get files that are in those directories or subdirectories
            pendingApprovals = await db.file.findMany({
                where: {
                    approvalStatus: "PENDING",
                    OR: orConditions
                },
                include: {
                    creator: {
                        select: { username: true }
                    },
                    directory: {
                        select: {
                            id: true,
                            name: true,
                            path: true,
                            createdBy: true
                        }
                    },
                    approval: {
                        include: {
                            approver: {
                                select: { 
                                    id: true,
                                    username: true 
                                }
                            }
                        }
                    },
                    versions: {
                        orderBy: {
                            versionNumber: 'desc'
                        },
                        include: {
                            approver: {
                                select: { 
                                    id: true,
                                    username: true 
                                }
                            }
                        }
                    }
                }
            });
        }

        const approvalList = pendingApprovals.map(file => ({
            id: file.id,
            name: file.name,
            description: file.description,
            path: file.path,
            directoryPath: file.directory?.path || null,
            directoryName: file.directory?.name || null,
            uploadedBy: file.creator.username,
            createdAt: file.createdAt,
            approvalStatus: file.approvalStatus,
            approvedBy: file.approval?.approvedBy || null,
            approverName: file.approval?.approver?.username || null,
            approvedAt: file.approval?.approvedAt || null,
            hasVersions: file.versions.length > 0,
            canApprove: userRole === "ADMIN" || file.directory?.createdBy === userId,
            versions: file.versions.map(version => ({
                id: version.id,
                path: version.filePath,
                description: version.description,
                versionNumber: version.versionNumber,
                createdAt: version.createdAt, 
                approvedBy: version.approvedBy || null,
                approverName: version.approver?.username || null,
                approvedAt: version.approvedAt || null
            }))
        }));

        res.status(200).json({ approvals: approvalList });
    } catch (error) {
        console.error("Error retrieving approval list:", error);
        res.status(500).json({ error: "Error retrieving approval list", details: error.message });
    }
};

export const approveFile = async (req, res) => {
    try {
        const { params } = req.body;
        const fileId = params?.fileId;

        console.log("Approval request received for fileId:", fileId);

        if (!fileId) {
            return res.status(400).json({ error: "Missing file ID" });
        }

        const userId = req.user.userId;
        const userRole = req.user.role;

        if (userRole !== "ADMIN") {
            return res.status(403).json({ error: "Access denied. Only ADMIN can approve files." });
        }

        const file = await db.file.findUnique({
            where: { id: fileId },
            include: {
                creator: { select: { username: true } }
            }
        });

        if (!file) {
            return res.status(404).json({ error: "File not found." });
        }

        if (file.approvalStatus !== "PENDING") {
            return res.status(400).json({
                error: "File cannot be approved.",
                message: `Current status is ${file.approvalStatus}.`
            });
        }

        const updatedFile = await db.file.update({
            where: { id: fileId },
            data: {
                approvalStatus: "APPROVED",
                approvedBy: userId
            },
            include: {
                creator: { select: { username: true } },
                approver: { select: { username: true } }
            }
        });

        const approval = await db.approval.upsert({
            where: { fileId },
            create: {
                fileId,
                approvedBy: userId,
                approvedAt: new Date()
            },
            update: {
                approvedBy: userId,
                approvedAt: new Date()
            }
        });

        const admin = await db.user.findUnique({
            where: { id: userId },
            select: { username: true }
        });

        res.status(200).json({
            message: "File approved successfully",
            file: {
                id: updatedFile.id,
                name: updatedFile.name,
                path: updatedFile.path,
                approvalStatus: updatedFile.approvalStatus,
                uploadedBy: updatedFile.creator.username,
                approvedBy: updatedFile.approver.username,
                approvedAt: approval.approvedAt
            }
        });
    } catch (error) {
        console.error("Error approving file:", error);
        res.status(500).json({ error: "Error approving file", details: error.message });
    }
};

export const rejectFile = async (req, res) => {
    try {
        const { fileId } = req.params;
        const userId = req.user.userId;
        const userRole = req.user.role;

        // Check if user has admin role
        if (userRole !== "ADMIN") {
            return res.status(403).json({ error: "Access denied. Only ADMIN can reject files." });
        }

        // Check if file exists and is pending approval
        const file = await db.file.findUnique({
            where: { id: fileId }
        });

        if (!file) {
            return res.status(404).json({ error: "File not found." });
        }

        if (file.approvalStatus !== "PENDING") {
            return res.status(400).json({
                error: "File cannot be rejected.",
                message: `Current status is ${file.approvalStatus}.`
            });
        }

        // Update file status to REJECTED
        const updatedFile = await db.file.update({
            where: { id: fileId },
            data: {
                approvalStatus: "REJECTED"
            },
            include: {
                user: {
                    select: { username: true, email: true }
                }
            }
        });

        // Optionally record who rejected it
        // Note: In some systems, rejections might not be tracked the same way as approvals
        // If you want to track rejections in the Approval table:
        const approval = await db.approval.upsert({
            where: { fileId },
            create: {
                fileId,
                approvedBy: userId,
                approvedAt: new Date()
            },
            update: {
                approvedBy: userId,
                approvedAt: new Date()
            }
        });

        // Get admin username for response
        const admin = await db.user.findUnique({
            where: { id: userId },
            select: { username: true }
        });

        res.status(200).json({
            message: "File rejected successfully",
            file: {
                id: updatedFile.id,
                name: updatedFile.name,
                path: updatedFile.path,
                approvalStatus: updatedFile.approvalStatus,
                uploadedBy: updatedFile.user.username,
                rejectedBy: admin.username,
                rejectedAt: approval.approvedAt
            }
        });
    } catch (error) {
        console.error("Error rejecting file:", error);
        res.status(500).json({ error: "Error rejecting file", details: error.message });
    }
};

export const getApprovedList = async (req, res) => {
    try {
        const userId = req.user.userId;
        const userRole = req.user.role;
        const approvedByUser = req.query.userId || userId; // Default to current user if not specified

        // If querying for approvals by another user, only admins should be allowed
        if (approvedByUser !== userId && userRole !== "ADMIN") {
            return res.status(403).json({
                error: "Access denied. You can only view your own approvals."
            });
        }

        // Find all files approved by the specified user
        const approvedFiles = await db.approval.findMany({
            where: {
                approvedBy: approvedByUser
            },
            include: {
                file: {
                    include: {
                        creator: {  // Changed from 'user' to 'creator' to match schema relation name
                            select: {
                                id: true,
                                username: true
                            }
                        },
                        approver: {  // Changed from 'admin' to 'approver'
                            select: {
                                id: true,
                                username: true
                            }
                        },
                        versions: {
                            orderBy: { versionNumber: "desc" },
                            take: 1
                        }
                    }
                }
                // Removed 'admin' from here as it should be accessed through file.approver
            }
        });

        // Format the response
        const approvedList = approvedFiles.map(approval => ({
            id: approval.file.id,
            name: approval.file.name,
            description: approval.file.description, // Added description field here
            path: approval.file.path,
            uploadedBy: {
                id: approval.file.creator.id,  // Changed from 'user' to 'creator'
                username: approval.file.creator.username
            },
            createdAt: approval.file.createdAt,
            approvalStatus: approval.file.approvalStatus,
            approvedBy: approval.file.approver ? {  // Changed from 'admin' to 'approver'
                id: approval.file.approver.id,
                username: approval.file.approver.username
            } : null,  // Handle possible null approver
            approvedAt: approval.approvedAt,
            latestVersion: approval.file.versions[0] ? {
                versionNumber: approval.file.versions[0].versionNumber,
                createdAt: approval.file.versions[0].createdAt,
                description: approval.file.versions[0].description // Added version description field
            } : null
        }));

        res.status(200).json({
            approvals: approvedList,
            count: approvedList.length
        });
    } catch (error) {
        console.error("Error retrieving approved files:", error);
        res.status(500).json({ error: "Error retrieving approved files", details: error.message });
    }
};
