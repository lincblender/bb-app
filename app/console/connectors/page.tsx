"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Briefcase,
  CheckCircle2,
  History,
  Linkedin,
  RefreshCw,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { mcpLibrary } from "@/lib/mcp/library";
import { ConnectorCard } from "./ConnectorCard";
import { PILLAR_DISPLAY_CONFIG } from "./pillar-config";
import { useConnectorActions } from "./useConnectorActions";
import { useConnectorData } from "./useConnectorData";
import { useConnectorFeedback } from "./useConnectorFeedback";

function PillarActions({
  pillarId,
  loadingAction,
  runPostAction,
  data,
  actions,
}: {
  pillarId: string;
  loadingAction: string | null;
  runPostAction: (id: string, endpoint: string, fn: (b: Record<string, unknown>) => string) => Promise<void>;
  data: ReturnType<typeof useConnectorData>;
  actions: ReturnType<typeof useConnectorActions>;
}) {
  const btn = "inline-flex items-center gap-2 rounded-lg border border-gray-600 px-3 py-1.5 text-sm text-gray-200 hover:border-gray-500 hover:text-white disabled:opacity-60 disabled:hover:border-gray-600";
  const link = "inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-bb-coral";

  if (pillarId === "reach") {
    if (!data.linkedInConnected) {
      return (
        <button
          type="button"
          onClick={actions.handleConnectLinkedIn}
          disabled={loadingAction === "connect-linkedin"}
          className={btn}
        >
          {loadingAction === "connect-linkedin" ? <RefreshCw size={14} className="animate-spin" /> : <Linkedin size={14} />}
          Connect with LinkedIn
        </button>
      );
    }
    return (
      <>
        <button
          type="button"
          onClick={() => void actions.handleSyncLinkedInProfile()}
          disabled={loadingAction === "sync-linkedin-profile"}
          className={btn}
        >
          {loadingAction === "sync-linkedin-profile" ? <RefreshCw size={14} className="animate-spin" /> : <RefreshCw size={14} />}
          Sync Profile
        </button>
        <button
          type="button"
          onClick={actions.handleConnectLinkedInCompanyAdmin}
          disabled={loadingAction === "connect-linkedin-company-admin"}
          className={btn}
        >
          {loadingAction === "connect-linkedin-company-admin" ? <RefreshCw size={14} className="animate-spin" /> : <Linkedin size={14} />}
          {data.linkedInCompanyAdminConnector?.status === "live" ? "Reconnect" : "Connect LinkedIn Page"}
        </button>
        {data.linkedInCompanyAdminConnector?.status === "live" && (
          <button
            type="button"
            onClick={() => void runPostAction("sync-linkedin-company-admin", "/api/connectors/linkedin/company-admin/sync", (b) => `Refreshed ${Array.isArray(b.organizations) ? b.organizations.length : 0} organisations.`)}
            disabled={loadingAction === "sync-linkedin-company-admin"}
            className={btn}
          >
            {loadingAction === "sync-linkedin-company-admin" ? <RefreshCw size={14} className="animate-spin" /> : <RefreshCw size={14} />}
            Sync
          </button>
        )}
        {(data.linkedInManagedOrganizations.length > 0 || data.linkedInIdentityConnector?.status === "live") && (
          <Link href="/console/network" className={link}>
            View in network <ArrowRight size={12} />
          </Link>
        )}
      </>
    );
  }

  if (pillarId === "history") {
    return (
      <>
        <button
          type="button"
          onClick={actions.handleConnectHubSpot}
          disabled={loadingAction === "connect-hubspot"}
          className={btn}
        >
          {loadingAction === "connect-hubspot" ? (
            <RefreshCw size={14} className="animate-spin" />
          ) : (
            <Image src="/icons/hubspot.svg" alt="" width={14} height={14} />
          )}
          {data.hubspotConnector?.status === "live" ? "Reconnect" : "Connect with HubSpot"}
        </button>
        <button
          type="button"
          onClick={() => void runPostAction("sync-hubspot", "/api/connectors/hubspot/sync", (b) => `Refreshed ${Array.isArray(b.previews) ? b.previews.length : 0} previews.`)}
          disabled={loadingAction === "sync-hubspot"}
          className={btn}
        >
          {loadingAction === "sync-hubspot" ? <RefreshCw size={14} className="animate-spin" /> : <RefreshCw size={14} />}
          Sync
        </button>
      </>
    );
  }

  if (pillarId === "capability") {
    return (
      <Link href="/console/organisation" className={btn}>
        Open organisation profile <ArrowRight size={12} />
      </Link>
    );
  }

  if (pillarId === "opportunity") {
    return (
      <>
        <button
          type="button"
          onClick={() => void runPostAction("sync-austender", "/api/connectors/austender/sync", (b) => `Imported ${typeof b.importedCount === "number" ? b.importedCount : 0} notices.`)}
          disabled={loadingAction === "sync-austender"}
          className={btn}
        >
          {loadingAction === "sync-austender" ? <RefreshCw size={14} className="animate-spin" /> : <RefreshCw size={14} />}
          Sync AusTender
        </button>
        <Link href="/console/opportunities" className={link}>
          View opportunities <ArrowRight size={12} />
        </Link>
      </>
    );
  }

  return null;
}

