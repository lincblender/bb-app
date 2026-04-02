"use client";

import { useSettingsContext } from "@/lib/settings/SettingsContext";
import { Card } from "@/components/ui/Card";
import { useWorkspaceData } from "@/lib/workspace/client";
import { mcpLibrary } from "@/lib/mcp/library";

export default function SettingsPage() {
  const {
    settings,
    toggleTenderBoard,
    toggleNetworkSource,
  } = useSettingsContext();
  const { connectorSources, tenderBoards, loading } = useWorkspaceData();
  const networkConnectors = connectorSources.filter((connector) => connector.sourceType === "network");

  return (
    <div>
      <h1 className="bb-page-title">Settings</h1>
      <p className="bb-page-subtitle">
        Configure your opportunity sources and network mapping. Queries and the agent use these settings.
      </p>

      <div className="mt-8 space-y-8">
        <Card>
          <h2 className="bb-section-title">Opportunity sources (tender boards)</h2>
          <p className="mt-1 text-sm bb-text-muted">
            Select which tender boards to scan for opportunities. The agent and opportunity explorer will only show opportunities from enabled sources.
          </p>
          <div className="mt-4 space-y-3">
            {loading && <p className="text-sm bb-text-muted">Loading tender boards…</p>}
            {!loading && tenderBoards.length === 0 && (
              <p className="text-sm bb-text-muted">No tender boards are configured for this workspace yet.</p>
            )}
            {tenderBoards.map((tb) => {
              const enabled = settings.enabledTenderBoards.includes(tb.id);
              return (
                <label
                  key={tb.id}
                  className="bb-list-item"
                >
                  <input
                    type="checkbox"
                    checked={enabled}
                    onChange={() => toggleTenderBoard(tb.id)}
                    className="bb-checkbox"
                  />
                  <div>
                    <p className="font-medium bb-text-primary">{tb.name}</p>
                    <p className="text-sm bb-text-muted">{tb.description}</p>
                    {tb.region && (
                      <p className="mt-1 text-xs text-gray-400">{tb.region}</p>
                    )}
                  </div>
                </label>
              );
            })}
          </div>
        </Card>

        <Card>
          <h2 className="bb-section-title">Network mapping</h2>
          <p className="mt-1 text-sm bb-text-muted">
            Select which sources to use for company details, relationship intelligence, and firmographics. Network strength scores and relationship insights depend on enabled sources.
          </p>
          <div className="mt-4 space-y-3">
            {loading && <p className="text-sm bb-text-muted">Loading connector sources…</p>}
            {!loading && networkConnectors.length === 0 && (
              <p className="text-sm bb-text-muted">No network connector sources are configured yet.</p>
            )}
            {networkConnectors.map((conn) => {
              const enabled = settings.enabledNetworkSources.includes(conn.id);
              return (
                <label
                  key={conn.id}
                  className="bb-list-item"
                >
                  <input
                    type="checkbox"
                    checked={enabled}
                    onChange={() => toggleNetworkSource(conn.id)}
                    className="bb-checkbox"
                  />
                  <div>
                    <p className="font-medium bb-text-primary">{conn.name}</p>
                    <p className="text-sm text-gray-500">{conn.contribution}</p>
                    <p className="mt-1 text-xs text-gray-400">
                      {conn.sourceType} · {conn.status}
                    </p>
                  </div>
                </label>
              );
            })}
          </div>
        </Card>

        <Card>
          <h2 className="bb-section-title">External Intelligence (MCP Integrations)</h2>
          <p className="mt-1 text-sm bb-text-muted">
            Connect Secure Model Context Protocol servers to smash data silos. Enable two-way writes and native read access for the intelligence engine against your private ecosystems.
          </p>
          <div className="mt-4 space-y-3">
            {mcpLibrary.map((mcp) => {
              return (
                <label key={mcp.id} className="bb-list-item opacity-80 hover:opacity-100 transition-opacity">
                  <input
                    type="checkbox"
                    className="bb-checkbox"
                    disabled={mcp.status === "coming-soon"}
                    defaultChecked={mcp.status === "available" && mcp.id === "mcp-hubspot"}
                  />
                  <div>
                    <p className="font-medium bb-text-primary">{mcp.name} {mcp.status === "coming-soon" && <span className="ml-2 text-xs text-orange-400 border border-orange-500/30 px-2 py-0.5 rounded-full">Coming Soon</span>}</p>
                    <p className="text-sm text-gray-500">{mcp.description}</p>
                    <p className="mt-1 text-xs text-gray-400">
                      Protocol: {mcp.requiresAuth ? "Secure Bearer Auth" : "Open Local"} {mcp.url && `· Endpoint: ${mcp.url}`}
                    </p>
                  </div>
                </label>
              );
            })}
          </div>
        </Card>

        <Card>
          <h2 className="bb-section-title">How this affects queries</h2>
          <ul className="mt-4 space-y-2 text-sm bb-text-muted">
            <li>
              • <strong>Opportunity sources:</strong> When you ask for &quot;latest matching bids&quot; or browse opportunities, only tenders from your selected boards are included.
            </li>
            <li>
              • <strong>Network mapping:</strong> Relationship strength, company firmographics, and organisational complexity use data from your selected network sources. LinkedIn sign-in establishes identity and LinkedIn company-page access adds role-aware company context when it is available.
            </li>
            <li>
              • Settings are saved locally and persist across sessions.
            </li>
          </ul>
        </Card>
      </div>
    </div>
  );
}
