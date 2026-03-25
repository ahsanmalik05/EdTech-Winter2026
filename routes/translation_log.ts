/**
 * Translation Log Routes
 * ----------------
 * Exposes API endpoints for translation log management, allowing clients to:
 * - GET /           Retrieve all translation log entries
 * - GET /filter     Retrieve filtered entries by query params: user_id, target_language
 * - POST /          Add a new translation log entry
 * - DELETE /:id     Delete a translation log entry by id
 */

import express from "express";
import { getTranslationLog, getTranslationLogEntry, addTranslationLogEntry, deleteTranslationLogEntry, getLogsByDateRangeHandler } from "../controllers/translation_log.js";

const router = express.Router();

router.get("/", getTranslationLog);
router.get("/filter", getTranslationLogEntry);
router.get("/range", getLogsByDateRangeHandler);
router.post("/", addTranslationLogEntry);
router.delete("/:id", deleteTranslationLogEntry);

export default router;