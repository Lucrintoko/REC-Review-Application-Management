import React, { useState, useRef, useMemo, useEffect } from "react";
import { formatDate } from "../../utils/formatters";
import adzuSeal from "../../assets/AdZU Seal.png";

const ALLOWED_EXTENSIONS = [".pdf", ".docx", ".doc", ".zip"];
const MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024; // 15MB

const DOCUMENT_CATEGORIES = [
  { value: "revised_protocol_clean", label: "Revised Protocol (Clean Copy)", isCore: true },
  { value: "revised_protocol_tracked", label: "Revised Protocol (Tracked Changes)", isCore: true },
  { value: "clarification_matrix", label: "Point-by-Point Clarification Matrix", isCore: false },
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
  if (lower.includes("track") || lower.includes("markup") || lower.includes("diff")) {
    return "revised_protocol_tracked";
  }
  if (lower.includes("clean")) {
    return "revised_protocol_clean";
  }
  if (lower.includes("matrix") || lower.includes("clarification") || lower.includes("rebuttal") || lower.includes("response")) {
    return "clarification_matrix";
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

/**
 * ReviseProtocolModal.jsx
 * Context-Aware Protocol Revision Modal supporting both:
 * 1. Stage 3 (Type of Review Pre-Assessment Revision)
 * 2. Stage 6 (Post-Decision Committee Directives Point-by-Point Revision)
 */
function ReviseProtocolModal({ show, application, onClose, onSuccess }) {
  // Top-level hooks strictly before early returns to preserve Hook Count Invariance
  const [rebuttalNotes, setRebuttalNotes] = useState("");
  const [attachedFiles, setAttachedFiles] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [consolidationDetails, setConsolidationDetails] = useState(null);
  const [isLoadingDirectives, setIsLoadingDirectives] = useState(false);
  const [complianceMatrixState, setComplianceMatrixState] = useState({});
  const fileInputRef = useRef(null);

  // Discriminator: Determine if this revision is Stage 6 (Post-Decision) vs Stage 3 (Pre-Assessment)
  const isStage6DecisionRevision = Boolean(
    application?.has_consolidated_decision ||
    (application?.status || "").toLowerCase() === "decision letter issued" ||
    application?.latest_consolidation
  );

  // Reset form inputs whenever the target application changes
  useEffect(() => {
    setRebuttalNotes("");
    setAttachedFiles([]);
    setErrorMessage("");
    setComplianceMatrixState({});
  }, [application?.application_id]);

  // For Stage 6: Fetch complete consolidation directives if needed
  useEffect(() => {
    if (!show || !application?.application_id || !isStage6DecisionRevision) return;

    let isMounted = true;
    const fetchDirectives = async () => {
      setIsLoadingDirectives(true);
      try {
        const res = await fetch(
          `http://localhost/REC-Review-Application-Management/backend/api/get_consolidation_data.php?application_id=${application.application_id}`
        );
        const json = await res.json();
        if (res.ok && json.status === "success" && isMounted) {
          setConsolidationDetails(json.data);
        }
      } catch (err) {
        console.warn("Could not load consolidation data for revision:", err);
      } finally {
        if (isMounted) setIsLoadingDirectives(false);
      }
    };

    fetchDirectives();
    return () => {
      isMounted = false;
    };
  }, [show, application?.application_id, isStage6DecisionRevision]);

  // Compute active directives list for Stage 6 point-by-point matrix
  const activeDirectivesList = useMemo(() => {
    if (!isStage6DecisionRevision) return [];

    const normalizeDirectives = (list) => {
      return list.map((item, idx) => ({
        question_id: item.question_id || item.directive_id || `dir_${item.criterion_key || idx}`,
        form_type: item.form_type || (item.source_form?.toLowerCase()?.includes("12") ? "form12" : "form11"),
        criterion_key: item.criterion_key || `crit_${idx}`,
        criterion_label: item.criterion_label || item.label || "Flagged Requirement",
        section_title: item.section_title || item.section || "Protocol Directives",
        directive_text: item.directive_text || item.required_action || item.remarks || item.issue || "Please address this committee directive."
      }));
    };

    // Priority 1: actionable_directives from API or application payload
    const fromApi = consolidationDetails?.actionable_directives || [];
    if (Array.isArray(fromApi) && fromApi.length > 0) return normalizeDirectives(fromApi);

    const fromLatest = application?.latest_consolidation?.actionable_directives;
    if (Array.isArray(fromLatest) && fromLatest.length > 0) return normalizeDirectives(fromLatest);

    // Priority 2: criteria_matrix where finding is Requires Modification or Unable to Assess
    const matrix = consolidationDetails?.criteria_matrix;
    if (matrix) {
      const flagged = [];
      const f11 = matrix.form11 || [];
      const f12 = matrix.form12 || [];

      [...f11, ...f12].forEach((item) => {
        const finding = item.chair_state?.finding || item.smart_default_finding;
        const remarks = item.chair_state?.remarks || item.smart_default_remarks;
        if (finding === "Requires Modification" || finding === "Unable to Assess" || item.is_flagged) {
          flagged.push({
            question_id: item.question_id,
            form_type: item.form_type || (item.question_id?.startsWith("f11") ? "form11" : "form12"),
            criterion_key: item.criterion_key,
            criterion_label: item.label,
            section_title: item.section_title || item.section || "Protocol Evaluation",
            directive_text: remarks || "Please address committee requirements for this criterion."
          });
        }
      });
      if (flagged.length > 0) return flagged;
    }

    // Priority 3: general directives_for_revisions
    const metaDirectives =
      consolidationDetails?.consolidation_meta?.directives_for_revisions ||
      application?.latest_consolidation?.directives_for_revisions;
    if (metaDirectives && metaDirectives.trim()) {
      return [
        {
          question_id: "general_directives",
          form_type: "general",
          criterion_key: "general",
          criterion_label: "Consolidated Directives for Revisions",
          section_title: "Ethics Committee Action Matrix",
          directive_text: metaDirectives.trim()
        }
      ];
    }

    return [];
  }, [isStage6DecisionRevision, consolidationDetails, application?.latest_consolidation]);

  // Category coverage summary for AdZU REC compliance checking
  const categoryCounts = useMemo(() => {
    const counts = {};
    DOCUMENT_CATEGORIES.forEach((cat) => {
      counts[cat.value] = attachedFiles.filter((f) => f.category === cat.value).length;
    });
    return counts;
  }, [attachedFiles]);

  if (!show || !application) return null;

  // Metadata Extraction
  const protocolCode = application.protocol_code || application.protocol_no || application.id || "REC Protocol";
  const orNumber = application.or_number || "Verified on File";
  const cycleNumber = application.current_cycle || consolidationDetails?.consolidation_meta?.cycle_number || 1;
  const consolidation = application.latest_consolidation || consolidationDetails?.consolidation_meta || {};
  const recommendation = consolidation.consolidated_recommendation || "Minor Revisions";
  const deliberationDate = consolidation.meeting_date
    ? formatDate(consolidation.meeting_date)
    : formatDate(new Date().toISOString());
  const chairName = consolidation.chair_name || "Ethics Committee Chair";

  // Stage 3 specific variables
  const attemptNo = application.revision_attempt_no || 1;
  const nextAttemptNo = attemptNo + 1;
  const stage3Directives =
    application.revision_notes ||
    "The Ethics Review Committee Chair has returned this application for protocol modifications or clarification of review type requirements.";
  const stage3RequestedDate = application.revision_requested_at
    ? formatDate(application.revision_requested_at)
    : "Recently";

  // Document checklist statuses
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

  const handleUpdateComplianceItem = (questionId, field, value) => {
    setComplianceMatrixState((prev) => ({
      ...prev,
      [questionId]: {
        ...(prev[questionId] || {}),
        [field]: value
      }
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage("");

    if (isStage6DecisionRevision) {
      // Stage 6 Validation
      if (!hasCleanProtocol) {
        setErrorMessage("Please upload a Revised Protocol (Clean Copy) in PDF format.");
        return;
      }
      if (!hasTrackedProtocol) {
        setErrorMessage("Please upload a Revised Protocol (Tracked Changes) showing marked revisions.");
        return;
      }
      if (!rebuttalNotes.trim() || rebuttalNotes.trim().length < 20) {
        setErrorMessage("Executive cover summary must be at least 20 characters long.");
        return;
      }

      // Check if all directives have an action taken and page reference
      if (activeDirectivesList.length > 0) {
        for (let i = 0; i < activeDirectivesList.length; i++) {
          const item = activeDirectivesList[i];
          const resp = complianceMatrixState[item.question_id] || {};
          const action = (resp.action_taken || "").trim();
          const page = (resp.page_reference || "").trim();

          if (!action || action.length < 10) {
            setErrorMessage(
              `Directive #${i + 1} (${item.criterion_label}) requires an explanation of action taken (at least 10 characters).`
            );
            return;
          }
          if (!page) {
            setErrorMessage(
              `Directive #${i + 1} (${item.criterion_label}) requires a document page citation (e.g., "Section 3.2, p. 14").`
            );
            return;
          }
        }
      }
    } else {
      // Stage 3 Validation
      if (!rebuttalNotes.trim() || rebuttalNotes.trim().length < 20) {
        setErrorMessage("Clarification notes must be at least 20 characters long to adequately address the directives.");
        return;
      }
      if (attachedFiles.length === 0) {
        setErrorMessage("Please attach at least one revised protocol document or clarification matrix.");
        return;
      }
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
      formData.append("cover_notes", rebuttalNotes.trim());
      formData.append("revision_attempt_no", attemptNo);

      if (isStage6DecisionRevision) {
        const matrixPayload = activeDirectivesList.map((item) => {
          const resp = complianceMatrixState[item.question_id] || {};
          return {
            question_id: item.question_id,
            form_type: item.form_type,
            criterion_key: item.criterion_key,
            criterion_label: item.criterion_label,
            directive_text: item.directive_text,
            action_taken: (resp.action_taken || "").trim(),
            page_reference: (resp.page_reference || "").trim()
          };
        });
        formData.append("compliance_matrix", JSON.stringify(matrixPayload));
      }

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

      const endpoint = isStage6DecisionRevision
        ? "http://localhost/REC-Review-Application-Management/backend/api/submit_post_review_revision.php"
        : "http://localhost/REC-Review-Application-Management/backend/api/submit_protocol_revision.php";

      const response = await fetch(endpoint, {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (!response.ok || result.status === "error" || result.success === false) {
        throw new Error(result.message || "Failed to submit protocol revision.");
      }

      if (onSuccess) {
        onSuccess(result);
      }
      onClose();
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
      style={{ backgroundColor: "rgba(0,0,0,0.65)", zIndex: 1065, display: "block", opacity: 1 }}
    >
      <div className="modal-dialog modal-dialog-centered modal-xl modal-dialog-scrollable">
        <div className="modal-content border-0 shadow-lg">
          
          {/* Header */}
          <div
            className={`modal-header py-3 px-4 border-bottom ${
              isStage6DecisionRevision
                ? "bg-dark text-white border-secondary"
                : "bg-warning text-dark border-warning-subtle"
            }`}
          >
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
                  <h5 className="modal-title fw-bold mb-0" id="reviseProtocolModalTitle">
                    {isStage6DecisionRevision
                      ? "Submit Revised Protocol & Directives Response"
                      : "Submit Protocol Revision"}
                  </h5>
                  <span className="badge bg-secondary font-monospace px-2 py-1">
                    {protocolCode}
                  </span>
                  {isStage6DecisionRevision ? (
                    <>
                      <span className="badge bg-info-subtle text-info-emphasis border border-info-subtle fw-semibold">
                        Cycle {cycleNumber}
                      </span>
                      <span
                        className={`badge ${
                          recommendation.includes("Major")
                            ? "bg-danger text-white"
                            : "bg-warning text-dark"
                        }`}
                      >
                        {recommendation}
                      </span>
                    </>
                  ) : (
                    <span className="badge bg-white text-dark border border-warning-subtle fw-semibold">
                      Attempt #{attemptNo} → #{nextAttemptNo}
                    </span>
                  )}
                </div>
                <small className={isStage6DecisionRevision ? "text-secondary fw-medium d-block" : "text-dark-50 fw-medium d-block"}>
                  Ateneo de Zamboanga University • Research Ethics Committee (AdZU-REC)
                </small>
              </div>
            </div>
            <button
              type="button"
              className={`btn-close ${isStage6DecisionRevision ? "btn-close-white" : ""}`}
              onClick={onClose}
              disabled={isSubmitting}
              aria-label="Close"
            ></button>
          </div>

          {/* Body */}
          <div className="modal-body p-4 bg-light">
            {/* Title Summary */}
            <div className="card border-0 shadow-xs p-3 bg-white mb-3 rounded-3">
              <span className="text-muted small text-uppercase fw-bold">Research Title</span>
              <p className="fw-semibold text-dark mb-0 fs-6">
                {application.research_title || application.title || "Untitled Application"}
              </p>
            </div>

            {/* STAGE 6: Committee Decision Callout */}
            {isStage6DecisionRevision && (
              <div className="card border-0 border-start border-4 border-primary shadow-xs p-3 bg-white mb-3 rounded-3">
                <div className="d-flex align-items-center justify-content-between mb-2 flex-wrap gap-1">
                  <span className="fw-bold text-primary d-inline-flex align-items-center gap-1 small text-uppercase">
                    <i className="bi bi-file-earmark-check-fill"></i> ADZU-REC Form 13 Committee Action
                  </span>
                  <span className="badge bg-light text-secondary border font-monospace small">
                    Deliberated: {deliberationDate}
                  </span>
                </div>
                <div className="small text-secondary mb-1">
                  Committee Evaluator: <strong className="text-dark">{chairName}</strong>
                </div>
                <p className="small text-muted mb-0">
                  Please address each directive issued below. In accordance with PHREB Level II standards, provide explicit explanations of modifications made and cite exact page/section locations in your revised documents.
                </p>
              </div>
            )}

            {/* STAGE 3: Pre-Assessment Directives Panel */}
            {!isStage6DecisionRevision && (
              <div className="card border-0 bg-warning-subtle bg-opacity-25 border-start border-4 border-warning p-3 mb-3 rounded-3">
                <div className="d-flex align-items-center justify-content-between mb-2 flex-wrap gap-1">
                  <span className="fw-bold text-dark d-inline-flex align-items-center gap-1 small text-uppercase">
                    <i className="bi bi-chat-left-quote-fill text-warning"></i> Ethics Chair Directives to Address
                  </span>
                  <span className="badge bg-warning text-dark font-monospace small">
                    Issued: {stage3RequestedDate}
                  </span>
                </div>
                <div className="small text-secondary mb-2">
                  Evaluator: <strong className="text-dark">{chairName}</strong>
                </div>
                <div className="p-3 bg-white rounded border border-warning-subtle shadow-xs">
                  <p className="mb-0 text-dark fw-medium fst-italic" style={{ whiteSpace: "pre-line" }}>
                    "{stage3Directives}"
                  </p>
                </div>
              </div>
            )}

            {/* Payment Retained Notice */}
            <div className="card bg-success-subtle bg-opacity-25 border border-success-subtle p-3 mb-3 rounded-3 shadow-xs">
              <div className="d-flex align-items-start gap-2">
                <i className="bi bi-check-circle-fill text-success fs-5 mt-1"></i>
                <div>
                  <h6 className="fw-bold text-success-emphasis mb-1 small text-uppercase">
                    Payment Invariant Retained (₱0 Fee)
                  </h6>
                  <p className="mb-0 small text-secondary">
                    Your Official Receipt (<strong>OR No. {orNumber}</strong>) remains verified and permanently credited. <strong>No additional payment or fee</strong> is charged for submitting protocol revisions.
                  </p>
                </div>
              </div>
            </div>

            {/* Error Banner */}
            {errorMessage && (
              <div className="alert alert-danger py-2 px-3 small d-flex align-items-center gap-2 mb-3 shadow-xs" role="alert">
                <i className="bi bi-exclamation-triangle-fill flex-shrink-0 fs-5"></i>
                <div>{errorMessage}</div>
              </div>
            )}

            <form id="protocolRevisionForm" onSubmit={handleSubmit}>
              
              {/* STAGE 6: POINT-BY-POINT DIRECTIVES CLARIFICATION MATRIX */}
              {isStage6DecisionRevision && (
                <div className="card border-0 shadow-sm bg-white p-3 mb-4 rounded-3">
                  <div className="d-flex justify-content-between align-items-center mb-2 flex-wrap gap-2">
                    <div>
                      <h6 className="fw-bold text-dark text-uppercase mb-0 small">
                        <i className="bi bi-list-check text-primary me-2"></i>
                        Point-by-Point Directives Clarification Matrix
                      </h6>
                      <small className="text-muted">
                        Itemized response to each committee finding from Form 13.
                      </small>
                    </div>
                    <span className="badge bg-primary-subtle text-primary border border-primary-subtle font-monospace">
                      {activeDirectivesList.length} Directive{activeDirectivesList.length === 1 ? "" : "s"} Listed
                    </span>
                  </div>

                  {isLoadingDirectives ? (
                    <div className="text-center py-4">
                      <div className="spinner-border text-primary spinner-border-sm me-2" role="status"></div>
                      <span className="text-muted small">Loading committee directives...</span>
                    </div>
                  ) : activeDirectivesList.length === 0 ? (
                    <div className="alert alert-info py-2 px-3 small border-info-subtle mb-0">
                      No itemized directives flagged. Please state your general revisions in the cover notes below.
                    </div>
                  ) : (
                    <div className="d-flex flex-column gap-3 mt-2">
                      {activeDirectivesList.map((item, idx) => {
                        const currentResp = complianceMatrixState[item.question_id] || {};
                        return (
                          <div
                            key={item.question_id || idx}
                            className="card border border-light-subtle rounded-3 p-3 bg-light bg-opacity-50"
                          >
                            <div className="d-flex justify-content-between align-items-center mb-2 flex-wrap gap-1">
                              <span className="fw-bold text-dark small">
                                #{idx + 1}. {item.criterion_label}
                              </span>
                              <span className="badge bg-secondary-subtle text-secondary border font-monospace" style={{ fontSize: "0.7rem" }}>
                                {item.section_title || item.form_type?.toUpperCase()}
                              </span>
                            </div>

                            {/* Directive Quote */}
                            <div className="p-2 mb-3 bg-white rounded border border-warning-subtle small text-dark">
                              <strong className="text-warning-emphasis d-block mb-1">
                                <i className="bi bi-chat-left-quote me-1"></i>Committee Directive:
                              </strong>
                              {item.directive_text}
                            </div>

                            {/* Response Inputs */}
                            <div className="row g-2">
                              <div className="col-12 col-md-8">
                                <label className="form-label small fw-semibold text-dark mb-1">
                                  Action Taken / Rebuttal Clarification <span className="text-danger">*</span>
                                </label>
                                <textarea
                                  className="form-control form-control-sm bg-white"
                                  rows="2"
                                  placeholder="Describe exact modifications made in the protocol to satisfy this directive..."
                                  value={currentResp.action_taken || ""}
                                  onChange={(e) =>
                                    handleUpdateComplianceItem(item.question_id, "action_taken", e.target.value)
                                  }
                                  disabled={isSubmitting}
                                  required
                                ></textarea>
                              </div>

                              <div className="col-12 col-md-4">
                                <label className="form-label small fw-semibold text-dark mb-1">
                                  Page / Section Reference <span className="text-danger">*</span>
                                </label>
                                <div className="input-group input-group-sm">
                                  <span className="input-group-text bg-white text-muted">
                                    <i className="bi bi-bookmark-fill text-primary"></i>
                                  </span>
                                  <input
                                    type="text"
                                    className="form-control bg-white"
                                    placeholder="e.g. Section 3.2, p. 14"
                                    value={currentResp.page_reference || ""}
                                    onChange={(e) =>
                                      handleUpdateComplianceItem(item.question_id, "page_reference", e.target.value)
                                    }
                                    disabled={isSubmitting}
                                    required
                                  />
                                </div>
                                <div className="form-text text-muted" style={{ fontSize: "0.68rem" }}>
                                  Exact location in revised documents.
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* COVER NOTES / REVISION REMARKS */}
              <div className="card border-0 shadow-sm bg-white p-3 mb-4 rounded-3">
                <div className="d-flex justify-content-between align-items-center mb-1">
                  <label htmlFor="rebuttalNotesInput" className="form-label fw-bold text-dark small text-uppercase mb-0">
                    {isStage6DecisionRevision
                      ? "Executive Cover Summary & Transmittal Remarks"
                      : "Point-by-Point Clarification / Revision Remarks"}{" "}
                    <span className="text-danger">*</span>
                  </label>
                  <span className="text-muted small">{rebuttalNotes.length} characters</span>
                </div>
                <p className="text-muted small mb-2">
                  {isStage6DecisionRevision
                    ? "Provide an overarching executive summary of your protocol restructuring and changes for the committee review."
                    : "Detail how you revised the protocol, modified instruments, or clarified review criteria in response to the directives above."}
                </p>
                <textarea
                  id="rebuttalNotesInput"
                  className="form-control"
                  rows={isStage6DecisionRevision ? "3" : "4"}
                  placeholder={
                    isStage6DecisionRevision
                      ? "e.g. In response to the committee's major revision notice, we have restructured Section 3 with updated power calculations, translated consent forms, and established DSMB oversight..."
                      : "e.g. 1. In response to the sample size directive, Section 3.2 has been updated... 2. Participant consent forms now include translated Chavacano statements..."
                  }
                  value={rebuttalNotes}
                  onChange={(e) => setRebuttalNotes(e.target.value)}
                  disabled={isSubmitting}
                  required
                ></textarea>
              </div>

              {/* MANDATORY DOCUMENT CHECKLIST INDICATOR (STAGE 6) */}
              {isStage6DecisionRevision && (
                <div className="card border-0 shadow-xs bg-white p-3 mb-3 rounded-3">
                  <h6 className="fw-bold text-dark text-uppercase mb-2 small">
                    <i className="bi bi-shield-check text-primary me-2"></i>
                    Required Submission Document Checklist
                  </h6>
                  <div className="d-flex flex-wrap gap-2">
                    <span
                      className={`badge py-2 px-3 d-inline-flex align-items-center gap-2 ${
                        hasCleanProtocol
                          ? "bg-success text-white"
                          : "bg-danger-subtle text-danger border border-danger-subtle"
                      }`}
                    >
                      <i className={`bi ${hasCleanProtocol ? "bi-check-circle-fill" : "bi-x-circle-fill"}`}></i>
                      Revised Protocol (Clean Copy) - Required
                    </span>
                    <span
                      className={`badge py-2 px-3 d-inline-flex align-items-center gap-2 ${
                        hasTrackedProtocol
                          ? "bg-success text-white"
                          : "bg-danger-subtle text-danger border border-danger-subtle"
                      }`}
                    >
                      <i className={`bi ${hasTrackedProtocol ? "bi-check-circle-fill" : "bi-x-circle-fill"}`}></i>
                      Revised Protocol (Tracked Changes) - Required
                    </span>
                    {categoryCounts["updated_consent_form"] > 0 && (
                      <span className="badge py-2 px-3 bg-info text-white d-inline-flex align-items-center gap-2">
                        <i className="bi bi-check-circle-fill"></i>
                        Updated Informed Consent Attached
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* MULTI-FILE BATCH DROPZONE */}
              <div className="card border-0 shadow-sm bg-white p-3 mb-3 rounded-3">
                <div className="d-flex justify-content-between align-items-center mb-2 flex-wrap gap-2">
                  <div>
                    <label className="form-label fw-bold text-dark small text-uppercase mb-0">
                      Upload Revised Files &amp; Supplementary Documents <span className="text-danger">*</span>
                    </label>
                    <small className="text-muted d-block">
                      Attach multiple files at once. Categorize each document below using the dropdown.
                    </small>
                  </div>
                  <span className="badge bg-light text-secondary border">
                    {attachedFiles.length} file{attachedFiles.length === 1 ? "" : "s"} staged
                  </span>
                </div>

                {/* Dropzone container */}
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={handleTriggerUpload}
                  className={`p-4 text-center border border-2 border-dashed rounded-3 bg-light ${
                    isDragging ? "border-primary bg-primary-subtle bg-opacity-25" : "border-secondary-subtle"
                  }`}
                  style={{ cursor: "pointer", transition: "all 0.2s ease" }}
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    multiple
                    accept=".pdf,.docx,.doc,.zip"
                    className="d-none"
                    disabled={isSubmitting}
                  />
                  <i className="bi bi-cloud-arrow-up display-5 text-primary mb-2 d-block"></i>
                  <p className="fw-semibold text-dark mb-1">
                    Drag and drop your revised documents here, or click to browse
                  </p>
                  <small className="text-muted d-block">
                    Supported: PDF, Microsoft Word (DOCX/DOC), ZIP archives (Max 15MB per file)
                  </small>
                </div>

                {/* Staged files ledger */}
                {attachedFiles.length > 0 && (
                  <div className="mt-3">
                    <span className="small fw-bold text-dark text-uppercase mb-2 d-block">
                      Staged Documents for Submission:
                    </span>
                    <div className="d-flex flex-column gap-2">
                      {attachedFiles.map((item) => (
                        <div
                          key={item.id}
                          className="d-flex align-items-center justify-content-between p-2 bg-light border rounded-3 flex-wrap gap-2"
                        >
                          <div className="d-flex align-items-center gap-2 text-truncate" style={{ maxWidth: "380px" }}>
                            <i className="bi bi-file-earmark-text fs-5 text-primary"></i>
                            <div className="text-truncate">
                              <span className="d-block text-truncate fw-medium small text-dark" title={item.file.name}>
                                {item.file.name}
                              </span>
                              <small className="text-muted font-monospace">{formatFileSize(item.file.size)}</small>
                            </div>
                          </div>

                          <div className="d-flex align-items-center gap-2">
                            <div className="d-flex align-items-center gap-1">
                              <label htmlFor={`cat-select-${item.id}`} className="visually-hidden">
                                Category for {item.file.name}
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
          <div className="modal-footer bg-white border-top px-4 py-3 d-flex justify-content-between">
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
              className={`btn px-4 fw-semibold shadow-sm d-inline-flex align-items-center gap-2 ${
                isStage6DecisionRevision ? "btn-primary" : "btn-warning text-dark"
              }`}
              style={{ minHeight: "44px" }}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                  <span>Submitting Revisions...</span>
                </>
              ) : (
                <>
                  <i className="bi bi-send-check-fill"></i>
                  <span>
                    {isStage6DecisionRevision
                      ? "Submit Revisions for Committee Verification"
                      : "Submit Revision to Ethics Chair"}
                  </span>
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
