# BidBlender Sync Plan

Pivot from seed data to real data, with full mirroring between Supabase (PostgreSQL) and SQLite. SQLite elevates offline reliability—not full offline support (AI dependency limits that), but enough to make cached data useful when connectivity is flaky.

**Conflict resolution:** Last-edit-wins. Users understand offline has drawbacks; we don't overthink it.

---

## 1. Architecture overview

### Data flow

```
                    ┌─────────────────┐
                    │   Supabase       │
                    │   (PostgreSQL)   │  ← Source of truth for multi-device
                    │   Cloud          │
                    └────────┬─────────┘
                             │
                    sync (bidirectional)
                             │
                    ┌────────▼─────────┐
                    │   SQLite         │
                    │   (local)        │  ← Local cache, offline resilience
                    │   .data/         │
                    └─────────────────┘
```

- **Supabase** = canonical for multi-device, auth, and anything that needs to work across sessions.
- **SQLite** = local cache on the server (or future: client via sql.js). Enables read-from-local when Supabase is unreachable, and write-queue when offline.

### Where SQLite lives today

- **Server-side** (Node, `better-sqlite3`): `.data/bidblender.db` on the Next.js server.
- **Offline scope:** When the *server* can't reach Supabase (e.g. deployment in air-gapped env, or Supabase outage), the app can still serve from SQLite. True *client* offline (e.g. user on a train) would require client-side storage (IndexedDB or sql.js)—see Phase 4.

---

## 2. Pivot from seed to real data

### Phase 1: Wire app to databases (remove seed)

| Step | Action |
|------|--------|
| 1.1 | Add API routes that use repositories: `/api/opportunities`, `/api/organisations`, `/api/people`, etc. |
| 1.2 | Add `USE_SQLITE` env: when true, API routes read/write SQLite; when false, use Supabase. |
| 1.3 | Update `DemoDataContext` to fetch from API routes instead of Supabase directly. |
| 1.4 | Update `server-fetch.ts` (AI chat) to use repositories when `USE_SQLITE` is set. |
| 1.5 | Remove or gate `lib/demo-data/seed.ts` usage; replace with empty-state UI when no data. |
| 1.6 | Seed script: `npm run db:seed` populates SQLite; `npm run db:seed:supabase` populates Supabase. Both remain for dev/demo. |

**Outcome:** App reads/writes from either Supabase or SQLite based on config. No more hardcoded seed in the app.

### Phase 2: Dual-write (Supabase + SQLite)

When both are configured, every write goes to both:

| Step | Action |
|------|--------|
| 2.1 | Introduce a `DataLayer` abstraction: `writeOpportunity()`, `writeOrganisation()`, etc. |
| 2.2 | `DataLayer` writes to Supabase first; on success, writes to SQLite. If Supabase fails, write to SQLite only and queue for later sync. |
| 2.3 | Reads: try Supabase first; on failure (network, timeout), fall back to SQLite. |
| 2.4 | Ensure all write paths go through `DataLayer` (API routes, server-fetch, etc.). |

**Outcome:** Data is written to both stores when online. Offline writes land in SQLite and are synced later.

### Phase 3: Bidirectional sync with last-edit-wins

