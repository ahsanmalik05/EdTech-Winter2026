export const MODEL_COSTS: Record<string, { input: number; output: number }> = {
  "gpt-5-nano": {
    input: 0.05 / 1_000_000,
    output: 0.4 / 1_000_000,
  },
  "command-a-translate-08-2025": {
    input: 0,
    output: 0,
  },
  // will add more models as needed
};

export function calculateCost(
  model: string,
  inputTokenCount: number | undefined,
  outputTokenCount: number | undefined,
): number | null {
  const inputTokens = inputTokenCount ?? 0;
  const outputTokens = outputTokenCount ?? 0;
  if (inputTokens === 0 && outputTokens === 0) return null;
  return (
    inputTokens * (MODEL_COSTS[model]?.input ?? 0) +
    outputTokens * (MODEL_COSTS[model]?.output ?? 0)
  );
}