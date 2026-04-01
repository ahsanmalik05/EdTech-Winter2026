import type { Request, Response } from "express";
import { randomBytes, createHash } from "crypto";
import { db } from "../db/index.js";
import { api_keys, users } from "../db/schema.js";
import { eq, and } from "drizzle-orm";
import bcrypt from "bcrypt";
import type {
  CreateApiKeyRequest,
  UpdateApiKeyRequest,
  CreateApiKeyResponse,
  DeleteApiKeyResponse,
} from "../types/apiKey.js";
import type { ErrorResponse } from "../types/response.js";

export const createApiKey = async (req: Request, res: Response) => {
  try {
    const { label, scopes } = req.body as CreateApiKeyRequest;

    if (!label || !scopes) {
      return res
        .status(400)
        .json({ error: "Missing required fields" } as ErrorResponse);
    }

    const VALID_SCOPES = ["read", "translate", "write"] as const;

    if (!Array.isArray(scopes) || scopes.length === 0) {
      return res
        .status(400)
        .json({ error: "scopes must be a non-empty array" } as ErrorResponse);
    }

    const invalidScopes = scopes.filter((s) => !VALID_SCOPES.includes(s));
    if (invalidScopes.length > 0) {
      return res.status(400).json({
        error: `Invalid scopes: ${invalidScopes.join(", ")}. Valid values are: ${VALID_SCOPES.join(", ")}`,
      } as ErrorResponse);
    }

    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" } as ErrorResponse);
    }

    const userExists = await db
      .select()
      .from(users)
      .where(eq(users.id, userId));

    if (userExists.length === 0) {
      return res
        .status(401)
        .json({ error: "Invalid credentials" } as ErrorResponse);
    }

    const raw = randomBytes(32).toString("hex");
    const public_key = randomBytes(8).toString("hex");
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
        createdAt: api_keys.createdAt,
        updatedAt: api_keys.updatedAt,
      });

    if (!api_key[0]) {
      return res
        .status(500)
        .json({ error: "Failed to create API key" } as ErrorResponse);
    }

    const response: CreateApiKeyResponse = {
      api_key: { ...api_key[0], key: key, scopes: api_key[0].scopes || [] },
    };
    return res.status(201).json(response);
  } catch (error) {
    console.error("Error creating API key:", error);
    return res
      .status(500)
      .json({ error: "Failed to create API key" } as ErrorResponse);
  }
};

export const getApiKeys = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" } as ErrorResponse);
    }

    const allKeys = await db
      .select()
      .from(api_keys)
      .where(eq(api_keys.users_id, userId));

    return res.status(200).json({ allKeys });
  } catch (error) {
    console.error("Error fetching API keys:", error);
    return res
      .status(500)
      .json({ error: "Failed to fetch API keys" } as ErrorResponse);
  }
};

export const getApiKeyData = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" } as ErrorResponse);
    }

    const id = parseInt(req.params.id as string, 10);
    if (isNaN(id)) {
      return res
        .status(400)
        .json({ error: "Missing required fields" } as ErrorResponse);
    }

    const [apiKey] = await db
      .select()
      .from(api_keys)
      .where(and(eq(api_keys.id, id), eq(api_keys.users_id, userId)))
      .limit(1);

    if (!apiKey) {
      return res
        .status(404)
        .json({ error: "API key not found" } as ErrorResponse);
    }

    const { id: _, key: __, ...rest } = apiKey;

    return res.status(200).json({ apiKey: rest });
  } catch (error) {
    console.error("Error fetching API key:", error);
    return res
      .status(500)
      .json({ error: "Failed to fetch API key" } as ErrorResponse);
  }
};

export const updateApiKey = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" } as ErrorResponse);
    }

    const id = parseInt(req.params.id as string, 10);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid ID" } as ErrorResponse);
    }

    const { label, scopes } = req.body as UpdateApiKeyRequest;
    if (!label && !scopes) {
      return res
        .status(400)
        .json({ error: "Nothing to update" } as ErrorResponse);
    }

    // Validate scopes if provided
    const VALID_SCOPES = ["read", "translate", "write"] as const;

    if (scopes !== undefined) {
      if (!Array.isArray(scopes) || scopes.length === 0) {
        return res
          .status(400)
          .json({ error: "scopes must be a non-empty array" } as ErrorResponse);
      }

      const invalidScopes = scopes.filter((s) => !VALID_SCOPES.includes(s));

      if (invalidScopes.length > 0) {
        return res.status(400).json({
          error: `Invalid scopes: ${invalidScopes.join(", ")}. Valid values are: ${VALID_SCOPES.join(", ")}`,
        } as ErrorResponse);
      }
    }

    const [updated] = await db
      .update(api_keys)
      .set({ ...(label && { label }), ...(scopes && { scopes }) })
      .where(and(eq(api_keys.id, id), eq(api_keys.users_id, userId)))
      .returning();

    if (!updated) {
      return res
        .status(404)
        .json({ error: "API key not found" } as ErrorResponse);
    }

    const { id: _, key: __, ...rest } = updated;

    return res.status(200).json({ apiKey: rest });
  } catch (error) {
    console.error("Error updating API key:", error);
    return res
      .status(500)
      .json({ error: "Failed to update API key" } as ErrorResponse);
  }
};

export const deleteApiKey = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" } as ErrorResponse);
    }

    const id = parseInt(req.params.id as string, 10);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid ID" } as ErrorResponse);
    }

    const [deleted] = await db
      .delete(api_keys)
      .where(and(eq(api_keys.id, id), eq(api_keys.users_id, userId)))
      .returning();

    if (!deleted) {
      return res
        .status(404)
        .json({ error: "API key not found" } as ErrorResponse);
    }

    const response: DeleteApiKeyResponse = {
      message: "API key deleted successfully",
    };
    return res.status(200).json(response);
  } catch (error) {
    console.error("Error deleting API key:", error);
    return res
      .status(500)
      .json({ error: "Failed to delete API key" } as ErrorResponse);
  }
};
