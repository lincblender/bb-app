"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowRight, Briefcase, Building2, CheckCircle2, History, Linkedin } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import {
  countReadyPillars,
  getSetupPillarStatuses,
  type SetupPillarStatus,
} from "@/lib/connectors/setup-status";
import { createClient } from "@/lib/supabase/client";
import { useWorkspaceData } from "@/lib/workspace/client";

const PILLAR_ICONS = {
  reach: Linkedin,
  history: History,
  capability: Building2,
  opportunity: Briefcase,
} as const;

function getStatusLabel(status: SetupPillarStatus["status"]) {
  if (status === "ready") return { label: "Ready", variant: "positive" as const };
  if (status === "in-progress") return { label: "In progress", variant: "warning" as const };
  return { label: "Next", variant: "neutral" as const };
}

function PillarCard({ pillar }: { pillar: SetupPillarStatus }) {
  const Icon = PILLAR_ICONS[pillar.id];
  const badge = getStatusLabel(pillar.status);

  return (
    <Card className="flex h-full flex-col">
      <div className="flex items-start justify-between gap-4">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-bb-powder-blue/15 text-bb-powder-blue">
          <Icon size={20} />
        </div>
        <Badge variant={badge.variant}>{badge.label}</Badge>
      </div>
      <p className="mt-4 text-xs font-semibold uppercase tracking-[0.18em] text-bb-powder-blue">
        {pillar.eyebrow}
      </p>
      <h2 className="mt-2 text-xl font-semibold text-gray-100">{pillar.title}</h2>
      <p className="mt-3 flex-1 text-sm leading-relaxed text-gray-300">{pillar.detail}</p>
      <Link
        href={pillar.href}
        className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-bb-coral hover:text-bb-coral/85"
      >
        {pillar.status === "ready" ? "Review setup" : "Continue setup"}
        <ArrowRight size={16} />
      </Link>
    </Card>
  );
}

export default function ConsoleGetStartedPage() {
  const searchParams = useSearchParams();
  const { connectorSources, organisations, opportunities, refetch } = useWorkspaceData();
  const [linkedInConnected, setLinkedInConnected] = useState(false);

  useEffect(() => {
    createClient()
      .auth.getUser()
      .then(async ({ data: { user } }) => {
        const connected =
          user?.identities?.some((identity) => identity.provider === "linkedin_oidc") ?? false;
        setLinkedInConnected(connected);

        if (
          connected &&
          !connectorSources.some(
            (connector) => connector.id === "conn-linkedin-profile" && connector.status === "live"
          )
        ) {
          await fetch("/api/connectors/linkedin/activate", {
            method: "POST",
          }).catch(() => undefined);
          await refetch().catch(() => undefined);
        }
      });
  }, [connectorSources, refetch]);

  const pillarStatuses = useMemo(
    () =>
      getSetupPillarStatuses({
        connectors: connectorSources,
        organisations,
        opportunities,
        linkedInConnected,
      }),
    [connectorSources, organisations, opportunities, linkedInConnected]
  );
  const readyCount = useMemo(() => countReadyPillars(pillarStatuses), [pillarStatuses]);
  const importedOpportunityCount = opportunities.filter(
    (opportunity) => opportunity.sourceId === "tb-austender"
  ).length;
  const historyPreviewCount = Array.isArray(
    connectorSources.find((connector) => connector.id === "conn-hubspot-history")?.config?.history_preview
  )
    ? (
        connectorSources.find((connector) => connector.id === "conn-hubspot-history")?.config
          ?.history_preview as unknown[]
      ).length
    : 0;

  const intro = useMemo(() => {
    if (searchParams.get("source") === "linkedin") {
      return "LinkedIn sign-in is connected. Authorise company-page access next if the user administers a page, then continue with selective HubSpot history, the organisation profile, and a lean AusTender feed.";
    }
    if (searchParams.get("welcome") === "1") {
      return "The initial setup should start with the four pillars: reach, history, capability, and opportunity. Each step adds only the minimum evidence BidBlender needs to qualify work well.";
    }
    return "This setup path keeps BidBlender honest: connect the minimum live sources first, avoid mirroring source systems, and fetch deeper context only when the user opens a specific client or opportunity.";
  }, [searchParams]);

  return (
    <div className="mx-auto max-w-6xl">
      <div className="max-w-4xl">
        {searchParams.get("welcome") === "1" && <Badge variant="warning">Welcome</Badge>}
        <h1 className="mt-4 text-3xl font-semibold text-gray-100 md:text-4xl">
          Set up the four pillars
        </h1>
        <p className="mt-4 text-base leading-relaxed text-gray-300">{intro}</p>
        <div className="mt-6 flex flex-wrap gap-3 text-sm text-gray-400">
          <span className="inline-flex items-center gap-2 rounded-lg border border-gray-700 bg-bb-dark-elevated px-3 py-1.5">
            <CheckCircle2 size={14} className={readyCount >= 4 ? "text-bb-green" : "text-bb-orange"} />
            {readyCount} of 4 pillars ready
          </span>
          <span className="inline-flex items-center gap-2 rounded-lg border border-gray-700 bg-bb-dark-elevated px-3 py-1.5">
            <Briefcase size={14} className={importedOpportunityCount > 0 ? "text-bb-green" : "text-bb-orange"} />
            {importedOpportunityCount > 0
              ? `${importedOpportunityCount} AusTender notices imported`
              : "No live opportunities imported yet"}
          </span>
          <span className="inline-flex items-center gap-2 rounded-lg border border-gray-700 bg-bb-dark-elevated px-3 py-1.5">
            <History size={14} className={historyPreviewCount > 0 ? "text-bb-green" : "text-bb-orange"} />
            {historyPreviewCount > 0
              ? `${historyPreviewCount} HubSpot history previews captured`
              : "HubSpot history still needs authorisation"}
          </span>
        </div>
      </div>

      <div className="mt-10 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        {pillarStatuses.map((pillar) => (
          <PillarCard key={pillar.id} pillar={pillar} />
        ))}
      </div>

      <div className="mt-10 rounded-3xl border border-gray-700 bg-bb-dark-elevated p-6">
        <div className="flex items-start gap-3">
          <CheckCircle2 size={18} className="mt-0.5 text-bb-green" />
          <div>
            <h2 className="text-lg font-semibold text-gray-100">Selective sync standard</h2>
            <p className="mt-2 max-w-4xl text-sm leading-relaxed text-gray-300">
              CRM data should stay lean. Pull enough HubSpot history to understand recent deals,
              buyer context, and relationship memory, then gather more only when the user opens a
              specific opportunity or client. The same discipline applies to other connectors too.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
