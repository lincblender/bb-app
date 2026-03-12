# Multi-App Strategy

**Purpose**: Define the architecture for BidBlender across multiple surfaces — web app, native apps (iOS/Android), Chrome extension, and future variants (Watch, widgets, App Clip). Shared core, trivial change propagation, clear app vs marketing separation.

**Timeline**: Stay the course with current plans. Multi-surface work can be done later. These docs ensure we're ready when we are.

---

## Overview

The stack is **not overly bespoke**. Most BidBlender app logic is already portable. The main work:

1. **Splice** the BB app from the marketing site.
2. **Abstract** platform-specific primitives (Link, Image, navigation, storage, breakpoints).
3. **Introduce** shared packages (`bb-core`, `bb-ui-primitives`) that all shells consume.

The **[Internal Linking Architecture](INTERNAL_LINKING_ARCHITECTURE.md)** pattern (LinkComponent injection) generalises to all surfaces.

---

## Functional Suitability (Not Feature Parity)

Each surface is suited to its context. Users pick the right tool for where they are.

| Overlap | Share | Notes |
|---------|-------|-------|
| **Web + phones** | ~90% | Most BidBlender work — chat, opportunities, matrix, research. |
| **Web-only** | ~3% | Complex layouts, large doc review, big displays. |
| **Device-only** | ~7% | Voice, widgets, push, offline, share-from-other-apps. |
| **Wearables** | smaller | Voice-first, glanceable. Niche but high-value. |
| **Browser extension** | overlaps web | Context on tender sources and CRM pages — right where you're working. |

---

## Architecture

```
packages/
  bb-core/           # Shared logic, types, content containers
  bb-ui-primitives/  # Platform-agnostic primitives (Link, Image, Storage, etc.)
apps/
  web/               # Next.js (marketing + BB app shell)
  mobile/            # React Native (BB app only)
  extension/         # Chrome extension (side panel + content script)
```

- **Core** and **API** stay the same; new surfaces are additional shells.
- Shell-level capabilities (voice, push, offline) don't change core types or business logic.
- Each surface is built for functional suitability in its context.

---

## Phase Order & Decision Point

| Phase | Doc | Summary |
|-------|-----|---------|
| **1** | [App Breakaway](APP_BREAKAWAY.md) | Splice app from marketing; create `bb-core`. |
| **2–3** | [Shell Refactor](SHELL_REFACTOR.md) | Storage, navigation, image, breakpoint abstractions. |
| **4–5** | [RN Build](RN_BUILD.md) | React Native shell; extract shared UI primitives. |
| **6** | [Chrome Extension Build](GCH_EXT_BUILD.md) | WXT-based extension; tender, CRM, LinkedIn surfaces. |
| **7** | [Future Variant Build](FUTURE_VARIANT_BUILD.md) | Watch, widgets, App Clip; framework for new surfaces. |

**Decision point**: After Phase 3 (Shell Refactor), all abstractions are in place. Both RN and the extension are viable. Choose which to build first (or both). Phase 5 (extract shared components) is needed before either shell; it can be done as part of building the first shell.

---

## Document Index

| Document | Contents |
|----------|----------|
| [**App Breakaway**](APP_BREAKAWAY.md) | Separate app from marketing site; monorepo structure; Phase 1. |
| [**Shell Refactor**](SHELL_REFACTOR.md) | Platform abstractions; component matrix; Phase 2–3. |
| [**RN Build**](RN_BUILD.md) | React Native shell; shared primitives; device considerations; Phase 4–5, 7. |
| [**Chrome Extension Build**](GCH_EXT_BUILD.md) | WXT extension; tender/CRM/LinkedIn surfaces; Phase 6. |
| [**Future Variant Build**](FUTURE_VARIANT_BUILD.md) | Watch, widgets, App Clip; guidelines for new surfaces. |
