import type { Request, Response } from "express";
import { eq } from "drizzle-orm";
import { db } from "../db/index.js";

export const getTranslationLog = async (req: Request, res: Response) => {
    try{

    } catch (error) {
        console.error("Error fetching translation log:", error);
        return res.status(500).json({ error: "Failed to fetch translation log" });
    }
}

export const getTranslationLogEntry = async (req: Request, res: Response) => {
    try {
    } catch (error) {
        console.error("Error fetching translation log entry:", error);
        return res.status(500).json({ error: "Failed to fetch translation log entry" });
    }
}

export const addTranslationLogEntry = async (req: Request, res: Response) => {
    try {
    } catch (error) {
        console.error("Error adding translation log entry:", error);
        return res.status(500).json({ error: "Failed to add translation log entry" });
    }
}

export const deleteTranslationLogEntry = async (req: Request, res: Response) => {
    try {
    } catch (error) {
        console.error("Error deleting translation log entry:", error);
        return res.status(500).json({ error: "Failed to delete translation log entry" });
    }
}