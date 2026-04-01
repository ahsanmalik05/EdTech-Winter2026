import express from "express";
import {
  createApiKey,
  deleteApiKey,
  getApiKeyData,
  getApiKeys,
  updateApiKey,
} from "../controllers/api_key.js";
import { authMiddleware } from "../middleware/auth.js";

const router = express.Router();

router.get("/", authMiddleware, getApiKeys);
router.post("/", authMiddleware, createApiKey);
router.get("/:id", authMiddleware, getApiKeyData);
router.patch("/:id", authMiddleware, updateApiKey);
router.delete("/:id", authMiddleware, deleteApiKey);

export default router;
