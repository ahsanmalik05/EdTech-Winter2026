import type { Request, Response } from "express";
import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { worksheets } from "../db/schema.js";
import type { GetWorksheetsByTitleResponse, ErrorResponse } from "../types/index.js";

export const getWorksheetsByTitle = async (req: Request, res: Response): Promise<void> => {
  try {
    const rawTitle = req.params.title;
    const title = Array.isArray(rawTitle) ? rawTitle[0] : rawTitle;

    if (!title || title.trim().length === 0) {
      return res.status(400).json({ error: "Title is required" } as ErrorResponse);
    }

    const matchingWorksheets = await db
      .select()
      .from(worksheets)
      .where(eq(worksheets.title, title.trim()));

    const response: GetWorksheetsByTitleResponse = { worksheets: matchingWorksheets };
    return res.status(200).json(response);
  } catch (error) {
    console.error("Error fetching worksheets by title:", error);
    return res.status(500).json({ error: "Failed to fetch worksheets" } as ErrorResponse);
  }
};
