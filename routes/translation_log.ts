import express from "express";
import {
  getTranslationLog,
  getTranslationLogEntry,
  addTranslationLogEntry,
  deleteTranslationLogEntry,
  getLogsByDateRangeHandler,
} from "../controllers/translation_log.js";
import { authMiddleware } from "../middleware/auth.js";

const router = express.Router();

router.get("/", authMiddleware, getTranslationLog);
router.get("/filter", authMiddleware, getTranslationLogEntry);
router.get("/range", authMiddleware, getLogsByDateRangeHandler);
router.post("/", authMiddleware, addTranslationLogEntry);
router.delete("/:id", authMiddleware, deleteTranslationLogEntry);

export default router;
