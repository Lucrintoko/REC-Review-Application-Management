import React, { useState, useRef, useMemo } from "react";
import { formatDate } from "../../utils/formatters";
import adzuSeal from "../../assets/AdZU Seal.png";

const ALLOWED_EXTENSIONS = [".pdf", ".docx", ".doc", ".zip"];
const MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024; // 15MB

const DOCUMENT_CATEGORIES = [
  { value: "clarification_matrix", label: "Point-by-Point Clarification Matrix", isCore: true },
  { value: "revised_protocol_clean", label: "Revised Protocol (Clean Copy)", isCore: true },
  { value: "revised_protocol_tracked", label: "Revised Protocol (Tracked Changes)", isCore: true },
  { value: "updated_consent_form", label: "Updated Informed Consent / Assent Form", isCore: false },
  { value: "technical_review_letter", label: "Technical Review / Endorsement Letter", isCore: false },
  { value: "supplementary_instrument", label: "Supplementary Questionnaires / Tools", isCore: false },
  { value: "other_supporting", label: "Other Supporting Document", isCore: false },
];

function formatFileSize(bytes) {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}


// Smart Category Auto-Detection based on common academic file-naming heuristics.
function detectCategoryFromFilename(filename) {
  const lower = filename.toLowerCase();
  if (lower.includes("matrix") || lower.includes("clarification") || lower.includes("rebuttal") || lower.includes("response")) {
    return "clarification_matrix";
  }
  if (lower.includes("track") || lower.includes("markup") || lower.includes("diff")) {
    return "revised_protocol_tracked";
  }
  if (lower.includes("clean")) {
    return "revised_protocol_clean";
  }
  if (lower.includes("consent") || lower.includes("assent") || lower.includes("icf")) {
    return "updated_consent_form";
  }
  if (lower.includes("endorse") || lower.includes("technical") || lower.includes("approval") || lower.includes("letter")) {
    return "technical_review_letter";
  }
  if (lower.includes("tool") || lower.includes("instrument") || lower.includes("survey") || lower.includes("questionnaire") || lower.includes("guide")) {
    return "supplementary_instrument";
  }
  // Default to Clean Copy as standard primary protocol submission
  return "revised_protocol_clean";
}

