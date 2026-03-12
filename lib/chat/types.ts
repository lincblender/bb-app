export interface AgentResponseBlock {
  type: "text" | "opportunities" | "cta" | "doc-ref" | "select_opportunity" | "decision_signal";
  content: string;
  opportunities?: { id: string; title: string; issuer: string; fit: number; competitivePct?: number }[];
  ctaText?: string;
  ctaAction?: string;
  ctaHref?: string;
  opportunityId?: string;
  decisionState?: "Green" | "Amber" | "Red";
  recommendation?: "Bid" | "Research" | "No Bid";
  confidence?: number;
  decisionSummary?: string;
  dimensions?: { label: string; score: number; status: "strong" | "mixed" | "weak" | "unknown" }[];
  blockers?: string[];
  movers?: string[];
  researchActions?: { action: string; reason: string; priority: "low" | "medium" | "high" | "critical" }[];
}

export interface ChatAttachment {
  id?: string;
  name: string;
  type: string;
  extractedText?: string | null;
  extractionStatus?: "pending" | "ready" | "unsupported" | "failed";
  extractionError?: string | null;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  attachments?: ChatAttachment[];
  blocks?: AgentResponseBlock[];
  timestamp: Date;
}

export type ChatTagType = "strategy-only" | "research-only" | "opportunity";

export interface ChatTag {
  type: ChatTagType;
  opportunityId?: string;
}

export interface Chat {
  id: string;
  title: string;
  tags: ChatTag[];
  messages: ChatMessage[];
  createdAt: string;
  updatedAt: string;
  /** Number of unread messages (assistant messages since last view) */
  unreadCount?: number;
  /** Whether the chat is archived (hidden from default view) */
  archived?: boolean;
}

export const CHAT_STORAGE_KEY = "bidblender-chats";
export const LEGACY_CHAT_STORAGE_KEY = "bidblender-demo-chats";
