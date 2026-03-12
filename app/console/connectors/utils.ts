import type { SetupPillarStatus } from "@/lib/connectors/setup-status";

export function getStatusBadge(status: SetupPillarStatus["status"]) {
  if (status === "ready") return { label: "Ready", variant: "positive" as const };
  if (status === "in-progress") return { label: "In progress", variant: "warning" as const };
  return { label: "Next", variant: "neutral" as const };
}

export function getTimestampLabel(value: unknown): string | null {
  if (typeof value !== "string" || !value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toLocaleString("en-AU", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function getManagedOrganizations(value: unknown): Array<Record<string, unknown>> {
  return Array.isArray(value) ? (value as Array<Record<string, unknown>>) : [];
}

export function formatHubSpotPreviewForDisplay(preview: unknown, entity?: string): string {
  const str = typeof preview === "string" ? preview : String(preview ?? "");
  const trimmed = str.trim();
  if (trimmed.length < 50 || (!trimmed.startsWith("{") && !trimmed.startsWith("["))) {
    return str;
  }
  try {
    const parsed = JSON.parse(trimmed) as Record<string, unknown>;
    const results = Array.isArray(parsed.results) ? parsed.results : [];
    if (results.length === 0) return str;

    const first = results[0] as Record<string, unknown> | undefined;
    const hasSchemaKeys = first && ("name" in first || "label" in first) && "description" in first;

    if (hasSchemaKeys) {
      return `${results.length} company propert${results.length === 1 ? "y" : "ies"} available for sync.`;
    }

    const entityLabel = entity ?? "items";
    const items = results.slice(0, 3).map((r) => {
      const rec = r as Record<string, unknown>;
      const props = (rec.properties as Record<string, unknown>) ?? rec;
      return String(props.dealname ?? props.name ?? props.domain ?? props.company ?? "—");
    });
    return `${results.length} ${entityLabel}: ${items.join(", ")}${results.length > 3 ? "…" : ""}`;
  } catch {
    return str.length > 200 ? `${str.slice(0, 197)}…` : str;
  }
}
