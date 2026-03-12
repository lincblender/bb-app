"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  createEmptyOrganisationProfile,
  mapOrganisationToProfile,
  organisationProfileSaveSchema,
  type OrganisationProfileSearchCandidate,
} from "@/lib/organisation/profile";
import type { Organisation } from "@/lib/types";
import type {
  OrganisationProfileFormState,
  Notice,
  SaveState,
  DeleteState,
  AiState,
  ProfileSaveResponse,
  ProfileDeleteResponse,
  ProfileAiResponse,
  ProfileAiSearchResponse,
} from "./types";
import { API_ENDPOINTS, NOTICE_MESSAGES, DEFAULTS } from "./constants";

interface UseOrganisationFormOptions {
  organisation: Organisation | null;
  refetch: () => Promise<void>;
}

const ORGANISATION_PROFILE_DRAFT_STORAGE_PREFIX =
  "bidblender:organisation-profile-draft";
const RESTORED_DRAFT_NOTICE =
  "Recovered an unsaved organisation draft. Save it when you are ready.";
const MERGED_RESULTS_NOTICE =
  "Equivalent results were merged because they pointed to the same website or LinkedIn URL.";

function toComparableProfile(form: OrganisationProfileFormState) {
  return {
    name: form.name.trim(),
    description: form.description.trim(),
    websiteUrl: form.websiteUrl.trim(),
    linkedinUrl: form.linkedinUrl.trim(),
    logoUrl: form.logoUrl.trim(),
    location: form.location.trim(),
    socialProfiles: form.socialProfiles.map((profile) => ({
      platform: profile.platform,
      url: profile.url.trim(),
      handle: profile.handle.trim(),
      follows: profile.follows ?? null,
      followers: profile.followers ?? null,
      lastPostDate: profile.lastPostDate.trim(),
    })),
    sectors: form.sectors.map((value) => value.trim()),
    capabilities: form.capabilities.map((capability) => ({
      name: capability.name.trim(),
      category: capability.category.trim(),
    })),
    certifications: form.certifications.map((certification) => ({
      name: certification.name.trim(),
      issuer: certification.issuer.trim(),
    })),
    individualQualifications: form.individualQualifications.map((qualification) => ({
      name: qualification.name.trim(),
      issuer: qualification.issuer.trim(),
      count: qualification.count,
      holderNames: qualification.holderNames.map((value) => value.trim()),
    })),
    caseStudies: form.caseStudies.map((caseStudy) => ({
      title: caseStudy.title.trim(),
      client: caseStudy.client.trim(),
      outcome: caseStudy.outcome.trim(),
    })),
    strategicPreferences: form.strategicPreferences.map((value) => value.trim()),
    targetMarkets: form.targetMarkets.map((value) => value.trim()),
    partnerGaps: form.partnerGaps.map((value) => value.trim()),
  };
}

function countLeafValues(value: unknown): number {
  if (Array.isArray(value)) {
    return value.reduce((total, item) => total + countLeafValues(item), 0);
  }

  if (value && typeof value === "object") {
    return Object.values(value).reduce((total, item) => total + countLeafValues(item), 0);
  }

  return 1;
}

function countChangedValues(current: unknown, baseline: unknown): number {
  if (Array.isArray(current) || Array.isArray(baseline)) {
    const currentItems = Array.isArray(current) ? current : [];
    const baselineItems = Array.isArray(baseline) ? baseline : [];
    let total = 0;

    for (let index = 0; index < Math.max(currentItems.length, baselineItems.length); index += 1) {
      total += countChangedValues(currentItems[index], baselineItems[index]);
    }

    return total;
  }

  if (
    current &&
    baseline &&
    typeof current === "object" &&
    typeof baseline === "object"
  ) {
    const keys = new Set([
      ...Object.keys(current as Record<string, unknown>),
      ...Object.keys(baseline as Record<string, unknown>),
    ]);

    let total = 0;
    for (const key of keys) {
      total += countChangedValues(
        (current as Record<string, unknown>)[key],
        (baseline as Record<string, unknown>)[key]
      );
    }
    return total;
  }

  if (current === baseline) {
    return 0;
  }

  return Math.max(countLeafValues(current), countLeafValues(baseline), 1);
}

