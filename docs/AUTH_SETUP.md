# BidBlender Auth Setup

Supabase Auth with email/password. Individual accounts; each user gets their own tenant.

## 1. Apply migrations

```bash
supabase db push
```

This creates:
- `profiles` table (links auth.users → tenants)
- Trigger: create profile on signup (new tenant for new users)
- Special case: `hello@bidblender.com.au` → `hello-bidblender` tenant
- RLS policies on all tables

## 2. Configure Supabase Auth URLs

In [Supabase Dashboard](https://supabase.com/dashboard) → Authentication → URL Configuration:

- **Site URL:** `http://localhost:3000` (dev) or your production URL
- **Redirect URLs:** Add (required for OAuth and email confirmation):
  - `http://localhost:3000/auth/callback`
  - `https://console.bidblender.com.au/auth/callback` (production)

## 3. Create demo user (optional)

For the pre-seeded demo account:

```bash
npm run db:create-demo-user
```

Sign in with: `hello@bidblender.com.au` / `demo`

## 4. Email confirmation (optional)

By default Supabase may require email confirmation. To disable for development:

Supabase Dashboard → Authentication → Providers → Email → disable "Confirm email"

## 5. LinkedIn login (optional)

See [LINKEDIN_OAUTH_SETUP.md](./LINKEDIN_OAUTH_SETUP.md) for configuring Sign in with LinkedIn.

## 6. LinkedIn company-page access (optional)

See [LINKEDIN_COMPANY_ADMIN_SETUP.md](./LINKEDIN_COMPANY_ADMIN_SETUP.md) for the separate LinkedIn company-admin connector used to fetch role-verified company-page data.

## Flow

- **Sign up:** New user → trigger creates tenant `user-{uuid}` and profile
- **Sign in:** Supabase session stored in cookies; middleware refreshes on each request
- **Protected routes:** `/console/*` requires auth; `/auth/signin` and `/auth/signup` are public
- **Logout:** `supabase.auth.signOut()` clears session
