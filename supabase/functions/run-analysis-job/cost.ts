/**
 * Cost estimation for run-analysis-job.
 */

export function estimateCost(inputTokens: number, outputTokens: number, modelId: string): number {
  const isMini = modelId.includes("mini");
  const inPerM = isMini ? 0.15 : 2.5;
  const outPerM = isMini ? 0.6 : 10;
  return (inputTokens / 1_000_000) * inPerM + (outputTokens / 1_000_000) * outPerM;
}
