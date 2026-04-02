"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { formatDate } from "@/lib/format-date";
import { useSettingsOptional } from "@/lib/settings/SettingsContext";
import { Badge } from "@/components/ui/Badge";
import { Pencil } from "lucide-react";
import { useWorkspaceData } from "@/lib/workspace/client";

const recommendationLabels: Record<string, string> = {
  "sweet-spot": "Sweet Spot",
  "technical-edge": "Technical Edge",
  "relationship-edge": "Relationship Edge",
  "low-priority": "Low Priority",
};

function getDueDateTime(value: string) {
  if (!value) {
    return Number.POSITIVE_INFINITY;
  }

  const time = new Date(value).getTime();
  return Number.isNaN(time) ? Number.POSITIVE_INFINITY : time;
}

function queryOpportunities<T extends { id: string; sourceId?: string }>(
  opportunities: T[],
  settings?: { enabledTenderBoards?: string[] }
): T[] {
  if (!settings?.enabledTenderBoards?.length) return opportunities;
  return opportunities.filter(
    (o) => !o.sourceId || settings.enabledTenderBoards!.includes(o.sourceId)
  );
}

export default function OpportunityExplorerPage() {
  const { opportunities: allOpps, buyerOrganisations, loading } = useWorkspaceData();
  const settings = useSettingsOptional()?.settings;
  const opportunities = useMemo(
    () => (settings ? queryOpportunities(allOpps, settings) : allOpps),
    [allOpps, settings]
  );
  const getBuyerById = (id: string) => buyerOrganisations.find((b) => b.id === id);
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [recommendationFilter, setRecommendationFilter] = useState<string>("all");
  const [timeFilter, setTimeFilter] = useState<"all" | "past" | "present" | "pending">("all");
  const [sortBy, setSortBy] = useState<"dueDate" | "technicalFit" | "networkStrength">("dueDate");

  const categories = useMemo(() => {
    const set = new Set(opportunities.map((o) => o.category));
    return Array.from(set).sort();
  }, [opportunities]);

  const filtered = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const in30Days = new Date(today);
    in30Days.setDate(in30Days.getDate() + 30);

    let list = [...opportunities];
    if (categoryFilter !== "all") {
      list = list.filter((o) => o.category === categoryFilter);
    }
    if (recommendationFilter !== "all") {
      list = list.filter((o) => o.assessment.recommendation === recommendationFilter);
    }
    if (timeFilter !== "all") {
      list = list.filter((o) => {
        if (!o.dueDate) return false;
        const due = new Date(o.dueDate);
        if (Number.isNaN(due.getTime())) return false;
        due.setHours(0, 0, 0, 0);
        if (timeFilter === "past") return due < today;
        if (timeFilter === "present") return due >= today && due <= in30Days;
        if (timeFilter === "pending") return due > in30Days;
        return true;
      });
    }
    list.sort((a, b) => {
      if (sortBy === "dueDate") {
        return getDueDateTime(a.dueDate) - getDueDateTime(b.dueDate);
      }
      if (sortBy === "technicalFit") {
        return b.assessment.technicalFit - a.assessment.technicalFit;
      }
      return b.assessment.networkStrength - a.assessment.networkStrength;
    });
    return list;
  }, [opportunities, categoryFilter, recommendationFilter, timeFilter, sortBy]);

  return (
    <div>
      <h1 className="bb-page-title">Opportunity Explorer</h1>
      <p className="bb-page-subtitle">
        Browse and filter opportunities by fit, network strength, and complexity.
      </p>

      <div className="mt-6 flex flex-wrap gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-500">Category</label>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="bb-select mt-1"
          >
            <option value="all">All</option>
            {categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500">Recommendation</label>
          <select
            value={recommendationFilter}
            onChange={(e) => setRecommendationFilter(e.target.value)}
            className="bb-select mt-1"
          >
            <option value="all">All</option>
            <option value="sweet-spot">Sweet Spot</option>
            <option value="technical-edge">Technical Edge</option>
            <option value="relationship-edge">Relationship Edge</option>
            <option value="low-priority">Low Priority</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500">Time</label>
          <select
            value={timeFilter}
            onChange={(e) => setTimeFilter(e.target.value as typeof timeFilter)}
            className="bb-select mt-1"
          >
            <option value="all">All</option>
            <option value="past">Past</option>
            <option value="present">Present</option>
            <option value="pending">Pending</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500">Sort by</label>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            className="bb-select mt-1"
          >
            <option value="dueDate">Due Date</option>
            <option value="technicalFit">Technical Fit</option>
            <option value="networkStrength">Network Strength</option>
          </select>
        </div>
      </div>

      <div className="mt-6 space-y-3">
        {loading ? (
          <div className="bb-empty-state">
            <p className="bb-text-muted-alt">Loading opportunities…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="bb-empty-state">
            <p className="bb-text-muted-alt">No opportunities match your filters.</p>
            <p className="mt-2 text-sm bb-text-muted-alt">
              Try adjusting the filters.
            </p>
          </div>
        ) : (
        filtered.map((opp) => {
          const buyer = getBuyerById(opp.issuingOrganisationId);
          return (
            <Link
              key={opp.id}
              href={`/console/opportunities/${opp.id}`}
              className="bb-card-interactive block"
            >
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-100">{opp.title}</span>
                    <Badge variant="neutral">{opp.status}</Badge>
                  </div>
                  <p className="mt-1 text-sm text-gray-500">
                    {buyer?.name} · {opp.category}
                  </p>
                </div>
                <div className="flex items-center gap-6 text-sm">
                  <span className="text-gray-500">{formatDate(opp.dueDate)}</span>
                  <Badge
                    variant={
                      opp.assessment.technicalFit >= 75
                        ? "high"
                        : opp.assessment.technicalFit >= 50
                        ? "medium"
                        : "low"
                    }
                  >
                    TF: {opp.assessment.technicalFit}%
                  </Badge>
                  <Badge
                    variant={
                      opp.assessment.networkStrength >= 75
                        ? "high"
                        : opp.assessment.networkStrength >= 50
                        ? "medium"
                        : "low"
                    }
                  >
                    NS: {opp.assessment.networkStrength}%
                  </Badge>
                  <Badge variant="neutral">
                    Complexity: {opp.assessment.organisationalComplexity}%
                  </Badge>
                  <span className="font-medium text-gray-300">
                    {recommendationLabels[opp.assessment.recommendation] || opp.assessment.recommendation}
                  </span>
                </div>
                <Pencil className="h-4 w-4 text-amber-500" />
              </div>
            </Link>
          );
        })
        )}
      </div>
    </div>
  );
}
