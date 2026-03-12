import type { SupabaseClient, User } from "@supabase/supabase-js";
import { resolveCurrentTenantId } from "@/lib/auth/post-auth";
import { getCoreConnectorDefinition } from "@/lib/connectors/catalog";
import { createClient } from "@/lib/supabase/server";

type JsonRecord = Record<string, unknown>;

interface ConnectorUpsertInput {
  id: string;
  type?: string;
  name?: string;
  status?: "live" | "mock" | "manual" | "disconnected";
  sourceType?: string;
  contribution?: string;
  config?: JsonRecord;
}

interface TenderBoardUpsertInput {
  id: string;
  name: string;
  description: string;
  region?: string;
}

interface IntelligenceEventInput {
  type: string;
  description: string;
  opportunityId?: string;
  organisationId?: string;
}

export async function getAuthenticatedTenantContext(): Promise<{
  supabase: SupabaseClient;
  user: User;
  tenantId: string;
} | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  return {
    supabase,
    user,
    tenantId: await resolveCurrentTenantId(supabase, user),
  };
}

export function parseJsonRecord(value: unknown): JsonRecord {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as JsonRecord;
  }

  if (typeof value === "string" && value.trim().length > 0) {
    try {
      const parsed = JSON.parse(value) as unknown;
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed as JsonRecord;
      }
    } catch {
      return {};
    }
  }

  return {};
}

export async function upsertConnectorSource(
  supabase: SupabaseClient,
  tenantId: string,
  input: ConnectorUpsertInput
) {
  const catalogConnector = getCoreConnectorDefinition(input.id);
  const { data: existing, error: existingError } = await supabase
    .from("connector_sources")
    .select("name, status, source_type, contribution, config")
    .eq("tenant_id", tenantId)
    .eq("id", input.id)
    .maybeSingle();

  if (existingError) {
    throw existingError;
  }

  const mergedConfig = {
    ...parseJsonRecord(existing?.config),
    ...(catalogConnector?.config ?? {}),
    ...(input.config ?? {}),
  };

  const { error } = await supabase.from("connector_sources").upsert(
    {
      id: input.id,
      tenant_id: tenantId,
      type: input.type ?? catalogConnector?.sourceType ?? input.sourceType ?? "external",
      name: input.name ?? catalogConnector?.name ?? existing?.name ?? input.id,
      status: input.status ?? catalogConnector?.status ?? existing?.status ?? "disconnected",
      source_type:
        input.sourceType ?? catalogConnector?.sourceType ?? existing?.source_type ?? "external",
      contribution:
        input.contribution ??
        catalogConnector?.contribution ??
        existing?.contribution ??
        null,
      config: mergedConfig,
    },
    { onConflict: "id" }
  );

  if (error) {
    throw error;
  }
}

export async function upsertTenderBoard(
  supabase: SupabaseClient,
  tenantId: string,
  board: TenderBoardUpsertInput
) {
  const { error } = await supabase.from("tender_boards").upsert(
    {
      id: board.id,
      tenant_id: tenantId,
      name: board.name,
      description: board.description,
      region: board.region ?? null,
    },
    { onConflict: "id" }
  );

  if (error) {
    throw error;
  }
}

export async function createIntelligenceEvent(
  supabase: SupabaseClient,
  tenantId: string,
  event: IntelligenceEventInput
) {
  const { error } = await supabase.from("intelligence_events").insert({
    id: `event-${crypto.randomUUID()}`,
    tenant_id: tenantId,
    type: event.type,
    description: event.description,
    opportunity_id: event.opportunityId ?? null,
    organisation_id: event.organisationId ?? null,
  });

  if (error) {
    throw error;
  }
}
