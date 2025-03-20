import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import db from "../models/prismaClient.js";
import { ROOT_DIRECTORY, VERSION_DIR } from "./fileController.js";

/**
 * Get all versions of a file
 * @route GET /api/versions/:fileId
 */
export const getFileVersions = async (req, res) => {
    try {
        const { fileId } = req.params;
        const userId = req.user.userId;
        
        // Check if file exists
        const file = await db.file.findUnique({
            where: { id: fileId },
            include: {
                creator: {
                    select: {
                        id: true,
                        username: true
                    }
                }
            }
        });
        
        if (!file) {
            return res.status(404).json({ error: "File not found" });
        }
        
        // Get all versions of the file
        const versions = await db.version.findMany({
            where: { fileId },
            orderBy: { versionNumber: "desc" },
            include: {
                creator: {
                    select: {
                        id: true,
                        username: true
                    }
                },
                approver: {
                    select: {
                        id: true,
                        username: true
                    }
                }
            }
        });
        
        const formattedVersions = versions.map(version => ({
            id: version.id,
            versionNumber: version.versionNumber,
            filePath: version.filePath,
            createdAt: version.createdAt,
            createdBy: {
                id: version.creator.id,
                username: version.creator.username
            },
            approvedBy: version.approver ? {
                id: version.approver.id,
                username: version.approver.username
            } : null
        }));
        
        res.status(200).json({
            file: {
                id: file.id,
                name: file.name,
                path: file.path,
                directory: file.directory,
                createdBy: {
                    id: file.creator.id,
                    username: file.creator.username
                },
                approvalStatus: file.approvalStatus
            },
            versions: formattedVersions
        });
    } catch (error) {
        console.error("Error retrieving file versions:", error);
        res.status(500).json({ 
            error: "Failed to retrieve file versions", 
            details: error.message 
        });
    }
};

/**
 * Get specific version of a file
 * @route GET /api/versions/:fileId/:versionNumber
 */
export const getSpecificVersion = async (req, res) => {
    try {
        const { fileId, versionNumber } = req.params;
        const version = parseInt(versionNumber);
        
        if (isNaN(version)) {
            return res.status(400).json({ error: "Invalid version number" });
        }
        
        // Check if file exists
        const file = await db.file.findUnique({
            where: { id: fileId }
        });
        
        if (!file) {
            return res.status(404).json({ error: "File not found" });
        }
        
        // Get the specific version
        const fileVersion = await db.version.findFirst({
            where: { 
                fileId,
                versionNumber: version
            },
            include: {
                creator: {
                    select: {
                        id: true,
                        username: true
                    }
                },
                approver: {
                    select: {
                        id: true,
                        username: true
                    }
                }
            }
        });
        
        if (!fileVersion) {
            return res.status(404).json({ error: "Version not found" });
        }
        
        // Check if version file exists in the filesystem
        if (!fs.existsSync(fileVersion.filePath)) {
            return res.status(404).json({ error: "Version file not found in filesystem" });
        }
        
        const ext = path.extname(fileVersion.filePath).toLowerCase();
        const contentType = getContentType(ext);
        
        // For binary files, stream them directly
        if (isBinaryFile(ext)) {
            res.setHeader('Content-Type', contentType);
            return fs.createReadStream(fileVersion.filePath).pipe(res);
        } else {
            // For text files, send the content
            const content = fs.readFileSync(fileVersion.filePath, 'utf8');
            res.json({
                version: {
                    id: fileVersion.id,
                    versionNumber: fileVersion.versionNumber,
                    createdAt: fileVersion.createdAt,
                    createdBy: {
                        id: fileVersion.creator.id,
                        username: fileVersion.creator.username
                    },
                    approvedBy: fileVersion.approver ? {
                        id: fileVersion.approver.id,
                        username: fileVersion.approver.username
                    } : null
                },
                content,
                contentType
            });
        }
    } catch (error) {
        console.error("Error retrieving specific version:", error);
        res.status(500).json({ 
            error: "Failed to retrieve version", 
            details: error.message 
        });
    }
};

/**
 * Compare two versions of a file
 * @route GET /api/versions/:fileId/compare/:version1/:version2
 */
export const compareVersions = async (req, res) => {
    try {
        const { fileId, version1, version2 } = req.params;
        const v1 = parseInt(version1);
        const v2 = parseInt(version2);
        
        if (isNaN(v1) || isNaN(v2)) {
            return res.status(400).json({ error: "Invalid version numbers" });
        }
        
        // Check if file exists
        const file = await db.file.findUnique({
            where: { id: fileId }
        });
        
        if (!file) {
            return res.status(404).json({ error: "File not found" });
        }
        
        // Get both versions
        const versionOne = await db.version.findFirst({
            where: { 
                fileId,
                versionNumber: v1
            }
        });
        
        const versionTwo = await db.version.findFirst({
            where: { 
                fileId,
                versionNumber: v2
            }
        });
        
        if (!versionOne || !versionTwo) {
            return res.status(404).json({ error: "One or both versions not found" });
        }
        
        // Check if version files exist in the filesystem
        if (!fs.existsSync(versionOne.filePath) || !fs.existsSync(versionTwo.filePath)) {
            return res.status(404).json({ error: "One or both version files not found in filesystem" });
        }
        
        const ext = path.extname(versionOne.filePath).toLowerCase();
        
        // Only compare text files
        if (isBinaryFile(ext)) {
            return res.status(400).json({ 
                error: "Cannot compare binary files", 
                message: "Binary file comparison is not supported" 
            });
        }
        
        // Read file contents
        const contentOne = fs.readFileSync(versionOne.filePath, 'utf8');
        const contentTwo = fs.readFileSync(versionTwo.filePath, 'utf8');
        
        // Basic diff - just return both contents
        // A more sophisticated diff algorithm could be implemented here
        res.status(200).json({
            file: {
                id: file.id,
                name: file.name
            },
            version1: {
                versionNumber: v1,
                content: contentOne
            },
            version2: {
                versionNumber: v2,
                content: contentTwo
            }
        });
    } catch (error) {
        console.error("Error comparing versions:", error);
        res.status(500).json({ 
            error: "Failed to compare versions", 
            details: error.message 
        });
    }
};

