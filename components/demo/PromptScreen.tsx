"use client";

import { useState, useRef, useEffect, useSyncExternalStore, useMemo } from "react";
import Link from "next/link";
import { BbLogo } from "@/components/ui/BbLogo";
import { Paperclip, Send, FileText, MessageSquare, ExternalLink, MoreVertical, GitFork, Archive, ArchiveRestore, CheckCircle2, AlertTriangle, CircleX, ArrowRight, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import type { AgentResponseBlock, ChatAttachment, ChatTag } from "@/lib/chat/types";
import { useWorkspaceData } from "@/lib/workspace/client";
import { useChat } from "@/lib/chat/ChatContext";
import { useSubmitPrompt } from "@/lib/chat/useSubmitPrompt";
import { extractAttachment } from "@/lib/chat/attachments";
import { useChatCompression } from "@/lib/chat/useChatCompression";
import { createClient } from "@/lib/supabase/client";
import { useCurrentUserProfile } from "@/lib/auth/useCurrentUserProfile";
import { OnboardingPseudoChat } from "./OnboardingPseudoChat";
import { AssistantAvatar, UserAvatar } from "./Avatar";
import { MultiplayerAvatars } from "./MultiplayerAvatars";
import { DocumentUploader } from "./DocumentUploader";
import {
  countReadyPillars,
  getIncompletePillars,
  getSetupPillarStatuses,
} from "@/lib/connectors/setup-status";
import { ONBOARDING_SURFACE_ID } from "@/lib/chat/sidebar-surfaces";

const TAG_COLORS: Record<string, string> = {
  "strategy-only": "bg-purple-500/30 text-purple-300",
  "research-only": "bg-amber-500/30 text-amber-300",
  opportunity: "bg-bb-powder-blue/30 text-bb-powder-blue",
};

function getTagLabel(tag: ChatTag, getOpportunityById: (id: string) => { title: string } | undefined): string {
  if (tag.type === "strategy-only") return "Strategy";
  if (tag.type === "research-only") return "Research";
  if (tag.type === "opportunity" && tag.opportunityId) {
    const opp = getOpportunityById(tag.opportunityId);
    const title = opp?.title ?? tag.opportunityId;
    return title.length > 20 ? title.slice(0, 20) + "…" : title;
  }
  return tag.type;
}

type PromptSuggestionContext = "general" | "research" | "strategy" | "opportunity";

interface PromptSuggestion {
  id: string;
  text: string;
  credits?: number;
  contexts: PromptSuggestionContext[];
}

const PROMPT_LIBRARY: PromptSuggestion[] = [
  {
    id: "general-latest-match",
    text: "What's the latest matching bids with my capabilities?",
    contexts: ["general", "research"],
  },
  {
    id: "general-current-customers",
    text: "Are any of my current customers doing RFT or EOI this month?",
    contexts: ["general", "research"],
  },
  {
    id: "general-movement-buyer",
    text: "What's the movement on Department of Digital Services?",
    contexts: ["general", "research"],
  },
  {
    id: "general-new-buyers",
    text: "Which buyers look like they are entering market in the next 90 days?",
    contexts: ["general", "research"],
  },
  {
    id: "general-whitespace",
    text: "Where are the whitespace buyers we should be building relationships with now?",
    contexts: ["general", "research", "strategy"],
  },
  {
    id: "general-doc-review",
    text: "Review this doc against my last few bids — is it worth bidding?",
    contexts: ["general", "strategy"],
  },
  {
    id: "research-competitor-pattern",
    text: "Which competitors keep showing up in the same bids as us lately?",
    contexts: ["research", "strategy"],
  },
  {
    id: "research-intent",
    text: "Show me the buyers with the strongest early procurement intent signals.",
    contexts: ["research", "strategy"],
  },
  {
    id: "research-follow-up",
    text: "What should I follow up this week to turn amber bids into decisions?",
    contexts: ["research", "strategy"],
  },
  {
    id: "strategy-no-bid",
    text: "What are the main reasons we should no-bid opportunities like this?",
    contexts: ["strategy", "opportunity"],
  },
  {
    id: "strategy-buyer-access",
    text: "Where is our buyer access weakest, and how do we improve it cheaply?",
    contexts: ["strategy", "opportunity"],
  },
  {
    id: "strategy-competitor-impact",
    text: "What's the competitor impact on our Defence Cyber Uplift tender?",
    contexts: ["strategy", "opportunity"],
  },
  {
    id: "strategy-swot",
    text: "Start SWOT",
    credits: 2,
    contexts: ["strategy", "opportunity"],
  },
  {
    id: "opportunity-win",
    text: "Is this opportunity genuinely winnable, or just a fit on paper?",
    contexts: ["opportunity", "strategy"],
  },
  {
    id: "opportunity-blockers",
    text: "What would move this from amber to green?",
    contexts: ["opportunity", "strategy"],
  },
  {
    id: "opportunity-red-team",
    text: "Red-team this bid: where are we most likely to lose?",
    contexts: ["opportunity", "strategy"],
  },
  {
    id: "opportunity-buyer-attention",
    text: "Do we actually have the buyer's attention here?",
    contexts: ["opportunity", "strategy"],
  },
];

function hashString(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash * 31 + input.charCodeAt(i)) >>> 0;
  }
  return hash;
}

