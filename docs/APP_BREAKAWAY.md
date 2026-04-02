# App Breakaway

**Purpose**: Separate the BidBlender app from the marketing site. Two domains, two repos, two Vercel deployments. Clear boundary, optional shared core package.

**Phase**: 1

**Domain target**: App at **bidblender.io**, marketing at **bidblender.com**. See [DOMAIN_PLAN.md](./DOMAIN_PLAN.md).

---

## Current State

| Layer | Marketing | BidBlender App |
|-------|-----------|----------------|
| **Routes** | `/`, `/platform`, `/pricing`, `/integrations/*`, `/resources/*`, `/for-*`, etc. | `/console/*`, `/auth/*` |
| **Layout** | `MarketingLayout` (Header + Footer) | `ConsoleLayoutWrapper` (sidebar, chat, opportunity panel) |
| **Components** | `components/marketing/*` | `components/demo/*`, `components/ui/*` |
| **Content** | `lib/marketing/content/*` | N/A (app is interactive) |
| **Providers** | Minimal | `DemoDataProvider`, `ChatProvider`, `SettingsProvider` |

---

## Target State

| Layer | Marketing (bidblender.com) | App (bidblender.io) |
|-------|----------------------------|---------------------|
| **Repo** | `bidblender-marketing` | `bidblender-app` |
| **Vercel** | Separate project | Separate project |
| **Routes** | `/`, `/platform`, `/pricing`, etc. | `/auth/*`, `/dashboard`, `/opportunities`, etc. |
| **Path simplification** | N/A | `/console/*` → `/*` (no prefix; domain is app-only) |

---

## Splice Strategy

1. **Path Simplification:** We have moved `app/console` to the `app/(console)` route group. This removes the `/console` prefix from the URL entirely, running the app at the root (e.g. `/dashboard`).
2. **Link Updates:** We are systematically replacing hardcoded `href="/console/...` references to `href="/...` across the application.
3. **Marketing Separation:** Marketing pages remain at the root for now, but will eventually be moved to a marketing-specific repo or route group.

---

## Local Directory Structure (Current Strategy)

Instead of a hard monolith split into multiple root folders, we use Next.js Route Groups to manage the separation seamlessly within `bb-app`.

- `app/(console)/*` — The core application
- `app/auth/*` — Authentication
- `app/marketing/*` (Planned) — Extracted marketing pages

---

## Path Simplification (app repo)

On bidblender.io, the app is the only content. So:

| Current | Target |
|---------|--------|
| `/console/dashboard` | `/dashboard` or `/` |
| `/console/opportunities` | `/opportunities` |
| `/console/opportunities/[id]` | `/opportunities/[id]` |
| `/console/organisation` | `/organisation` |
| `/console/network` | `/network` |
| `/console/matrix` | `/matrix` |
| `/console/connectors` | `/connectors` |
| `/console/settings` | `/settings` |
| `/console/strategy` | `/strategy` |
| `/console/get-started` | `/get-started` |

**Scope:** ~40+ references across `app/`, `lib/`, `components/`. Systematic find-and-replace plus redirects for any bookmarked `/console/*` URLs.

---

## Phase 1: Extract & Deploy

1. Create `bidblender-app` repo with app-only code:
   - `app/auth/*`, `app/console/*` (moved to `app/dashboard`, `app/opportunities`, etc.)
   - `app/api/*` (app-related routes)
   - `components/demo/*`, `components/console/*`, `components/ui/*`
   - `lib/ai`, `lib/connectors`, `lib/chat`, `lib/auth`, etc.
2. Create `bidblender-marketing` repo with marketing-only code:
   - Marketing routes, `components/marketing/*`, `lib/marketing/*`
   - CTAs point to `https://bidblender.io/auth/signup`, etc.
3. Apply path simplification in app repo.
4. Deploy each to its own Vercel project.
5. Configure DNS (Route53) and redirects per [DOMAIN_PLAN.md](./DOMAIN_PLAN.md).

---

## Effort

| Task | Effort | Risk |
|------|--------|------|
| Create bb-core (optional) | 1 day | Low |
| Extract app repo | 1–2 days | Medium |
| Extract marketing repo | 0.5–1 day | Low |
| Path simplification | 0.5–1 day | Low |
| DNS, Vercel, Supabase config | 0.5 day | Low (manual) |

**Total (code)**: 2.5–4.5 days.  
**Manual (you)**: DNS, Vercel projects, GitHub repos, Supabase Auth URLs.
