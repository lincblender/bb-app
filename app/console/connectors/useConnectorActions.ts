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
  handleLinkedInCompanySetupSubmit: (e: React.FormEvent<HTMLFormElement>) => Promise<void>;
}

export function useConnectorActions(options: {
  setLoadingAction: (id: string | null) => void;
  setFeedback: (feedback: { tone: "positive" | "warning"; text: string } | null) => void;
  setShowLinkedInCompanySetup: (show: boolean) => void;
  setLinkedInSetupError: (error: string | null) => void;
}): ConnectorActions {
  const { refetch } = useWorkspaceData();
  const {
    setLoadingAction,
    setFeedback,
    setShowLinkedInCompanySetup,
    setLinkedInSetupError,
  } = options;

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

  const handleLinkedInCompanySetupSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
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
        window.location.assign(
          `/api/connectors/linkedin/company-admin/auth/start?next=${REDIRECT_BASE}`
        );
      } catch {
        setLinkedInSetupError("Setup failed. Please try again.");
      } finally {
        setLoadingAction(null);
      }
    },
    [setLoadingAction, setLinkedInSetupError, setShowLinkedInCompanySetup]
  );

  return {
    runPostAction,
    handleConnectLinkedIn,
    handleConnectHubSpot,
    handleConnectLinkedInCompanyAdmin,
    handleLinkedInCompanySetupSubmit,
  };
}
