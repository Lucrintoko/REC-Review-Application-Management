import { useState, useEffect, useCallback } from "react";
import { apiClient } from "../services/api";

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
      if (response && response.status === "success" && Array.isArray(response.data)) {
        setApplications(response.data);
      } else if (Array.isArray(response)) {
        setApplications(response);
      }
    } catch (err) {
      if (err.name === "AbortError") {
        return; // Request was aborted, do nothing
      }
      console.warn("API request failed or backend offline. Using fallback applications:", err);
      setError(err);
      setApplications(FALLBACK_APPLICATIONS);
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

  return {
    applications,
    isLoading,
    error,
    refetch: () => fetchApplications(),
  };
}