function getPromptContext(hasOpportunity: boolean, hasStrategy: boolean, hasResearch: boolean): PromptSuggestionContext {
  if (hasOpportunity) return "opportunity";
  if (hasStrategy) return "strategy";
  if (hasResearch) return "research";
  return "general";
}

function getRotatedPrompts(
  context: PromptSuggestionContext,
  rotationSeed: string
): { primary: PromptSuggestion; secondaries: PromptSuggestion[] } {
  const eligible = PROMPT_LIBRARY.filter((prompt) => prompt.contexts.includes(context));
  const fallback = PROMPT_LIBRARY.filter((prompt) => prompt.contexts.includes("general"));
  const pool = (eligible.length >= 3 ? eligible : [...eligible, ...fallback]).filter(
    (prompt, index, arr) => arr.findIndex((candidate) => candidate.id === prompt.id) === index
  );
  const ordered = [...pool].sort(
    (a, b) =>
      hashString(`${rotationSeed}:${a.id}`) - hashString(`${rotationSeed}:${b.id}`)
  );

  return {
    primary: ordered[0],
    secondaries: ordered.slice(1, 3),
  };
}

const DECISION_UI = {
  Green: {
    badge: "positive" as const,
    border: "border-bb-green/40",
    background: "bg-bb-green/10",
    accent: "text-bb-green",
    icon: CheckCircle2,
  },
  Amber: {
    badge: "warning" as const,
    border: "border-bb-orange/40",
    background: "bg-bb-orange/10",
    accent: "text-bb-orange",
    icon: AlertTriangle,
  },
  Red: {
    badge: "negative" as const,
    border: "border-bb-red/40",
    background: "bg-bb-red/10",
    accent: "text-bb-red",
    icon: CircleX,
  },
};

function findDecisionBlock(blocks?: AgentResponseBlock[]) {
  return blocks?.find(
    (block): block is AgentResponseBlock & { type: "decision_signal"; decisionState: "Green" | "Amber" | "Red" } =>
      block.type === "decision_signal" && !!block.decisionState
  );
}

