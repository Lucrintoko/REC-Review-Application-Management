import React from "react";
import { useNavigate } from "react-router-dom";
import StatusBadge from "./StatusBadge";
import { formatDate } from "../../utils/formatters";

const DRAFT_STORAGE_KEY = "adzu_rec_application_draft_v1";

/**
 * Renders an individual application row inside the applications table.
 * Supports interactive states, workflow badges, and refined draft management.
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
  const rawTitle = application.research_title || application.title || "";
  const isUntitled = !rawTitle.trim() || rawTitle.trim().toLowerCase() === "untitled draft";
  const title = isUntitled ? "Untitled Draft Protocol" : rawTitle;
  
  const protocolCode = application.protocol_code || application.protocol_no || "N/A";
  const isCodeAssigned = protocolCode && protocolCode !== "Draft" && protocolCode !== "N/A";
  const date = application.submission_date || application.date_submitted || application.updated_at;
  
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

  // Row tinting logic
  const rowClass = isDraft
    ? "table-warning bg-opacity-10"
    : isPaymentRejected
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

  const handleEditDraft = (event) => {
    if (event) {
      event.stopPropagation();
    }

    if (application.form_data) {
      try {
        localStorage.setItem(
          DRAFT_STORAGE_KEY,
          JSON.stringify({
            data: application.form_data,
            savedAt: application.updated_at || application.submission_date || new Date().toISOString(),
          })
        );
      } catch (err) {
        console.error("Error serializing draft to localStorage:", err);
      }
    }

    navigate("/applicant/form");
  };

  const handleDeleteDraft = (event) => {
    if (event) {
      event.stopPropagation();
    }
    onDeleteDraft?.(application);
  };

  const handleRowClick = () => {
    if (isDraft) {
      handleEditDraft();
      return;
    }

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
    isDraft ||
    onSelect ||
    hasDecisionLetter ||
    isClearanceGranted ||
    isRevisionsSubmitted ||
    hasActiveRevision ||
    isPaymentRejected ||
    isPaymentPending
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

  return (
    <tr
      className={rowClass}
      onClick={handleRowClick}
      style={{ cursor: isClickable ? "pointer" : "default" }}
    >
      {/* 1. Title Column */}
      <td>
        <div className="d-flex align-items-center flex-wrap gap-2">
          {isDraft && (
            <span className="badge bg-warning text-dark border border-warning-subtle px-2 py-1 fw-semibold small">
              <i className="bi bi-pencil-fill me-1"></i>Draft
            </span>
          )}
          {isClickable ? (
            <button
              type="button"
              className={`btn btn-link p-0 text-start text-decoration-none fw-semibold ${isUntitled ? "text-secondary fst-italic" : "text-dark"}`}
              onClick={(event) => {
                event.stopPropagation();
                handleRowClick();
              }}
              aria-label={isDraft ? `Resume draft application: ${title}` : `Open application: ${title}`}
            >
              {title}
            </button>
          ) : (
            <span className={`fw-semibold ${isUntitled ? "text-secondary fst-italic" : "text-dark"}`}>
              {title}
            </span>
          )}
        </div>

        <div className="text-muted small mt-1 d-flex align-items-center gap-2 flex-wrap">
          <span>{application.research_type || "Type Undetermined"}</span>
          {application.review_type && (
            <>
              <span className="text-secondary">•</span>
              <span>{application.review_type}</span>
            </>
          )}
          {isDraft && (
            <>
              <span className="text-secondary">•</span>
              <span className="text-warning-emphasis fw-medium">
                <i className="bi bi-cloud-arrow-up me-1"></i>Auto-saved locally
              </span>
            </>
          )}
        </div>
      </td>

      {/* 2. Protocol Code Column */}
      <td>
        {isDraft && !isCodeAssigned ? (
          <span
            className="badge bg-light text-muted border border-secondary font-monospace px-2 py-1"
            style={{ borderStyle: "dashed" }}
            title="Official protocol number will be assigned upon formal submission"
          >
            <i className="bi bi-dash-circle me-1"></i>Unassigned
          </span>
        ) : (
          <span className={`badge ${isDraft ? "bg-warning-subtle text-warning-emphasis border-warning-subtle" : "bg-light text-dark"} border font-monospace px-2 py-1`}>
            {protocolCode}
          </span>
        )}
      </td>

      {/* 3. Date Column */}
      <td>
        <div className="d-flex flex-column align-items-start">
          <span className="text-dark small fw-medium">{formatDate(date)}</span>
          <span className="text-muted" style={{ fontSize: "0.75rem" }}>
            <i className={`bi ${isDraft ? "bi-clock-history" : "bi-send-check"} me-1`}></i>
            {isDraft ? "Last Saved" : "Submitted"}
          </span>
        </div>
      </td>

      {/* 4. Status Column */}
      <td>
        <div className="d-flex flex-column align-items-start gap-1">
          {isDraft ? (
            <>
              <span className="badge bg-warning-subtle text-warning-emphasis border border-warning-subtle px-2 py-1 d-inline-flex align-items-center gap-1 fw-semibold">
                <i className="bi bi-pencil-square"></i> Draft
              </span>
              <span className="text-muted" style={{ fontSize: "0.725rem" }}>
                <i className="bi bi-eye-slash me-1"></i>Unsubmitted
              </span>
            </>
          ) : (
            <StatusBadge status={application.status} />
          )}

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

      {/* 5. Actions Column */}
      <td className="text-center align-middle" onClick={(e) => e.stopPropagation()}>
        {isDraft ? (
          <div className="d-flex align-items-center justify-content-center gap-2 flex-wrap">
            {/* Primary Action: Continue Editing */}
            <button
              type="button"
              className="btn btn-sm btn-primary fw-semibold px-3 rounded-pill shadow-sm d-inline-flex align-items-center gap-2"
              style={{ minHeight: "44px" }}
              onClick={handleEditDraft}
              title="Resume and complete this application draft"
            >
              <i className="bi bi-pencil-square"></i>
              <span>Continue Editing</span>
            </button>

            {/* Destructive Action: Discard Draft */}
            <button
              type="button"
              className="btn btn-sm btn-outline-danger rounded-pill px-3 shadow-sm d-inline-flex align-items-center gap-1"
              style={{ minHeight: "44px" }}
              onClick={handleDeleteDraft}
              title="Discard this draft and clear local inputs"
              aria-label="Discard draft application"
            >
              <i className="bi bi-trash3"></i>
              <span className="d-none d-xl-inline">Discard</span>
            </button>
          </div>
        ) : isClearanceGranted ? (
          <div className="d-flex align-items-center justify-content-center gap-1 flex-wrap">
            <button
              type="button"
              className="btn btn-sm btn-success fw-semibold px-3 rounded-pill shadow-xs d-inline-flex align-items-center gap-1"
              style={{ minHeight: "44px" }}
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
          <div className="d-flex align-items-center justify-content-center gap-1 flex-wrap">
            <button
              type="button"
              className="btn btn-sm btn-outline-info text-dark fw-medium px-3 rounded-pill shadow-xs d-inline-flex align-items-center gap-1"
              style={{ minHeight: "44px" }}
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
            <button
              type="button"
              className="btn btn-sm btn-outline-primary fw-medium px-2 rounded-pill shadow-xs d-inline-flex align-items-center gap-1"
              style={{ minHeight: "44px" }}
              onClick={(e) => {
                e.stopPropagation();
                onOpenDecisionLetter && onOpenDecisionLetter(application);
              }}
              title="View Official ADZU-REC Form 13 Decision Notice"
            >
              <i className="bi bi-file-earmark-text"></i>
              <span>Decision Notice</span>
            </button>

            {isRevisionsRequired && (
              <button
                type="button"
                className="btn btn-sm btn-warning text-dark fw-semibold px-2 rounded-pill shadow-xs d-inline-flex align-items-center gap-1"
                style={{ minHeight: "44px" }}
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

            {isDisapproved && !isAppealed && (
              <button
                type="button"
                className="btn btn-sm btn-outline-danger fw-semibold px-2 rounded-pill shadow-xs d-inline-flex align-items-center gap-1"
                style={{ minHeight: "44px" }}
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
            style={{ minHeight: "44px" }}
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
        ) : hasActiveRevision ? (
          <button
            type="button"
            className="btn btn-sm btn-warning text-dark fw-semibold px-3 rounded-pill shadow-sm d-inline-flex align-items-center gap-1"
            style={{ minHeight: "44px" }}
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
            style={{ height: '44px', width: '44px' }}
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
