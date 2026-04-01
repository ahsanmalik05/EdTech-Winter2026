import express from "express";
import {
  availableLanguages,
  getLanguage,
  addLanguage,
  deleteLanguage,
} from "../controllers/languages.js";
import { authMiddleware } from "../middleware/auth.js";

const router = express.Router();

router.get("/", authMiddleware, availableLanguages);

router.post("/", authMiddleware, addLanguage);

router.get("/search", authMiddleware, getLanguage);

router.delete("/:id", authMiddleware, deleteLanguage);

export default router;
