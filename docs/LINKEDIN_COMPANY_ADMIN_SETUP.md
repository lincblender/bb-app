# LinkedIn Company Admin Connector Setup

This is separate from Supabase LinkedIn OIDC sign-in.

Use this flow when you want a BidBlender user to authorise company-page data based on their actual LinkedIn role for a company page.

## What this connector does

- Uses LinkedIn 3-legged OAuth directly from BidBlender
- Stores a tenant-scoped access token in `connector_sources.config`
- Fetches the member's approved LinkedIn organisation roles from `organizationAcls`
- Fetches administered organisation details from `organizations`
- Records the user's effective company-page access in the LinkedIn company-admin connector

## LinkedIn app requirements

As of March 12, 2026, LinkedIn sign-in scopes alone are not enough. You need a LinkedIn app with approved marketing/community-management access for organisation APIs.

At minimum, configure:

- A LinkedIn app in the Developer Portal
- An HTTPS redirect URL for BidBlender:
  - `http://localhost:3000/api/connectors/linkedin/company-admin/auth/callback` for local development if LinkedIn allows your local setup
  - `https://console.bidblender.com.au/api/connectors/linkedin/company-admin/auth/callback` for production
- Approved organisation admin scopes in the app

Recommended scope baseline:

- `r_organization_admin`

If your approved app requires broader page-management access for the endpoints you use, set:

- `rw_organization_admin`

## Credentials

**Per-user (recommended):** Each user enters their LinkedIn app Client ID and Secret in the connector setup. When you click "Authorise company pages" without credentials, the app prompts you to add them. Credentials are stored in `connector_sources.config` per tenant.

**Environment fallback:** You can still set `LINKEDIN_CLIENT_ID` and `LINKEDIN_CLIENT_SECRET` in `.env.local` for development or when all users share the same LinkedIn app. Stored config takes precedence over env vars when both exist.

Optional env vars:

```bash
LINKEDIN_COMPANY_ADMIN_SCOPES="r_organization_admin"
LINKEDIN_API_VERSION=202602
LINKEDIN_COMPANY_ADMIN_USE_PKCE=false
```

Notes:

- `LINKEDIN_COMPANY_ADMIN_SCOPES` can contain multiple space-delimited scopes.
- `LINKEDIN_API_VERSION` is sent as the `Linkedin-Version` header.
- `LINKEDIN_COMPANY_ADMIN_USE_PKCE=true` enables PKCE support for this connector. Leave it `false` unless your LinkedIn app is configured for that flow.

## Product behaviour

The app now treats LinkedIn as two separate layers:

1. Supabase OIDC sign-in for LinkedIn identity
2. Direct LinkedIn OAuth for company-page authority

In the UI:

- "Connect LinkedIn" handles sign-in identity
- "Authorise company pages" handles company-admin data access

## Verification

Once configured:

1. Sign in to BidBlender.
2. Go to `/console/connectors`.
3. Connect LinkedIn sign-in if not already connected.
4. Click `Authorise company pages`.
5. After callback, confirm the reach card shows one or more company pages and their roles.

If the OAuth flow succeeds but no company pages appear, the most common causes are:

- the LinkedIn member does not actually hold an approved role on a company page
- the LinkedIn app does not have the required product/scopes approved
- the token expired and the connector needs to be re-authorised
