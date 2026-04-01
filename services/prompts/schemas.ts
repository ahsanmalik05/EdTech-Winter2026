import { z } from "zod";

const knowledgeTypeAssessment = z.object({
  content: z
    .string()
    .describe(
      "The student's narrative self-assessment of this knowledge type, written in first person as a student thinking aloud. Must include realistic gaps and uncertainties, not perfect textbook answers.",
    ),
  gaps: z
    .array(z.string())
    .describe(
      'Specific things the student is unsure about or cannot remember for this knowledge type (e.g., "I don\'t remember whether subtraction always comes before addition").',
    ),
});

export const templateSchema = z.object({
  introduction: z
    .string()
    .describe(
      'The introduction section. Teaches students how to self-assess by explaining facts, strategies, procedures, and rationales in the context of this specific subject/topic. Written as flowing narrative prose in first person as a teacher speaking to a student. Must open with "Script for self-assessment" and end with: You can think of facts as telling you "what", strategies and procedures as telling you "how" and rationales as telling you "why".',
    ),
  model_assessment: z
    .object({
      facts: knowledgeTypeAssessment.describe(
        "Assessment of factual knowledge — concepts, definitions, elements, characters, dates, people, or other foundational information relevant to the subject.",
      ),
      strategies: knowledgeTypeAssessment.describe(
        "Assessment of strategy knowledge — general processes, approaches, plot structures, or problem-solving methods used in the subject.",
      ),
      procedures: knowledgeTypeAssessment.describe(
        "Assessment of procedural knowledge — specific steps, events, or sequences within the strategy.",
      ),
      rationales: knowledgeTypeAssessment.describe(
        "Assessment of rationale knowledge — reasons why strategies or procedures work, author's purpose, cause-and-effect, or broader implications.",
      ),
    })
    .describe(
      'The model self-assessment section. Demonstrates how a student would self-assess their knowledge by walking through each of the four knowledge types. Must open with "With this in mind, this is how I might assess my own knowledge of [topic]." Written as a student thinking aloud with phrases like "I know that...", "I don\'t remember whether...", "I\'m not sure if...".',
    ),
  self_review: z
    .string()
    .describe(
      'The self-review section. The student looks back over their self-assessment and identifies strengths and gaps. Must open with "When I look over what I wrote, I see that..." Reviews each knowledge type, notes specific gaps ("I need to learn...") and strengths ("I am good with my facts"). Written as flowing narrative prose.',
    ),
});

export const validationSchema = z.object({
  valid: z.boolean().describe("Whether the template passes all quality checks"),
  issues: z
    .array(z.string())
    .describe("List of specific issues found, empty if valid"),
});

export const normalizedInputSchema = z.object({
  subject: z.string().describe("The properly capitalized, full (non-abbreviated) subject name. E.g. 'math' → 'Math', 'comp sci' → 'Computer Science', 'Cs' → 'Computer Science', 'Tax Law' → 'Tax Law'."),
  gradeLevel: z.string().describe("The properly formatted grade level. E.g. '5th grade' → '5th Grade', '10th grade' → '10th Grade', '3' → '3rd Grade', 'PhD' → 'PhD'."),
});

export type TemplateOutput = z.infer<typeof templateSchema>;
export type ValidationOutput = z.infer<typeof validationSchema>;
