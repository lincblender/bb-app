# BidBlender Roadmap

Tracking document for major development efforts. Updated as work progresses.

---

## 1. Mobile responsiveness

Improve the UI for mobile and tablet viewports.

- [ ] Audit current breakpoints and layout assumptions
- [ ] Fix navigation/sidebar for small screens (hamburger, collapsible)
- [ ] Ensure matrix, network, and opportunity views are usable on mobile
- [ ] Touch-friendly controls and spacing
- [ ] Test on common viewport sizes (320px, 375px, 768px, 1024px)

**Status:** Not started

---

## 2. Implement SQLite (local database)

Add SQLite for local data storage on user devices.

- [x] Choose SQLite library (better-sqlite3)
- [x] Define schema (see §3)
- [x] Create migrations/initial schema for SQLite
- [ ] Wire data layer to read/write from SQLite instead of seed
- [x] Handle server vs client: SQLite runs server-side (Node) in API routes

**Status:** In progress (client created, data layer wiring pending)

---

## 3. PostgreSQL ↔ SQLite schema mirroring

Ensure identical table structures between Supabase (PostgreSQL) and local SQLite.

- [x] Design canonical schema (tables, columns, types)
- [x] Create Supabase migrations (PostgreSQL)
- [x] Create SQLite migrations (compatible DDL)
- [x] Document type mappings (e.g. UUID, JSONB → TEXT)
- [x] Document sync strategy (see [docs/SYNC_PLAN.md](SYNC_PLAN.md))
- [ ] Implement sync (dual-write, bidirectional, last-edit-wins)
- [ ] Consider: Drizzle, Prisma, or raw SQL for cross-DB compatibility

**Status:** Schema complete; sync plan documented; implementation pending

---

## 4. Remove seed data

Replace hardcoded seed data with empty, database-backed state.

- [ ] Remove or gate `lib/demo-data/seed.ts` usage
- [ ] Add empty-state UI for opportunities, network, matrix
- [ ] Ensure app boots and navigates with no data
- [ ] Preserve demo-auth flow for development
- [ ] Update helpers to read from DB (or return empty when no DB)

**Status:** Not started

---

## 5. Onboarding & source connectors

Implement onboarding flow to add and configure intelligence sources.

**Sources to support:**
- LinkedIn
- LinkedIn Sales Navigator
- Apollo
- AusTender
- TenderLink
- illion
- Crunchbase
- (Extensible for future sources)

**Tasks:**
- [ ] Design connector model (id, type, status, config, credentials ref)
- [ ] Onboarding flow UI (wizard or stepped flow)
- [ ] Per-source configuration screens (OAuth, API keys, etc.)
- [ ] Connector status display (connected, pending, error)
- [ ] Store connector config in DB (encrypted where sensitive)
- [ ] Placeholder/mock integrations until real APIs available

**Status:** Not started

---

## 6. AI edge functions

Implement and enhance Supabase Edge Functions for AI analysis.

- [x] `run-analysis-job` – core analysis job (exists)
- [ ] Deploy and test `run-analysis-job` against live Supabase
- [ ] Add any additional edge functions (e.g. chat summarisation, document ingestion)
- [ ] Wire Next.js API routes to call Supabase Edge Functions when Supabase is configured
- [ ] Error handling, retries, rate limiting

**Status:** Partially done (run-analysis-job exists; deployment/testing pending)

**Apply Supabase migrations:**
```bash
supabase db push
```

---

## Dependency order (suggested)

```
3. Schema design (Postgres + SQLite)
     ↓
2. SQLite implementation
     ↓
4. Remove seed data (wire to DB, empty state)  ← Phase 1 of SYNC_PLAN
     ↓
   Dual-write + sync (Phase 2–3 of SYNC_PLAN)
     ↓
5. Onboarding & connectors
     ↓
6. AI edge functions (deploy, integrate)

1. Mobile responsiveness (can run in parallel)
```

---

## Notes

- **React Native fork:** Future; local SQLite + sync will support offline-first mobile.
- **Credentials:** Sensitive connector credentials should be encrypted at rest; consider Supabase Vault or similar.
- **Sync:** See [docs/SYNC_PLAN.md](SYNC_PLAN.md). Full mirror Supabase ↔ SQLite; last-edit-wins for conflicts. Phased: wire to DB → dual-write → bidirectional sync → (future) client-side offline.

---

---

## Progress log

| Date       | Completed |
|------------|-----------|
| 08/Mar/2025 | ROADMAP created; schema designed; Supabase + SQLite migrations; SQLite client + repositories; .data in gitignore |
| 08/Mar/2025 | Fixed Supabase migration (TEXT ids, no uuid-ossp); seed script for hello@bidblender.com.au; `npm run db:seed` and `db:seed:supabase` |
| 09/Mar/2026 | SYNC_PLAN.md created; pivot from seed, dual-write, bidirectional sync, last-edit-wins documented |

---

*Last updated: 09/Mar/2026*
