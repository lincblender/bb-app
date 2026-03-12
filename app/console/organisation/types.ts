import type {
  OrganisationProfileSaveInput,
  OrganisationProfileSearchCandidate,
} from "@/lib/organisation/profile";

/** Persisted organisation profile form state */
export type OrganisationProfileFormState = OrganisationProfileSaveInput;

/** Save button state */
export type SaveState = "idle" | "saving" | "saved";

/** Delete action state */
export type DeleteState = "idle" | "deleting";

/** AI populate button state */
export type AiState = "idle" | "searching" | "applying" | "running";

/** Notice tone for feedback messages */
export type NoticeTone = "positive" | "warning";

/** User-facing notice message */
export interface Notice {
  tone: NoticeTone;
  text: string;
}

/** API response shape for profile save */
export interface ProfileSaveResponse {
  error?: string;
  organisationId?: string;
  profile?: OrganisationProfileFormState;
}

/** API response shape for profile delete */
export interface ProfileDeleteResponse {
  error?: string;
  deleted?: boolean;
}

/** API response shape for AI company search */
export interface ProfileAiSearchResponse {
  error?: string;
  candidates?: OrganisationProfileSearchCandidate[];
}

/** API response shape for AI profile populate */
export interface ProfileAiResponse {
  error?: string;
  profile?: OrganisationProfileFormState;
}
