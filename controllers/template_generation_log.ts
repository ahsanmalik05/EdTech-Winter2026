import type { Request, Response } from "express";
import { getTemplateGenerationLogs } from "../services/template_generation_log.js";

export const getTemplateGenerationLog = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id ?? req.apiKey?.user_id;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const logEntries = await getTemplateGenerationLogs(userId);
    return res.status(200).json({ log: logEntries });
  } catch (error) {
    console.error("Error fetching template generation log:", error);
    return res
      .status(500)
      .json({ error: "Failed to fetch template generation log" });
  }
};
