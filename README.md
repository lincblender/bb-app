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

## Related

- **bb-web** — Marketing site (bidblender.com)
- **BidBlender** — Original monolith (frozen)
