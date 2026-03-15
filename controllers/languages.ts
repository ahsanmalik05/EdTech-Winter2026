/**
 * Languages Controller
 * --------------------
 * Handles API endpoints for managing languages in the system.
 * 
 * Features:
 * - List all available languages
 * - Get a language by code or name
 * - Add a new language
 * - Delete a language by ID
 * 
 * Error Handling:
 * - Validates input for code and name
 * - Prevents duplicate entries
 * - Returns clear error messages for invalid requests
 * 
 * Usage:
 * Import and use in routes/languages.ts to expose language-related endpoints.
 */

import type { Request, Response } from "express";
import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { languages } from "../db/schema.js";

interface Language {
    id: number;
    name: string;
    code: string;
}

export const availableLanguages = async (req: Request, res: Response) => {
    try {
        const allLanguages: Language[] = await db
            .select()
            .from(languages)
            .execute();

        return res.status(200).json({ languages: allLanguages });
    } catch (error) {
        console.error("Error fetching languages:", error);
        return res.status(500).json({ error: "Failed to fetch languages" });
    }
}

export const getLanguage = async (req: Request, res: Response) => {
    try {
        const { code, name } = req.query;
        if (!code && !name) {
            return res.status(400).json({ error: "Provide either code or name" });
        }

        if (code) {
            if (typeof code !== 'string' || code.trim() === '' || code.trim().includes(' ')) {
                return res.status(400).json({ error: "Code must be a non-empty string without spaces" });
            }
        }

        if (name) {
            if (typeof name !== 'string' || name.trim() === '' || name.trim().includes(' ')) {
                return res.status(400).json({ error: "Name must be a non-empty string without spaces" });
            }
        }

        let language;
        if (code && typeof code === "string") {
            language = await db
            .select()
            .from(languages)
            .where(eq(languages.code, code))
            .execute()
            .then(results => results[0]);
        } else if (name && typeof name === "string") {
            language = await db
            .select()
            .from(languages)
            .where(eq(languages.name, name))
            .execute()
            .then(results => results[0]);
        }

        if (!language) {
            return res.status(404).json({ error: "Language not found" });
        }

        return res.status(200).json({ language });
    } catch (error) {
        console.error("Error fetching language:", error);
        return res.status(500).json({ error: "Failed to fetch language" });
    }
}

export const addLanguage = async (req: Request, res: Response) => {
    try {
        const { name, code } = req.body;
        if (!name || !code) {
            return res.status(400).json({ error: "Name and code are required" });
        }
        if (name.length > 255 || code.length > 16) {
            return res.status(400).json({ error: "Name or code exceeds maximum length" });
        }
        if (typeof name !== 'string' || name.trim().includes(' ') || typeof code !== 'string' || code.trim().includes(' ')) {
            return res.status(400).json({ error: "Name and code must be non-empty strings without spaces" });
        }

        const exists = await db.select().from(languages)
            .where(eq(languages.code, code))
            .execute();
            
        if (exists.length > 0) {
            return res.status(409).json({ error: "Language code already exists" });
        }

        const newLanguage = await db
            .insert(languages)
            .values({ name, code })
            .returning();

        return res.status(201).json({ language: newLanguage });
    } catch (error) {
        console.error("Error adding language:", error);
        return res.status(500).json({ error: "Failed to add language" });
    }
}

export const deleteLanguage = async (req: Request, res: Response) => {
    try {
        const idParam = typeof req.params.id === "string" ? req.params.id : undefined;
        if (!idParam) {
            return res.status(400).json({ error: "Language ID is required" });
        }

        const id = Number(idParam);
        if (!idParam || typeof id !== "number" || !Number.isInteger(id)) {
            return res.status(400).json({ error: "Invalid language ID" });
        }

        const deleteResult: Language[] = await db
            .delete(languages)
            .where(eq(languages.id, id))
            .returning();

        if (deleteResult.length === 0) {
            return res.status(404).json({ error: "Language not found" });
        }

        return res.status(200).json({ message: "Language deleted successfully" });
    } catch (error) {
        console.error("Error deleting language:", error);
        return res.status(500).json({ error: "Failed to delete language" });
    }
}

