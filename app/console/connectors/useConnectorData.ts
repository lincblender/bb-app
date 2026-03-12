"use client";

import { useEffect, useMemo, useState } from "react";
import { CONNECTOR_IDS } from "@/lib/connectors/catalog";
import {
  countReadyPillars,
  getCoreConnectorMap,
  getSetupPillarStatuses,
  type SetupPillarStatus,
} from "@/lib/connectors/setup-status";
import { createClient } from "@/lib/supabase/client";
import { useWorkspaceData } from "@/lib/workspace/client";
import { getManagedOrganizations, getTimestampLabel } from "./utils";

export interface ConnectorData {
  pillarStatuses: SetupPillarStatus[];
  readyCount: number;
  linkedInConnected: boolean;
  linkedInIdentityConnector: ReturnType<ReturnType<typeof getCoreConnectorMap>["get"]>;
  linkedInCompanyAdminConnector: ReturnType<ReturnType<typeof getCoreConnectorMap>["get"]>;
  hubspotConnector: ReturnType<ReturnType<typeof getCoreConnectorMap>["get"]>;
  austenderConnector: ReturnType<ReturnType<typeof getCoreConnectorMap>["get"]>;
  linkedInManagedOrganizations: Array<Record<string, unknown>>;
  linkedInCompanyWarnings: string | null;
  linkedInCompanyLastSync: string | null;
  hubspotPreview: Array<Record<string, unknown>>;
  hubspotWarnings: string | null;
  hubspotLastSync: string | null;
  austenderLastSync: string | null;
  austenderOpportunityCount: number;
}

export function useConnectorData(): ConnectorData {
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
            (connector) => connector.id === CONNECTOR_IDS.linkedin && connector.status === "live"
          )
        ) {
          await fetch("/api/connectors/linkedin/activate", { method: "POST" }).catch(() => undefined);
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
  const linkedInIdentityConnector = coreConnectorMap.get(CONNECTOR_IDS.linkedin);
  const linkedInCompanyAdminConnector = coreConnectorMap.get(CONNECTOR_IDS.linkedinCompanyAdmin);
  const hubspotConnector = coreConnectorMap.get(CONNECTOR_IDS.hubspot);
  const austenderConnector = coreConnectorMap.get(CONNECTOR_IDS.austender);

  return {
    pillarStatuses,
    readyCount: countReadyPillars(pillarStatuses),
    linkedInConnected,
    linkedInIdentityConnector,
    linkedInCompanyAdminConnector,
    hubspotConnector,
    austenderConnector,
    linkedInManagedOrganizations: getManagedOrganizations(
      linkedInCompanyAdminConnector?.config?.managed_organizations
    ),
    linkedInCompanyWarnings:
      typeof linkedInCompanyAdminConnector?.config?.last_sync_error === "string"
        ? linkedInCompanyAdminConnector.config.last_sync_error
        : Array.isArray(linkedInCompanyAdminConnector?.config?.sync_warnings)
          ? linkedInCompanyAdminConnector.config.sync_warnings
              .filter((w): w is string => typeof w === "string")
              .join(" ")
          : null,
    linkedInCompanyLastSync: getTimestampLabel(linkedInCompanyAdminConnector?.config?.last_synced_at),
    hubspotPreview: Array.isArray(hubspotConnector?.config?.history_preview)
      ? (hubspotConnector.config.history_preview as Array<Record<string, unknown>>)
      : [],
    hubspotWarnings:
      typeof hubspotConnector?.config?.last_sync_error === "string"
        ? hubspotConnector.config.last_sync_error
        : null,
    hubspotLastSync: getTimestampLabel(hubspotConnector?.config?.last_synced_at),
    austenderLastSync: getTimestampLabel(austenderConnector?.config?.last_synced_at),
    austenderOpportunityCount: opportunities.filter((o) => o.sourceId === "tb-austender").length,
  };
}
