import React from "react";
import { useNavigate } from "react-router-dom";
import StatusBadge from "./StatusBadge";
import { formatDate } from "../../utils/formatters";

const DRAFT_STORAGE_KEY = "adzu_rec_application_draft_v1";

/**
 * Renders an individual application row inside the applications table.
 */
function ApplicationRow({
  application,
  onSelect,
  onOpenOrModal,
  onOpenRejectionNotice,
  onOpenRevisionNotice,
  onOpenReviseModal,
}) {
  const navigate = useNavigate();
  const title = application.research_title || application.title || "Untitled Application";
  const protocolCode = application.protocol_code || application.protocol_no || "N/A";
  const date = application.submission_date || application.date_submitted;
  
  // Convert status to lowercase and normalize it for safer checking
  const statusStr = (application.status || "").trim().toLowerCase();
  const paymentStatus = (application.payment_status || "").trim().toLowerCase();

  const isDraft = statusStr === "draft";
  const isPaymentPending = statusStr === "payment pending";
  const isPaymentRejected = isPaymentPending && paymentStatus === "rejected";
  const hasActiveRevision = Boolean(
    application.has_active_revision === true ||
    application.has_active_revision === 1 ||
    application.has_active_revision === "true" ||
    application.has_active_revision === "1" ||
    (statusStr === "type of review" && application.revision_notes)
  );

  const rowClass = isPaymentRejected
    ? "table-danger table-opacity-10"
    : hasActiveRevision
    ? "table-warning table-opacity-10"
    : "";

  const handleRowClick = () => {
    if (onSelect) {
      onSelect(application);
    } else if (hasActiveRevision) {
      if (onOpenReviseModal) {
        onOpenReviseModal(application);
      } else if (onOpenRevisionNotice) {
        onOpenRevisionNotice(application);
      }
    } else if ((isPaymentRejected || isPaymentPending) && onOpenOrModal) {
      onOpenOrModal(application);
    }
  };

  const isClickable = Boolean(onSelect || hasActiveRevision || isPaymentRejected || isPaymentPending);

  const handleEditDraft = (event) => {
    event.stopPropagation();

    if (application.form_data) {
      localStorage.setItem(
        DRAFT_STORAGE_KEY,
        JSON.stringify({
          data: application.form_data,
          savedAt: application.updated_at || application.submission_date || new Date().toISOString(),
        })
      );
    }

    navigate("/applicant/form");
  };

  return (
    <tr
      className={rowClass}
      onClick={handleRowClick}
      style={{ cursor: isClickable ? "pointer" : "default" }}
    >
      <td>
        <div className="fw-semibold text-dark">{title}</div>
        {application.research_type && (
          <small className="text-muted">
            {application.research_type}
            {application.review_type ? ` • ${application.review_type}` : ""}
          </small>
        )}
      </td>
      <td>
        <span className="badge bg-light text-dark border font-monospace px-2 py-1">
          {protocolCode}
        </span>
      </td>
      <td>
        <span className="text-secondary small">{formatDate(date)}</span>
      </td>
      <td>
        <div className="d-flex flex-column align-items-start gap-1">
          <StatusBadge status={application.status} />

          {/* Payment Rejection Alert Sub-Badge */}
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

          {/* Protocol Revision Alert Sub-Badge */}
          {hasActiveRevision && (
            <button
              type="button"
              className="badge bg-warning-subtle text-warning-emphasis border border-warning-subtle d-inline-flex align-items-center gap-1 text-decoration-none btn-sm p-1 px-2"
              onClick={(e) => {
                e.stopPropagation();
                onOpenRevisionNotice && onOpenRevisionNotice(application);
              }}
              title="Click to view Ethics Chair revision directives"
            >
              <i className="bi bi-exclamation-circle-fill text-warning"></i>
              <span>Revision Required {application.revision_attempt_no ? `(#${application.revision_attempt_no})` : ""}</span>
            </button>
          )}
        </div>
      </td>
      <td className="text-center align-middle" onClick={(e) => e.stopPropagation()}>
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
        ) : isDraft ? (
          <button
            type="button"
            className="btn btn-sm btn-outline-primary fw-semibold px-3 rounded-pill shadow-sm d-inline-flex align-items-center gap-1"
            style={{ minHeight: "36px" }}
            onClick={handleEditDraft}
            title="Open this draft for editing"
          >
            <i className="bi bi-pencil-square"></i>
            <span>Edit Draft</span>
          </button>
        ) : hasActiveRevision ? (
          <button
            type="button"
            className="btn btn-sm btn-warning text-dark fw-semibold px-3 rounded-pill shadow-sm d-inline-flex align-items-center gap-1"
            style={{ minHeight: "36px" }}
            onClick={(e) => {
              e.stopPropagation();
              if (onOpenReviseModal) {
                onOpenReviseModal(application);
              } else if (onOpenRevisionNotice) {
                onOpenRevisionNotice(application);
              }
            }}
            title="Review Ethics Chair directives and revise protocol"
          >
            <i className="bi bi-pencil-square"></i>
            <span>Revise Protocol</span>
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
