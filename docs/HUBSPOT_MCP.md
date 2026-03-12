# HubSpot MCP Integration

BidBlender integrates with HubSpot via their **MCP (Model Context Protocol) server** for CRM data. Use the HubSpot MCP auth apps and OAuth with PKCE — not the general REST API — for this integration.

## Why HubSpot MCP?

HubSpot offers two MCP options:

1. **HubSpot MCP Server (Remote)** — Connects AI clients to your HubSpot CRM data. Supports contacts, companies, deals, tickets, tasks, notes. Uses OAuth with PKCE. This is the right choice for BidBlender.
2. **Developer MCP Server (Local)** — CLI-based, for scaffolding HubSpot apps. Not for CRM data.

For BidBlender’s **History** paradigm (past deals, contacts, win/loss), use the **remote HubSpot MCP server** at `https://mcp.hubspot.com`.

## Setup

1. **Developer program** — Sign up at [HubSpot Developers](https://developers.hubspot.com).
2. **Create an MCP auth app** — Configure OAuth with PKCE.
3. **Environment variables** (add to `.env.local` and Vercel):

   ```
   HUBSPOT_MCP_SERVER_URL=https://mcp.hubspot.com
   HUBSPOT_MCP_SERVER_TOKEN=
   HUBSPOT_APP_ID=
   HUBSPOT_CLIENT_ID=
   HUBSPOT_CLIENT_SECRET=
   HUBSPOT_REDIRECT_URI=
   HUBSPOT_PKCE_CODE_VERIFIER=
   HUBSPOT_PKCE_CODE_CHALLENGE=
   HUBSPOT_REDIRECT_URL=https://www.bidblender.com.au
   HUBSPOT_TEST_INSTALL_URL=
   ```

4. **OAuth flow** — Complete the PKCE flow to obtain an access token. The token is used when connecting to the MCP server.

## What BidBlender Uses

- **Deals** — Past wins and pipeline for technical fit and past-bid comparison.
- **Contacts & companies** — Buyer relationship context and stakeholder mapping.
- **Tasks & notes** — Activity and follow-up context.

This data powers the **History** paradigm in Connectors and feeds technical fit scoring and buyer context in the opportunity panel.
