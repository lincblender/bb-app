import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  assertLinkedInCompanyAdminConfiguration,
  buildLinkedInCompanyAdminAuthorizeUrl,
  createLinkedInCompanyAdminPkcePair,
  isLinkedInCompanyAdminPkceEnabled,
} from "@/lib/connectors/linkedin-company-admin";
import { getAuthenticatedTenantContext } from "@/lib/connectors/server";

export const dynamic = "force-dynamic";

const LINKEDIN_ADMIN_STATE_COOKIE = "bidblender_linkedin_admin_state";
const LINKEDIN_ADMIN_VERIFIER_COOKIE = "bidblender_linkedin_admin_verifier";
const LINKEDIN_ADMIN_NEXT_COOKIE = "bidblender_linkedin_admin_next";

function isSafeRelativePath(path: string | null) {
  return !!path && path.startsWith("/") && !path.startsWith("//") && !path.includes("://");
}

function buildStartErrorRedirect(requestUrl: string, next: string, detail: string) {
  const destination = new URL(next, requestUrl);
  destination.searchParams.set("linkedin_admin", "error");
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

    assertLinkedInCompanyAdminConfiguration();

    const redirectUri = `${url.origin}/api/connectors/linkedin/company-admin/auth/callback`;
    const state = crypto.randomUUID();
    const usePkce = isLinkedInCompanyAdminPkceEnabled();
    const pkcePair = usePkce ? createLinkedInCompanyAdminPkcePair() : null;
    const cookieStore = await cookies();

    cookieStore.set(LINKEDIN_ADMIN_STATE_COOKIE, state, {
      httpOnly: true,
      sameSite: "lax",
      secure: url.protocol === "https:",
      path: "/",
      maxAge: 60 * 10,
    });
    cookieStore.set(LINKEDIN_ADMIN_NEXT_COOKIE, next, {
      httpOnly: true,
      sameSite: "lax",
      secure: url.protocol === "https:",
      path: "/",
      maxAge: 60 * 10,
    });

    if (pkcePair) {
      cookieStore.set(LINKEDIN_ADMIN_VERIFIER_COOKIE, pkcePair.verifier, {
        httpOnly: true,
        sameSite: "lax",
        secure: url.protocol === "https:",
        path: "/",
        maxAge: 60 * 10,
      });
    } else {
      cookieStore.delete(LINKEDIN_ADMIN_VERIFIER_COOKIE);
    }

    return NextResponse.redirect(
      buildLinkedInCompanyAdminAuthorizeUrl({
        redirectUri,
        state,
        challenge: pkcePair?.challenge,
      })
    );
  } catch (error) {
    return NextResponse.redirect(
      buildStartErrorRedirect(
        request.url,
        next,
        error instanceof Error ? error.message : "LinkedIn company-page authorisation could not be started."
      )
    );
  }
}
