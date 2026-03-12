# Future Variant Build

**Purpose**: Framework and guidelines for adding new surfaces — Watch, widgets, App Clip, share extension, etc. Each is a thin shell over `bb-core`; built for functional suitability in its context.

**Phase**: 7 (and beyond)

**Prerequisite**: [RN Build](RN_BUILD.md) baseline (Phase 4) stable.

---

## Device-Suited Capabilities

Surfaces where phones/wearables are **functionally suited**:

| Capability | Platform | Suited because |
|------------|----------|-----------------|
| **Voice input / dictation** | iOS, Android | Hands-free when typing is awkward |
| **Apple Watch voice** | watchOS | Ultra-quick prompts on the move |
| **Widgets** | iOS, Android | Glanceable without opening app |
| **App Clip** | iOS | One job, no install — scan URL, get bid-no-bid |
| **Push notifications** | iOS, Android | Web push is second-class |
| **Offline / cached** | Mobile | View recent data when connectivity is poor |
| **Share extension** | iOS, Android | "Review in BidBlender" from email, browser, etc. |

---

## Light Surfaces

| Surface | Description |
|---------|-------------|
| **Widgets** | Glanceable; single-action or read-only. Home screen / Lock screen. |
| **App Clip / Instant App** | One job, minimal install. Scan tender URL → bid-no-bid snapshot. |
| **Watch** | Voice-only or very constrained UI; suited to prompts and short responses. |

These consume the same `bb-core` logic. They are thin shells with purpose-built UI for their context.

---

## Guidelines for New Surfaces

### 1. Core and API Stay the Same

- New surfaces do not change `bb-core` types or business logic.
- They call the same APIs (HTTP endpoints) as web and mobile.
- Shell-level capabilities (voice, push, offline) are implemented in the shell, not the core.

### 2. Thin Shell, Purpose-Built UI

- Each surface has minimal, purpose-built UI.
- Don't port the full app; extract the subset of functionality that fits the context.
- Example: Watch = voice prompts + short responses. Widget = glanceable opportunities or chat summary.

### 3. Platform Constraints

| Surface | Constraints |
|---------|-------------|
| **Watch** | WatchKit; very limited UI; voice-first. |
| **Widgets** | WidgetKit (iOS), Android widgets; read-only or single action; refresh intervals. |
| **App Clip** | App Clip runtime; minimal install; one job. |
| **Share extension** | Receives shared content (URL, file); deep link into app with context. |

### 4. Implementation Order

1. Identify the minimal feature set for the surface.
2. Ensure `bb-core` and APIs support it (they usually do).
3. Build a thin shell that:
   - Injects platform-specific primitives (storage, navigation, etc.)
   - Renders only the UI needed for that context
   - Calls existing APIs

### 5. Effort

Each capability is shell-level. Low per capability once the baseline RN app exists. Prioritise based on functional suitability and user value.

---

## Architecture Implication

- **Core** and **API** stay the same; new surfaces are additional shells.
- Voice, push, offline are **shell-level capabilities** — they don't change core types or business logic.
- Each surface is built for functional suitability in its context, not to mirror another.
