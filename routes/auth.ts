import express from "express";

import { register, login, logout, me, verifyEmail, resendVerificationEmail } from "../controllers/auth.js";

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.get("/verify-email", verifyEmail);
router.post("/resend-verification", resendVerificationEmail);
router.post("/logout", logout);
router.get("/me", me);

export default router;