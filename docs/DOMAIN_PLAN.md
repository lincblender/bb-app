# Domain Plan

## Current setup

- **Marketing + app:** Single Vercel deployment
- **Production URL:** `console.bidblender.com.au` (or similar)
- **Single codebase** serving both marketing and app under one domain

---

## Target setup: domain split

| Domain | Purpose | Deployment |
|--------|---------|------------|
| **bidblender.io** | App only (auth + console) | Separate Vercel project |
| **bidblender.com** | Marketing site only | Separate Vercel project |
| **bidblender.com.au** | Redirect → bidblender.com | DNS redirect |
| **console.bidblender.com.au** | Redirect → bidblender.io | DNS redirect |

### Architecture

- **Two Vercel projects** — one for marketing, one for app
- **Two repos** (or monorepo with two apps) — `bidblender-marketing`, `bidblender-app`
- **Path simplification on .io:** The app site is auth + app only, so `/console/*` can become `/*` (e.g. `/dashboard`, `/opportunities`, `/organisation`). No `/console` prefix needed when the domain is app-only.

### CTA flow

- **Marketing (bidblender.com):** "Sign up" → `https://bidblender.io/auth/signup`
- **After auth:** Redirect to `https://bidblender.io/dashboard` (or `/` if dashboard is root)
- **Marketing links to app:** All app CTAs point to bidblender.io

---

## Migration steps (when ready)

### 1. DNS & domains (Route53 — manual)

- [ ] Add bidblender.com to Route53 (or transfer if elsewhere)
- [ ] Add bidblender.io to Route53 (or verify already present)
- [ ] Configure bidblender.com.au → 301 redirect to bidblender.com
- [ ] Configure console.bidblender.com.au → 301 redirect to bidblender.io
- [ ] Point bidblender.com A/CNAME to marketing Vercel project
- [ ] Point bidblender.io A/CNAME to app Vercel project

### 2. Vercel (manual)

- [ ] Create new Vercel project for marketing site
- [ ] Create new Vercel project for app (or rename/repurpose existing)
- [ ] Add bidblender.com to marketing project
- [ ] Add bidblender.io to app project
- [ ] Configure SSL (Vercel handles automatically when domains are added)
- [ ] Migrate env vars to appropriate projects
- [ ] When migration complete: terminate the current combined deployment

### 3. Supabase Auth (manual)

- [ ] Site URL: `https://bidblender.io`
- [ ] Redirect URLs: `https://bidblender.io/auth/callback`
- [ ] Add `https://bidblender.com` to allowed origins if needed for OAuth flows
- [ ] Update LinkedIn OIDC redirect URLs for bidblender.io

### 4. GitHub (manual)

- [ ] Create `bidblender-marketing` repo (or `bidblender-com`)
- [ ] Create `bidblender-app` repo (or `bidblender-io`)
- [ ] Connect each to its Vercel project
- [ ] Lock down current repo (read-only or archive) once migration is done

### 5. Local directory structure (manual setup, then systematic migration)

- [ ] Create `~/Dev-Work/bidblender-marketing/` — clone or extract marketing
- [ ] Create `~/Dev-Work/bidblender-app/` — clone or extract app
- [ ] Lock current `BidBlender` repo (no new features) while building the split
- [ ] Migrate code, then terminate the existing combined stack

---

## No changes needed yet

- Keep current links and domain until we're ready to switch
- This doc is for planning only
- See [SPLIT_MIGRATION_CHECKLIST.md](./SPLIT_MIGRATION_CHECKLIST.md) for systematic vs manual actions
