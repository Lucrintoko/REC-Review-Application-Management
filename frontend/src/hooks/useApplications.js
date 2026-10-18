import { useState, useEffect, useCallback } from "react";
import { apiClient } from "../services/api";

const DRAFT_STORAGE_KEY = "adzu_rec_application_draft_v1";

function getLocalDraftApplication() {
  const savedDraft = localStorage.getItem(DRAFT_STORAGE_KEY);
  if (!savedDraft) return null;

  try {
    const parsedDraft = JSON.parse(savedDraft);
    if (!parsedDraft?.data) return null;

    return {
      application_id: "local-draft",
      protocol_code: parsedDraft.data.rec_code || "Draft",
      research_title: parsedDraft.data.study_title || "Untitled Draft",
      research_type: parsedDraft.data.study_type || "Undergraduate",
      status: "Draft",
      submission_date: parsedDraft.savedAt || new Date().toISOString(),
      form_data: parsedDraft.data,
    };
  } catch {
    localStorage.removeItem(DRAFT_STORAGE_KEY);
    return null;
  }
}

/**
 * Custom React hook for fetching and managing applications data.
 * Includes loading, error handling, cancellation, and refetch capability.
 */
export function useApplications() {
  const [applications, setApplications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchApplications = useCallback(async (signal) => {
    setIsLoading(true);
    setError(null);

    const applicantId = localStorage.getItem('applicantId');
    const endpoint = applicantId ? `/applications?applicant_id=${applicantId}` : "/applications";

    try {
      const response = await apiClient.get(endpoint, { signal });
      let loadedApplications = [];
      if (response && response.status === "success" && Array.isArray(response.data)) {
        loadedApplications = response.data;
      } else if (Array.isArray(response)) {
        loadedApplications = response;
      }

      const localDraft = getLocalDraftApplication();
      if (localDraft) {
        loadedApplications = [
          localDraft,
          ...loadedApplications.filter((application) => application.application_id !== "local-draft"),
        ];
      }

      setApplications(loadedApplications);
    } catch (err) {
      if (err.name === "AbortError") {
        return; // Request was aborted, do nothing
      }
      console.warn("API request failed or backend offline. Using fallback applications:", err);
      setError(err);
      const localDraft = getLocalDraftApplication();
      setApplications(localDraft ? [localDraft] : []);
    } finally {
      if (!signal?.aborted) {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    fetchApplications(controller.signal);

    return () => {
      controller.abort();
    };
  }, [fetchApplications]);

  const deleteApplication = useCallback(async (application) => {
    if (application.application_id === "local-draft") {
      localStorage.removeItem(DRAFT_STORAGE_KEY);
      await fetchApplications();
      return;
    }

    const applicantId = localStorage.getItem("applicantId");
    await apiClient.delete(`/applications/${application.application_id}`, {
      application_id: application.application_id,
      applicant_id: applicantId,
    });
    localStorage.removeItem(DRAFT_STORAGE_KEY);
    await fetchApplications();
  }, [fetchApplications]);

  return {
    applications,
    isLoading,
    error,
    refetch: () => fetchApplications(),
    deleteApplication,
  };
}
