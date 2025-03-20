import express from "express";
import { 
    grantPermission, 
    revokePermission, 
    getUserListPermissions,
    getUserPermissions,
    getResourcePermissions,
    checkPermission
} from "../controllers/permissionController.js";
import { authenticate, authorize } from "../middleware/authMiddleware.js";

const router = express.Router();

// Grant permission to a user
router.post("/grant", authenticate, grantPermission);

// Revoke permission from a user
router.post("/revoke", authenticate, revokePermission);

// Get all users (for admins and editors to select from when granting permissions)
router.get("/get-user-list", authenticate, getUserListPermissions);

// Get all permissions for a specific user
router.get("/user/:userId", authenticate, getUserPermissions);

// Get all permissions for a specific resource (file or directory)
router.get("/resource/:type/:id", authenticate, getResourcePermissions);

// Check if current user has specific permission to a resource
router.get("/check/:resourceType/:resourceId", authenticate, checkPermission);

export default router;