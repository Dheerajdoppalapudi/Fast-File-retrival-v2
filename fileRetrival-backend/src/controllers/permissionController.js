import db from "../models/prismaClient.js";

/**
 * Grant permission to a user for a file or directory
 * @route POST /api/permissions/grant
 */
export const grantPermission = async (req, res) => {
    try {
        const granterId = req.user.userId;
        const granterRole = req.user.role;
        const { 
            userId,           // ID of the user to grant permission to
            resourceType,     // "FILE" or "DIRECTORY"
            resourceId,       // ID of the file or directory
            permissionType,   // "READ" or "WRITE"
            cascadeToChildren // boolean, whether to apply to subdirectories (default true)
        } = req.body;

        // Validate input
        if (!userId || !resourceType || !resourceId || !permissionType) {
            return res.status(400).json({ 
                error: "Missing required fields", 
                requiredFields: ["userId", "resourceType", "resourceId", "permissionType"] 
            });
        }

        // Validate resource type
        if (!["FILE", "DIRECTORY"].includes(resourceType)) {
            return res.status(400).json({ error: "Invalid resource type" });
        }

        // Validate permission type
        if (!["READ", "WRITE"].includes(permissionType)) {
            return res.status(400).json({ error: "Invalid permission type" });
        }

        // Check if the target user exists
        const targetUser = await db.user.findUnique({
            where: { id: userId }
        });

        if (!targetUser) {
            return res.status(404).json({ error: "Target user not found" });
        }

        // Check authorization: who can grant what permissions
        // 1. ADMIN can grant any permission
        // 2. EDITOR can grant permissions to their own resources or resources they have WRITE access to
        // 3. VIEWER cannot grant permissions

        if (granterRole !== "ADMIN" && granterRole !== "EDITOR") {
            return res.status(403).json({ 
                error: "Forbidden", 
                message: "You don't have permission to grant access"
            });
        }

        // If granter is not ADMIN, we need to check if they have ownership or WRITE access
        if (granterRole !== "ADMIN") {
            let hasAccess = false;
            
            if (resourceType === "DIRECTORY") {
                // Check if directory exists and if user created it
                const directory = await db.directory.findUnique({
                    where: { id: resourceId }
                });
                
                if (!directory) {
                    return res.status(404).json({ error: "Directory not found" });
                }
                
                // Editor can grant access if they created the directory
                if (directory.createdBy === granterId) {
                    hasAccess = true;
                } else {
                    // Or if they have WRITE permission to it
                    const permission = await db.permission.findFirst({
                        where: {
                            userId: granterId,
                            directoryId: resourceId,
                            permissionType: "WRITE"
                        }
                    });
                    
                    hasAccess = !!permission;
                }
            } else { // FILE
                // Check if file exists and if user created it
                const file = await db.file.findUnique({
                    where: { id: resourceId }
                });
                
                if (!file) {
                    return res.status(404).json({ error: "File not found" });
                }
                
                // Editor can grant access if they created the file
                if (file.createdBy === granterId) {
                    hasAccess = true;
                } else {
                    // Or if they have WRITE permission to it
                    const permission = await db.permission.findFirst({
                        where: {
                            userId: granterId,
                            fileId: resourceId,
                            permissionType: "WRITE"
                        }
                    });
                    
                    hasAccess = !!permission;
                }
            }
            
            if (!hasAccess) {
                return res.status(403).json({ 
                    error: "Forbidden", 
                    message: "You don't have permission to grant access to this resource" 
                });
            }
        }

        // Check if the resource exists
        let resourceExists = false;
        
        if (resourceType === "DIRECTORY") {
            const directory = await db.directory.findUnique({
                where: { id: resourceId }
            });
            resourceExists = !!directory;
        } else { // FILE
            const file = await db.file.findUnique({
                where: { id: resourceId }
            });
            resourceExists = !!file;
        }
        
        if (!resourceExists) {
            return res.status(404).json({ 
                error: "Resource not found", 
                message: `${resourceType.toLowerCase()} with ID ${resourceId} does not exist` 
            });
        }

        // Create or update the permission using upsert
        const permissionData = {
            permissionType,
            resourceType,
            userId,
            grantedBy: granterId,
            cascadeToChildren: cascadeToChildren !== false // default to true if not specified
        };

        // Set the resource ID based on type
        if (resourceType === "FILE") {
            permissionData.fileId = resourceId;
        } else {
            permissionData.directoryId = resourceId;
        }

        // Use upsert to either create or update the permission
        const permission = await db.permission.upsert({
            where: {
                // Use a composite unique constraint for the lookup
                userId_resourceType_fileId: resourceType === "FILE" ? 
                    { userId, resourceType, fileId: resourceId } :
                    undefined,
                userId_resourceType_directoryId: resourceType === "DIRECTORY" ? 
                    { userId, resourceType, directoryId: resourceId } :
                    undefined
            },
            update: {
                permissionType,
                grantedBy: granterId,
                cascadeToChildren: cascadeToChildren !== false
            },
            create: permissionData
        });

        // console.log("Permission: ", permission)

        // If it's a directory and cascadeToChildren is true, grant permissions to all subdirectories and files
        if (resourceType === "DIRECTORY" && (cascadeToChildren !== false)) {
            await cascadePermissions(resourceId, userId, permissionType, granterId);
        }

        res.status(200).json({
            message: `${permissionType} permission granted successfully`,
            permission
        });
    } catch (error) {
        console.error("Error granting permission:", error);
        res.status(500).json({ 
            error: "Failed to grant permission", 
            details: error.message 
        });
    }
};

