import db from "../models/prismaClient.js";
import path from "path";

/**
 * Middleware to check if a user has permission to perform actions on a directory
 * @param {String} permissionType - "READ" or "WRITE"
 */
export const checkDirectoryPermission = (permissionType = "READ") => {
    return async (req, res, next) => {
        try {
            const userId = req.user.userId;
            const userRole = req.user.role;
            
            // The path can come from different places depending on the request type
            const folderPath = req.body.folderPath || req.query.path || "";
            
            // Admin has access to everything
            if (userRole === "ADMIN") {
                return next();
            }

            const directoryName = path.basename(folderPath);
            
            // Find the directory in the database
            const directory = await db.directory.findFirst({
                where: { name: directoryName }
            });
            
            if (!directory) {
                // Directory doesn't exist yet - special case for creation
                // If it's a creation request and the user is an EDITOR, allow it
                if (req.method === "POST" && req.path.includes("create-directory") && userRole === "EDITOR") {
                    return next();
                }
                
                return res.status(404).json({ error: "Directory not found" });
            }
            
            // Check if user is the creator
            if (directory.createdBy === userId) {
                return next();
            }
            
            // Check if user has the required permission
            const permission = await db.permission.findFirst({
                where: {
                    userId,
                    directoryId: directory.id,
                    permissionType: permissionType === "READ" ? { in: ["READ", "WRITE"] } : "WRITE"
                }
            });
            
            if (permission) {
                return next();
            }
            
            // If this is an EDITOR trying to create something in a parent directory, check parent permissions
            if (userRole === "EDITOR" && req.method === "POST" && req.path.includes("create-directory")) {
                // Check if user has WRITE permission on parent directory
                if (directory.parentId) {
                    const parentPermission = await db.permission.findFirst({
                        where: {
                            userId,
                            directoryId: directory.parentId,
                            permissionType: "WRITE"
                        }
                    });
                    
                    if (parentPermission) {
                        return next();
                    }
                }
            }
            
            return res.status(403).json({ 
                error: "Forbidden", 
                message: `You don't have ${permissionType} permission for this directory` 
            });
        } catch (error) {
            console.error("Error checking directory permission:", error);
            return res.status(500).json({ 
                error: "Error checking permissions", 
                details: error.message 
            });
        }
    };
};

/**
 * Middleware to check if a user has permission to perform actions on a file
 * @param {String} permissionType - "READ" or "WRITE"
 */
export const checkFilePermission = (permissionType = "READ") => {
    return async (req, res, next) => {
        try {
            const userId = req.user.userId;
            const userRole = req.user.role;
            
            // The path can come from different places depending on the request type
            const filePath = req.body.path || req.query.path || req.params.filePath || "";
            const fileId = req.body.fileId || req.params.fileId || req.query.fileId;
            
            // Admin has access to everything
            if (userRole === "ADMIN") {
                return next();
            }
            
            // For uploads, the creator automatically has access
            if (req.path.includes("upload") && req.method === "POST") {
                // For uploads, check if the user has permission to write to the directory
                const folderPath = req.body.folderPath || "";
                const directoryName = path.basename(folderPath);
                
                const directory = await db.directory.findFirst({
                    where: { name: directoryName }
                });
                
                if (!directory) {
                    return res.status(404).json({ error: "Upload directory not found" });
                }
                
                // Check if user created the directory
                if (directory.createdBy === userId) {
                    return next();
                }
                
                // Check if user has WRITE permission on the directory
                const dirPermission = await db.permission.findFirst({
                    where: {
                        userId,
                        directoryId: directory.id,
                        permissionType: "WRITE"
                    }
                });
                
                if (dirPermission) {
                    return next();
                }
                
                return res.status(403).json({ 
                    error: "Forbidden", 
                    message: "You don't have permission to upload to this directory" 
                });
            }
            
            // Find the file by ID or path
            let file;
            if (fileId) {
                file = await db.file.findUnique({
                    where: { id: fileId }
                });
            } else if (filePath) {
                file = await db.file.findFirst({
                    where: { path: filePath }
                });
            }
            
            if (!file) {
                return res.status(404).json({ error: "File not found" });
            }
            
            // Check if user is the creator
            if (file.createdBy === userId) {
                return next();
            }
            
            // Check if user has direct permission on the file
            const filePermission = await db.permission.findFirst({
                where: {
                    userId,
                    fileId: file.id,
                    permissionType: permissionType === "READ" ? { in: ["READ", "WRITE"] } : "WRITE"
                }
            });
            
            if (filePermission) {
                return next();
            }
            
            // Check if user has permission on the parent directory
            const directoryName = path.basename(file.directory);
            const directory = await db.directory.findFirst({
                where: { name: directoryName }
            });
            
            if (directory) {
                const dirPermission = await db.permission.findFirst({
                    where: {
                        userId,
                        directoryId: directory.id,
                        permissionType: permissionType === "READ" ? { in: ["READ", "WRITE"] } : "WRITE"
                    }
                });
                
                if (dirPermission) {
                    return next();
                }
            }
            
            return res.status(403).json({ 
                error: "Forbidden", 
                message: `You don't have ${permissionType} permission for this file` 
            });
        } catch (error) {
            console.error("Error checking file permission:", error);
            return res.status(500).json({ 
                error: "Error checking permissions", 
                details: error.message 
            });
        }
    };
};

/**
 * Helper middleware function to verify version control operations
 * Only admins or file creators can create versions
 */
export const checkVersionPermission = () => {
    return async (req, res, next) => {
        try {
            const userId = req.user.userId;
            const userRole = req.user.role;
            const { fileId, versionId } = req.params;
            
            // Admin has access to all versions
            if (userRole === "ADMIN") {
                return next();
            }
            
            // If checking a specific version
            if (versionId) {
                const version = await db.version.findUnique({
                    where: { id: versionId },
                    include: { file: true }
                });
                
                if (!version) {
                    return res.status(404).json({ error: "Version not found" });
                }
                
                // Check if user is the creator of the file
                if (version.file.createdBy === userId) {
                    return next();
                }
                
                // Check if user has permission on the file
                const filePermission = await db.permission.findFirst({
                    where: {
                        userId,
                        fileId: version.fileId,
                        permissionType: { in: ["READ", "WRITE"] }
                    }
                });
                
                if (filePermission) {
                    return next();
                }
            } 
            // If working with a file's versions in general
            else if (fileId) {
                const file = await db.file.findUnique({
                    where: { id: fileId }
                });
                
                if (!file) {
                    return res.status(404).json({ error: "File not found" });
                }
                
                // Check if user is the creator of the file
                if (file.createdBy === userId) {
                    return next();
                }
                
                // Check if user has WRITE permission on the file
                const filePermission = await db.permission.findFirst({
                    where: {
                        userId,
                        fileId,
                        permissionType: "WRITE"
                    }
                });
                
                if (filePermission) {
                    return next();
                }
            }
            
            return res.status(403).json({ 
                error: "Forbidden", 
                message: "You don't have permission to manage versions of this file" 
            });
        } catch (error) {
            console.error("Error checking version permission:", error);
            return res.status(500).json({ 
                error: "Error checking version permissions", 
                details: error.message 
            });
        }
    };
};