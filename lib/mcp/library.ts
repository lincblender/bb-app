/**
 * Curated library of MCP integrations.
 * Status: 'available' = can connect now; 'coming-soon' = planned.
 */

export type McpLibraryStatus = "available" | "coming-soon";

export interface McpLibraryEntry {
  id: string;
  name: string;
  description: string;
  /** URL for Streamable HTTP endpoint. Omit for coming-soon. */
  url?: string;
  status: McpLibraryStatus;
  /** Optional: requires API key / bearer token */
  requiresAuth?: boolean;
}

export const mcpLibrary: McpLibraryEntry[] = [
  {
    id: "mcp-local-demo",
    name: "Local test server",
    description: "MCP SDK example server — greet, multi-greet, prompts, resources. Run locally for testing.",
    url: "http://localhost:3000/mcp",
    status: "available",
    requiresAuth: false,
  },
  {
    id: "mcp-filesystem",
    name: "Filesystem",
    description: "Read and search local files. Useful for document analysis and RFP context.",
    status: "coming-soon",
    requiresAuth: false,
  },
  {
    id: "mcp-github",
    name: "GitHub",
    description: "Repository access, issues, PRs. Track bid-related repos and documentation.",
    status: "coming-soon",
    requiresAuth: true,
  },
  {
    id: "mcp-slack",
    name: "Slack",
    description: "Search channels and messages. Surface team discussions about opportunities.",
    status: "coming-soon",
    requiresAuth: true,
  },
  {
    id: "mcp-google-drive",
    name: "Google Drive",
    description: "Search and read documents. Access past proposals and bid collateral.",
    status: "coming-soon",
    requiresAuth: true,
  },
  {
    id: "mcp-notion",
    name: "Notion",
    description: "Query workspaces and pages. Pull knowledge base and playbook content.",
    status: "coming-soon",
    requiresAuth: true,
  },
  {
    id: "mcp-hubspot",
    name: "HubSpot",
    description:
      "Selective CRM history via HubSpot MCP. Captures recent deal, company, and contact context without mirroring the CRM.",
    url: "https://mcp.hubspot.com",
    status: "available",
    requiresAuth: true,
  },
  {
    id: "mcp-custom",
    name: "Custom URL",
    description: "Connect any Streamable HTTP MCP server by URL.",
    status: "available",
    requiresAuth: false,
  },
  {
    id: "mcp-jira",
    name: "Atlassian Jira",
    description: "Read delivery timelines, active epics, and autonomously push delivery tasks based on won bids.",
    url: "https://mcp.atlassian.com/jira",
    status: "available",
    requiresAuth: true,
  },
  {
    id: "mcp-postgres",
    name: "PostgreSQL Database",
    description: "Execute read-only and write-back actions against local SQL databases containing proprietary pricing logic.",
    url: "https://mcp.local/postgres",
    status: "available",
    requiresAuth: true,
  },
];
