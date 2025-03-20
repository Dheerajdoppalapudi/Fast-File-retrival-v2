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

// This function identifies binary files that we want to display in the browser
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
            return res.status(400).json({ message: "Directory path is required!" })
        }

        const directoryName = path.basename(folderPath);
        const parentPath = path.dirname(folderPath);

        const existingDirectory = await db.directory.findFirst({
            where: {
                name: directoryName,
                parent: {
                    name: parentPath,
                },
            },
        });

        if (existingDirectory) {
            return res.status(400).json({ message: "Directory already exists in this location!" });
        }

        const absfolderPath = path.join(ROOT_DIRECTORY, folderPath);

        if (!fs.existsSync(absfolderPath)) {
            fs.mkdirSync(absfolderPath, { recursive: true });
        }

        // Update to the database
        let parentDirectory = null;
        if (parentPath !== "." && parentPath !== "") {
            parentDirectory = await db.directory.findFirst({
                where: { name: parentPath },
            });
        }

        const newDirectory = await db.directory.create({
            data: {
                name: directoryName,
                parentId: parentDirectory ? parentDirectory.id : null,
                createdBy: userId, // This now links to the User model
            },
            include: {
                creator: true, // Include the creator information in the response
            },
        });

        res.status(201).json({
            message: "Directory created successfully",
            directoryPath: absfolderPath,
            directory: newDirectory,
        });
    } catch (error) {
        res.status(500).json({ message: "Error creating directory", error: error.message });
    }
}