/**
 * Helper function to cascade permissions to subdirectories and files
 */
async function cascadePermissions(directoryId, userId, permissionType, granterId) {
    try {
        // Get all subdirectories
        const subdirectories = await db.directory.findMany({
            where: { parentId: directoryId }
        });

        // Get all files in this directory
        const files = await db.file.findMany({
            where: { directory: directoryId }
        });

        // Create permissions for subdirectories
        for (const subdir of subdirectories) {
            await db.permission.upsert({
                where: {
                    userId_resourceType_directoryId: {
                        userId,
                        resourceType: "DIRECTORY",
                        directoryId: subdir.id
                    }
                },
                update: {
                    permissionType,
                    grantedBy: granterId
                },
                create: {
                    userId,
                    resourceType: "DIRECTORY",
                    directoryId: subdir.id,
                    permissionType,
                    grantedBy: granterId,
                    cascadeToChildren: true
                }
            });

            // Recursively cascade to children of this subdirectory
            await cascadePermissions(subdir.id, userId, permissionType, granterId);
        }

        // Create permissions for files
        for (const file of files) {
            await db.permission.upsert({
                where: {
                    userId_resourceType_fileId: {
                        userId,
                        resourceType: "FILE",
                        fileId: file.id
                    }
                },
                update: {
                    permissionType,
                    grantedBy: granterId
                },
                create: {
                    userId,
                    resourceType: "FILE",
                    fileId: file.id,
                    permissionType,
                    grantedBy: granterId
                }
            });
        }
    } catch (error) {
        console.error("Error cascading permissions:", error);
        throw error;
    }
}

/**
 * Revoke a permission from a user
 * @route POST /api/permissions/revoke
 */
