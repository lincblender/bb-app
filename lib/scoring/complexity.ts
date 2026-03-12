import type { ComplexitySignal } from "@/lib/types";

/**
 * Organisational complexity scoring based on:
 * - ownership layers
 * - subsidiary count
 * - acquisition history
 * - board/investor complexity
 * - procurement complexity
 *
 * Returns 0-100 score (higher = more complex).
 */
export function calculateComplexity(signal: ComplexitySignal | undefined): number {
  if (!signal) return 30; // Default for unknown

  let score = 20;
  score += signal.ownershipLayers * 10;
  score += signal.subsidiaryCount * 5;
  score += signal.acquisitionCount * 8;
  score += { low: 5, medium: 15, high: 25 }[signal.boardInfluence];
  score += { low: 5, medium: 15, high: 25 }[signal.procurementComplexity];
  return Math.min(score, 100);
}

export function getComplexityBand(score: number): "low" | "medium" | "high" {
  if (score >= 70) return "high";
  if (score >= 45) return "medium";
  return "low";
}
