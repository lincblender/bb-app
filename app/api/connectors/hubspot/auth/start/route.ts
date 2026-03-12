import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  assertHubSpotOAuthConfiguration,
  buildHubSpotAuthorizeUrl,
  createHubSpotPkcePair,
} from "@/lib/connectors/hubspot";
import { getAuthenticatedTenantContext } from "@/lib/connectors/server";

export const dynamic = "force-dynamic";

const HUBSPOT_STATE_COOKIE = "bidblender_hubspot_state";
const HUBSPOT_VERIFIER_COOKIE = "bidblender_hubspot_verifier";
const HUBSPOT_NEXT_COOKIE = "bidblender_hubspot_next";

function isSafeRelativePath(path: string | null) {
  return !!path && path.startsWith("/") && !path.startsWith("//") && !path.includes("://");
}

function buildStartErrorRedirect(requestUrl: string, next: string, detail: string) {
  const destination = new URL(next, requestUrl);
  destination.searchParams.set("hubspot", "error");
  destination.searchParams.set("detail", detail);
  return destination;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const next = isSafeRelativePath(url.searchParams.get("next"))
    ? (url.searchParams.get("next") as string)
    : "/console/connectors";

  try {
    const context = await getAuthenticatedTenantContext();
    if (!context) {
      return NextResponse.redirect(new URL("/auth/signin?error=auth_required", request.url));
    }

    assertHubSpotOAuthConfiguration();

    const redirectUri = `${url.origin}/api/connectors/hubspot/auth/callback`;
    const state = crypto.randomUUID();
    const { verifier, challenge } = createHubSpotPkcePair();
    const cookieStore = await cookies();

    cookieStore.set(HUBSPOT_STATE_COOKIE, state, {
      httpOnly: true,
      sameSite: "lax",
      secure: url.protocol === "https:",
      path: "/",
      maxAge: 60 * 10,
    });
    cookieStore.set(HUBSPOT_VERIFIER_COOKIE, verifier, {
      httpOnly: true,
      sameSite: "lax",
      secure: url.protocol === "https:",
      path: "/",
      maxAge: 60 * 10,
    });
    cookieStore.set(HUBSPOT_NEXT_COOKIE, next, {
      httpOnly: true,
      sameSite: "lax",
      secure: url.protocol === "https:",
      path: "/",
      maxAge: 60 * 10,
    });

    return NextResponse.redirect(
      buildHubSpotAuthorizeUrl({
        redirectUri,
        state,
        challenge,
      })
    );
  } catch (error) {
    console.error("Failed to start HubSpot authorisation", error);

    return NextResponse.redirect(
      buildStartErrorRedirect(
        request.url,
        next,
        error instanceof Error
          ? error.message
          : "HubSpot authorisation could not be started."
      )
    );
  }
}
