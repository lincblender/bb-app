"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export interface ConnectorFeedback {
  tone: "positive" | "warning";
  text: string;
}

export function useConnectorFeedback(options: {
  setFeedback: (feedback: ConnectorFeedback | null) => void;
  setShowLinkedInCompanySetup: (show: boolean) => void;
  setLinkedInSetupError: (error: string | null) => void;
  handleConnectLinkedIn: () => void;
  handleConnectHubSpot: () => void;
  handleConnectLinkedInCompanyAdmin: () => void;
  runPostAction: (
    actionId: string,
    endpoint: string,
    successText: (body: Record<string, unknown>) => string
  ) => Promise<void>;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const {
    setFeedback,
    setShowLinkedInCompanySetup,
    setLinkedInSetupError,
    handleConnectLinkedIn,
    handleConnectHubSpot,
    handleConnectLinkedInCompanyAdmin,
    runPostAction,
  } = options;

  useEffect(() => {
    const hubspotStatus = searchParams.get("hubspot");
    const linkedInAdminStatus = searchParams.get("linkedin_admin");
    const detail = searchParams.get("detail");
    const connectorStatus = hubspotStatus ?? linkedInAdminStatus;
    if (!connectorStatus) return;

    if (linkedInAdminStatus === "setup") {
      setShowLinkedInCompanySetup(true);
      setLinkedInSetupError(null);
    } else {
      setFeedback({
        tone: connectorStatus === "connected" ? "positive" : "warning",
        text:
          detail ??
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
  }, [router, searchParams, setFeedback, setShowLinkedInCompanySetup, setLinkedInSetupError]);

  const [actionHandled, setActionHandled] = useState<string | null>(null);

  useEffect(() => {
    const action = searchParams.get("action");
    if (!action || actionHandled === action) return;

    setActionHandled(action);

    const handlers: Record<string, () => void> = {
      "connect-linkedin": handleConnectLinkedIn,
      "connect-linkedin-company-admin": handleConnectLinkedInCompanyAdmin,
      "connect-hubspot": handleConnectHubSpot,
    };

    const handler = handlers[action];
    if (handler) {
      handler();
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
  }, [
    searchParams,
    actionHandled,
    handleConnectLinkedIn,
    handleConnectHubSpot,
    handleConnectLinkedInCompanyAdmin,
    runPostAction,
  ]);
}
