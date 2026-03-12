# React Native Build

**Purpose**: Build the BidBlender app for iOS and Android. Shared core and UI primitives; RN-specific shell for navigation, touch, and device capabilities.

**Phases**: 4–5, 7

**Prerequisites**: [App Breakaway](APP_BREAKAWAY.md), [Shell Refactor](SHELL_REFACTOR.md)

---

## Phase 4: RN Shell

1. Create `apps/mobile` (or `apps/bidblender-mobile`) with React Native.
2. Implement RN-specific shells for each screen (Dashboard, Opportunities, Matrix, Chat, etc.).
3. Consume `bb-core` and `bb-ui-primitives`; pass RN implementations of Link, Image, Storage, Navigation.

---

## Phase 5: Shared UI Primitives

1. Extract presentational components from `components/demo/*` into `bb-ui-primitives`.
2. Each primitive receives content + injected platform components.
3. Both shells use the same primitives with different injections.

**Ordering**: Phase 5 is required before Phase 4 (RN) or [Chrome Extension](GCH_EXT_BUILD.md) can consume components. It can be done up front, or as part of building whichever shell you choose first — extract the components you need as you build.

---

## Phase 7: Device-Suited Capabilities (Later)

Once the baseline RN app is stable, add capabilities where devices are functionally suited:

- Push notifications (deadlines, new opportunities, chat)
- Voice input / dictation for prompts
- iOS widgets (glanceable opportunities, chat summary)
- Apple Watch companion (voice prompts)
- App Clip / Instant App (light, single-job flows)
- Share extension (deep link from other apps)

Each is a shell-level addition; core logic and APIs stay unchanged. See [Future Variant Build](FUTURE_VARIANT_BUILD.md) for guidelines.

---

## Device-Specific Considerations

**Baseline (full app shell)**:

- **Touch targets**: Minimum 44pt; use RN `Pressable` or `TouchableOpacity` with `hitSlop`.
- **Navigation**: React Navigation (stack, tabs, drawer) — different from Next.js file-based routing.
- **Safe areas**: `react-native-safe-area-context` for notches, home indicator.
- **Keyboard**: `KeyboardAvoidingView` for chat input.
- **Haptics**: Optional; RN-specific APIs.

**Extended surfaces** (Watch, widgets, App Clip): Each has its own constraints (WatchKit, WidgetKit, App Clip runtime). Design these as thin shells over `bb-core`; they share logic but have minimal, purpose-built UI.

---

## Effort

| Phase | Effort | Risk |
|-------|--------|------|
| Phase 4 (RN Shell) | 1–2 weeks | Medium (RN-specific: touch, nav, gestures) |
| Phase 5 (Shared primitives) | 2–3 days | Low |
| Phase 7 (Device-suited capabilities) | Ongoing | Low per capability |

**Total**: ~2–3 weeks for dual-platform (web + mobile).

---

## References

- `docs/INTERNAL_LINKING_ARCHITECTURE.md` — LinkComponent injection pattern.
- `components/demo/*` — Current BB app UI (candidates for bb-ui-primitives).
- `lib/chat/*`, `lib/settings/*` — State and storage (need StorageAdapter).
- `app/console/*` — App shell and routes.
