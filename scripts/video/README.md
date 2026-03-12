# Video Automation

This directory now contains the first runnable capture pipeline for BidBlender videos.

Current status:

- `flows.ts` holds the scenario manifest and recording status.
- `record-golden-path.ts` records the console golden path end to end.
- `runtime.ts` handles browser launch, video capture, guided pauses, and CLI options.
- `selectors.ts` centralises the locators used by the recorder.
- `fixtures/golden-path-brief.md` is the sample upload used in the document-review step.
- `narration/golden-path.md` is the talk track for live narration.

Available commands:

- `npm run video:list`
- `npm run video:install-browser`
- `npm run video:record`
- `npm run video:record -- --mode auto`

Prerequisites:

- Run `npm install`.
- Make sure `.env.local` is set so the app can sign in locally.
- Have the demo user available: `hello@bidblender.com.au / demo`.
- Start the app with `npm run dev`.
- Install Chromium once with `npm run video:install-browser`.

Guided mode:

- `npm run video:record` launches headed Chromium, records the session, prints the narration line for each scene, and waits for Enter before running the next scripted action.
- This is the mode to use when you want to speak over the flow live.

Auto mode:

- `npm run video:record -- --mode auto` runs the same flow without pauses and writes the raw browser video into `artifacts/video`.

Environment overrides:

- `VIDEO_BASE_URL` defaults to `http://127.0.0.1:3000`
- `VIDEO_DEMO_EMAIL` defaults to `hello@bidblender.com.au`
- `VIDEO_DEMO_PASSWORD` defaults to `demo`
- `VIDEO_OUTPUT_DIR` defaults to `artifacts/video`

Notes:

- The document-review step is honest by design. If live AI analysis is unavailable, the recording will still show extraction and the fallback guardrail response.
- Post-processing with `ffmpeg` is still pending. This setup solves deterministic capture first, which is the right dependency order.

See `docs/VIDEO_AUTOMATION_PLAN.md` for the broader rollout order.
