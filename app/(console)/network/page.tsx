"use client";

import { useMemo } from "react";
import { Card } from "@/components/ui/Card";
import { useWorkspaceData } from "@/lib/workspace/client";

export default function NetworkPage() {
  const { relationshipSignals, buyerOrganisations, organisations, loading } = useWorkspaceData();
  const personnel = organisations.flatMap((organisation) => organisation.personnel ?? []);

  const buyerIds = useMemo(() => {
    const ids = new Set(relationshipSignals.map((s) => s.buyerOrganisationId));
    return Array.from(ids);
  }, []);

  const densityByBuyer = useMemo(() => {
    const map: Record<string, { total: number; people: string[] }> = {};
    for (const s of relationshipSignals) {
      if (!map[s.buyerOrganisationId]) {
        map[s.buyerOrganisationId] = { total: 0, people: [] };
      }
      map[s.buyerOrganisationId].total += s.connectionCount;
      const person = personnel.find((p) => p.id === s.bidderPersonId);
      if (person && !map[s.buyerOrganisationId].people.includes(person.name)) {
        map[s.buyerOrganisationId].people.push(person.name);
      }
    }
    return map;
  }, []);

  const strongZones = buyerIds
    .filter((id) => (densityByBuyer[id]?.total ?? 0) >= 10)
    .sort((a, b) => (densityByBuyer[b]?.total ?? 0) - (densityByBuyer[a]?.total ?? 0));

  const thinZones = buyerIds
    .filter((id) => (densityByBuyer[id]?.total ?? 0) < 5)
    .sort((a, b) => (densityByBuyer[a]?.total ?? 0) - (densityByBuyer[b]?.total ?? 0));

  if (loading) {
    return <p className="text-gray-400">Loading network intelligence…</p>;
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-100">Network Intelligence</h1>
      <p className="mt-1 text-gray-400">
        Relationship map between your personnel and buyer organisations. LinkedIn sign-in establishes identity, and company-page authority data is used when it is available.
      </p>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="font-semibold text-gray-100">Strongest Relationship Zones</h2>
          <p className="mt-1 text-sm text-gray-400">
            Buyer organisations where you have dense network coverage.
          </p>
          <div className="mt-4 space-y-3">
            {strongZones.length === 0 && (
              <p className="text-sm text-gray-500">No strong relationship zones have been recorded yet.</p>
            )}
            {strongZones.map((buyerId) => {
              const buyer = buyerOrganisations.find((b) => b.id === buyerId);
              const data = densityByBuyer[buyerId];
              return (
                <div
                  key={buyerId}
                  className="rounded-lg border-l-4 border-bb-green bg-bb-green-light/30 p-4"
                >
                  <p className="font-medium text-gray-100">{buyer?.name}</p>
                  <p className="text-sm text-gray-400">
                    {data?.total} total connections · {data?.people.length} team members
                  </p>
                  <p className="mt-1 text-xs text-gray-500">
                    {data?.people.join(", ")}
                  </p>
                </div>
              );
            })}
          </div>
        </Card>

        <Card>
          <h2 className="font-semibold text-gray-100">Thin Access Zones</h2>
          <p className="mt-1 text-sm text-gray-400">
            Buyer organisations where network coverage is limited.
          </p>
          <div className="mt-4 space-y-3">
            {thinZones.length === 0 && (
              <p className="text-sm text-gray-500">No thin-access zones are available yet.</p>
            )}
            {thinZones.map((buyerId) => {
              const buyer = buyerOrganisations.find((b) => b.id === buyerId);
              const data = densityByBuyer[buyerId];
              return (
                <div
                  key={buyerId}
                  className="rounded-lg border-l-4 border-bb-orange bg-bb-orange-light/30 p-4"
                >
                  <p className="font-medium text-gray-100">{buyer?.name}</p>
                  <p className="text-sm text-gray-400">
                    {data?.total ?? 0} connections · Consider relationship-building or partnership
                  </p>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      <div className="mt-8">
        <Card>
          <h2 className="font-semibold text-gray-100">Relationship Overview</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-600 text-left">
                  <th className="pb-2 font-medium text-gray-400">Buyer</th>
                  <th className="pb-2 font-medium text-gray-400">Connections</th>
                  <th className="pb-2 font-medium text-gray-400">Your Team</th>
                  <th className="pb-2 font-medium text-gray-400">Access Level</th>
                </tr>
              </thead>
              <tbody>
                {buyerIds.length === 0 && (
                  <tr>
                    <td className="py-4 text-sm text-gray-500" colSpan={4}>
                      No relationship signals have been loaded for this workspace yet.
                    </td>
                  </tr>
                )}
                {buyerIds.map((buyerId) => {
                  const buyer = buyerOrganisations.find((b) => b.id === buyerId);
                  const data = densityByBuyer[buyerId];
                  const sig = relationshipSignals.find((s) => s.buyerOrganisationId === buyerId);
                  return (
                    <tr key={buyerId} className="border-b border-gray-700/50">
                      <td className="py-2 font-medium text-gray-200">{buyer?.name}</td>
                      <td className="py-2 text-gray-300">{data?.total ?? 0}</td>
                      <td className="py-2 text-gray-300">{data?.people.join(", ") || "—"}</td>
                      <td className="py-2 text-gray-300">{sig?.adjacencyToDecisionMakers ?? "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}
