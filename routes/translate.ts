import express from "express";
import { batchTranslate, getTranslationStats } from "../controllers/translate.js";
import { uploadPdfFile, uploadPdfFileStream } from "../controllers/upload.js";
import { uploadPdf } from "../middleware/upload.js";

const router = express.Router();

router.get("/stat", getTranslationStats);
router.post("/batch", batchTranslate);
router.post("/batch", uploadPdf.array("pdfs"), batchTranslate);
router.post("/pdf", uploadPdf.single("pdf"), uploadPdfFile);
router.post("/pdf/stream", uploadPdf.single("pdf"), uploadPdfFileStream);

export default router;
