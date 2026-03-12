"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowRight,
  Briefcase,
  Building2,
  CheckCircle2,
  ExternalLink,
  History,
  Linkedin,
  RefreshCw,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { CONNECTOR_IDS } from "@/lib/connectors/catalog";
import { mcpLibrary } from "@/lib/mcp/library";
import { createClient } from "@/lib/supabase/client";
import {
  countReadyPillars,
  getCoreConnectorMap,
  getSetupPillarStatuses,
  type SetupPillarStatus,
} from "@/lib/connectors/setup-status";
import { useWorkspaceData } from "@/lib/workspace/client";

const PILLAR_ICONS = {
  reach: Linkedin,
  history: History,
  capability: Building2,
  opportunity: Briefcase,
} as const;

function getStatusBadge(status: SetupPillarStatus["status"]) {
  if (status === "ready") return { label: "Ready", variant: "positive" as const };
  if (status === "in-progress") return { label: "In progress", variant: "warning" as const };
  return { label: "Next", variant: "neutral" as const };
}

function getTimestampLabel(value: unknown) {
  if (typeof value !== "string" || !value) {
    return null;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed.toLocaleString("en-AU", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getManagedOrganizations(value: unknown) {
  return Array.isArray(value) ? (value as Array<Record<string, unknown>>) : [];
}

function ConnectorCard({
  pillar,
  actionArea,
  meta,
}: {
  pillar: SetupPillarStatus;
  actionArea: React.ReactNode;
  meta?: React.ReactNode;
}) {
  const Icon = PILLAR_ICONS[pillar.id];
  const badge = getStatusBadge(pillar.status);

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
      <p className="mt-3 text-sm leading-relaxed text-gray-300">{pillar.body}</p>
      <p className="mt-3 rounded-2xl border border-gray-700/60 bg-bb-dark px-4 py-3 text-sm leading-relaxed text-gray-400">
        {pillar.detail}
      </p>
      {meta && <div className="mt-4">{meta}</div>}
      <div className="mt-5 flex-1">{actionArea}</div>
    </Card>
  );
}

export default function ConnectorsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { connectorSources, organisations, opportunities, refetch } = useWorkspaceData();
  const [linkedInConnected, setLinkedInConnected] = useState(false);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ tone: "positive" | "warning"; text: string } | null>(
    null
  );
  const [actionHandled, setActionHandled] = useState<string | null>(null);
  const [showLinkedInCompanySetup, setShowLinkedInCompanySetup] = useState(false);
  const [linkedInSetupError, setLinkedInSetupError] = useState<string | null>(null);

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
            (connector) => connector.id === CONNECTOR_IDS.linkedin && connector.status === "live"
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
  const coreConnectorMap = useMemo(() => getCoreConnectorMap(connectorSources), [connectorSources]);
  const readyCount = useMemo(() => countReadyPillars(pillarStatuses), [pillarStatuses]);
  const linkedInIdentityConnector = coreConnectorMap.get(CONNECTOR_IDS.linkedin);
  const linkedInCompanyAdminConnector = coreConnectorMap.get(CONNECTOR_IDS.linkedinCompanyAdmin);
  const hubspotConnector = coreConnectorMap.get(CONNECTOR_IDS.hubspot);
  const austenderConnector = coreConnectorMap.get(CONNECTOR_IDS.austender);
  const linkedInManagedOrganizations = getManagedOrganizations(
    linkedInCompanyAdminConnector?.config?.managed_organizations
  );
  const linkedInCompanyWarnings =
    typeof linkedInCompanyAdminConnector?.config?.last_sync_error === "string"
      ? linkedInCompanyAdminConnector.config.last_sync_error
      : Array.isArray(linkedInCompanyAdminConnector?.config?.sync_warnings)
        ? linkedInCompanyAdminConnector.config.sync_warnings
            .filter((warning): warning is string => typeof warning === "string")
            .join(" ")
        : null;
  const linkedInCompanyLastSync = getTimestampLabel(
    linkedInCompanyAdminConnector?.config?.last_synced_at
  );
  const hubspotPreview = Array.isArray(hubspotConnector?.config?.history_preview)
    ? (hubspotConnector.config.history_preview as Array<Record<string, unknown>>)
    : [];
  const hubspotWarnings =
    typeof hubspotConnector?.config?.last_sync_error === "string"
      ? hubspotConnector.config.last_sync_error
      : null;
  const hubspotLastSync = getTimestampLabel(hubspotConnector?.config?.last_synced_at);
  const austenderLastSync = getTimestampLabel(austenderConnector?.config?.last_synced_at);
  const austenderOpportunityCount = opportunities.filter(
    (opportunity) => opportunity.sourceId === "tb-austender"
  ).length;

  const runPostAction = async (
    actionId: string,
    endpoint: string,
    successText: (body: Record<string, unknown>) => string
  ) => {
    setLoadingAction(actionId);
    setFeedback(null);

    try {
      const response = await fetch(endpoint, {
        method: "POST",
      });
      const body = (await response.json().catch(() => ({}))) as Record<string, unknown>;
      if (!response.ok) {
        throw new Error(
          typeof body.error === "string" ? body.error : `Request failed with status ${response.status}.`
        );
      }

      await refetch();
      setFeedback({
        tone: "positive",
        text: successText(body),
      });
    } catch (error) {
      setFeedback({
        tone: "warning",
        text: error instanceof Error ? error.message : "The connector action failed.",
      });
    } finally {
      setLoadingAction(null);
    }
  };

  const handleConnectLinkedIn = () => {
    const supabase = createClient();
    setLoadingAction("connect-linkedin");
    void supabase.auth
      .signInWithOAuth({
        provider: "linkedin_oidc",
        options: {
          redirectTo:
            typeof window !== "undefined"
              ? `${window.location.origin}/auth/callback?next=/console/connectors`
              : undefined,
        },
      })
      .finally(() => setLoadingAction(null));
  };

  const handleConnectHubSpot = () => {
    setLoadingAction("connect-hubspot");
    if (typeof window !== "undefined") {
      window.location.assign("/api/connectors/hubspot/auth/start?next=/console/connectors");
    }
  };

  const handleConnectLinkedInCompanyAdmin = () => {
    setLoadingAction("connect-linkedin-company-admin");
    if (typeof window !== "undefined") {
      window.location.assign("/api/connectors/linkedin/company-admin/auth/start?next=/console/connectors");
    }
  };

  const handleLinkedInCompanySetupSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const clientId = (form.elements.namedItem("linkedin_client_id") as HTMLInputElement)?.value?.trim();
    const clientSecret = (form.elements.namedItem("linkedin_client_secret") as HTMLInputElement)?.value?.trim();
    if (!clientId || !clientSecret) {
      setLinkedInSetupError("Both Client ID and Client Secret are required.");
      return;
    }
    setLoadingAction("linkedin-company-setup");
    setLinkedInSetupError(null);
    try {
      const res = await fetch("/api/connectors/linkedin/company-admin/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ client_id: clientId, client_secret: clientSecret }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setLinkedInSetupError(data.error ?? "Setup failed.");
        return;
      }
      setShowLinkedInCompanySetup(false);
      window.location.assign("/api/connectors/linkedin/company-admin/auth/start?next=/console/connectors");
    } catch {
      setLinkedInSetupError("Setup failed. Please try again.");
    } finally {
      setLoadingAction(null);
    }
  };

  useEffect(() => {
    const hubspotStatus = searchParams.get("hubspot");
    const linkedInAdminStatus = searchParams.get("linkedin_admin");
    const detail = searchParams.get("detail");
    const connectorStatus = hubspotStatus ?? linkedInAdminStatus;
    if (!connectorStatus) {
      return;
    }

    if (linkedInAdminStatus === "setup") {
      setShowLinkedInCompanySetup(true);
      setLinkedInSetupError(null);
    } else {
      setFeedback({
        tone: connectorStatus === "connected" ? "positive" : "warning",
        text:
          detail ||
          (hubspotStatus
            ? hubspotStatus === "connected"
              ? "HubSpot connected."
              : "HubSpot action failed."
            : linkedInAdminStatus === "connected"
              ? "LinkedIn company-page access connected."
              : "LinkedIn company-page action failed."),
      });
    }

    const params = new URLSearchParams(searchParams.toString());
    params.delete("hubspot");
    params.delete("linkedin_admin");
    params.delete("detail");
    router.replace(params.toString() ? `/console/connectors?${params.toString()}` : "/console/connectors");
  }, [router, searchParams]);

  useEffect(() => {
    const action = searchParams.get("action");
    if (!action || actionHandled === action) {
      return;
    }

    setActionHandled(action);

    if (action === "connect-linkedin") {
      handleConnectLinkedIn();
      return;
    }

    if (action === "connect-linkedin-company-admin") {
      handleConnectLinkedInCompanyAdmin();
      return;
    }

    if (action === "connect-hubspot") {
      handleConnectHubSpot();
      return;
    }

    if (action === "sync-austender") {
      void runPostAction(
        action,
        "/api/connectors/austender/sync",
        (body) => `Imported ${typeof body.importedCount === "number" ? body.importedCount : 0} AusTender notices.`
      );
      return;
    }

    if (action === "sync-hubspot") {
      void runPostAction(
        action,
        "/api/connectors/hubspot/sync",
        (body) =>
          `HubSpot selective sync refreshed ${
            Array.isArray(body.previews) ? body.previews.length : 0
          } history previews.`
      );
      return;
    }

    if (action === "sync-linkedin-company-admin") {
      void runPostAction(
        action,
        "/api/connectors/linkedin/company-admin/sync",
        (body) =>
          `LinkedIn company-page sync refreshed ${
            Array.isArray(body.organizations) ? body.organizations.length : 0
          } administered organizations.`
      );
    }
  }, [actionHandled, searchParams]);

  const futureSources = mcpLibrary.filter(
    (entry) => !["mcp-hubspot", "mcp-local-demo", "mcp-custom"].includes(entry.id)
  );

  return (
    <div className="mx-auto max-w-6xl">
      <div className="max-w-4xl">
        <h1 className="text-3xl font-semibold text-gray-100">Connect the four pillars</h1>
        <p className="mt-3 text-base leading-relaxed text-gray-300">
          Start with the user profile, then add selective CRM history, organisation capability
          evidence, and live opportunities. The goal is sufficiency, not source-system replication.
        </p>
        <div className="mt-6 flex flex-wrap gap-3 text-sm text-gray-400">
          <span className="inline-flex items-center gap-2 rounded-lg border border-gray-700 bg-bb-dark-elevated px-3 py-1.5">
            <CheckCircle2 size={14} className={readyCount >= 4 ? "text-bb-green" : "text-bb-orange"} />
            {readyCount} of 4 pillars ready
          </span>
          <span className="inline-flex items-center gap-2 rounded-lg border border-gray-700 bg-bb-dark-elevated px-3 py-1.5">
            <History size={14} className={hubspotPreview.length > 0 ? "text-bb-green" : "text-bb-orange"} />
            {hubspotPreview.length > 0
              ? `${hubspotPreview.length} HubSpot previews available`
              : "HubSpot still needs selective sync"}
          </span>
          <span className="inline-flex items-center gap-2 rounded-lg border border-gray-700 bg-bb-dark-elevated px-3 py-1.5">
            <Briefcase
              size={14}
              className={austenderOpportunityCount > 0 ? "text-bb-green" : "text-bb-orange"}
            />
            {austenderOpportunityCount > 0
              ? `${austenderOpportunityCount} AusTender notices in workspace`
              : "No AusTender notices imported yet"}
          </span>
        </div>
      </div>

      {feedback && (
        <div
          className={`mt-8 rounded-2xl border px-4 py-3 text-sm ${
            feedback.tone === "positive"
              ? "border-bb-green/40 bg-bb-green/10 text-gray-200"
              : "border-bb-orange/40 bg-bb-orange/10 text-gray-200"
          }`}
        >
          {feedback.text}
        </div>
      )}

      <div className="mt-10 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        {pillarStatuses.map((pillar) => {
          if (pillar.id === "reach") {
            return (
              <ConnectorCard
                key={pillar.id}
                pillar={pillar}
                meta={
                  <div className="space-y-2 text-xs text-gray-500">
                    <p>
                      Reach now has two layers. LinkedIn sign-in establishes identity first, then a
                      separate LinkedIn OAuth grant adds role-aware company-page access when the
                      member actually administers a page.
                    </p>
                    {linkedInCompanyLastSync && <p>Last company sync: {linkedInCompanyLastSync}</p>}
                  </div>
                }
                actionArea={
                  linkedInConnected ? (
                    <div className="space-y-3">
                      {showLinkedInCompanySetup ? (
                        <form
                          onSubmit={handleLinkedInCompanySetupSubmit}
                          className="space-y-3 rounded-2xl border border-gray-700/70 bg-bb-dark px-4 py-3"
                        >
                          <p className="text-sm text-gray-300">
                            Add your LinkedIn app credentials. Create an app at{" "}
                            <a
                              href="https://www.linkedin.com/developers/apps"
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-bb-coral hover:underline"
                            >
                              developers.linkedin.com
                            </a>{" "}
                            and add the redirect URL for your environment.
                          </p>
                          <div className="space-y-2">
                            <label htmlFor="linkedin_client_id" className="block text-xs font-medium text-gray-400">
                              Client ID
                            </label>
                            <input
                              id="linkedin_client_id"
                              name="linkedin_client_id"
                              type="text"
                              autoComplete="off"
                              placeholder="Your LinkedIn app Client ID"
                              className="w-full rounded-lg border border-gray-600 bg-bb-dark-elevated px-3 py-2 text-sm text-gray-100 placeholder:text-gray-500 focus:border-bb-powder-blue focus:outline-none focus:ring-1 focus:ring-bb-powder-blue"
                            />
                          </div>
                          <div className="space-y-2">
                            <label htmlFor="linkedin_client_secret" className="block text-xs font-medium text-gray-400">
                              Client Secret
                            </label>
                            <input
                              id="linkedin_client_secret"
                              name="linkedin_client_secret"
                              type="password"
                              autoComplete="off"
                              placeholder="Your LinkedIn app Client Secret"
                              className="w-full rounded-lg border border-gray-600 bg-bb-dark-elevated px-3 py-2 text-sm text-gray-100 placeholder:text-gray-500 focus:border-bb-powder-blue focus:outline-none focus:ring-1 focus:ring-bb-powder-blue"
                            />
                          </div>
                          {linkedInSetupError && (
                            <p className="text-sm text-bb-orange">{linkedInSetupError}</p>
                          )}
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="submit"
                              disabled={loadingAction === "linkedin-company-setup"}
                              className="inline-flex items-center gap-2 rounded-lg bg-[#0a66c2] px-4 py-2 text-sm font-medium text-white hover:bg-[#004182] disabled:opacity-60"
                            >
                              {loadingAction === "linkedin-company-setup" ? (
                                <RefreshCw size={16} className="animate-spin" />
                              ) : (
                                <ExternalLink size={16} />
                              )}
                              Save and authorise
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setShowLinkedInCompanySetup(false);
                                setLinkedInSetupError(null);
                              }}
                              className="rounded-lg border border-gray-600 px-4 py-2 text-sm font-medium text-gray-200 hover:border-bb-powder-blue hover:text-white"
                            >
                              Cancel
                            </button>
                          </div>
                        </form>
                      ) : (
                        <>
                          <div className="flex flex-wrap gap-2">
                            <Badge variant="high" className="flex w-fit items-center gap-1">
                              <CheckCircle2 size={14} />
                              LinkedIn sign-in
                            </Badge>
                            {linkedInManagedOrganizations.length > 0 && (
                              <Badge variant="positive" className="flex w-fit items-center gap-1">
                                <CheckCircle2 size={14} />
                                {linkedInManagedOrganizations.length} company
                                {linkedInManagedOrganizations.length === 1 ? " page" : " pages"}
                              </Badge>
                            )}
                          </div>
                          {linkedInManagedOrganizations.length > 0 && (
                        <div className="space-y-2 rounded-2xl border border-gray-700/70 bg-bb-dark px-4 py-3 text-sm text-gray-300">
                          {linkedInManagedOrganizations.slice(0, 3).map((organization) => (
                            <div key={String(organization.id)}>
                              <p className="font-medium text-gray-100">{String(organization.name)}</p>
                              <p className="mt-1 text-xs leading-relaxed text-gray-400">
                                {Array.isArray(organization.roles)
                                  ? organization.roles.join(", ")
                                  : String(organization.authorityLevel ?? "Authority available")}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                      {linkedInCompanyWarnings && (
                        <p className="text-xs leading-relaxed text-bb-orange">{linkedInCompanyWarnings}</p>
                      )}
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={handleConnectLinkedInCompanyAdmin}
                          disabled={loadingAction === "connect-linkedin-company-admin"}
                          className="inline-flex items-center gap-2 rounded-lg bg-[#0a66c2] px-4 py-2 text-sm font-medium text-white hover:bg-[#004182] disabled:opacity-60"
                        >
                          {loadingAction === "connect-linkedin-company-admin" ? (
                            <RefreshCw size={16} className="animate-spin" />
                          ) : (
                            <ExternalLink size={16} />
                          )}
                          {linkedInCompanyAdminConnector?.status === "live"
                            ? "Reconnect company pages"
                            : "Authorise company pages"}
                        </button>
                        {!showLinkedInCompanySetup && (
                          <button
                            type="button"
                            onClick={() => setShowLinkedInCompanySetup(true)}
                            className="text-sm text-gray-400 hover:text-bb-coral"
                          >
                            Add credentials
                          </button>
                        )}
                        {linkedInCompanyAdminConnector?.status === "live" && (
                          <button
                            type="button"
                            onClick={() =>
                              void runPostAction(
                                "sync-linkedin-company-admin",
                                "/api/connectors/linkedin/company-admin/sync",
                                (body) =>
                                  `LinkedIn company-page sync refreshed ${
                                    Array.isArray(body.organizations) ? body.organizations.length : 0
                                  } administered organizations.`
                              )
                            }
                            disabled={loadingAction === "sync-linkedin-company-admin"}
                            className="inline-flex items-center gap-2 rounded-lg border border-gray-600 px-4 py-2 text-sm font-medium text-gray-200 hover:border-bb-powder-blue hover:text-white disabled:opacity-60"
                          >
                            {loadingAction === "sync-linkedin-company-admin" ? (
                              <RefreshCw size={16} className="animate-spin" />
                            ) : (
                              <RefreshCw size={16} />
                            )}
                            Sync company access
                          </button>
                        )}
                      </div>
                      {(linkedInManagedOrganizations.length > 0 ||
                        linkedInIdentityConnector?.status === "live") && (
                        <Link
                          href="/console/network"
                          className="inline-flex items-center gap-2 text-sm font-medium text-bb-coral hover:text-bb-coral/85"
                        >
                          Open network view
                          <ArrowRight size={16} />
                        </Link>
                      )}
                        </>
                      )}
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={handleConnectLinkedIn}
                      disabled={loadingAction === "connect-linkedin"}
                      className="inline-flex items-center gap-2 rounded-lg bg-[#0a66c2] px-4 py-2 text-sm font-medium text-white hover:bg-[#004182] disabled:opacity-60"
                    >
                      {loadingAction === "connect-linkedin" ? (
                        <RefreshCw size={16} className="animate-spin" />
                      ) : (
                        <Linkedin size={16} />
                      )}
                      Connect LinkedIn
                    </button>
                  )
                }
              />
            );
          }

          if (pillar.id === "history") {
            return (
              <ConnectorCard
                key={pillar.id}
                pillar={pillar}
                meta={
                  <div className="space-y-2 text-xs text-gray-500">
                    <p>
                      HubSpot is treated as a selective history layer. BidBlender should pull recent
                      essentials only, then gather more as opportunities and client records are opened.
                    </p>
                    {hubspotLastSync && <p>Last sync: {hubspotLastSync}</p>}
                  </div>
                }
                actionArea={
                  <div className="space-y-3">
                    {hubspotPreview.length > 0 && (
                      <div className="space-y-2 rounded-2xl border border-gray-700/70 bg-bb-dark px-4 py-3 text-sm text-gray-300">
                        {hubspotPreview.slice(0, 2).map((preview) => (
                          <div key={`${preview.entity}-${preview.toolName}`}>
                            <p className="font-medium text-gray-100">
                              {String(preview.entity)} via {String(preview.toolName)}
                            </p>
                            <p className="mt-1 text-xs leading-relaxed text-gray-400">
                              {String(preview.preview)}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                    {hubspotWarnings && (
                      <p className="text-xs leading-relaxed text-bb-orange">{hubspotWarnings}</p>
                    )}
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={handleConnectHubSpot}
                        disabled={loadingAction === "connect-hubspot"}
                        className="inline-flex items-center gap-2 rounded-lg bg-bb-coral px-4 py-2 text-sm font-medium text-white hover:bg-bb-coral/90 disabled:opacity-60"
                      >
                        {loadingAction === "connect-hubspot" ? (
                          <RefreshCw size={16} className="animate-spin" />
                        ) : (
                          <ExternalLink size={16} />
                        )}
                        {hubspotConnector?.status === "live" ? "Reconnect HubSpot" : "Authorise HubSpot"}
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          void runPostAction(
                            "sync-hubspot",
                            "/api/connectors/hubspot/sync",
                            (body) =>
                              `HubSpot selective sync refreshed ${
                                Array.isArray(body.previews) ? body.previews.length : 0
                              } history previews.`
                          )
                        }
                        disabled={loadingAction === "sync-hubspot"}
                        className="inline-flex items-center gap-2 rounded-lg border border-gray-600 px-4 py-2 text-sm font-medium text-gray-200 hover:border-bb-powder-blue hover:text-white disabled:opacity-60"
                      >
                        {loadingAction === "sync-hubspot" ? (
                          <RefreshCw size={16} className="animate-spin" />
                        ) : (
                          <RefreshCw size={16} />
                        )}
                        Sync essentials
                      </button>
                    </div>
                  </div>
                }
              />
            );
          }

          if (pillar.id === "capability") {
            return (
              <ConnectorCard
                key={pillar.id}
                pillar={pillar}
                meta={
                  <p className="text-xs text-gray-500">
                    Capability is intentionally curated in-app for now, so the product has a clean
                    evidence layer before more systems are added.
                  </p>
                }
                actionArea={
                  <Link
                    href="/console/organisation"
                    className="inline-flex items-center gap-2 rounded-lg bg-bb-powder-blue px-4 py-2 text-sm font-medium text-black hover:bg-bb-powder-blue-light"
                  >
                    Open organisation profile
                    <ArrowRight size={16} />
                  </Link>
                }
              />
            );
          }

          return (
            <ConnectorCard
              key={pillar.id}
              pillar={pillar}
              meta={
                <div className="space-y-2 text-xs text-gray-500">
                  <p>
                    AusTender uses the official RSS feed for now. It is intentionally lean and avoids
                    deeper scraping until a specific notice needs more context.
                  </p>
                  {austenderLastSync && <p>Last sync: {austenderLastSync}</p>}
                </div>
              }
              actionArea={
                <div className="space-y-3">
                  <button
                    type="button"
                    onClick={() =>
                      void runPostAction(
                        "sync-austender",
                        "/api/connectors/austender/sync",
                        (body) =>
                          `Imported ${typeof body.importedCount === "number" ? body.importedCount : 0} AusTender notices.`
                      )
                    }
                    disabled={loadingAction === "sync-austender"}
                    className="inline-flex items-center gap-2 rounded-lg bg-bb-coral px-4 py-2 text-sm font-medium text-white hover:bg-bb-coral/90 disabled:opacity-60"
                  >
                    {loadingAction === "sync-austender" ? (
                      <RefreshCw size={16} className="animate-spin" />
                    ) : (
                      <RefreshCw size={16} />
                    )}
                    Sync AusTender
                  </button>
                  <Link
                    href="/console/opportunities"
                    className="inline-flex items-center gap-2 text-sm font-medium text-bb-coral hover:text-bb-coral/85"
                  >
                    Open opportunity explorer
                    <ArrowRight size={16} />
                  </Link>
                </div>
              }
            />
          );
        })}
      </div>

      <Card className="mt-10">
        <h2 className="text-xl font-semibold text-gray-100">Additional MCP sources</h2>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-gray-400">
          Once the four pillars are grounded, broader MCP sources can add supporting evidence. They
          should stay secondary to the core setup path, not distract from it.
        </p>
        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {futureSources.map((source) => (
            <div
              key={source.id}
              className="rounded-2xl border border-gray-700/70 bg-bb-dark-elevated px-4 py-4"
            >
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
