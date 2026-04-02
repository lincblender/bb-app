"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, CheckCircle2, ExternalLink, Loader2, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { useWorkspaceData } from "@/lib/workspace/client";
import { useCurrentUserProfile } from "@/lib/auth/useCurrentUserProfile";
import {
  ONBOARDING_STEPS,
  loadOnboardingProgress,
  saveOnboardingProgress,
  type OnboardingChoice,
  type OnboardingProgress,
  type OnboardingStepId,
} from "@/lib/chat/onboarding";
import type { WebsiteInferredProfile } from "@/lib/organisation/website-inference";
import { countReadyPillars, getSetupPillarStatuses } from "@/lib/connectors/setup-status";
import { AssistantAvatar, UserAvatar } from "./Avatar";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getStepPillarId(stepId: OnboardingStepId) {
  if (stepId === "crm") return "history";
  if (stepId === "tender_boards") return "opportunity";
  if (stepId === "reach") return "reach";
  return "capability";
}

function getChoiceById(stepId: OnboardingStepId, choiceId?: string) {
  const step = ONBOARDING_STEPS.find((item) => item.id === stepId);
  return step?.choices?.find((choice) => choice.id === choiceId) ?? null;
}

/** Derive a display-friendly company name from a URL domain. */
function extractCompanyNameFromUrl(rawUrl: string): string {
  try {
    const url = new URL(rawUrl.startsWith("http") ? rawUrl : `https://${rawUrl}`);
    const domain = url.hostname.replace(/^www\./, "").split(".")[0] ?? "";
    return domain.charAt(0).toUpperCase() + domain.slice(1);
  } catch {
    return "your company";
  }
}

// ---------------------------------------------------------------------------
// Company step sub-components
// ---------------------------------------------------------------------------

