import type { Request, Response } from "express";
import {
  DEFAULT_TEMPLATE_MODEL,
  generateTemplate,
  getTemplateById,
  listTemplates,
  updateTemplate,
  deactivateTemplate,
} from "../services/templates.js";
import { normalizeInputs } from "../services/openai.js";
import { logTemplateGeneration } from "../services/template_generation_log.js";
import { validateInBackground } from "../services/openai.js";
import type {
  GenerateTemplateRequest,
  ListTemplatesQuery,
  UpdateTemplateRequest,
} from "../types/templates.js";

export const generate = async (
  req: Request<object, object, GenerateTemplateRequest>,
  res: Response,
) => {
  const startedAt = Date.now();
  const { subject, topic, gradeLevel } = req.body;

  try {
    if (!subject || typeof subject !== "string") {
      res
        .status(400)
        .json({ error: "subject is required and must be a string" });
      return;
    }
    if (!topic || typeof topic !== "string") {
      res.status(400).json({ error: "topic is required and must be a string" });
      return;
    }
    if (!gradeLevel || typeof gradeLevel !== "string") {
      res
        .status(400)
        .json({ error: "gradeLevel is required and must be a string" });
      return;
    }

    const userId = req.user?.id ?? req.apiKey?.user_id;

    const normalized = await normalizeInputs(subject, gradeLevel);
    const normalizedSubject = normalized.subject;
    const normalizedGradeLevel = normalized.gradeLevel;

    const result = await generateTemplate(
      { subject: normalizedSubject, topic, gradeLevel: normalizedGradeLevel },
      userId,
    );
    const latencyMs = Date.now() - startedAt;

    logTemplateGeneration({
      templateId: result.response.id,
      ...(userId ? { userId } : {}),
      subject: normalizedSubject,
      topic,
      gradeLevel: normalizedGradeLevel,
      model: DEFAULT_TEMPLATE_MODEL,
      success: true,
      tokenCount: result.usage?.totalTokens ?? undefined,
      inputTokenCount: result.usage?.inputTokens ?? undefined,
      outputTokenCount: result.usage?.outputTokens ?? undefined,
      costUsd: undefined,
      latencyMs,
    })
      .then((generationLogId) => {
        validateInBackground(
          result.response.id,
          generationLogId,
          subject,
          topic,
          gradeLevel,
          result.response.sections,
          DEFAULT_TEMPLATE_MODEL,
        );
      })
      .catch((err) => console.error("Failed to log template generation:", err));

    res.status(201).json(result.response);
  } catch (error) {
    console.error("Template generation error:", error);
    const latencyMs = Date.now() - startedAt;

    if (
      typeof subject === "string" &&
      typeof topic === "string" &&
      typeof gradeLevel === "string"
    ) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Unknown template generation error";

      logTemplateGeneration({
        ...(req.apiKey ? { userId: req.apiKey.user_id } : {}),
        subject,
        topic,
        gradeLevel,
        model: DEFAULT_TEMPLATE_MODEL,
        success: false,
        errorMessage,
        tokenCount: undefined,
        inputTokenCount: undefined,
        outputTokenCount: undefined,
        costUsd: undefined,
        latencyMs,
      }).catch((err) =>
        console.error("Failed to log template generation failure:", err),
      );
    }

    res.status(500).json({ error: "Failed to generate template" });
  }
};

export const getById = async (req: Request<{ id: string }>, res: Response) => {
  try {
    const userId = req.user?.id ?? req.apiKey?.user_id;
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid template ID" });
      return;
    }

    const template = await getTemplateById(id, userId);
    if (!template) {
      res.status(404).json({ error: "Template not found" });
      return;
    }

    res.status(200).json(template);
  } catch (error) {
    console.error("Get template error:", error);
    res.status(500).json({ error: "Failed to retrieve template" });
  }
};

export const list = async (
  req: Request<object, object, object, ListTemplatesQuery>,
  res: Response,
) => {
  try {
    const userId = req.user?.id ?? req.apiKey?.user_id;
    const filters: ListTemplatesQuery = {};

    if (req.query.subject) filters.subject = req.query.subject as string;
    if (req.query.gradeLevel)
      filters.gradeLevel = req.query.gradeLevel as string;
    if (req.query.isActive !== undefined) {
      filters.isActive =
        req.query.isActive === true ||
        req.query.isActive === ("true" as unknown as boolean);
    }

    const result = await listTemplates(filters, userId);
    res.status(200).json(result);
  } catch (error) {
    console.error("List templates error:", error);
    res.status(500).json({ error: "Failed to list templates" });
  }
};

export const update = async (
  req: Request<{ id: string }, object, UpdateTemplateRequest>,
  res: Response,
) => {
  try {
    const userId = req.user?.id ?? req.apiKey?.user_id;
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid template ID" });
      return;
    }

    const updated = await updateTemplate(id, req.body, userId);
    if (!updated) {
      res.status(404).json({ error: "Template not found" });
      return;
    }

    res.status(200).json(updated);
  } catch (error) {
    console.error("Update template error:", error);
    res.status(500).json({ error: "Failed to update template" });
  }
};

export const deactivate = async (
  req: Request<{ id: string }>,
  res: Response,
) => {
  try {
    const userId = req.user?.id ?? req.apiKey?.user_id;
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid template ID" });
      return;
    }

    const success = await deactivateTemplate(id, userId);
    if (!success) {
      res.status(404).json({ error: "Template not found" });
      return;
    }

    res.status(204).send();
  } catch (error) {
    console.error("Deactivate template error:", error);
    res.status(500).json({ error: "Failed to deactivate template" });
  }
};
