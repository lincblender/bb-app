"use client";

import { useCallback } from "react";
import { useChat } from "./ChatContext";
import { useWorkspaceData, useTenantDataContext } from "@/lib/workspace/client";
import { fetchCurrentTenantId } from "@/lib/workspace/client-tenant";
import { resolveWorkspaceOpportunityLookup } from "./workspace-query";
import { resolveSetupAssistant } from "./setup-assistant";
import type { AgentResponseBlock, ChatAttachment, ChatMessage } from "./types";
import type { ScreenContext } from "./chat-context";
import { createClient } from "@/lib/supabase/client";
import { getSetupPillarStatuses } from "@/lib/connectors/setup-status";

interface FetchAiChatResult {
  blocks: AgentResponseBlock[] | null;
  error: string | null;
}

async function fetchAiChatBlocks(
  message: string,
  opportunityIds: string[],
  attachments?: ChatAttachment[]
): Promise<FetchAiChatResult> {
  try {
    const res = await fetch("/api/ai/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, opportunityIds, attachments }),
    });

    const data = await res.json().catch(() => null);
    if (!res.ok) {
      return {
        blocks: null,
        error:
          typeof data?.error === "string" ? data.error : `AI request failed with status ${res.status}.`,
      };
    }

    if (!Array.isArray(data?.blocks)) {
      return {
        blocks: null,
        error: "AI returned no structured blocks.",
      };
    }

    return {
      blocks: data.blocks as AgentResponseBlock[],
      error: null,
    };
  } catch (error) {
    return {
      blocks: null,
      error: error instanceof Error ? error.message : "AI request failed.",
    };
  }
}

function buildAttachmentGuardrailBlocks(
  attachments: ChatAttachment[],
  reason: "not_extracted" | "analysis_unavailable"
): AgentResponseBlock[] {
  const ready = attachments.filter((attachment) => attachment.extractionStatus === "ready");
  const failed = attachments.filter((attachment) => attachment.extractionStatus !== "ready");

  if (reason === "not_extracted") {
    return [
      {
        type: "text",
        content:
          "I can see the document upload, but I do not have readable document text to analyse yet. I’m not going to pretend I reviewed it.",
      },
      {
        type: "text",
        content:
          failed.length > 0
            ? "**Extraction status:**\n" +
              failed
                .map(
                  (attachment) =>
                    `• ${attachment.name}: ${attachment.extractionError ?? attachment.extractionStatus ?? "unavailable"}`
                )
                .join("\n")
            : "No extractable attachment text was available.",
      },
    ];
  }

  return [
    {
      type: "text",
      content:
        "I extracted document text, but the AI analysis step was unavailable. I’m not going to fabricate a review from partial context.",
    },
    {
      type: "text",
      content:
        `**Extracted documents:** ${ready.map((attachment) => attachment.name).join(", ")}` +
        (failed.length > 0
          ? `\n\n**Unprocessed attachments:**\n${failed
              .map(
                (attachment) =>
                  `• ${attachment.name}: ${attachment.extractionError ?? attachment.extractionStatus ?? "unavailable"}`
              )
              .join("\n")}`
          : ""),
    },
  ];
}

function buildAiUnavailableBlocks(error?: string | null): AgentResponseBlock[] {
  return [
    {
      type: "text",
      content:
        "Whoops! It looks like there was a problem with the AI engine. Please reach out to support@bidblender.com.au for assistance.",
    },
    {
      type: "text",
      content: error ? `**Reason:** ${error}` : "No additional error detail was returned.",
    },
  ];
}

function extractFirstUrl(message: string): string | null {
  const match = message.match(/https?:\/\/\S+/i);
  return match?.[0] ?? null;
}

function stripFileExtension(name: string): string {
  return name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").trim();
}

function deriveOpportunityTitle(message: string, attachments: ChatAttachment[]): string {
  const firstAttachment = attachments[0];
  if (firstAttachment?.name) {
    return stripFileExtension(firstAttachment.name);
  }

  const url = extractFirstUrl(message);
  if (url) {
    try {
      const parsed = new URL(url);
      const tail = decodeURIComponent(parsed.pathname.split("/").filter(Boolean).pop() ?? "");
      if (tail) return stripFileExtension(tail);
      return parsed.hostname;
    } catch {
      return url;
    }
  }

  return message.slice(0, 80).trim() || "Imported opportunity";
}

