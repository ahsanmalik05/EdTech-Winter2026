import express from "express";
import { getTemplateGenerationLog } from "../controllers/template_generation_log.js";

const router = express.Router();

router.get("/", getTemplateGenerationLog);

export default router;
