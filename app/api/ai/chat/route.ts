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

    if (!tenantId) {
      return NextResponse.json(
        { error: "Unauthorized: Tenant ID missing", blocks: null },
        { status: 401 }
      );
    }
    const opp = primaryOppId && tenantData
      ? tenantData.opportunities.find((o) => o.id === primaryOppId)
      : null;

    const lowerMessage = message.toLowerCase().trim();

    const readyAttachments = attachments.filter(
      (attachment) => attachment.extractionStatus === "ready" && attachment.extractedText
    );
    
    const failedAttachments = attachments.filter(
      (attachment) => attachment.extractionStatus && attachment.extractionStatus !== "ready"
    );

    const {
      buildOpportunityComparisonSet,
      buildCompanyProfile,
      buildNetworkContextForBuyer,
      buildOpportunitySummary,
      buildWorkspaceKnowledgeContext,
    } = await import("@/lib/ai/build-context");
    
    // 1. Try Deterministic Workspace Lookup first
    const { resolveWorkspaceOpportunityLookup } = await import("@/lib/chat/workspace-query");
    const lookupResult = resolveWorkspaceOpportunityLookup(message, tenantData, primaryOppId !== null);
    
    if (lookupResult) {
      if (readyAttachments.length > 0) {
        const analysedNames = readyAttachments.map((attachment) => attachment.name).join(", ");
        lookupResult.blocks.unshift({
          type: "text",
          content: `I noticed you uploaded **${analysedNames}**, but I handled your search request first.`,
        });
      }
      return NextResponse.json({ blocks: lookupResult.blocks });
    }

    // 2. Otherwise run deep AI intent and Analysis
    const { analysis_type, inputs } = createChatAnalysisRequest(message, {
      tenantId: tenantId,
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

    if (readyAttachments.length > 0) {
      inputs.documents = readyAttachments.map((attachment, index) => ({
        id: `attachment-${index + 1}`,
        name: attachment.name,
        content: attachment.extractedText ?? "",
      }));
    }

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
      tenant_id: tenantId,
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
