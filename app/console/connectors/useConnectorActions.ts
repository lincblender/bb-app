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

  return {
    runPostAction,
    handleConnectLinkedIn,
    handleConnectHubSpot,
    handleConnectLinkedInCompanyAdmin,
  };
}
