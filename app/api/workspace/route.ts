import { NextResponse } from "next/server";
import { fetchWorkspaceData } from "@/lib/workspace/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const data = await fetchWorkspaceData();
  if (!data) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json(data);
}
