"use client";

import { useEffect, useRef } from "react";
import { X, Sparkles, CheckCircle2, AlertCircle, Globe, Tag, Building2, MapPin, Key } from "lucide-react";
import { Card } from "@/components/ui/Card";
import type { WebsiteInferredProfile } from "@/lib/organisation/website-inference";

// ---------------------------------------------------------------------------
// Loading screen with animated stage labels
// ---------------------------------------------------------------------------

const INFERENCE_STAGES = [
  "Fetching your homepage…",
  "Discovering key pages…",
  "Reading services and capabilities…",
  "Mapping to procurement codes…",
  "Building your tender profile…",
];

export function WebsiteInferenceLoadingScreen({ stage }: { stage: number }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div className="relative w-full max-w-sm">
        <Card className="border-bb-powder-blue/20 bg-[linear-gradient(180deg,rgba(18,27,39,0.98),rgba(10,17,27,0.99))]">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-bb-powder-blue/15">
              <Sparkles size={18} className="text-bb-powder-blue animate-pulse" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-bb-powder-blue">
                Building profile
              </p>
              <p className="mt-0.5 text-sm font-medium text-gray-100">
                AI is reading your website
              </p>
            </div>
          </div>

          <div className="mt-5 space-y-2">
            {INFERENCE_STAGES.map((label, i) => {
              const done = i < stage;
              const active = i === stage;
              return (
                <div
                  key={i}
                  className={`flex items-center gap-2.5 text-sm transition-colors duration-300 ${
                    done
                      ? "text-bb-green"
                      : active
                        ? "text-gray-100"
                        : "text-gray-600"
                  }`}
                >
                  {done ? (
                    <CheckCircle2 size={14} className="shrink-0 text-bb-green" />
                  ) : active ? (
                    <div className="h-3.5 w-3.5 shrink-0 rounded-full border-2 border-bb-powder-blue border-t-transparent animate-spin" />
                  ) : (
                    <div className="h-3.5 w-3.5 shrink-0 rounded-full border border-gray-700" />
                  )}
                  {label}
                </div>
              );
            })}
          </div>

          <p className="mt-4 text-xs text-gray-500">
            This takes 20–40 seconds. We're reading multiple pages so the results are grounded in
            exactly what your website says.
          </p>
        </Card>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Result dialog
// ---------------------------------------------------------------------------

interface WebsiteInferenceDialogProps {
  profile: WebsiteInferredProfile;
  websiteUrl: string;
  onApply: (profile: WebsiteInferredProfile) => void;
  onClose: () => void;
}

function ConfidencePill({ confidence }: { confidence?: "stated" | "inferred" }) {
  if (!confidence) return null;
  return (
    <span
      className={`ml-2 inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide ${
        confidence === "stated"
          ? "bg-bb-green/15 text-bb-green"
          : "bg-bb-powder-blue/15 text-bb-powder-blue"
      }`}
    >
      {confidence}
    </span>
  );
}

function Section({ icon: Icon, title, children }: {
  icon: React.ElementType;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.15em] text-gray-500">
        <Icon size={12} />
        {title}
      </div>
      <div className="mt-2">{children}</div>
    </div>
  );
}

