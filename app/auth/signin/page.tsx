"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { BbLogo } from "@/components/ui/BbLogo";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { createClient } from "@/lib/supabase/client";

async function resolvePostAuthDestination(next = "/console/dashboard") {
  const res = await fetch(`/api/auth/post-auth-destination?next=${encodeURIComponent(next)}`, {
    cache: "no-store",
  });
  if (!res.ok) return next;
  const data = (await res.json()) as { destination?: string };
  return typeof data.destination === "string" ? data.destination : next;
}

export default function SignInPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (user) {
        router.replace(await resolvePostAuthDestination());
      } else {
        setChecking(false);
      }
    });
  }, [router]);

  const handleLinkedInSignIn = async () => {
    setError("");
    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithOAuth({
      provider: "linkedin_oidc",
      options: {
        redirectTo: `${typeof window !== "undefined" ? window.location.origin : ""}/auth/callback?next=/console/dashboard`,
      },
    });
    if (authError) setError(authError.message);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const supabase = createClient();
      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        setError(authError.message);
        setLoading(false);
        return;
      }

      router.replace(await resolvePostAuthDestination());
      router.refresh();
    } catch {
      setError("Something went wrong");
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bb-bg-base">
        <p className="bb-text-muted-alt">Loading...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bb-bg-base px-4">
      <Card className="w-full max-w-md">
        <div className="mb-6 flex items-center gap-2">
          <BbLogo size={40} />
          <span className="text-xl font-semibold bb-text-primary">BidBlender</span>
        </div>
        <h1 className="text-xl font-bold bb-text-primary">Sign in</h1>
        <p className="mt-2 text-sm bb-text-muted-alt">
          Enter your credentials to access your Opportunity Intelligence workspace.
        </p>
        <div className="mt-6">
          <Button
            type="button"
            variant="secondary"
            className="w-full"
            onClick={handleLinkedInSignIn}
          >
            Sign in with LinkedIn
          </Button>
          <div className="my-4 flex items-center gap-2">
            <div className="h-px flex-1 bg-gray-600" />
            <span className="text-xs bb-text-muted-alt">or</span>
            <div className="h-px flex-1 bg-gray-600" />
          </div>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium bb-text-secondary">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bb-input mt-1 w-full"
              placeholder="you@company.com"
              required
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium bb-text-secondary">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="bb-input mt-1 w-full"
              required
            />
          </div>
          {error && (
            <p className="text-sm bb-text-error">{error}</p>
          )}
          <Button
            type="submit"
            variant="primary"
            className="w-full"
            disabled={loading}
          >
            {loading ? "Signing in..." : "Sign in"}
          </Button>
        </form>
        <p className="mt-4 text-center text-sm bb-text-muted-alt">
          Don&apos;t have an account?{" "}
          <Link href="/auth/signup" className="bb-link">
            Sign up
          </Link>
        </p>
        <p className="mt-2 text-center text-xs bb-text-muted-alt">
          By signing in, you agree to our{" "}
          <Link href="/privacy" className="bb-link">
            Privacy Policy
          </Link>
        </p>
      </Card>
    </div>
  );
}
