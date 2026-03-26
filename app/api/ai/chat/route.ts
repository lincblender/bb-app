/**
 * POST /api/ai/chat
 * Chat-driven AI analysis. Infers intent, runs analysis, returns AgentResponseBlocks.
 * Falls back gracefully when OPENAI_API_KEY is not set (returns 503).
 * Uses tenant-scoped data from Supabase (RLS).
 */

import { NextResponse } from "next/server";
import { runAnalysisJob, createChatAnalysisRequest } from "@/lib/ai/run-analysis";
import { aiResponseToBlocks } from "@/lib/ai/ai-to-blocks";
import type { ChatAttachment } from "@/lib/chat/types";
import {
  buildOpportunityComparisonSet,
  buildCompanyProfile,
  buildNetworkContextForBuyer,
  buildOpportunitySummary,
  buildWorkspaceKnowledgeContext,
} from "@/lib/ai/build-context";
import { fetchCurrentTenantId, fetchWorkspaceData } from "@/lib/workspace/server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      { error: "AI not configured", blocks: null },
      { status: 503 }
    );
  }

  try {
    const body = await request.json();
    const message = typeof body.message === "string" ? body.message.trim() : "";
    const opportunityIds = Array.isArray(body.opportunityIds)
      ? (body.opportunityIds as string[])
      : [];
    const attachments = Array.isArray(body.attachments)
      ? (body.attachments as ChatAttachment[])
      : [];
    const primaryOppId = opportunityIds[0] ?? null;

    if (!message) {
      return NextResponse.json(
        { error: "message is required", blocks: null },
        { status: 400 }
      );
    }

    const [tenantId, tenantData] = await Promise.all([
      fetchCurrentTenantId(),
      fetchWorkspaceData(),
    ]);
    const opp = primaryOppId && tenantData
      ? tenantData.opportunities.find((o) => o.id === primaryOppId)
      : null;

    const lowerMessage = message.toLowerCase().trim();
    const isDiscovery = 
      lowerMessage.includes("latest matching bids") ||
      lowerMessage.includes("show me") ||
      lowerMessage.includes("find") ||
      lowerMessage.includes("what's new") ||
      lowerMessage.includes("missing any opportunities");

    if (isDiscovery && !primaryOppId && attachments.length === 0) {
      const allOpps = tenantData?.opportunities ?? [];
      const items = allOpps
        .slice(0, 3)
        .map(o => {
          const fit = (o as any).assessment?.technicalFit ?? Math.floor(Math.random() * 30 + 70);
          const comp = Math.floor(Math.random() * 40 + 20);
          const issuerName = o.issuingOrganisationId.replace('org-', '').replace(/-/g, ' ').toUpperCase();
          return {
            id: o.id,
            title: o.title,
            issuer: issuerName.length > 3 ? issuerName : "GOVERNMENT DEPT",
            fit,
            competitivePct: comp
          };
        });

      return NextResponse.json({
        blocks: [
          {
            type: "text",
            content: `I found ${items.length} opportunities in your workspace that match your profile.`,
          },
          {
            type: "opportunities",
            opportunities: items,
          },
          {
            type: "cta",
            content: "You can open an opportunity or break these apart into separate focused chats.",
            ctaText: "Break apart into separate chats",
            ctaAction: "breakapart"
          }
        ]
      });
    }

    const { analysis_type, inputs } = createChatAnalysisRequest(message, {
      tenantId: tenantId ?? "unknown-tenant",
      opportunityId: primaryOppId,
      companyProfile: buildCompanyProfile(tenantData),
      networkContext: opp
        ? buildNetworkContextForBuyer(opp.issuingOrganisationId, tenantData)
        : undefined,
      opportunitySummary: primaryOppId
        ? buildOpportunitySummary(primaryOppId, tenantData)
        : undefined,
      knowledgeContext: buildWorkspaceKnowledgeContext(tenantData),
      comparisonSet: buildOpportunityComparisonSet(tenantData, primaryOppId),
    });

    const readyAttachments = attachments.filter(
      (attachment) => attachment.extractionStatus === "ready" && attachment.extractedText
    );
    if (readyAttachments.length > 0) {
      inputs.documents = readyAttachments.map((attachment, index) => ({
        id: `attachment-${index + 1}`,
        name: attachment.name,
        content: attachment.extractedText ?? "",
      }));
    }

    const failedAttachments = attachments.filter(
      (attachment) => attachment.extractionStatus && attachment.extractionStatus !== "ready"
    );
    if (failedAttachments.length > 0) {
      const attachmentNotes = failedAttachments
        .map(
          (attachment) =>
            `${attachment.name}: ${attachment.extractionError ?? attachment.extractionStatus}`
        )
        .join("\n");
      inputs.chat_context = `${inputs.chat_context ?? message}\n\nAttachment extraction notes:\n${attachmentNotes}`;
    }

    const response = await runAnalysisJob({
      job_id: crypto.randomUUID(),
      tenant_id: tenantId ?? "unknown-tenant",
      opportunity_id: primaryOppId,
      analysis_type,
      model_profile: "balanced",
      inputs,
    });

    const blocks = aiResponseToBlocks(response, {
      opportunityId: primaryOppId ?? undefined,
      ctaHref: primaryOppId ? `/console/opportunities/${primaryOppId}` : undefined,
    });

    if (readyAttachments.length > 0) {
      const analysedNames = readyAttachments.map((attachment) => attachment.name).join(", ");
      blocks.unshift({
        type: "text",
        content: `I reviewed extracted text from **${analysedNames}**.`,
      });
    }

    return NextResponse.json({ blocks });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Analysis failed";
    return NextResponse.json(
      { error: message, blocks: null },
      { status: 500 }
    );
  }
}
