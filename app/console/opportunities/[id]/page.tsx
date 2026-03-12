"use client";

import { useParams, notFound } from "next/navigation";
import { formatDate } from "@/lib/format-date";
import { useWorkspaceData } from "@/lib/workspace/client";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { OpportunityDetailHeader } from "@/components/demo/OpportunityDetailHeader";

const strategyLabels: Record<string, string> = {
  "pursue-directly": "Pursue directly",
  "pursue-with-partner": "Pursue with partner",
  "relationship-led-play": "Relationship-led play",
  "technically-strong-needs-access": "Technically strong but needs access strategy",
  "network-strong-capability-gap": "Network strong but capability gap needs closing",
  "monitor-only": "Monitor only",
};

export default function OpportunityDetailPage() {
  const params = useParams();
  const id = typeof params.id === "string" ? params.id : params.id?.[0];
  const { opportunities, buyerOrganisations, relationshipSignals, organisations, loading } =
    useWorkspaceData();

  const opportunity = opportunities.find((o) => o.id === id);
  const buyer = opportunity ? buyerOrganisations.find((b) => b.id === opportunity.issuingOrganisationId) : null;

  const personnel = organisations.flatMap((o) => o.personnel ?? []);
  const signalsForBuyer = opportunity
    ? relationshipSignals.filter((s) => s.buyerOrganisationId === opportunity.issuingOrganisationId)
    : [];
  const peopleWithSignals = personnel.filter((p) =>
    signalsForBuyer.some((s) => s.bidderPersonId === p.id)
  );

  if (loading) {
    return (
      <div className="flex min-h-[200px] items-center justify-center">
        <p className="bb-text-muted-alt">Loading…</p>
      </div>
    );
  }

  if (!id || !opportunity) {
    notFound();
  }

  return (
    <div>
      <OpportunityDetailHeader opportunityId={id} />
      <h1 className="mt-4 text-2xl font-bold text-gray-100">{opportunity.title}</h1>
      <p className="mt-1 text-gray-400">{opportunity.summary}</p>

      <div className="mt-6 flex flex-wrap gap-2">
        <Badge variant="neutral">{opportunity.status}</Badge>
        <Badge variant="neutral">{opportunity.category}</Badge>
        <Badge variant={opportunity.assessment.recommendation === "sweet-spot" ? "high" : "medium"}>
          {opportunity.assessment.recommendation.replace("-", " ")}
        </Badge>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="font-semibold text-gray-100">Issuer</h2>
          <p className="mt-2 font-medium text-gray-200">{buyer?.name}</p>
          <p className="mt-1 text-sm text-gray-400">{buyer?.description}</p>
          <p className="mt-2 text-sm text-gray-500">Due: {formatDate(opportunity.dueDate)}</p>
        </Card>

        <Card>
          <h2 className="font-semibold text-gray-100">Strategy Recommendation</h2>
          <p className="mt-2 font-medium text-bb-mustard">
            {strategyLabels[opportunity.assessment.strategyPosture] || opportunity.assessment.strategyPosture}
          </p>
        </Card>
      </div>

      <div className="mt-8">
        <h2 className="font-semibold text-gray-100">Score Breakdown</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <Card>
            <p className="text-sm font-medium text-gray-500">Technical Fit</p>
            <p className="mt-1 text-2xl font-bold">{opportunity.assessment.technicalFit}%</p>
            <p className="mt-2 text-xs text-gray-400">
              Capability overlap, sector relevance, certifications, scale suitability.
            </p>
          </Card>
          <Card>
            <p className="text-sm font-medium text-gray-500">Network Strength</p>
            <p className="mt-1 text-2xl font-bold">{opportunity.assessment.networkStrength}%</p>
            <p className="mt-2 text-xs text-gray-400">
              Connection density, seniority, adjacency to decision-makers.
            </p>
          </Card>
          <Card>
            <p className="text-sm font-medium text-gray-500">Organisational Complexity</p>
            <p className="mt-1 text-2xl font-bold">{opportunity.assessment.organisationalComplexity}%</p>
            <p className="mt-2 text-xs text-gray-400">
              Ownership layers, subsidiaries, procurement complexity.
            </p>
          </Card>
        </div>
      </div>

      {peopleWithSignals.length > 0 && (
        <div className="mt-8">
          <Card>
            <h2 className="font-semibold text-gray-100">Relationship Insights</h2>
            <p className="mt-2 text-sm text-gray-400">
              Your team has the following connections into this buyer organisation:
            </p>
            <ul className="mt-4 space-y-2">
              {peopleWithSignals.map((p) => {
                const sig = signalsForBuyer.find((s) => s.bidderPersonId === p.id);
                return (
                  <li key={p.id} className="flex items-center justify-between rounded-lg bg-gray-700/50 px-4 py-2">
                    <span className="font-medium text-gray-100">{p.name}</span>
                    <span className="text-sm text-gray-400">
                      {p.title} · {sig?.connectionCount} connections · {sig?.adjacencyToDecisionMakers} access
                    </span>
                  </li>
                );
              })}
            </ul>
          </Card>
        </div>
      )}

      <div className="mt-8">
        <Card>
          <h2 className="font-semibold text-gray-100">Suggested Next Actions</h2>
          <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-gray-400">
            {opportunity.assessment.recommendation === "sweet-spot" && (
              <>
                <li>Confirm capability alignment with requirements</li>
                <li>Leverage existing relationships for early engagement</li>
                <li>Prepare bid response and allocate resources</li>
              </>
            )}
            {opportunity.assessment.recommendation === "technical-edge" && (
              <>
                <li>Identify relationship-building opportunities</li>
                <li>Consider partnering with a well-connected organisation</li>
                <li>Engage procurement early to establish presence</li>
              </>
            )}
            {opportunity.assessment.recommendation === "relationship-edge" && (
              <>
                <li>Assess capability gaps and consider partners</li>
                <li>Use network access to understand evaluation criteria</li>
                <li>Strengthen technical proposal to match relationship strength</li>
              </>
            )}
            {opportunity.assessment.recommendation === "low-priority" && (
              <>
                <li>Monitor for changes in fit or network</li>
                <li>Deprioritise unless strategic reasons emerge</li>
              </>
            )}
          </ul>
        </Card>
      </div>
    </div>
  );
}
