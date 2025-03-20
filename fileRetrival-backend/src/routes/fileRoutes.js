import express from "express"
import { authenticate } from "../middleware/authMiddleware.js";
import { createDirectory, getFiles, uploadFile, getFileContent, getApprovalList, approveFile, getApprovedList, deleteDirectory } from "../controllers/fileController.js"
import multer from "multer";

const router = express.Router()
const storage = multer.memoryStorage();
const upload = multer({ storage });

router.post("/create-directory", authenticate, createDirectory)
router.post("/delete-directory", authenticate, deleteDirectory)
router.post("/upload", upload.single("file"), authenticate, uploadFile)
router.get("/get-approval-list", authenticate, getApprovalList)
router.get("/approvedList", authenticate, getApprovedList)
router.post("/approve", authenticate, approveFile)
router.get("/content", getFileContent)
router.get("/", authenticate, getFiles)

export default router;