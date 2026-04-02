import type { Request, Response } from "express";
import { db } from "../db/index.js";
import { users } from "../db/schema.js";
import { eq } from "drizzle-orm";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import type {
  AuthRegisterRequest,
  AuthLoginRequest,
  AuthResponse,
  MeResponse,
} from "../types/auth.js";
import config from "../config/config.js";
import { createEmailVerificationToken, consumeEmailVerificationToken } from "../services/email_verification.js";
import { sendVerificationEmail } from "../services/mailer.js";
import type { ErrorResponse } from "../types/response.js";

const IS_PROD = config.nodeEnv === "production";

const COOKIE_OPTIONS: import("express").CookieOptions = {
  httpOnly: true,
  secure: IS_PROD,
  sameSite: "lax",
  maxAge: 60 * 60 * 1000,
  path: "/",
};

export const register = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body as AuthRegisterRequest;
    if (!email || !password) {
      return res
        .status(400)
        .json({ error: "Email and password are required" } as ErrorResponse);
    }

    const userExists = await db
      .select()
      .from(users)
      .where(eq(users.email, email));

    if (userExists.length > 0) {
      return res
        .status(400)
        .json({ error: "User already exists" } as ErrorResponse);
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await db
      .insert(users)
      .values({ email, password: hashedPassword, emailVerified: false })
      .returning({ id: users.id, email: users.email, emailVerified: users.emailVerified });

    if (!user[0]) {
      return res
        .status(500)
        .json({ error: "Failed to register user" } as ErrorResponse);
    }

    const rawToken = await createEmailVerificationToken(user[0].id);
    const verifyUrl = `${config.appBaseUrl}/api/auth/verify-email?token=${encodeURIComponent(rawToken)}`;
    try {
      await sendVerificationEmail(user[0].email, verifyUrl);
    } catch (sendErr) {
      console.error(
        JSON.stringify({
          event: 'verification_email_failed',
          phase: 'register',
          recipient: user[0].email,
          error: sendErr instanceof Error ? sendErr.message : String(sendErr),
        }),
      );
    }

    const response: AuthResponse = {
      user: user[0],
      message: "Registration successful. Please verify your email before logging in.",
      verificationRequired: true,
    };
    return res.status(201).json(response);
  } catch (error) {
    console.error("Error registering user:", error);
    return res
      .status(500)
      .json({ error: "Failed to register user" } as ErrorResponse);
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body as AuthLoginRequest;
    if (!email || !password) {
      return res
        .status(400)
        .json({ error: "Email and password are required" } as ErrorResponse);
    }

    const user = await db.select().from(users).where(eq(users.email, email));

    if (user.length === 0) {
      return res
        .status(401)
        .json({ error: "Invalid credentials" } as ErrorResponse);
    }

    const isValidPassword = await bcrypt.compare(password, user[0]!.password);
    if (!isValidPassword) {
      return res
        .status(401)
        .json({ error: "Invalid credentials" } as ErrorResponse);
    }

    if (!user[0]!.emailVerified) {
      return res.status(403).json({
        error: "Email is not verified. Please check your inbox.",
        verificationRequired: true,
      } as ErrorResponse);
    }

    const token = jwt.sign({ id: user[0]!.id }, process.env.JWT_SECRET!, {
      expiresIn: "1h",
    });

    res.cookie("token", token, COOKIE_OPTIONS);
    const response: AuthResponse = {
      user: { id: user[0]!.id, email: user[0]!.email },
    };
    return res.status(200).json(response);
  } catch (error) {
    console.error("Error logging in user:", error);
    return res
      .status(500)
      .json({ error: "Failed to login user" } as ErrorResponse);
  }
};

export const logout = async (_req: Request, res: Response) => {
  res.clearCookie("token", {
    httpOnly: true,
    secure: IS_PROD,
    sameSite: "lax",
    path: "/",
  });
  return res.status(200).json({ message: "Logged out" });
};

export const me = async (req: Request, res: Response) => {
  try {
    const token = req.cookies?.token;

    if (!token) {
      return res.status(401).json({ error: "Unauthorized" } as ErrorResponse);
    }
    const decodedToken = jwt.verify(token, config.jwtSecret, {
      algorithms: ["HS256"],
    }) as {
      id: number;
    };
    const userId = decodedToken.id;

    const user = await db
      .select({ id: users.id, email: users.email, createdAt: users.createdAt, emailVerified: users.emailVerified })
      .from(users)
      .where(eq(users.id, userId));

    if (user.length === 0) {
      return res.status(404).json({ error: "User not found" } as ErrorResponse);
    }

    const response: MeResponse = { user: user[0]! };
    return res.status(200).json(response);
  } catch (error) {
    console.error("Error fetching user:", error);
    return res
      .status(500)
      .json({ error: "Failed to fetch user" } as ErrorResponse);
  }
};

export const verifyEmail = async (req: Request, res: Response) => {
  try {
    const token = req.query.token;
    const resultPageBase = `${config.appBaseUrl}/email-verified`;

    if (typeof token !== 'string' || token.trim() === '') {
      return res.redirect(`${resultPageBase}?status=error&message=${encodeURIComponent('Verification token is required')}`);
    }

    const userId = await consumeEmailVerificationToken(token.trim());
    if (!userId) {
      return res.redirect(`${resultPageBase}?status=error&message=${encodeURIComponent('Invalid or expired verification link')}`);
    }

    return res.redirect(`${resultPageBase}?status=success`);
  } catch (error) {
    console.error('Error verifying email:', error);
    return res.redirect(`${config.appBaseUrl}/email-verified?status=error&message=${encodeURIComponent('Verification failed. Please request a new email.')}`);
  }
};

export const resendVerificationEmail = async (req: Request, res: Response) => {
  try {
    const { email } = req.body as { email?: string };
    if (!email || typeof email !== 'string') {
      return res.status(400).json({ error: 'Email is required' } as ErrorResponse);
    }

    const [user] = await db.select().from(users).where(eq(users.email, email));

    if (!user || user.emailVerified) {
      return res.status(200).json({ message: 'If this account exists, a verification email has been sent.' });
    }

    const rawToken = await createEmailVerificationToken(user.id);
    const verifyUrl = `${config.appBaseUrl}/api/auth/verify-email?token=${encodeURIComponent(rawToken)}`;
    await sendVerificationEmail(user.email, verifyUrl);

    return res.status(200).json({ message: 'Verification email sent.' });
  } catch (error) {
    console.error('Error resending verification email:', error);
    return res.status(500).json({ error: 'Failed to resend verification email' } as ErrorResponse);
  }
};
