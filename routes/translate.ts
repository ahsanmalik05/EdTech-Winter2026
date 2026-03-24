import express from "express";
import { batchTranslate } from "../controllers/translate.js";

const router = express.Router();

router.post("/batch", batchTranslate);

export default router;
