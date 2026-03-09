import express from "express";
import {
  createApiKey,
  deleteApiKey,
  getApiKeyData,
  getApiKeys,
  updateApiKey,
} from "../controllers/api_key.js";
const router = express.Router();

router.get("/", getApiKeys);
router.post("/", createApiKey);
router.get("/:id", getApiKeyData);
router.patch("/:id", updateApiKey);
router.delete("/:id", deleteApiKey);

export default router;