export const revokePermission = async (req, res) => {
    try {
        const revokerId = req.user.userId;
        const revokerRole = req.user.role;
        const { 
            userId,           // ID of the user to revoke permission from
            resourceType,     // "FILE" or "DIRECTORY"
            resourceId,       // ID of the file or directory
            cascadeToChildren // boolean, whether to apply to subdirectories (default true)
        } = req.body;

        // Validate input
        if (!userId || !resourceType || !resourceId) {
            return res.status(400).json({ 
                error: "Missing required fields", 
                requiredFields: ["userId", "resourceType", "resourceId"] 
            });
        }

        // Similar authorization checks as grantPermission
        if (revokerRole !== "ADMIN" && revokerRole !== "EDITOR") {
            return res.status(403).json({ 
                error: "Forbidden", 
                message: "You don't have permission to revoke access"
            });
        }

        // If revoker is not ADMIN, check if they have ownership or sufficient permissions
        if (revokerRole !== "ADMIN") {
            let hasAccess = false;
            
            if (resourceType === "DIRECTORY") {
                const directory = await db.directory.findUnique({
                    where: { id: resourceId }
                });
                
                if (!directory) {
                    return res.status(404).json({ error: "Directory not found" });
                }
                
                // Editor can revoke access if they created the directory
                if (directory.createdBy === revokerId) {
                    hasAccess = true;
                } else {
                    // Or if they have WRITE permission to it
                    const permission = await db.permission.findFirst({
                        where: {
                            userId: revokerId,
                            directoryId: resourceId,
                            permissionType: "WRITE"
                        }
                    });
                    
                    hasAccess = !!permission;
                }
            } else { // FILE
                const file = await db.file.findUnique({
                    where: { id: resourceId }
                });
                
                if (!file) {
                    return res.status(404).json({ error: "File not found" });
                }
                
                // Editor can revoke access if they created the file
                if (file.createdBy === revokerId) {
                    hasAccess = true;
                } else {
                    // Or if they have WRITE permission to it
                    const permission = await db.permission.findFirst({
                        where: {
                            userId: revokerId,
                            fileId: resourceId,
                            permissionType: "WRITE"
                        }
                    });
                    
                    hasAccess = !!permission;
                }
            }
            
            if (!hasAccess) {
                return res.status(403).json({ 
                    error: "Forbidden", 
                    message: "You don't have permission to revoke access to this resource" 
                });
            }
        }

        // Find and delete the permission
        if (resourceType === "FILE") {
            await db.permission.deleteMany({
                where: {
                    userId,
                    resourceType,
                    fileId: resourceId
                }
            });
        } else { // DIRECTORY
            await db.permission.deleteMany({
                where: {
                    userId,
                    resourceType,
                    directoryId: resourceId
                }
            });

            // If cascadeToChildren is true, revoke permissions from subdirectories and files
            if (cascadeToChildren !== false) {
                await cascadeRevokePermissions(resourceId, userId);
            }
        }

        res.status(200).json({
            message: `Permission revoked successfully for ${resourceType.toLowerCase()} ${resourceId}`
        });
    } catch (error) {
        console.error("Error revoking permission:", error);
        res.status(500).json({ 
            error: "Failed to revoke permission", 
            details: error.message 
        });
    }
};

/**
 * Helper function to cascade revoke permissions from subdirectories and files
 */
async function cascadeRevokePermissions(directoryId, userId) {
    try {
        // Get all subdirectories
        const subdirectories = await db.directory.findMany({
            where: { parentId: directoryId }
        });

        // Get all files in this directory
        const files = await db.file.findMany({
            where: { directory: directoryId }
        });

        // Delete permissions for subdirectories
        for (const subdir of subdirectories) {
            await db.permission.deleteMany({
                where: {
                    userId,
                    resourceType: "DIRECTORY",
                    directoryId: subdir.id
                }
            });

            // Recursively revoke from children of this subdirectory
            await cascadeRevokePermissions(subdir.id, userId);
        }

        // Delete permissions for files
        for (const file of files) {
            await db.permission.deleteMany({
                where: {
                    userId,
                    resourceType: "FILE",
                    fileId: file.id
                }
            });
        }
    } catch (error) {
        console.error("Error cascading permission revocation:", error);
        throw error;
    }
}

/**
 * Get permissions for a specific user
 * @route GET /api/permissions/user/:userId
 */
