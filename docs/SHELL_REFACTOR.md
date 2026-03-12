# Shell Refactor

**Purpose**: Abstract platform-specific primitives so the BB app can run on web, native, and extension with shared components. No hardcoded `next/link`, `next/image`, `localStorage`, etc.

**Phases**: 2–3

**Prerequisite**: [App Breakaway](APP_BREAKAWAY.md) (Phase 1)

---

## Component Interpreter Matrix

| Layer | Responsibility | Contents | Platform |
|-------|----------------|----------|----------|
| **Core** | Data, types, business logic | `lib/ai`, `lib/chat/types`, `lib/connectors`, `lib/scoring`, `lib/settings/types`, `lib/demo-data/types`, agent response types | JS/TS only |
| **Content containers** | Structured content for UI | Chat messages, opportunity data, prompt suggestions, settings schema | JS/TS only |
| **UI primitives** | Platform-agnostic components | Accept `LinkComponent`, `ImageComponent`, `StorageAdapter` as props | React only |
| **Shell (Next.js)** | Web-specific wrappers | `next/link`, `next/image`, `useRouter`, Tailwind | Next.js |
| **Shell (RN)** | Native-specific wrappers | `@react-navigation/native`, `Image` from RN, `AsyncStorage`, NativeWind or StyleSheet | React Native |
| **Shell (Extension)** | Browser-specific | Side panel, content script, `chrome.storage`, `chrome.tabs` for links | Chrome Extension |

---

## Change Propagation Flow

```
Core change (e.g. new ChatTag type)
    → bb-core package
    → All shells consume updated types
    → No shell changes needed if API unchanged

UI primitive change (e.g. PromptSuggestion card layout)
    → bb-ui-primitives (accepts content, renders with injected components)
    → All shells get new layout; each passes its Link/Image
    → Trivial: update one component, all platforms get it

Shell-specific change (e.g. RN gesture handling)
    → apps/mobile only
    → Web and extension unaffected
```

---

## Patterns to Abstract

### Already Portable (no changes)

| Module | Notes |
|--------|-------|
| `lib/ai/*` | Pure logic, no platform deps |
| `lib/connectors/*` | Pure logic |
| `lib/scoring/*` | Pure logic |
| `lib/chat/types.ts` | Plain types |
| `lib/settings/types.ts` | Plain types |
| `lib/demo-data/agent-responses.ts` | Types + pure functions |
| `lib/utils.ts` (`cn`) | Works with RN StyleSheet if you pass style objects |

### Needs Abstraction

| Current | Location | Abstraction |
|---------|----------|-------------|
| `next/link` | DemoShell, PromptScreen, OpportunityPanel, OpportunityMatrix, OpportunityDetailHeader | `LinkComponent` prop (as in INTERNAL_LINKING_ARCHITECTURE) |
| `next/image` | DemoShell, UserProfile | `ImageComponent` prop or `ImageSource` + platform-specific renderer |
| `useRouter`, `usePathname` | DemoShell, ChatTopBar, OpportunityDetailHeader | `useNavigation()` returning `{ push, replace, pathname }` — inject from shell |
| `localStorage` | useChatStore, useSettings | `StorageAdapter` interface: `getItem`, `setItem` — web: localStorage, RN: AsyncStorage, extension: chrome.storage |
| `window.matchMedia` | DemoShell, PromptScreen (useIsMobile) | `useBreakpoint()` or `useIsMobile()` — inject: web uses matchMedia, RN uses `Dimensions` |
| `window.setTimeout` | lib/chat/attachments.ts | Use global `setTimeout` or inject — RN has `setTimeout` |
| `window.location.origin` | Auth redirectTo | Inject `getBaseUrl()` — web: `window.location.origin`, RN: config/env |
| Supabase `createClient` | useChatStore, demo-data | Already client-side; ensure RN-compatible Supabase client (it is) |

### Server-Only (keep in Next.js)

| Module | Reason |
|--------|--------|
| `lib/auth/session.ts` | Uses `next/headers` |
| `lib/supabase/server.ts` | Uses `next/headers` |
| `lib/db/sqlite.ts` | Node `fs`, `path` |
| `lib/demo-data/server-fetch.ts` | Server-side Supabase |
| API routes (`app/api/*`) | Next.js Route Handlers — remain in web app; RN and extension call same HTTP APIs |

---

## Phase 2: Storage & Navigation Abstractions

1. Define `StorageAdapter` interface; implement for web (localStorage) and RN (AsyncStorage).
2. Define `NavigationAdapter` or `useNavigation` hook interface; implement for Next.js and RN.
3. Refactor `useChatStore` and `useSettings` to accept `StorageAdapter` (or use a provider).
4. Refactor demo components to accept `LinkComponent` and `useNavigation` from context.

---

## Phase 3: Image & Breakpoint Abstractions

1. Add `ImageComponent` prop or `ImageSource` + platform renderer.
2. Add `useBreakpoint` / `useIsMobile` with platform-specific implementation.
3. Replace `next/image` and `window.matchMedia` in demo components.

---

## Decision Point

After Phase 3, all abstractions are in place. Both [RN Build](RN_BUILD.md) and [Chrome Extension Build](GCH_EXT_BUILD.md) are viable from here. Choose which to build first (or both). Phase 5 (extract shared components) is needed before either shell can consume them; it can be done as part of building the first shell.

---

## Styling Strategy

| Web | RN | Shared |
|-----|-----|--------|
| Tailwind CSS | NativeWind (Tailwind for RN) or StyleSheet | Shared design tokens (colours, spacing) in `bb-core` |
| `className` | `style` prop | Abstract: `getStyles()` returns platform-specific style objects, or use NativeWind for same class names |

**Recommendation**: Use **NativeWind** so you can keep Tailwind class names in shared components. Both platforms interpret the same classes.

---

## Effort

| Phase | Effort | Risk |
|-------|--------|------|
| Phase 2 (Storage & Nav) | 2–3 days | Low |
| Phase 3 (Image & Breakpoint) | 1 day | Low |
