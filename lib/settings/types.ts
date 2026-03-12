import type { McpServerConfig } from "@/lib/mcp/types";
import { CONNECTOR_IDS, TENDER_BOARD_IDS } from "@/lib/connectors/catalog";

export interface UserSettings {
  enabledTenderBoards: string[];
  enabledNetworkSources: string[];
  mcpServers: McpServerConfig[];
}

export const SETTINGS_STORAGE_KEY = "bidblender-settings";
export const LEGACY_SETTINGS_STORAGE_KEY = "bidblender-demo-settings";

export const DEFAULT_SETTINGS: UserSettings = {
  enabledTenderBoards: [TENDER_BOARD_IDS.austender],
  enabledNetworkSources: [CONNECTOR_IDS.linkedin, CONNECTOR_IDS.linkedinCompanyAdmin],
  mcpServers: [],
};