export const getUserPermissions = async (req, res) => {
    try {
        const requesterId = req.user.userId;
        const requesterRole = req.user.role;
        const { userId } = req.params;

        // Only admins can view other users' permissions
        // Users can view their own permissions
        if (requesterRole !== "ADMIN" && requesterId !== userId) {
            return res.status(403).json({ 
                error: "Forbidden", 
                message: "You don't have permission to view other users' permissions" 
            });
        }

        // Check if user exists
        const user = await db.user.findUnique({
            where: { id: userId }
        });

        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        // Get all permissions for the user
        const permissions = await db.permission.findMany({
            where: { userId },
            include: {
                file: {
                    select: { 
                        id: true, 
                        name: true, 
                        path: true,
                        directory: true
                    }
                },
                directory: {
                    select: { 
                        id: true, 
                        name: true, 
                        parentId: true 
                    }
                },
                granter: {
                    select: { 
                        id: true, 
                        username: true, 
                        role: true 
                    }
                }
            }
        });

        res.status(200).json({
            user: {
                id: user.id,
                username: user.username,
                role: user.role
            },
            permissions
        });
    } catch (error) {
        console.error("Error getting user permissions:", error);
        res.status(500).json({ 
            error: "Failed to get user permissions", 
            details: error.message 
        });
    }
};

/**
 * Get permissions for a specific resource (file or directory)
 * @route GET /api/permissions/resource/:type/:id
 */
export const getResourcePermissions = async (req, res) => {
    try {
        const requesterId = req.user.userId;
        const requesterRole = req.user.role;
        const { type, id } = req.params;

        // Validate resource type
        if (!["file", "directory"].includes(type.toLowerCase())) {
            return res.status(400).json({ error: "Invalid resource type" });
        }

        const resourceType = type.toUpperCase();
        
        // Check if resource exists and if requester has access to it
        let hasAccess = false;
        let resourceExists = false;
        
        if (resourceType === "DIRECTORY") {
            const directory = await db.directory.findUnique({
                where: { id }
            });
            
            resourceExists = !!directory;
            
            // Admin has access to all directories
            if (requesterRole === "ADMIN") {
                hasAccess = true;
            } 
            // Creator has access
            else if (directory?.createdBy === requesterId) {
                hasAccess = true;
            }
            // Check if user has any permission to this directory
            else {
                const permission = await db.permission.findFirst({
                    where: {
                        userId: requesterId,
                        directoryId: id
                    }
                });
                
                hasAccess = !!permission;
            }
        } else { // FILE
            const file = await db.file.findUnique({
                where: { id }
            });
            
            resourceExists = !!file;
            
            // Admin has access to all files
            if (requesterRole === "ADMIN") {
                hasAccess = true;
            } 
            // Creator has access
            else if (file?.createdBy === requesterId) {
                hasAccess = true;
            }
            // Check if user has any permission to this file
            else {
                const permission = await db.permission.findFirst({
                    where: {
                        userId: requesterId,
                        fileId: id
                    }
                });
                
                hasAccess = !!permission;
            }
        }
        
        if (!resourceExists) {
            return res.status(404).json({ 
                error: "Resource not found", 
                message: `${type} with ID ${id} does not exist` 
            });
        }
        
        if (!hasAccess) {
            return res.status(403).json({ 
                error: "Forbidden", 
                message: "You don't have permission to view permissions for this resource" 
            });
        }

        // Get all permissions for the resource
        const permissions = await db.permission.findMany({
            where: resourceType === "DIRECTORY" 
                ? { directoryId: id } 
                : { fileId: id },
            include: {
                user: {
                    select: { 
                        id: true, 
                        username: true, 
                        role: true 
                    }
                },
                granter: {
                    select: { 
                        id: true, 
                        username: true, 
                        role: true 
                    }
                }
            }
        });

        res.status(200).json({
            resourceType,
            resourceId: id,
            permissions
        });
    } catch (error) {
        console.error("Error getting resource permissions:", error);
        res.status(500).json({ 
            error: "Failed to get resource permissions", 
            details: error.message 
        });
    }
};

/**
 * Get list of users with their roles
 * @route GET /api/permissions/get-user-list
 */
