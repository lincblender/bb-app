export type VideoAspectRatio = "16:9" | "9:16" | "1:1";
export type VideoStatus = "planned" | "drafting" | "ready-to-record";

export interface VideoFlow {
  id: string;
  title: string;
  purpose: string;
  targetRoute: string;
  audience: "prospect" | "customer" | "technical-buyer" | "mixed";
  status: VideoStatus;
  targetLengths: readonly string[];
  aspectRatios: readonly VideoAspectRatio[];
  musicProfile: "ambient" | "uplift" | "minimal" | "none";
  narrationMode: "none" | "captions-only" | "optional-tts";
  steps: readonly string[];
}

export const videoFlows: readonly VideoFlow[] = [
  {
    id: "console-golden-path",
    title: "Console golden path walkthrough",
    purpose: "Record the core sign-in, discovery, qualification, and document review flow.",
    targetRoute: "/auth/signin",
    audience: "mixed",
    status: "ready-to-record",
    targetLengths: ["90s explainer", "4m walkthrough", "8m narrated demo"],
    aspectRatios: ["16:9"],
    musicProfile: "none",
    narrationMode: "captions-only",
    steps: [
      "Sign in with a real workspace account.",
      "Open a clean dashboard chat.",
      "Ask for the latest matching bids.",
      "Focus a single opportunity from the result set.",
      "Run SWOT and competitor impact from the context panel.",
      "Open the full opportunity detail page.",
      "Upload a sample brief and run document review.",
    ],
  },
  {
    id: "platform-overview",
    title: "BidBlender platform overview",
    purpose: "Explain the category and show the main product surfaces quickly.",
    targetRoute: "/platform",
    audience: "mixed",
    status: "ready-to-record",
    targetLengths: ["30s short", "90s explainer", "4m walkthrough"],
    aspectRatios: ["16:9", "9:16"],
    musicProfile: "uplift",
    narrationMode: "captions-only",
    steps: [
      "Open the homepage hero.",
      "Move to the four evidence pillars.",
      "Show the platform page.",
      "Highlight chat, explorer, matrix, and connectors.",
      "End on a bid / research / no-bid framing.",
    ],
  },
  {
    id: "opportunity-intelligence",
    title: "Opportunity intelligence walkthrough",
    purpose: "Show how BidBlender qualifies live work instead of just listing tenders.",
    targetRoute: "/opportunity-intelligence",
    audience: "prospect",
    status: "ready-to-record",
    targetLengths: ["45s short", "2m explainer"],
    aspectRatios: ["16:9", "9:16"],
    musicProfile: "ambient",
    narrationMode: "captions-only",
    steps: [
      "Open opportunity intelligence page.",
      "Scroll through the four evidence pillars.",
      "Show the comparison section.",
      "Emphasise amber-resolution language.",
    ],
  },
  {
    id: "bid-no-bid",
    title: "Bid / research / no-bid workflow",
    purpose: "Demonstrate the traffic-light decision model.",
    targetRoute: "/bid-no-bid",
    audience: "prospect",
    status: "ready-to-record",
    targetLengths: ["30s short", "2m explainer"],
    aspectRatios: ["16:9", "9:16"],
    musicProfile: "minimal",
    narrationMode: "optional-tts",
    steps: [
      "Open the bid / no-bid page.",
      "Highlight green, amber, and red.",
      "Focus on amber as the value zone.",
      "End on next-best actions.",
    ],
  },
  {
    id: "document-review",
    title: "Document review flow",
    purpose: "Show how uploaded tender documents feed back into the decision workflow.",
    targetRoute: "/document-review",
    audience: "prospect",
    status: "drafting",
    targetLengths: ["45s short", "2m walkthrough"],
    aspectRatios: ["16:9", "9:16"],
    musicProfile: "ambient",
    narrationMode: "captions-only",
    steps: [
      "Open the document review page.",
      "Show upload and extraction positioning.",
      "Explain comparison against prior evidence.",
      "Tie back to opportunity context.",
    ],
  },
  {
    id: "connectors",
    title: "Connectors and settings walkthrough",
    purpose: "Explain why connected sources matter and how users control them.",
    targetRoute: "/connectors",
    audience: "mixed",
    status: "drafting",
    targetLengths: ["60s explainer", "3m walkthrough"],
    aspectRatios: ["16:9", "9:16"],
    musicProfile: "minimal",
    narrationMode: "captions-only",
    steps: [
      "Open the connectors page.",
      "Move through history, capability, reach, and opportunity.",
      "Explain settings and source choice.",
      "Tie connectors back to recommendation quality.",
    ],
  },
  {
    id: "media-page",
    title: "BidBlender media page overview",
    purpose: "Show the website auto-serving channel content from YouTube.",
    targetRoute: "/media",
    audience: "mixed",
    status: "planned",
    targetLengths: ["20s short", "60s explainer"],
    aspectRatios: ["16:9", "9:16"],
    musicProfile: "none",
    narrationMode: "captions-only",
    steps: [
      "Open the media page.",
      "Show videos auto-loading from the channel.",
      "Explain posts readiness.",
      "End with the channel CTA.",
    ],
  },
];
