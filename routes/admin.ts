import express from "express";
import { authMiddleware } from "../middleware/auth.js";
import { adminMiddleware } from "../middleware/admin.js";
import { getTranslationStats } from "../controllers/translate.js";
import {
  getAdminTranslationValidations,
  getAdminGenerationValidations,
} from "../controllers/admin_validations.js";

const router = express.Router();

router.use(authMiddleware);
router.use(adminMiddleware);

router.get("/stats", getTranslationStats);
router.get("/translation-validations", getAdminTranslationValidations);
router.get("/generation-validations", getAdminGenerationValidations);

export default router;
