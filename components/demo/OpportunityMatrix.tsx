"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useWorkspaceData } from "@/lib/workspace/client";

const QUADRANT_ORDER = ["sweet-spot", "relationship-edge", "technical-edge", "low-priority"] as const;

const quadrantLabels = {
  "sweet-spot": { label: "Sweet Spot", color: "#16a34a" },
  "technical-edge": { label: "Technical Edge", color: "#0ea5e9" },
  "relationship-edge": { label: "Relationship Edge", color: "#f97316" },
  "low-priority": { label: "Low Priority", color: "#a78bfa" },
} as const;

type QuadrantKey = keyof typeof quadrantLabels;

/** Determine quadrant from position (TF=x, NS=y). Center at 50. */
function getQuadrantFromPosition(tf: number, ns: number): QuadrantKey {
  if (tf >= 50 && ns >= 50) return "sweet-spot";
  if (tf < 50 && ns >= 50) return "relationship-edge";
  if (tf >= 50 && ns < 50) return "technical-edge";
  return "low-priority";
}

type TimeFilter = "all" | "past" | "present" | "pending";

function filterByTime<T extends { dueDate: string }>(opportunities: T[], timeFilter: TimeFilter) {
  if (timeFilter === "all") return opportunities;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const in30Days = new Date(today);
  in30Days.setDate(in30Days.getDate() + 30);
  return opportunities.filter((o) => {
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

export function OpportunityMatrix() {
  const { opportunities: allOpps, buyerOrganisations } = useWorkspaceData();
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("all");
  const opportunities = useMemo(
    () => filterByTime(allOpps, timeFilter),
    [allOpps, timeFilter]
  );
  const getBuyerById = (id: string) => buyerOrganisations.find((b) => b.id === id);

  const { sortedPoints } = useMemo(() => {
    const pts = opportunities.map((o) => ({
      id: o.id,
      title: o.title,
      x: o.assessment.technicalFit,
      y: o.assessment.networkStrength,
      recommendation: o.assessment.recommendation,
      issuer: getBuyerById(o.issuingOrganisationId)?.name ?? "Unknown",
    }));

    // Sort by position-based quadrant then by TF+NS descending
    const sorted = [...pts].sort((a, b) => {
      const qA = QUADRANT_ORDER.indexOf(getQuadrantFromPosition(a.x, a.y));
      const qB = QUADRANT_ORDER.indexOf(getQuadrantFromPosition(b.x, b.y));
      if (qA !== qB) return qA - qB;
      return b.x + b.y - (a.x + a.y);
    });

    return { sortedPoints: sorted };
  }, [opportunities]);

  const CHART_PAD = 50;
  const CHART_SIZE = 280;
  const CENTER = CHART_PAD + CHART_SIZE / 2;

  return (
    <div className="mt-2 flex flex-col gap-3 lg:flex-row lg:items-start">
      {/* Chart area - aspect-ratio keeps it square, min size prevents crushing */}
      <div className="flex flex-1 flex-col min-w-0">
        <div className="relative w-full min-w-[300px] sm:min-w-[380px] lg:min-w-[440px] aspect-square">
          <svg
            viewBox="0 0 380 380"
            className="h-full w-full"
            preserveAspectRatio="xMidYMid meet"
          >
            {/* Quadrant backgrounds */}
            <rect
              x={CENTER}
              y={CHART_PAD}
              width={CHART_SIZE / 2}
              height={CHART_SIZE / 2}
              fill="#16a34a"
              fillOpacity="0.2"
            />
            <rect
              x={CHART_PAD}
              y={CHART_PAD}
              width={CHART_SIZE / 2}
              height={CHART_SIZE / 2}
              fill="#FDAE4F"
              fillOpacity="0.2"
            />
            <rect
              x={CENTER}
              y={CENTER}
              width={CHART_SIZE / 2}
              height={CHART_SIZE / 2}
              fill="#0ea5e9"
              fillOpacity="0.2"
            />
            <rect
              x={CHART_PAD}
              y={CENTER}
              width={CHART_SIZE / 2}
              height={CHART_SIZE / 2}
              fill="#a78bfa"
              fillOpacity="0.2"
            />

            {/* Grid lines */}
            <line
              x1={CENTER}
              y1={CHART_PAD}
              x2={CENTER}
              y2={CHART_PAD + CHART_SIZE}
              stroke="#4b5563"
              strokeWidth="1"
            />
            <line
              x1={CHART_PAD}
              y1={CENTER}
              x2={CHART_PAD + CHART_SIZE}
              y2={CENTER}
              stroke="#4b5563"
              strokeWidth="1"
            />

            {/* Axis labels */}
            <text
              x={CENTER}
              y={CHART_PAD - 12}
              textAnchor="middle"
              fill="#9ca3af"
              fontSize="12"
              fontWeight="500"
            >
              Technical Fit →
            </text>
            <text
              x={CHART_PAD - 12}
              y={CENTER}
              textAnchor="middle"
              fill="#9ca3af"
              fontSize="12"
              fontWeight="500"
              transform={`rotate(-90, ${CHART_PAD - 12}, ${CENTER})`}
            >
              Network Strength →
            </text>

            {/* Quadrant labels - light fill for contrast on dark quadrants */}
            <text x={CENTER + CHART_SIZE / 4} y={CHART_PAD + CHART_SIZE / 4 - 8} textAnchor="middle" fill="#86efac" fontSize="11" fontWeight="600">
              Sweet Spot
            </text>
            <text x={CHART_PAD + CHART_SIZE / 4} y={CHART_PAD + CHART_SIZE / 4 - 8} textAnchor="middle" fill="#fdba74" fontSize="11" fontWeight="600">
              Relationship Edge
            </text>
            <text x={CENTER + CHART_SIZE / 4} y={CENTER + CHART_SIZE / 4 - 8} textAnchor="middle" fill="#38bdf8" fontSize="11" fontWeight="600">
              Technical Edge
            </text>
            <text x={CHART_PAD + CHART_SIZE / 4} y={CENTER + CHART_SIZE / 4 - 8} textAnchor="middle" fill="#c4b5fd" fontSize="11" fontWeight="600">
              Low Priority
            </text>

            {/* Data points with numbers - color by position, clickable */}
            {sortedPoints.map((p, idx) => {
              const num = idx + 1;
              const x = CHART_PAD + (p.x / 100) * CHART_SIZE;
              const y = CHART_PAD + CHART_SIZE - (p.y / 100) * CHART_SIZE;
              const quadrant = getQuadrantFromPosition(p.x, p.y);
              const fillColor = quadrantLabels[quadrant].color;
              return (
                <a
                  key={p.id}
                  href={`/console/opportunities/${p.id}`}
                  className="group cursor-pointer"
                >
                  <g>
                    <circle
                      cx={x}
                      cy={y}
                      r="14"
                      fill={fillColor}
                      stroke="#1a2229"
                      strokeWidth="2"
                      className="transition-opacity group-hover:opacity-90"
                    />
                    <text
                      x={x}
                      y={y}
                      textAnchor="middle"
                      dominantBaseline="central"
                      fill="#0f1419"
                      fontSize="11"
                      fontWeight="700"
                      pointerEvents="none"
                    >
                      {num}
                    </text>
                    <title>
                      {num}. {p.title} ({p.issuer}) — TF: {p.x}%, NS: {p.y}%
                    </title>
                  </g>
                </a>
              );
            })}
          </svg>
        </div>
      </div>

      {/* Opportunities list - larger, easier to reach */}
      <div className="w-full shrink-0 lg:min-w-[320px] lg:w-96">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h3 className="text-base font-semibold text-gray-200">Opportunities</h3>
          <select
            value={timeFilter}
            onChange={(e) => setTimeFilter(e.target.value as TimeFilter)}
            className="rounded border border-gray-600 bg-bb-dark px-2 py-1 text-xs text-gray-300"
          >
            <option value="all">All</option>
            <option value="past">Past</option>
            <option value="present">Present</option>
            <option value="pending">Pending</option>
          </select>
        </div>
        <ol className="space-y-2">
          {sortedPoints.map((p, idx) => {
            const quadrant = getQuadrantFromPosition(p.x, p.y);
            return (
            <li key={p.id}>
              <Link
                href={`/console/opportunities/${p.id}`}
                className="flex items-baseline gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors hover:bg-gray-700/50"
              >
                <span
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold"
                  style={{
                    backgroundColor: quadrantLabels[quadrant].color,
                    color: "#0f1419",
                  }}
                >
                  {idx + 1}
                </span>
                <span className="min-w-0 flex-1 truncate text-gray-300">
                  {p.title}
                </span>
              </Link>
              <p className="ml-9 text-xs text-gray-500">{p.issuer}</p>
            </li>
          );
          })}
        </ol>
      </div>
    </div>
  );
}
