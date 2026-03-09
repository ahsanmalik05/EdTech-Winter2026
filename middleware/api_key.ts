import express from "express";
import type { Request, Response, NextFunction } from "express";
import { db } from "../db/index.js";
import { eq } from "drizzle-orm";
import { api_keys } from "../db/schema.js";
import { createHash } from "crypto";

export const apiKeyMiddleware = async (req: Request, res: Response, next: NextFunction) => {
    try{
        if (req.path.includes("/api/auth") || req.path.includes("/api/keys")) {
            return next();
        }
        const apiKey = req.headers["x-api-key"] as string;
        if (!apiKey) {
            return res.status(401).json({ error: "API key is required" });
        }


        const public_key = apiKey.split("_")[2];


        if (!public_key) {
            return res.status(401).json({ error: "Invalid API key" });
        }

        const apiKeyResult = await db.select().from(api_keys).where(eq(api_keys.publicKey, public_key)).limit(1);

        
        if (apiKeyResult.length === 0 || !apiKeyResult[0]) {
            return res.status(401).json({ error: "Invalid API key" });
        }

        const providedHash = createHash("sha256").update(apiKey).digest("hex");
        const storedHash = apiKeyResult[0].key;
        if (providedHash !== storedHash) {
            return res.status(401).json({ error: "Invalid API key" });
        }
        
        req.apiKey = {
            id: apiKeyResult[0].id,
            user_id: apiKeyResult[0].users_id,
            label: apiKeyResult[0].label,
            scopes: apiKeyResult[0].scopes!,
        }
        
        next();
    }
    catch(error) {
        console.error("Error in API key middleware:", error);
        return res.status(500).json({ error: "Failed to verify API key" });
    }
}
