import { APPLICATION_TYPES } from "../constants/applicationTypes";

/**
 * Checks if an application matches a category/type filter key.
 */
export function matchesTypeFilter(app, typeKey) {
  if (!typeKey || typeKey === "ALL") return true;

  const typeConfig = APPLICATION_TYPES.find((t) => t.id === typeKey);
  const status = (app.status || "").trim().toLowerCase();
  const type = (app.application_type || app.research_type || "").trim().toLowerCase();
  const key = typeKey.trim().toLowerCase();

  // Check direct status or type matching
  if (status === key || type === key) return true;

  // Check alias list from configuration
  if (typeConfig) {
    if (typeConfig.aliases.some((alias) => alias.toLowerCase() === status)) return true;
    if (typeConfig.aliases.some((alias) => alias.toLowerCase() === type)) return true;
  }

  return false;
}

/**
 * Filters a list of applications by category type and search query.
 */
export function filterApplications(applications, selectedType, searchQuery) {
  if (!Array.isArray(applications)) return [];

  const searchLower = (searchQuery || "").trim().toLowerCase();

  return applications.filter((app) => {
    // 1. Type matching
    const matchesType = matchesTypeFilter(app, selectedType);
    if (!matchesType) return false;

    // 2. Search query matching
    if (!searchLower) return true;

    return (
      (app.research_title && app.research_title.toLowerCase().includes(searchLower)) ||
      (app.title && app.title.toLowerCase().includes(searchLower)) ||
      (app.protocol_code && app.protocol_code.toLowerCase().includes(searchLower)) ||
      (app.protocol_no && app.protocol_no.toLowerCase().includes(searchLower)) ||
      (app.status && app.status.toLowerCase().includes(searchLower)) ||
      (app.submission_date && app.submission_date.toLowerCase().includes(searchLower)) ||
      (app.date_submitted && app.date_submitted.toLowerCase().includes(searchLower))
    );
  });
}

/**
 * Sorts an application list by the given sort configuration { key, direction }.
 */
export function sortApplications(applications, sortConfig) {
  if (!Array.isArray(applications)) return [];
  if (!sortConfig || !sortConfig.key) return applications;

  return [...applications].sort((a, b) => {
    let aVal = "";
    let bVal = "";

    switch (sortConfig.key) {
      case "research_title":
        aVal = (a.research_title || a.title || "").toLowerCase();
        bVal = (b.research_title || b.title || "").toLowerCase();
        return sortConfig.direction === "asc"
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);

      case "protocol_code":
        aVal = a.protocol_code || a.protocol_no || "";
        bVal = b.protocol_code || b.protocol_no || "";
        return sortConfig.direction === "asc"
          ? aVal.localeCompare(bVal, undefined, { numeric: true, sensitivity: "base" })
          : bVal.localeCompare(aVal, undefined, { numeric: true, sensitivity: "base" });

      case "submission_date": {
        const aDate = a.submission_date || a.date_submitted || "";
        const bDate = b.submission_date || b.date_submitted || "";
        const aTime = aDate ? new Date(aDate).getTime() : 0;
        const bTime = bDate ? new Date(bDate).getTime() : 0;
        return sortConfig.direction === "asc" ? aTime - bTime : bTime - aTime;
      }

      case "status":
        aVal = (a.status || "").toLowerCase();
        bVal = (b.status || "").toLowerCase();
        return sortConfig.direction === "asc"
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);

      default:
        return 0;
    }
  });
}
