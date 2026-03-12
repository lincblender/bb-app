# Internal Linking Architecture

This document canonises the hybrid linking approach for object-based content systems. It preserves data purity (no HTML in content arrays) while enabling rich internal linking for SEO and UX.

**Design goal**: The linking system is implemented once as a standalone, universal module. Each application adopts it and applies its own theming. No app-specific styling lives in the core.

---

## Principles

1. **Object-oriented purity**: Content remains in typed TS/JS objects. No hardcoded HTML in content.
2. **Section-level links first**: Most linking is via `relatedLinks` arrays attached to sections, cards, or blocks.
3. **Optional inline links**: For high-value passages, use structured `ParagraphContent` with explicit `links` where the anchor text appears in the body.
4. **Build once, theme per app**: Core types and components are framework-agnostic and theme-agnostic. Applications pass styling via props or composition.

---

## Interlinking Guidelines (Standard)

Link judiciously. Too many links dilute value and hurt readability.

| Context | Limit |
|---------|-------|
| **relatedLinks** per article (end block) | 2–4 links |
| **relatedLinks** per section | 0–2 links |
| **relatedLinks** per card/FAQ item | 0–1 links |
| **Inline links** per paragraph | 0–1 links |
| **Total contextual links** per page | 2–5 links |

**Rule of thumb**: If a link doesn't clearly help the reader, omit it. Fewer, higher-quality links outperform many weak ones.

---

## Standalone Module Structure

The linking system lives in a self-contained module that can be published as a package or copied into any project:

```
@internal-linking/  (or lib/internal-linking/)
├── types.ts           # RelatedLink, ParagraphContent, type guards
├── ParagraphWithLinks.tsx   # Renders ParagraphContent (accepts LinkComponent, className)
├── RelatedLinksBlock.tsx    # Renders relatedLinks list (accepts LinkComponent, className)
└── index.ts           # Public API
```

**Key constraint**: No hardcoded colours, fonts, or layout. All styling is injected by the consuming application.

---

## Core Types (standalone, framework-agnostic)

```ts
/** A related link for section-level placement (after a block of content). */
export interface RelatedLink {
  label: string;
  href: string;
}

/** Plain text paragraph (no inline links). */
export type PlainParagraph = string;

/** Paragraph with optional inline links. Anchor text must appear exactly once in `text`. */
export interface ParagraphWithLinks {
  text: string;
  links: readonly { anchor: string; href: string }[];
}

/** Union: paragraph can be plain string or structured with inline links. */
export type ParagraphContent = PlainParagraph | ParagraphWithLinks;

/** Type guard for ParagraphWithLinks */
export function isParagraphWithLinks(
  p: ParagraphContent
): p is ParagraphWithLinks {
  return typeof p !== "string" && "links" in p && Array.isArray((p as ParagraphWithLinks).links);
}
```

---

## Core Components (standalone, theme-agnostic)

### ParagraphWithLinks

Renders `ParagraphContent`. Accepts a `Link` component and `className` so the app controls styling.

```tsx
interface ParagraphWithLinksProps {
  content: ParagraphContent;
  /** App's Link component, e.g. next/link or react-router Link */
  LinkComponent: React.ComponentType<{ href: string; children: React.ReactNode; className?: string }>;
  /** Applied to the wrapping <p> */
  className?: string;
  /** Applied to inline links */
  linkClassName?: string;
}
```

### RelatedLinksBlock

Renders a list of `relatedLinks`. Accepts `LinkComponent` and `className` for theming.

```tsx
interface RelatedLinksBlockProps {
  links: readonly RelatedLink[];
  LinkComponent: React.ComponentType<{ href: string; children: React.ReactNode; className?: string }>;
  /** Wrapper, e.g. "mt-3 flex flex-wrap gap-2" */
  className?: string;
  /** Each link, e.g. "text-bb-powder-blue hover:underline" */
  linkClassName?: string;
}
```

**Note**: `LinkComponent` should accept `href`, `children`, and `className`. For Next.js `<Link>`, wrap if needed (e.g. pass `href` and render `<a className={...}>` as child for client-side navigation).

---

## Application Adoption

Each application:

