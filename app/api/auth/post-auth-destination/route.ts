import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { resolvePostAuthDestination } from "@/lib/auth/post-auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ destination: "/auth/signin" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const destination = await resolvePostAuthDestination(
      supabase,
      user,
      searchParams.get("next")
    );

    return NextResponse.json({ destination });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to resolve post-auth destination.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
