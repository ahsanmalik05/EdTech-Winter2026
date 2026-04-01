import { generateObject, generateText, Output } from "ai";
import { openai } from "@ai-sdk/openai";
import type { TemplateSections } from "../types/templates.js";
import { normalizedInputSchema, templateSchema, validationSchema, type TemplateOutput } from "./prompts/schemas.js";
import { GENERATION_SYSTEM, VALIDATION_SYSTEM, baseContext } from "./prompts/system.js";

export async function normalizeInputs(
  subject: string,
  gradeLevel: string,
): Promise<{ subject: string; gradeLevel: string }> {
  try {
    const { object } = await generateObject({
      model: openai("gpt-5-nano"),
      schema: normalizedInputSchema,
      prompt: `Normalize the following educational template inputs.

Rules:
- Subject: Title Case the full, standard subject name. Expand abbreviations (e.g. "comp sci" → "Computer Science", "Cs" → "Computer Science", "bio" → "Biology"). If it's already correct, keep it as-is.
- Grade Level: Capitalize properly (e.g. "5th grade" → "5th Grade"). If just a number, infer the grade (e.g. "3" → "3rd Grade"). If already correct, keep as-is.

Inputs:
Subject: ${subject}
Grade Level: ${gradeLevel}`,
    });
    return { subject: object.subject, gradeLevel: object.gradeLevel };
  } catch (err) {
    console.error("Input normalization failed, using title-case fallback:", err);
    return {
      subject: subject.trim().replace(/\b\w/g, (c) => c.toUpperCase()),
      gradeLevel: gradeLevel.trim().replace(/\b\w/g, (c) => c.toUpperCase()),
    };
  }
}

const KNOWLEDGE_TYPES = ["facts", "strategies", "procedures", "rationales"] as const;

function flattenAssessment(
  topic: string,
  assessment: TemplateOutput["model_assessment"],
): string {
  const opening = `With this in mind, this is how I might assess my own knowledge of ${topic}.`;
  const parts = KNOWLEDGE_TYPES.map((type) => assessment[type].content);
  return [opening, ...parts].join("\n\n");
}

function validateInBackground(
  subject: string,
  topic: string,
  gradeLevel: string,
  sections: TemplateSections,
  modelId: string,
) {
  generateText({
    model: openai(modelId),
    output: Output.object({
      schema: validationSchema,
    }),
    system: VALIDATION_SYSTEM,
    prompt: `Subject: ${subject}\nTopic: ${topic}\nGrade Level: ${gradeLevel}\n\nINTRODUCTION:\n${sections.introduction}\n\nMODEL SELF-ASSESSMENT:\n${sections.model_assessment}\n\nSELF-REVIEW:\n${sections.self_review}`,
  }).then(({ output: validation }) => {
    if (validation && !validation.valid) {
      console.warn(`Template validation issues [${subject}/${topic}]:`, validation.issues);
    }
  }).catch((err) => {
    console.error('Background validation failed:', err);
  });
}

export async function orchestrateGeneration(
  subject: string,
  topic: string,
  gradeLevel: string,
  modelId: string = "gpt-5-nano",
): Promise<TemplateSections> {
  const { output } = await generateText({
    model: openai(modelId),
    output: Output.object({
      schema: templateSchema,
    }),
    system: GENERATION_SYSTEM,
    prompt: `${baseContext(subject, topic, gradeLevel)}\n\nGenerate the complete self-assessment script now.`,
    providerOptions: {
      openai: { reasoningEffort: 'low' },
    },
  });

  if (!output) throw new Error("Failed to generate template");

  const sections: TemplateSections = {
    introduction: output.introduction,
    model_assessment: flattenAssessment(topic, output.model_assessment),
    self_review: output.self_review,
  };

  validateInBackground(subject, topic, gradeLevel, sections, modelId);

  return sections;
}