function CompanyStepInput({
  step,
  onSubmit,
}: {
  step: (typeof ONBOARDING_STEPS)[0];
  onSubmit: (url: string) => void;
}) {
  const [inputValue, setInputValue] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const url = inputValue.trim();
    if (!url) return;
    onSubmit(url);
  };

  return (
    <form onSubmit={handleSubmit} className="mt-4 flex gap-2">
      <input
        type="url"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        placeholder={step.textInput?.placeholder ?? "https://yourcompany.com"}
        required
        className="flex-1 rounded-xl border border-gray-700 bg-bb-dark px-3 py-2.5 text-sm text-gray-100 placeholder-gray-500 outline-none focus:border-bb-powder-blue focus:ring-1 focus:ring-bb-powder-blue"
      />
      <button
        type="submit"
        disabled={!inputValue.trim()}
        className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-bb-powder-blue px-4 py-2.5 text-sm font-medium text-black hover:bg-bb-powder-blue-light disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Sparkles size={13} />
        {step.textInput?.submitLabel ?? "Build profile"}
      </button>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function OnboardingPseudoChat() {
  const router = useRouter();
  const { connectorSources, organisations, opportunities, refetch } = useWorkspaceData();
  const currentUserProfile = useCurrentUserProfile();
  const [progress, setProgress] = useState<OnboardingProgress>({ selections: {} });

  // Stable refs so the inference effect can read current values without
  // re-triggering itself.
  const organisationsRef = useRef(organisations);
  useEffect(() => { organisationsRef.current = organisations; }, [organisations]);
  const refetchRef = useRef(refetch);
  useEffect(() => { refetchRef.current = refetch; }, [refetch]);

  // Track which URL we have already kicked off inference for (survives renders).
  const inferenceUrlRef = useRef<string | null>(null);

  // Load persisted progress on mount.
  useEffect(() => {
    setProgress(loadOnboardingProgress());
  }, []);

  // Persist whenever progress changes.
  useEffect(() => {
    saveOnboardingProgress(progress);
  }, [progress]);

  // ── Background inference ────────────────────────────────────────────────
  useEffect(() => {
    const url = progress.companyWebsiteUrl;
    if (!url) return;
    // Skip if inference is already complete or already running for this URL.
    if (progress.companyInferenceStatus === "done" || progress.companyInferenceStatus === "failed") return;
    if (inferenceUrlRef.current === url) return;

    inferenceUrlRef.current = url;
    setProgress((p) => ({ ...p, companyInferenceStatus: "running" }));

    void (async () => {
      try {
        // 1. Infer from website
        const inferRes = await fetch("/api/organisation/profile/ai/infer-from-website", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ websiteUrl: url }),
        });
        const inferBody = (await inferRes.json()) as { profile?: WebsiteInferredProfile; error?: string };
        if (!inferRes.ok || !inferBody.profile) {
          throw new Error(inferBody.error ?? "Inference failed.");
        }

        const inferred = inferBody.profile;
        const companyName = extractCompanyNameFromUrl(url);

        // 2. Auto-save to organisation profile only when one doesn't exist yet.
        if (organisationsRef.current.length === 0) {
          const saveRes = await fetch("/api/organisation/profile", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              id: null,
              name: companyName,
              description: inferred.description,
              websiteUrl: url,
              linkedinUrl: "",
              logoUrl: "",
              location: inferred.location,
              socialProfiles: [],
              sectors: inferred.sectors,
              capabilities: inferred.capabilities.map((c, i) => ({
                id: `inf-cap-${i}`,
                name: c.name,
                category: c.category,
              })),
              certifications: inferred.certifications.map((c, i) => ({
                id: `inf-cert-${i}`,
                name: c.name,
                issuer: c.issuer,
              })),
              individualQualifications: inferred.individualQualifications.map((q, i) => ({
                id: `inf-iq-${i}`,
                name: q.name,
                issuer: q.issuer,
                count: q.count,
                holderNames: q.holderNames,
              })),
              caseStudies: inferred.caseStudies.map((cs, i) => ({
                id: `inf-cs-${i}`,
                title: cs.title,
                client: cs.client,
                outcome: cs.outcome,
              })),
              strategicPreferences: inferred.strategicPreferences,
              targetMarkets: inferred.targetMarkets,
              partnerGaps: inferred.partnerGaps,
              unspscCodes: inferred.unspscCodes,
              anzsicCode: inferred.anzsicCode,
              governmentPanels: inferred.governmentPanels,
              operatingRegions: inferred.operatingRegions,
              tenderKeywords: inferred.tenderKeywords,
            }),
          });

          if (saveRes.ok) {
            await refetchRef.current().catch(() => undefined);
          }
        }

        setProgress((p) => ({ ...p, companyInferenceStatus: "done", companyName }));
      } catch {
        setProgress((p) => ({ ...p, companyInferenceStatus: "failed" }));
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [progress.companyWebsiteUrl, progress.companyInferenceStatus]);

  // ── Pillar statuses ─────────────────────────────────────────────────────
  const pillarStatuses = useMemo(
    () =>
      getSetupPillarStatuses({
        connectors: connectorSources,
        organisations,
        opportunities,
      }),
    [connectorSources, organisations, opportunities]
  );
  const readyPillarCount = useMemo(() => countReadyPillars(pillarStatuses), [pillarStatuses]);

  const handleChoice = (stepId: OnboardingStepId, choice: OnboardingChoice) => {
    setProgress((current) => ({
      selections: {
        ...current.selections,
        [stepId]: choice.id,
      },
      companyWebsiteUrl: current.companyWebsiteUrl,
      companyInferenceStatus: current.companyInferenceStatus,
      companyName: current.companyName,
    }));

    if (choice.status === "live" && choice.href) {
      router.push(choice.href);
    }
  };

  const handleCompanyWebsiteSubmit = (url: string) => {
    setProgress((current) => ({
      ...current,
      companyWebsiteUrl: url,
      companyInferenceStatus: undefined,
    }));
  };

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <div className="mx-auto flex h-full w-full max-w-4xl flex-col overflow-y-auto px-4 py-8">
      {/* Welcome bubble */}
      <div className="flex items-start gap-4">
        <AssistantAvatar size={40} />
        <div className="max-w-2xl rounded-3xl border border-gray-700 bg-bb-dark-elevated px-5 py-4 shadow-sm">
          <p className="text-sm leading-relaxed text-gray-300">
            Let&apos;s get this workspace operational. This onboarding chat is intentionally
            predetermined: I&apos;ll offer a few source options, but only one live path per pillar is
            wired through right now.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Badge variant={readyPillarCount === 4 ? "positive" : "warning"}>
              {readyPillarCount} of 4 pillars ready
            </Badge>
            <Link
              href="/get-started"
              className="inline-flex items-center gap-2 rounded-lg border border-gray-600 px-3 py-1.5 text-xs text-gray-200 hover:border-bb-powder-blue hover:text-white"
            >
              Open setup guide
              <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </div>

      <div className="mt-8 space-y-8">
        {ONBOARDING_STEPS.map((step, index) => {
          // ── Company step (text input) ─────────────────────────────────
          if (step.textInput) {
            const submitted = !!progress.companyWebsiteUrl;
            const inferStatus = progress.companyInferenceStatus;

            return (
              <div key={step.id} className="space-y-3">
                <div className="flex items-start gap-4">
                  <AssistantAvatar size={40} />
                  <div className="max-w-2xl rounded-3xl border border-gray-700 bg-bb-dark-elevated px-5 py-4 shadow-sm">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="neutral">Step {index + 1}</Badge>
                    </div>
                    <h2 className="mt-3 text-lg font-semibold text-gray-100">{step.title}</h2>
                    <p className="mt-2 text-sm leading-relaxed text-gray-300">{step.intro}</p>
                    {!submitted && (
                      <CompanyStepInput step={step} onSubmit={handleCompanyWebsiteSubmit} />
                    )}
                  </div>
                </div>

                {submitted && (
                  <div className="flex items-start justify-end gap-4">
                    <div className="max-w-xl rounded-3xl bg-bb-coral px-5 py-4 text-sm text-white shadow-sm">
                      {progress.companyWebsiteUrl}
                    </div>
                    <UserAvatar profile={currentUserProfile} size={40} />
                  </div>
                )}

                {submitted && (
                  <div className="flex items-start gap-4">
                    <AssistantAvatar size={40} />
                    <div className="max-w-2xl rounded-3xl border border-gray-700 bg-bb-dark-elevated px-5 py-4 shadow-sm">
                      <p className="text-sm leading-relaxed text-gray-300">
                        {inferStatus === "running" ? (
                          <span className="inline-flex items-center gap-2">
                            <Loader2 size={13} className="animate-spin text-bb-powder-blue" />
                            Building your profile in the background. Continue setting up the connections below.
                          </span>
                        ) : inferStatus === "done" ? (
                          "Profile built. Continue setting up the connections below."
                        ) : inferStatus === "failed" ? (
                          "We couldn't reach that website automatically. Continue with the connections — you can set up the profile manually later."
                        ) : (
                          "Got it. We're on it. Continue with the connections below."
                        )}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            );
          }

          // ── Choice-button steps (CRM, tender, reach, capability) ──────
          const selection = progress.selections[step.id];
          const selectedChoice = getChoiceById(step.id, selection);
          const liveChoice = step.choices?.find((choice) => choice.status === "live") ?? null;
          const pillar = pillarStatuses.find((status) => status.id === getStepPillarId(step.id));
          const liveReady = pillar?.status === "ready";
          const liveInProgress = pillar?.status === "in-progress";

          return (
            <div key={step.id} className="space-y-3">
              <div className="flex items-start gap-4">
                <AssistantAvatar size={40} />
                <div className="max-w-2xl rounded-3xl border border-gray-700 bg-bb-dark-elevated px-5 py-4 shadow-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="neutral">Step {index + 1}</Badge>
                    {liveReady ? (
                      <Badge variant="positive">Ready</Badge>
                    ) : liveInProgress ? (
                      <Badge variant="warning">In progress</Badge>
                    ) : (
                      <Badge variant="neutral">Not started</Badge>
                    )}
                  </div>
                  <h2 className="mt-3 text-lg font-semibold text-gray-100">{step.title}</h2>
                  <p className="mt-2 text-sm leading-relaxed text-gray-300">{step.intro}</p>
                  {step.livePathLabel && (
                    <p className="mt-2 text-xs uppercase tracking-[0.18em] text-bb-powder-blue">
                      {step.livePathLabel}
                    </p>
                  )}
                  <div className="mt-4 flex flex-wrap gap-2">
                    {(step.choices ?? []).map((choice) => {
                      const isSelected = selectedChoice?.id === choice.id;
                      const isLive = choice.status === "live";
                      return (
                        <button
                          key={choice.id}
                          type="button"
                          onClick={() => handleChoice(step.id, choice)}
                          className={`inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm transition-colors ${
                            isSelected
                              ? "border-bb-coral bg-bb-coral/15 text-white"
                              : isLive
                                ? "border-bb-powder-blue/50 bg-bb-powder-blue/10 text-gray-100 hover:border-bb-powder-blue hover:bg-bb-powder-blue/20"
                                : "border-gray-600 bg-bb-dark text-gray-300 hover:border-gray-500 hover:text-white"
                          }`}
                        >
                          {choice.label}
                          {isLive && <ExternalLink size={14} />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {selectedChoice && (
                <div className="flex items-start justify-end gap-4">
                  <div className="max-w-xl rounded-3xl bg-bb-coral px-5 py-4 text-sm text-white shadow-sm">
                    I want to start with {selectedChoice.label}.
                  </div>
                  <UserAvatar profile={currentUserProfile} size={40} />
                </div>
              )}

              {(selectedChoice || liveReady || liveInProgress) && (
                <div className="flex items-start gap-4">
                  <AssistantAvatar size={40} />
                  <div className="max-w-2xl rounded-3xl border border-gray-700 bg-bb-dark-elevated px-5 py-4 shadow-sm">
                    <p className="text-sm leading-relaxed text-gray-300">
                      {liveReady && liveChoice
                        ? `${liveChoice.label} is already in place for this step.`
                        : selectedChoice?.message ??
                          "This step is underway. Continue with the live path when you are ready."}
                    </p>
                    {selectedChoice?.status === "interest" && liveChoice?.href && (
                      <div className="mt-4 flex flex-wrap gap-2">
                        <Link
                          href={liveChoice.href}
                          className="inline-flex items-center gap-2 rounded-lg bg-bb-powder-blue px-4 py-2 text-sm font-medium text-black hover:bg-bb-powder-blue-light"
                        >
                          Continue with {liveChoice.label}
                          <ArrowRight size={16} />
                        </Link>
                      </div>
                    )}
                    {(liveReady || liveInProgress) && step.id === "crm" && (
                      <div className="mt-4">
                        <Badge variant="positive" className="flex w-fit items-center gap-1">
                          <CheckCircle2 size={14} />
                          Selective CRM sync active
                        </Badge>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {/* ── Background inference completion bubble ──────────────────── */}
        {progress.companyWebsiteUrl && progress.companyInferenceStatus === "done" && (
          <div className="flex items-start gap-4">
            <AssistantAvatar size={40} />
            <div className="max-w-2xl rounded-3xl border border-bb-green/30 bg-bb-green/5 px-5 py-4 shadow-sm">
              <div className="flex items-center gap-2">
                <Sparkles size={14} className="shrink-0 text-bb-green" />
                <p className="text-xs font-semibold uppercase tracking-[0.15em] text-bb-green">
                  Profile ready
                </p>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-gray-200">
                While you set up the connections, we built a company profile for{" "}
                <strong className="text-white">{progress.companyName ?? "your company"}</strong>.
                It includes UNSPSC codes, ANZSIC classification, likely government panel
                memberships, and {progress.companyName ? "" : "more — "}ready to use in
                opportunity qualification.
              </p>
              <Link
                href="/organisation"
                className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-bb-green hover:text-bb-green/80"
              >
                View company profile
                <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        )}

        {progress.companyWebsiteUrl && progress.companyInferenceStatus === "running" && (
          <div className="flex items-start gap-4">
            <AssistantAvatar size={40} />
            <div className="max-w-2xl rounded-3xl border border-bb-powder-blue/20 bg-bb-powder-blue/5 px-5 py-4 shadow-sm">
              <p className="inline-flex items-center gap-2 text-sm text-gray-400">
                <Loader2 size={13} className="animate-spin text-bb-powder-blue" />
                Still building your company profile — won&apos;t be long.
              </p>
            </div>
          </div>
        )}

        {progress.companyWebsiteUrl && progress.companyInferenceStatus === "failed" && (
          <div className="flex items-start gap-4">
            <AssistantAvatar size={40} />
            <div className="max-w-2xl rounded-3xl border border-gray-700 bg-bb-dark-elevated px-5 py-4 shadow-sm">
              <p className="text-sm leading-relaxed text-gray-300">
                We couldn&apos;t build a profile from that website automatically. You can set it up
                manually in the Organisation section.
              </p>
              <Link
                href="/organisation"
                className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-bb-coral hover:text-bb-coral/80"
              >
                Set up manually
                <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        )}
      </div>

      <div className="mt-10 flex flex-wrap gap-3">
        <Link
          href="/connectors"
          className="inline-flex items-center gap-2 rounded-lg bg-bb-coral px-4 py-2 text-sm font-medium text-white hover:bg-bb-coral/90"
        >
          Open connectors
          <ArrowRight size={16} />
        </Link>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 rounded-lg border border-gray-600 px-4 py-2 text-sm text-gray-200 hover:border-bb-powder-blue hover:text-white"
        >
          Continue to dashboard
        </Link>
      </div>
    </div>
  );
}
