import React, { useState, useEffect } from "react";
import Swal from "sweetalert2";

function resolveFileUrl(savedPath, directUrl) {
  if (directUrl) return directUrl;
  if (!savedPath) return null;
  if (savedPath.startsWith("http://") || savedPath.startsWith("https://")) return savedPath;
  const clean = savedPath.replace(/^\/+/, "");
  return `http://localhost/REC-Review-Application-Management/backend/${clean}`;
}

function PaymentVerificationModal({ protocol, onClose }) {
  const [paymentData, setPaymentData] = useState(null);
  const [isFetching, setIsFetching] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [notes, setNotes] = useState("");
  const [zoomLevel, setZoomLevel] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [highContrast, setHighContrast] = useState(false);

  // Fetch the payment details according to Research Protocol
  useEffect(() => {
    if (protocol && protocol.application_id) {
      setIsFetching(true);
      fetch(`http://localhost/REC-Review-Application-Management/backend/api/get_payment.php?application_id=${protocol.application_id}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.success) {
            setPaymentData(data.data);
          } else {
            setError(data.message || "Failed to load payment details.");
          }
        })
        .catch((err) => {
          console.error("Error fetching payment:", err);
          setError("Failed to load payment details.");
        })
        .finally(() => {
          setIsFetching(false);
        });
    }
  }, [protocol]);

  // For Secretariat Payment Verification
  const handleVerification = async (action) => {
    // If rejecting, require explanation notes so applicant knows what to correct
    if (action === "Rejected" && !notes.trim()) {
      Swal.fire({
        icon: "warning",
        title: "Rejection Reason Required",
        text: "Please provide notes detailing why the receipt was rejected (e.g., blurry photo, amount mismatch) so the proponent can correct it.",
        confirmButtonColor: "#003366",
        didOpen: () => {
          const container = Swal.getContainer();
          if (container) container.style.zIndex = "1100";
        },
      });
      return;
    }

    setIsSubmitting(true);
    const admin_id = localStorage.getItem("adminId") ? parseInt(localStorage.getItem("adminId"), 10) : 1;

    try {
      const response = await fetch("http://localhost/REC-Review-Application-Management/backend/api/verify_payment.php", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          application_id: protocol.application_id,
          status: action,
          notes: notes,
          admin_id: admin_id,
        }),
      });

      const data = await response.json();

      if (data.success) {
        await Swal.fire({
          title: action === "Verified" ? "Payment Confirmed!" : "Payment Rejected",
          text: data.message,
          icon: action === "Verified" ? "success" : "info",
          confirmButtonColor: action === "Verified" ? "#198754" : "#dc3545",
          confirmButtonText: "OK",
          didOpen: () => {
            const container = Swal.getContainer();
            if (container) container.style.zIndex = "1100";
          },
        });
        onClose(true); // Close modal upon success and signal refresh
      } else {
        Swal.fire({
          title: "Verification Failed",
          text: data.message || "An error occurred",
          icon: "error",
          confirmButtonColor: "#dc3545",
          didOpen: () => {
            const container = Swal.getContainer();
            if (container) container.style.zIndex = "1100";
          },
        });
      }
    } catch (err) {
      console.error(err);
      Swal.fire({
        title: "Connection Error",
        text: "Error connecting to server",
        icon: "error",
        confirmButtonColor: "#dc3545",
        didOpen: () => {
          const container = Swal.getContainer();
          if (container) container.style.zIndex = "1100";
        },
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const receiptUrl = paymentData
    ? resolveFileUrl(paymentData.receiptFilePath, paymentData.receiptUrl)
    : null;

  return (
    <>
      {/* Backdrop */}
      <div className="modal-backdrop show" style={{ backgroundColor: "rgba(0,0,0,0.65)", zIndex: 1060 }}></div>

      <div className="modal d-block" tabIndex="-1" onClick={() => !isSubmitting && onClose(false)} style={{ zIndex: 1065 }}>
        <div
          className="modal-dialog modal-xl modal-dialog-centered"
          onClick={(e) => e.stopPropagation()}
          style={{ maxWidth: "94vw", height: "90vh" }}
        >
          <div className="modal-content border-0 shadow-lg rounded-4 h-100 d-flex flex-column overflow-hidden">
            
            {/* Header */}
            <div className="modal-header bg-white border-bottom px-4 py-2.5 d-flex justify-content-between align-items-center flex-shrink-0">
              <div className="d-flex align-items-center gap-2">
                <span className="badge bg-primary font-monospace fs-6 px-2.5 py-1">
                  {protocol.id || protocol.protocol_code || "N/A"}
                </span>
                <h5 className="modal-title fw-bold text-dark fs-6 mb-0">
                  Official Receipt Verification Audit
                </h5>
              </div>
              <button
                type="button"
                className="btn-close"
                disabled={isSubmitting}
                onClick={() => onClose(false)}
                aria-label="Close"
              ></button>
            </div>

            {/* Body: Split View (55% Image Canvas, 45% Metadata Audit) */}
            <div className="modal-body p-0 flex-grow-1 overflow-hidden">
              <div className="row g-0 h-100">
                
                {/* Left Pane (55%): Interactive Document / Photo Inspector */}
                <div className="col-12 col-lg-7 h-100 border-end bg-body-tertiary d-flex flex-column overflow-hidden">
                  
                  {/* Inspection Toolbar */}
                  <div className="p-2 px-3 bg-white border-bottom d-flex align-items-center justify-content-between flex-wrap gap-2 flex-shrink-0">
                    <div className="d-flex align-items-center gap-1">
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-secondary"
                        onClick={() => setZoomLevel((p) => Math.max(1, p - 0.25))}
                        disabled={!receiptUrl || zoomLevel <= 1}
                        title="Zoom Out"
                      >
                        <i className="bi bi-zoom-out"></i>
                      </button>
                      <button
                        type="button"
                        className="btn btn-sm btn-light border font-monospace px-2 py-1 small"
                        onClick={() => { setZoomLevel(1); setRotation(0); }}
                        disabled={!receiptUrl}
                        title="Reset Zoom & Rotation"
                      >
                        {Math.round(zoomLevel * 100)}%
                      </button>
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-secondary"
                        onClick={() => setZoomLevel((p) => Math.min(3, p + 0.25))}
                        disabled={!receiptUrl || zoomLevel >= 3}
                        title="Zoom In"
                      >
                        <i className="bi bi-zoom-in"></i>
                      </button>
                      
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-secondary ms-2"
                        onClick={() => setRotation((p) => (p + 90) % 360)}
                        disabled={!receiptUrl}
                        title="Rotate 90° Clockwise"
                      >
                        <i className="bi bi-arrow-clockwise me-1"></i>Rotate
                      </button>

                      <button
                        type="button"
                        className={`btn btn-sm ${highContrast ? "btn-dark text-warning" : "btn-outline-secondary"} ms-1`}
                        onClick={() => setHighContrast((p) => !p)}
                        disabled={!receiptUrl}
                        title="Toggle Contrast Boost for Faint Cashier Stamps"
                      >
                        <i className="bi bi-circle-half me-1"></i>Contrast Boost
                      </button>
                    </div>

                    {receiptUrl && (
                      <div className="d-flex align-items-center gap-2">
                        <a
                          href={receiptUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn btn-sm btn-outline-primary d-inline-flex align-items-center gap-1"
                          title="Open photo in a new browser tab"
                        >
                          <i className="bi bi-box-arrow-up-right"></i>
                          <span>New Tab</span>
                        </a>
                        <a
                          href={receiptUrl}
                          download
                          className="btn btn-sm btn-outline-secondary d-inline-flex align-items-center gap-1"
                          title="Download photo to computer"
                        >
                          <i className="bi bi-download"></i>
                        </a>
                      </div>
                    )}
                  </div>

                  {/* Canvas Viewport */}
                  <div
                    className="flex-grow-1 overflow-auto d-flex align-items-center justify-content-center p-3 position-relative"
                    style={{ backgroundColor: "#2b3035", minHeight: "300px" }}
                  >
                    {isFetching ? (
                      <div className="text-white text-center">
                        <div className="spinner-border text-light mb-2" role="status"></div>
                        <small className="d-block text-white-50">Loading receipt photo...</small>
                      </div>
                    ) : error ? (
                      <div className="alert alert-warning text-center small p-3 m-3">
                        <i className="bi bi-exclamation-triangle-fill me-1"></i> {error}
                      </div>
                    ) : receiptUrl ? (
                      <div
                        className="d-flex align-items-center justify-content-center w-100 h-100"
                        style={{ overflow: "auto" }}
                      >
                        <img
                          src={receiptUrl}
                          alt="Official Receipt Snapshot"
                          className="rounded shadow transition-all"
                          style={{
                            transform: `scale(${zoomLevel}) rotate(${rotation}deg)`,
                            transformOrigin: "center center",
                            filter: highContrast ? "contrast(180%) brightness(95%)" : "none",
                            maxWidth: "100%",
                            maxHeight: "100%",
                            objectFit: "contain",
                            transition: "transform 0.15s ease-out, filter 0.15s ease-out",
                          }}
                        />
                      </div>
                    ) : (
                      <div className="text-white-50 text-center p-4">
                        <i className="bi bi-card-image fs-1 d-block mb-2 text-secondary opacity-50"></i>
                        <h6 className="fw-semibold text-light mb-1">No Receipt Photo Attached</h6>
                        <small className="text-white-50">
                          This protocol was submitted with metadata only. Please verify against physical cashier records.
                        </small>
                      </div>
                    )}
                  </div>

                </div>

                {/* Right Pane (45%): Metadata Audit & Sign-off Form */}
                <div className="col-12 col-lg-5 h-100 bg-white d-flex flex-column overflow-auto p-4">
                  
                  <div className="d-flex align-items-center justify-content-between border-bottom pb-2 mb-3">
                    <h6 className="fw-bold text-dark mb-0">
                      <i className="bi bi-receipt-cutoff text-primary me-2"></i>Cashier Transaction Record
                    </h6>
                    <span className="badge bg-secondary-subtle text-dark font-monospace small">
                      {paymentData?.paymentStatus || "Pending"}
                    </span>
                  </div>

                  {isFetching ? (
                    <div className="text-center py-4">
                      <div className="spinner-border text-primary spinner-border-sm" role="status"></div>
                      <small className="ms-2 text-muted">Loading payment details...</small>
                    </div>
                  ) : paymentData ? (
                    <div className="bg-light p-3 rounded-3 border mb-3 shadow-xs">
                      <div className="d-flex justify-content-between align-items-center mb-2 pb-1 border-bottom border-light-subtle">
                        <span className="text-secondary small fw-semibold">Official Receipt #</span>
                        <strong className="text-primary font-monospace fs-6">{paymentData.orNumber || "—"}</strong>
                      </div>
                      <div className="d-flex justify-content-between align-items-center mb-2 pb-1 border-bottom border-light-subtle">
                        <span className="text-secondary small fw-semibold">Amount Paid</span>
                        <strong className="text-dark fs-6">
                          ₱ {paymentData.amount ? parseFloat(paymentData.amount).toLocaleString("en-PH", { minimumFractionDigits: 2 }) : "0.00"}
                        </strong>
                      </div>
                      <div className="d-flex justify-content-between align-items-center mb-2">
                        <span className="text-secondary small fw-semibold">Date Paid</span>
                        <span className="text-dark fw-medium small">{paymentData.paymentDate || "—"}</span>
                      </div>
                      {paymentData.applicantNotes && (
                        <div className="mt-2 pt-2 border-top">
                          <small className="text-muted d-block fw-semibold mb-1">Applicant Remarks:</small>
                          <p className="small text-dark fst-italic mb-0 bg-white p-2 rounded border">
                            "{paymentData.applicantNotes}"
                          </p>
                        </div>
                      )}
                    </div>
                  ) : null}

                  {/* Verification Notes */}
                  <div className="mb-3">
                    <label className="form-label fw-bold small text-secondary d-flex justify-content-between">
                      <span>Verification Directives / Audit Remarks</span>
                      <span className="text-muted fw-normal small">
                        {notes.trim() ? "" : "(Required if Rejecting)"}
                      </span>
                    </label>
                    <textarea
                      className="form-control"
                      rows="3"
                      placeholder="e.g. 'Amount verified with cashier logbook' or specify why the receipt is rejected..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      disabled={isSubmitting}
                    ></textarea>
                  </div>

                  <div className="alert alert-info py-2 px-3 small border-info-subtle mb-auto">
                    <div className="d-flex gap-2">
                      <i className="bi bi-info-circle-fill text-primary flex-shrink-0 mt-0.5"></i>
                      <div>
                        Confirming payment transitions protocol to <strong>Type of Review</strong> for Ethics Chair track classification.
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="d-flex gap-2 pt-3 border-top mt-3">
                    <button
                      type="button"
                      className="btn btn-outline-danger flex-grow-1 rounded-pill fw-bold d-inline-flex align-items-center justify-content-center gap-1"
                      style={{ minHeight: "44px" }}
                      onClick={() => handleVerification("Rejected")}
                      disabled={isFetching || isSubmitting || Boolean(error)}
                    >
                      <i className="bi bi-x-circle"></i>
                      <span>Reject Payment</span>
                    </button>
                    <button
                      type="button"
                      className="btn btn-success flex-grow-1 rounded-pill fw-bold d-inline-flex align-items-center justify-content-center gap-1 shadow-sm"
                      style={{ minHeight: "44px" }}
                      onClick={() => handleVerification("Verified")}
                      disabled={isFetching || isSubmitting || Boolean(error)}
                    >
                      {isSubmitting ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
                          <span>Processing...</span>
                        </>
                      ) : (
                        <>
                          <i className="bi bi-check2-circle"></i>
                          <span>Confirm Payment</span>
                        </>
                      )}
                    </button>
                  </div>

                </div>

              </div>
            </div>

          </div>
        </div>
      </div>
    </>
  );
}

export default PaymentVerificationModal;
