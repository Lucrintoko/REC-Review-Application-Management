import React from "react";
import { formatDate } from "../../utils/formatters";

/**
 * ProtocolRevisionNoticeModal
 * Displays Ethics Chair directives and revision instructions for an application returned at 'Type of Review'.
 * Reassures the applicant that their payment verification is retained with zero fee obligations.
 */
function ProtocolRevisionNoticeModal({
  show,
  application,
  onClose,
  onProceedToRevise,
}) {
  if (!show || !application) return null;

  const attemptNo = application.revision_attempt_no || 1;
  const directives =
    application.revision_notes ||
    "The Ethics Research Board Chair has returned this application for protocol modifications or clarification of review type requirements. Please review the directives below.";
  const chairName = application.chair_proponent_name || "Ethics Research Board Chair";
  const requestedDate = application.revision_requested_at
    ? formatDate(application.revision_requested_at)
    : "Recently";
  const orNumber = application.or_number || "Verified on File";

  return (
    <div
      className="modal d-block show"
      tabIndex="-1"
      role="dialog"
      aria-modal="true"
      aria-labelledby="protocolRevisionModalTitle"
      style={{ backgroundColor: "rgba(0,0,0,0.55)", zIndex: 1060, display: "block", opacity: 1 }}
    >
      <div className="modal-dialog modal-dialog-centered modal-lg">
        <div className="modal-content border-0 shadow-lg">
          {/* Header */}
          <div className="modal-header bg-warning text-dark py-3 px-4 border-bottom border-warning-subtle">
            <div className="d-flex align-items-center gap-2">
              <i className="bi bi-pencil-square fs-4 text-dark"></i>
              <div>
                <h5 className="modal-title fw-bold mb-0" id="protocolRevisionModalTitle">
                  Protocol Revision Required
                </h5>
                <small className="text-dark-50 fw-medium">
                  Protocol: {application.protocol_code || "REC Protocol"} • Revision #{attemptNo}
                </small>
              </div>
            </div>
            <button
              type="button"
              className="btn-close"
              onClick={onClose}
              aria-label="Close"
            ></button>
          </div>

          {/* Body */}
          <div className="modal-body p-4">
            {/* Research Title Context */}
            <div className="mb-3 pb-2 border-bottom">
              <span className="text-muted small text-uppercase fw-bold">Research Title</span>
              <p className="fw-semibold text-dark mb-0 fs-6">
                {application.research_title || application.title}
              </p>
            </div>

            {/* Section 1: Chair Directives Callout */}
            <div className="card border-0 bg-warning-subtle bg-opacity-25 border-start border-4 border-warning p-3 mb-3 rounded-3">
              <div className="d-flex align-items-center justify-content-between mb-2 flex-wrap gap-1">
                <span className="fw-bold text-dark d-inline-flex align-items-center gap-1 small text-uppercase">
                  <i className="bi bi-chat-left-quote-fill text-warning"></i> Ethics Chair Directives & Remarks
                </span>
                <span className="badge bg-warning text-dark font-monospace small">
                  Issued: {requestedDate}
                </span>
              </div>
              <div className="small text-secondary mb-2">
                Evaluator: <strong className="text-dark">{chairName}</strong>
              </div>
              <div className="p-3 bg-white rounded border border-warning-subtle shadow-xs">
                <p className="mb-0 text-dark fw-medium fst-italic" style={{ whiteSpace: "pre-line" }}>
                  "{directives}"
                </p>
              </div>
            </div>

            {/* Section 2: Verified Payment Invariant Notice */}
            <div className="card bg-success-subtle bg-opacity-25 border border-success-subtle p-3 mb-3 rounded-3">
              <div className="d-flex align-items-start gap-2">
                <i className="bi bi-check-circle-fill text-success fs-5 mt-1"></i>
                <div>
                  <h6 className="fw-bold text-success-emphasis mb-1 small text-uppercase">
                    Payment Status: Verified & Retained
                  </h6>
                  <p className="mb-0 small text-secondary">
                    Your Official Receipt (<strong>OR No. {orNumber}</strong>) is verified and remains permanently credited to this protocol. <strong>Zero additional payment or receipt resubmission is required.</strong>
                  </p>
                </div>
              </div>
            </div>

            {/* Section 3: Actionable Instructions */}
            <div className="border rounded-3 p-3 bg-white">
              <h6 className="fw-semibold text-primary small text-uppercase mb-2">
                <i className="bi bi-list-check me-1"></i> Required Next Steps:
              </h6>
              <ul className="mb-0 small text-secondary ps-3 d-flex flex-column gap-2">
                <li>
                  Carefully read the <strong>Ethics Chair Directives</strong> above and identify the specific sections needing clarification.
                </li>
                <li>
                  Update your study protocol, methodology, participant information sheet, or consent forms with your revisions highlighted.
                </li>
                <li>
                  Prepare a concise <strong>Point-by-Point Clarification Letter</strong> addressing each note raised by the Chair.
                </li>
                <li>
                  Click <strong>"Proceed to Revise Protocol"</strong> below to access the protocol upload portal.
                </li>
              </ul>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="modal-footer bg-light border-top-0 px-4 py-3 d-flex justify-content-between">
            <button
              type="button"
              className="btn btn-outline-secondary px-4 fw-medium"
              onClick={onClose}
            >
              Close
            </button>
            <button
              type="button"
              className="btn btn-warning text-dark px-4 fw-semibold shadow-sm d-inline-flex align-items-center gap-2"
              onClick={() => {
                onClose();
                onProceedToRevise && onProceedToRevise(application);
              }}
            >
              <i className="bi bi-pencil-square"></i>
              <span>Proceed to Revise Protocol</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProtocolRevisionNoticeModal;
