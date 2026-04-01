import express from "express";
import { availableLanguages, getLanguage, addLanguage, deleteLanguage } from "../controllers/languages.js";

const router = express.Router();

router.get("/", availableLanguages);

router.post("/", addLanguage);

router.get("/search", getLanguage);

router.delete("/:id", deleteLanguage);

export default router;