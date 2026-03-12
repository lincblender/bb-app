/**
 * POST /api/mcp/call
 * Calls an MCP tool. Body: { config: McpServerConfig, toolName: string, args: Record<string, unknown> }
 */

import { NextResponse } from "next/server";
import { callMcpTool } from "@/lib/mcp/client";
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
    const config = parseConfig(body.config);
    const toolName = typeof body.toolName === "string" ? body.toolName : null;
    const args =
      body.args && typeof body.args === "object" ? (body.args as Record<string, unknown>) : {};

    if (!config || !toolName) {
      return NextResponse.json(
        { error: "Invalid request: config and toolName required" },
        { status: 400 }
      );
    }

    const result = await callMcpTool(config, toolName, args);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "MCP tool call failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
