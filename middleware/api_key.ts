import express from "express";
import type { Request, Response, NextFunction } from "express";
import { db } from "../db/index.js";
import { eq } from "drizzle-orm";
import { api_keys } from "../db/schema.js";
import { createHash } from "crypto";
import {
  elapsedMs,
  getRequestMeta,
  logError,
  logInfo,
  logWarn,
} from "../utils/observability.js";

export const apiKeyMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    if (req.path.startsWith("/auth") || req.path.startsWith("/keys")) {
      return next();
    }

    const requestMeta = getRequestMeta(req);
    const apiKey = req.headers["x-api-key"] as string;
    if (!apiKey) {
      logWarn("api_key_missing", requestMeta);
      return res.status(401).json({ error: "API key is required" });
    }

    const public_key = apiKey.split("_")[2];

    if (!public_key) {
      logWarn("api_key_malformed", requestMeta);
      return res.status(401).json({ error: "Invalid API key" });
    }

    const lookupStartedAt = Date.now();
    logInfo("api_key_lookup_started", {
      ...requestMeta,
      publicKeyPrefix: public_key.slice(0, 8),
    });

    const apiKeyResult = await db
      .select()
      .from(api_keys)
      .where(eq(api_keys.publicKey, public_key))
      .limit(1);

    logInfo("api_key_lookup_finished", {
      ...requestMeta,
      publicKeyPrefix: public_key.slice(0, 8),
      durationMs: elapsedMs(lookupStartedAt),
      rowCount: apiKeyResult.length,
    });

    if (apiKeyResult.length === 0 || !apiKeyResult[0]) {
      logWarn("api_key_not_found", {
        ...requestMeta,
        publicKeyPrefix: public_key.slice(0, 8),
      });
      return res.status(401).json({ error: "Invalid API key" });
    }

    const providedHash = createHash("sha256").update(apiKey).digest("hex");
    const storedHash = apiKeyResult[0].key;
    if (providedHash !== storedHash) {
      logWarn("api_key_hash_mismatch", {
        ...requestMeta,
        publicKeyPrefix: public_key.slice(0, 8),
        apiKeyId: apiKeyResult[0].id,
      });
      return res.status(401).json({ error: "Invalid API key" });
    }

    req.apiKey = {
      id: apiKeyResult[0].id,
      user_id: apiKeyResult[0].users_id,
      label: apiKeyResult[0].label,
      scopes: apiKeyResult[0].scopes!,
      createdAt: apiKeyResult[0].createdAt,
      updatedAt: apiKeyResult[0].updatedAt,
    };

    logInfo("api_key_verified", {
      ...requestMeta,
      apiKeyId: apiKeyResult[0].id,
      userId: apiKeyResult[0].users_id,
    });
    next();
  } catch (error) {
    logError("api_key_middleware_failed", error, getRequestMeta(req));
    return res.status(500).json({ error: "Failed to verify API key" });
  }
};
