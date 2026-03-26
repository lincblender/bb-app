/**
 * Supabase proxy — refreshes session and passes cookies
 * Required for auth to work across server/client
 */

import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { resolvePostAuthDestination } from "@/lib/auth/post-auth";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) {
    return supabaseResponse;
  }

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  // Refresh session - this validates the JWT and updates cookies
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;

  // Public auth routes - no redirect
  const isPublicAuthRoute =
    path === "/auth/signin" ||
    path === "/auth/signin/" ||
    path === "/auth/signup" ||
    path.startsWith("/auth/signup/");

  // Protect /console/* - redirect to sign in if not authenticated
  const isConsoleRoute = path.startsWith("/console");
  if (isConsoleRoute && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth/signin";
    return NextResponse.redirect(url);
  }

  // If logged in and on sign in/sign up page, redirect to console
  if (user && isPublicAuthRoute) {
    const destination = await resolvePostAuthDestination(
      supabase,
      user,
      request.nextUrl.searchParams.get("next")
    );
    return NextResponse.redirect(new URL(destination, request.url));
  }

  return supabaseResponse;
}
