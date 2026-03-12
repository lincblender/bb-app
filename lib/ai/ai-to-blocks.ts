/**
 * Converts AI analysis responses to AgentResponseBlock[] for chat display
 */

import type { AIAnalysisResponse, StrategicBidIntelligenceResults } from "./types";
import type { AgentResponseBlock } from "@/lib/chat/types";

/** Format AI response into chat blocks. Uses summary + structured results. */
export function aiResponseToBlocks(
  response: AIAnalysisResponse,
  options?: { opportunityId?: string; ctaHref?: string }
): AgentResponseBlock[] {
  const blocks: AgentResponseBlock[] = [];
  const results = response.results as StrategicBidIntelligenceResults & Record<string, unknown>;

  // Primary text: summary
  let mainContent = response.summary;

  const dimensionLabels: Array<[keyof StrategicBidIntelligenceResults, string]> = [
    ["pursuit_capacity", "Pursuit capacity"],
    ["buyer_access", "Buyer access"],
    ["delivery_fit", "Delivery fit"],
    ["strategic_desire", "Strategic desire"],
    ["evidence_confidence", "Evidence confidence"],
  ];

  // Add a structured decision block so the UI never needs to infer state from free text.
  const bidDecision = results?.bid_decision;
  if (bidDecision && typeof bidDecision === "object") {
    const decision = bidDecision as {
      decision_state?: string;
      recommendation?: string;
      confidence?: number;
      decision_summary?: string;
      rationale?: string[];
    };
    if (decision.decision_state || decision.recommendation) {
      blocks.push({
        type: "decision_signal",
        content: `${decision.decision_state ?? "Unknown"}${decision.recommendation ? ` (${decision.recommendation})` : ""}`,
        decisionState: decision.decision_state as "Green" | "Amber" | "Red" | undefined,
        recommendation: decision.recommendation as "Bid" | "Research" | "No Bid" | undefined,
        confidence: typeof decision.confidence === "number" ? decision.confidence : undefined,
        decisionSummary: decision.decision_summary,
        dimensions: dimensionLabels
          .map(([key, label]) => {
            const value = results?.[key] as
              | { score?: number; status?: "strong" | "mixed" | "weak" | "unknown" }
              | undefined;
            if (!value || typeof value.score !== "number" || !value.status) return null;
            return { label, score: value.score, status: value.status };
          })
          .filter((value): value is NonNullable<typeof value> => value !== null),
        blockers: Array.isArray(results?.decision_blockers) ? results.decision_blockers : [],
        movers: Array.isArray(results?.decision_movers) ? results.decision_movers : [],
        researchActions: Array.isArray(results?.recommended_research_actions)
          ? results.recommended_research_actions
              .map((item) => {
                if (!item || typeof item !== "object") return null;
                const action = item as {
                  action?: string;
                  reason?: string;
                  priority?: "low" | "medium" | "high" | "critical";
                };
                if (!action.action || !action.reason || !action.priority) return null;
                return {
                  action: action.action,
                  reason: action.reason,
                  priority: action.priority,
                };
              })
              .filter((value): value is NonNullable<typeof value> => value !== null)
          : [],
      });
      const rationale = decision.rationale;
      if (Array.isArray(rationale) && rationale.length > 0) {
        mainContent += "\n\n**Rationale:**\n" + rationale.map((r) => `• ${r}`).join("\n");
      }
    }
  }

  // Add narrative_positioning if present
  const narrative = results?.narrative_positioning;
  if (Array.isArray(narrative) && narrative.length > 0) {
    mainContent += "\n\n**Positioning themes:**\n" + narrative.map((n) => `• ${n}`).join("\n");
  }

  // Add differentiation_strategy if present
  const diff = results?.differentiation_strategy;
  if (Array.isArray(diff) && diff.length > 0) {
    mainContent += "\n\n**Differentiation:**\n" + diff.map((d) => `• ${d}`).join("\n");
  }

  if (mainContent.trim().length > 0) {
    blocks.push({ type: "text", content: mainContent });
  }

  // CTA to view opportunity if we have one
  if (options?.opportunityId) {
    blocks.push({
      type: "cta",
      content: "View full analysis in the opportunity context.",
      ctaText: "View opportunity",
      ctaAction: "opportunities",
      ctaHref: options.ctaHref ?? `/console/opportunities/${options.opportunityId}`,
    });
  } else {
    blocks.push({
      type: "cta",
      content: "View your opportunities to see more analysis.",
      ctaText: "View opportunities",
      ctaAction: "opportunities",
    });
  }

  return blocks;
}
