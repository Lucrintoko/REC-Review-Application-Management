import React from "react";
import StatusBadge from "./StatusBadge";
import { formatDate } from "../../utils/formatters";

/**
 * Renders an individual application row inside the applications table.
 */
function ApplicationRow({ application, onSelect, onOpenOrModal }) {
  const title = application.research_title || application.title || "Untitled Application";
  const protocolCode = application.protocol_code || application.protocol_no || "N/A";
  const date = application.submission_date || application.date_submitted;
  
  // Convert status to lowercase and normalize it for safer checking
  const statusStr = (application.status || "").trim().toLowerCase();
  const isPaymentPending = statusStr === "payment pending" || statusStr === "ongoing verification"; // some mapped aliases might match

  return (
    <tr>
      <td
        onClick={() => onSelect && onSelect(application)}
        style={onSelect ? { cursor: "pointer" } : undefined}
      >
        <div className="fw-semibold">{title}</div>
        {application.research_type && (
          <small className="text-muted">
            {application.research_type}
            {application.review_type ? ` • ${application.review_type}` : ""}
          </small>
        )}
      </td>
      <td
        onClick={() => onSelect && onSelect(application)}
        style={onSelect ? { cursor: "pointer" } : undefined}
      >
        <span className="badge bg-light text-dark border font-monospace">
          {protocolCode}
        </span>
      </td>
      <td
        onClick={() => onSelect && onSelect(application)}
        style={onSelect ? { cursor: "pointer" } : undefined}
      >
        {formatDate(date)}
      </td>
      <td
        onClick={() => onSelect && onSelect(application)}
        style={onSelect ? { cursor: "pointer" } : undefined}
      >
        <StatusBadge status={application.status} />
      </td>
      <td className="text-center">
        {isPaymentPending ? (
          <button
            className="btn btn-sm btn-primary fw-medium px-3 rounded-pill shadow-sm"
            onClick={(e) => {
              e.stopPropagation();
              onOpenOrModal && onOpenOrModal(application);
            }}
            title="Submit Official Receipt Details"
          >
            <i className="bi bi-receipt me-1"></i> Submit OR
          </button>
        ) : (
          <span 
            className="d-inline-flex align-items-center justify-content-center text-muted opacity-25"
            style={{ height: '31px', width: '31px' }}
            title="No action required"
          >
            <i className="bi bi-dash-lg fs-5"></i>
          </span>
        )}
      </td>
    </tr>
  );
}

export default ApplicationRow;
