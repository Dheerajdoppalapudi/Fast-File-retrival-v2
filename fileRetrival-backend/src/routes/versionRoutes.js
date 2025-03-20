import express from "express";
import { 
    getFileVersions, 
    getSpecificVersion, 
    compareVersions, 
    restoreVersion, 
    deleteVersion 
} from "../controllers/versionController.js";
import { authenticate } from "../middleware/authMiddleware.js";
import { checkFilePermission, checkVersionPermission } from "../middleware/permissionMiddleware.js";

const router = express.Router();

// Get all versions of a file
router.get("/:fileId", authenticate, checkFilePermission("READ"), getFileVersions);

// Get specific version of a file
router.get("/:fileId/:versionNumber", authenticate, checkFilePermission("READ"), getSpecificVersion);

// Compare two versions of a file
router.get("/:fileId/compare/:version1/:version2", authenticate, checkFilePermission("READ"), compareVersions);

// Restore a previous version
router.post("/:fileId/restore/:versionNumber", authenticate, checkFilePermission("WRITE"), restoreVersion);

// Delete a version
router.delete("/:fileId/:versionNumber", authenticate, checkVersionPermission(), deleteVersion);

export default router;