function deriveIssuerName(message: string): string {
  const url = extractFirstUrl(message);
  if (!url) return "Imported issuer";
  try {
    const parsed = new URL(url);
    return parsed.hostname.replace(/^www\./, "");
  } catch {
    return "Imported issuer";
  }
}

function extractDecisionMetrics(blocks: AgentResponseBlock[]) {
  const decision = blocks.find(
    (block): block is AgentResponseBlock & { type: "decision_signal"; decisionState?: "Green" | "Amber" | "Red" } =>
      block.type === "decision_signal"
  );
  if (!decision) return null;

  const deliveryFit = decision.dimensions?.find((dimension) => dimension.label === "Delivery fit")?.score ?? 0;
  const buyerAccess = decision.dimensions?.find((dimension) => dimension.label === "Buyer access")?.score ?? 0;
  const pursuitCapacity = decision.dimensions?.find((dimension) => dimension.label === "Pursuit capacity")?.score ?? 0;

  return {
    status:
      decision.decisionState === "Green"
        ? "pursuing"
        : decision.decisionState === "Red"
          ? "passed"
          : "reviewing",
    assessment: {
      technical_fit: deliveryFit,
      network_strength: buyerAccess,
      organisational_complexity: Math.max(0, 100 - pursuitCapacity),
      recommendation:
        decision.decisionState === "Green"
          ? "sweet-spot"
          : decision.decisionState === "Amber"
            ? "relationship-edge"
            : "low-priority",
      strategy_posture:
        decision.decisionState === "Green"
          ? "pursue-directly"
          : decision.decisionState === "Amber"
            ? "relationship-led-play"
            : "monitor-only",
    },
  };
}

async function ensureOpportunityForPrompt(message: string, attachments: ChatAttachment[]) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const tenantId = await fetchCurrentTenantId();
  if (!tenantId) return null;

  const issuerName = deriveIssuerName(message);
  let buyerOrgId: string | null = null;
  const { data: existingBuyer, error: existingBuyerError } = await supabase
    .from("organisations")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("type", "buyer")
    .eq("name", issuerName)
    .maybeSingle();
  if (existingBuyerError) {
    console.error("Failed to look up buyer organisation", existingBuyerError);
    return null;
  }

  if (existingBuyer?.id) {
    buyerOrgId = existingBuyer.id as string;
  } else {
    buyerOrgId = `buyer-${crypto.randomUUID()}`;
    const { error: buyerInsertError } = await supabase.from("organisations").insert({
      id: buyerOrgId,
      tenant_id: tenantId,
      type: "buyer",
      name: issuerName,
      description: "Imported automatically from bid/no-bid workflow.",
      subsidiaries: [],
      acquisition_history: [],
    });
    if (buyerInsertError) {
      console.error("Failed to create buyer organisation", buyerInsertError);
      return null;
    }
  }

  const opportunityId = `opp-${crypto.randomUUID()}`;
  const title = deriveOpportunityTitle(message, attachments);
  const sourceUrl = extractFirstUrl(message);
  const extractedSummary = attachments
    .map((attachment) => attachment.extractedText?.slice(0, 400) ?? "")
    .find(Boolean);
  const summary = extractedSummary || (sourceUrl ? `Imported from ${sourceUrl}` : "Imported from chat workflow.");

  const { error: opportunityInsertError } = await supabase.from("opportunities").insert({
    id: opportunityId,
    tenant_id: tenantId,
    issuing_organisation_id: buyerOrgId,
    title,
    category: "Imported RFT",
    source_id: sourceUrl ?? null,
    due_date: null,
    summary,
    status: "reviewing",
  });
  if (opportunityInsertError) {
    console.error("Failed to create opportunity from chat", opportunityInsertError);
    return null;
  }

  const { error: assessmentUpsertError } = await supabase.from("opportunity_assessments").upsert({
    opportunity_id: opportunityId,
    technical_fit: 0,
    network_strength: 0,
    organisational_complexity: 0,
    recommendation: "low-priority",
    strategy_posture: "monitor-only",
  });
  if (assessmentUpsertError) {
    console.error("Failed to create opportunity assessment", assessmentUpsertError);
  }

  const { error: eventInsertError } = await supabase.from("intelligence_events").insert({
    id: `event-${crypto.randomUUID()}`,
    tenant_id: tenantId,
    type: "opportunity_scanned",
    description: `Opportunity created from chat: ${title}`,
    opportunity_id: opportunityId,
  });
  if (eventInsertError) {
    console.error("Failed to create intelligence event", eventInsertError);
  }

  return opportunityId;
}

