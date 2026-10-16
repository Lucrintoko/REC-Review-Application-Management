import React from "react";
import StatusBadge from "./StatusBadge";
import { formatDate } from "../../utils/formatters";

/**
 * Renders an individual application row inside the applications table.
 */
function ApplicationRow({ application, onSelect, onOpenOrModal, onOpenRejectionNotice }) {
  const title = application.research_title || application.title || "Untitled Application";
  const protocolCode = application.protocol_code || application.protocol_no || "N/A";
  const date = application.submission_date || application.date_submitted;
  
  // Convert status to lowercase and normalize it for safer checking
  const statusStr = (application.status || "").trim().toLowerCase();
  const paymentStatus = (application.payment_status || "").trim().toLowerCase();

  const isPaymentPending = statusStr === "payment pending";
  const isPaymentRejected = isPaymentPending && paymentStatus === "rejected";

  return (
    <tr className={isPaymentRejected ? "table-danger table-opacity-10" : ""}>
      <td
        onClick={() => onSelect && onSelect(application)}
        style={onSelect ? { cursor: "pointer" } : undefined}
      >
        <div className="fw-semibold text-dark">{title}</div>
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
        <span className="badge bg-light text-dark border font-monospace px-2 py-1">
          {protocolCode}
        </span>
      </td>
      <td
        onClick={() => onSelect && onSelect(application)}
        style={onSelect ? { cursor: "pointer" } : undefined}
      >
        <span className="text-secondary small">{formatDate(date)}</span>
      </td>
      <td
        onClick={() => onSelect && onSelect(application)}
        style={onSelect ? { cursor: "pointer" } : undefined}
      >
        <div className="d-flex flex-column align-items-start gap-1">
          <StatusBadge status={application.status} />

          {/* Rejection Alert Sub-Badge */}
          {isPaymentRejected && (
            <button
              type="button"
              className="badge bg-danger-subtle text-danger border border-danger-subtle d-inline-flex align-items-center gap-1 text-decoration-none btn-sm p-1 px-2"
              onClick={(e) => {
                e.stopPropagation();
                onOpenRejectionNotice && onOpenRejectionNotice(application);
              }}
              title="Click to view Secretariat feedback"
            >
              <i className="bi bi-exclamation-triangle-fill"></i>
              <span>Payment Rejected {application.payment_attempts > 1 ? `(#${application.payment_attempts})` : ""}</span>
            </button>
          )}
        </div>
      </td>
      <td className="text-center align-middle">
        {isPaymentRejected ? (
          <button
            type="button"
            className="btn btn-sm btn-danger fw-semibold px-3 rounded-pill shadow-sm d-inline-flex align-items-center gap-1"
            style={{ minHeight: "36px" }}
            onClick={(e) => {
              e.stopPropagation();
              onOpenOrModal && onOpenOrModal(application);
            }}
            title="Review Secretariat notes and resubmit Official Receipt"
          >
            <i className="bi bi-arrow-repeat"></i>
            <span>Resubmit OR</span>
          </button>
        ) : isPaymentPending ? (
          <button
            type="button"
            className="btn btn-sm btn-primary fw-medium px-3 rounded-pill shadow-sm d-inline-flex align-items-center gap-1"
            style={{ minHeight: "36px" }}
            onClick={(e) => {
              e.stopPropagation();
              onOpenOrModal && onOpenOrModal(application);
            }}
            title="Submit Official Receipt Details"
          >
            <i className="bi bi-receipt"></i>
            <span>Submit OR</span>
          </button>
        ) : (
          <span 
            className="d-inline-flex align-items-center justify-content-center text-muted opacity-25"
            style={{ height: '36px', width: '36px' }}
            title="No action required at this stage"
          >
            <i className="bi bi-dash-lg fs-5"></i>
          </span>
        )}
      </td>
    </tr>
  );
}

export default ApplicationRow;