export const getUserListPermissions = async (req, res) => {
    try {
        const userId = req.user.userId;
        const userRole = req.user.role;

        // Only admins and editors can view the user list
        if (userRole !== "ADMIN" && userRole !== "EDITOR") {
            return res.status(403).json({ 
                error: "Forbidden", 
                message: "Only admins and editors can view the user list" 
            });
        }

        const userList = await db.user.findMany({
            select: {
                id: true,
                username: true,
                email: true,
                role: true
            }
        });

        return res.status(200).json(userList);
    } catch (error) {
        console.error("Error fetching user list:", error);
        return res.status(500).json({ error: "Failed to fetch users" });
    }
};

/**
 * Check if a user has permission to access a resource
 * @route GET /api/permissions/check/:resourceType/:resourceId
 */
export const checkPermission = async (req, res) => {
    try {
        const userId = req.user.userId;
        const userRole = req.user.role;
        const { resourceType, resourceId } = req.params;
        const { requiredPermission = "READ" } = req.query; // Default to READ

        // Validate resource type
        if (!["FILE", "DIRECTORY"].includes(resourceType)) {
            return res.status(400).json({ error: "Invalid resource type" });
        }

        // Validate permission type
        if (!["READ", "WRITE"].includes(requiredPermission)) {
            return res.status(400).json({ error: "Invalid permission type" });
        }

        // Admin has access to everything
        if (userRole === "ADMIN") {
            return res.status(200).json({ 
                hasPermission: true,
                message: "Admin has full access"
            });
        }

        // Check if resource exists
        let resourceExists = false;
        let isCreator = false;
        
        if (resourceType === "DIRECTORY") {
            const directory = await db.directory.findUnique({
                where: { id: resourceId }
            });
            
            resourceExists = !!directory;
            isCreator = directory?.createdBy === userId;
        } else { // FILE
            const file = await db.file.findUnique({
                where: { id: resourceId }
            });
            
            resourceExists = !!file;
            isCreator = file?.createdBy === userId;
        }
        
        if (!resourceExists) {
            return res.status(404).json({ 
                error: "Resource not found", 
                message: `${resourceType.toLowerCase()} with ID ${resourceId} does not exist` 
            });
        }

        // Creator always has full access
        if (isCreator) {
            return res.status(200).json({ 
                hasPermission: true,
                message: "You are the creator of this resource"
            });
        }

        // Check direct permission
        let permission;
        if (resourceType === "DIRECTORY") {
            permission = await db.permission.findFirst({
                where: {
                    userId,
                    directoryId: resourceId,
                    permissionType: requiredPermission === "READ" ? { in: ["READ", "WRITE"] } : "WRITE"
                }
            });
        } else { // FILE
            permission = await db.permission.findFirst({
                where: {
                    userId,
                    fileId: resourceId,
                    permissionType: requiredPermission === "READ" ? { in: ["READ", "WRITE"] } : "WRITE"
                }
            });
        }

        // If we found a direct permission, user has access
        if (permission) {
            return res.status(200).json({ 
                hasPermission: true,
                message: `You have ${permission.permissionType} permission to this resource`
            });
        }

        // For files, check parent directory permissions
        if (resourceType === "FILE") {
            const file = await db.file.findUnique({
                where: { id: resourceId },
                select: { directory: true }
            });
            
            if (file) {
                const directoryPath = file.directory;
                // Find the directory by path (assuming we have a unique constraint on directory name)
                const directory = await db.directory.findFirst({
                    where: { name: directoryPath }
                });

                if (directory) {
                    // Check permission on the parent directory
                    const directoryPermission = await db.permission.findFirst({
                        where: {
                            userId,
                            directoryId: directory.id,
                            permissionType: requiredPermission === "READ" ? { in: ["READ", "WRITE"] } : "WRITE"
                        }
                    });

                    if (directoryPermission) {
                        return res.status(200).json({ 
                            hasPermission: true,
                            message: `You have ${directoryPermission.permissionType} permission to the parent directory`
                        });
                    }
                }
            }
        }

        // User doesn't have permission
        return res.status(200).json({ 
            hasPermission: false,
            message: `You don't have ${requiredPermission} permission to this resource`
        });
    } catch (error) {
        console.error("Error checking permission:", error);
        res.status(500).json({ 
            error: "Failed to check permission", 
            details: error.message 
        });
    }
};