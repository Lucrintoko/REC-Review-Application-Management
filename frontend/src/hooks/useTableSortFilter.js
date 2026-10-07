import { useState, useMemo, useCallback } from "react";
import { filterApplications, sortApplications, matchesTypeFilter } from "../utils/applicationFilters";

/**
 * Custom hook to manage client-side filtering, sorting, and counts for application tables.
 */
export function useTableSortFilter(applications = []) {
  const [selectedType, setSelectedType] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortConfig, setSortConfig] = useState({
    key: "submission_date",
    direction: "desc",
  });

  // Filter applications by category and search text
  const filteredApplications = useMemo(() => {
    return filterApplications(applications, selectedType, searchQuery);
  }, [applications, selectedType, searchQuery]);

  // Sort filtered applications
  const sortedApplications = useMemo(() => {
    return sortApplications(filteredApplications, sortConfig);
  }, [filteredApplications, sortConfig]);

  // Toggle sort direction or sort by new column
  const handleSort = useCallback((columnKey) => {
    setSortConfig((prev) => {
      if (prev.key === columnKey) {
        return {
          key: columnKey,
          direction: prev.direction === "asc" ? "desc" : "asc",
        };
      }
      return {
        key: columnKey,
        direction: columnKey === "submission_date" ? "desc" : "asc",
      };
    });
  }, []);

  // Compute counts per category type
  const getTypeCount = useCallback(
    (typeConfig) => {
      if (!typeConfig || !Array.isArray(applications)) return 0;
      return applications.filter((app) => matchesTypeFilter(app, typeConfig.id)).length;
    },
    [applications]
  );

  // Clear all filters back to default state
  const clearFilters = useCallback(() => {
    setSelectedType("ALL");
    setSearchQuery("");
    setSortConfig({ key: "submission_date", direction: "desc" });
  }, []);

  return {
    selectedType,
    setSelectedType,
    searchQuery,
    setSearchQuery,
    sortConfig,
    handleSort,
    filteredApplications,
    sortedApplications,
    getTypeCount,
    clearFilters,
  };
}
