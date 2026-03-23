/**
 * Translation Log Routes
 * ----------------
 * Exposes API endpoints for translation log management, allowing clients to:
 * - GET 
 * - GET 
 * - POST 
 * - DELETE 
 */

import express from "express";
import { getTranslationLog, addTranslationLogEntry, deleteTranslationLogEntry } from "../controllers/translation_log.js";   

const router = express.Router();

router.get("/", getTranslationLog);
router.post("/", addTranslationLogEntry);
router.delete("/:id", deleteTranslationLogEntry);

export default router;