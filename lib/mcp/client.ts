/**
 * MCP client wrapper for connecting to MCP servers and calling tools.
 * Uses the SDK's StreamableHTTPClientTransport.
 */

import { Client } from "@modelcontextprotocol/sdk/client";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp";
import type { McpServerConfig, McpTool } from "./types";

function createTransport(config: McpServerConfig): StreamableHTTPClientTransport {
  const url = new URL(config.url.replace(/\/$/, ""));
  const headers: Record<string, string> = {};
  if (config.auth?.type === "bearer" && config.auth.token) {
    headers["Authorization"] = `Bearer ${config.auth.token}`;
  }
  return new StreamableHTTPClientTransport(url, {
    requestInit: Object.keys(headers).length ? { headers } : undefined,
  });
}

/**
 * Connect to an MCP server and return server info + tools.
 */
export async function connectMcpServer(config: McpServerConfig): Promise<{
  serverInfo: { name: string; version?: string };
  tools: McpTool[];
}> {
  const transport = createTransport(config);
  const client = new Client(
    { name: "bidblender", version: "0.1.0" },
    {}
  );

  await client.connect(transport);

  try {
    const [toolsResult, serverVersion] = await Promise.all([
      client.listTools().catch(() => ({ tools: [] })),
      Promise.resolve(client.getServerVersion()),
    ]);

    return {
      serverInfo: {
        name: serverVersion?.name ?? config.name,
        version: serverVersion?.version,
      },
      tools: (toolsResult.tools ?? []).map((t) => ({
        name: t.name,
        description: t.description,
        inputSchema: t.inputSchema as Record<string, unknown> | undefined,
      })),
    };
  } finally {
    await transport.close();
  }
}

/**
 * Call an MCP tool. Creates a short-lived connection.
 */
export async function callMcpTool(
  config: McpServerConfig,
  toolName: string,
  args: Record<string, unknown>
): Promise<{ content: Array<{ type: string; text?: string }> }> {
  const transport = createTransport(config);
  const client = new Client(
    { name: "bidblender", version: "0.1.0" },
    {}
  );

  await client.connect(transport);

  try {
    const result = await client.callTool({ name: toolName, arguments: args });
    const content = Array.isArray(result.content) ? result.content : [];
    return {
      content: content.map((c: { type: string; text?: string }) =>
        c.type === "text"
          ? { type: "text" as const, text: c.text ?? "" }
          : { type: c.type }
      ),
    };
  } finally {
    await transport.close();
  }
}
