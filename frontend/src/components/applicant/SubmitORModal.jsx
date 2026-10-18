import React, { useState, useEffect } from "react";

// Modal component for applicants to submit OR (Official Receipt) details
// for their application when status is "Payment Pending".
// Supports both initial submissions and resubmissions after rejection.
function SubmitORModal({ application, show, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    or_number: "",
    or_date: "",
    amount: "",
    notes: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const isRejected = (application?.payment_status || "").trim().toLowerCase() === "rejected";
  const attemptNo = application?.payment_attempts || 1;

  useEffect(() => {
    if (application) {
      setFormData({
        or_number: application.or_number || "",
        or_date: application.payment_date ? application.payment_date.split(" ")[0] : "",
        amount: application.payment_amount || "",
        notes: "",
      });
      setError(null);
    }
  }, [application]);

  if (!show || !application) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch("http://localhost/REC-Review-Application-Management/backend/api/submit_or_details.php", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          application_id: application.application_id || application.id,
          applicant_id: application.applicant_id,
          ...formData,
        }),
      });

      const responseData = await response.json();
      
      if (!response.ok || responseData.status === "error") {
        throw new Error(responseData.message || "Failed to submit OR details.");
      }

      onSuccess && onSuccess(responseData);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal d-block" tabIndex="-1" style={{ backgroundColor: "rgba(0,0,0,0.5)", zIndex: 1055 }}>
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content shadow-lg border-0">
          <div className={`modal-header ${isRejected ? "bg-danger" : "bg-primary"} text-white border-bottom-0`}>
            <div className="d-flex align-items-center gap-2">
              <i className={`bi ${isRejected ? "bi-arrow-repeat" : "bi-receipt"} fs-5`}></i>
              <h5 className="modal-title fw-bold mb-0">
                {isRejected ? "Resubmit Official Receipt" : "Submit OR Details"}
              </h5>
            </div>
            <button
              type="button"
              className="btn-close btn-close-white"
              onClick={onClose}
              aria-label="Close"
              disabled={isSubmitting}
            ></button>
          </div>
          <div className="modal-body p-4">
            <div className="mb-4 text-center">
              <h6 className="fw-semibold text-primary mb-1">
                {application.protocol_code || application.protocol_no || "N/A"}
              </h6>
              <p className="text-muted small mb-0">
                {application.research_title || application.title || "Untitled Application"}
              </p>
            </div>

            {isRejected && (
              <div className="card border-0 bg-danger-subtle bg-opacity-25 border-start border-4 border-danger p-3 mb-4 rounded-3">
                <div className="d-flex align-items-center justify-content-between mb-1">
                  <span className="fw-bold text-danger d-inline-flex align-items-center gap-1 small text-uppercase">
                    <i className="bi bi-exclamation-triangle-fill"></i> Previous Submission Rejected (Attempt #{attemptNo})
                  </span>
                </div>
                <div className="p-2 bg-white rounded border border-danger-subtle mt-1 shadow-xs">
                  <p className="mb-0 text-dark small fw-medium fst-italic">
                    "{application.payment_notes || "Official receipt image was unclear or amount did not match the fee schedule. Please provide updated details."}"
                  </p>
                </div>
                <small className="text-muted mt-2 d-block">
                  Please verify your receipt details and submit the corrected payment information below.
                </small>
              </div>
            )}

            {error && (
              <div className="alert alert-danger py-2 px-3 small" role="alert">
                <i className="bi bi-exclamation-triangle-fill me-2"></i>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="mb-3">
                <label className="form-label fw-medium text-secondary small">OR Number <span className="text-danger">*</span></label>
                <input
                  type="text"
                  className="form-control"
                  name="or_number"
                  value={formData.or_number}
                  onChange={handleChange}
                  required
                  placeholder="e.g. 123456789"
                  disabled={isSubmitting}
                />
              </div>

              <div className="row mb-3">
                <div className="col-md-6">
                  <label className="form-label fw-medium text-secondary small">Date Paid <span className="text-danger">*</span></label>
                  <input
                    type="date"
                    className="form-control"
                    name="or_date"
                    value={formData.or_date}
                    onChange={handleChange}
                    required
                    disabled={isSubmitting}
                  />
                </div>
                <div className="col-md-6">
                  <label className="form-label fw-medium text-secondary small">Amount <span className="text-danger">*</span></label>
                  <div className="input-group">
                    <span className="input-group-text">₱</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      className="form-control"
                      name="amount"
                      value={formData.amount}
                      onChange={handleChange}
                      required
                      placeholder="0.00"
                      disabled={isSubmitting}
                    />
                  </div>
                </div>
              </div>

              <div className="mb-4">
                <label className="form-label fw-medium text-secondary small">Notes (Optional)</label>
                <textarea
                  className="form-control"
                  name="notes"
                  rows="2"
                  value={formData.notes}
                  onChange={handleChange}
                  placeholder="Any additional remarks..."
                  disabled={isSubmitting}
                ></textarea>
              </div>

              <div className="d-flex justify-content-end gap-2">
                <button
                  type="button"
                  className="btn btn-light"
                  onClick={onClose}
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`btn ${isRejected ? "btn-danger" : "btn-primary"} px-4 d-inline-flex align-items-center gap-2`}
                  disabled={isSubmitting || !formData.or_number || !formData.or_date || !formData.amount}
                >
                  {isSubmitting ? (
                    <>
                      <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                      <span>Submitting...</span>
                    </>
                  ) : (
                    <>
                      <i className={`bi ${isRejected ? "bi-arrow-repeat" : "bi-check2-circle"}`}></i>
                      <span>{isRejected ? "Submit Corrected OR" : "Submit Details"}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SubmitORModal;
