import express from "express";
import { uploadPdfFile, uploadPdfFileStream } from "../controllers/upload.js";
import { uploadPdf } from "../middleware/upload.js";

const router = express.Router();

router.post("/pdf", uploadPdf.single('pdf'), uploadPdfFile);
router.post("/pdf/stream", uploadPdf.single('pdf'), uploadPdfFileStream);

export default router;