/**
 * Restore a previous version of a file
 * @route POST /api/versions/:fileId/restore/:versionNumber
 */
export const restoreVersion = async (req, res) => {
    try {
        const { fileId, versionNumber } = req.params;
        const version = parseInt(versionNumber);
        const userId = req.user.userId;
        const userRole = req.user.role;
        
        if (isNaN(version)) {
            return res.status(400).json({ error: "Invalid version number" });
        }
        
        // Check if file exists
        const file = await db.file.findUnique({
            where: { id: fileId }
        });
        
        if (!file) {
            return res.status(404).json({ error: "File not found" });
        }
        
        // Get the version to restore
        const versionToRestore = await db.version.findFirst({
            where: { 
                fileId,
                versionNumber: version
            }
        });
        
        if (!versionToRestore) {
            return res.status(404).json({ error: "Version not found" });
        }
        
        // Check if version file exists in the filesystem
        if (!fs.existsSync(versionToRestore.filePath)) {
            return res.status(404).json({ error: "Version file not found in filesystem" });
        }
        
        // Find the latest version number
        const latestVersion = await db.version.findMany({
            where: { fileId },
            orderBy: { versionNumber: "desc" },
            take: 1
        });
        
        const newVersionNumber = latestVersion.length ? latestVersion[0].versionNumber + 1 : 1;
        
        // Create new version for the current file before overwriting
        const currentFilePath = file.path;
        const versionedFilePath = `${versionToRestore.filePath.split('_v')[0]}_v${newVersionNumber}`;
        
        // Only create a new version if the current file exists
        if (fs.existsSync(currentFilePath)) {
            fs.copyFileSync(currentFilePath, versionedFilePath);
            
            // Save the current state as a new version
            await db.version.create({
                data: {
                    fileId,
                    filePath: versionedFilePath,
                    versionNumber: newVersionNumber,
                    createdBy: userId
                }
            });
        }
        
        // Copy the restored version content to the current file
        fs.copyFileSync(versionToRestore.filePath, currentFilePath);
        
        // Update the file's approval status based on user role
        const approvalStatus = userRole === "ADMIN" ? "APPROVED" : "PENDING";
        const approvedBy = userRole === "ADMIN" ? userId : null;
        
        await db.file.update({
            where: { id: fileId },
            data: {
                approvalStatus,
                approvedBy,
                createdBy: userId // Update the creator to the user who restored the version
            }
        });
        
        // If admin approved, update the approval record
        if (userRole === "ADMIN") {
            await db.approval.upsert({
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
        }
        
        res.status(200).json({
            message: `Version ${version} restored successfully`,
            file: {
                id: file.id,
                name: file.name,
                path: file.path,
                approvalStatus
            },
            restoredVersion: version,
            currentState: {
                versionNumber: newVersionNumber
            }
        });
    } catch (error) {
        console.error("Error restoring version:", error);
        res.status(500).json({ 
            error: "Failed to restore version", 
            details: error.message 
        });
    }
};

/**
 * Delete a version of a file
 * @route DELETE /api/versions/:fileId/:versionNumber
 * Only an admin or the file creator can delete versions
 */
export const deleteVersion = async (req, res) => {
    try {
        const { fileId, versionNumber } = req.params;
        const version = parseInt(versionNumber);
        const userId = req.user.userId;
        const userRole = req.user.role;
        
        if (isNaN(version)) {
            return res.status(400).json({ error: "Invalid version number" });
        }
        
        // Check if file exists
        const file = await db.file.findUnique({
            where: { id: fileId }
        });
        
        if (!file) {
            return res.status(404).json({ error: "File not found" });
        }
        
        // Only allow admin or file creator to delete versions
        if (userRole !== "ADMIN" && file.createdBy !== userId) {
            return res.status(403).json({ 
                error: "Forbidden", 
                message: "Only admins or file creators can delete versions" 
            });
        }
        
        // Get the version to delete
        const versionToDelete = await db.version.findFirst({
            where: { 
                fileId,
                versionNumber: version
            }
        });
        
        if (!versionToDelete) {
            return res.status(404).json({ error: "Version not found" });
        }
        
        // Delete the version file from filesystem if it exists
        if (fs.existsSync(versionToDelete.filePath)) {
            fs.unlinkSync(versionToDelete.filePath);
        }
        
        // Delete the version from the database
        await db.version.delete({
            where: { id: versionToDelete.id }
        });
        
        res.status(200).json({
            message: `Version ${version} deleted successfully`,
            file: {
                id: file.id,
                name: file.name
            }
        });
    } catch (error) {
        console.error("Error deleting version:", error);
        res.status(500).json({ 
            error: "Failed to delete version", 
            details: error.message 
        });
    }
};

// Helper functions
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
        '.ppt': 'application/vnd.ms-powerpoint',
        '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    };

    return types[extension] || 'application/octet-stream';
}

function isBinaryFile(extension) {
    const binaryExtensions = ['.pdf', '.ppt', '.pptx', '.doc', '.docx', '.xls', '.xlsx', '.jpg', '.jpeg', '.png', '.gif'];
    return binaryExtensions.includes(extension);
}