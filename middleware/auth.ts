import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import config from "../config/config.js";

interface AuthRequest extends Request {
  user?: {
    id: number;
  };
}

export const authMiddleware = (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const token = req.cookies?.token;

    if (!token) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const decoded = jwt.verify(token, config.jwtSecret, {
      algorithms: ["HS256"],
    }) as {
      id: number;
    };

    req.user = { id: decoded.id };
    next();
  } catch (error) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
};

export const optionalAuthMiddleware = (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const token = req.cookies?.token;

    if (token) {
      const decoded = jwt.verify(token, config.jwtSecret, {
        algorithms: ["HS256"],
      }) as {
        id: number;
      };
      req.user = { id: decoded.id };
    }

    next();
  } catch {
    next();
  }
};
