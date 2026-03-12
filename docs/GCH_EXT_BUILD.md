# Chrome Extension Build

**Purpose**: Build a Chrome extension that surfaces BidBlender context on tender sources, CRM pages, and LinkedIn. Like the Apollo.io extension — a side panel that augments the page you're on.

**Phase**: 6

**Prerequisites**: [App Breakaway](APP_BREAKAWAY.md), [Shell Refactor](SHELL_REFACTOR.md)

---

## Concept

The extension surfaces the same kind of information as the **Details panel** next to chat in the app (opportunity info, scoring, related chats, quick actions), but in the context of the page you're on.

---

## Target Surfaces

| Surface | Page type | Extension shows |
|---------|-----------|-----------------|
| **Tender sources** | AusTender, other tender boards | Opportunity context, bid-no-bid snapshot, key dates, buyer info. Match or create opp in BidBlender. |
| **CRM — opportunity** | Salesforce/HubSpot opp record | BidBlender scoring, related chat, docs. Sync opp between CRM and BidBlender. |
| **CRM — company** | Salesforce/HubSpot company record | Related opportunities, buyer activity, network strength. |
| **LinkedIn — company** | Company page | Whether they have tenders/EOIs open or pending. Related opps from BidBlender or fresh "Find". |
| **LinkedIn — people** | Profile page | Who they work for; related opps (employer as buyer, etc.). |

Each surface is distinct: the extension detects the page type (via URL patterns, DOM structure, or page APIs) and renders the appropriate panel.

---

## Data Sources

- **Existing**: Opps already in the user's BidBlender profile (synced, saved, in progress). Shown by default when viewing a company or person.
- **Find** (uses credits): Click "Find" to query all sources (tender boards, connectors) and list matching opps. Fresh lookup; consumes credits.

**LinkedIn flow**: Company page → show open/pending tenders and EOIs (existing or via Find). People page → show employer; surface opps where that employer is the buyer. Both can trigger "Find" to gather from all sources and list results.

---

## UX Reference: Apollo.io

- **Side panel**: Slides in from the right. Doesn't replace the page; augments it.
- **Context-aware**: Different content for profile vs company vs list views.
- **Quick actions**: Add to list, open in app, sync, etc.
- **Auth**: User signs in to BidBlender; extension uses same session/API.

---

## Shared Components

Components from the app that belong in the extension:

- **OpportunityPanel** (or a slimmed variant): Key info, docs, network, status, decisions, related chats.
- **Scoring / bid-no-bid** display.
- **Badge**, **Card**, **Button** from `components/ui/*`.
- **Chat snippet** or "Related chats" block.

These live in `bb-ui-primitives`. The extension injects its own Link (e.g. `chrome.tabs.create` for "Open in BidBlender"), storage (`chrome.storage`), and styling (Tailwind works in extensions).

---

## Extension Architecture

| Part | Role | BidBlender use |
|------|------|-----------------|
| **Manifest** | `manifest.json` | Define which URLs the extension runs on (tender boards, CRM domains, linkedin.com). |
| **Background / Service worker** | Handles messages, API calls | Auth, API calls to BidBlender backend. |
| **Content script** | Injected into page DOM | Detect page type, pass page context to panel. |
| **Side panel** | Dedicated UI (Chrome 114+) | Renders the Details-like panel. React app. |

**Recommended approach**: Use the **Side Panel API** (Chrome 114+). Content script detects page type and sends context to the side panel via `chrome.runtime.sendMessage`.

---

## Build: WXT

| Option | Pros | Cons |
|--------|------|------|
| **WXT** | Vite-based; purpose-built for extensions; manifest, content scripts, side panel out of the box; monorepo-friendly | Adds one dependency |
| **Plasmo** | Great DX; file-based extension structure | Parcel-based; more opinionated |
| **Vite (raw)** | Minimal | Manual manifest, content script wiring |

**Recommendation**: **WXT**. It's Vite + extension tooling — same bundler model, no new paradigm.

---

## WXT Integration Effort

| Area | Effort | Notes |
|------|--------|-------|
| **Integrate** | 1–2 days | `npx wxt@latest init` in `apps/extension`. Add workspace ref to `bb-core` and `bb-ui-primitives`. WXT doesn't support path aliases natively — use `tsconfig` paths or direct package imports. pnpm: avoid `shamefully-hoist`. |
| **Build** | Low | WXT outputs to `dist/`; load unpacked in Chrome for dev. Ensure shared packages are ESM-friendly. |
| **Borrow** | Depends on Shell Refactor | Can't reuse components until `LinkComponent`, `ImageComponent`, `StorageAdapter` abstractions exist. Once `bb-ui-primitives` exists: extension injects `chrome.tabs.create`, `chrome.storage`. Tailwind works (PostCSS). |
| **Maintain** | Low ongoing | Core and primitives live in shared packages; changes propagate. Extension-specific: content script, page detection — stable once built. |

---

## Phase 6: Implementation Steps

1. Create `apps/extension` (or `packages/bb-extension`).
2. Implement content script to detect tender-source and CRM page types.
3. Build side panel with shared `OpportunityPanel`-like components from `bb-ui-primitives`.
4. Wire auth (BidBlender session), API calls, and "Open in BidBlender" via `chrome.tabs`.
5. Support tender sources first; add CRM (Salesforce, HubSpot) and LinkedIn as connectors mature.

---

## Monorepo Placement

```
apps/
  web/
  mobile/
  extension/          # Chrome extension (React side panel + content script)
```

---

## Effort

| Phase | Effort | Risk |
|-------|--------|------|
| Phase 6 (Chrome extension) | 1–2 weeks | Medium (content script + side panel; page-type detection) |

---

## References

- [Chrome Extension docs](https://developer.chrome.com/docs/extensions/) — Manifest V3, Side Panel API, content scripts.
- [WXT](https://wxt.dev/) — Web Extension Tools; Vite-based, cross-browser.
- [Plasmo](https://docs.plasmo.com/) — Alternative extension framework.
