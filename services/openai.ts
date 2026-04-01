import { generateText, Output } from "ai";
import { openai } from "@ai-sdk/openai";
import type { TemplateSections } from "../types/templates.js";
import { templateSchema, validationSchema, type TemplateOutput } from "./prompts/schemas.js";
import { GENERATION_SYSTEM, VALIDATION_SYSTEM, baseContext } from "./prompts/system.js";

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
