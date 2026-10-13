import React from "react";

const STATUS_CLASS_MAP = {
  draft: "badge bg-secondary",
  "ongoing verification": "badge bg-info text-dark",
  "payment pending": "badge bg-info text-dark",
  "payment verified": "badge bg-info text-dark",
  submitted: "badge bg-info text-dark",
  "protocols submitted": "badge bg-info text-dark",
  "type of review": "badge bg-warning text-dark",
  "under review": "badge bg-primary",
  "ongoing review": "badge bg-primary",
  "consolidation of evaluation": "badge bg-primary",
  "needs revisions": "badge bg-warning text-dark",
  "revisions required": "badge bg-warning text-dark",
  "revisions submitted": "badge bg-warning text-dark",
  "decision letter issued": "badge bg-secondary",
  "needs progress report": "badge bg-warning text-dark",
  "awaiting approval": "badge bg-success",
  "certification finished": "badge bg-success",
  "clearance granted": "badge bg-success",
  rejected: "badge bg-danger",
  withdrawn: "badge bg-secondary",
  amendments: "badge bg-info text-dark",
  "ongoing amendments": "badge bg-info text-dark",
};

/**
 * Reusable Status Badge component with consistent colors across application statuses.
 */
function StatusBadge({ status }) {
  const normalized = (status || "").trim().toLowerCase();
  const badgeClass = STATUS_CLASS_MAP[normalized] || "badge bg-light text-dark border";

  return <span className={badgeClass}>{status || "Unknown"}</span>;
}

export default StatusBadge;
