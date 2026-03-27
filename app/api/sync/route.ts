import { NextResponse } from "next/server";
import { fetchCurrentTenantId } from "@/lib/workspace/server";
import { syncTenantData } from "@/lib/db/sync";

export const dynamic = "force-dynamic";

export async function POST() {
  const tenantId = await fetchCurrentTenantId();
  if (!tenantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await syncTenantData(tenantId);
    return NextResponse.json({ success: true, syncedAt: new Date().toISOString() });
  } catch (error) {
    console.error("Manual sync failed", error);
    return NextResponse.json(
      { error: "Sync failed for tenant" },
      { status: 500 }
    );
  }
}
