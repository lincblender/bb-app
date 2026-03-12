import { NextResponse } from "next/server";
import { getAuthenticatedTenantContext } from "@/lib/connectors/server";
import { invokeSupabaseEdgeFunction } from "@/lib/supabase/edge-functions";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const context = await getAuthenticatedTenantContext();
  if (!context) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const edgeResponse = await invokeSupabaseEdgeFunction(
      "organisation-ai-search",
      body,
      {
        "x-bidblender-user-id": context.user.id,
        "x-bidblender-tenant-id": context.tenantId,
        ...(context.user.email ? { "x-bidblender-user-email": context.user.email } : {}),
      }
    );

    return NextResponse.json(edgeResponse.body, { status: edgeResponse.response.status });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "BidBlender AI could not search for the organisation.",
      },
      { status: 500 }
    );
  }
}
