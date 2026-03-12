/**
 * MCP server configuration for connectors.
 */

export type McpAuthType = "none" | "bearer";

export interface McpServerConfig {
  id: string;
  name: string;
  url: string;
  transport: "streamable-http";
  auth?: {
    type: McpAuthType;
    /** For bearer: API key or token */
    token?: string;
  };
}

export interface McpTool {
  name: string;
  description?: string;
  inputSchema?: Record<string, unknown>;
}

export interface McpServerInfo {
  name: string;
  version?: string;
  capabilities?: Record<string, unknown>;
}