export function WebsiteInferenceDialog({
  profile,
  websiteUrl,
  onApply,
  onClose,
}: WebsiteInferenceDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  const qualityColor = profile.dataQuality === "rich"
    ? "text-bb-green"
    : profile.dataQuality === "moderate"
      ? "text-bb-orange"
      : "text-gray-400";

  const domain = (() => {
    try { return new URL(websiteUrl.startsWith("http") ? websiteUrl : `https://${websiteUrl}`).hostname.replace(/^www\./, ""); }
    catch { return websiteUrl; }
  })();

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 py-10"
      role="dialog"
      aria-modal="true"
      aria-labelledby="website-inference-title"
    >
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        ref={dialogRef}
        className="relative w-full max-w-2xl animate-[zoomIn_0.2s_ease-out]"
        onClick={(e) => e.stopPropagation()}
      >
        <Card className="border-bb-powder-blue/20 bg-[linear-gradient(180deg,rgba(18,27,39,0.98),rgba(10,17,27,0.99))] shadow-[0_24px_60px_rgba(0,0,0,0.6)]">
          {/* Header */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-bb-powder-blue/15">
                <Sparkles size={18} className="text-bb-powder-blue" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-bb-powder-blue">
                  Profile ready
                </p>
                <p id="website-inference-title" className="mt-0.5 text-lg font-semibold text-gray-100">
                  Built from {domain}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-xs ${qualityColor}`}>
                {profile.dataQuality === "rich" ? "Rich data" : profile.dataQuality === "moderate" ? "Moderate data" : "Limited data"}
              </span>
              <button
                type="button"
                onClick={onClose}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-700/50 hover:text-white"
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          <p className="mt-1 text-xs text-gray-500">
            Pages analysed: {profile.pagesAnalysed.join(", ")}
          </p>

          <div className="mt-6 space-y-6">
            {/* Description */}
            {profile.description && (
              <Section icon={Globe} title="Company description">
                <p className="text-sm leading-relaxed text-gray-300">{profile.description}</p>
              </Section>
            )}

            {/* Capabilities */}
            {profile.capabilities.length > 0 && (
              <Section icon={CheckCircle2} title={`${profile.capabilities.length} capabilities detected`}>
                <div className="flex flex-wrap gap-1.5">
                  {profile.capabilities.map((cap, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center rounded-lg border border-gray-700 bg-bb-dark-elevated px-2.5 py-1 text-xs text-gray-200"
                    >
                      {cap.name}
                      <ConfidencePill confidence={cap.confidence} />
                    </span>
                  ))}
                </div>
              </Section>
            )}

            {/* The Wow Section: Government Tender Intelligence */}
            <div className="rounded-2xl border border-bb-powder-blue/20 bg-bb-powder-blue/5 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.15em] text-bb-powder-blue">
                Government Tender Intelligence
              </p>
              <p className="mt-1 text-xs text-gray-400">
                AI-inferred from your website — this is the data procurement officers look for.
              </p>

              <div className="mt-4 space-y-4">
                {/* UNSPSC Codes */}
                {profile.unspscCodes.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-gray-400">UNSPSC commodity codes</p>
                    <div className="mt-2 space-y-1.5">
                      {profile.unspscCodes.map((code, i) => (
                        <div key={i} className="flex items-center justify-between gap-3">
                          <div className="flex items-baseline gap-2">
                            <span className="font-mono text-xs text-bb-powder-blue">{code.code}</span>
                            <span className="text-sm text-gray-200">{code.description}</span>
                          </div>
                          <ConfidencePill confidence={code.confidence} />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* ANZSIC */}
                {profile.anzsicCode && (
                  <div>
                    <p className="text-xs font-medium text-gray-400">ANZSIC classification</p>
                    <p className="mt-1 text-sm text-gray-200">{profile.anzsicCode}</p>
                  </div>
                )}

                {/* Government Panels */}
                {profile.governmentPanels.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-gray-400">Government panels</p>
                    <div className="mt-2 space-y-1.5">
                      {profile.governmentPanels.map((panel, i) => (
                        <div key={i} className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2">
                            <Building2 size={12} className="shrink-0 text-gray-500" />
                            <span className="text-sm text-gray-200">{panel.name}</span>
                            <span className="text-xs text-gray-500">({panel.jurisdiction})</span>
                          </div>
                          <span
                            className={`rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide ${
                              panel.status === "confirmed"
                                ? "bg-bb-green/15 text-bb-green"
                                : "bg-bb-orange/15 text-bb-orange"
                            }`}
                          >
                            {panel.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Operating Regions */}
                {profile.operatingRegions.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-gray-400">Operating regions</p>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {profile.operatingRegions.map((r, i) => (
                        <span
                          key={i}
                          className="inline-flex items-center gap-1 rounded-lg border border-gray-700 px-2 py-0.5 text-xs text-gray-300"
                        >
                          <MapPin size={10} className="text-gray-500" />
                          {r}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Tender Keywords */}
                {profile.tenderKeywords.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-gray-400">
                      Tender keywords ({profile.tenderKeywords.length})
                    </p>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {profile.tenderKeywords.map((kw, i) => (
                        <span
                          key={i}
                          className="inline-flex items-center gap-1 rounded-lg bg-gray-800 px-2 py-0.5 text-xs text-gray-400"
                        >
                          <Key size={9} className="text-gray-600" />
                          {kw}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Sectors */}
            {profile.sectors.length > 0 && (
              <Section icon={Tag} title="Sectors">
                <div className="flex flex-wrap gap-1.5">
                  {profile.sectors.map((s, i) => (
                    <span key={i} className="rounded-lg border border-gray-700 bg-bb-dark-elevated px-2.5 py-1 text-xs text-gray-300">
                      {s}
                    </span>
                  ))}
                </div>
              </Section>
            )}

            {/* Case Studies (if any) */}
            {profile.caseStudies.length > 0 && (
              <Section icon={CheckCircle2} title={`${profile.caseStudies.length} case stud${profile.caseStudies.length === 1 ? "y" : "ies"} found`}>
                <div className="space-y-2">
                  {profile.caseStudies.map((cs, i) => (
                    <div key={i} className="rounded-lg border border-gray-700/70 bg-bb-dark-elevated px-3 py-2.5">
                      <p className="text-sm font-medium text-gray-200">{cs.title}</p>
                      {cs.client && <p className="mt-0.5 text-xs text-gray-500">Client: {cs.client}</p>}
                      {cs.outcome && <p className="mt-1 text-xs text-gray-400">{cs.outcome}</p>}
                    </div>
                  ))}
                </div>
              </Section>
            )}

            {/* Data quality note for limited profiles */}
            {profile.dataQuality === "limited" && (
              <div className="flex items-start gap-2 rounded-lg border border-bb-orange/30 bg-bb-orange/10 px-3 py-2.5 text-xs text-gray-300">
                <AlertCircle size={14} className="mt-0.5 shrink-0 text-bb-orange" />
                <span>
                  Limited content was found on this website. The profile below is a starting point —
                  fill in the details you know manually after applying.
                </span>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-gray-700/50 pt-5">
            <button
              type="button"
              onClick={() => onApply(profile)}
              className="inline-flex items-center gap-2 rounded-lg bg-bb-powder-blue px-5 py-2.5 text-sm font-medium text-black hover:bg-bb-powder-blue-light"
            >
              <Sparkles size={14} />
              Apply to profile
            </button>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center rounded-lg border border-gray-600 px-4 py-2.5 text-sm text-gray-300 hover:border-gray-500 hover:text-white"
            >
              Close
            </button>
            <p className="ml-auto text-xs text-gray-500">
              Review and edit before saving
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