export const getFiles = async (req, res) => {
    try {
        const folderPath = req.query.path || "";
        const userId = req.user.userId;
        const userRole = req.user.role;

        // Admin access check shortcut
        const isAdmin = userRole === 'ADMIN';

        // Get current directory info
        let currentDirectory = null;
        if (folderPath !== "") {
            const currentDirName = path.basename(folderPath);
            currentDirectory = await db.directory.findFirst({
                where: { name: currentDirName },
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
                const hasParentPermission = await checkParentDirectoryPermission(folderPath, userId);

                if (!hasParentPermission) {
                    return res.status(403).json({
                        error: "Access denied",
                        message: "You don't have permission to access this directory"
                    });
                }
            }
        }

        // Get parent directory info
        let parentDirectory = null;
        if (folderPath !== "" && currentDirectory?.parentId) {
            parentDirectory = await db.directory.findUnique({
                where: { id: currentDirectory.parentId },
                select: {
                    id: true,
                    name: true,
                    parentId: true,
                    createdAt: true
                }
            });
        }

        // Get subdirectories with permission filtering
        let subdirectoriesQuery = {
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
        };

        const subdirectories = await db.directory.findMany(subdirectoriesQuery);

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

        // Get files in the current directory
        const dbFiles = await db.file.findMany({
            where: { directory: folderPath },
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

        // All files in a directory should be accessible if:
        // 1. User is admin
        // 2. User is the creator of the directory
        // 3. User has permission on the directory with cascadeToChildren=true
        // 4. User has direct permission on the file

        // Non-admins need additional permission checking for files
        const accessibleFiles = isAdmin || userHasParentPermission ?
            dbFiles :
            dbFiles.filter(file =>
                file.createdBy === userId || // User is the owner
                (file.permissions && file.permissions.length > 0) // User has explicit permission
            );

        // Format directory data
        const directories = accessibleDirectories.map(dir => ({
            id: dir.id,
            name: dir.name,
            path: folderPath ? path.join(folderPath, dir.name) : dir.name,
            createdAt: dir.createdAt,
            createdBy: dir.creator ? {
                id: dir.creator.id,
                username: dir.creator.username,
                role: dir.creator.role
            } : null,
            permissions: dir.permissions || [],
            permissionType: dir.permissions.length > 0 ? dir.permissions[0].permissionType : null,
            // Add a flag to indicate if the current user has permission
            hasPermission: true, // All directories in this list are accessible
            isOwner: dir.createdBy === userId
        }));

        // Format file data
        const files = accessibleFiles.map(file => ({
            id: file.id,
            name: file.name,
            path: file.path,
            createdDate: file.createdAt,
            approvalStatus: file.approvalStatus,
            uploadedBy: {
                id: file.creator.id,
                username: file.creator.username,
                role: file.creator.role
            },
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
            permissions: file.permissions || [],
            permissionType: file.permissions.length > 0 ? file.permissions[0].permissionType : null,
            // Add a flag to indicate if the current user has permission 
            hasPermission: true, // All files in this list are accessible
            isOwner: file.createdBy === userId,
            // Add a flag to indicate if the user has write permission
            canEdit: isAdmin ||
                file.createdBy === userId ||
                (file.permissions.some(p => p.permissionType === 'WRITE')) ||
                (userHasParentPermission && currentDirectory.permissions.some(p => p.permissionType === 'WRITE'))
        }));

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
                path: folderPath,
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

// Helper function to check if any parent directory grants permission
async function checkParentDirectoryPermission(dirPath, userId) {
    if (!dirPath) return false;

    // Split the path into parts
    const pathParts = dirPath.split('/').filter(Boolean);

    // Check each ancestor directory for permissions
    for (let i = pathParts.length - 1; i >= 0; i--) {
        const partialPath = pathParts.slice(0, i).join('/');
        const dirName = pathParts[i - 1] || pathParts[0];

        const parentDir = await db.directory.findFirst({
            where: { name: dirName },
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

export const uploadFile = async (req, res) => {
    try {
        const { folderPath } = req.body;
        const userId = req.user.userId;

        const userRole = req.user.role;

        if (!req.file) {
            return res.status(400).json({ error: "No file uploaded." });
        }

        const fileSavePath = path.join(ROOT_DIRECTORY, folderPath);
        const fileSaveVersionPath = path.join(VERSION_DIR, folderPath);
        const newFilePath = path.join(fileSavePath, req.file.originalname);
        const versionFilePath = path.join(fileSaveVersionPath, req.file.originalname);

        if (!fs.existsSync(fileSavePath)) {
            fs.mkdirSync(fileSavePath, { recursive: true });
        }
        if (!fs.existsSync(fileSaveVersionPath)) {
            fs.mkdirSync(fileSaveVersionPath, { recursive: true });
        }

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

            // Fix: Create proper versioned file name
            const fileExt = path.extname(req.file.originalname); // Get file extension (.txt)
            const fileName = path.basename(req.file.originalname, fileExt); // Get filename without extension
            const versionedFileName = `${fileName}_v${newVersionNumber}${fileExt}`; // Create filename_v1.txt
            const versionedFilePath = path.join(fileSaveVersionPath, versionedFileName);

            // Move the existing file to the versions directory
            if (fs.existsSync(newFilePath)) {
                fs.copyFileSync(newFilePath, versionedFilePath); // Copy instead of rename
            }

            // Save the version in DB
            await db.version.create({
                data: {
                    fileId,
                    filePath: versionedFilePath,
                    versionNumber: newVersionNumber,
                    approvedBy: existingFile.approvedBy,
                    createdAt: existingFile.createdAt,
                    createdBy: existingFile.createdBy
                }
            });

            // Update the existing file record
            await db.file.update({
                where: { id: fileId },
                data: {
                    approvalStatus: userRole === "ADMIN" ? "APPROVED" : "PENDING",
                    createdBy: userId,
                    approvedBy: userRole === "ADMIN" ? userId : null,
                    createdAt: new Date()
                }
            });

            console.log(`Existing file versioned as: ${versionedFilePath}`);
        } else {
            // Determine approval status based on user role
            const approvalStatus = userRole === "ADMIN" ? "APPROVED" : "PENDING";
            const approvedBy = userRole === "ADMIN" ? userId : null;

            // Create a new file entry in DB
            const newFile = await db.file.create({
                data: {
                    name: req.file.originalname,
                    path: newFilePath,
                    directory: folderPath,
                    createdBy: userId,
                    approvedBy,
                    approvalStatus
                }
            });

            fileId = newFile.id;

            // Create an approval entry
            await db.approval.create({
                data: {
                    fileId,
                    approvedBy,
                    approvedAt: approvedBy ? new Date() : null
                }
            });
        }

        // Write the uploaded file
        fs.writeFileSync(newFilePath, req.file.buffer);

        res.status(201).json({
            message: "File uploaded successfully",
            filePath: newFilePath,
            fileId
        });

    } catch (error) {
        console.error("Error uploading file:", error);
        res.status(500).json({ error: "Error uploading file", details: error.message });
    }
};

export const getApprovalList = async (req, res) => {
    try {
        const userId = req.user.userId;
        const userRole = req.user.role;

        if (userRole !== "ADMIN") {
            return res.status(403).json({ error: "Access denied. Only ADMIN can view approvals." });
        }

        const pendingApprovals = await db.file.findMany({
            where: {
                approvalStatus: "PENDING"
            },
            include: {
                creator: {
                    select: { username: true }
                },
                approval: {
                    select: {
                        approvedBy: true,
                        approvedAt: true
                    }
                },
                versions: {
                    orderBy: {
                        versionNumber: 'desc'
                    },
                    select: {
                        id: true,
                        filePath: true,
                        versionNumber: true,
                        createdAt: true
                    }
                }
            }
        });

        // console.log("pendingApprovals: ", pendingApprovals)

        const approvalList = pendingApprovals.map(file => ({
            id: file.id,
            name: file.name,
            path: file.path,
            uploadedBy: file.creator.username,
            createdAt: file.createdAt,
            approvalStatus: file.approvalStatus,
            approvedBy: file.approval?.approvedBy || null,
            approvedAt: file.approval?.approvedAt || null,
            hasVersions: file.versions.length > 0,
            versions: file.versions.map(version => ({
                id: version.id,
                path: version.filePath,
                versionNumber: version.versionNumber,
                createdAt: version.createdAt
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
                approvedBy: userId // ✅ Store approver in the file table
            },
            include: {
                creator: { select: { username: true } }, // ✅ Include creator
                approver: { select: { username: true } } // ✅ Include approver
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
                createdAt: approval.file.versions[0].createdAt
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

function getDirectoriesByLocation(location) {
    return fs.readdirSync(location).filter((file) =>
        fs.statSync(path.join(location, file)).isDirectory()
    );
}

// deleteDirectory()