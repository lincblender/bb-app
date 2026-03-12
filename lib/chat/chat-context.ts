/**
 * Chat mode and screen context for contextual AI responses.
 * Used when the chat bar is invoked from non-dashboard pages.
 */

export type ChatMode = "dashboard" | "contextual" | "system";

export interface ScreenContext {
  pathname: string;
  mode: ChatMode;
  opportunityId?: string;
  /** Human-readable label for the current screen (e.g. "Opportunity Explorer", "Connectors") */
  screenLabel?: string;
}

const PATH_TO_MODE: Record<string, ChatMode> = {
  "/console/connectors": "system",
  "/console/opportunities": "contextual",
  "/console/organisation": "contextual",
  "/console/network": "contextual",
  "/console/matrix": "contextual",
  "/console/strategy": "contextual",
  "/console/settings": "contextual",
};

const PATH_TO_LABEL: Record<string, string> = {
  "/console/opportunities": "Opportunity Explorer",
  "/console/organisation": "Organisation",
  "/console/network": "Network",
  "/console/matrix": "Matrix",
  "/console/connectors": "Intelligence Sources",
  "/console/strategy": "Strategy",
  "/console/settings": "Settings",
};

export function getScreenContext(pathname: string, opportunityId?: string): ScreenContext | null {
  const basePath = pathname.replace(/\/$/, "");
  const isOppDetail = basePath.match(/^\/console\/opportunities\/([^/]+)$/);
  const mode =
    PATH_TO_MODE[basePath] ?? (isOppDetail ? "contextual" : null);
  if (!mode) return null;

  const oppId = opportunityId ?? (isOppDetail ? isOppDetail[1] : undefined);
  const screenLabel = isOppDetail ? "Opportunity detail" : PATH_TO_LABEL[basePath] ?? basePath.split("/").pop() ?? "Demo";

  return {
    pathname: basePath,
    mode,
    opportunityId: oppId,
    screenLabel,
  };
}

export function getTopBarPlaceholder(screenContext: ScreenContext | null): string {
  if (!screenContext) return "Ask about opportunities, search by name, or upload a doc to review...";
  if (screenContext.mode === "system") {
    return "Ask how to connect LinkedIn, HubSpot, or AusTender, or what each pillar needs...";
  }
  if (screenContext.opportunityId) {
    return "Ask about this opportunity...";
  }
  return `Ask about ${screenContext.screenLabel}...`;
}