/**
 * Shared submit logic for both PromptScreen and ChatTopBar.
 * Creates/updates chat, adds messages, infers tags, handles select_opportunity.
 */
export function useSubmitPrompt() {
  const {
    chats,
    createChat,
    addMessage,
    updateChatTags,
    setOpportunityContext,
    inferAndApplyTags,
  } = useChat();
  const tenantData = useTenantDataContext();
  const { refetch, organisations, opportunities, connectorSources } = useWorkspaceData();

  return useCallback(
    async (
      text: string,
      options?: {
        targetChatId?: string;
        currentChatId?: string;
        attachments?: ChatAttachment[];
        screenContext?: ScreenContext | null;
      }
    ) => {
      const trimmed = text.trim();
      if (!trimmed && !(options?.attachments?.length)) return null;
      const requestMessage =
        trimmed || "Review the attached document against my capabilities.";

      const chatId =
        options?.targetChatId ??
        options?.currentChatId ??
        createChat(
          options?.screenContext?.opportunityId
            ? [{ type: "opportunity", opportunityId: options.screenContext.opportunityId }]
            : []
        );

      const userMsg: ChatMessage = {
        id: `user-${Date.now()}`,
        role: "user",
        content: requestMessage,
        attachments: options?.attachments,
        timestamp: new Date(),
      };
      addMessage(userMsg, chatId);

      const targetChat = chats.find((c) => c.id === chatId);
      let oppIdsForChat = options?.screenContext?.opportunityId
        ? [options.screenContext.opportunityId]
        : (targetChat?.tags
            .filter((t) => t.type === "opportunity" && t.opportunityId)
            .map((t) => t.opportunityId!) ?? []);
      const attachments = options?.attachments ?? [];

      const shouldCreateOpportunity =
        oppIdsForChat.length === 0 &&
        ((options?.attachments?.length ?? 0) > 0 || !!extractFirstUrl(requestMessage));

      if (shouldCreateOpportunity) {
        const createdOpportunityId = await ensureOpportunityForPrompt(requestMessage, attachments);
        if (createdOpportunityId) {
          oppIdsForChat = [createdOpportunityId];
          updateChatTags(chatId, [{ type: "opportunity", opportunityId: createdOpportunityId }]);
          setOpportunityContext(createdOpportunityId);
          await refetch();
        }
      }

      let blocks: AgentResponseBlock[];
      const readyAttachments = attachments.filter((attachment) => attachment.extractionStatus === "ready");
      const setupStatuses = getSetupPillarStatuses({
        connectors: connectorSources,
        organisations,
        opportunities,
      });
      const setupBlocks = resolveSetupAssistant(requestMessage, setupStatuses);
      const lookupResult = resolveWorkspaceOpportunityLookup(
        requestMessage,
        tenantData,
        oppIdsForChat.length > 0
      );

      if (attachments.length > 0 && readyAttachments.length === 0) {
        blocks = buildAttachmentGuardrailBlocks(attachments, "not_extracted");
      } else if (setupBlocks) {
        blocks = setupBlocks;
      } else if (lookupResult) {
        blocks = lookupResult.blocks;
      } else {
        const aiResult = await fetchAiChatBlocks(requestMessage, oppIdsForChat, attachments);
        blocks =
          aiResult.blocks ??
          (attachments.length > 0
            ? buildAttachmentGuardrailBlocks(attachments, "analysis_unavailable")
            : buildAiUnavailableBlocks(aiResult.error));
      }

      const textBlocks = blocks.filter((b) => b.type === "text");
      const ctaBlocks = blocks.filter((b) => b.type === "cta");
      const otherBlocks = blocks.filter((b) => b.type !== "text" && b.type !== "cta");
      const isStaggered =
        textBlocks.length >= 3 &&
        textBlocks[0].content.includes("**Impact assessment**");

      if (isStaggered) {
        for (let i = 0; i < textBlocks.length; i++) {
          await new Promise((r) => setTimeout(r, i === 0 ? 600 : 900));
          addMessage(
            {
              id: `assistant-${Date.now()}-${i}`,
              role: "assistant",
              content: textBlocks[i].content,
              blocks: [textBlocks[i]],
              timestamp: new Date(),
            },
            chatId
          );
        }
        if (ctaBlocks.length > 0) {
          await new Promise((r) => setTimeout(r, 600));
          addMessage(
            {
              id: `assistant-${Date.now()}-cta`,
              role: "assistant",
              content: ctaBlocks[0].content,
              blocks: [...ctaBlocks, ...otherBlocks],
              timestamp: new Date(),
            },
            chatId
          );
        }
      } else {
        await new Promise((r) => setTimeout(r, 800 + Math.random() * 700));
        const assistantContent =
          textBlocks.map((b) => b.content).join("\n\n") ||
          blocks.find((block) => block.content.trim().length > 0)?.content ||
          "Shared workspace results.";
        addMessage(
          {
            id: `assistant-${Date.now()}`,
            role: "assistant",
            content: assistantContent,
            blocks,
            timestamp: new Date(),
          },
          chatId
        );
      }

      const oppIds = blocks
        .filter(
          (b): b is AgentResponseBlock & { opportunities: { id: string }[] } =>
            b.type === "opportunities" && !!b.opportunities?.length
        )
        .flatMap((b) => b.opportunities.map((o) => o.id));

      const isStrategy =
        requestMessage.toLowerCase().includes("review") ||
        requestMessage.toLowerCase().includes("bid") ||
        requestMessage.toLowerCase().includes("worth");
      const decisionSignal = blocks.find(
        (b): b is AgentResponseBlock & { type: "decision_signal"; recommendation?: string } =>
          b.type === "decision_signal"
      );
      const isResearch =
        requestMessage.toLowerCase().includes("latest") ||
        requestMessage.toLowerCase().includes("movement") ||
        requestMessage.toLowerCase().includes("matching") ||
        decisionSignal?.recommendation === "Research";

      inferAndApplyTags(oppIds, isStrategy, isResearch, chatId);

      const primaryOpportunityId = oppIdsForChat[0] ?? oppIds[0];
      if (primaryOpportunityId) {
        const decisionMetrics = extractDecisionMetrics(blocks);
        if (decisionMetrics) {
          const supabase = createClient();
          const { error: opportunityUpdateError } = await supabase
            .from("opportunities")
            .update({ status: decisionMetrics.status })
            .eq("id", primaryOpportunityId);
          if (opportunityUpdateError) {
            console.error("Failed to update opportunity status", opportunityUpdateError);
          }
          const { error: assessmentUpsertError } = await supabase.from("opportunity_assessments").upsert({
            opportunity_id: primaryOpportunityId,
            ...decisionMetrics.assessment,
          });
          if (assessmentUpsertError) {
            console.error("Failed to update opportunity assessment", assessmentUpsertError);
          }
          await refetch();
        }
      }

      const selectBlock = blocks.find(
        (b): b is AgentResponseBlock & { opportunityId: string } =>
          b.type === "select_opportunity" && !!b.opportunityId
      );
      if (selectBlock) {
        setOpportunityContext(selectBlock.opportunityId);
        const chat = chats.find((c) => c.id === chatId);
        if (
          chat &&
          !chat.tags.some(
            (t) => t.type === "opportunity" && t.opportunityId === selectBlock.opportunityId
          )
        ) {
          updateChatTags(chatId, [
            ...chat.tags,
            { type: "opportunity" as const, opportunityId: selectBlock.opportunityId },
          ]);
        }
      }

      return chatId;
    },
    [
      chats,
      createChat,
      addMessage,
      updateChatTags,
      setOpportunityContext,
      inferAndApplyTags,
      refetch,
      tenantData,
      connectorSources,
      organisations,
      opportunities,
    ]
  );
}
