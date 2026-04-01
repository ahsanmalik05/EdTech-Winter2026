import express from "express";
import { getTemplateGenerationLog } from "../controllers/template_generation_log.js";
import { authMiddleware } from "../middleware/auth.js";

const router = express.Router();

router.get("/", authMiddleware, getTemplateGenerationLog);

export default router;