1. Imports the core module.
2. Wraps or composes with app-specific styling (e.g. BidBlender's `text-bb-powder-blue`).
3. Integrates into existing page components (ArticlePage, MarketingCard, etc.).

Example for BidBlender:

```tsx
// components/marketing/RelatedLinksBlock.themed.tsx
import { RelatedLinksBlock as Base } from "@internal-linking/react";
import Link from "next/link";

export function RelatedLinksBlock(props: Omit<RelatedLinksBlockProps, "LinkComponent">) {
  return (
    <Base
      {...props}
      LinkComponent={Link}
      className="mt-3 flex flex-wrap gap-2 text-sm"
      linkClassName="text-bb-powder-blue hover:underline"
    />
  );
}
```

---

## Implementation Checklist

### 1. Standalone module (build once)

| File | Status | Notes |
|------|--------|------|
| `@internal-linking/types` or `lib/internal-linking/types.ts` | To implement | `RelatedLink`, `ParagraphContent`, `ParagraphWithLinks`, `isParagraphWithLinks` |
| `@internal-linking/ParagraphWithLinks` | To implement | Renders `ParagraphContent`; accepts `LinkComponent`, `className`, `linkClassName` |
| `@internal-linking/RelatedLinksBlock` | To implement | Renders `relatedLinks` list; accepts `LinkComponent`, `className`, `linkClassName` |

---

### 2. Article page (resource articles)

| Item | Type | Current | Required change |
|------|------|---------|------------------|
| **ArticlePage** | Component | Renders `paragraphs` as plain strings; renders `relatedLinks` at end | Support `ParagraphContent`; add optional `relatedLinks` per section |
| **ArticleSection** | Interface | `paragraphs: string[]` | `paragraphs: ParagraphContent[]`; add optional `relatedLinks?: RelatedLink[]` |
| **ArticleContent** | Interface | `relatedLinks` at article level | Keep; add `relatedLinks` per section (optional) |
| **resource-articles.ts** | Content | Uses `relatedLinks` at article level | Add `relatedLinks` to sections where needed; optionally convert key paragraphs to `ParagraphWithLinks` |

**Content source**: `lib/marketing/content/resource-articles.ts`

---

### 3. Feature page (integrations, product, use-case, commercial, trust)

| Item | Type | Current | Required change |
|------|------|---------|------------------|
| **FeaturePage** | Component | Renders card sections, process, FAQ, comparison, media | Pass through `relatedLinks` to child components |
| **MarketingCardSection** | Component | Renders `MarketingCardItem` | Support `relatedLinks` on item; render after card body |
| **MarketingCardItem** | Interface | `body: string` | Add optional `relatedLinks?: RelatedLink[]` |
| **MarketingCard** | Component | Renders `children` (body) | Accept optional `relatedLinks`; render after body |
| **MarketingLinkCard** | Component | Renders `description` | Accept optional `relatedLinks`; render after description |
| **ProcessSteps** | Component | Renders `steps` with `description` | Add optional `relatedLinks` per step; render after description |
| **ProcessStep** | Interface | `description: string` | Add optional `relatedLinks?: RelatedLink[]` |
| **FAQSection** | Component | Renders `question`, `answer` | Add optional `relatedLinks` per FAQ item; render after answer |
| **FAQItem** | Interface | `answer: string` | Add optional `relatedLinks?: RelatedLink[]` |
| **ComparisonTable** | Component | Renders column `description`, intro | Add optional `relatedLinks` per column or section; render after intro/columns |
| **MediaPlaceholder** | Component | Renders `description` | Add optional `relatedLinks`; render after description |

**Content sources**:  
- `lib/marketing/content/integration-pages.ts`  
- `lib/marketing/content/product-pages.ts`  
- `lib/marketing/content/use-case-pages.ts`  
- `lib/marketing/content/commercial-pages.ts`  
- `lib/marketing/content/trust-pages.ts`

---

### 4. Structured info page (developer, API, MCP, etc.)

| Item | Type | Current | Required change |
|------|------|---------|------------------|
| **StructuredInfoPage** | Component | Renders cards, FAQ | Pass through `relatedLinks` to child components |
| **MarketingCardItem** (cards) | Interface | `body: string` | Add optional `relatedLinks?: RelatedLink[]` |
| **FAQItem** | Interface | `answer: string` | Add optional `relatedLinks?: RelatedLink[]` |

**Content source**: `lib/marketing/content/developer.ts`

---

### 5. Integration spotlight page

| Item | Type | Current | Required change |
|------|------|---------|------------------|
| **IntegrationSpotlightPage** | Component | Renders card sections, process, FAQ | Same as FeaturePage; pass through `relatedLinks` |
| **MarketingCardItem** | Interface | `body: string` | Add optional `relatedLinks?: RelatedLink[]` |
| **ProcessStep** | Interface | `description: string` | Add optional `relatedLinks?: RelatedLink[]` |
| **FAQItem** | Interface | `answer: string` | Add optional `relatedLinks?: RelatedLink[]` |

**Content source**: `lib/marketing/content/integration-spotlights.ts`

---

### 6. Page-level headers and intros

| Item | Type | Current | Required change |
|------|------|---------|------------------|
| **MarketingPageHeader** | Component | Renders `intro` as plain string | Optional: support `intro` as `ParagraphContent` for inline links in hero intros |
| **StatGrid** | Component | Renders `intro` as plain string | Optional: support `relatedLinks` after intro |
| **CTA** | Component | Renders `description` | Optional: support `relatedLinks` after description |

**Priority**: Lower. These are typically short; section-level links are usually sufficient.

---

### 7. Home page and platform

| Item | Type | Current | Required change |
|------|------|---------|------------------|
| **Hero** | Component | Hardcoded copy | Optional: migrate to content object with `relatedLinks` |
| **home.ts** | Content | `homeDifferentiators`, `homeParadigmCards` (MarketingCardItem) | Add `relatedLinks` to cards where needed |
| **platform.ts** | Content | `platformCards` (MarketingCardItem) | Add `relatedLinks` to cards where needed |

**Content sources**: `lib/marketing/content/home.ts`, `lib/marketing/content/platform.ts`

---

## Component Rendering Pattern

Applications use the themed wrappers, which inject the app's `Link` and styles:

```tsx
// Example: MarketingCard with relatedLinks (using app-themed RelatedLinksBlock)
<div>
  <p className="...">{item.body}</p>
  {item.relatedLinks?.length ? (
    <RelatedLinksBlock
      links={item.relatedLinks}
      LinkComponent={Link}
      className="mt-3 flex flex-wrap gap-2 text-sm"
      linkClassName="text-bb-powder-blue hover:underline"
    />
  ) : null}
</div>
```

For `ParagraphContent` (paragraphs that may have inline links):

```tsx
{paragraphs.map((p, i) => (
  <ParagraphWithLinks
    key={i}
    content={p}
    LinkComponent={Link}
    linkClassName="text-bb-powder-blue hover:underline"
  />
))}
```

**Theming**: Each app creates thin wrappers (e.g. `RelatedLinksBlock.themed.tsx`) that pre-fill `LinkComponent` and `className` so page components stay clean.

---

## Page Graph (Optional)

For programmatic link discovery and validation, consider a central registry:

```ts
// lib/marketing/page-graph.ts
export const pageLinks: Record<string, RelatedLink[]> = {
  "/resources/crm-data-for-bid-teams": [
    { label: "HubSpot Integration", href: "/integrations/hubspot" },
    { label: "Salesforce Integration", href: "/integrations/salesforce" },
  ],
  "/integrations/hubspot": [
    { label: "CRM Data for Bid Teams", href: "/resources/crm-data-for-bid-teams" },
    { label: "History paradigm", href: "/platform" },
  ],
  // ... etc
};
```

Use for: auto-generating related blocks, validating bidirectional links, sitemap enrichment.

---

## Implementation Order

1. **Phase 1 – Standalone module**: Create the universal module (types, `ParagraphWithLinks`, `RelatedLinksBlock`). No app-specific code. Publish or copy into the repo.
2. **Phase 2 – App-themed wrappers**: Create BidBlender-specific wrappers that inject `Link` and theme classes. These are the only place BidBlender styling appears.
3. **Phase 3 – Adoption**: Extend content interfaces (`MarketingCardItem`, `ArticleSection`, etc.) with `relatedLinks`; integrate themed components into `MarketingCard`, `MarketingLinkCard`, `ArticlePage`, etc.
4. **Phase 4 – Content population**: Populate `relatedLinks` in content files; add inline links to high-value paragraphs where beneficial.
5. **Phase 5** (optional): Add `page-graph.ts` and tooling for programmatic link management.

**Portability**: Phases 1–2 are reusable. Another app (e.g. a docs site, another product) would repeat Phase 2 with its own `Link` and theme, then Phase 3 with its own components.

---

## Distribution Options

The standalone module can be shared in several ways:

| Option | Use when |
|--------|----------|
| **NPM package** (`@your-org/internal-linking`) | Multiple apps need it; versioned releases |
| **Monorepo package** (`packages/internal-linking`) | Single repo, multiple apps; shared via workspace |
| **Copy into each repo** (`lib/internal-linking/`) | Simplicity; one app or infrequent sharing |

The core requirement: the module has zero dependencies on app styling or routing. It only depends on React (or a framework-agnostic render API) and accepts `LinkComponent` as a prop.

---

## Reference: Content Files

| File | Content type | Components used |
|------|--------------|-----------------|
| `resource-articles.ts` | ArticleContent | ArticlePage |
| `integration-pages.ts` | FeaturePageContent | FeaturePage, MarketingCardSection, FAQSection |
| `product-pages.ts` | FeaturePageContent | FeaturePage, MarketingCardSection, ProcessSteps, FAQSection, ComparisonTable, MediaPlaceholder |
| `use-case-pages.ts` | FeaturePageContent | FeaturePage, MarketingCardSection |
| `commercial-pages.ts` | FeaturePageContent | FeaturePage, MarketingCardSection, ProcessSteps |
| `trust-pages.ts` | FeaturePageContent | FeaturePage, MarketingCardSection, FAQSection |
| `developer.ts` | StructuredInfoPageContent | StructuredInfoPage, MarketingCardSection, FAQSection |
| `integration-spotlights.ts` | IntegrationSpotlightContent | IntegrationSpotlightPage, MarketingCardSection, ProcessSteps, FAQSection |
| `home.ts` | Mixed | Hero, StatGrid, MarketingCardSection |
| `platform.ts` | MarketingCardItem[] | MarketingCardSection |
