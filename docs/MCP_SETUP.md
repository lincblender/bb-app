# MCP (Model Context Protocol) Setup

BidBlender supports connecting to MCP servers via the Streamable HTTP transport. MCP servers expose tools that the AI agent can call.

## MCP Library

The Connectors page at `/console/connectors` shows a curated library of MCP integrations:

- **Available** — Add and connect now (e.g. Local demo server, Custom URL)
- **Coming soon** — Planned integrations (Filesystem, GitHub, Slack, Google Drive, Notion)

## Adding an MCP Server

1. Go to **Console → Connectors** (`/console/connectors`)
2. In the MCP section:
   - For library entries: click **Add** (or **Added** if already connected)
   - For custom: click **Add custom**, enter URL and optional API key, then **Add**
3. Click **Connect** on a connected server to verify and list available tools

## API Endpoints

- **POST /api/mcp/connect** — Connect to a server and return tools  
  Body: `McpServerConfig` (id, name, url, transport, auth?)

- **POST /api/mcp/call** — Call an MCP tool  
  Body: `{ config: McpServerConfig, toolName: string, args: Record<string, unknown> }`

## Configuration Storage

MCP server configs are stored in `localStorage` (client-side settings). For production, consider storing configs server-side (e.g. in `user_settings` or a dedicated table) so API keys are never sent from the client.

## Running a Test MCP Server

The MCP SDK includes an example server:

```bash
cd node_modules/@modelcontextprotocol/sdk
npx tsx src/examples/server/simpleStreamableHttp.ts
```

This starts a server at `http://localhost:3000/mcp` with tools like `greet` and `multi-greet`. Add `http://localhost:3000/mcp` in Connectors to test.
