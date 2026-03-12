/**
 * POST /api/mcp/connect
 * Connects to an MCP server and returns server info + available tools.
 * Body: McpServerConfig
 */

import { NextResponse } from "next/server";
import { connectMcpServer } from "@/lib/mcp/client";
import type { McpServerConfig } from "@/lib/mcp/types";

export const dynamic = "force-dynamic";

function parseConfig(body: unknown): McpServerConfig | null {
  if (!body || typeof body !== "object") return null;
  const b = body as Record<string, unknown>;
  if (
    typeof b.id !== "string" ||
    typeof b.name !== "string" ||
    typeof b.url !== "string" ||
    b.transport !== "streamable-http"
  ) {
    return null;
  }
  const config: McpServerConfig = {
    id: b.id,
    name: b.name,
    url: b.url,
    transport: "streamable-http",
  };
  if (b.auth && typeof b.auth === "object") {
    const auth = b.auth as Record<string, unknown>;
    if (auth.type === "bearer" && typeof auth.token === "string") {
      config.auth = { type: "bearer", token: auth.token };
    }
  }
  return config;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const config = parseConfig(body);
    if (!config) {
      return NextResponse.json(
        { error: "Invalid MCP server config: id, name, url, transport required" },
        { status: 400 }
      );
    }

    const result = await connectMcpServer(config);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "MCP connect failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
