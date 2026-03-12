import type { ConnectorSource, Organisation, Opportunity } from "@/lib/types";
import {
  CONNECTOR_IDS,
  CORE_CONNECTOR_CATALOG,
  SETUP_PILLARS,
  TENDER_BOARD_IDS,
  mergeConnectorWithCatalog,
  type SetupPillarDefinition,
  type SetupPillarId,
} from "./catalog";

export type SetupProgressStatus = "ready" | "in-progress" | "next";

export interface SetupPillarStatus extends SetupPillarDefinition {
  status: SetupProgressStatus;
  detail: string;
  connector?: ConnectorSource;
}

function hasUsefulOrganisationProfile(organisation: Organisation | undefined) {
  if (!organisation) {
    return false;
  }

  return Boolean(
    organisation.description.trim() ||
      organisation.capabilities.length ||
      organisation.certifications.length ||
      organisation.individualQualifications.length ||
      organisation.caseStudies.length ||
      organisation.targetMarkets.length ||
      organisation.strategicPreferences.length
  );
}

function hasPartialOrganisationProfile(organisation: Organisation | undefined) {
  if (!organisation) {
    return false;
  }

  return Boolean(organisation.name.trim() || organisation.description.trim());
}

function getLinkedInCompanyAdminCount(connector: ConnectorSource | undefined) {
  if (typeof connector?.config?.managed_organization_count === "number") {
    return connector.config.managed_organization_count;
  }

  return Array.isArray(connector?.config?.managed_organizations)
    ? connector.config.managed_organizations.length
    : 0;
}

function getLinkedInCompanyAdminWarning(connector: ConnectorSource | undefined) {
  if (typeof connector?.config?.last_sync_error === "string" && connector.config.last_sync_error.length > 0) {
    return connector.config.last_sync_error;
  }

  const warnings = Array.isArray(connector?.config?.sync_warnings)
    ? connector?.config?.sync_warnings.filter((warning): warning is string => typeof warning === "string")
    : [];

  return warnings.length > 0 ? warnings.join(" ") : null;
}

export function getCoreConnectorMap(connectors: ConnectorSource[]) {
  return new Map(
    CORE_CONNECTOR_CATALOG.map((catalogConnector) => {
      const liveConnector = connectors.find((connector) => connector.id === catalogConnector.id);
      return [catalogConnector.id, mergeConnectorWithCatalog(liveConnector, catalogConnector)];
    })
  );
}

function getHubSpotStatus(connector: ConnectorSource | undefined): SetupPillarStatus["status"] {
  const auth = connector?.config?.auth;
  const accessToken =
    auth && typeof auth === "object" && typeof (auth as Record<string, unknown>).access_token === "string"
      ? ((auth as Record<string, unknown>).access_token as string)
      : "";
  const historyPreview = Array.isArray(connector?.config?.history_preview)
    ? connector?.config?.history_preview
    : [];

  if (accessToken || connector?.status === "live") return "ready";
  if (
    typeof connector?.config?.last_error === "string" ||
    typeof connector?.config?.last_sync_error === "string"
  ) {
    return "in-progress";
  }
  return "next";
}

function getHubSpotDetail(connector: ConnectorSource | undefined) {
  const preview = Array.isArray(connector?.config?.history_preview)
    ? connector?.config?.history_preview
    : [];
  const lastError =
    typeof connector?.config?.last_sync_error === "string" ? connector.config.last_sync_error : null;

  if (preview.length > 0) {
    return `${preview.length} selective history previews are available.`;
  }
  if (lastError) {
    return lastError;
  }
  if (connector?.status === "live") {
    return "HubSpot is authorised and ready. Sync essentials whenever you want a lean history refresh.";
  }
  return "Connect HubSpot, then pull only recent essentials and fetch more only when a client or opportunity needs it.";
}

function getOpportunityStatus(
  connector: ConnectorSource | undefined,
  opportunities: Opportunity[]
): SetupPillarStatus["status"] {
  const importedCount = opportunities.filter((opportunity) => opportunity.sourceId === TENDER_BOARD_IDS.austender).length;
  if (importedCount > 0) return "ready";
  if (connector?.status === "live") return "in-progress";
  return "next";
}

