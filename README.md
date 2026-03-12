# bb-app

BidBlender **app** — bidblender.io.

## Overview

Authenticated app: sign-in, dashboard, opportunities, connectors, organisation profile, network, matrix, strategy. Root `/` redirects to `/auth/signin`.

## Run

```bash
npm install
npm run dev
```

Requires `.env.local` with Supabase and OpenAI keys (see [docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md)).

## Build

```bash
npm run build
npm start
```

## Doc split

Docs live in `docs/`. See [docs/README.md](./docs/README.md) for the index.

## Push to GitHub

From this directory, using the **lincblender** account:

```bash
git add . && git commit -m "Initial split from BidBlender"   # if uncommitted
gh auth login   # if not already logged in as lincblender
gh repo create lincblender/bb-app --public --source=. --remote=origin --push
```

If the repo already exists:

```bash
git remote add origin https://github.com/lincblender/bb-app.git
git push -u origin main
```

## Related

- **bb-web** — Marketing site (bidblender.com)
- **BidBlender** — Original monolith (frozen)
