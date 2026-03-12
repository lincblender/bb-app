import Link from "next/link";
import { OpportunityMatrix } from "@/components/demo/OpportunityMatrix";

export default function MatrixPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-100">Opportunity Matrix</h1>
      <p className="mt-1 text-gray-400">
        Technical Fit vs Network Strength. Plot opportunities to see where you should compete.
      </p>

      <OpportunityMatrix />

      <div className="mt-6">
        <h2 className="mb-3 text-base font-semibold text-gray-100">How to read this</h2>
        <div className="grid grid-cols-2 gap-3">
          <div
            className="flex gap-3 rounded-lg border border-gray-700/50 p-4"
            style={{ backgroundColor: "rgba(253, 174, 79, 0.2)" }}
          >
            <div className="h-3 w-3 shrink-0 rounded-full mt-0.5" style={{ backgroundColor: "#f97316" }} />
            <div>
              <p className="font-medium text-gray-200">Relationship Edge</p>
              <p className="mt-0.5 text-sm text-gray-400">High network, lower technical fit. May need capability reinforcement.</p>
            </div>
          </div>
          <div
            className="flex gap-3 rounded-lg border border-gray-700/50 p-4"
            style={{ backgroundColor: "rgba(22, 163, 74, 0.2)" }}
          >
            <div className="h-3 w-3 shrink-0 rounded-full mt-0.5" style={{ backgroundColor: "#16a34a" }} />
            <div>
              <p className="font-medium text-gray-200">Sweet Spot</p>
              <p className="mt-0.5 text-sm text-gray-400">High technical fit + high network strength. Strongest position.</p>
            </div>
          </div>
          <div
            className="flex gap-3 rounded-lg border border-gray-700/50 p-4"
            style={{ backgroundColor: "rgba(167, 139, 250, 0.2)" }}
          >
            <div className="h-3 w-3 shrink-0 rounded-full mt-0.5" style={{ backgroundColor: "#a78bfa" }} />
            <div>
              <p className="font-medium text-gray-200">Low Priority</p>
              <p className="mt-0.5 text-sm text-gray-400">Low on both. Deprioritise unless strategic reasons emerge.</p>
            </div>
          </div>
          <div
            className="flex gap-3 rounded-lg border border-gray-700/50 p-4"
            style={{ backgroundColor: "rgba(14, 165, 233, 0.2)" }}
          >
            <div className="h-3 w-3 shrink-0 rounded-full mt-0.5" style={{ backgroundColor: "#0ea5e9" }} />
            <div>
              <p className="font-medium text-gray-200">Technical Edge</p>
              <p className="mt-0.5 text-sm text-gray-400">High technical fit, lower network. May need access strategy.</p>
            </div>
          </div>
        </div>
        <Link
          href="/console/opportunities"
          className="mt-4 inline-block text-sm font-medium text-bb-powder-blue hover:underline"
        >
          View opportunity list →
        </Link>
      </div>
    </div>
  );
}
