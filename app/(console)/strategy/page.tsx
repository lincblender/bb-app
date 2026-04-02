"use client";

import Link from "next/link";
import { formatDate } from "@/lib/format-date";
import { useWorkspaceData } from "@/lib/workspace/client";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";

const strategyLabels: Record<string, string> = {
  "pursue-directly": "Pursue directly",
  "pursue-with-partner": "Pursue with partner",
  "relationship-led-play": "Relationship-led play",
  "technically-strong-needs-access": "Technically strong but needs access strategy",
  "network-strong-capability-gap": "Network strong but capability gap needs closing",
  "monitor-only": "Monitor only",
};

export default function StrategyPage() {
  const { opportunities, buyerOrganisations } = useWorkspaceData();
  const getBuyerById = (id: string) => buyerOrganisations.find((b) => b.id === id);

  const byPosture = opportunities.reduce<Record<string, typeof opportunities>>(
    (acc, o) => {
      const key = o.assessment.strategyPosture;
      if (!acc[key]) acc[key] = [];
      acc[key].push(o);
      return acc;
    },
    {}
  );

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-100">Strategy Recommendations</h1>
      <p className="mt-1 text-gray-400">
        Recommended strategic posture for each opportunity. Use this to prioritise and plan.
      </p>

      <div className="mt-8 space-y-8">
        {Object.entries(byPosture).map(([posture, opps]) => (
          <Card key={posture}>
            <h2 className="font-semibold text-gray-100">
              {strategyLabels[posture] || posture}
            </h2>
            <p className="mt-1 text-sm text-gray-400">
              {opps.length} opportunity{opps.length !== 1 ? "ies" : ""}
            </p>
            <div className="mt-4 space-y-2">
              {opps.map((o) => {
                const buyer = getBuyerById(o.issuingOrganisationId);
                return (
                  <Link
                    key={o.id}
                    href={`/console/opportunities/${o.id}`}
                    className="block rounded-lg border border-gray-600 bg-bb-dark-elevated px-4 py-3 transition-colors hover:border-gray-500"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <div>
                        <p className="font-medium text-gray-100">{o.title}</p>
                        <p className="text-sm text-gray-500">
                          {buyer?.name} · Due {formatDate(o.dueDate)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={
                            o.assessment.recommendation === "sweet-spot"
                              ? "high"
                              : o.assessment.recommendation === "low-priority"
                              ? "low"
                              : "medium"
                          }
                        >
                          {o.assessment.recommendation.replace("-", " ")}
                        </Badge>
                        <span className="text-sm text-gray-500">
                          TF {o.assessment.technicalFit}% · NS {o.assessment.networkStrength}%
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
