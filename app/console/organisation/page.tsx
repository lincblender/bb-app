"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, ArrowRight, RefreshCw, Save, X } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { useWorkspaceData } from "@/lib/workspace/client";
import {
  FormSection,
  FieldLabel,
  TextInput,
  TextArea,
  ListItemSection,
  TextareaListField,
  IndividualQualificationsSection,
} from "@/components/console/organisation";
import { useOrganisationForm } from "./useOrganisationForm";
import {
  PAGE_CONTENT,
  SECTIONS,
  FIELDS,
  BUTTONS,
  EMPTY_STATES,
  LIST_SECTION_CONFIGS,
  TEXTAREA_LIST_FIELDS,
} from "./constants";
import { OrganisationAiLookupDialog } from "./OrganisationAiLookupDialog";
import { OrganisationProfileSnapshot } from "./OrganisationProfileSnapshot";

function formatUnsavedChanges(count: number) {
  if (count <= 0) {
    return "No unsaved changes";
  }

  return count === 1 ? "1 field changed" : `${count} fields changed`;
}

export default function OrganisationPage() {
  const { organisations, loading, refetch } = useWorkspaceData();
  const organisation = organisations[0] ?? null;
  const form = useOrganisationForm({ organisation, refetch });
  const hasSavedProfile = Boolean(
    form.form.id || (organisation?.id && form.form.name.trim().length > 0)
  );
  const [pendingNavigationUrl, setPendingNavigationUrl] = useState<string | null>(null);
  const [showLeaveWarning, setShowLeaveWarning] = useState(false);
  const [isSaveCardJiggling, setIsSaveCardJiggling] = useState(false);

  const triggerLeaveWarning = useCallback((nextUrl?: string) => {
    setPendingNavigationUrl(nextUrl ?? null);
    setShowLeaveWarning(true);
    setIsSaveCardJiggling(false);
    window.requestAnimationFrame(() => setIsSaveCardJiggling(true));
  }, []);

  const handleCancelLeave = useCallback(() => {
    setShowLeaveWarning(false);
    setPendingNavigationUrl(null);
  }, []);

  const handleDiscardAndLeave = useCallback(() => {
    const url = pendingNavigationUrl;
    setShowLeaveWarning(false);
    setPendingNavigationUrl(null);
    if (url) {
      window.location.href = url;
    }
  }, [pendingNavigationUrl]);

  const handleSaveAndNavigate = useCallback(async () => {
    const url = pendingNavigationUrl;
    const success = await form.handleSave();
    if (success) {
      setShowLeaveWarning(false);
      setPendingNavigationUrl(null);
      if (url) {
        window.location.href = url;
      }
    }
    // On failure, stay on modal; user can retry or cancel
  }, [pendingNavigationUrl, form]);

  useEffect(() => {
    if (!isSaveCardJiggling) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setIsSaveCardJiggling(false);
    }, 900);

    return () => window.clearTimeout(timeout);
  }, [isSaveCardJiggling]);

  useEffect(() => {
    if (form.hasUnsavedChanges) {
      return;
    }

    setShowLeaveWarning(false);
    setPendingNavigationUrl(null);
  }, [form.hasUnsavedChanges]);

  useEffect(() => {
    if (!form.hasUnsavedChanges) {
      return;
    }

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [form.hasUnsavedChanges]);

  useEffect(() => {
    if (!form.hasUnsavedChanges) {
      return;
    }

    const handleDocumentClick = (event: MouseEvent) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }

      const target = event.target;
      if (!(target instanceof Element)) {
        return;
      }

      const anchor = target.closest("a[href]") as HTMLAnchorElement | null;
      if (!anchor) {
        return;
      }

      const href = anchor.getAttribute("href");
      if (
        !href ||
        href.startsWith("#") ||
        anchor.target === "_blank" ||
        anchor.hasAttribute("download")
      ) {
        return;
      }

      const currentUrl = new URL(window.location.href);
      const nextUrl = new URL(anchor.href, currentUrl.href);

      if (nextUrl.href === currentUrl.href) {
        return;
      }

      event.preventDefault();
      triggerLeaveWarning(nextUrl.toString());
    };

    document.addEventListener("click", handleDocumentClick, true);
    return () => document.removeEventListener("click", handleDocumentClick, true);
  }, [form.hasUnsavedChanges, triggerLeaveWarning]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    if (!form.hasUnsavedChanges) {
      if (window.__bidblenderUnsavedChangesGuard) {
        delete window.__bidblenderUnsavedChangesGuard;
      }
      return;
    }

    const guard = (nextUrl?: string) => {
      triggerLeaveWarning(nextUrl);
      return true;
    };

    window.__bidblenderUnsavedChangesGuard = guard;

    return () => {
      if (window.__bidblenderUnsavedChangesGuard === guard) {
        delete window.__bidblenderUnsavedChangesGuard;
      }
    };
  }, [form.hasUnsavedChanges, triggerLeaveWarning]);

  useEffect(() => {
    if (!form.notice || form.notice.tone !== "positive") {
      return;
    }

    const timeout = window.setTimeout(() => {
      form.clearNotice();
    }, 5000);

    return () => window.clearTimeout(timeout);
  }, [form.clearNotice, form.notice]);

  if (loading) {
    return <p className="text-gray-400">{PAGE_CONTENT.loading}</p>;
  }

  return (
    <div className="mx-auto max-w-5xl pb-44">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="max-w-3xl">
          <h1 className="text-3xl font-semibold text-gray-100">{PAGE_CONTENT.title}</h1>
          <p className="mt-3 text-base leading-relaxed text-gray-300">
            {PAGE_CONTENT.description}
          </p>
        </div>
        <OrganisationAiLookupDialog
          aiState={form.aiState}
          deleteState={form.deleteState}
          query={form.aiLookupQuery}
          error={form.aiLookupError}
          info={form.aiLookupInfo}
          candidates={form.aiCandidates}
          compact={hasSavedProfile}
          hasUnsavedChanges={form.hasUnsavedChanges}
          onQueryChange={form.setAiLookupQuery}
          onPrepare={form.prepareAiLookup}
          onSearch={form.searchAiCandidates}
          onSelect={form.applyAiCandidate}
          onResetResults={form.clearAiLookupResults}
          onDelete={form.handleDelete}
        />
      </div>

      {form.notice && (
        <div
          className={`mt-6 flex items-start justify-between gap-4 rounded-xl border px-4 py-3 text-sm ${
            form.notice.tone === "positive"
              ? "border-bb-green/40 bg-bb-green/10 text-gray-200"
              : "border-bb-orange/40 bg-bb-orange/10 text-gray-200"
          }`}
        >
          <span>{form.notice.text}</span>
          <button
            type="button"
            onClick={form.clearNotice}
            className="shrink-0 rounded-md p-1 text-gray-400 hover:bg-white/5 hover:text-white"
            aria-label="Dismiss notice"
          >
            <X size={16} />
          </button>
        </div>
      )}

      <div className="mt-8">
        <OrganisationProfileSnapshot
          profile={form.form}
          onAddSocialProfile={form.addSocialProfile}
          onRemoveSocialProfile={form.removeSocialProfile}
          onUpdateSocialProfile={form.updateSocialProfileFields}
          onSearchSocialProfiles={form.searchSocialProfiles}
          socialSearchMatches={form.socialSearchMatches}
          socialSearchLoading={form.socialSearchLoading}
          onClearSocialSearch={form.clearSocialSearchMatches}
        />
      </div>

      <div className="mt-8 grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-6">
          <FormSection
            title={SECTIONS.basics.title}
            description={SECTIONS.basics.description}
          >
            <div className="grid gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <FieldLabel>{FIELDS.organisationName.label}</FieldLabel>
                <TextInput
                  value={form.form.name}
                  onChange={(e) => form.setField("name", e.target.value)}
                  placeholder={FIELDS.organisationName.placeholder}
                />
              </div>
              <div>
                <FieldLabel>{FIELDS.companyWebsite.label}</FieldLabel>
                <TextInput
                  value={form.form.websiteUrl}
                  onChange={(e) => form.setField("websiteUrl", e.target.value)}
                  placeholder={FIELDS.companyWebsite.placeholder}
                />
              </div>
              <div>
                <FieldLabel>{FIELDS.linkedinUrl.label}</FieldLabel>
                <div className="flex gap-2">
                  <TextInput
                    value={form.form.linkedinUrl}
                    onChange={(e) => form.setField("linkedinUrl", e.target.value)}
                    placeholder={FIELDS.linkedinUrl.placeholder}
                    className="flex-1"
                  />
                  <button
                    type="button"
                    onClick={form.reGrabAssets}
                    disabled={form.aiState === "applying" || (!form.form.name.trim() && !form.form.websiteUrl.trim() && !form.form.linkedinUrl.trim())}
                    className="shrink-0 rounded-lg border border-gray-600 px-3 py-2 text-sm text-gray-300 hover:border-bb-powder-blue hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                    title="Re-fetch logo and social assets using the corrected URL"
                  >
                    {form.aiState === "applying" ? "Fetching…" : "Re-grab logo"}
                  </button>
                </div>
              </div>
            </div>
            <div>
              <FieldLabel>{FIELDS.companyDescription.label}</FieldLabel>
              <TextArea
                rows={5}
                value={form.form.description}
                onChange={(e) => form.setField("description", e.target.value)}
                placeholder={FIELDS.companyDescription.placeholder}
              />
            </div>
          </FormSection>

          <FormSection title={SECTIONS.capabilityEvidence.title}>
            {LIST_SECTION_CONFIGS.filter((c) => c.id !== "caseStudies").map(
              (config) => {
                const h = form.listHandlers[
                  config.id as "capabilities" | "certifications"
                ];
                return (
                  <ListItemSection
                    key={config.id}
                    items={h.items as Record<string, unknown>[]}
                    config={config}
                    addLabel={BUTTONS[config.addLabel]}
                    emptyLabel={EMPTY_STATES[config.emptyLabel]}
                    removeLabel={BUTTONS[config.removeLabel]}
                    onAdd={h.onAdd}
                    onRemove={h.onRemove}
                    onUpdate={h.onUpdate}
                  />
                );
              }
            )}
            <IndividualQualificationsSection
              items={form.listHandlers.individualQualifications.items}
              addLabel={BUTTONS.addIndividualQualification}
              emptyLabel={EMPTY_STATES.individualQualifications}
              removeLabel={BUTTONS.removeIndividualQualification}
              namePlaceholder={FIELDS.individualQualification.name}
              issuerPlaceholder={FIELDS.individualQualification.issuer}
              countPlaceholder={FIELDS.individualQualification.count}
              holderNamesPlaceholder={FIELDS.individualQualification.holderNames}
              onAdd={form.listHandlers.individualQualifications.onAdd}
              onRemove={form.listHandlers.individualQualifications.onRemove}
              onUpdate={form.listHandlers.individualQualifications.onUpdate}
            />
          </FormSection>

          <FormSection title={SECTIONS.marketPosition.title}>
            <div className="grid gap-4 md:grid-cols-2">
              {TEXTAREA_LIST_FIELDS.map((field) => (
                <TextareaListField
                  key={field.key}
                  label={field.label}
                  value={form.form[field.key]}
                  onChange={(v) => form.setField(field.key, v)}
                  placeholder={field.placeholder}
                  suggestions={"suggestions" in field ? field.suggestions : undefined}
                />
              ))}
            </div>
          </FormSection>

          <FormSection
            title={SECTIONS.caseStudies.title}
            description={SECTIONS.caseStudies.description}
          >
            <ListItemSection
              items={form.listHandlers.caseStudies.items}
              config={LIST_SECTION_CONFIGS.find((c) => c.id === "caseStudies")!}
              addLabel={BUTTONS.addCaseStudy}
              emptyLabel={EMPTY_STATES.caseStudies}
              removeLabel={BUTTONS.removeCaseStudy}
              onAdd={form.listHandlers.caseStudies.onAdd}
              onRemove={form.listHandlers.caseStudies.onRemove}
              onUpdate={form.listHandlers.caseStudies.onUpdate}
            />
          </FormSection>
        </div>

        <div className="space-y-6">
          <Card>
            <h2 className="text-lg font-semibold text-gray-100">
              {SECTIONS.whatGoodLooksLike.title}
            </h2>
            <div className="mt-4 space-y-3 text-sm leading-relaxed text-gray-400">
              {SECTIONS.whatGoodLooksLike.tips.map((tip, i) => (
                <p key={i}>{tip}</p>
              ))}
            </div>
          </Card>

          <Card>
            <h2 className="text-lg font-semibold text-gray-100">
              {SECTIONS.nextStep.title}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-gray-400">
              {SECTIONS.nextStep.description}
            </p>
            <a
              href={SECTIONS.nextStep.linkHref}
              className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-bb-coral hover:text-bb-coral/85"
            >
              {SECTIONS.nextStep.linkText}
              <ArrowRight size={16} />
            </a>
          </Card>
        </div>
      </div>

      {/* Unsaved changes modal – centred, dimmed backdrop */}
      {showLeaveWarning && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-[fadeIn_0.2s_ease-out]"
          role="dialog"
          aria-modal="true"
          aria-labelledby="unsaved-modal-title"
        >
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={handleCancelLeave}
            aria-hidden="true"
          />
          <div
            className="relative w-full max-w-md animate-[zoomIn_0.2s_ease-out]"
            onClick={(e) => e.stopPropagation()}
          >
            <Card className="border-bb-orange/30 bg-[linear-gradient(180deg,_rgba(18,27,39,0.98),_rgba(10,17,27,0.99))] shadow-[0_24px_60px_rgba(0,0,0,0.6)]">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-bb-powder-blue">
                    Save profile
                  </p>
                  <p id="unsaved-modal-title" className="mt-2 text-lg font-semibold text-gray-100">
                    Unsaved changes
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-gray-400">
                    You have {formatUnsavedChanges(form.dirtyFieldCount)}. Save before leaving, or discard them.
                  </p>
                </div>
                <div className="rounded-full bg-bb-orange/15 p-2 text-bb-orange">
                  <AlertTriangle size={18} />
                </div>
              </div>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row-reverse sm:flex-wrap">
                <button
                  type="button"
                  onClick={handleSaveAndNavigate}
                  disabled={form.saveState === "saving"}
                  className="inline-flex min-w-[140px] items-center justify-center gap-2 rounded-lg bg-bb-powder-blue px-4 py-3 text-sm font-medium text-black hover:bg-bb-powder-blue-light disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {form.saveState === "saving" ? (
                    <RefreshCw size={16} className="animate-spin" />
                  ) : (
                    <Save size={16} />
                  )}
                  {form.saveState === "saving" ? BUTTONS.saving : "Save changes"}
                </button>
                <button
                  type="button"
                  onClick={handleCancelLeave}
                  className="inline-flex items-center justify-center rounded-lg border border-gray-600 px-4 py-3 text-sm text-gray-100 hover:border-bb-powder-blue hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDiscardAndLeave}
                  className="inline-flex items-center justify-center rounded-lg border border-bb-orange/50 bg-bb-orange/10 px-4 py-3 text-sm text-bb-orange hover:bg-bb-orange/20"
                >
                  Discard changes
                </button>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* Save profile card – bottom right (hidden when modal is open) */}
      {!showLeaveWarning && form.hasUnsavedChanges && (
        <div className="pointer-events-none fixed bottom-4 left-4 right-4 z-40 md:left-auto md:right-6 md:w-[360px]">
          <div
            style={
              isSaveCardJiggling
                ? { animation: "unsaved-jiggle 0.45s ease-in-out 2" }
                : undefined
            }
          >
            <Card className="pointer-events-auto border-bb-powder-blue/20 bg-[linear-gradient(180deg,_rgba(18,27,39,0.96),_rgba(10,17,27,0.98))] shadow-[0_18px_50px_rgba(0,0,0,0.4)]">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-bb-powder-blue">
                    Save profile
                  </p>
                  <p className="mt-2 text-lg font-semibold text-gray-100">
                    {formatUnsavedChanges(form.dirtyFieldCount)}
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-gray-400">
                    {SECTIONS.save.description}
                  </p>
                </div>
              </div>

              <div className="mt-5 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={form.handleSave}
                  disabled={form.saveState === "saving" || !form.hasUnsavedChanges}
                  className="inline-flex min-w-[152px] items-center justify-center gap-2 rounded-lg bg-bb-powder-blue px-4 py-3 text-sm font-medium text-black hover:bg-bb-powder-blue-light disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {form.saveState === "saving" ? (
                    <RefreshCw size={16} className="animate-spin" />
                  ) : (
                    <Save size={16} />
                  )}
                  {form.saveState === "saving"
                    ? BUTTONS.saving
                    : form.saveState === "saved"
                      ? BUTTONS.saved
                      : BUTTONS.saveProfile}
                </button>
                <span className="text-xs uppercase tracking-[0.12em] text-gray-500">
                  Unsaved changes
                </span>
              </div>
            </Card>
          </div>
        </div>
      )}

      <style jsx global>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        @keyframes zoomIn {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        @keyframes unsaved-jiggle {
          0%,
          100% {
            transform: translateX(0);
          }
          20% {
            transform: translateX(-8px);
          }
          40% {
            transform: translateX(8px);
          }
          60% {
            transform: translateX(-6px);
          }
          80% {
            transform: translateX(6px);
          }
        }
      `}</style>
    </div>
  );
}
