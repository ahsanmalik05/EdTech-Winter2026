import express from "express";
import {
  generate,
  getById,
  list,
  update,
  deactivate,
} from "../controllers/templates.js";
import { authMiddleware } from "../middleware/auth.js";

const router = express.Router();

router.post("/generate", authMiddleware, generate);
router.get("/", authMiddleware, list);
router.get("/:id", authMiddleware, getById);
router.patch("/:id", authMiddleware, update);
router.delete("/:id", authMiddleware, deactivate);

export default router;
