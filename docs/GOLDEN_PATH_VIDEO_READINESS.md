# Golden Path Video Readiness

## Goal
Make the three core BidBlender flows reliable enough to record repeatedly with real product behaviour and without hand-waving:

1. Sign up via LinkedIn
2. Find and qualify an opportunity
3. Upload and analyse a document

A flow is video-ready when it is deterministic, honest about missing data, and lands the user in the right place without manual cleanup.

## Cross-cutting problems

- Post-auth routing is generic. Users are dropped on `/console/dashboard` regardless of whether they are new, returning, or mid-setup.
- Opportunity discovery is partly delegated to the model. Search and selection should be resolved from tenant data first.
- Chat analysis metadata still uses demo defaults in API routes, which weakens trust and makes downstream logic sloppy.
- Document review is honest when extraction fails, but the UI and API path still need stronger support for "this is what was actually analysed".

## Golden Path 1: LinkedIn signup

### Intended outcome
A user signs up with LinkedIn and lands in a deliberate first-run experience that explains what to do next.

### Current shortcomings
- OAuth callback redirects to `/console/dashboard` unconditionally.
- Sign-in and sign-up pages also redirect logged-in users straight to `/console/dashboard`.
- There is no first-run route that frames the three golden paths.
- The dashboard route is not a purposeful onboarding destination.

### Required fixes
- Add shared post-auth destination logic based on real tenant state.
- Route first-run users to a dedicated `/console/get-started` page.
- Preserve explicit `next` destinations for non-default flows.
- Make the get-started page point directly to:
  - connectors / LinkedIn status
  - opportunity discovery
  - document review

### Definition of done
- New user with no chats and no opportunities lands on `/console/get-started`.
- Returning user lands on `/console/dashboard` unless an explicit safe `next` is provided.
- The first-run page visually explains the three golden paths and gives one-click entry into each.

## Golden Path 2: Find and qualify an opportunity

### Intended outcome
A user can find the right opportunity quickly, select it deterministically, and move into qualification without guessing how the product wants to be used.

### Current shortcomings
- Discovery prompts sometimes go to AI instead of local tenant data.
- Search and selection should not depend on model interpretation.
- The explorer is functional but not the authoritative resolver for simple opportunity lookup.

### Required fixes
- Route discovery / search / "show me" prompts through deterministic local handling.
- Keep AI for analysis after an opportunity is in context.
- Ensure selecting an opportunity updates chat tags and the detail panel consistently.
- Keep the no-opportunity detail panel searchable and useful.

### Definition of done
- Queries like `latest matching bids`, `show me X`, `find X`, and similar resolve from tenant data first.
- When a single opportunity is found, it is selected in the context panel and tagged into the chat.
- The user can move from discovery into qualification without manually reconstructing context.

## Golden Path 3: Upload and analyse a document

### Intended outcome
A user uploads a supported document, sees clear extraction state, and gets an analysis that is explicitly grounded in the uploaded file rather than sounding generic.

### Current shortcomings
- The system can be honest on failure, but success responses do not explicitly state what document text was analysed.
- Known-unsupported `.doc` is still invited by the file picker.
- AI request metadata still uses demo defaults.

### Required fixes
- Remove unsupported legacy `.doc` from accepted upload types.
- Stamp AI requests with the real tenant ID.
- Prepend a deterministic acknowledgement of which documents were actually analysed.
- Keep hard guardrails when extraction or analysis is unavailable.

### Definition of done
- Only supported extractable formats are invited in the upload control.
- Successful analysis identifies the document names reviewed.
- Failed extraction and unavailable analysis paths remain explicit and non-hallucinatory.

## Implementation order

1. Post-auth routing and first-run page
2. Deterministic opportunity discovery routing
3. Document analysis truthfulness and supported-format cleanup
4. Verification pass across all three flows

## Verification checklist

- LinkedIn signup lands on the right first screen for a new user.
- Returning user signin does not regress.
- Opportunity search from dashboard chat resolves reliably.
- Opportunity search from the details panel remains usable when no opportunity is selected.
- Uploading a PDF or DOCX shows pending -> ready -> analysed.
- Uploading an unsupported file is rejected honestly.
- AI outputs no longer carry demo-tenant metadata in the chat path.
