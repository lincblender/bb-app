# BidBlender Deployment

## Next.js 16 & Turbopack

- **Next.js 16** with **Turbopack** (default for `next dev` and `next build`)
- **Node.js 20.9+** required
- For CI: persist `.next/cache` between builds for faster rebuilds (see [CI Build Caching](https://nextjs.org/docs/pages/guides/ci-build-caching))

## Production URL

- **Current:** https://console.bidblender.com.au (marketing + app combined)
- **Planned:** App at https://bidblender.io, marketing at https://bidblender.com (see [DOMAIN_PLAN.md](./DOMAIN_PLAN.md), [SPLIT_MIGRATION_CHECKLIST.md](./SPLIT_MIGRATION_CHECKLIST.md))
- **Privacy:** https://console.bidblender.com.au/privacy

## Supabase Configuration

Before going live, configure in **Supabase Dashboard → Authentication → URL Configuration**:

- **Site URL:** `https://console.bidblender.com.au`
- **Redirect URLs:** Ensure these are in the allow list:
  - `https://<your-domain>/auth/callback`
  - `http://localhost:3000/auth/callback` (for local dev)

## LinkedIn OIDC

LinkedIn only needs Supabase's callback URL. No change required for production.

If you use a different Supabase project for production, add the production Supabase callback to LinkedIn's Authorized Redirect URLs.

## Environment Variables (Production)

Set in your hosting provider (Vercel, etc.):

```
NEXT_PUBLIC_SUPABASE_URL=https://rhksqnsvyyzqmohyqrbo.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SECRET_KEY=...
OPENAI_API_KEY=...
```