function getOpportunityDetail(connector: ConnectorSource | undefined, opportunities: Opportunity[]) {
  const importedCount = opportunities.filter((opportunity) => opportunity.sourceId === TENDER_BOARD_IDS.austender).length;
  if (importedCount > 0) {
    return `${importedCount} AusTender notices are in the workspace.`;
  }
  if (connector?.status === "live") {
    return "AusTender is connected. Sync again to refresh the current ATM list.";
  }
  return "Import a limited set of live AusTender notices from the official RSS feed.";
}

export function getSetupPillarStatuses(options: {
  connectors: ConnectorSource[];
  organisations: Organisation[];
  opportunities: Opportunity[];
  linkedInConnected?: boolean;
}) {
  const connectorMap = getCoreConnectorMap(options.connectors);
  const bidderOrganisation = options.organisations[0];

  return SETUP_PILLARS.map((pillar) => {
    if (pillar.id === "reach") {
      const identityConnector = connectorMap.get(CONNECTOR_IDS.linkedin);
      const companyAdminConnector = connectorMap.get(CONNECTOR_IDS.linkedinCompanyAdmin);
      const companyAdminCount = getLinkedInCompanyAdminCount(companyAdminConnector);
      const companyAdminWarning = getLinkedInCompanyAdminWarning(companyAdminConnector);
      const identityConnected =
        options.linkedInConnected || identityConnector?.status === "live" || false;
      const status =
        companyAdminCount > 0 ? "ready" : identityConnected || companyAdminConnector?.status === "live" ? "in-progress" : "next";

      return {
        ...pillar,
        connector: companyAdminConnector ?? identityConnector,
        status,
        detail:
          status === "ready"
            ? `${companyAdminCount} LinkedIn company page${companyAdminCount === 1 ? "" : "s"} ${companyAdminCount === 1 ? "is" : "are"} authorised for role-aware company data.`
            : status === "in-progress"
              ? companyAdminWarning
                ? companyAdminWarning
                : identityConnected
                  ? "LinkedIn sign-in is connected. Authorise company-page access next if the user is an admin, analyst, or content admin for their company page."
                  : "LinkedIn company-page auth was attempted, but BidBlender still needs the user identity connected."
              : "Connect LinkedIn sign-in first, then authorise company-page access if the user administers a company page.",
      } satisfies SetupPillarStatus;
    }

    if (pillar.id === "history") {
      const connector = connectorMap.get(CONNECTOR_IDS.hubspot);
      return {
        ...pillar,
        connector,
        status: getHubSpotStatus(connector),
        detail: getHubSpotDetail(connector),
      } satisfies SetupPillarStatus;
    }

    if (pillar.id === "capability") {
      const status = hasUsefulOrganisationProfile(bidderOrganisation)
        ? "ready"
        : hasPartialOrganisationProfile(bidderOrganisation)
          ? "in-progress"
          : "next";

      return {
        ...pillar,
        status,
        detail:
          status === "ready"
            ? "Organisation profile contains capability evidence for matching and qualification."
            : status === "in-progress"
              ? "Organisation basics exist, but capability evidence still needs to be curated."
              : "Capture capabilities, certifications, case studies, and focus areas in the organisation profile.",
      } satisfies SetupPillarStatus;
    }

    const connector = connectorMap.get(CONNECTOR_IDS.austender);
    return {
      ...pillar,
      connector,
      status: getOpportunityStatus(connector, options.opportunities),
      detail: getOpportunityDetail(connector, options.opportunities),
    } satisfies SetupPillarStatus;
  });
}

export function countReadyPillars(statuses: SetupPillarStatus[]) {
  return statuses.filter((status) => status.status === "ready").length;
}

export function getIncompletePillars(statuses: SetupPillarStatus[]) {
  return statuses.filter((status) => status.status !== "ready");
}

export function findPillarStatus(statuses: SetupPillarStatus[], pillarId: SetupPillarId) {
  return statuses.find((status) => status.id === pillarId);
}
