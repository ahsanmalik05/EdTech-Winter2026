import express from "express";
import {
  batchTranslate,
  batchTranslateStream,
} from "../controllers/translate.js";
import { uploadPdfFile, uploadPdfFileStream } from "../controllers/upload.js";
import { uploadPdf } from "../middleware/upload.js";
import { validateTranslationHandler } from "../controllers/validate.js";
import { authMiddleware } from "../middleware/auth.js";

const router = express.Router();

router.post(
  "/validate",
  authMiddleware,
  uploadPdf.fields([
    { name: "original", maxCount: 1 },
    { name: "translated", maxCount: 1 },
  ]),
  validateTranslationHandler,
);
router.post("/batch", authMiddleware, batchTranslate);
router.post("/batch", authMiddleware, uploadPdf.array("pdfs"), batchTranslate);
router.post(
  "/batch/stream",
  authMiddleware,
  uploadPdf.array("pdfs"),
  batchTranslateStream,
);
router.post("/pdf", authMiddleware, uploadPdf.single("pdf"), uploadPdfFile);
router.post(
  "/pdf/stream",
  authMiddleware,
  uploadPdf.single("pdf"),
  uploadPdfFileStream,
);

export default router;
