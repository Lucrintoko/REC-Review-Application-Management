import React from "react";
import { formatDate } from "../../utils/formatters";

// Modal displaying rejection of Payment with Details
function PaymentRejectionNoticeModal({
  show,
  application,
  onClose,
  onProceedToResubmit,
}) {
  if (!show || !application) return null;

  const attemptNo = application.payment_attempts || 1;
  const feedbackNotes = application.payment_notes || "Official receipt image was unclear or amount did not match the fee schedule. Please provide updated details.";
  const previousOr = application.or_number || "Not Available";
  const previousAmount = application.payment_amount ? `₱${parseFloat(application.payment_amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}` : "N/A";
  const rejectedDate = application.payment_verified_at ? formatDate(application.payment_verified_at) : "Recently";

  return (
    <div 
      className="modal d-block fade show" 
      tabIndex="-1" 
      role="dialog" 
      aria-labelledby="paymentRejectionModalTitle" 
      style={{ backgroundColor: "rgba(0,0,0,0.55)", zIndex: 1060 }}
    >
      <div className="modal-dialog modal-dialog-centered modal-lg">
        <div className="modal-content border-0 shadow-lg">
          {/* Header */}
          <div className="modal-header bg-danger text-white py-3 px-4">
            <div className="d-flex align-items-center gap-2">
              <i className="bi bi-exclamation-octagon-fill fs-4"></i>
              <div>
                <h5 className="modal-title fw-bold mb-0" id="paymentRejectionModalTitle">
                  Payment Verification Feedback
                </h5>
                <small className="text-white-50">
                  Protocol: {application.protocol_code || "REC Protocol"} • Attempt #{attemptNo}
                </small>
              </div>
            </div>
            <button
              type="button"
              className="btn-close btn-close-white"
              onClick={onClose}
              aria-label="Close"
            ></button>
          </div>

          {/* Body */}
          <div className="modal-body p-4">
            {/* Research Title Context */}
            <div className="mb-4 pb-2 border-bottom">
              <span className="text-muted small text-uppercase fw-bold">Research Title</span>
              <p className="fw-semibold text-dark mb-0 fs-6">
                {application.research_title || application.title}
              </p>
            </div>

            {/* Section 1: Secretariat Remarks Callout */}
            <div className="card border-0 bg-danger-subtle bg-opacity-25 border-start border-4 border-danger p-3 mb-4 rounded-3">
              <div className="d-flex align-items-center justify-content-between mb-2">
                <span className="fw-bold text-danger d-inline-flex align-items-center gap-1 small text-uppercase">
                  <i className="bi bi-chat-left-quote-fill"></i> Secretariat Feedback Notes
                </span>
                <span className="badge bg-danger text-white font-monospace small">
                  Reviewed: {rejectedDate}
                </span>
              </div>
              <div className="p-3 bg-white rounded border border-danger-subtle shadow-xs">
                <p className="mb-0 text-dark fw-medium fst-italic">
                  "{feedbackNotes}"
                </p>
              </div>
            </div>

            {/* Section 2: Previous Receipt Record (Read-Only) */}
            <div className="card bg-light border-0 p-3 mb-4 rounded-3">
              <h6 className="fw-semibold text-secondary small text-uppercase mb-3">
                <i className="bi bi-clock-history me-1"></i> Previous Submission Record
              </h6>
              <div className="row g-3">
                <div className="col-sm-4">
                  <small className="text-muted d-block">Submitted OR No.</small>
                  <span className="fw-semibold text-dark font-monospace">{previousOr}</span>
                </div>
                <div className="col-sm-4">
                  <small className="text-muted d-block">Amount Declared</small>
                  <span className="fw-semibold text-dark">{previousAmount}</span>
                </div>
                <div className="col-sm-4">
                  <small className="text-muted d-block">Payment Date</small>
                  <span className="fw-semibold text-dark">{application.payment_date ? formatDate(application.payment_date) : "N/A"}</span>
                </div>
              </div>
            </div>

            {/* Section 3: Actionable Instructions */}
            <div className="border rounded-3 p-3 bg-white">
              <h6 className="fw-semibold text-primary small text-uppercase mb-2">
                <i className="bi bi-shield-check me-1"></i> How to resolve this issue:
              </h6>
              <ul className="mb-0 small text-secondary ps-3 d-flex flex-column gap-1">
                <li>Verify that the <strong>Official Receipt Number</strong> matches the printed AdZU Finance receipt.</li>
                <li>Ensure the receipt image or scan clearly shows the transaction date, validation stamp, and amount.</li>
                <li>Confirm the required ethics review fee for your category (Undergraduate, Graduate, or Faculty).</li>
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
              className="btn btn-danger px-4 fw-semibold shadow-sm d-inline-flex align-items-center gap-2"
              onClick={() => {
                onClose();
                onProceedToResubmit && onProceedToResubmit(application);
              }}
            >
              <i className="bi bi-arrow-repeat"></i>
              <span>Proceed to Resubmit OR</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PaymentRejectionNoticeModal;
