export const LEGACY_DRAFT_STORAGE_KEY = "adzu_rec_application_draft_v1";

export function getApplicantDraftStorageKey(applicantId = localStorage.getItem("applicantId")) {
  return applicantId
    ? `${LEGACY_DRAFT_STORAGE_KEY}_${String(applicantId)}`
    : null;
}

export function removeApplicantDraft(applicantId) {
  const key = getApplicantDraftStorageKey(applicantId);
  if (key) {
    localStorage.removeItem(key);
  }
}

export function removeLegacyApplicantDraft() {
  localStorage.removeItem(LEGACY_DRAFT_STORAGE_KEY);
}
