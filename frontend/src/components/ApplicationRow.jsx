import React from "react";
import StatusBadge from "./StatusBadge";
import { formatDate } from "../utils/formatters";

/**
 * Renders an individual application row inside the applications table.
 */
function ApplicationRow({ application, onSelect }) {
  const title = application.research_title || application.title || "Untitled Application";
  const protocolCode = application.protocol_code || application.protocol_no || "N/A";
  const date = application.submission_date || application.date_submitted;

  return (
    <tr
      onClick={() => onSelect && onSelect(application)}
      style={onSelect ? { cursor: "pointer" } : undefined}
    >
      <td>
        <div className="fw-semibold">{title}</div>
        {application.research_type && (
          <small className="text-muted">
            {application.research_type}
            {application.review_type ? ` • ${application.review_type}` : ""}
          </small>
        )}
      </td>
      <td>
        <span className="badge bg-light text-dark border font-monospace">
          {protocolCode}
        </span>
      </td>
      <td>{formatDate(date)}</td>
      <td>
        <StatusBadge status={application.status} />
      </td>
    </tr>
  );
}

export default ApplicationRow;
