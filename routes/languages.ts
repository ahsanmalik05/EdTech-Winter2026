/**
 * Languages Routes
 * ----------------
 * Exposes API endpoints for language management:
 * - GET /api/languages: List all languages
 * - GET /api/languages?code=fr or ?name=French: Get language by code or name
 * - POST /api/languages: Add a new language
 * - DELETE /api/languages/:id: Delete a language by ID
 */

import express from "express";
import { availableLanguages, getLanguage, addLanguage, deleteLanguage } from "../controllers/languages.js";

const router = express.Router();

router.get("/", availableLanguages);

router.post("/", addLanguage);

router.get("/search", getLanguage);

router.delete("/:id", deleteLanguage);

export default router;