// Revision Protocol Modal for Resubmitting  of Documents and Recommendations Uploading
function ReviseProtocolModal({ show, application, onClose, onSuccess }) {
  const [rebuttalNotes, setRebuttalNotes] = useState("");
  const [attachedFiles, setAttachedFiles] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  // Category coverage summary for AdZU REC compliance checking (Hook must run unconditionally)
  const categoryCounts = useMemo(() => {
    const counts = {};
    DOCUMENT_CATEGORIES.forEach((cat) => {
      counts[cat.value] = attachedFiles.filter((f) => f.category === cat.value).length;
    });
    return counts;
  }, [attachedFiles]);

  if (!show || !application) return null;

  const protocolCode = application.protocol_code || application.protocol_no || "REC Protocol";
  const attemptNo = application.revision_attempt_no || 1;
  const nextAttemptNo = attemptNo + 1;
  const directives =
    application.revision_notes ||
    "The Ethics Review Committee Chair has returned this application for protocol modifications or clarification of review type requirements.";
  const chairName = application.chair_proponent_name || "Ethics Review Committee Chair";
  const requestedDate = application.revision_requested_at
    ? formatDate(application.revision_requested_at)
    : "Recently";
  const orNumber = application.or_number || "Verified on File";

  const hasClarificationMatrix = categoryCounts["clarification_matrix"] > 0;
  const hasCleanProtocol = categoryCounts["revised_protocol_clean"] > 0;
  const hasTrackedProtocol = categoryCounts["revised_protocol_tracked"] > 0;

  // Process and stage incoming batch files
  const handleFiles = (incomingFiles) => {
    setErrorMessage("");
    const validList = [];

    for (let i = 0; i < incomingFiles.length; i++) {
      const file = incomingFiles[i];
      const extension = "." + file.name.split(".").pop().toLowerCase();

      if (!ALLOWED_EXTENSIONS.includes(extension)) {
        setErrorMessage(
          `File "${file.name}" is not supported. Please upload PDF, Word (DOCX/DOC), or ZIP files.`
        );
        continue;
      }

      if (file.size > MAX_FILE_SIZE_BYTES) {
        setErrorMessage(`File "${file.name}" exceeds the 15MB file size limit.`);
        continue;
      }

      const isDuplicate = attachedFiles.some(
        (f) => f.file.name === file.name && f.file.size === file.size
      );
      if (isDuplicate) continue;

      // Smart heuristic assignment
      const detectedCat = detectCategoryFromFilename(file.name);

      validList.push({
        id: `${file.name}-${Date.now()}-${i}`,
        file,
        category: detectedCat,
      });
    }

    setAttachedFiles((prev) => [...prev, ...validList]);
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files);
      e.target.value = "";
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

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleRemoveFile = (idToRemove) => {
    setAttachedFiles((prev) => prev.filter((item) => item.id !== idToRemove));
  };

  const handleUpdateCategory = (id, newCategory) => {
    setAttachedFiles((prev) =>
      prev.map((item) => (item.id === id ? { ...item, category: newCategory } : item))
    );
  };

  const handleTriggerUpload = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage("");

    if (!rebuttalNotes.trim()) {
      setErrorMessage(
        "Please provide your Point-by-Point Rebuttal or Clarification Notes to explain your changes."
      );
      return;
    }

    if (rebuttalNotes.trim().length < 20) {
      setErrorMessage(
        "Clarification notes must be at least 20 characters long to adequately address the directives."
      );
      return;
    }

    if (attachedFiles.length === 0) {
      setErrorMessage(
        "Please attach at least one revised protocol document or clarification matrix."
      );
      return;
    }

    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.append("application_id", application.application_id || application.id);
      formData.append(
        "applicant_id",
        application.applicant_id || localStorage.getItem("applicantId") || "1"
      );
      formData.append("revision_notes", rebuttalNotes.trim());
      formData.append("revision_attempt_no", attemptNo);

      const documentMetadata = [];
      attachedFiles.forEach((item, index) => {
        formData.append(`files[]`, item.file);
        documentMetadata.push({
          index,
          name: item.file.name,
          size: item.file.size,
          category: item.category,
        });
      });
      formData.append("document_metadata", JSON.stringify(documentMetadata));

      const response = await fetch(
        "http://localhost/REC-Review-Application-Management/backend/api/submit_protocol_revision.php",
        {
          method: "POST",
          body: formData,
        }
      );

      const result = await response.json();

      if (!response.ok || result.status === "error" || result.success === false) {
        throw new Error(result.message || "Failed to submit protocol revision.");
      }

      if (onSuccess) {
        onSuccess(result);
      }
    } catch (err) {
      setErrorMessage(err.message || "An unexpected network error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="modal d-block show"
      tabIndex="-1"
      role="dialog"
      aria-labelledby="reviseProtocolModalTitle"
      style={{ backgroundColor: "rgba(0,0,0,0.6)", zIndex: 1065, display: "block", opacity: 1 }}
    >
      <div className="modal-dialog modal-dialog-centered modal-lg modal-dialog-scrollable">
        <div className="modal-content border-0 shadow-lg">
          {/* Header */}
          <div className="modal-header bg-warning text-dark py-3 px-4 border-bottom border-warning-subtle">
            <div className="d-flex align-items-center gap-3">
              <img
                src={adzuSeal}
                alt="AdZU Seal"
                width="36"
                height="36"
                className="img-fluid flex-shrink-0"
              />
              <div>
                <div className="d-flex align-items-center gap-2 flex-wrap">
                  <h5 className="modal-title fw-bold mb-0" id="reviseProtocolModalTitle">
                    Submit Protocol Revision
                  </h5>
                  <span className="badge bg-dark text-white font-monospace px-2 py-1">
                    {protocolCode}
                  </span>
                  <span className="badge bg-white text-dark border border-warning-subtle fw-semibold">
                    Attempt #{attemptNo} → #{nextAttemptNo}
                  </span>
                </div>
                <small className="text-dark-50 fw-medium d-block">
                  Ateneo de Zamboanga University • Research Ethics Review Committee
                </small>
              </div>
            </div>
            <button
              type="button"
              className="btn-close"
              onClick={onClose}
              disabled={isSubmitting}
              aria-label="Close"
            ></button>
          </div>

          {/* Body */}
          <div className="modal-body p-4">
            {/* Title Summary */}
            <div className="mb-3 pb-2 border-bottom">
              <span className="text-muted small text-uppercase fw-bold">Research Title</span>
              <p className="fw-semibold text-dark mb-0 fs-6">
                {application.research_title || application.title || "Untitled Application"}
              </p>
            </div>

            {/* Directives Context Panel */}
            <div className="card border-0 bg-warning-subtle bg-opacity-25 border-start border-4 border-warning p-3 mb-3 rounded-3">
              <div className="d-flex align-items-center justify-content-between mb-2 flex-wrap gap-1">
                <span className="fw-bold text-dark d-inline-flex align-items-center gap-1 small text-uppercase">
                  <i className="bi bi-chat-left-quote-fill text-warning"></i> Ethics Chair Directives to Address
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

            {/* Payment Retained Notice */}
            <div className="card bg-success-subtle bg-opacity-25 border border-success-subtle p-3 mb-3 rounded-3">
              <div className="d-flex align-items-start gap-2">
                <i className="bi bi-check-circle-fill text-success fs-5 mt-1"></i>
                <div>
                  <h6 className="fw-bold text-success-emphasis mb-1 small text-uppercase">
                    Payment Invariant Retained (₱0 Fee)
                  </h6>
                  <p className="mb-0 small text-secondary">
                    Your Official Receipt (<strong>OR No. {orNumber}</strong>) remains verified and permanently credited. <strong>No additional payment or re-submission is needed</strong> for Stage 3 protocol revisions.
                  </p>
                </div>
              </div>
            </div>

            {/* Error Banner */}
            {errorMessage && (
              <div className="alert alert-danger py-2 px-3 small d-flex align-items-center gap-2 mb-3" role="alert">
                <i className="bi bi-exclamation-triangle-fill flex-shrink-0 fs-5"></i>
                <div>{errorMessage}</div>
              </div>
            )}

            <form id="protocolRevisionForm" onSubmit={handleSubmit}>
              {/* Field 1: Point-by-Point Rebuttal / Clarifications */}
              <div className="mb-4">
                <div className="d-flex justify-content-between align-items-center mb-1">
                  <label htmlFor="rebuttalNotesInput" className="form-label fw-bold text-dark small text-uppercase mb-0">
                    Point-by-Point Clarification / Revision Remarks <span className="text-danger">*</span>
                  </label>
                  <span className="text-muted small">
                    {rebuttalNotes.length} characters
                  </span>
                </div>
                <p className="text-muted small mb-2">
                  Detail how you revised the protocol, modified instruments, or clarified review criteria in response to the directives above.
                </p>
                <textarea
                  id="rebuttalNotesInput"
                  className="form-control"
                  rows="4"
                  placeholder="e.g. 1. In response to the sample size directive, Section 3.2 has been updated to include power calculations...&#10;2. Participant consent forms now include translated Chavacano/Bisaya statements..."
                  value={rebuttalNotes}
                  onChange={(e) => setRebuttalNotes(e.target.value)}
                  disabled={isSubmitting}
                  required
                ></textarea>
              </div>

              {/* Field 2: Multi-File Batch Dropzone */}
              <div className="mb-3">
                <div className="d-flex justify-content-between align-items-center mb-2 flex-wrap gap-2">
                  <div>
                    <label className="form-label fw-bold text-dark small text-uppercase mb-0">
                      Upload Revised Files & Supplementary Documents <span className="text-danger">*</span>
                    </label>
                    <small className="text-muted d-block">
                      Attach multiple files at once. You can categorize each document below.
                    </small>
                  </div>
                  <span className="badge bg-light text-secondary border">
                    {attachedFiles.length} file{attachedFiles.length === 1 ? "" : "s"} staged
                  </span>
                </div>

                {/* Batch Dropzone Target */}
                <div
                  className={`border border-2 border-dashed rounded-3 p-4 text-center cursor-pointer transition-all ${
                    isDragging
                      ? "border-warning bg-warning-subtle bg-opacity-25"
                      : "border-secondary-subtle bg-light hover-bg-light"
                  }`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={handleTriggerUpload}
                  style={{ cursor: "pointer" }}
                >
                  <i className="bi bi-cloud-arrow-up-fill text-warning fs-1 d-block mb-1"></i>
                  <span className="fw-bold text-dark d-block">
                    Click to browse files or drag & drop all files here
                  </span>
                  <small className="text-muted d-block mt-1">
                    Upload multiple files simultaneously • Accepted: PDF, Word (DOCX/DOC), ZIP • Max: 15MB each
                  </small>
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="d-none"
                    multiple
                    accept=".pdf,.docx,.doc,.zip"
                    onChange={handleFileChange}
                    disabled={isSubmitting}
                  />
                </div>

                {/* Live REC Package Checklist Bar */}
                <div className="mt-3 p-3 bg-light rounded-3 border">
                  <div className="d-flex align-items-center justify-content-between mb-2 flex-wrap gap-1">
                    <span className="small fw-bold text-uppercase text-dark">
                      <i className="bi bi-clipboard-check-fill text-primary me-1"></i>
                      AdZU REC Revision Package Checklist:
                    </span>
                    <small className="text-muted">
                      Essential items expected by the Ethics Review Committee
                    </small>
                  </div>
                  <div className="d-flex flex-wrap gap-2">
                    <span
                      className={`badge d-inline-flex align-items-center gap-1 px-2 py-1 ${
                        hasCleanProtocol
                          ? "bg-success text-white"
                          : "bg-warning-subtle text-dark border border-warning"
                      }`}
                    >
                      <i className={`bi ${hasCleanProtocol ? "bi-check-circle-fill" : "bi-exclamation-circle"}`}></i>
                      Clean Copy Protocol: {hasCleanProtocol ? "Attached" : "Recommended"}
                    </span>
                    <span
                      className={`badge d-inline-flex align-items-center gap-1 px-2 py-1 ${
                        hasTrackedProtocol
                          ? "bg-success text-white"
                          : "bg-warning-subtle text-dark border border-warning"
                      }`}
                    >
                      <i className={`bi ${hasTrackedProtocol ? "bi-check-circle-fill" : "bi-exclamation-circle"}`}></i>
                      Tracked Changes Protocol: {hasTrackedProtocol ? "Attached" : "Recommended"}
                    </span>
                    <span
                      className={`badge d-inline-flex align-items-center gap-1 px-2 py-1 ${
                        hasClarificationMatrix
                          ? "bg-success text-white"
                          : "bg-secondary-subtle text-secondary border"
                      }`}
                    >
                      <i className={`bi ${hasClarificationMatrix ? "bi-check-circle-fill" : "bi-dash-circle"}`}></i>
                      Clarification Matrix Doc: {hasClarificationMatrix ? "Attached" : "In Remarks/Optional"}
                    </span>
                  </div>
                </div>

                {/* Staged Files List with Direct Category Controls */}
                {attachedFiles.length > 0 && (
                  <div className="mt-3">
                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <span className="small fw-bold text-dark text-uppercase">
                        Staged Documents for Resubmission:
                      </span>
                      <button
                        type="button"
                        className="btn btn-link btn-sm text-decoration-none p-0 text-primary fw-medium"
                        onClick={handleTriggerUpload}
                      >
                        <i className="bi bi-plus-circle me-1"></i>Add more files
                      </button>
                    </div>

                    <div className="d-flex flex-column gap-2">
                      {attachedFiles.map((item) => (
                        <div
                          key={item.id}
                          className="d-flex align-items-center justify-content-between p-2 px-3 bg-white border rounded-3 shadow-xs flex-wrap gap-2"
                        >
                          {/* File info */}
                          <div className="d-flex align-items-center gap-2 text-truncate" style={{ maxWidth: "50%" }}>
                            <i className="bi bi-file-earmark-arrow-up-fill text-primary fs-5 flex-shrink-0"></i>
                            <div className="text-truncate">
                              <span className="fw-medium text-dark d-block text-truncate small" title={item.file.name}>
                                {item.file.name}
                              </span>
                              <small className="text-muted font-monospace">
                                {formatFileSize(item.file.size)}
                              </small>
                            </div>
                          </div>

                          {/* Category Selector Badge & Remove Action */}
                          <div className="d-flex align-items-center gap-2 ms-auto">
                            <div className="d-flex flex-column">
                              <label className="visually-hidden" htmlFor={`cat-select-${item.id}`}>
                                Document Category
                              </label>
                              <select
                                id={`cat-select-${item.id}`}
                                className="form-select form-select-sm"
                                value={item.category}
                                onChange={(e) => handleUpdateCategory(item.id, e.target.value)}
                                disabled={isSubmitting}
                                style={{ maxWidth: "250px" }}
                              >
                                {DOCUMENT_CATEGORIES.map((cat) => (
                                  <option key={cat.value} value={cat.value}>
                                    {cat.label}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <button
                              type="button"
                              className="btn btn-outline-danger btn-sm d-inline-flex align-items-center justify-content-center p-1"
                              style={{ width: "36px", height: "36px" }}
                              onClick={() => handleRemoveFile(item.id)}
                              disabled={isSubmitting}
                              title="Remove this file"
                              aria-label={`Remove ${item.file.name}`}
                            >
                              <i className="bi bi-trash"></i>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </form>
          </div>

          {/* Footer */}
          <div className="modal-footer bg-light border-top-0 px-4 py-3 d-flex justify-content-between">
            <button
              type="button"
              className="btn btn-outline-secondary px-4 fw-medium"
              style={{ minHeight: "44px" }}
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              form="protocolRevisionForm"
              className="btn btn-warning text-dark px-4 fw-semibold shadow-sm d-inline-flex align-items-center gap-2"
              style={{ minHeight: "44px" }}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                  <span>Submitting Revision...</span>
                </>
              ) : (
                <>
                  <i className="bi bi-send-check-fill"></i>
                  <span>Submit Revision to Ethics Chair</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ReviseProtocolModal;
