"use client";

import { useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useWorkspaceData } from "@/lib/workspace/client";

const REDIRECT_BASE = "/console/connectors";

export interface ConnectorActions {
  runPostAction: (
    actionId: string,
    endpoint: string,
    successText: (body: Record<string, unknown>) => string
  ) => Promise<void>;
  handleConnectLinkedIn: () => void;
  handleConnectHubSpot: () => void;
  handleConnectLinkedInCompanyAdmin: () => void;
  handleSyncLinkedInProfile: () => Promise<void>;
}

export function useConnectorActions(options: {
  setLoadingAction: (id: string | null) => void;
  setFeedback: (feedback: { tone: "positive" | "warning"; text: string } | null) => void;
}): ConnectorActions {
  const { refetch } = useWorkspaceData();
  const { setLoadingAction, setFeedback } = options;

  const runPostAction = useCallback(
    async (
      actionId: string,
      endpoint: string,
      successText: (body: Record<string, unknown>) => string
    ) => {
      setLoadingAction(actionId);
      setFeedback(null);
      try {
        const response = await fetch(endpoint, { method: "POST" });
        const body = (await response.json().catch(() => ({}))) as Record<string, unknown>;
        if (!response.ok) {
          throw new Error(
            typeof body.error === "string" ? body.error : `Request failed with status ${response.status}.`
          );
        }
        await refetch();
        setFeedback({ tone: "positive", text: successText(body) });
      } catch (error) {
        setFeedback({
          tone: "warning",
          text: error instanceof Error ? error.message : "The connector action failed.",
        });
      } finally {
        setLoadingAction(null);
      }
    },
    [refetch, setLoadingAction, setFeedback]
  );

  const handleConnectLinkedIn = useCallback(() => {
    setLoadingAction("connect-linkedin");
    void createClient()
      .auth.signInWithOAuth({
        provider: "linkedin_oidc",
        options: {
          redirectTo:
            typeof window !== "undefined"
              ? `${window.location.origin}/auth/callback?next=${REDIRECT_BASE}`
              : undefined,
        },
      })
      .finally(() => setLoadingAction(null));
  }, [setLoadingAction]);

  const handleConnectHubSpot = useCallback(() => {
    setLoadingAction("connect-hubspot");
    if (typeof window !== "undefined") {
      window.location.assign(`/api/connectors/hubspot/auth/start?next=${REDIRECT_BASE}`);
    }
  }, [setLoadingAction]);

  const handleConnectLinkedInCompanyAdmin = useCallback(() => {
    setLoadingAction("connect-linkedin-company-admin");
    if (typeof window !== "undefined") {
      window.location.assign(
        `/api/connectors/linkedin/company-admin/auth/start?next=${REDIRECT_BASE}`
      );
    }
  }, [setLoadingAction]);

  const handleSyncLinkedInProfile = useCallback(async () => {
    setLoadingAction("sync-linkedin-profile");
    setFeedback(null);
    try {
      const { data: { session } } = await createClient().auth.getSession();
      const providerToken = session?.provider_token ?? null;
      const response = await fetch("/api/connectors/linkedin/profile/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ providerToken }),
      });
      const body = (await response.json().catch(() => ({}))) as Record<string, unknown>;
      if (!response.ok) {
        throw new Error(
          typeof body.error === "string" ? body.error : `Request failed with status ${response.status}.`
        );
      }
      await refetch();
      const profile = body.profile as Record<string, unknown> | undefined;
      const name = typeof profile?.fullName === "string" ? profile.fullName : null;
      setFeedback({ tone: "positive", text: name ? `Profile synced for ${name}.` : "LinkedIn profile synced." });
    } catch (error) {
      setFeedback({
        tone: "warning",
        text: error instanceof Error ? error.message : "Profile sync failed.",
      });
    } finally {
      setLoadingAction(null);
    }
  }, [refetch, setLoadingAction, setFeedback]);

  return {
    runPostAction,
    handleConnectLinkedIn,
    handleConnectHubSpot,
    handleConnectLinkedInCompanyAdmin,
    handleSyncLinkedInProfile,
  };
}