function getDraftStorageKey(organisationId: string | null | undefined) {
  return `${ORGANISATION_PROFILE_DRAFT_STORAGE_PREFIX}:${organisationId ?? "workspace-default"}`;
}

function normaliseCandidateUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }

  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;

  try {
    const url = new URL(withProtocol);
    const host = url.hostname.toLowerCase().replace(/^www\./, "");
    const pathname = url.pathname.replace(/\/+$/, "").toLowerCase();

    if (!pathname || pathname === "/") {
      return host;
    }

    if (host === "linkedin.com" || host.endsWith(".linkedin.com")) {
      const companyMatch = pathname.match(/^\/company\/([^/]+)/);
      if (companyMatch) {
        return `linkedin.com/company/${companyMatch[1]}`;
      }
    }

    return `${host}${pathname}`;
  } catch {
    return withProtocol
      .toLowerCase()
      .replace(/^https?:\/\//, "")
      .replace(/^www\./, "")
      .replace(/\/+$/, "");
  }
}

function getCandidateIdentityTokens(candidate: OrganisationProfileSearchCandidate) {
  const tokens = [
    candidate.websiteUrl ? `website:${normaliseCandidateUrl(candidate.websiteUrl)}` : "",
    candidate.linkedinUrl ? `linkedin:${normaliseCandidateUrl(candidate.linkedinUrl)}` : "",
  ].filter((value) => value.length > 0);

  if (tokens.length > 0) {
    return tokens;
  }

  return [
    `name:${candidate.name.trim().toLowerCase()}`,
    `location:${candidate.location.trim().toLowerCase()}`,
  ];
}

function getCandidateCompletenessScore(candidate: OrganisationProfileSearchCandidate) {
  return [
    candidate.websiteUrl,
    candidate.linkedinUrl,
    candidate.logoUrl,
    candidate.location,
    candidate.name,
  ].filter((value) => value.trim().length > 0).length;
}

function mergeSearchCandidates(
  left: OrganisationProfileSearchCandidate,
  right: OrganisationProfileSearchCandidate
) {
  const leftScore = getCandidateCompletenessScore(left);
  const rightScore = getCandidateCompletenessScore(right);
  const preferred =
    right.confidence > left.confidence ||
    (right.confidence === left.confidence && rightScore > leftScore)
      ? right
      : left;
  const secondary = preferred === right ? left : right;

  return {
    name: preferred.name || secondary.name,
    websiteUrl: preferred.websiteUrl || secondary.websiteUrl,
    linkedinUrl: preferred.linkedinUrl || secondary.linkedinUrl,
    logoUrl: preferred.logoUrl || secondary.logoUrl,
    location: preferred.location || secondary.location,
    confidence: Math.max(left.confidence, right.confidence),
  };
}

function dedupeSearchCandidates(candidates: OrganisationProfileSearchCandidate[]) {
  const deduped: OrganisationProfileSearchCandidate[] = [];
  let mergedCount = 0;

  for (const candidate of candidates) {
    const tokens = getCandidateIdentityTokens(candidate);
    const existingIndex = deduped.findIndex((existing) => {
      const existingTokens = getCandidateIdentityTokens(existing);
      return tokens.some((token) => existingTokens.includes(token));
    });

    if (existingIndex === -1) {
      deduped.push(candidate);
      continue;
    }

    deduped[existingIndex] = mergeSearchCandidates(deduped[existingIndex], candidate);
    mergedCount += 1;
  }

  return {
    candidates: deduped.sort((left, right) => right.confidence - left.confidence),
    mergedCount,
  };
}

