import type { RelationshipSignal } from "@/lib/types";

/**
 * Network strength scoring based on:
 * - connection density
 * - seniority of relationships
 * - shared employers
 * - adjacency to decision-makers
 * - network spread across functions
 *
 * Returns 0-100 score.
 * LinkedIn-authorised data is the primary source for production.
 */
export function calculateNetworkStrength(signals: RelationshipSignal[]): number {
  if (signals.length === 0) return 0;

  let total = 0;
  for (const s of signals) {
    let score = Math.min(s.connectionCount * 3, 40);
    const seniorityBonus = { junior: 5, mid: 10, senior: 20, executive: 30 }[s.seniorityLevel];
    const adjacencyBonus = { none: 0, indirect: 10, direct: 20 }[s.adjacencyToDecisionMakers];
    score += seniorityBonus + adjacencyBonus + s.sharedEmployers * 2;
    total += Math.min(score, 100);
  }
  return Math.min(Math.round(total / signals.length) + 10, 100);
}

export function getScoreBand(score: number): "low" | "medium" | "high" {
  if (score >= 75) return "high";
  if (score >= 50) return "medium";
  return "low";
}