| Step | Action |
|------|--------|
| 3.1 | **Sync trigger:** On app load (or periodically), run sync. Also run after any write. |
| 3.2 | **Sync direction:** Pull from Supabase → SQLite, then push SQLite → Supabase. Or run both in parallel and merge. |
| 3.3 | **Conflict resolution:** For each row, compare `updated_at`. Newer wins. If equal, keep Supabase (or arbitrary—doesn't matter). |
| 3.4 | **Tables to sync:** All tables with `updated_at`: tenants, organisations, people, opportunities, opportunity_assessments, relationship_signals, complexity_signals, connector_sources, tender_boards, user_settings, chats, chat_messages. |
| 3.5 | **Append-only tables:** `intelligence_events` has no `updated_at`. Sync by appending new rows (no conflict—events are immutable). |
| 3.6 | **Deletes:** Track soft-deletes or use a `deleted_at` column if needed. For now, hard deletes: if row exists in A but not B, insert into B. If row deleted in A, delete from B. Last-delete-wins can be inferred from a `deleted_at` timestamp if we add it. Simpler: treat delete as a write with a tombstone, or accept that deletes may not sync perfectly in v1. |

**Sync algorithm (per table):**

```
for each table T:
  local = SELECT * FROM sqlite.T
  remote = SELECT * FROM supabase.T (for tenant)
  
  for each row in remote:
    if row not in local OR remote.updated_at > local.updated_at:
      UPSERT into sqlite.T
      
  for each row in local:
    if row not in remote OR local.updated_at > remote.updated_at:
      UPSERT into supabase.T
```

**Outcome:** Supabase and SQLite stay in sync. Conflicts resolved by `updated_at`. User edits offline on device A, edits live on device B—when they sync, latest timestamp wins.

### Phase 4: Client-side offline (future)

For true offline in the browser (user on train, no network):

| Step | Action |
|------|--------|
| 4.1 | Add sql.js (SQLite in WebAssembly) or IndexedDB as client-side store. |
| 4.2 | Service worker + Cache API for app shell (PWA). |
| 4.3 | Sync client ↔ Supabase when online. Last-edit-wins. |
| 4.4 | AI features: disabled or queued when offline; run when back online. |

**Scope:** Lower priority. Server-side SQLite + sync covers "Supabase down" and "deployment without cloud" scenarios first.

---

## 3. Conflict resolution: last-edit-wins

### Rule

For any row, the version with the **later `updated_at`** wins. No merge, no field-level resolution.

### Edge cases

| Case | Handling |
|------|----------|
| Same `updated_at` | Keep Supabase version (arbitrary; rare). |
| Row in A, not in B | Insert into B. |
| Row deleted in A | Delete from B. (Requires delete tracking—see §3.6 above.) |
| Clock skew | Use server timestamps where possible. Client timestamps are best-effort. |

### User messaging

- "Offline changes sync when you're back online. If you edited the same item on another device, the most recent edit wins."
- No need to surface conflicts to the user. Just apply the rule.

---

## 4. What works offline vs what doesn't

| Capability | Offline | Notes |
|------------|---------|-------|
| View opportunities, orgs, people | ✅ | From SQLite cache |
| Edit opportunity status, notes | ✅ | Writes to SQLite; syncs when online |
| View network, matrix | ✅ | From cached data |
| AI chat, analysis | ❌ | Requires API; queue or disable |
| Connector sync (LinkedIn, etc.) | ❌ | Requires external APIs |
| Auth (sign in, session refresh) | ❌ | Requires Supabase Auth |
| Real-time collaboration | ❌ | Requires live connection |

**Messaging:** "You can browse and edit your data offline. AI features and connector updates need a connection."

---

## 5. Implementation checklist

### Phase 1: Wire to DB (remove seed)

- [x] Create API endpoint using repositories
- [x] Add `USE_SQLITE` env; fallback triggered via API branching
- [x] Update WorkspaceDataContext to fetch from unified workspace endpoint
- [x] Integrate repositories with SQLite backend
- [x] Remove seed.ts usage from components
- [x] Add empty-state UI for opportunities, network, matrix
- [x] Update ROADMAP §2 and §4

### Phase 2: Dual-write

- [ ] Create DataLayer (or sync service) with writeOpportunity, writeOrganisation, etc.
- [ ] Dual-write: Supabase + SQLite on every write
- [ ] Read fallback: Supabase → SQLite on failure
- [ ] Add write methods to repositories (currently read-only for most)

### Phase 3: Sync

- [ ] Implement sync job: pull Supabase → SQLite, push SQLite → Supabase
- [ ] Last-edit-wins per row using updated_at
- [ ] Trigger sync on app load and after writes
- [ ] Handle intelligence_events (append-only)
- [ ] Document delete sync strategy (tombstones or accept v1 gaps)

### Phase 4: Client offline (future)

- [ ] Evaluate sql.js vs IndexedDB
- [ ] PWA + service worker
- [ ] Client ↔ Supabase sync

---

## 6. Repository write methods

Repositories currently have reads only. Add:

- `upsertOpportunity()`, `upsertOrganisation()`, `upsertPerson()`, etc.
- `deleteOpportunity()`, etc. (if we support deletes)
- Ensure `updated_at` is set on every write (e.g. `datetime('now')` in SQLite, `NOW()` in Postgres).

---

## 7. Environment and config

| Env | Purpose |
|-----|---------|
| `USE_SQLITE` | When true, use SQLite for data (dev, offline-first deployment). When false, use Supabase only. |
| `SQLITE_DB_PATH` | Path to SQLite file. Default: `.data/bidblender.db` |
| `SUPABASE_*` | Required when Supabase is the primary or sync target. |

**Modes:**

1. **Supabase only:** `USE_SQLITE=false` or unset. Current production behaviour.
2. **SQLite only:** `USE_SQLITE=true`, no Supabase. Local/dev or air-gapped.
3. **Dual + sync:** Both configured. Writes go to both; sync job keeps them aligned.

---

*Last updated: 09/Mar/2026*
