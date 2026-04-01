import express from "express";
import { batchTranslate, batchTranslateStream, getTranslationStats } from "../controllers/translate.js";
import { uploadPdfFile, uploadPdfFileStream } from "../controllers/upload.js";
import { uploadPdf } from "../middleware/upload.js";
import { validateTranslationHandler } from "../controllers/validate.js";

const router = express.Router();

router.get("/stat", getTranslationStats);
router.post("/validate", uploadPdf.fields([{ name: 'original', maxCount: 1 }, { name: 'translated', maxCount: 1 }]), validateTranslationHandler);
router.post("/batch", batchTranslate);
router.post("/batch", uploadPdf.array("pdfs"), batchTranslate);
router.post("/batch/stream", uploadPdf.array("pdfs"), batchTranslateStream);
router.post("/pdf", uploadPdf.single("pdf"), uploadPdfFile);
router.post("/pdf/stream", uploadPdf.single("pdf"), uploadPdfFileStream);

export default router;
