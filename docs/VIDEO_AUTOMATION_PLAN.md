# BidBlender Video Automation Plan

This document defines a cheap, repeatable way to create BidBlender videos for YouTube without turning video production into a large ongoing OpenAI bill.

## Goal

Build a video pipeline that can:

- record real BidBlender workflows automatically
- produce short, medium, and long versions from the same source material
- add background music, explainer captions, and optional narration
- publish a consistent library of instructive YouTube content
- minimise manual editing per video
- keep OpenAI usage optional and tightly controlled

## Core Decision

Use:

- `Playwright` for deterministic product interaction and raw screen capture
- `ffmpeg` for assembly, trimming, muxing, caption burn-in, and music
- a simple content manifest for video scenarios
- optional TTS, ideally local or fixed-cost first

Do **not** use OpenAI for core recording or editing.

OpenAI should remain optional for:

- drafting video scripts
- polishing title/description variants
- optional TTS narration if a local voice is not acceptable

## Why this works

The product already has a controlled UI surface. That makes it a good fit for script-driven capture.

The cheapest reliable pipeline is:

1. deterministic browser actions
2. deterministic screen capture
3. deterministic post-processing
4. optional AI on top, not inside the core path

That is the right order. Otherwise costs and inconsistency creep in quickly.

## Recommended Stack

### Capture

- `Playwright`
- fixed viewport presets
- seeded demo/test data
- stable routes and selectors
- controlled delays and highlight states

Playwright already supports recorded browser videos via `recordVideo` on the browser context. Videos are saved on context close. Source: [Playwright videos](https://playwright.dev/docs/videos)

### Still assets

- `page.screenshot()` and element screenshots for thumbnails, chapter art, or poster frames

Source: [Playwright screenshots](https://playwright.dev/docs/screenshots)

### Assembly

- `ffmpeg`

Use it for:

- trimming intros/outros
- concatenating segments
- scaling and padding
- adding royalty-free background music
- ducking music under narration
- burning in captions
- creating shorts and landscape variants

### Video distribution

- YouTube only

This aligns with the media page now on the site. Videos should be published to the official BidBlender YouTube channel first, then surfaced on `/media`.

## Cost Control Principles

### Default: zero-AI production

The default path should need no OpenAI usage at all:

- scripted browser motion
- hardcoded on-screen captions
- library music
- template-based titles/descriptions

### Optional AI, bounded

If AI is used:

- cap it to metadata and narration text
- cache generated outputs in files
- never regenerate unless the script changes materially
- do not call an LLM per frame, per scene, or per render

### TTS policy

Prefer:

1. local/system TTS
2. fixed-cost third-party TTS if quality matters
3. OpenAI TTS only when the voice quality is worth the spend

OpenAI pricing is usage-based; current pricing documentation lists TTS separately. Source: [OpenAI pricing](https://developers.openai.com/api/docs/pricing)

## Production Architecture

### 1. Scenario manifest

Create a typed manifest of video ideas and flows.

Each scenario should define:

- id
- title
- goal
- target audience
- route(s)
- viewport
- duration target
- output aspect ratios
- captions
- optional narration script
- music profile
- publish tags

This lets one scenario become:

- a 20-40 second short
- a 90 second explainer
- a 3-5 minute walkthrough

### 2. Playwright capture scripts

Create scripts that:

- launch the app in a stable environment
- authenticate into a known demo account
- navigate to a known route
- perform a curated sequence of actions
- wait for transitions and loading states
- optionally capture multiple segments instead of one long take

Recommended script shape:

- one reusable runtime
- one script per scenario family
- selectors centralised so UI changes are easier to repair

### 3. Post-production layer

For each scenario:

- stitch segments
- add branded intro/outro
- overlay chapter captions
- add background music
- optionally add TTS
- export:
  - `16:9`
  - `9:16`
  - `1:1` only if useful later

### 4. Publishing layer

Store metadata locally first:

- title
- description
- tags
- chapters
- thumbnail frame candidates
- transcript/caption text

Then publish manually at first.

Do not automate YouTube upload until the content quality and metadata quality are stable.

## What to build now

### Phase 1: deterministic recording foundation

Build first:

- `scripts/video/flows.ts`
- `scripts/video/README.md`
- `scripts/video/selectors.ts`
- `scripts/video/runtime.ts`
- `scripts/video/record-*.ts`

Initial scenarios:

- homepage platform overview
- opportunity intelligence explainer
- bid / no bid walkthrough
- document review flow
- connectors setup flow
- media page walkthrough once videos exist

### Phase 2: assembly foundation

Build next:

- `scripts/video/render.ts`
- `scripts/video/templates/`
- `scripts/video/music/`
- `scripts/video/captions/`

Add:

- intro/outro stings
- lower-third captions
- basic music ducking
- export presets

### Phase 3: narration

Add only after silent-caption videos are working well.

Options:

- local voice first
- external TTS second
- OpenAI TTS last

### Phase 4: volume publishing

Once the pipeline is stable:

- publish weekly walkthroughs
- publish short feature clips
- split long recordings into topical excerpts
- turn one recording session into multiple assets

## Suggested Video Categories

### Product walkthroughs

- What is BidBlender?
- How BidBlender works
- Four evidence pillars
- Opportunity intelligence overview
- Bid / research / no-bid workflow

### Feature-specific

- Document review
- Opportunity explorer
- Opportunity matrix
- Strategy recommendations
- Connectors
- Media page

### Integration-specific

- HubSpot for bid memory
- LinkedIn for reach
- Salesforce for account history
- Workday for capability evidence
- MCP for internal tools

### Comparison content

- vs tender-board-only workflows
- vs CRM-only workflows
- vs generic sales-intent tools

### Micro-content

- one question, one answer clips
- one signal, one implication clips
- one UI panel, one lesson clips

## Content Strategy Rule

Do not make every video a glossy ad.

Use a blend of:

- instructional
- persuasive
- category-educational
- comparison
- feature proof

That will make the YouTube library more useful and more believable.

## Reliability Requirements

Before scaling volume:

- stable seeded data
- stable selectors
- stable viewport presets
- deterministic loading waits
- predictable animation timing
- predictable auth state

Without those, Playwright-generated videos will look brittle.

## Important Limitation

Playwright can record interaction flows well, but it is not a full video editor.

Use Playwright for:

- browser action
- capture

Use `ffmpeg` for:

- polish
- captions
- audio
- compositing

## Recommendation

Yes, automate this.

But do it as:

- product capture pipeline
- lightweight assembly pipeline
- optional AI layer

not as:

- AI-first video generation

That will be cheaper, more reliable, and more brand-aligned.
