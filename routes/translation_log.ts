import express from "express";
import { getTranslationLog, getTranslationLogEntry, addTranslationLogEntry, deleteTranslationLogEntry, getLogsByDateRangeHandler } from "../controllers/translation_log.js";

const router = express.Router();

router.get("/", getTranslationLog);
router.get("/filter", getTranslationLogEntry);
router.get("/range", getLogsByDateRangeHandler);
router.post("/", addTranslationLogEntry);
router.delete("/:id", deleteTranslationLogEntry);

export default router;