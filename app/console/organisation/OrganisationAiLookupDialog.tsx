"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, MoreVertical, RefreshCw, Trash2, WandSparkles } from "lucide-react";
import { TextInput } from "@/components/console/organisation";
import { Badge } from "@/components/ui/Badge";
import { BbLogo } from "@/components/ui/BbLogo";
import type { OrganisationProfileSearchCandidate } from "@/lib/organisation/profile";
import type { AiState } from "./types";
import { AI_ACTION_WARNINGS, AI_MODAL, BUTTONS } from "./constants";

type PendingAction = "resync" | "delete" | null;

interface OrganisationAiLookupDialogProps {
  aiState: AiState;
  deleteState: "idle" | "deleting";
  query: string;
  error: string | null;
  info: string | null;
  candidates: OrganisationProfileSearchCandidate[];
  compact: boolean;
  hasUnsavedChanges: boolean;
  onQueryChange: (value: string) => void;
  onPrepare: () => void;
  onSearch: () => Promise<void>;
  onSelect: (candidate: OrganisationProfileSearchCandidate) => Promise<boolean>;
  onResetResults: () => void;
  onDelete: () => Promise<boolean>;
}

const AUTO_ACCEPT_DELAY_SECONDS = 5;
const AUTO_ACCEPT_CONFIDENCE = 80;

function getConfidenceVariant(confidence: number) {
  if (confidence >= 80) return "positive" as const;
  if (confidence >= 60) return "warning" as const;
  return "neutral" as const;
}

function getInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function OrganisationAiLookupDialog({
  aiState,
  deleteState,
  query,
  error,
  info,
  candidates,
  compact,
  hasUnsavedChanges,
  onQueryChange,
  onPrepare,
  onSearch,
  onSelect,
  onResetResults,
  onDelete,
}: OrganisationAiLookupDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const autoAcceptTimeoutRef = useRef<number | null>(null);
  const autoAcceptIntervalRef = useRef<number | null>(null);
  const [pendingCandidate, setPendingCandidate] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [autoAcceptCountdown, setAutoAcceptCountdown] = useState<number | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const [dismissedAutoAcceptSignature, setDismissedAutoAcceptSignature] = useState<
    string | null
  >(null);

  const candidatesSignature = useMemo(
    () =>
      candidates
        .map((candidate) =>
          [
            candidate.name,
            candidate.websiteUrl,
            candidate.linkedinUrl,
            candidate.logoUrl,
            candidate.location,
            candidate.confidence,
          ].join("::")
        )
        .join("|"),
    [candidates]
  );

  const clearAutoAccept = useCallback(() => {
    if (autoAcceptTimeoutRef.current !== null) {
      window.clearTimeout(autoAcceptTimeoutRef.current);
      autoAcceptTimeoutRef.current = null;
    }

    if (autoAcceptIntervalRef.current !== null) {
      window.clearInterval(autoAcceptIntervalRef.current);
      autoAcceptIntervalRef.current = null;
    }

    setAutoAcceptCountdown(null);
  }, []);

  const handleClose = useCallback(() => {
    clearAutoAccept();
    dialogRef.current?.close();
    setPendingCandidate(null);
    setIsOpen(false);
  }, [clearAutoAccept]);

  const closeActionWarning = useCallback(() => {
    setPendingAction(null);
  }, []);

  const handleSelect = useCallback(
    async (candidate: OrganisationProfileSearchCandidate) => {
      clearAutoAccept();
      setDismissedAutoAcceptSignature(candidatesSignature);
      setPendingCandidate(candidate.name);
      const success = await onSelect(candidate);
      setPendingCandidate(null);

      if (success) {
        handleClose();
      }
    },
    [candidatesSignature, clearAutoAccept, handleClose, onSelect]
  );

  const handleOpen = () => {
    onPrepare();
    if (!dialogRef.current?.open) {
      dialogRef.current?.showModal();
    }
    setDismissedAutoAcceptSignature(null);
    setIsOpen(true);
  };

  const handleRequestResync = () => {
    setMenuOpen(false);
    setPendingAction("resync");
  };

  const handleRequestDelete = () => {
    setMenuOpen(false);
    setPendingAction("delete");
  };

  const handleConfirmPendingAction = useCallback(async () => {
    if (pendingAction === "resync") {
      closeActionWarning();
      handleOpen();
      return;
    }

    if (pendingAction === "delete") {
      const success = await onDelete();
      if (success) {
        closeActionWarning();
      }
    }
  }, [closeActionWarning, onDelete, pendingAction]);

  const handleSearch = async () => {
    clearAutoAccept();
    setDismissedAutoAcceptSignature(null);
    await onSearch();
  };

  useEffect(() => {
    if (!menuOpen) {
      return;
    }

    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };

    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, [menuOpen]);

  useEffect(() => {
    if (!isOpen || aiState !== "idle" || candidates.length === 0) {
      clearAutoAccept();
      return;
    }

    const topCandidate = candidates[0];
    if (!topCandidate || topCandidate.confidence < AUTO_ACCEPT_CONFIDENCE) {
      clearAutoAccept();
      return;
    }

    if (dismissedAutoAcceptSignature === candidatesSignature) {
      clearAutoAccept();
      return;
    }

    clearAutoAccept();
    const startedAt = Date.now();
    setAutoAcceptCountdown(AUTO_ACCEPT_DELAY_SECONDS);

    autoAcceptIntervalRef.current = window.setInterval(() => {
      const remainingMs =
        AUTO_ACCEPT_DELAY_SECONDS * 1000 - (Date.now() - startedAt);
      setAutoAcceptCountdown(Math.max(0, Math.ceil(remainingMs / 1000)));
    }, 250);

    autoAcceptTimeoutRef.current = window.setTimeout(() => {
      setDismissedAutoAcceptSignature(candidatesSignature);
      void handleSelect(topCandidate);
    }, AUTO_ACCEPT_DELAY_SECONDS * 1000);

    return clearAutoAccept;
  }, [
    aiState,
    candidates,
    candidatesSignature,
    clearAutoAccept,
    dismissedAutoAcceptSignature,
    handleSelect,
    isOpen,
  ]);

  useEffect(() => clearAutoAccept, [clearAutoAccept]);

  return (
    <>
      {compact ? (
        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setMenuOpen((current) => !current)}
            disabled={aiState !== "idle" || deleteState === "deleting"}
            className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-gray-600 bg-bb-dark-elevated text-gray-200 hover:border-bb-powder-blue hover:text-white disabled:opacity-60"
            aria-label="Organisation AI actions"
          >
            <MoreVertical size={18} />
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-full z-20 mt-2 min-w-[220px] rounded-xl border border-gray-700 bg-bb-dark-elevated py-1 shadow-xl">
              <button
                type="button"
                onClick={handleRequestResync}
                className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm text-gray-100 hover:bg-gray-700/50"
              >
                <WandSparkles size={15} />
                {BUTTONS.resyncAi}
              </button>
              <button
                type="button"
                onClick={handleRequestDelete}
                className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm text-gray-100 hover:bg-gray-700/50 hover:text-bb-coral"
              >
                <Trash2 size={15} />
                {BUTTONS.deleteOrganisation}
              </button>
            </div>
          )}
        </div>
      ) : (
        <button
          type="button"
          onClick={handleOpen}
          disabled={aiState !== "idle"}
          className="inline-flex min-h-24 min-w-[84px] flex-col items-center justify-center gap-0.5 rounded-lg bg-bb-coral px-1.5 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-white hover:bg-bb-coral/90 disabled:opacity-60"
        >
          <span>Use</span>
          <BbLogo size={24} strokeWidth={160} className="text-white" />
          <span>AI</span>
        </button>
      )}

      {pendingAction && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="organisation-ai-warning-title"
        >
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={closeActionWarning}
            aria-hidden="true"
          />
          <div className="relative w-full max-w-lg">
            <div className="rounded-2xl border border-bb-orange/30 bg-[linear-gradient(180deg,_rgba(18,27,39,0.98),_rgba(10,17,27,0.99))] p-6 shadow-[0_24px_60px_rgba(0,0,0,0.6)]">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-bb-powder-blue">
                    Organisation actions
                  </p>
                  <p
                    id="organisation-ai-warning-title"
                    className="mt-2 text-lg font-semibold text-gray-100"
                  >
                    {AI_ACTION_WARNINGS[pendingAction].title}
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-gray-300">
                    {AI_ACTION_WARNINGS[pendingAction].description}
                  </p>
                </div>
                <div className="rounded-full bg-bb-orange/15 p-2 text-bb-orange">
                  <AlertTriangle size={18} />
                </div>
              </div>
              <div className="mt-4 space-y-2 text-sm text-gray-400">
                <p>{AI_ACTION_WARNINGS.creditCostNote}</p>
                {hasUnsavedChanges ? (
                  <p className="text-bb-orange">
                    {pendingAction === "delete"
                      ? AI_ACTION_WARNINGS.unsavedChangesDeleteNote
                      : AI_ACTION_WARNINGS.unsavedChangesResyncNote}
                  </p>
                ) : null}
              </div>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row-reverse">
                <button
                  type="button"
                  onClick={() => void handleConfirmPendingAction()}
                  disabled={deleteState === "deleting"}
                  className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-medium ${
                    AI_ACTION_WARNINGS[pendingAction].destructive
                      ? "bg-bb-coral text-white hover:bg-bb-coral/90"
                      : "bg-bb-powder-blue text-black hover:bg-bb-powder-blue-light"
                  } disabled:opacity-60`}
                >
                  {pendingAction === "delete" && deleteState === "deleting" ? (
                    <>
                      <RefreshCw size={16} className="animate-spin" />
                      {BUTTONS.deleting}
                    </>
                  ) : (
                    AI_ACTION_WARNINGS[pendingAction].confirmLabel
                  )}
                </button>
                <button
                  type="button"
                  onClick={closeActionWarning}
                  className="inline-flex items-center justify-center rounded-lg border border-gray-600 px-4 py-3 text-sm text-gray-100 hover:border-bb-powder-blue hover:text-white"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <dialog
        ref={dialogRef}
        className="w-full max-w-2xl rounded-2xl border border-gray-700 bg-bb-dark-elevated p-0 text-left shadow-xl backdrop:bg-black/70"
        onCancel={handleClose}
      >
        <div className="border-b border-gray-700/80 px-6 py-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-bb-powder-blue">
                BidBlender AI
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-gray-100">{AI_MODAL.title}</h2>
              <p className="mt-2 text-sm text-gray-400">{AI_MODAL.hint}</p>
            </div>
            <button
              type="button"
              onClick={handleClose}
              className="rounded-lg border border-gray-600 px-3 py-2 text-sm text-gray-200 hover:border-bb-powder-blue hover:text-white"
            >
              {BUTTONS.cancel}
            </button>
          </div>
        </div>

        <div className="px-6 py-5">
          <form
            className="flex flex-col gap-3 md:flex-row"
            onSubmit={(event) => {
              event.preventDefault();
              if (aiState === "idle" && query.trim().length > 0) {
                void handleSearch();
              }
            }}
          >
            <TextInput
              value={query}
              onChange={(event) => {
                clearAutoAccept();
                setDismissedAutoAcceptSignature(candidatesSignature);
                onQueryChange(event.target.value);
              }}
              placeholder={AI_MODAL.placeholder}
              className="mt-0 flex-1"
            />
            <button
              type="submit"
              disabled={aiState !== "idle" || query.trim().length === 0}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-bb-powder-blue px-4 py-2.5 text-sm font-medium text-black hover:bg-bb-powder-blue-light disabled:opacity-60"
            >
              {aiState === "searching" ? (
                <>
                  <RefreshCw size={16} className="animate-spin" />
                  {BUTTONS.searching}
                </>
              ) : (
                BUTTONS.search
              )}
            </button>
          </form>

          {error && (
            <div className="mt-4 rounded-xl border border-bb-orange/40 bg-bb-orange/10 px-4 py-3 text-sm text-gray-200">
              {error}
            </div>
          )}

          {info && !error && (
            <div className="mt-4 rounded-xl border border-bb-powder-blue/30 bg-bb-powder-blue/10 px-4 py-3 text-sm text-gray-200">
              {info}
            </div>
          )}

          {candidates.length > 0 && (
            <div className="mt-6 space-y-3">
              {autoAcceptCountdown !== null && candidates[0] && (
                <div className="rounded-xl border border-bb-powder-blue/30 bg-bb-powder-blue/10 px-4 py-3 text-sm text-gray-200">
                  Auto-selecting{" "}
                  <span className="font-semibold text-white">{candidates[0].name}</span> in{" "}
                  <span className="font-semibold text-white">{autoAcceptCountdown}s</span>.
                  Choose a different result to stop it.
                </div>
              )}

              {candidates.map((candidate) => {
                const isPending =
                  aiState === "applying" && pendingCandidate === candidate.name;

                return (
                  <div
                    key={`${candidate.name}-${candidate.websiteUrl}-${candidate.linkedinUrl}`}
                    className="flex flex-col gap-4 rounded-2xl border border-gray-700/80 bg-bb-dark px-4 py-4 md:flex-row md:items-center"
                  >
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-gray-700 bg-bb-dark-elevated p-1.5 text-sm font-semibold text-gray-200">
                      {candidate.logoUrl ? (
                        <img
                          src={candidate.logoUrl}
                          alt={`${candidate.name} logo`}
                          className="h-full w-full object-contain"
                        />
                      ) : (
                        getInitials(candidate.name)
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-base font-medium text-gray-100">{candidate.name}</p>
                        <Badge variant={getConfidenceVariant(candidate.confidence)}>
                          {candidate.confidence}% confident
                        </Badge>
                      </div>
                      <p className="mt-1 text-sm text-gray-400">
                        {candidate.location || AI_MODAL.emptyLocation}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2 text-xs text-gray-500">
                        {candidate.websiteUrl && <span>{candidate.websiteUrl}</span>}
                        {candidate.linkedinUrl && <span>{candidate.linkedinUrl}</span>}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => void handleSelect(candidate)}
                      disabled={aiState !== "idle"}
                      className="inline-flex items-center justify-center gap-2 rounded-lg bg-bb-coral px-4 py-2.5 text-sm font-medium text-white hover:bg-bb-coral/90 disabled:opacity-60"
                    >
                      {isPending ? (
                        <>
                          <RefreshCw size={16} className="animate-spin" />
                          {BUTTONS.select}
                        </>
                      ) : (
                        BUTTONS.select
                      )}
                    </button>
                  </div>
                );
              })}

              <button
                type="button"
                onClick={() => {
                  clearAutoAccept();
                  setDismissedAutoAcceptSignature(candidatesSignature);
                  onResetResults();
                }}
                className="rounded-lg border border-gray-600 px-3 py-2 text-sm text-gray-200 hover:border-bb-powder-blue hover:text-white"
              >
                {BUTTONS.noneOfThese}
              </button>
            </div>
          )}
        </div>
      </dialog>
    </>
  );
}