function renderBlock(
  block: AgentResponseBlock,
  index: number,
  onChatAboutOpp?: (id: string) => void,
  onBreakApart?: () => void,
  canBreakApart?: boolean
) {
  if (block.type === "text") {
    return (
      <div key={index} className="whitespace-pre-wrap text-gray-300 leading-relaxed">
        {block.content.split("**").map((part, i) =>
          i % 2 === 1 ? (
            <strong key={i} className="font-semibold text-gray-100">
              {part}
            </strong>
          ) : (
            part
          )
        )}
      </div>
    );
  }

  if (block.type === "decision_signal" && block.decisionState) {
    const ui = DECISION_UI[block.decisionState];
    const Icon = ui.icon;
    return (
      <div
        key={index}
        className={`rounded-xl border p-4 shadow-sm ${ui.border} ${ui.background}`}
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className={`mt-0.5 ${ui.accent}`}>
              <Icon size={20} />
            </div>
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={ui.badge}>{block.decisionState}</Badge>
                {block.recommendation && (
                  <span className="text-sm font-medium text-gray-100">{block.recommendation}</span>
                )}
              </div>
              {block.decisionSummary && (
                <p className="text-sm leading-relaxed text-gray-200">{block.decisionSummary}</p>
              )}
            </div>
          </div>
          {typeof block.confidence === "number" && (
            <div className="rounded-full border border-gray-600 px-3 py-1 text-xs text-gray-300">
              Confidence {block.confidence}%
            </div>
          )}
        </div>

        {block.dimensions && block.dimensions.length > 0 && (
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {block.dimensions.map((dimension) => (
              <div
                key={dimension.label}
                className="rounded-lg border border-gray-700/70 bg-bb-dark/60 px-3 py-2"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs font-medium uppercase tracking-wide text-gray-400">
                    {dimension.label}
                  </span>
                  <span className="text-sm font-semibold text-gray-100">{dimension.score}</span>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-gray-700">
                  <div
                    className={`h-full rounded-full ${
                      dimension.score >= 70
                        ? "bg-bb-green"
                        : dimension.score >= 45
                          ? "bg-bb-orange"
                          : "bg-bb-red"
                    }`}
                    style={{ width: `${Math.max(0, Math.min(100, dimension.score))}%` }}
                  />
                </div>
                <p className="mt-1 text-xs capitalize text-gray-400">{dimension.status}</p>
              </div>
            ))}
          </div>
        )}

        {block.blockers && block.blockers.length > 0 && (
          <div className="mt-4">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Blockers</p>
            <ul className="mt-2 space-y-1 text-sm text-gray-300">
              {block.blockers.slice(0, 3).map((item) => (
                <li key={item}>• {item}</li>
              ))}
            </ul>
          </div>
        )}

        {block.researchActions && block.researchActions.length > 0 && (
          <div className="mt-4">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
              Next research actions
            </p>
            <div className="mt-2 space-y-2">
              {block.researchActions.slice(0, 3).map((item) => (
                <div
                  key={`${item.action}-${item.reason}`}
                  className="flex items-start gap-2 rounded-lg border border-gray-700/70 bg-bb-dark/60 px-3 py-2"
                >
                  <ArrowRight size={14} className="mt-0.5 shrink-0 text-gray-500" />
                  <div>
                    <p className="text-sm text-gray-100">
                      {item.action}{" "}
                      <span className="text-xs uppercase tracking-wide text-gray-500">
                        [{item.priority}]
                      </span>
                    </p>
                    <p className="text-xs text-gray-400">{item.reason}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  if (block.type === "opportunities" && block.opportunities?.length) {
    return (
      <div key={index} className="mt-4 space-y-2">
        {block.opportunities.map((o) => (
          <div
            key={o.id}
            className="relative flex flex-col gap-3 rounded-lg border border-gray-600 bg-bb-dark-elevated p-4 shadow-sm transition-shadow hover:border-gray-500"
          >
            <Link href={`/console/opportunities/${o.id}`} className="min-w-0">
              <p className="font-medium text-gray-100">{o.title}</p>
              <p className="text-sm text-gray-500">{o.issuer}</p>
            </Link>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={o.fit >= 75 ? "high" : o.fit >= 50 ? "medium" : "low"}>
                Fit {o.fit}%
              </Badge>
              {o.competitivePct != null && (
                <span className="text-sm text-gray-500">~{o.competitivePct}% competitive</span>
              )}
            </div>
            <div className="absolute bottom-4 right-4 flex items-center gap-2">
              {onChatAboutOpp && (
                <button
                  type="button"
                  onClick={() => onChatAboutOpp(o.id)}
                  className="flex items-center justify-center rounded px-3 py-1.5 text-xs font-medium bg-bb-powder-blue text-black hover:bg-bb-powder-blue-light"
                  title="Chat about this opportunity"
                >
                  <MessageSquare size={14} />
                </button>
              )}
              <Link
                href={`/console/opportunities/${o.id}`}
                className="flex items-center justify-center rounded px-3 py-1.5 text-xs font-medium bg-bb-mustard text-black hover:bg-bb-mustard-light"
                title="Open opportunity"
              >
                <ExternalLink size={14} />
              </Link>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (block.type === "cta") {
    const isBreakApart = block.ctaAction === "breakapart" && canBreakApart && onBreakApart;
    return (
      <div key={index} className="mt-4">
        <p className="text-gray-300">{block.content}</p>
        {isBreakApart ? (
          <button
            type="button"
            onClick={() => onBreakApart?.()}
            className="mt-3 inline-flex items-center gap-2 rounded-full bg-bb-coral px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-bb-coral/90"
          >
            {block.ctaText}
          </button>
        ) : (
          block.ctaText && (
            <Link
              href={block.ctaHref ?? "/opportunities"}
              className="mt-3 inline-flex items-center gap-2 rounded-full bg-bb-coral px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-bb-coral/90"
            >
              {block.ctaText}
            </Link>
          )
        )}
      </div>
    );
  }

  return null;
}

interface PromptScreenProps {
  mobileTopPadding?: boolean;
}

function useIsMobile() {
  return useSyncExternalStore(
    (cb) => {
      const mq = window.matchMedia("(max-width: 767px)");
      mq.addEventListener("change", cb);
      return () => mq.removeEventListener("change", cb);
    },
    () => typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches,
    () => false
  );
}

export function PromptScreen({ mobileTopPadding = false }: PromptScreenProps = {}) {
  const {
    currentChat,
    currentChatId,
    currentPseudoChatId,
    createChatForOpportunity,
    breakApartChat,
    forkChat,
    archiveChat,
    unarchiveChat,
    opportunityIds,
    updateChatTags,
  } = useChat();
  const isMobile = useIsMobile();
  const [chatMenuOpen, setChatMenuOpen] = useState(false);
  const chatMenuRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragDepthRef = useRef(0);
  const { opportunities, organisations, connectorSources, refetch } = useWorkspaceData();
  const submitPromptAction = useSubmitPrompt();
  const { checkAndCompress, isCompressing } = useChatCompression();
  const currentUserProfile = useCurrentUserProfile();
  const getOpportunityById = (id: string) => opportunities.find((o) => o.id === id);
  const [linkedInConnected, setLinkedInConnected] = useState(false);

  const [input, setInput] = useState("");
  const [attachments, setAttachments] = useState<ChatAttachment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [pendingExtractionCount, setPendingExtractionCount] = useState(0);
  const [isDragActive, setIsDragActive] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [promptRefreshCount, setPromptRefreshCount] = useState(0);
  const [tagEditorOpen, setTagEditorOpen] = useState(false);
  const [tagSearch, setTagSearch] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const submitPromptContextRef = useRef<{ opportunityId?: string }>({});
  const isExtractingAttachments = pendingExtractionCount > 0;

  const cancelCountdown = () => {
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
    setCountdown(null);
  };

  useEffect(() => {
    return cancelCountdown;
  }, []);

  useEffect(() => {
    if (currentChat?.messages && currentChat.messages.length > 8 && !isCompressing) {
      checkAndCompress();
    }
  }, [currentChat?.messages?.length, checkAndCompress, isCompressing]);

  useEffect(() => {
    createClient()
      .auth.getUser()
      .then(async ({ data: { user } }) => {
        const hasLinkedInIdentity =
          user?.identities?.some((identity) => identity.provider === "linkedin_oidc") ?? false;
        setLinkedInConnected(hasLinkedInIdentity);

        if (
          hasLinkedInIdentity &&
          !connectorSources.some(
            (connector) => connector.id === "conn-linkedin-profile" && connector.status === "live"
          )
        ) {
          await fetch("/api/connectors/linkedin/activate", {
            method: "POST",
          }).catch(() => undefined);
          await refetch().catch(() => undefined);
        }
      });
  }, [connectorSources, refetch]);

  useEffect(() => {
    if (!chatMenuOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (chatMenuRef.current && !chatMenuRef.current.contains(e.target as Node)) {
        setChatMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [chatMenuOpen]);

  useEffect(() => {
    setTagEditorOpen(false);
    setTagSearch("");
  }, [currentChatId]);

  const messages = currentChat?.messages ?? [];

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const submitPrompt = async (
    textToSubmit: string,
    targetChatId?: string,
    contextualOpportunityId?: string
  ) => {
    const text = textToSubmit.trim();
    if (!text && attachments.length === 0) return;
    if (isLoading || isExtractingAttachments) return;

    const currentAttachments = [...attachments];
    setInput("");
    setAttachments([]);
    setIsLoading(true);

    submitPromptContextRef.current = {};
    try {
      await submitPromptAction(text, {
        targetChatId,
        currentChatId: currentChatId ?? undefined,
        attachments: currentAttachments,
        screenContext: contextualOpportunityId
          ? {
              pathname: `/console/opportunities/${contextualOpportunityId}`,
              mode: "contextual",
              opportunityId: contextualOpportunityId,
              screenLabel: "Opportunity detail",
            }
          : null,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const submitPromptRef = useRef(submitPrompt);
  submitPromptRef.current = submitPrompt;
  useEffect(() => {
    const handler = (e: Event) => {
      const d = (e as CustomEvent<{ text: string; chatId?: string; opportunityId?: string }>).detail;
      if (d.text && d.chatId) {
        submitPromptContextRef.current = { opportunityId: d.opportunityId };
        submitPromptRef.current(d.text, d.chatId, d.opportunityId);
      }
    };
    window.addEventListener("bidblender:submit-prompt", handler);
    return () => window.removeEventListener("bidblender:submit-prompt", handler);
  }, []);

  const onChatAboutOpp = async (oppId: string) => {
    const chatId = createChatForOpportunity(oppId);
    const opp = getOpportunityById(oppId);
    const title = opp?.title ?? "this opportunity";
    await submitPrompt(`Tell me about ${title}`, chatId);
  };

  const onBreakApart = async () => {
    if (!currentChatId || opportunityIds.length < 2) return;
    await breakApartChat(currentChatId, async (oppId) => {
      const chatId = createChatForOpportunity(oppId);
      const opp = getOpportunityById(oppId);
      const title = opp?.title ?? "this opportunity";
      await submitPrompt(`Tell me about ${title}`, chatId);
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    cancelCountdown();
    await submitPrompt(input.trim());
  };

  const queueAttachmentFiles = (files: File[]) => {
    if (files.length === 0) return;

    const pendingAttachments: ChatAttachment[] = files.map((file) => ({
      id: `attachment-${crypto.randomUUID()}`,
      name: file.name,
      type: file.type || "application/octet-stream",
      extractionStatus: "pending",
      extractedText: null,
      extractionError: null,
    }));

    setAttachments((current) => [...current, ...pendingAttachments]);
    setPendingExtractionCount((count) => count + files.length);

    void Promise.all(
      files.map(async (file, index) => {
        const extracted = await extractAttachment(file);
        return {
          ...extracted,
          id: pendingAttachments[index].id,
        };
      })
    )
      .then((resolvedAttachments) => {
        setAttachments((current) =>
          current.map((attachment) => {
            const resolved = resolvedAttachments.find((candidate) => candidate.id === attachment.id);
            return resolved ?? attachment;
          })
        );
      })
      .finally(() => {
        setPendingExtractionCount((count) => Math.max(0, count - files.length));
      });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    cancelCountdown();
    const files = e.target.files;
    if (!files?.length) return;
    e.target.value = "";
    queueAttachmentFiles(Array.from(files));
  };

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    if (isMobile || !Array.from(e.dataTransfer.types).includes("Files")) return;
    e.preventDefault();
    dragDepthRef.current += 1;
    setIsDragActive(true);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    if (isMobile || !Array.from(e.dataTransfer.types).includes("Files")) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
    setIsDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    if (isMobile || !Array.from(e.dataTransfer.types).includes("Files")) return;
    e.preventDefault();
    dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
    if (dragDepthRef.current === 0) {
      setIsDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    if (isMobile) return;
    e.preventDefault();
    dragDepthRef.current = 0;
    setIsDragActive(false);
    const droppedFiles = Array.from(e.dataTransfer.files ?? []);
    if (droppedFiles.length > 0) {
      cancelCountdown();
      queueAttachmentFiles(droppedFiles);
    }
  };

  const removeAttachment = (index: number) => {
    cancelCountdown();
    setAttachments((a) => a.filter((_, i) => i !== index));
  };

  const handleSuggestionClick = (prompt: string) => {
    cancelCountdown();
    setInput(prompt);
    setCountdown(3);
    countdownRef.current = setInterval(() => {
      setCountdown((c) => {
        if (c === null || c <= 1) {
          if (countdownRef.current) {
            clearInterval(countdownRef.current);
            countdownRef.current = null;
          }
          submitPrompt(prompt);
          return null;
        }
        return c - 1;
      });
    }, 1000);
  };

  const hasContent = messages.length > 0;
  const hasStrategyTag = currentChat?.tags.some((tag) => tag.type === "strategy-only") ?? false;
  const hasResearchTag = currentChat?.tags.some((tag) => tag.type === "research-only") ?? false;
  const promptContext = getPromptContext(opportunityIds.length > 0, hasStrategyTag, hasResearchTag);
  const promptRotationSeed = useMemo(() => {
    const dateKey = new Date().toISOString().slice(0, 10);
    return `${promptContext}:${currentChatId ?? "new"}:${dateKey}:${promptRefreshCount}`;
  }, [promptContext, currentChatId, promptRefreshCount]);
  const promptSuggestions = useMemo(
    () => getRotatedPrompts(promptContext, promptRotationSeed),
    [promptContext, promptRotationSeed]
  );
  const isOnboardingPseudoChat = currentPseudoChatId === ONBOARDING_SURFACE_ID;
  const setupStatuses = useMemo(
    () =>
      getSetupPillarStatuses({
        connectors: connectorSources,
        organisations,
        opportunities,
        linkedInConnected,
      }),
    [connectorSources, organisations, opportunities, linkedInConnected]
  );
  const incompletePillars = useMemo(() => getIncompletePillars(setupStatuses), [setupStatuses]);
  const readyPillarCount = useMemo(() => countReadyPillars(setupStatuses), [setupStatuses]);

  const renderPromptSuggestions = () => (
    <div className="mt-8 w-full max-w-3xl space-y-3">
      <button
        type="button"
        onClick={() => handleSuggestionClick(promptSuggestions.primary.text)}
        className="w-full rounded-3xl border border-bb-coral/50 bg-bb-coral/10 px-5 py-4 text-left shadow-sm transition-colors hover:border-bb-coral hover:bg-bb-coral/20"
      >
        <div className="mb-2 flex items-center justify-between gap-3">
          <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-bb-coral">
            Primary
          </span>
          {promptSuggestions.primary.credits != null && (
            <span className="rounded bg-bb-mustard/20 px-2 py-1 text-[10px] font-medium text-bb-mustard">
              {promptSuggestions.primary.credits} credits
            </span>
          )}
        </div>
        <p className="text-base font-medium text-gray-100">{promptSuggestions.primary.text}</p>
      </button>

      <div className={`grid gap-3 ${isMobile ? "grid-cols-1" : "grid-cols-2"}`}>
        {promptSuggestions.secondaries.map((prompt) => (
          <button
            key={prompt.id}
            type="button"
            onClick={() => handleSuggestionClick(prompt.text)}
            className="rounded-2xl border border-gray-600 bg-bb-dark-elevated px-4 py-3 text-left shadow-sm transition-colors hover:border-bb-coral hover:bg-bb-coral/10"
          >
            <div className="mb-2 flex items-center justify-between gap-2">
              <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-gray-500">
                Alternate
              </span>
              {prompt.credits != null && (
                <span className="rounded bg-bb-mustard/20 px-1.5 py-0.5 text-[10px] font-medium text-bb-mustard">
                  {prompt.credits} credits
                </span>
              )}
            </div>
            <p className="text-sm text-gray-200">{prompt.text}</p>
          </button>
        ))}
      </div>

      <div className="flex justify-center">
        <button
          type="button"
          onClick={() => setPromptRefreshCount((count) => count + 1)}
          className="inline-flex items-center gap-2 rounded-full border border-gray-600 bg-bb-dark-elevated px-4 py-2 text-sm text-gray-300 transition-colors hover:border-bb-powder-blue hover:text-gray-100"
        >
          <RefreshCw size={15} />
          Show me different ideas
        </button>
      </div>
    </div>
  );

  const renderSetupProgress = () => {
    if (incompletePillars.length === 0) {
      return null;
    }

    return (
      <div className="mt-8 w-full max-w-4xl rounded-3xl border border-gray-700 bg-bb-dark-elevated/80 p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-bb-powder-blue">
              Setup Progress
            </p>
            <h3 className="mt-2 text-lg font-semibold text-gray-100">
              {readyPillarCount} of 4 pillars ready
            </h3>
            <p className="mt-1 text-sm text-gray-400">
              Start with LinkedIn, keep HubSpot selective, curate the organisation profile, then spool in live opportunities from AusTender.
            </p>
          </div>
          <Link
            href="/get-started"
            className="inline-flex items-center gap-2 rounded-full border border-gray-600 px-4 py-2 text-sm text-gray-200 hover:border-bb-powder-blue hover:text-white"
          >
            Open setup guide
          </Link>
        </div>

        <div className={`mt-5 grid gap-3 ${isMobile ? "grid-cols-1" : "grid-cols-2"}`}>
          {incompletePillars.slice(0, 4).map((pillar) => (
            <Link
              key={pillar.id}
              href={pillar.href}
              className="rounded-2xl border border-gray-700/70 bg-bb-dark px-4 py-4 text-left transition-colors hover:border-bb-coral/60 hover:bg-bb-dark/80"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-bb-coral">
                  {pillar.eyebrow}
                </span>
                <Badge variant={pillar.status === "in-progress" ? "warning" : "neutral"}>
                  {pillar.status === "in-progress" ? "In progress" : "Next"}
                </Badge>
              </div>
              <p className="mt-3 text-base font-medium text-gray-100">{pillar.title}</p>
              <p className="mt-2 text-sm leading-relaxed text-gray-400">{pillar.detail}</p>
            </Link>
          ))}
        </div>
      </div>
    );
  };

  const toggleSimpleTag = (tagType: "strategy-only" | "research-only") => {
    if (!currentChatId || !currentChat) {
      return;
    }

    const nextTags = currentChat.tags.some((tag) => tag.type === tagType)
      ? currentChat.tags.filter((tag) => tag.type !== tagType)
      : [...currentChat.tags, { type: tagType }];

    updateChatTags(currentChatId, nextTags);
  };

  const toggleOpportunityTag = (opportunityId: string) => {
    if (!currentChatId || !currentChat) {
      return;
    }

    const nextTags = currentChat.tags.some(
      (tag) => tag.type === "opportunity" && tag.opportunityId === opportunityId
    )
      ? currentChat.tags.filter(
          (tag) => !(tag.type === "opportunity" && tag.opportunityId === opportunityId)
        )
      : [...currentChat.tags, { type: "opportunity", opportunityId } as ChatTag];

    updateChatTags(currentChatId, nextTags);
  };

  const taggableOpportunities = useMemo(() => {
    const query = tagSearch.toLowerCase().trim();
    const ordered = [...opportunities].sort((left, right) => left.title.localeCompare(right.title));
    if (!query) {
      return ordered.slice(0, 8);
    }

    return ordered
      .filter((opportunity) =>
        opportunity.title.toLowerCase().includes(query)
      )
      .slice(0, 8);
  }, [opportunities, tagSearch]);

  return (
    <div
      className="relative flex min-h-0 flex-1 flex-col overflow-hidden"
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {isDragActive && !isMobile && (
        <div className="pointer-events-none absolute inset-0 z-40 flex items-center justify-center bg-bb-powder-blue/8 backdrop-blur-[1px]">
          <div className="rounded-3xl border border-dashed border-bb-powder-blue/70 bg-bb-dark-elevated/95 px-8 py-10 text-center shadow-2xl transition-all duration-200">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-bb-powder-blue/15 text-bb-powder-blue">
              <FileText size={24} />
            </div>
            <p className="text-lg font-semibold text-gray-100">Drop files to analyse</p>
            <p className="mt-2 text-sm text-gray-400">
              PDF, DOCX, TXT, CSV, XML and similar text-readable files can be added directly to this chat.
            </p>
          </div>
        </div>
      )}
      {currentChatId && currentChat && (
        <div className="flex shrink-0 items-center justify-between border-b border-gray-700/50 px-4 py-2">
          <div>
            {(() => {
               const activeOpp = currentChat.tags.find(t => t.type === 'opportunity');
               if (activeOpp?.opportunityId) {
                  return <MultiplayerAvatars roomId={activeOpp.opportunityId} />;
               }
               return null;
            })()}
          </div>
          <div className="relative" ref={chatMenuRef}>
            <button
              type="button"
              onClick={() => setChatMenuOpen(!chatMenuOpen)}
              className="rounded p-2 text-gray-400 hover:bg-gray-700/50 hover:text-gray-100"
              title="Chat options"
            >
              <MoreVertical size={18} />
            </button>
            {chatMenuOpen && (
              <div
                className="absolute right-0 top-full z-50 mt-1 min-w-[240px] rounded-lg border border-gray-600 bg-bb-dark-elevated py-1 shadow-lg"
                onClick={(e) => e.stopPropagation()}
              >
                {(() => {
                  const oppCount = currentChat.tags.filter(
                    (t) => t.type === "opportunity" && t.opportunityId
                  ).length;
                  return (
                    <>
                      {oppCount >= 2 && (
                        <>
                          <div className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-gray-500">
                            <GitFork size={12} />
                            Break apart
                          </div>
                          {currentChat.tags
                            .filter((t) => t.type === "opportunity" && t.opportunityId)
                            .map((tag) => {
                              const opp = getOpportunityById(tag.opportunityId!);
                              const name = opp?.title ?? tag.opportunityId ?? "Opportunity";
                              return (
                                <button
                                  key={tag.opportunityId}
                                  onClick={async () => {
                                    const chatId = createChatForOpportunity(tag.opportunityId!);
                                    const title = opp?.title ?? "this opportunity";
                                    await submitPrompt(`Tell me about ${title}`, chatId);
                                    setChatMenuOpen(false);
                                  }}
                                  className="flex w-full items-center gap-2 border-l-2 border-transparent pl-4 pr-3 py-1.5 text-left text-sm text-gray-300 hover:border-bb-powder-blue/50 hover:bg-gray-700/50"
                                >
                                  <span className="text-gray-500">→</span>
                                  <span className="truncate">{name}</span>
                                </button>
                              );
                            })}
                          <div className="border-t border-gray-700/50" />
                        </>
                      )}
                      <button
                        onClick={() => setTagEditorOpen((open) => !open)}
                        className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm text-gray-300 hover:bg-gray-700/50"
                      >
                        <span>Edit tags</span>
                        <span className="text-xs text-gray-500">
                          {tagEditorOpen ? "Hide" : "Show"}
                        </span>
                      </button>
                      {tagEditorOpen && (
                        <div className="border-t border-gray-700/50 px-3 py-3">
                          <p className="text-[10px] font-medium uppercase tracking-wider text-gray-500">
                            Manual tags
                          </p>
                          <div className="mt-2 flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => toggleSimpleTag("strategy-only")}
                              className={`rounded-full px-3 py-1 text-xs transition-colors ${
                                currentChat.tags.some((tag) => tag.type === "strategy-only")
                                  ? "bg-purple-500/30 text-purple-200"
                                  : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                              }`}
                            >
                              Strategy
                            </button>
                            <button
                              type="button"
                              onClick={() => toggleSimpleTag("research-only")}
                              className={`rounded-full px-3 py-1 text-xs transition-colors ${
                                currentChat.tags.some((tag) => tag.type === "research-only")
                                  ? "bg-amber-500/30 text-amber-200"
                                  : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                              }`}
                            >
                              Research
                            </button>
                          </div>
                          <p className="mt-3 text-[10px] font-medium uppercase tracking-wider text-gray-500">
                            Opportunity tags
                          </p>
                          <input
                            type="text"
                            value={tagSearch}
                            onChange={(event) => setTagSearch(event.target.value)}
                            placeholder="Search opportunities..."
                            className="mt-2 w-full rounded border border-gray-600 bg-bb-dark px-2 py-1.5 text-xs text-gray-100 placeholder-gray-500 focus:border-bb-coral focus:outline-none focus:ring-1 focus:ring-bb-coral"
                          />
                          <div className="mt-2 max-h-40 space-y-1 overflow-y-auto">
                            {taggableOpportunities.map((opportunity) => {
                              const selected = currentChat.tags.some(
                                (tag) =>
                                  tag.type === "opportunity" &&
                                  tag.opportunityId === opportunity.id
                              );

                              return (
                                <button
                                  key={opportunity.id}
                                  type="button"
                                  onClick={() => toggleOpportunityTag(opportunity.id)}
                                  className={`flex w-full items-center justify-between gap-2 rounded px-2 py-1.5 text-left text-xs transition-colors ${
                                    selected
                                      ? "bg-bb-powder-blue/20 text-bb-powder-blue"
                                      : "text-gray-300 hover:bg-gray-700/50"
                                  }`}
                                >
                                  <span className="truncate">{opportunity.title}</span>
                                  {selected && <span>✓</span>}
                                </button>
                              );
                            })}
                            {taggableOpportunities.length === 0 && (
                              <p className="px-1 py-1 text-xs text-gray-500">
                                No opportunities match.
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                      <div className="border-t border-gray-700/50" />
                      {currentChat.archived ? (
                        <button
                          onClick={() => {
                            unarchiveChat(currentChatId);
                            setChatMenuOpen(false);
                          }}
                          className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-300 hover:bg-gray-700/50"
                        >
                          <ArchiveRestore size={14} />
                          Unarchive
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            archiveChat(currentChatId);
                            setChatMenuOpen(false);
                          }}
                          className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-300 hover:bg-gray-700/50"
                        >
                          <Archive size={14} />
                          Archive
                        </button>
                      )}
                      <div className="border-t border-gray-700/50" />
                      <p className="px-3 py-2 text-xs font-medium text-gray-500">
                        Fork with tag
                      </p>
                      <button
                        onClick={() => {
                          forkChat(currentChatId, null);
                          setChatMenuOpen(false);
                        }}
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-300 hover:bg-gray-700/50"
                      >
                        All tags
                      </button>
                      {currentChat.tags.map((tag, i) => (
                        <button
                          key={i}
                          onClick={() => {
                            forkChat(currentChatId, tag);
                            setChatMenuOpen(false);
                          }}
                          className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-300 hover:bg-gray-700/50"
                        >
                          <span
                            className={`rounded px-1.5 py-0.5 text-xs ${
                              TAG_COLORS[tag.type] ?? TAG_COLORS.opportunity
                            }`}
                          >
                            {getTagLabel(tag, getOpportunityById)}
                          </span>
                        </button>
                      ))}
                    </>
                  );
                })()}
              </div>
            )}
          </div>
        </div>
      )}
      <div
        className={`min-h-0 flex-1 overflow-y-auto ${
          mobileTopPadding ? "pt-14" : ""
        } ${isMobile ? "pb-40" : ""}`}
      >
        {isOnboardingPseudoChat ? (
          <OnboardingPseudoChat />
        ) : !currentChatId ? (
          <div className="flex flex-col items-center justify-center px-4 py-12 md:py-16">
            <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-xl">
              <BbLogo size={56} />
            </div>
            <h2 className="text-xl font-semibold text-gray-100">
              What would you like to know?
            </h2>
            <p className="mt-2 max-w-md text-center text-sm text-gray-400">
              Ask about matching opportunities, movement on specific buyers, or upload a doc to compare against your profile.
            </p>
            {renderSetupProgress()}
            {renderPromptSuggestions()}
          </div>
        ) : !hasContent ? (
          <div className="flex flex-col items-center justify-center px-4 py-12 md:py-16">
            <h2 className="text-xl font-semibold text-gray-100">
              What would you like to know?
            </h2>
            {renderSetupProgress()}
            {renderPromptSuggestions()}
          </div>
        ) : (
          <div className="mx-auto max-w-3xl space-y-6 px-4 py-8">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-4 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {msg.role === "assistant" && (
                  <AssistantAvatar size={32} />
                )}
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                    msg.role === "user"
                      ? "bg-bb-coral text-white"
                      : (() => {
                          const decisionBlock = findDecisionBlock(msg.blocks);
                          if (!decisionBlock) return "bg-bb-dark-elevated border border-gray-600 shadow-sm";
                          const ui = DECISION_UI[decisionBlock.decisionState];
                          return `bg-bb-dark-elevated border shadow-sm ${ui.border}`;
                        })()
                  }`}
                >
                  {msg.role === "user" ? (
                    <>
                      <p className="text-sm">{msg.content}</p>
                      {msg.attachments?.map((a, i) => (
                        <div
                          key={i}
                          className="mt-2 flex items-center gap-2 text-xs opacity-90"
                        >
                          <FileText size={14} />
                          {a.name}
                        </div>
                      ))}
                    </>
                  ) : (
                    <div className="space-y-2">
                      {msg.blocks?.map((b, i) =>
                        renderBlock(b, i, onChatAboutOpp, onBreakApart, opportunityIds.length >= 2)
                      ) ?? (
                        <p className="text-gray-300">{msg.content}</p>
                      )}
                    </div>
                  )}
                </div>
                {msg.role === "user" && (
                  <UserAvatar profile={currentUserProfile} size={32} />
                )}
              </div>
            ))}
            {isLoading && (
              <div className="flex gap-4">
                <AssistantAvatar size={32} />
                <div className="rounded-2xl border border-gray-600 bg-bb-dark-elevated px-4 py-3 shadow-sm">
                  <div className="flex gap-1">
                    <span className="bb-loading-dot bb-loading-dot-1" />
                    <span className="bb-loading-dot bb-loading-dot-2" />
                    <span className="bb-loading-dot bb-loading-dot-3" />
                  </div>
                </div>
              </div>
            )}
            <div ref={scrollRef} />
          </div>
        )}
      </div>

      {!isOnboardingPseudoChat && (
        <div
          className={`border-t border-gray-700/50 bg-bb-dark-elevated ${
            isMobile
              ? "fixed bottom-0 left-0 right-0 z-50 p-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)]"
              : "p-4"
          }`}
        >
          <form onSubmit={handleSubmit} className="mx-auto max-w-3xl">
            {attachments.length > 0 && (
              <div className="mb-2 flex flex-wrap gap-2">
                {attachments.map((a, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1 rounded-full bg-gray-700 px-3 py-1 text-xs text-gray-300"
                  >
                    <FileText size={12} />
                    {a.name}
                    {a.extractionStatus && (
                      <span
                        className={`rounded px-1.5 py-0.5 text-[10px] ${
                          a.extractionStatus === "ready"
                            ? "bg-bb-green/20 text-bb-green"
                            : a.extractionStatus === "pending"
                              ? "bg-bb-powder-blue/20 text-bb-powder-blue"
                              : "bg-bb-orange/20 text-bb-orange"
                        }`}
                      >
                        {a.extractionStatus}
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => removeAttachment(i)}
                      className="ml-1 text-gray-400 hover:text-gray-200"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
            <div className="flex gap-2 rounded-xl border border-gray-600 bg-bb-dark shadow-sm focus-within:border-bb-coral focus-within:ring-1 focus-within:ring-bb-coral">
              <DocumentUploader
                variant="icon"
                onUploadComplete={(assetId, filename) => {
                  alert(`Document ${filename} has been uploaded to the Quarantine Vault and securely ingested.`);
                }}
              />
              <input
                type="text"
                value={input}
                onChange={(e) => {
                  if (countdown !== null) cancelCountdown();
                  setInput(e.target.value);
                }}
                placeholder="Ask about opportunities, search by name, or upload a doc to review..."
                className="flex-1 bg-transparent px-2 py-3 text-gray-100 placeholder-gray-500 focus:outline-none"
              />
              <button
                type="submit"
                disabled={isLoading || isExtractingAttachments || (!input.trim() && attachments.length === 0)}
                className="flex min-w-[2.5rem] items-center justify-center rounded-r-xl bg-bb-coral px-4 py-3 text-white transition-colors hover:bg-bb-coral/90 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isExtractingAttachments ? (
                  <span className="text-xs font-medium">Extracting...</span>
                ) : countdown !== null ? (
                  <span className="text-sm font-medium tabular-nums">{countdown}</span>
                ) : (
                  <Send size={20} />
                )}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
