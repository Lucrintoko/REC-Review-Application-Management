import React, { useState, useEffect, useRef } from "react";
import Swal from "sweetalert2";

// Modal component for applicants to submit OR (Official Receipt) details
// and receipt photo for their application when status is "Payment Pending".
// Supports both initial submissions and resubmissions after rejection.
function SubmitORModal({ application, show, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    or_number: "",
    or_date: "",
    amount: "",
    notes: "",
  });
  const [receiptFile, setReceiptFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const fileInputRef = useRef(null);

  const isRejected = (application?.payment_status || "").trim().toLowerCase() === "rejected";
  const attemptNo = application?.payment_attempts || 1;

  // Cleanup object URLs to prevent browser memory leaks
  useEffect(() => {
    return () => {
      if (previewUrl && previewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  useEffect(() => {
    if (application) {
      setFormData({
        or_number: application.or_number || "",
        or_date: application.payment_date ? application.payment_date.split(" ")[0] : "",
        amount: application.payment_amount || "",
        notes: "",
      });
      setReceiptFile(null);
      setPreviewUrl(null);
      setError(null);
    }
  }, [application]);

  if (!show || !application) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileValidation = (file) => {
    if (!file) return false;

    const allowedMimes = ["image/jpeg", "image/png", "image/webp"];
    const allowedExtensions = ["jpg", "jpeg", "png", "webp"];
    const maxSizeBytes = 10 * 1024 * 1024; // 10 MB

    const fileExt = (file.name || "").split(".").pop().toLowerCase();
    const isMimeValid = file.type ? allowedMimes.includes(file.type.toLowerCase()) : true;
    const isExtValid = allowedExtensions.includes(fileExt);

    if (!isMimeValid || !isExtValid) {
      setError(`Invalid file type (.${fileExt}). Please upload an image file (JPG, PNG, or WEBP) of your receipt.`);
      return false;
    }

    if (file.size > maxSizeBytes) {
      setError(`File size (${(file.size / (1024 * 1024)).toFixed(2)} MB) exceeds the 10 MB limit.`);
      return false;
    }

    setError(null);
    setReceiptFile(file);

    // Create object URL for instant live preview
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
    return true;
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileValidation(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleRemoveFile = () => {
    if (previewUrl && previewUrl.startsWith("blob:")) {
      URL.revokeObjectURL(previewUrl);
    }
    setReceiptFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Enforce dual requirement: metadata + photo proof
    if (!receiptFile && !application?.proof_of_payment) {
      setError("Please attach a photo of your Official Receipt (JPG, PNG, or WEBP) to proceed.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const payload = new FormData();
      payload.append("application_id", application.application_id || application.id);
      payload.append("applicant_id", application.applicant_id);
      payload.append("or_number", formData.or_number.trim());
      payload.append("or_date", formData.or_date);
      payload.append("amount", formData.amount);
      payload.append("notes", formData.notes ? formData.notes.trim() : "");

      if (receiptFile) {
        payload.append("proof_of_payment", receiptFile);
      }

      const response = await fetch("http://localhost/REC-Review-Application-Management/backend/api/submit_or_details.php", {
        method: "POST",
        body: payload, // Browser automatically sets Content-Type to multipart/form-data with boundary
      });

      const responseData = await response.json();
      
      if (!response.ok || responseData.status === "error") {
        throw new Error(responseData.message || "Failed to submit OR details.");
      }

      await Swal.fire({
        icon: "success",
        title: isRejected ? "Receipt Photo Resubmitted" : "Official Receipt Submitted",
        text: "Your Official Receipt details and photo were submitted successfully for verification.",
        confirmButtonText: "Done",
        confirmButtonColor: "#003366",
        customClass: {
          popup: "rounded-4 shadow-lg border-0",
          confirmButton: "btn btn-primary px-4 py-2 rounded-pill fw-medium",
        },
        buttonsStyling: false,
      });

      onSuccess && onSuccess(responseData);
      onClose();
    } catch (err) {
      setError(err.message || "Failed to submit Official Receipt.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal d-block" tabIndex="-1" role="dialog" aria-modal="true" aria-labelledby="submitOrModalTitle" style={{ backgroundColor: "rgba(0,0,0,0.55)", zIndex: 1055 }}>
      <div className="modal-dialog modal-dialog-centered modal-lg">
        <div className="modal-content shadow-lg border-0 rounded-4 overflow-hidden">
          
          {/* Header */}
          <div className={`modal-header ${isRejected ? "bg-danger" : "bg-primary"} text-white px-4 py-3 border-bottom-0`}>
            <div className="d-flex align-items-center gap-2">
              <i className={`bi ${isRejected ? "bi-arrow-repeat" : "bi-receipt"} fs-5`}></i>
              <h5 className="modal-title fw-bold mb-0" id="submitOrModalTitle">
                {isRejected ? "Resubmit Official Receipt" : "Submit Official Receipt (OR)"}
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
            {/* Protocol Meta Banner */}
            <div className="mb-4 pb-2 border-bottom text-center text-sm-start">
              <span className="badge bg-primary-subtle text-primary font-monospace me-2">
                {application.protocol_code || application.protocol_no || "N/A"}
              </span>
              <span className="text-secondary small fw-medium">
                {application.research_title || application.title || "Untitled Application"}
              </span>
            </div>

            {/* Rejection Feedback Banner */}
            {isRejected && (
              <div className="card border-0 bg-danger-subtle bg-opacity-25 border-start border-4 border-danger p-3 mb-4 rounded-3 shadow-xs">
                <div className="d-flex align-items-center justify-content-between mb-1">
                  <span className="fw-bold text-danger d-inline-flex align-items-center gap-1 small text-uppercase">
                    <i className="bi bi-exclamation-triangle-fill"></i> Previous Submission Rejected (Attempt #{attemptNo})
                  </span>
                </div>
                <div className="p-2.5 bg-white rounded border border-danger-subtle mt-1 shadow-xs">
                  <p className="mb-0 text-dark small fw-medium fst-italic">
                    "{application.payment_notes || "Official receipt image was unclear or amount did not match the fee schedule. Please provide updated details."}"
                  </p>
                </div>
                <small className="text-muted mt-2 d-block">
                  Please capture a clear, uncropped photo of your paper receipt and verify your payment information below.
                </small>
              </div>
            )}

            {error && (
              <div className="alert alert-danger py-2 px-3 small d-flex align-items-center gap-2 mb-3" role="alert">
                <i className="bi bi-exclamation-triangle-fill flex-shrink-0"></i>
                <div>{error}</div>
              </div>
            )}

            <form onSubmit={handleSubmit}>
              
              {/* Picture Upload Zone */}
              <div className="mb-4">
                <label className="form-label fw-bold small text-secondary d-flex justify-content-between align-items-center">
                  <span>
                    <i className="bi bi-camera me-1 text-primary"></i>
                    Official Receipt Photo (JPG, PNG, WEBP) <span className="text-danger">*</span>
                  </span>
                  <span className="text-muted fw-normal font-monospace" style={{ fontSize: "0.75rem" }}>
                    Max 10 MB
                  </span>
                </label>

                {/* Hidden File Input with Camera Support */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  capture="environment"
                  className="d-none"
                  onChange={(e) => e.target.files?.[0] && handleFileValidation(e.target.files[0])}
                  disabled={isSubmitting}
                />

                {!receiptFile ? (
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`border border-2 border-dashed rounded-4 p-4 text-center cursor-pointer transition-all ${
                      isDragging ? "border-primary bg-primary-subtle bg-opacity-10" : "border-secondary-subtle bg-light hover-bg-white"
                    }`}
                    style={{ cursor: "pointer", minHeight: "140px" }}
                    role="button"
                    tabIndex={0}
                    aria-label="Upload Official Receipt Image"
                  >
                    <i className="bi bi-cloud-arrow-up-fill fs-1 text-primary mb-2 d-block"></i>
                    <p className="fw-semibold text-dark mb-1 small">
                      Drag & drop your receipt photo here, or <span className="text-primary text-decoration-underline">Browse</span>
                    </p>
                    <small className="text-muted d-block" style={{ fontSize: "0.75rem" }}>
                      Take a clear photo with your phone camera or upload a saved screenshot
                    </small>
                  </div>
                ) : (
                  /* Client-Side Live Preview Card */
                  <div className="card border rounded-3 p-3 bg-white shadow-xs d-flex flex-row align-items-center justify-content-between gap-3">
                    <div className="d-flex align-items-center gap-3 min-w-0">
                      <img
                        src={previewUrl}
                        alt="Receipt Preview"
                        className="rounded border flex-shrink-0"
                        style={{ width: "56px", height: "56px", objectFit: "cover" }}
                      />
                      <div className="text-truncate">
                        <span className="fw-bold text-dark d-block text-truncate small">{receiptFile.name}</span>
                        <div className="d-flex align-items-center gap-2 mt-0.5">
                          <span className="badge bg-light text-secondary border font-monospace" style={{ fontSize: "0.72rem" }}>
                            {(receiptFile.size / (1024 * 1024)).toFixed(2)} MB
                          </span>
                          <span className="badge bg-success-subtle text-success border border-success-subtle" style={{ fontSize: "0.72rem" }}>
                            Image Ready
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="d-flex align-items-center gap-2 flex-shrink-0">
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-secondary rounded-pill px-3"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isSubmitting}
                        title="Choose a different photo"
                      >
                        Replace
                      </button>
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-danger rounded-circle p-1 d-flex align-items-center justify-content-center"
                        style={{ width: "32px", height: "32px" }}
                        onClick={handleRemoveFile}
                        disabled={isSubmitting}
                        title="Remove photo"
                        aria-label="Remove photo"
                      >
                        <i className="bi bi-trash"></i>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Form Metadata Fields */}
              <div className="row g-3 mb-3">
                <div className="col-12 col-md-4">
                  <label className="form-label fw-semibold text-secondary small">
                    OR Number <span className="text-danger">*</span>
                  </label>
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

                <div className="col-12 col-md-4">
                  <label className="form-label fw-semibold text-secondary small">
                    Date Paid <span className="text-danger">*</span>
                  </label>
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

                <div className="col-12 col-md-4">
                  <label className="form-label fw-semibold text-secondary small">
                    Amount Paid (PHP) <span className="text-danger">*</span>
                  </label>
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
                <label className="form-label fw-semibold text-secondary small">Applicant Notes (Optional)</label>
                <textarea
                  className="form-control"
                  name="notes"
                  rows="2"
                  value={formData.notes}
                  onChange={handleChange}
                  placeholder="e.g. Paid at AdZU Cashier Window 2 or reference remarks..."
                  disabled={isSubmitting}
                ></textarea>
              </div>

              {/* Action Buttons */}
              <div className="d-flex justify-content-end gap-2 pt-2 border-top">
                <button
                  type="button"
                  className="btn btn-light rounded-pill px-4"
                  onClick={onClose}
                  disabled={isSubmitting}
                  style={{ minHeight: "44px" }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`btn ${isRejected ? "btn-danger" : "btn-primary"} rounded-pill px-4 fw-semibold d-inline-flex align-items-center gap-2 shadow-sm`}
                  disabled={isSubmitting || !formData.or_number || !formData.or_date || !formData.amount || (!receiptFile && !application?.proof_of_payment)}
                  style={{ minHeight: "44px" }}
                >
                  {isSubmitting ? (
                    <>
                      <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                      <span>Uploading...</span>
                    </>
                  ) : (
                    <>
                      <i className={`bi ${isRejected ? "bi-arrow-repeat" : "bi-check2-circle"}`}></i>
                      <span>{isRejected ? "Submit Corrected OR" : "Submit Receipt for Audit"}</span>
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
