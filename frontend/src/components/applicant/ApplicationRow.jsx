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
  onOpenDecisionLetter,
  onOpenFileAppeal,
  onDeleteDraft,
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
  
  // Stage 6 & Stage 7 Workflow Invariants
  const isClearanceGranted = statusStr === "clearance granted" || statusStr === "certification finished";
  const isRevisionsSubmitted = statusStr === "revisions submitted";

  // Stage 3 Review Type revision return
  const hasActiveRevision = Boolean(
    application.has_active_revision === true ||
    application.has_active_revision === 1 ||
    application.has_active_revision === "true" ||
    application.has_active_revision === "1" ||
    (statusStr === "type of review" && application.revision_notes)
  );

  // Stage 5 Consolidated Decision Letter
  const hasDecisionLetter = Boolean(
    statusStr === "decision letter issued" ||
    application.has_consolidated_decision === true ||
    application.has_consolidated_decision === "true" ||
    application.has_consolidated_decision === 1
  );

  const recommendation = application.latest_consolidation?.consolidated_recommendation || "";
  const isApproved = isClearanceGranted || recommendation === "Approved";
  const isRevisionsRequired = statusStr === "decision letter issued" && recommendation.includes("Revision");
  const isDisapproved = recommendation === "Disapproved" && !isClearanceGranted;
  const isAppealed = Boolean(
    application.is_appealed === true ||
    application.is_appealed === 1 ||
    application.is_appealed === "true" ||
    application.is_appealed === "1" ||
    application.current_cycle > 1
  );

  const rowClass = isPaymentRejected
    ? "table-danger table-opacity-10"
    : isClearanceGranted || isApproved
    ? "table-success table-opacity-10"
    : isRevisionsSubmitted
    ? "table-info table-opacity-10"
    : (hasDecisionLetter && isRevisionsRequired) || hasActiveRevision
    ? "table-warning table-opacity-10"
    : isDisapproved && !isAppealed
    ? "table-danger table-opacity-10"
    : isDisapproved && isAppealed
    ? "table-primary table-opacity-10"
    : "";

  const handleRowClick = () => {
    if (onSelect) {
      onSelect(application);
    } else if ((hasDecisionLetter || isClearanceGranted || isRevisionsSubmitted) && onOpenDecisionLetter) {
      onOpenDecisionLetter(application);
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

  const isClickable = Boolean(
    onSelect || hasDecisionLetter || isClearanceGranted || isRevisionsSubmitted || hasActiveRevision || isPaymentRejected || isPaymentPending
  );

  // Decision Sub-Badge configuration
  const getDecisionBadge = () => {
    if (isClearanceGranted || isApproved) {
      return {
        label: "Ethical Clearance Granted",
        icon: "bi-patch-check-fill",
        className: "bg-success-subtle text-success border-success-subtle",
      };
    }

    if (isRevisionsSubmitted) {
      return {
        label: "Revisions Under Verification",
        icon: "bi-hourglass-split",
        className: "bg-info-subtle text-info border-info-subtle fw-semibold",
      };
    }

    if (!hasDecisionLetter) return null;
    if (recommendation.includes("Minor")) {
      return {
        label: "Decision: Minor Revisions",
        icon: "bi-pencil-square",
        className: "bg-warning-subtle text-warning-emphasis border-warning-subtle",
      };
    }
    if (recommendation.includes("Major")) {
      return {
        label: "Decision: Major Revisions",
        icon: "bi-exclamation-triangle-fill",
        className: "bg-danger-subtle text-danger border-danger-subtle",
      };
    }
    if (isDisapproved) {
      if (isAppealed) {
        return {
          label: "Under Appeal Re-deliberation (Cycle 2)",
          icon: "bi-hammer",
          className: "bg-primary-subtle text-primary border-primary-subtle fw-semibold",
        };
      }
      return {
        label: "Disapproved - Appeal Available",
        icon: "bi-exclamation-octagon-fill",
        className: "bg-danger-subtle text-danger border-danger-subtle fw-bold",
      };
    }
    return {
      label: "Decision Notice Ready",
      icon: "bi-file-earmark-text-fill",
      className: "bg-primary-subtle text-primary border-primary-subtle",
    };
  };

  const decisionBadge = getDecisionBadge();

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

  const handleDeleteDraft = (event) => {
    event.stopPropagation();
    onDeleteDraft?.(application);
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

          {/* Decision Letter Sub-Badge */}
          {hasDecisionLetter && decisionBadge && (
            <button
              type="button"
              className={`badge ${decisionBadge.className} border d-inline-flex align-items-center gap-1 text-decoration-none btn-sm p-1 px-2`}
              onClick={(e) => {
                e.stopPropagation();
                onOpenDecisionLetter && onOpenDecisionLetter(application);
              }}
              title="Click to view official Decision Letter & Directives Matrix"
            >
              <i className={`bi ${decisionBadge.icon}`}></i>
              <span>{decisionBadge.label}</span>
            </button>
          )}

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
          {!hasDecisionLetter && hasActiveRevision && (
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
        {/* Stage 7: Ethical Clearance Granted Action */}
        {isClearanceGranted ? (
          <div className="d-flex align-items-center justify-content-center gap-1 flex-wrap">
            <button
              type="button"
              className="btn btn-sm btn-success fw-semibold px-3 rounded-pill shadow-xs d-inline-flex align-items-center gap-1"
              style={{ minHeight: "36px" }}
              onClick={(e) => {
                e.stopPropagation();
                onOpenDecisionLetter && onOpenDecisionLetter(application);
              }}
              title="View Official Certificate of Ethical Clearance"
            >
              <i className="bi bi-patch-check-fill"></i>
              <span>View Clearance</span>
            </button>
          </div>
        ) : isRevisionsSubmitted ? (
          /* Stage 6: Revisions Submitted Under Verification Action */
          <div className="d-flex align-items-center justify-content-center gap-1 flex-wrap">
            <button
              type="button"
              className="btn btn-sm btn-outline-info text-dark fw-medium px-3 rounded-pill shadow-xs d-inline-flex align-items-center gap-1"
              style={{ minHeight: "36px" }}
              onClick={(e) => {
                e.stopPropagation();
                onOpenDecisionLetter && onOpenDecisionLetter(application);
              }}
              title="View Form 13 Decision Notice & Directives Matrix under verification"
            >
              <i className="bi bi-file-earmark-text"></i>
              <span>View Decision</span>
            </button>
          </div>
        ) : hasDecisionLetter ? (
          <div className="d-flex align-items-center justify-content-center gap-1 flex-wrap">
            {/* Decision Letter Modal Trigger */}
            <button
              type="button"
              className="btn btn-sm btn-outline-primary fw-medium px-2 rounded-pill shadow-xs d-inline-flex align-items-center gap-1"
              style={{ minHeight: "36px" }}
              onClick={(e) => {
                e.stopPropagation();
                onOpenDecisionLetter && onOpenDecisionLetter(application);
              }}
              title="View Official ADZU-REC Form 13 Decision Notice"
            >
              <i className="bi bi-file-earmark-text"></i>
              <span>Decision Notice</span>
            </button>

            {/* Direct Revisions Resubmit Button if Minor or Major Revisions */}
            {isRevisionsRequired && (
              <button
                type="button"
                className="btn btn-sm btn-warning text-dark fw-semibold px-2 rounded-pill shadow-xs d-inline-flex align-items-center gap-1"
                style={{ minHeight: "36px" }}
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenReviseModal ? onOpenReviseModal(application) : onOpenDecisionLetter && onOpenDecisionLetter(application);
                }}
                title="Proceed to upload revised protocol documents"
              >
                <i className="bi bi-pencil-square"></i>
                <span>Revise</span>
              </button>
            )}

            {/* Formal Appeal Action Button when Disapproved and Not Yet Appealed */}
            {isDisapproved && !isAppealed && (
              <button
                type="button"
                className="btn btn-sm btn-outline-danger fw-semibold px-2 rounded-pill shadow-xs d-inline-flex align-items-center gap-1"
                style={{ minHeight: "36px" }}
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenFileAppeal ? onOpenFileAppeal(application) : onOpenDecisionLetter && onOpenDecisionLetter(application);
                }}
                title="File Formal Appeal & Request for Reconsideration (Cycle 2)"
              >
                <i className="bi bi-arrow-repeat"></i>
                <span>File Formal Appeal</span>
              </button>
            )}

            {/* Under Appeal Cycle 2 Indicator */}
            {isDisapproved && isAppealed && (
              <span
                className="badge bg-primary-subtle text-primary border border-primary-subtle px-2 py-1 d-inline-flex align-items-center gap-1 small"
                title="Undergoing Cycle 2 Heightened Board Scrutiny"
              >
                <i className="bi bi-shield-shaded"></i>
                <span>Cycle 2 Appeal</span>
              </span>
            )}
          </div>
        ) : isPaymentRejected ? (
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
          <div className="d-flex align-items-center justify-content-center gap-1 flex-wrap">
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
            <button
              type="button"
              className="btn btn-sm btn-outline-danger rounded-pill shadow-sm d-inline-flex align-items-center"
              style={{ minHeight: "36px" }}
              onClick={handleDeleteDraft}
              title="Delete this draft"
              aria-label="Delete this draft"
            >
              <i className="bi bi-trash"></i>
            </button>
          </div>
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
