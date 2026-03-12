import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthenticatedTenantContext } from "@/lib/connectors/server";
import {
  normaliseOrganisationProfileInput,
  organisationProfileSaveSchema,
} from "@/lib/organisation/profile";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const context = await getAuthenticatedTenantContext();
  if (!context) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  let parsedBody: z.infer<typeof organisationProfileSaveSchema>;
  try {
    const body = (await request.json()) as unknown;
    parsedBody = organisationProfileSaveSchema.parse(body);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof z.ZodError
            ? error.issues[0]?.message ?? "Organisation profile payload is invalid."
            : "Organisation profile payload is invalid.",
      },
      { status: 400 }
    );
  }

  const { supabase, tenantId } = context;
  const normalised = normaliseOrganisationProfileInput(parsedBody);
  const organisationId = normalised.id ?? `bidder-${crypto.randomUUID()}`;

  const { error } = await supabase.from("organisations").upsert(
    {
      id: organisationId,
      tenant_id: tenantId,
      type: "bidder",
      name: normalised.name,
      description: normalised.description,
      website_url: normalised.websiteUrl,
      linkedin_url: normalised.linkedinUrl,
      logo_url: normalised.logoUrl,
      location: normalised.location,
      social_profiles: normalised.socialProfiles,
      sectors: normalised.sectors,
      capabilities: normalised.capabilities,
      certifications: normalised.certifications,
      individual_qualifications: normalised.individualQualifications,
      case_studies: normalised.caseStudies,
      strategic_preferences: normalised.strategicPreferences,
      target_markets: normalised.targetMarkets,
      partner_gaps: normalised.partnerGaps,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" }
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    saved: true,
    organisationId,
    profile: {
      ...normalised,
      id: organisationId,
    },
  });
}

export async function DELETE(request: Request) {
  const context = await getAuthenticatedTenantContext();
  if (!context) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const url = new URL(request.url);
  const organisationId = url.searchParams.get("id")?.trim();

  if (!organisationId) {
    return NextResponse.json(
      { error: "Organisation ID is required." },
      { status: 400 }
    );
  }

  const { supabase, tenantId } = context;
  const { error } = await supabase
    .from("organisations")
    .delete()
    .eq("id", organisationId)
    .eq("tenant_id", tenantId)
    .eq("type", "bidder");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ deleted: true, organisationId });
}
