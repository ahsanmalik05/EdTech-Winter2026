import type { Request, Response } from "express";
import { getTemplateGenerationLogs } from "../services/template_generation_log.js";

export const getTemplateGenerationLog = async (
  _req: Request,
  res: Response,
) => {
  try {
    const logEntries = await getTemplateGenerationLogs();
    return res.status(200).json({ log: logEntries });
  } catch (error) {
    console.error("Error fetching template generation log:", error);
    return res
      .status(500)
      .json({ error: "Failed to fetch template generation log" });
  }
};
