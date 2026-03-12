"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, CheckCircle2, ExternalLink } from "lucide-react";
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
import { countReadyPillars, getSetupPillarStatuses } from "@/lib/connectors/setup-status";
import { AssistantAvatar, UserAvatar } from "./Avatar";

function getStepPillarId(stepId: OnboardingStepId) {
  if (stepId === "crm") return "history";
  if (stepId === "tender_boards") return "opportunity";
  if (stepId === "reach") return "reach";
  return "capability";
}

function getChoiceById(stepId: OnboardingStepId, choiceId?: string) {
  const step = ONBOARDING_STEPS.find((item) => item.id === stepId);
  return step?.choices.find((choice) => choice.id === choiceId) ?? null;
}

export function OnboardingPseudoChat() {
  const router = useRouter();
  const { connectorSources, organisations, opportunities } = useWorkspaceData();
  const currentUserProfile = useCurrentUserProfile();
  const [progress, setProgress] = useState<OnboardingProgress>({ selections: {} });

  useEffect(() => {
    setProgress(loadOnboardingProgress());
  }, []);

  useEffect(() => {
    saveOnboardingProgress(progress);
  }, [progress]);

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
    }));

    if (choice.status === "live" && choice.href) {
      router.push(choice.href);
    }
  };

  return (
    <div className="mx-auto flex h-full w-full max-w-4xl flex-col overflow-y-auto px-4 py-8">
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
              href="/console/get-started"
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
          const selection = progress.selections[step.id];
          const selectedChoice = getChoiceById(step.id, selection);
          const liveChoice = step.choices.find((choice) => choice.status === "live") ?? null;
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
                  <p className="mt-2 text-xs uppercase tracking-[0.18em] text-bb-powder-blue">
                    {step.livePathLabel}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {step.choices.map((choice) => {
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
      </div>

      <div className="mt-10 flex flex-wrap gap-3">
        <Link
          href="/console/connectors"
          className="inline-flex items-center gap-2 rounded-lg bg-bb-coral px-4 py-2 text-sm font-medium text-white hover:bg-bb-coral/90"
        >
          Open connectors
          <ArrowRight size={16} />
        </Link>
        <Link
          href="/console/dashboard"
          className="inline-flex items-center gap-2 rounded-lg border border-gray-600 px-4 py-2 text-sm text-gray-200 hover:border-bb-powder-blue hover:text-white"
        >
          Continue to dashboard
        </Link>
      </div>
    </div>
  );
}