export function useOrganisationForm({
  organisation,
  refetch,
}: UseOrganisationFormOptions) {
  const initialForm = useMemo(
    () => mapOrganisationToProfile(organisation),
    [organisation]
  );
  const initialFormSignature = useMemo(
    () => JSON.stringify(toComparableProfile(initialForm)),
    [initialForm]
  );
  const [form, setForm] = useState<OrganisationProfileFormState>(initialForm);
  const [baselineForm, setBaselineForm] = useState<OrganisationProfileFormState>(initialForm);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [deleteState, setDeleteState] = useState<DeleteState>("idle");
  const [aiState, setAiState] = useState<AiState>("idle");
  const [notice, setNotice] = useState<Notice | null>(null);
  const [aiLookupQuery, setAiLookupQuery] = useState("");
  const [aiLookupError, setAiLookupError] = useState<string | null>(null);
  const [aiLookupInfo, setAiLookupInfo] = useState<string | null>(null);
  const [aiCandidates, setAiCandidates] = useState<OrganisationProfileSearchCandidate[]>([]);
  const [socialSearchMatches, setSocialSearchMatches] = useState<
    { url: string; handle: string }[]
  >([]);
  const [socialSearchLoading, setSocialSearchLoading] = useState(false);
  const draftStorageKey = useMemo(
    () => getDraftStorageKey(organisation?.id),
    [organisation?.id]
  );
  const hydratedDraftKeyRef = useRef<string | null>(null);
  const previousInitialFormSignatureRef = useRef<string>(initialFormSignature);
  const dirtyFieldCount = useMemo(
    () =>
      countChangedValues(
        toComparableProfile(form),
        toComparableProfile(baselineForm)
      ),
    [baselineForm, form]
  );
  const hasUnsavedChanges = dirtyFieldCount > 0;

  useEffect(() => {
    if (typeof window === "undefined") {
      setForm(initialForm);
      setBaselineForm(initialForm);
      hydratedDraftKeyRef.current = draftStorageKey;
      previousInitialFormSignatureRef.current = initialFormSignature;
      return;
    }

    if (hydratedDraftKeyRef.current !== draftStorageKey) {
      hydratedDraftKeyRef.current = draftStorageKey;

      try {
        const rawDraft = window.localStorage.getItem(draftStorageKey);
        if (!rawDraft) {
          setForm(initialForm);
          setBaselineForm(initialForm);
          previousInitialFormSignatureRef.current = initialFormSignature;
          return;
        }

        const parsedDraft = JSON.parse(rawDraft) as { form?: unknown };
        const validatedDraft = organisationProfileSaveSchema.safeParse(parsedDraft.form);

        if (!validatedDraft.success) {
          window.localStorage.removeItem(draftStorageKey);
          setForm(initialForm);
          setBaselineForm(initialForm);
          previousInitialFormSignatureRef.current = initialFormSignature;
          return;
        }

        const restoredForm = validatedDraft.data;
        const differsFromServer =
          countChangedValues(
            toComparableProfile(restoredForm),
            toComparableProfile(initialForm)
          ) > 0;

        if (!differsFromServer) {
          window.localStorage.removeItem(draftStorageKey);
          setForm(initialForm);
          setBaselineForm(initialForm);
          previousInitialFormSignatureRef.current = initialFormSignature;
          return;
        }

        setForm(restoredForm);
        setBaselineForm(initialForm);
        previousInitialFormSignatureRef.current = initialFormSignature;
        setNotice((current) => current ?? { tone: "positive", text: RESTORED_DRAFT_NOTICE });
        return;
      } catch {
        window.localStorage.removeItem(draftStorageKey);
        setForm(initialForm);
        setBaselineForm(initialForm);
        previousInitialFormSignatureRef.current = initialFormSignature;
        return;
      }
    }

    if (
      !hasUnsavedChanges &&
      previousInitialFormSignatureRef.current !== initialFormSignature
    ) {
      setForm(initialForm);
      setBaselineForm(initialForm);
      previousInitialFormSignatureRef.current = initialFormSignature;
    }
  }, [draftStorageKey, hasUnsavedChanges, initialForm, initialFormSignature]);

  useEffect(() => {
    if (
      typeof window === "undefined" ||
      hydratedDraftKeyRef.current !== draftStorageKey
    ) {
      return;
    }

    if (!hasUnsavedChanges) {
      window.localStorage.removeItem(draftStorageKey);
      return;
    }

    const timeout = window.setTimeout(() => {
      window.localStorage.setItem(draftStorageKey, JSON.stringify({ form }));
    }, 250);

    return () => window.clearTimeout(timeout);
  }, [draftStorageKey, form, hasUnsavedChanges]);

  const setField = useCallback(
    <Key extends keyof OrganisationProfileFormState>(
      key: Key,
      value: OrganisationProfileFormState[Key]
    ) => {
      setForm((current) => ({ ...current, [key]: value }));
    },
    []
  );

  const clearNotice = useCallback(() => {
    setNotice(null);
  }, []);

  const updateCapability = useCallback(
    (index: number, key: "name" | "category", value: string) => {
      setForm((current) => ({
        ...current,
        capabilities: current.capabilities.map((capability, i) =>
          i === index ? { ...capability, [key]: value } : capability
        ),
      }));
    },
    []
  );

  const updateCertification = useCallback(
    (index: number, key: "name" | "issuer", value: string) => {
      setForm((current) => ({
        ...current,
        certifications: current.certifications.map((certification, i) =>
          i === index ? { ...certification, [key]: value } : certification
        ),
      }));
    },
    []
  );

  const updateIndividualQualification = useCallback(
    (
      index: number,
      key: keyof import("@/lib/types").IndividualQualification,
      value: string | number | string[]
    ) => {
      setForm((current) => ({
        ...current,
        individualQualifications: current.individualQualifications.map((iq, i) =>
          i === index ? { ...iq, [key]: value } : iq
        ),
      }));
    },
    []
  );

  const updateCaseStudy = useCallback(
    (index: number, key: "title" | "client" | "outcome", value: string) => {
      setForm((current) => ({
        ...current,
        caseStudies: current.caseStudies.map((caseStudy, i) =>
          i === index ? { ...caseStudy, [key]: value } : caseStudy
        ),
      }));
    },
    []
  );

  const addCapability = useCallback(() => {
    setForm((current) => ({
      ...current,
      capabilities: [
        ...current.capabilities,
        { id: null, name: "", category: DEFAULTS.capabilityCategory },
      ],
    }));
  }, []);

  const removeCapability = useCallback((index: number) => {
    setForm((current) => ({
      ...current,
      capabilities: current.capabilities.filter((_, i) => i !== index),
    }));
  }, []);

  const addCertification = useCallback(() => {
    setForm((current) => ({
      ...current,
      certifications: [
        ...current.certifications,
        { id: null, name: "", issuer: "" },
      ],
    }));
  }, []);

  const removeCertification = useCallback((index: number) => {
    setForm((current) => ({
      ...current,
      certifications: current.certifications.filter((_, i) => i !== index),
    }));
  }, []);

  const addIndividualQualification = useCallback(() => {
    setForm((current) => ({
      ...current,
      individualQualifications: [
        ...current.individualQualifications,
        { id: null, name: "", issuer: "", count: 1, holderNames: [] },
      ],
    }));
  }, []);

  const removeIndividualQualification = useCallback((index: number) => {
    setForm((current) => ({
      ...current,
      individualQualifications: current.individualQualifications.filter(
        (_, i) => i !== index
      ),
    }));
  }, []);

  const addCaseStudy = useCallback(() => {
    setForm((current) => ({
      ...current,
      caseStudies: [
        ...current.caseStudies,
        { id: null, title: "", client: "", outcome: "" },
      ],
    }));
  }, []);

  const removeCaseStudy = useCallback((index: number) => {
    setForm((current) => ({
      ...current,
      caseStudies: current.caseStudies.filter((_, i) => i !== index),
    }));
  }, []);

  const addSocialProfile = useCallback(
    (profile: {
      platform:
        | "linkedin"
        | "youtube"
        | "instagram"
        | "facebook"
        | "x"
        | "tiktok"
        | "google_business"
        | "github"
        | "threads"
        | "pinterest"
        | "crunchbase";
      url: string;
      handle: string;
    }) => {
      setForm((current) => ({
        ...current,
        socialProfiles: [
          ...current.socialProfiles,
          {
            id: `social-profile-${Date.now()}`,
            platform: profile.platform,
            url: profile.url.trim(),
            handle: profile.handle.trim(),
            follows: null,
            followers: null,
            lastPostDate: "",
          },
        ],
      }));
    },
    []
  );

  const removeSocialProfile = useCallback((index: number) => {
    setForm((current) => ({
      ...current,
      socialProfiles: current.socialProfiles.filter((_, i) => i !== index),
    }));
  }, []);

  const searchSocialProfiles = useCallback(
    async (
      platform:
        | "linkedin"
        | "youtube"
        | "instagram"
        | "facebook"
        | "x"
        | "tiktok"
        | "google_business"
        | "github"
        | "threads"
        | "pinterest"
        | "crunchbase",
      searchQuery: string
    ) => {
      const query = searchQuery.trim();
      if (!query) {
        return [];
      }

      setSocialSearchLoading(true);
      setSocialSearchMatches([]);

      try {
        const response = await fetch(API_ENDPOINTS.profileAiSocialSearch, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            platform,
            searchQuery: query,
            companyName: form.name.trim() || undefined,
          }),
        });

        const body = (await response.json().catch(() => ({}))) as {
          error?: string;
          matches?: { url: string; handle: string }[];
        };

        if (!response.ok) {
          throw new Error(body.error ?? "Search failed.");
        }

        const matches = body.matches ?? [];
        setSocialSearchMatches(matches);
        return matches;
      } catch (error) {
        setNotice({
          tone: "warning",
          text: error instanceof Error ? error.message : "Could not search for social profile.",
        });
        return [];
      } finally {
        setSocialSearchLoading(false);
      }
    },
    [form.name]
  );

  const clearSocialSearchMatches = useCallback(() => {
    setSocialSearchMatches([]);
  }, []);

  const updateSocialProfile = useCallback(
    (
      index: number,
      key: "url" | "handle" | "follows" | "followers" | "lastPostDate",
      value: string | number | null
    ) => {
      setForm((current) => ({
        ...current,
        socialProfiles: current.socialProfiles.map((profile, i) =>
          i === index ? { ...profile, [key]: value } : profile
        ),
      }));
    },
    []
  );

  const updateSocialProfileFields = useCallback(
    (index: number, updates: { url?: string; handle?: string }) => {
      setForm((current) => ({
        ...current,
        socialProfiles: current.socialProfiles.map((profile, i) =>
          i === index ? { ...profile, ...updates } : profile
        ),
      }));
    },
    []
  );

  const handleSave = useCallback(async () => {
    setSaveState("saving");
    setNotice(null);

    try {
      const response = await fetch(API_ENDPOINTS.profile, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: form.id,
          name: form.name,
          description: form.description,
          websiteUrl: form.websiteUrl,
          linkedinUrl: form.linkedinUrl,
          logoUrl: form.logoUrl,
          location: form.location,
          socialProfiles: form.socialProfiles,
          sectors: form.sectors,
          capabilities: form.capabilities,
          certifications: form.certifications,
          individualQualifications: form.individualQualifications,
          caseStudies: form.caseStudies,
          strategicPreferences: form.strategicPreferences,
          targetMarkets: form.targetMarkets,
          partnerGaps: form.partnerGaps,
        }),
      });

      const body = (await response.json().catch(() => ({}))) as ProfileSaveResponse;

      if (!response.ok) {
        throw new Error(body.error ?? NOTICE_MESSAGES.saveError);
      }

      const savedProfile = {
        ...form,
        ...(body.profile ?? {}),
        id: body.organisationId ?? body.profile?.id ?? form.id,
      };
      setForm(savedProfile);
      setBaselineForm(savedProfile);
      if (typeof window !== "undefined") {
        window.localStorage.removeItem(draftStorageKey);
      }
      await refetch();
      setSaveState("saved");
      setNotice({ tone: "positive", text: NOTICE_MESSAGES.saveSuccess });
      setTimeout(() => setSaveState("idle"), 1500);
      return true;
    } catch (error) {
      setSaveState("idle");
      setNotice({
        tone: "warning",
        text:
          error instanceof Error ? error.message : NOTICE_MESSAGES.saveError,
      });
      return false;
    }
  }, [draftStorageKey, form, refetch]);

  const handleDelete = useCallback(async () => {
    const organisationId = form.id ?? organisation?.id ?? null;
    if (!organisationId) {
      setNotice({
        tone: "warning",
        text: NOTICE_MESSAGES.deleteError,
      });
      return false;
    }

    setDeleteState("deleting");
    setNotice(null);

    try {
      const response = await fetch(
        `${API_ENDPOINTS.profile}?id=${encodeURIComponent(organisationId)}`,
        {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
        }
      );

      const body = (await response.json().catch(() => ({}))) as ProfileDeleteResponse;
      if (!response.ok) {
        throw new Error(body.error ?? NOTICE_MESSAGES.deleteError);
      }

      if (typeof window !== "undefined") {
        window.localStorage.removeItem(draftStorageKey);
      }

      const emptyProfile = createEmptyOrganisationProfile();
      setSaveState("idle");
      setAiState("idle");
      setBaselineForm(emptyProfile);
      setForm(emptyProfile);
      setAiLookupQuery("");
      setAiLookupError(null);
      setAiLookupInfo(null);
      setAiCandidates([]);
      setSocialSearchMatches([]);
      await refetch();
      setNotice({ tone: "positive", text: NOTICE_MESSAGES.deleteSuccess });
      return true;
    } catch (error) {
      setNotice({
        tone: "warning",
        text:
          error instanceof Error ? error.message : NOTICE_MESSAGES.deleteError,
      });
      return false;
    } finally {
      setDeleteState("idle");
    }
  }, [draftStorageKey, form.id, organisation?.id, refetch]);

  const prepareAiLookup = useCallback(() => {
    setAiLookupQuery(form.name || form.websiteUrl || form.linkedinUrl || "");
    setAiCandidates([]);
    setAiLookupError(null);
    setAiLookupInfo(null);
    setAiState("idle");
  }, [form.linkedinUrl, form.name, form.websiteUrl]);

  const clearAiLookupResults = useCallback(() => {
    setAiCandidates([]);
    setAiLookupError(null);
    setAiLookupInfo(null);
    setAiState("idle");
  }, []);

  const searchAiCandidates = useCallback(async () => {
    const query = aiLookupQuery.trim();
    if (!query) {
      setAiLookupError("Provide a company name, website URL, or LinkedIn company URL.");
      return;
    }

    setAiState("searching");
    setAiLookupError(null);
    setAiLookupInfo(null);
    setAiCandidates([]);

    try {
      const response = await fetch(API_ENDPOINTS.profileAiSearch, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query,
        }),
      });

      const body = (await response.json().catch(() => ({}))) as ProfileAiSearchResponse;

      if (!response.ok) {
        throw new Error(body.error ?? NOTICE_MESSAGES.aiSearchError);
      }

      const { candidates, mergedCount } = dedupeSearchCandidates(body.candidates ?? []);
      setAiCandidates(candidates);
      setAiLookupInfo(mergedCount > 0 ? MERGED_RESULTS_NOTICE : null);
      if (candidates.length === 0) {
        setAiLookupError(NOTICE_MESSAGES.aiNoMatches);
      }
    } catch (error) {
      setAiLookupError(
        error instanceof Error ? error.message : NOTICE_MESSAGES.aiSearchError
      );
    } finally {
      setAiState("idle");
    }
  }, [aiLookupQuery]);

  const reGrabAssets = useCallback(async () => {
    const companyName = form.name.trim();
    const websiteUrl = form.websiteUrl.trim();
    const linkedinUrl = form.linkedinUrl.trim();
    if (!companyName && !websiteUrl && !linkedinUrl) {
      setNotice({
        tone: "warning",
        text: "Provide a company name, website URL, or LinkedIn URL before re-grabbing assets.",
      });
      return false;
    }

    setAiState("applying");
    setNotice(null);

    try {
      const response = await fetch(API_ENDPOINTS.profileAi, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyName: companyName || undefined,
          websiteUrl: websiteUrl || undefined,
          linkedinUrl: linkedinUrl || undefined,
        }),
      });

      const body = (await response.json().catch(() => ({}))) as ProfileAiResponse;

      if (!response.ok || !body.profile) {
        throw new Error(body.error ?? NOTICE_MESSAGES.aiError);
      }

      const profile = body.profile;
      setForm((current) => ({
        ...current,
        logoUrl: profile.logoUrl || current.logoUrl,
        linkedinUrl: profile.linkedinUrl || current.linkedinUrl,
        socialProfiles: profile.socialProfiles?.length
          ? profile.socialProfiles
          : current.socialProfiles,
      }));
      setNotice({ tone: "positive", text: "Logo and social assets updated. Save when ready." });
      return true;
    } catch (error) {
      setNotice({
        tone: "warning",
        text: error instanceof Error ? error.message : NOTICE_MESSAGES.aiError,
      });
      return false;
    } finally {
      setAiState("idle");
    }
  }, [form.name, form.websiteUrl, form.linkedinUrl]);

  const applyAiCandidate = useCallback(
    async (candidate: OrganisationProfileSearchCandidate) => {
      setAiState("applying");
      setAiLookupError(null);
      setNotice(null);

      try {
        const response = await fetch(API_ENDPOINTS.profileAi, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            companyName: candidate.name,
            websiteUrl: candidate.websiteUrl,
            linkedinUrl: candidate.linkedinUrl,
          }),
        });

        const body = (await response.json().catch(() => ({}))) as ProfileAiResponse;

        if (!response.ok || !body.profile) {
          throw new Error(body.error ?? NOTICE_MESSAGES.aiError);
        }

        const profile = body.profile;
        setForm((current) => ({
          ...current,
          ...profile,
          websiteUrl: profile.websiteUrl || candidate.websiteUrl,
          linkedinUrl: profile.linkedinUrl || candidate.linkedinUrl,
          logoUrl: profile.logoUrl || candidate.logoUrl,
          location: profile.location || candidate.location,
          id: current.id,
        }));
        setNotice({ tone: "positive", text: NOTICE_MESSAGES.aiSuccess });
        setAiCandidates([]);
        return true;
      } catch (error) {
        setAiLookupError(
          error instanceof Error ? error.message : NOTICE_MESSAGES.aiError
        );
        return false;
      } finally {
        setAiState("idle");
      }
    },
    []
  );

  const listHandlers = {
    capabilities: {
      items: form.capabilities,
      onAdd: addCapability,
      onRemove: removeCapability,
      onUpdate: updateCapability as (i: number, k: string, v: string) => void,
    },
    certifications: {
      items: form.certifications,
      onAdd: addCertification,
      onRemove: removeCertification,
      onUpdate: updateCertification as (i: number, k: string, v: string) => void,
    },
    individualQualifications: {
      items: form.individualQualifications,
      onAdd: addIndividualQualification,
      onRemove: removeIndividualQualification,
      onUpdate: updateIndividualQualification,
    },
    caseStudies: {
      items: form.caseStudies,
      onAdd: addCaseStudy,
      onRemove: removeCaseStudy,
      onUpdate: updateCaseStudy as (i: number, k: string, v: string) => void,
    },
  };

  return {
    form,
    saveState,
    deleteState,
    aiState,
    notice,
    clearNotice,
    setField,
    aiLookupQuery,
    setAiLookupQuery,
    aiLookupError,
    aiLookupInfo,
    aiCandidates,
    dirtyFieldCount,
    hasUnsavedChanges,
    listHandlers,
    prepareAiLookup,
    clearAiLookupResults,
    searchAiCandidates,
    applyAiCandidate,
    reGrabAssets,
    addSocialProfile,
    removeSocialProfile,
    updateSocialProfile,
    updateSocialProfileFields,
    searchSocialProfiles,
    socialSearchMatches,
    socialSearchLoading,
    clearSocialSearchMatches,
    handleSave,
    handleDelete,
  };
}
