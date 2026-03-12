import type { Opportunity, Organisation, BuyerOrganisation } from "@/lib/types";

/**
 * Technical fit scoring based on:
 * - capability overlap
 * - sector relevance
 * - certifications
 * - scale suitability
 * - past performance relevance
 *
 * Returns 0-100 score.
 * In production, this would use live matching logic.
 */
export function calculateTechnicalFit(
  _opportunity: Opportunity,
  _bidder: Organisation,
  _buyer: BuyerOrganisation
): number {
  // Placeholder until live scoring logic is implemented.
  return 0;
}

export function getScoreBand(score: number): "low" | "medium" | "high" {
  if (score >= 75) return "high";
  if (score >= 50) return "medium";
  return "low";
}
