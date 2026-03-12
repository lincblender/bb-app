# LinkedIn OIDC Login Setup

This document covers Supabase LinkedIn sign-in only.

For the separate LinkedIn company-page admin connector, see [LINKEDIN_COMPANY_ADMIN_SETUP.md](./LINKEDIN_COMPANY_ADMIN_SETUP.md).

Step-by-step configuration for both LinkedIn and Supabase.

---

## Part 1: LinkedIn Developer Portal

### 1. Get your Callback URL from Supabase

Your Supabase Auth callback URL (for LinkedIn to redirect to):

```
https://rhksqnsvyyzqmohyqrbo.supabase.co/auth/v1/callback
```

*(Replace `rhksqnsvyyzqmohyqrbo` with your project ref if different.)*

You can also find this in: **Supabase Dashboard → Authentication → Providers → LinkedIn (OIDC)** — click to expand and copy the URL.

### 2. Add it to LinkedIn

1. Go to [LinkedIn Developer Dashboard](https://www.linkedin.com/developers/apps)
2. Select your **BidBlender** app
3. Go to the **Auth** tab
4. Find **Authorized Redirect URLs for your app** (or **OAuth 2.0 settings**)
5. Click **Add redirect URL**
6. Paste exactly: `https://rhksqnsvyyzqmohyqrbo.supabase.co/auth/v1/callback`
7. Save

> **Important:** This is Supabase’s callback URL, not your app’s. LinkedIn sends users here after they authorise; Supabase then redirects to your app.

### 3. Request OIDC product access (if needed)

1. Go to the **Products** tab
2. Find **Sign In with LinkedIn using OpenID Connect**
3. Click **Request access** if not already approved

### 4. OAuth 2.0 scopes

In the **Auth** tab, under **OAuth 2.0 scopes**, ensure you have:

- `openid` — required for OIDC
- `profile` — name, profile picture (captured and displayed in the app sidebar)
- `email` — email address (captured and displayed in the app sidebar)

### 5. Get your credentials

From the **Auth** tab:

- **Client ID:** `86pvvrisx2r796` (you have this)
- **Client Secret:** Click **Generate** or **Show** — copy this for Supabase

---

## Part 2: Supabase Dashboard

### 1. Enable LinkedIn (OIDC)

1. Go to [Supabase Dashboard](https://supabase.com/dashboard) → your project
2. **Authentication** → **Providers**
3. Find **LinkedIn (OIDC)** in the list
4. Expand it and turn **LinkedIn (OIDC) Enabled** to **ON**
5. Enter:
   - **Client ID:** `86pvvrisx2r796`
   - **Client Secret:** (paste from LinkedIn)
6. Click **Save**

### 2. Add redirect URLs (required)

1. **Authentication** → **URL Configuration**
2. Under **Redirect URLs**, add:
   - `http://localhost:3000/auth/callback` (dev)
   - `https://console.bidblender.com.au/auth/callback` (production)

---

## Part 3: App code

The login page includes a "Sign in with LinkedIn" button that calls:

```ts
supabase.auth.signInWithOAuth({
  provider: 'linkedin_oidc',
  options: { redirectTo: `${origin}/auth/callback` }
})
```

The `/auth/callback` route exchanges the code for a session and redirects to the dashboard.

---

## Checklist

- [ ] LinkedIn: Callback URL added
- [ ] LinkedIn: OIDC product access
- [ ] LinkedIn: Scopes `openid`, `profile`, `email`
- [ ] LinkedIn: Client Secret copied
- [ ] Supabase: LinkedIn (OIDC) enabled
- [ ] Supabase: Client ID and Secret entered
- [ ] Supabase: Redirect URLs include `/auth/callback`