function PillarContent({
  pillarId,
  data,
}: {
  pillarId: string;
  data: ReturnType<typeof useConnectorData>;
}) {
  if (pillarId === "history" && data.hubspotWarnings) {
    return <p className="text-xs text-bb-orange">{data.hubspotWarnings}</p>;
  }

  if (pillarId === "reach") {
    const profile = data.linkedInProfile;
    const hasProfile = profile?.fullName || profile?.pictureUrl;
    if (!hasProfile && !data.linkedInCompanyWarnings) return null;
    return (
      <div className="space-y-1.5">
        {hasProfile && (
          <div className="flex items-center gap-2">
            {profile?.pictureUrl && (
              <Image
                src={profile.pictureUrl}
                alt=""
                width={28}
                height={28}
                className="rounded-full"
              />
            )}
            {profile?.fullName && (
              <span className="text-sm text-gray-200">{profile.fullName}</span>
            )}
          </div>
        )}
        {data.linkedInCompanyWarnings && (
          <p className="text-xs text-bb-orange">{data.linkedInCompanyWarnings}</p>
        )}
      </div>
    );
  }

  return null;
}

export default function ConnectorsPage() {
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ tone: "positive" | "warning"; text: string } | null>(null);

  const data = useConnectorData();
  const actions = useConnectorActions({
    setLoadingAction,
    setFeedback,
  });

  useConnectorFeedback({
    setFeedback,
    handleConnectLinkedIn: actions.handleConnectLinkedIn,
    handleConnectHubSpot: actions.handleConnectHubSpot,
    handleConnectLinkedInCompanyAdmin: actions.handleConnectLinkedInCompanyAdmin,
    runPostAction: actions.runPostAction,
  });

  const futureSources = mcpLibrary.filter(
    (entry) => !["mcp-hubspot", "mcp-local-demo", "mcp-custom"].includes(entry.id)
  );
  const additionalSourcesRef = useRef<HTMLDivElement>(null);

  const handleAddConnector = (_pillarId: string) => {
    additionalSourcesRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="mx-auto max-w-6xl">
      <header className="max-w-4xl">
        <h1 className="text-3xl font-semibold text-gray-100">Connect the four pillars</h1>
        <p className="mt-3 text-base leading-relaxed text-gray-300">
          Start with the user profile, then add selective CRM history, organisation capability
          evidence, and live opportunities. The goal is sufficiency, not source-system replication.
        </p>
        <div className="mt-6 flex flex-wrap gap-3 text-sm text-gray-400">
          <span className="inline-flex items-center gap-2 rounded-lg border border-gray-700 bg-bb-dark-elevated px-3 py-1.5">
            <CheckCircle2 size={14} className={data.readyCount >= 4 ? "text-bb-green" : "text-bb-orange"} />
            {data.readyCount} of 4 pillars ready
          </span>
          <span className="inline-flex items-center gap-2 rounded-lg border border-gray-700 bg-bb-dark-elevated px-3 py-1.5">
            <History size={14} className={data.hubspotPreview.length > 0 ? "text-bb-green" : "text-bb-orange"} />
            {data.hubspotPreview.length > 0 ? `${data.hubspotPreview.length} HubSpot previews` : "HubSpot pending"}
          </span>
          <span className="inline-flex items-center gap-2 rounded-lg border border-gray-700 bg-bb-dark-elevated px-3 py-1.5">
            <Briefcase size={14} className={data.austenderOpportunityCount > 0 ? "text-bb-green" : "text-bb-orange"} />
            {data.austenderOpportunityCount > 0 ? `${data.austenderOpportunityCount} AusTender notices` : "No notices yet"}
          </span>
        </div>
      </header>

      {feedback && (
        <div
          className={`mt-8 rounded-2xl border px-4 py-3 text-sm ${
            feedback.tone === "positive" ? "border-bb-green/40 bg-bb-green/10" : "border-bb-orange/40 bg-bb-orange/10"
          } text-gray-200`}
        >
          {feedback.text}
        </div>
      )}

      <div className="mt-10 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        {data.pillarStatuses.map((pillar) => {
          const config = PILLAR_DISPLAY_CONFIG[pillar.id];
          if (!config) return null;
          return (
            <ConnectorCard
              key={pillar.id}
              pillar={pillar}
              config={config}
              content={
                <PillarContent pillarId={pillar.id} data={data} />
              }
              actions={
                <PillarActions
                  pillarId={pillar.id}
                  loadingAction={loadingAction}
                  runPostAction={actions.runPostAction}
                  data={data}
                  actions={actions}
                />
              }
              onAddConnector={handleAddConnector}
            />
          );
        })}
      </div>

      <div ref={additionalSourcesRef}>
        <Card className="mt-10">
        <h2 className="text-xl font-semibold text-gray-100">Additional MCP sources</h2>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-gray-400">
          Once the four pillars are grounded, broader MCP sources can add supporting evidence.
        </p>
        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {futureSources.map((source) => (
            <div key={source.id} className="rounded-2xl border border-gray-700/70 bg-bb-dark-elevated px-4 py-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium text-gray-100">{source.name}</p>
                  <p className="mt-1 text-sm text-gray-500">{source.description}</p>
                </div>
                <Badge variant={source.status === "available" ? "warning" : "neutral"} className="whitespace-nowrap">
                  {source.status === "available" ? "Manual" : "Coming soon"}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </Card>
      </div>
    </div>
  );
}
