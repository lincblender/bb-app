import { createClient } from "@/lib/supabase/server";
import { getSqliteDb } from "./sqlite";

const SYNC_TABLES_WITH_UPDATED_AT = [
  "organisations",
  "people",
  "opportunities",
  "opportunity_assessments",
  "relationship_signals",
  "complexity_signals",
  "connector_sources",
  "tender_boards",
  "chats"
];

const APPEND_ONLY_TABLES = [
  "intelligence_events",
  "chat_messages"
];

function isNewer(date1: string | null | undefined, date2: string | null | undefined): boolean {
  if (!date1) return false;
  if (!date2) return true;
  return new Date(date1).getTime() > new Date(date2).getTime();
}

/**
 * Bidirectional sync between Supabase and local SQLite.
 * Uses last-edit-wins conflict resolution based on `updated_at`.
 */
export async function syncTenantData(tenantId: string) {
  // If we are strictly in offline mode without Supabase config, we cannot sync.
  if (process.env.USE_SQLITE === "true" && !process.env.NEXT_PUBLIC_SUPABASE_URL) {
    console.warn("Skipping sync: Supabase is not configured.");
    return;
  }

  const supabase = await createClient();
  const sqlite = getSqliteDb();

  // 1. Sync tables with updated_at (Bidirectional last-edit-wins)
  for (const table of SYNC_TABLES_WITH_UPDATED_AT) {
    try {
      // 1a. Fetch remote
      const { data: remoteData, error } = await supabase
        .from(table)
        .select("*")
        .eq("tenant_id", tenantId);

      if (error) {
        console.error(`Sync error: Failed to fetch remote for ${table}`, error);
        continue;
      }

      // 1b. Fetch local
      // Note: Some tables like opportunity_assessments don't have tenant_id directly,
      // they have opportunity_id. But our schema mapping for SQLite says:
      // Oh wait, opportunity_assessments doesn't have tenant_id!
      // Let's refine the queries based on the table structure.
      
      let localData: Record<string, unknown>[] = [];
      if (table === "opportunity_assessments") {
        localData = sqlite.prepare(`
          SELECT oa.* FROM opportunity_assessments oa
          JOIN opportunities o ON o.id = oa.opportunity_id
          WHERE o.tenant_id = ?
        `).all(tenantId) as Record<string, unknown>[];
      } else {
        localData = sqlite.prepare(`SELECT * FROM ${table} WHERE tenant_id = ?`).all(tenantId) as Record<string, unknown>[];
      }

      const remoteById = new Map((remoteData ?? []).map(r => [r.opportunity_id || r.id, r]));
      const localById = new Map(localData.map(l => [l.opportunity_id || l.id, l]));

      const toUpsertLocal: Record<string, unknown>[] = [];
      const toUpsertRemote: Record<string, unknown>[] = [];

      // Compare remote -> local
      for (const remote of (remoteData ?? [])) {
        const id = (remote.opportunity_id || remote.id) as string;
        const local = localById.get(id);
        if (!local || isNewer(remote.updated_at as string, local.updated_at as string)) {
          toUpsertLocal.push(remote);
        }
      }

      // Compare local -> remote
      for (const local of localData) {
        const id = (local.opportunity_id || local.id) as string;
        const remote = remoteById.get(id);
        if (!remote || isNewer(local.updated_at as string, remote.updated_at as string)) {
          toUpsertRemote.push(local);
        }
      }

      // Execute SQLite Upserts
      if (toUpsertLocal.length > 0) {
        const columns = Object.keys(toUpsertLocal[0]);
        const placeholders = columns.map(() => "?").join(", ");
        const insertStmt = sqlite.prepare(`INSERT OR REPLACE INTO ${table} (${columns.join(", ")}) VALUES (${placeholders})`);
        
        const transaction = sqlite.transaction((rows: Record<string, unknown>[]) => {
          for (const row of rows) {
            insertStmt.run(columns.map(c => row[c] === undefined ? null : row[c]));
          }
        });
        transaction(toUpsertLocal);
      }

      // Execute Supabase Upserts
      if (toUpsertRemote.length > 0) {
        // Prepare payloads for Supabase by ensuring arrays/objects stored as JSON strings in SQLite are parsed if necessary,
        // Actually, Supabase handles JS objects, but SQLite returned them as JSON strings.
        // We will need to blindly send them to Supabase, but Supabase might reject stringified JSON for JSONB columns if we don't parse them.
        
        const mappedForSupabase = toUpsertRemote.map(row => {
          const mapped = { ...row };
          // parse known JSON columns
          for (const key of ['subsidiaries', 'acquisition_history', 'social_profiles', 'capabilities', 'certifications', 'individual_qualifications', 'case_studies', 'sectors', 'strategic_preferences', 'target_markets', 'partner_gaps', 'department_concentration', 'tags', 'blocks', 'attachments', 'config']) {
            if (typeof mapped[key] === 'string') {
              try {
                mapped[key] = JSON.parse(mapped[key] as string);
              } catch {
                // Ignore parsing errors and keep as string
              }
            }
          }
          return mapped;
        });

        const idCol = table === "opportunity_assessments" ? "opportunity_id" : "id";
        const { error: upsertErr } = await supabase.from(table).upsert(mappedForSupabase, { onConflict: idCol });
        if (upsertErr) {
          console.error(`Sync error: Failed to upsert remote for ${table}`, upsertErr);
        }
      }

    } catch (err) {
      console.error(`Sync error: Table ${table} sync failed`, err);
    }
  }

  // 2. Sync append-only tables
  for (const table of APPEND_ONLY_TABLES) {
    try {
      let remoteData: Record<string, unknown>[] = [];
      let localData: Record<string, unknown>[] = [];

      if (table === "chat_messages") {
        const { data } = await supabase.from(table).select("*, chats!inner(tenant_id)").eq("chats.tenant_id", tenantId);
        remoteData = data ?? [];
        localData = sqlite.prepare(`
          SELECT cm.* FROM chat_messages cm
          JOIN chats c ON c.id = cm.chat_id
          WHERE c.tenant_id = ?
        `).all(tenantId) as Record<string, unknown>[];
      } else {
        const { data } = await supabase.from(table).select("*").eq("tenant_id", tenantId);
        remoteData = data ?? [];
        localData = sqlite.prepare(`SELECT * FROM ${table} WHERE tenant_id = ?`).all(tenantId) as Record<string, unknown>[];
      }

      const remoteIds = new Set(remoteData.map(r => r.id as string));
      const localIds = new Set(localData.map(l => l.id as string));

      const toInsertLocal = remoteData.filter(r => !localIds.has(r.id as string));
      const toInsertRemote = localData.filter(l => !remoteIds.has(l.id as string));

      if (toInsertLocal.length > 0) {
        // Strip the extra joined columns from supabase before inserting
        const cleanedLocal = toInsertLocal.map(row => {
          const r = { ...row };
          delete r.chats;
          return r;
        });
        
        const columns = Object.keys(cleanedLocal[0]);
        const placeholders = columns.map(() => "?").join(", ");
        const insertStmt = sqlite.prepare(`INSERT OR IGNORE INTO ${table} (${columns.join(", ")}) VALUES (${placeholders})`);
        
        const transaction = sqlite.transaction((rows: Record<string, unknown>[]) => {
          for (const row of rows) {
            insertStmt.run(columns.map(c => row[c] === undefined ? null : row[c]));
          }
        });
        transaction(cleanedLocal);
      }

      if (toInsertRemote.length > 0) {
        const mappedForSupabase = toInsertRemote.map(row => {
          const mapped = { ...row };
          for (const key of ['blocks', 'attachments']) {
            if (typeof mapped[key] === 'string') {
              try {
                mapped[key] = JSON.parse(mapped[key] as string);
              } catch {
                // Ignore
              }
            }
          }
          return mapped;
        });

        const { error: insertErr } = await supabase.from(table).insert(mappedForSupabase);
        if (insertErr) {
          console.error(`Sync error: Failed to insert remote for ${table}`, insertErr);
        }
      }

    } catch (err) {
      console.error(`Sync error: Table ${table} sync failed`, err);
    }
  }
}
