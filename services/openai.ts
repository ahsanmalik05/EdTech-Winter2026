import { generateText, Output } from "ai";
import { openai } from "@ai-sdk/openai";
import type { TemplateSections } from "../types/templates.js";
import {
  templateSchema,
  validationSchema,
  similarityScoreSchema,
  type TemplateOutput,
} from "./prompts/schemas.js";
import {
  GENERATION_SYSTEM,
  VALIDATION_SYSTEM,
  baseContext,
} from "./prompts/system.js";
import { logTemplateValidation } from "./template_validation_log.js";

const KNOWLEDGE_TYPES = [
  "facts",
  "strategies",
  "procedures",
  "rationales",
] as const;

function flattenAssessment(
  topic: string,
  assessment: TemplateOutput["model_assessment"],
): string {
  const opening = `With this in mind, this is how I might assess my own knowledge of ${topic}.`;
  const parts = KNOWLEDGE_TYPES.map((type) => assessment[type].content);
  return [opening, ...parts].join("\n\n");
}

export function validateInBackground(
  templateId: number,
  generationLogId: number | null,
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
  })
    .then(({ output: validation }) => {
      if (validation) {
        void logTemplateValidation({
          templateId,
          generationLogId,
          isValid: validation.valid,
          issues: validation.issues,
          model: modelId,
        });
        if (!validation.valid) {
          console.warn(
            `Template validation issues [${subject}/${topic}]:`,
            validation.issues,
          );
        }
      }
    })
    .catch((err) => {
      console.error("Background validation failed:", err);
    });
}

export interface GenerationResult {
  sections: TemplateSections;
  usage: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  } | null;
}

export async function orchestrateGeneration(
  subject: string,
  topic: string,
  gradeLevel: string,
  modelId: string = "gpt-5-nano",
): Promise<GenerationResult> {
  const { output, usage } = await generateText({
    model: openai(modelId),
    output: Output.object({
      schema: templateSchema,
    }),
    system: GENERATION_SYSTEM,
    prompt: `${baseContext(subject, topic, gradeLevel)}\n\nGenerate the complete self-assessment script now.`,
    providerOptions: {
      openai: { reasoningEffort: "low" },
    },
  });

  if (!output) throw new Error("Failed to generate template");

  const sections: TemplateSections = {
    introduction: output.introduction,
    model_assessment: flattenAssessment(topic, output.model_assessment),
    self_review: output.self_review,
  };

  const usageResult =
    usage && usage.inputTokens !== undefined && usage.outputTokens !== undefined
      ? {
          inputTokens: usage.inputTokens,
          outputTokens: usage.outputTokens,
          totalTokens: (usage.inputTokens ?? 0) + (usage.outputTokens ?? 0),
        }
      : null;

  return { sections, usage: usageResult };
}

export async function scoreSimilarity(
  original: string,
  backTranslated: string,
  modelId: string = "gpt-5-nano",
): Promise<{ score: number; reasoning: string } | null> {
  const systemPrompt = `You are evaluating translation quality. You will be given an original text and a back-translated version of it (translated to another language, then back to the original language). A perfect round-trip translation would produce text identical in meaning to the original.

Compare the two texts and respond with a JSON object containing:
- "score": a number between 0.0 and 1.0
- "reasoning": one sentence explaining the score

Scoring guide:
- 0.9 to 1.0: meaning is fully preserved, only trivial wording differences
- 0.7 to 0.9: meaning mostly preserved, minor nuances lost
- 0.5 to 0.7: meaning partially preserved, some key ideas altered
- below 0.5: significant meaning lost or distorted`;

  const prompt = `ORIGINAL TEXT:\n${original}\n\nBACK-TRANSLATED TEXT:\n${backTranslated}`;

  try {
    const { output } = await generateText({
      model: openai(modelId),
      output: Output.object({
        schema: similarityScoreSchema,
      }),
      system: systemPrompt,
      prompt,
    });

    if (!output) return null;

    return {
      score: output.score,
      reasoning: output.reasoning,
    };
  } catch (error) {
    console.error("Failed to score similarity:", error);
    return null;
  }
}
