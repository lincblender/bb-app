# Split Migration Checklist

**Purpose**: Practical checklist for splitting marketing (bidblender.com) from app (bidblender.io). Separates **systematic** (code/config) work from **manual** (platform/DNS) actions you must take.

---

## Summary: What You Need to Do vs What Can Be Done Systematically

| Area | Systematic (code/config) | Manual (you) |
|------|--------------------------|--------------|
| **DNS / Route53** | — | Add domains, configure redirects, point to Vercel |
| **GitHub** | — | Create repos, connect to Vercel, lock current repo |
| **Vercel** | — | Create projects, add domains, migrate env vars, terminate old |
| **Supabase Auth** | — | Update Site URL, Redirect URLs, LinkedIn OIDC |
| **Local directories** | — | Create `bidblender-marketing/`, `bidblender-app/` |
| **Code extraction** | ✅ | — |
| **Path simplification** | ✅ | — |
| **Marketing CTAs** | ✅ | — |
| **Redirects (old URLs)** | ✅ | — |

---

## Phase A: Preparation (manual)

### 1. Route53 / DNS

- [ ] Ensure bidblender.com is in Route53 (or transfer)
- [ ] Ensure bidblender.io is in Route53
- [ ] Plan redirects:
  - bidblender.com.au → bidblender.com (301)
  - console.bidblender.com.au → bidblender.io (301)
- [ ] *Do not change DNS yet* — wait until new Vercel projects are deployed and verified

### 2. GitHub

- [ ] Create `bidblender-marketing` repo (or your preferred name)
- [ ] Create `bidblender-app` repo
- [ ] Decide: monorepo with `apps/marketing` + `apps/app`, or two separate repos. Plan assumes **two separate repos** for clean separation.

### 3. Vercel

- [ ] Create new project for marketing site
- [ ] Create new project for app (or repurpose existing)
- [ ] Add bidblender.com to marketing project
- [ ] Add bidblender.io to app project
- [ ] Copy env vars from current project to each new project as needed

### 4. Local directories

- [ ] `mkdir -p ~/Dev-Work/bidblender-marketing`
- [ ] `mkdir -p ~/Dev-Work/bidblender-app`
- [ ] Clone or initialise repos in these directories

---

## Phase B: Code extraction (systematic)

### 5. Extract marketing repo

**Can be done systematically** (script or manual copy):

- [ ] Copy marketing routes: `/`, `/platform`, `/pricing`, `/integrations/*`, `/resources/*`, `/for-*`, etc.
- [ ] Copy `components/marketing/*`, `lib/marketing/*`
- [ ] Copy `MarketingLayout`, marketing-specific providers
- [ ] Update all CTAs: "Sign up" → `https://bidblender.io/auth/signup`, "Sign in" → `https://bidblender.io/auth/signin`
- [ ] Remove app routes, `app/console/*`, `app/auth/*`, app API routes
- [ ] Minimal `package.json`, `next.config.ts` for marketing-only build
- [ ] Deploy to marketing Vercel project, verify at preview URL

### 6. Extract app repo

**Can be done systematically**:

- [ ] Copy `app/auth/*`, `app/console/*`, `app/api/*`
- [ ] Copy `components/demo/*`, `components/console/*`, `components/ui/*`
- [ ] Copy `lib/ai`, `lib/connectors`, `lib/chat`, `lib/auth`, `lib/supabase`, etc.
- [ ] Remove marketing routes and components
- [ ] Apply path simplification (Phase C)
- [ ] Deploy to app Vercel project, verify at preview URL

---

## Phase C: Path simplification (systematic)

**In app repo only.** Replace `/console/` prefix with direct paths:

| Find | Replace |
|------|---------|
| `/console/dashboard` | `/dashboard` |
| `/console/opportunities` | `/opportunities` |
| `/console/organisation` | `/organisation` |
| `/console/network` | `/network` |
| `/console/matrix` | `/matrix` |
| `/console/connectors` | `/connectors` |
| `/console/settings` | `/settings` |
| `/console/strategy` | `/strategy` |
| `/console/get-started` | `/get-started` |

- [ ] Move `app/console/dashboard` → `app/dashboard`
- [ ] Move `app/console/opportunities` → `app/opportunities`, etc.
- [ ] Update all internal links, `router.push`, `href`, `redirectTo`, `next` params
- [ ] Add redirects in `next.config.ts` for `/console/*` → `/*` (for bookmarks)
- [ ] Update Supabase proxy / middleware for new paths
- [ ] Update `lib/auth/post-auth.ts`, signin/signup redirects

**Files to update** (representative): `lib/auth/post-auth.ts`, `lib/chat/sidebar-surfaces.ts`, `app/auth/signin/page.tsx`, `app/auth/signup/page.tsx`, `app/auth/callback/route.ts`, `lib/supabase/proxy.ts`, `components/demo/*`, `lib/connectors/catalog.ts`, `lib/chat/onboarding.ts`, `next.config.ts`, and ~20+ other references.

---

## Phase D: Auth & platform config (manual)

### 7. Supabase Auth

- [ ] Site URL: `https://bidblender.io`
- [ ] Redirect URLs: `https://bidblender.io/auth/callback`
- [ ] Update LinkedIn OIDC redirect URLs for bidblender.io
- [ ] Update HubSpot OAuth redirect URLs if used

### 8. DNS cutover

- [ ] Point bidblender.com to marketing Vercel
- [ ] Point bidblender.io to app Vercel
- [ ] Configure bidblender.com.au → bidblender.com redirect
- [ ] Configure console.bidblender.com.au → bidblender.io redirect
- [ ] Verify SSL, auth flow, and redirects

---

## Phase E: Cleanup (manual)

### 9. Lock and terminate

- [ ] Lock current BidBlender repo (read-only or archive)
- [ ] Terminate the current Vercel project serving both app and marketing
- [ ] Remove old domains from deprecated project

---

## Rollback

- Keep the current deployment live until both new projects are verified.
- DNS redirects can be reverted quickly if issues arise.
- Do not delete the current repo or Vercel project until the new setup has been stable for at least a few days.

---

## Document index

- [DOMAIN_PLAN.md](./DOMAIN_PLAN.md) — Domain architecture and migration steps
- [APP_BREAKAWAY.md](./APP_BREAKAWAY.md) — App vs marketing split, path simplification, effort
