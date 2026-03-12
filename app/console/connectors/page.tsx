"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Briefcase,
  CheckCircle2,
  ExternalLink,
  History,
  Linkedin,
  RefreshCw,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { mcpLibrary } from "@/lib/mcp/library";
import { formatHubSpotPreviewForDisplay } from "./utils";
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
  showLinkedInCompanySetup,
  setShowLinkedInCompanySetup,
}: {
  pillarId: string;
  loadingAction: string | null;
  runPostAction: (id: string, endpoint: string, fn: (b: Record<string, unknown>) => string) => Promise<void>;
  data: ReturnType<typeof useConnectorData>;
  actions: ReturnType<typeof useConnectorActions>;
  showLinkedInCompanySetup: boolean;
  setShowLinkedInCompanySetup: (v: boolean) => void;
}) {
  const btn = "inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-60";
  const primary = "bg-bb-coral text-white hover:bg-bb-coral/90";
  const secondary = "border border-gray-600 text-gray-200 hover:border-bb-powder-blue hover:text-white";
  const link = "text-sm font-medium text-bb-coral hover:text-bb-coral/85";

  if (pillarId === "reach") {
    if (!data.linkedInConnected) {
      return (
        <button
          type="button"
          onClick={actions.handleConnectLinkedIn}
          disabled={loadingAction === "connect-linkedin"}
          className={`${btn} ${primary}`}
        >
          {loadingAction === "connect-linkedin" ? <RefreshCw size={16} className="animate-spin" /> : <Linkedin size={16} />}
          Connect LinkedIn
        </button>
      );
    }
    return (
      <>
        <button
          type="button"
          onClick={actions.handleConnectLinkedInCompanyAdmin}
          disabled={loadingAction === "connect-linkedin-company-admin"}
          className={`${btn} ${primary}`}
        >
          {loadingAction === "connect-linkedin-company-admin" ? <RefreshCw size={16} className="animate-spin" /> : <ExternalLink size={16} />}
          {data.linkedInCompanyAdminConnector?.status === "live" ? "Reconnect" : "Authorise company pages"}
        </button>
        <button type="button" onClick={() => setShowLinkedInCompanySetup(true)} className={link}>
          Add credentials
        </button>
        {data.linkedInCompanyAdminConnector?.status === "live" && (
          <button
            type="button"
            onClick={() => void runPostAction("sync-linkedin-company-admin", "/api/connectors/linkedin/company-admin/sync", (b) => `Refreshed ${Array.isArray(b.organizations) ? b.organizations.length : 0} organisations.`)}
            disabled={loadingAction === "sync-linkedin-company-admin"}
            className={`${btn} ${secondary}`}
          >
            {loadingAction === "sync-linkedin-company-admin" ? <RefreshCw size={16} className="animate-spin" /> : <RefreshCw size={16} />}
            Sync
          </button>
        )}
        {(data.linkedInManagedOrganizations.length > 0 || data.linkedInIdentityConnector?.status === "live") && (
          <Link href="/console/network" className={`${link} inline-flex items-center gap-1`}>
            Open network <ArrowRight size={14} />
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
          className={`${btn} ${primary}`}
        >
          {loadingAction === "connect-hubspot" ? <RefreshCw size={16} className="animate-spin" /> : <ExternalLink size={16} />}
          {data.hubspotConnector?.status === "live" ? "Reconnect" : "Authorise HubSpot"}
        </button>
        <button
          type="button"
          onClick={() => void runPostAction("sync-hubspot", "/api/connectors/hubspot/sync", (b) => `Refreshed ${Array.isArray(b.previews) ? b.previews.length : 0} previews.`)}
          disabled={loadingAction === "sync-hubspot"}
          className={`${btn} ${secondary}`}
        >
          {loadingAction === "sync-hubspot" ? <RefreshCw size={16} className="animate-spin" /> : <RefreshCw size={16} />}
          Sync essentials
        </button>
      </>
    );
  }

  if (pillarId === "capability") {
    return (
      <Link href="/console/organisation" className={`${btn} ${primary} w-fit`}>
        Open organisation profile <ArrowRight size={16} />
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
          className={`${btn} ${primary}`}
        >
          {loadingAction === "sync-austender" ? <RefreshCw size={16} className="animate-spin" /> : <RefreshCw size={16} />}
          Sync AusTender
        </button>
        <Link href="/console/opportunities" className={`${link} inline-flex items-center gap-1`}>
          Open opportunity explorer <ArrowRight size={14} />
        </Link>
      </>
    );
  }

  return null;
}

function PillarContent({
  pillarId,
  data,
  actions,
  showLinkedInCompanySetup,
  linkedInSetupError,
  onShowLinkedInCompanySetup,
}: {
  pillarId: string;
  data: ReturnType<typeof useConnectorData>;
  actions: ReturnType<typeof useConnectorActions>;
  showLinkedInCompanySetup: boolean;
  linkedInSetupError: string | null;
  onShowLinkedInCompanySetup: (v: boolean) => void;
}) {
  if (pillarId === "reach" && showLinkedInCompanySetup) {
    return (
      <form
        onSubmit={actions.handleLinkedInCompanySetupSubmit}
        className="space-y-3 rounded-xl border border-gray-700/70 bg-bb-dark px-3 py-3"
      >
        <p className="text-xs text-gray-400">
          Create an app at{" "}
          <a href="https://www.linkedin.com/developers/apps" target="_blank" rel="noopener noreferrer" className="text-bb-coral hover:underline">
            developers.linkedin.com
          </a>
        </p>
        <div>
          <label className="block text-xs text-gray-500">Client ID</label>
          <input name="linkedin_client_id" type="text" placeholder="Client ID" className="mt-1 w-full rounded border border-gray-600 bg-bb-dark-elevated px-2 py-1.5 text-sm" />
        </div>
        <div>
          <label className="block text-xs text-gray-500">Client Secret</label>
          <input name="linkedin_client_secret" type="password" placeholder="Client Secret" className="mt-1 w-full rounded border border-gray-600 bg-bb-dark-elevated px-2 py-1.5 text-sm" />
        </div>
        {linkedInSetupError && <p className="text-xs text-bb-orange">{linkedInSetupError}</p>}
        <div className="flex gap-2">
          <button type="submit" disabled={false} className="rounded bg-[#0a66c2] px-3 py-1.5 text-sm text-white">
            Save and authorise
          </button>
          <button type="button" onClick={() => onShowLinkedInCompanySetup(false)} className="rounded border border-gray-600 px-3 py-1.5 text-sm">
            Cancel
          </button>
        </div>
      </form>
    );
  }

  if (pillarId === "reach" && data.linkedInManagedOrganizations.length > 0) {
    return (
      <div className="space-y-1 rounded-xl border border-gray-700/60 bg-bb-dark px-3 py-2 text-xs">
        {data.linkedInManagedOrganizations.slice(0, 2).map((org) => (
          <div key={String(org.id)}>
            <span className="font-medium text-gray-200">{String(org.name)}</span>
            <span className="ml-2 text-gray-500">{Array.isArray(org.roles) ? org.roles.join(", ") : ""}</span>
          </div>
        ))}
      </div>
    );
  }

  if (pillarId === "history" && data.hubspotPreview.length > 0) {
    return (
      <div className="space-y-1 rounded-xl border border-gray-700/60 bg-bb-dark px-3 py-2 text-xs">
        {data.hubspotPreview.slice(0, 2).map((p) => (
          <div key={`${p.entity}-${p.toolName}`}>
            <span className="font-medium text-gray-200">{String(p.entity)}</span>
            <span className="ml-2 text-gray-500">{formatHubSpotPreviewForDisplay(p.preview, String(p.entity ?? ""))}</span>
          </div>
        ))}
      </div>
    );
  }

  if (pillarId === "history" && data.hubspotWarnings) {
    return <p className="text-xs text-bb-orange">{data.hubspotWarnings}</p>;
  }

  if (pillarId === "reach" && data.linkedInCompanyWarnings) {
    return <p className="text-xs text-bb-orange">{data.linkedInCompanyWarnings}</p>;
  }

  return null;
}

export default function ConnectorsPage() {
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ tone: "positive" | "warning"; text: string } | null>(null);
  const [showLinkedInCompanySetup, setShowLinkedInCompanySetup] = useState(false);
  const [linkedInSetupError, setLinkedInSetupError] = useState<string | null>(null);

  const data = useConnectorData();
  const actions = useConnectorActions({
    setLoadingAction,
    setFeedback,
    setShowLinkedInCompanySetup,
    setLinkedInSetupError,
  });

  useConnectorFeedback({
    setFeedback,
    setShowLinkedInCompanySetup,
    setLinkedInSetupError,
    handleConnectLinkedIn: actions.handleConnectLinkedIn,
    handleConnectHubSpot: actions.handleConnectHubSpot,
    handleConnectLinkedInCompanyAdmin: actions.handleConnectLinkedInCompanyAdmin,
    runPostAction: actions.runPostAction,
  });

  const futureSources = mcpLibrary.filter(
    (entry) => !["mcp-hubspot", "mcp-local-demo", "mcp-custom"].includes(entry.id)
  );

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
                <PillarContent
                  pillarId={pillar.id}
                  data={data}
                  actions={actions}
                  showLinkedInCompanySetup={showLinkedInCompanySetup}
                  linkedInSetupError={linkedInSetupError}
                  onShowLinkedInCompanySetup={setShowLinkedInCompanySetup}
                />
              }
              actions={
                <PillarActions
                  pillarId={pillar.id}
                  loadingAction={loadingAction}
                  runPostAction={actions.runPostAction}
                  data={data}
                  actions={actions}
                  showLinkedInCompanySetup={showLinkedInCompanySetup}
                  setShowLinkedInCompanySetup={setShowLinkedInCompanySetup}
                />
              }
            />
          );
        })}
      </div>

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
                <Badge variant={source.status === "available" ? "warning" : "neutral"}>
                  {source.status === "available" ? "Manual" : "Coming soon"}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
