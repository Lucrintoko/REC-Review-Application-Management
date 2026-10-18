import React, { useState, useRef, useMemo } from "react";
import { formatDate } from "../../utils/formatters";
import adzuSeal from "../../assets/AdZU Seal.png";

const ALLOWED_EXTENSIONS = [".pdf", ".docx", ".doc", ".zip"];
const MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024; // 15MB

const APPEAL_DOCUMENT_CATEGORIES = [
  { value: "restructured_protocol_clean", label: "Restructured Protocol (Clean Copy)", isCore: true },
  { value: "restructured_protocol_tracked", label: "Restructured Protocol (Tracked Changes)", isCore: true },
  { value: "institutional_safeguard_moa", label: "Institutional MOA / Safety Accord / DTA", isCore: false },
  { value: "specialist_endorsement", label: "Specialist / Dept Chair / Expert Endorsement", isCore: false },
  { value: "other_supporting", label: "Other Supporting Evidence", isCore: false },
];

function formatFileSize(bytes) {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

// Smart Category Auto-Detection based on academic file naming heuristics
function detectCategoryFromFilename(filename) {
  const lower = filename.toLowerCase();
  if (
    lower.includes("moa") ||
    lower.includes("agreement") ||
    lower.includes("accord") ||
    lower.includes("dta") ||
    lower.includes("safeguard") ||
    lower.includes("contract")
  ) {
    return "institutional_safeguard_moa";
  }
  if (
    lower.includes("endorse") ||
    lower.includes("chair") ||
    lower.includes("specialist") ||
    lower.includes("toxicolog") ||
    lower.includes("expert") ||
    lower.includes("letter")
  ) {
    return "specialist_endorsement";
  }
  if (
    lower.includes("track") ||
    lower.includes("markup") ||
    lower.includes("diff") ||
    lower.includes("revised")
  ) {
    return "restructured_protocol_tracked";
  }
  if (
    lower.includes("clean") ||
    lower.includes("restructured") ||
    lower.includes("protocol")
  ) {
    return "restructured_protocol_clean";
  }
  return "other_supporting";
}

/**
 * ProtocolAppealModal.jsx
 * Stage 5 Reconsideration: Applicant Portal Formal Appeal Engine (Approach A)
 * Initiates Cycle 2 Review under Heightened Board Scrutiny for Disapproved Protocols.
 */
export default function ProtocolAppealModal({
  show,
  application,
  onClose,
  onSuccess,
}) {
  const [appealTitle, setAppealTitle] = useState("");
  const [appealJustification, setAppealJustification] = useState("");
  const [attachedFiles, setAttachedFiles] = useState([]);
  const [isAffirmed, setIsAffirmed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  // Category coverage summary for AdZU REC compliance checking
  const categoryCounts = useMemo(() => {
    const counts = {};
    APPEAL_DOCUMENT_CATEGORIES.forEach((cat) => {
      counts[cat.value] = attachedFiles.filter((f) => f.category === cat.value).length;
    });
    return counts;
  }, [attachedFiles]);

  if (!show || !application) return null;

  const protocolCode = application.protocol_code || application.protocol_no || application.id || "2026-0088";
  const researchTitle = application.research_title || application.title || "Untitled Research Study";
  const consolidation = application.latest_consolidation || {};
  const chairName = consolidation.chair_name || application.chair_proponent_name || "Ethics Committee Chair";
  const disapprovalDate = consolidation.meeting_date
    ? formatDate(consolidation.meeting_date)
    : application.submission_date
    ? formatDate(application.submission_date)
    : "Previous Session";
  const disapprovalReason =
    consolidation.directives_for_revisions ||
    consolidation.summary_notes ||
    application.revision_notes ||
    "Protocol was disapproved due to critical methodological vulnerabilities, unmitigated participant risk, or institutional oversight gaps.";

  const orNumber = application.or_number || "Verified on File";

  // Form Validation Requirements
  const isTitleValid = appealTitle.trim().length >= 5;
  const isJustificationValid = appealJustification.trim().length >= 50;
  const hasFiles = attachedFiles.length > 0;
  const isFormValid = isTitleValid && isJustificationValid && hasFiles && isAffirmed;

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

    if (!isTitleValid) {
      setErrorMessage("Please provide a concise Executive Summary title (minimum 5 characters).");
      return;
    }

    if (!isJustificationValid) {
      setErrorMessage(
        "Appeal justification must be at least 50 characters to comprehensively address fatal flaws."
      );
      return;
    }

    if (!hasFiles) {
      setErrorMessage("Please attach at least one restructured protocol or institutional safeguard document.");
      return;
    }

    if (!isAffirmed) {
      setErrorMessage("You must affirm the Heightened Board Scrutiny petition statement before submitting.");
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
      formData.append("appeal_title", appealTitle.trim());
      formData.append("appeal_justification", appealJustification.trim());
      formData.append("cycle_number", 2);
      formData.append("is_affirmed", "1");

      const documentMetadata = [];
      attachedFiles.forEach((item, index) => {
        formData.append("files[]", item.file);
        documentMetadata.push({
          index,
          name: item.file.name,
          size: item.file.size,
          category: item.category,
        });
      });
      formData.append("document_metadata", JSON.stringify(documentMetadata));

      const response = await fetch(
        "http://localhost/REC-Review-Application-Management/backend/api/submit_protocol_appeal.php",
        {
          method: "POST",
          body: formData,
        }
      );

      const result = await response.json().catch(() => null);

      if (response.ok && result && result.status === "success") {
        if (onSuccess) onSuccess(result);
        onClose();
      } else {
        throw new Error(result?.message || "Failed to submit protocol appeal.");
      }
    } catch (err) {
      setErrorMessage(err.message || "An unexpected network error occurred while submitting appeal.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="modal d-block show"
      tabIndex="-1"
      role="dialog"
      aria-labelledby="appealModalTitle"
      style={{
        backgroundColor: "rgba(15, 23, 42, 0.75)",
        backdropFilter: "blur(4px)",
        zIndex: 1060,
      }}
    >
      <div className="modal-dialog modal-dialog-centered modal-lg modal-dialog-scrollable">
        <div className="modal-content border-0 shadow-lg rounded-3">
          {/* Header */}
          <div className="modal-header bg-dark text-white py-3 px-4 border-bottom border-secondary d-flex justify-content-between align-items-center">
            <div className="d-flex align-items-center gap-3">
              <img
                src={adzuSeal}
                alt="AdZU Seal"
                width="38"
                height="38"
                className="img-fluid flex-shrink-0"
              />
              <div>
                <div className="d-flex align-items-center gap-2 flex-wrap">
                  <h5 className="modal-title fw-bold text-white mb-0" id="appealModalTitle">
                    Petition for Reconsideration &amp; Formal Appeal
                  </h5>
                  <span className="badge bg-secondary font-monospace px-2 py-1">
                    {protocolCode}
                  </span>
                  <span className="badge bg-danger text-white">
                    Cycle 1 Disapproved
                  </span>
                </div>
                <small className="text-secondary fw-medium">
                  Ateneo de Zamboanga University • Research Ethics Committee (Approach A Engine)
                </small>
              </div>
            </div>

            <button
              type="button"
              className="btn-close btn-close-white"
              onClick={onClose}
              aria-label="Close"
              disabled={isSubmitting}
            ></button>
          </div>

          {/* Body */}
          <div className="modal-body p-4 bg-light">
            <form onSubmit={handleSubmit} className="d-flex flex-column gap-3">
              {/* Error Message */}
              {errorMessage && (
                <div className="alert alert-danger d-flex align-items-center gap-2 py-2 px-3 mb-0 rounded-3 shadow-xs">
                  <i className="bi bi-exclamation-triangle-fill fs-5 flex-shrink-0"></i>
                  <span className="small fw-medium">{errorMessage}</span>
                </div>
              )}

              {/* Research Title Card */}
              <div className="card border-0 shadow-sm p-3 bg-white rounded-3">
                <span className="text-muted small text-uppercase fw-bold">Research Title</span>
                <h6 className="fw-bold text-dark mb-0 fs-6">{researchTitle}</h6>
              </div>

              {/* Disapproval Context Callout */}
              <div className="card border-0 border-start border-4 border-danger shadow-sm p-3 bg-white rounded-3">
                <div className="d-flex align-items-start gap-3">
                  <i className="bi bi-x-octagon-fill text-danger fs-3 mt-1 flex-shrink-0"></i>
                  <div className="flex-grow-1">
                    <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-1">
                      <h6 className="fw-bold text-danger text-uppercase mb-0">
                        Basis for Prior Disapproval (Cycle 1 Deliberation)
                      </h6>
                      <span className="badge bg-light text-secondary border font-monospace">
                        Decided: {disapprovalDate}
                      </span>
                    </div>
                    <p className="small text-secondary mb-2 fst-italic">
                      "{disapprovalReason}"
                    </p>
                    <div className="small text-muted">
                      Evaluated by: <strong className="text-dark">{chairName}</strong> (Ethics Committee)
                    </div>
                  </div>
                </div>
              </div>

              {/* Zero Fee Guarantee (Approach A) */}
              <div className="card bg-success-subtle bg-opacity-25 border border-success-subtle shadow-xs p-3 rounded-3">
                <div className="d-flex align-items-start gap-2">
                  <i className="bi bi-shield-check text-success fs-5 mt-1"></i>
                  <div>
                    <h6 className="fw-bold text-success-emphasis mb-1 small text-uppercase">
                      Reconsideration Fee Invariant (₱0 Fee)
                    </h6>
                    <p className="mb-0 small text-secondary">
                      Under <strong>Approach A</strong>, formal appeals operate under your existing protocol record. 
                      Your Official Receipt (<strong>OR No. {orNumber}</strong>) remains fully credited with 
                      <strong> zero additional application fee</strong>.
                    </p>
                  </div>
                </div>
              </div>

              {/* Input: Appeal Title / Executive Summary */}
              <div className="card border-0 shadow-sm p-3 bg-white rounded-3">
                <label htmlFor="appealTitleInput" className="form-label fw-bold text-dark small text-uppercase mb-1">
                  Appeal Executive Summary / Basis <span className="text-danger">*</span>
                </label>
                <input
                  type="text"
                  id="appealTitleInput"
                  className="form-control form-control-sm"
                  placeholder="e.g., Toxicological Safety Protocols & Institutional Oversight Restructuring"
                  value={appealTitle}
                  onChange={(e) => setAppealTitle(e.target.value)}
                  disabled={isSubmitting}
                  maxLength={120}
                  required
                />
                <div className="d-flex justify-content-between mt-1">
                  <small className="text-muted">A concise summary of the corrective appeal premise.</small>
                  <small className={appealTitle.trim().length >= 5 ? "text-success fw-medium" : "text-muted"}>
                    {appealTitle.trim().length}/120
                  </small>
                </div>
              </div>

              {/* Input: Comprehensive Appeal Justification */}
              <div className="card border-0 shadow-sm p-3 bg-white rounded-3">
                <div className="d-flex justify-content-between align-items-center mb-1">
                  <label htmlFor="appealJustificationInput" className="form-label fw-bold text-dark small text-uppercase mb-0">
                    Comprehensive Reconsideration Justification <span className="text-danger">*</span>
                  </label>
                  <span className={`badge ${isJustificationValid ? "bg-success-subtle text-success border border-success-subtle" : "bg-warning-subtle text-warning-emphasis border border-warning-subtle"}`}>
                    {appealJustification.trim().length} / 50 min chars
                  </span>
                </div>
                <textarea
                  id="appealJustificationInput"
                  className="form-control"
                  rows="4"
                  placeholder="Detail precisely how the fatal ethical flaws, participant risks, safety protocols, or institutional oversights identified in the Disapproval Notice have been resolved. Cite specific page numbers or attachments..."
                  value={appealJustification}
                  onChange={(e) => setAppealJustification(e.target.value)}
                  disabled={isSubmitting}
                  required
                ></textarea>
                <small className="text-muted mt-1">
                  Must be at least 50 characters. Provide thorough, evidence-based academic and ethical justifications.
                </small>
              </div>

              {/* Multi-Category File Upload Zone */}
              <div className="card border-0 shadow-sm p-3 bg-white rounded-3">
                <div className="d-flex justify-content-between align-items-center mb-2 flex-wrap gap-2">
                  <div>
                    <label className="form-label fw-bold text-dark small text-uppercase mb-0">
                      Corrective Documents &amp; Institutional Evidence <span className="text-danger">*</span>
                    </label>
                    <div className="text-muted small">
                      Attach clean/tracked restructured protocols, signed MOAs, or expert endorsements.
                    </div>
                  </div>

                  {/* Category Pills Summary */}
                  <div className="d-flex gap-1 flex-wrap">
                    <span className={`badge ${categoryCounts["restructured_protocol_clean"] > 0 ? "bg-primary text-white" : "bg-light text-secondary border"}`}>
                      Clean: {categoryCounts["restructured_protocol_clean"]}
                    </span>
                    <span className={`badge ${categoryCounts["restructured_protocol_tracked"] > 0 ? "bg-primary text-white" : "bg-light text-secondary border"}`}>
                      Tracked: {categoryCounts["restructured_protocol_tracked"]}
                    </span>
                    <span className={`badge ${categoryCounts["institutional_safeguard_moa"] > 0 ? "bg-success text-white" : "bg-light text-secondary border"}`}>
                      MOA: {categoryCounts["institutional_safeguard_moa"]}
                    </span>
                    <span className={`badge ${categoryCounts["specialist_endorsement"] > 0 ? "bg-info text-dark" : "bg-light text-secondary border"}`}>
                      Endorsement: {categoryCounts["specialist_endorsement"]}
                    </span>
                  </div>
                </div>

                {/* Dropzone */}
                <div
                  className={`border border-2 border-dashed rounded-3 p-4 text-center cursor-pointer transition-all ${
                    isDragging ? "bg-primary-subtle border-primary" : "bg-light border-secondary-subtle"
                  }`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={handleTriggerUpload}
                  style={{ cursor: "pointer" }}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    className="d-none"
                    accept=".pdf,.docx,.doc,.zip"
                    onChange={handleFileChange}
                    disabled={isSubmitting}
                  />
                  <i className="bi bi-cloud-arrow-up fs-2 text-primary d-block mb-1"></i>
                  <p className="fw-semibold text-dark mb-0">
                    Drag and drop corrective files here, or <span className="text-primary text-decoration-underline">browse files</span>
                  </p>
                  <span className="small text-muted">
                    Accepted formats: PDF, DOCX, DOC, ZIP (Max 15MB per file)
                  </span>
                </div>

                {/* File Attachment List */}
                {attachedFiles.length > 0 && (
                  <div className="mt-3 table-responsive border rounded">
                    <table className="table table-sm align-middle mb-0 bg-white">
                      <thead className="table-light small">
                        <tr>
                          <th>File Name</th>
                          <th>Size</th>
                          <th style={{ width: "40%" }}>Document Category</th>
                          <th className="text-end">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {attachedFiles.map((item) => (
                          <tr key={item.id}>
                            <td>
                              <div className="d-flex align-items-center gap-2">
                                <i className="bi bi-file-earmark-medical-fill text-danger"></i>
                                <span className="text-truncate small fw-medium" style={{ maxWidth: "200px" }}>
                                  {item.file.name}
                                </span>
                              </div>
                            </td>
                            <td className="small text-muted">{formatFileSize(item.file.size)}</td>
                            <td>
                              <select
                                className="form-select form-select-sm"
                                value={item.category}
                                onChange={(e) => handleUpdateCategory(item.id, e.target.value)}
                                disabled={isSubmitting}
                              >
                                {APPEAL_DOCUMENT_CATEGORIES.map((cat) => (
                                  <option key={cat.value} value={cat.value}>
                                    {cat.label}
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td className="text-end">
                              <button
                                type="button"
                                className="btn btn-outline-danger btn-sm p-1 px-2 rounded-circle"
                                onClick={() => handleRemoveFile(item.id)}
                                disabled={isSubmitting}
                                title="Remove file"
                                style={{ width: "32px", height: "32px" }}
                              >
                                <i className="bi bi-trash"></i>
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Heightened Board Scrutiny Affirmation Card */}
              <div className="card border-0 border-start border-4 border-warning shadow-sm p-3 bg-white rounded-3">
                <div className="form-check d-flex align-items-start gap-2">
                  <input
                    type="checkbox"
                    className="form-check-input mt-1 flex-shrink-0"
                    id="heightenedScrutinyAffirmation"
                    checked={isAffirmed}
                    onChange={(e) => setIsAffirmed(e.target.checked)}
                    disabled={isSubmitting}
                    required
                    style={{ width: "1.25rem", height: "1.25rem", cursor: "pointer" }}
                  />
                  <label
                    htmlFor="heightenedScrutinyAffirmation"
                    className="form-check-label small text-dark fw-medium"
                    style={{ cursor: "pointer", lineHeight: "1.5" }}
                  >
                    I hereby formally petition the AdZU Research Ethics Committee for reconsideration of 
                    Protocol <strong>[{protocolCode}]</strong>. I affirm that the submitted corrective safeguards address all prior grounds for disapproval and understand that this submission initiates Cycle 2 review under <strong>Heightened Board Scrutiny</strong>.
                  </label>
                </div>
              </div>
            </form>
          </div>

          {/* Footer */}
          <div className="modal-footer bg-white py-3 px-4 border-top d-flex justify-content-between align-items-center">
            <button
              type="button"
              className="btn btn-outline-secondary btn-sm px-3"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>

            <button
              type="button"
              className="btn btn-danger btn-sm px-4 fw-semibold shadow-sm d-inline-flex align-items-center gap-2"
              onClick={handleSubmit}
              disabled={!isFormValid || isSubmitting}
              style={{ minHeight: "38px" }}
            >
              {isSubmitting ? (
                <>
                  <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                  <span>Submitting Petition...</span>
                </>
              ) : (
                <>
                  <i className="bi bi-bank"></i>
                  <span>Submit Formal Appeal (Cycle 2)</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
