import type { Request, Response } from "express";
import { randomBytes, createHash } from "crypto";
import { db } from "../db/index.js";
import { api_keys, users } from "../db/schema.js";
import { eq } from "drizzle-orm";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";

export const createApiKey = async (req: Request, res: Response) => {
  try {
    const { label, scopes } = req.body;

    if (!label || !scopes) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    console.log(authHeader);
    const token = authHeader.substring(7);
    console.log(token);
    const decodedToken = jwt.verify(token, process.env.JWT_SECRET!) as {
      id: number;
    };
    const userId = decodedToken.id;

    const userExists = await db
      .select()
      .from(users)
      .where(eq(users.id, userId));

    if (userExists.length === 0) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const raw = randomBytes(32).toString("hex");
    const public_key = randomBytes(8).toString("hex")
    const key = `mety_live_${public_key}_${raw}`;
    const hash = createHash("sha256").update(key).digest("hex");

    const api_key = await db
      .insert(api_keys)
      .values({
        users_id: userId,
        key: hash,
        label,
        publicKey: public_key,
        scopes,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning({
        id: api_keys.id,
        key: api_keys.key,
        label: api_keys.label,
        scopes: api_keys.scopes,
      });

    if (!api_key[0]) {
      return res.status(500).json({ error: "Failed to create API key" });
    }

    return res.status(201).json({
      api_key: { ...api_key[0], key: key },
    });
  } catch (error) {
    console.error("Error creating API key:", error);
    return res.status(500).json({ error: "Failed to create API key" });
  }
};

export const getApiKeys = async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const token = authHeader.substring(7);
    const decodedToken = jwt.verify(token, process.env.JWT_SECRET!) as {
      id: number;
    };
    const userId = decodedToken.id;

    const allKeys = await db
      .select()
      .from(api_keys)
      .where(eq(api_keys.users_id, userId));

    return res.status(200).json({ allKeys });
  } catch (error) {
    console.error("Error fetching API keys:", error);
    return res.status(500).json({ error: "Failed to fetch API keys" });
  }
};

export const getApiKeyData = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string, 10);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const key = req.headers["x-api-key"] as string;
    if (!key) {
      return res.status(400).json({ error: "Missing API key header" });
    }

    const hash = createHash("sha256").update(key).digest("hex");

    const [apiKey] = await db
      .select()
      .from(api_keys)
      .where(eq(api_keys.id, id))
      .limit(1);

    if (!apiKey || apiKey.key !== hash) {
      return res.status(404).json({ error: "API key not found" });
    }

    const { id: _, key: __, ...rest } = apiKey;

    return res.status(200).json({ apiKey: rest });
  } catch (error) {
    console.error("Error fetching API key:", error);
    return res.status(500).json({ error: "Failed to fetch API key" });
  }
};

export const updateApiKey = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string, 10);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid ID" });
    }

    const { label, scopes } = req.body;
    if (!label && !scopes) {
      return res.status(400).json({ error: "Nothing to update" });
    }

    const [updated] = await db
      .update(api_keys)
      .set({ ...(label && { label }), ...(scopes && { scopes }) })
      .where(eq(api_keys.id, id))
      .returning();

    if (!updated) {
      return res.status(404).json({ error: "API key not found" });
    }

    const { id: _, key: __, ...rest } = updated;

    return res.status(200).json({ apiKey: rest });
  } catch (error) {
    console.error("Error updating API key:", error);
    return res.status(500).json({ error: "Failed to update API key" });
  }
};

export const deleteApiKey = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string, 10);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid ID" });
    }

    const [deleted] = await db
      .delete(api_keys)
      .where(eq(api_keys.id, id))
      .returning();

    if (!deleted) {
      return res.status(404).json({ error: "API key not found" });
    }

    return res.status(200).json({ message: "API key deleted successfully" });
  } catch (error) {
    console.error("Error deleting API key:", error);
    return res.status(500).json({ error: "Failed to delete API key" });
  }
};
