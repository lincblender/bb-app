"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowRight, FileText, CheckCircle2, Search, Linkedin } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { createClient } from "@/lib/supabase/client";
import { useWorkspaceData } from "@/lib/workspace/client";

export default function ConsoleGetStartedPage() {
  const searchParams = useSearchParams();
  const { connectorSources, refetch } = useWorkspaceData();
  const [linkedInConnected, setLinkedInConnected] = useState(false);

  useEffect(() => {
    createClient()
      .auth.getUser()
      .then(async ({ data: { user } }) => {
        const connected =
          user?.identities?.some((identity) => identity.provider === "linkedin_oidc") ?? false;
        setLinkedInConnected(connected);

        if (
          connected &&
          !connectorSources.some(
            (connector) => connector.id === "conn-linkedin-profile" && connector.status === "live"
          )
        ) {
          await fetch("/api/connectors/linkedin/activate", {
            method: "POST",
          }).catch(() => undefined);
          await refetch().catch(() => undefined);
        }
      });
  }, [connectorSources, refetch]);

  const intro = useMemo(() => {
    if (searchParams.get("source") === "linkedin") {
      return "LinkedIn sign-in is connected. Now it's time to test the core workflows: finding opportunities directly from the workspace, and deeply analysing tender documents.";
    }
    return "Welcome to BidBlender. Before diving deep into configuration, let's explore the core workflows to understand how Opportunity Intelligence works.";
  }, [searchParams]);

  return (
    <div className="mx-auto max-w-6xl">
      <div className="max-w-4xl">
        {searchParams.get("welcome") === "1" && <Badge variant="warning">Welcome</Badge>}
        <h1 className="mt-4 text-3xl font-semibold text-gray-100 md:text-4xl">
          Getting Started
        </h1>
        <p className="mt-4 text-base leading-relaxed text-gray-300">{intro}</p>
      </div>

      <div className="mt-10 grid gap-6 md:grid-cols-3">
        {/* Golden Path 1: LinkedIn */}
        <Card className="flex h-full flex-col">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-bb-powder-blue/15 text-bb-powder-blue">
            <Linkedin size={20} />
          </div>
          <p className="mt-4 text-xs font-semibold uppercase tracking-[0.18em] text-bb-powder-blue">
            Flow 1
          </p>
          <h2 className="mt-2 text-xl font-semibold text-gray-100">Sign up via LinkedIn</h2>
          <p className="mt-3 flex-1 text-sm leading-relaxed text-gray-300">
            {linkedInConnected 
              ? "You successfully signed in using LinkedIn! Your basic profile and professional context is live." 
              : "Sign in with LinkedIn to bootstrap identity, professional context, and pave the way for company page access."}
          </p>
          <div className="mt-6 flex items-center gap-2 text-sm font-medium">
            {linkedInConnected ? (
              <span className="inline-flex items-center gap-2 text-bb-green">
                <CheckCircle2 size={16} /> Identity Active
              </span>
            ) : (
              <span className="text-bb-muted-alt">Not connected</span>
            )}
          </div>
        </Card>

        {/* Golden Path 2: Pick Opp */}
        <Card className="flex h-full flex-col">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-bb-powder-blue/15 text-bb-powder-blue">
            <Search size={20} />
          </div>
          <p className="mt-4 text-xs font-semibold uppercase tracking-[0.18em] text-bb-powder-blue">
            Flow 2
          </p>
          <h2 className="mt-2 text-xl font-semibold text-gray-100">Find and Qualify</h2>
          <p className="mt-3 flex-1 text-sm leading-relaxed text-gray-300">
            Use the conversational interface or the explorer to locate a specific opportunity, select it deterministically, and begin qualification.
          </p>
          <Link
            href="/console/dashboard?focus=chat"
            className="mt-6 inline-flex w-fit items-center gap-2 text-sm font-medium text-bb-coral hover:text-bb-coral/85"
          >
            Ask the assistant
            <ArrowRight size={16} />
          </Link>
        </Card>

        {/* Golden Path 3: Upload */}
        <Card className="flex h-full flex-col">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-bb-powder-blue/15 text-bb-powder-blue">
            <FileText size={20} />
          </div>
          <p className="mt-4 text-xs font-semibold uppercase tracking-[0.18em] text-bb-powder-blue">
            Flow 3
          </p>
          <h2 className="mt-2 text-xl font-semibold text-gray-100">Analyse Documents</h2>
          <p className="mt-3 flex-1 text-sm leading-relaxed text-gray-300">
            Upload a brief, RFT, or related document. We extract the dense text and explicitly ground our AI models in your authoritative file.
          </p>
          <Link
            href="/console/dashboard"
            className="mt-6 inline-flex w-fit items-center gap-2 text-sm font-medium text-bb-coral hover:text-bb-coral/85"
          >
            Start analysis
            <ArrowRight size={16} />
          </Link>
        </Card>
      </div>
    </div>
  );
}
