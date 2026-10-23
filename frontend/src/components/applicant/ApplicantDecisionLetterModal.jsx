import React, { useState, useEffect, useMemo } from "react";
import adzuSeal from "../../assets/AdZU Seal.png";
import { formatDate } from "../../utils/formatters";
import { printIsolatedElement } from "../../utils/printHelper";

/**
 * ApplicantDecisionLetterModal.jsx
 * Stage 5 - Phase 4: Applicant Portal Directives View & Offline PDF Download
 * 
 * Provides applicants with an executive summary and the official Ateneo de Zamboanga
 * University Research Ethics Committee Notice (ADZU-REC Form 13: Notice of Committee Action & Directives Matrix).
 * 
 * Features:
 * - Dual view modes: Executive Overview vs. Formal ADZU-REC Form 13 Document
 * - Offline PDF vector print engine (@media print)
 * - Zero Fee Guarantee banner
 * - Direct transition to ReviseProtocolModal when revisions are required
 */
export default function ApplicantDecisionLetterModal({
  show,
  application,
  onClose,
  onProceedToRevise,
  onProceedToAppeal,
}) {
  // Top-level hooks strictly before early returns to preserve Hook Count Invariance
  const [activeTab, setActiveTab] = useState("overview"); // 'overview' | 'form13'
  const [viewFilter, setViewFilter] = useState("actionable"); // 'actionable' | 'all'
  const [isPrinting, setIsPrinting] = useState(false);
  const [consolidationDetails, setConsolidationDetails] = useState(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);

  // Clearance details extraction from form_data (Hook declared unconditionally before early returns)
  const parsedFormData = useMemo(() => {
    if (!application?.form_data) return {};
    if (typeof application.form_data === "object") return application.form_data;
    try {
      return JSON.parse(application.form_data);
    } catch {
      return {};
    }
  }, [application?.form_data]);

  // Fetch complete criteria matrix if not fully populated in payload
  useEffect(() => {
    if (!show || !application?.application_id) return;

    let isMounted = true;
    const fetchFullDetails = async () => {
      setIsLoadingDetails(true);
      try {
        const res = await fetch(
          `http://localhost/REC-Review-Application-Management/backend/api/get_consolidation_data.php?application_id=${application.application_id}`
        );
        const json = await res.json();
        if (res.ok && json.status === "success" && isMounted) {
          setConsolidationDetails(json.data);
        }
      } catch (err) {
        console.warn("Could not load full consolidation criteria matrix; using preloaded payload.", err);
      } finally {
        if (isMounted) setIsLoadingDetails(false);
      }
    };

    fetchFullDetails();
    return () => {
      isMounted = false;
    };
  }, [show, application?.application_id]);

  // Early return strictly AFTER all top-level React hooks are registered
  if (!show || !application) return null;

  // Metadata Extraction with safe string coercion
  const rawProtocolCode = application.protocol_code || application.protocol_no || application.id || "REC-2026-XXXX";
  const protocolCode = typeof rawProtocolCode === "string" ? rawProtocolCode : String(rawProtocolCode || "REC-2026-XXXX");
  const rawTitle = application.research_title || application.title || "Untitled Research Study";
  const researchTitle = typeof rawTitle === "string" ? rawTitle : String(rawTitle || "Untitled Research Study");
  const reviewType = typeof application.review_type === "string" ? application.review_type : (application.type || "Expedited Review");
  const orNumber = application.or_number || "Verified on File";

  const consolidation = (typeof application.latest_consolidation === "object" && application.latest_consolidation !== null)
    ? application.latest_consolidation
    : (consolidationDetails?.consolidation_meta || {});

  const recommendation = typeof consolidation.consolidated_recommendation === "string"
    ? consolidation.consolidated_recommendation
    : "Minor Revisions";

  const meetingDate = consolidation.meeting_date ? formatDate(consolidation.meeting_date) : formatDate(new Date().toISOString());
  const chairName = typeof consolidation.chair_name === "string"
    ? consolidation.chair_name
    : (typeof consolidationDetails?.consolidation_meta?.chair_name === "string"
        ? consolidationDetails.consolidation_meta.chair_name
        : "Ethics Committee Chair");

  const cycleNumber = Number(consolidation.cycle_number || consolidationDetails?.consolidation_meta?.cycle_number) || 1;

  const rawDirectives = consolidation.directives_for_revisions;
  const directivesForRevisions = typeof rawDirectives === "string"
    ? rawDirectives
    : (Array.isArray(rawDirectives)
        ? rawDirectives.map((d) => (typeof d === "string" ? d : (d?.directive || d?.issue || JSON.stringify(d)))).join("\n")
        : (rawDirectives ? JSON.stringify(rawDirectives) : ""));

  const rawSummaryNotes = consolidation.summary_notes;
  const summaryNotes = typeof rawSummaryNotes === "string"
    ? rawSummaryNotes
    : (rawSummaryNotes ? JSON.stringify(rawSummaryNotes) : "");

  // Criteria matrix fallback extraction
  const form11Criteria = Array.isArray(consolidationDetails?.criteria_matrix?.form11) ? consolidationDetails.criteria_matrix.form11 : [];
  const form12Criteria = Array.isArray(consolidationDetails?.criteria_matrix?.form12) ? consolidationDetails.criteria_matrix.form12 : [];

  // Parse per_question_findings safely whether object or JSON string
  const rawFindings = consolidation.per_question_findings;
  const perQuestionFindings = (typeof rawFindings === "object" && rawFindings !== null && !Array.isArray(rawFindings))
    ? rawFindings
    : (typeof rawFindings === "string"
        ? (() => { try { const p = JSON.parse(rawFindings); return (typeof p === "object" && p !== null && !Array.isArray(p)) ? p : {}; } catch { return {}; } })()
        : {});

  const getItemState = (item) => {
    if (!item) return { finding: "Satisfactory", remarks: "", isActionRequired: false };
    const live = perQuestionFindings[item.question_id];
    const finding = (typeof live?.finding === "string" && live.finding) ||
                    (typeof item.chair_state?.finding === "string" && item.chair_state.finding) ||
                    (typeof item.smart_default_finding === "string" && item.smart_default_finding) ||
                    "Satisfactory";
    const rawRemarks = (live?.remarks !== undefined)
      ? live.remarks
      : (item.chair_state?.remarks !== undefined ? item.chair_state.remarks : (item.smart_default_remarks || ""));
    const remarks = typeof rawRemarks === "string" ? rawRemarks : (rawRemarks ? JSON.stringify(rawRemarks) : "");
    const isActionRequired = (finding === "Requires Modification" || finding === "Unable to Assess");
    return { finding, remarks, isActionRequired };
  };

  const filterItems = (list) => {
    if (viewFilter === "all") return list;
    return list.filter((item) => getItemState(item).isActionRequired);
  };

  const displayForm11 = filterItems(form11Criteria);
  const displayForm12 = filterItems(form12Criteria);
  const totalActionItems = [...form11Criteria, ...form12Criteria].filter((i) => getItemState(i).isActionRequired).length;

  const statusStr = (typeof application?.status === "string" ? application.status : "").trim().toLowerCase();
  const isClearanceGranted = statusStr === "clearance granted";
  const isRevisionsSubmitted = statusStr === "revisions submitted";
  const isApproved = recommendation === "Approved" || isClearanceGranted;
  const recStr = typeof recommendation === "string" ? recommendation : String(recommendation || "");
  const isMinorRevisions = !isClearanceGranted && recStr.includes("Minor");
  const isMajorRevisions = !isClearanceGranted && recStr.includes("Major");
  const isRevisionsRequired = !isClearanceGranted && !isRevisionsSubmitted && (isMinorRevisions || isMajorRevisions);
  const isDisapproved = !isClearanceGranted && recStr === "Disapproved";
  const isAppealed = Boolean(
    application?.is_appealed === true ||
    application?.is_appealed === 1 ||
    application?.is_appealed === "true" ||
    application?.is_appealed === "1" ||
    application?.current_cycle > 1
  );

  const clearanceDetails = (typeof parsedFormData.clearance_details === "object" && parsedFormData.clearance_details !== null)
    ? parsedFormData.clearance_details
    : ((typeof application?.clearance_details === "object" && application?.clearance_details !== null) ? application.clearance_details : {});

  const certificateNumber = clearanceDetails.certificate_number || application?.certificate_number || `AdZU-REC-${protocolCode.replace(/^REC-?/i, "")}`;
  const validityStart = clearanceDetails.validity_start ? formatDate(clearanceDetails.validity_start) : meetingDate;
  const validityEnd = clearanceDetails.validity_end ? formatDate(clearanceDetails.validity_end) : "1 Year Post-Approval";
  const validityPeriodYears = Number(clearanceDetails.validity_period_years) || 1;
  const clearanceNotes = typeof clearanceDetails.general_verification_notes === "string" ? clearanceDetails.general_verification_notes : "";

  // Offline Print Trigger via Isolated Canvas Engine
  const handleTriggerPrint = () => {
    if (activeTab !== "form13") {
      setActiveTab("form13");
    }
    setIsPrinting(true);
    setTimeout(async () => {
      try {
        await printIsolatedElement("printable-form13-notice", `ADZU-REC Form 13 - ${protocolCode}`);
      } catch (err) {
        console.error("Error invoking isolated print:", err);
      } finally {
        setIsPrinting(false);
      }
    }, 150);
  };

  // Determination Visual Config
  const getDeterminationConfig = () => {
    if (isApproved) {
      return {
        title: "ETHICAL CLEARANCE GRANTED",
        badgeClass: "bg-success text-white",
        borderClass: "border-success",
        accentColor: "#198754",
        icon: "bi-patch-check-fill",
        leadText: "The AdZU Research Ethics Committee has formally granted ethical clearance for your study protocol.",
        guidelineText: `The protocol satisfies all ethical standards for human participant protection. Ethical clearance is effective for ${validityPeriodYears} calendar year(s) (${validityStart} to ${validityEnd}). An annual progress report or final completion report must be submitted prior to study expiration.`,
      };
    }
    if (isMinorRevisions) {
      return {
        title: "MINOR REVISIONS REQUIRED",
        badgeClass: "bg-warning text-dark",
        borderClass: "border-warning",
        accentColor: "#d39e00",
        icon: "bi-pencil-square",
        leadText: "Minor clarifications or document amendments are requested by the Committee.",
        guidelineText:
          "Please prepare a Point-by-Point Clarification Matrix addressing each directive below, alongside clean and tracked-change copies of your revised protocol. Resubmit within fourteen (14) calendar days.",
      };
    }
    if (isMajorRevisions) {
      return {
        title: "MAJOR REVISIONS REQUIRED",
        badgeClass: "bg-danger text-white",
        borderClass: "border-danger",
        accentColor: "#dc3545",
        icon: "bi-exclamation-triangle-fill",
        leadText: "Substantial ethical, methodological, or participant safety concerns require restructuring.",
        guidelineText:
          "The protocol requires extensive revision before re-deliberation by the full committee. Please address each directive in your point-by-point matrix within thirty (30) calendar days.",
      };
    }
    return {
      title: "DISAPPROVED",
      badgeClass: "bg-dark text-white",
      borderClass: "border-dark",
      accentColor: "#212529",
      icon: "bi-x-circle-fill",
      leadText: "The proposed protocol does not meet required ethical benchmarks under current design.",
      guidelineText:
        "Participant recruitment and data collection are strictly prohibited under Ateneo de Zamboanga University auspices.",
    };
  };

  const decisionConfig = getDeterminationConfig();

  return (
    <>
      {/* High-Fidelity Vector Print Stylesheet */}
      <style>
        {`
        @media screen {
          .decision-modal-backdrop {
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background: rgba(15, 23, 42, 0.7);
            backdrop-filter: blur(4px);
            z-index: 1060;
            display: flex;
            flex-direction: column;
          }
          .decision-form13-sheet {
            max-width: 860px;
            width: 100%;
            margin: 0 auto;
            background: #ffffff;
            box-shadow: 0 4px 20px rgba(0,0,0,0.12);
            border-radius: 4px;
          }
        }

        @media print {
          @page {
            size: letter portrait;
            margin: 12mm 15mm 15mm 15mm;
          }
          body * {
            visibility: hidden !important;
          }
          .decision-modal-backdrop,
          .decision-form13-sheet,
          #printable-form13-notice,
          #printable-form13-notice * {
            visibility: visible !important;
          }
          .no-print {
            display: none !important;
          }
          .decision-modal-backdrop {
            position: static !important;
            width: 100% !important;
            height: auto !important;
            background: transparent !important;
            backdrop-filter: none !important;
            overflow: visible !important;
          }
          .decision-form13-sheet {
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
            border: none !important;
          }
          .page-break-avoid {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }
          table {
            page-break-inside: auto !important;
          }
          tr {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }
          thead {
            display: table-header-group !important;
          }
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
        `}
      </style>

      <div
        className="modal d-block show decision-modal-backdrop"
        tabIndex="-1"
        role="dialog"
        aria-modal="true"
        aria-labelledby="applicantDecisionModalTitle"
      >
        <div className="modal-dialog modal-dialog-centered modal-xl modal-dialog-scrollable">
          <div className="modal-content border-0 shadow-lg">
            
            {/* ================================================================ */}
            {/* 1. MODAL HEADER WITH PROTOCOL BADGES & VIEW TOGGLE              */}
            {/* ================================================================ */}
            <div className="modal-header bg-dark text-white py-3 px-4 border-bottom border-secondary no-print d-flex justify-content-between align-items-center flex-wrap gap-2">
              <div className="d-flex align-items-center gap-3">
                <img
                  src={adzuSeal}
                  alt="AdZU Seal"
                  width="40"
                  height="40"
                  className="img-fluid flex-shrink-0"
                />
                <div>
                  <div className="d-flex align-items-center gap-2 flex-wrap">
                    <h5 className="modal-title fw-bold text-white mb-0" id="applicantDecisionModalTitle">
                      {isApproved ? "Formal Ethical Clearance Notice" : "Committee Decision Notice"}
                    </h5>
                    <span className="badge bg-secondary font-monospace px-2 py-1">
                      {protocolCode}
                    </span>
                    <span className={`badge ${decisionConfig.badgeClass}`}>
                      {isApproved ? "CERTIFIED CLEARANCE" : recommendation}
                    </span>
                  </div>
                  <small className="text-secondary fw-medium">
                    Ateneo de Zamboanga University • Research Ethics Committee (AdZU-REC)
                  </small>
                </div>
              </div>

              {/* View Switcher Tabs */}
              <div className="d-flex align-items-center gap-2">
                <div className="btn-group btn-group-sm" role="group">
                  <button
                    type="button"
                    onClick={() => setActiveTab("overview")}
                    className={`btn ${activeTab === "overview" ? "btn-primary fw-bold" : "btn-outline-light"}`}
                  >
                    <i className="bi bi-card-checklist me-1"></i>Directives Overview
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab("form13")}
                    className={`btn ${activeTab === "form13" ? "btn-primary fw-bold" : "btn-outline-light"}`}
                  >
                    <i className="bi bi-file-earmark-text me-1"></i>Official Form 13
                  </button>
                </div>

                <button
                  type="button"
                  className="btn-close btn-close-white ms-2"
                  onClick={onClose}
                  aria-label="Close"
                ></button>
              </div>
            </div>

            {/* ================================================================ */}
            {/* 2. MODAL BODY (SCROLLABLE)                                       */}
            {/* ================================================================ */}
            <div className="modal-body p-4 bg-light">
              
              {/* TAB 1: EXECUTIVE DIRECTIVES OVERVIEW */}
              {activeTab === "overview" && (
                <div className="d-flex flex-column gap-3">
                  
                  {/* Research Title Card */}
                  <div className="card border-0 shadow-sm p-3 bg-white rounded-3">
                    <span className="text-muted small text-uppercase fw-bold">Research Title</span>
                    <h6 className="fw-bold text-dark mb-1 fs-6">{researchTitle}</h6>
                    <div className="small text-secondary">
                      Review Type: <strong className="text-dark">{reviewType}</strong> • Meeting Date: <strong className="text-dark">{meetingDate}</strong>
                    </div>
                  </div>

                  {/* Official Determination Banner */}
                  <div className={`card border-0 border-start border-4 ${decisionConfig.borderClass} shadow-sm p-4 bg-white rounded-3`}>
                    <div className="d-flex align-items-start gap-3">
                      <i className={`bi ${decisionConfig.icon} fs-2`} style={{ color: decisionConfig.accentColor }}></i>
                      <div className="flex-grow-1">
                        <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-1">
                          <h5 className="fw-bold mb-0" style={{ color: decisionConfig.accentColor }}>
                            {decisionConfig.title}
                          </h5>
                          <span className="badge bg-light text-secondary border font-monospace">
                            Cycle {cycleNumber}
                          </span>
                        </div>
                        <p className="fw-medium text-dark mb-1">{decisionConfig.leadText}</p>
                        <p className="small text-secondary mb-0">{decisionConfig.guidelineText}</p>
                      </div>
                    </div>
                  </div>

                  {/* Ethical Approval Celebration Card */}
                  {isApproved && (
                    <div className="card border-0 border-start border-4 border-success shadow-sm p-4 bg-white rounded-3">
                      <div className="d-flex align-items-start gap-3">
                        <div className="bg-success bg-opacity-10 text-success p-3 rounded-circle d-flex align-items-center justify-content-center">
                          <i className="bi bi-award-fill fs-2"></i>
                        </div>
                        <div className="flex-grow-1">
                          <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-2">
                            <h5 className="fw-bold text-success mb-0">Certificate of Ethical Clearance</h5>
                            <span className="badge bg-success-subtle text-success border border-success-subtle font-monospace px-2 py-1">
                              CERT NO: {certificateNumber}
                            </span>
                          </div>
                          <p className="small text-secondary mb-3">
                            Congratulations! Your research protocol has successfully passed comprehensive ethical evaluation and committee verification. 
                            The signed institutional Certificate of Ethical Clearance is officially registered with the University REC Secretariat.
                          </p>

                          {/* Certificate Details Credential Grid */}
                          <div className="row g-2 mb-3">
                            <div className="col-12 col-md-4">
                              <div className="p-2 border rounded bg-light">
                                <span className="d-block text-muted small" style={{ fontSize: "0.75rem" }}>Clearance Number</span>
                                <strong className="font-monospace text-dark small">{certificateNumber}</strong>
                              </div>
                            </div>
                            <div className="col-12 col-md-4">
                              <div className="p-2 border rounded bg-light">
                                <span className="d-block text-muted small" style={{ fontSize: "0.75rem" }}>Active Term</span>
                                <strong className="text-dark small">{validityStart} — {validityEnd}</strong>
                              </div>
                            </div>
                            <div className="col-12 col-md-4">
                              <div className="p-2 border rounded bg-light">
                                <span className="d-block text-muted small" style={{ fontSize: "0.75rem" }}>Sign-Off Authority</span>
                                <strong className="text-dark small">{clearanceDetails.chair_name || chairName}</strong>
                              </div>
                            </div>
                          </div>

                          {clearanceNotes && (
                            <div className="p-2 border rounded bg-success-subtle bg-opacity-25 mb-3">
                              <span className="d-block text-success-emphasis fw-semibold small" style={{ fontSize: "0.75rem" }}>
                                Verification & Clearance Endorsement Notes:
                              </span>
                              <span className="small text-dark fst-italic">{clearanceNotes}</span>
                            </div>
                          )}

                          <div className="border-top pt-2">
                            <h6 className="fw-bold text-dark small mb-1">Post-Clearance Obligations:</h6>
                            <ul className="small text-secondary mb-0 ps-3">
                              <li>Clearance Validity: <strong>{validityPeriodYears} Calendar Year(s)</strong> (Valid through {validityEnd}).</li>
                              <li>Continuing Review: Submit an annual progress report 30 days prior to protocol expiry.</li>
                              <li>Mandatory Amendments: Any prospective protocol alterations must receive prior REC approval.</li>
                              <li>Adverse Event Reporting: Serious adverse events must be reported within 48 hours.</li>
                            </ul>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Revision Submitted & Pending Verification Banner */}
                  {isRevisionsSubmitted && (
                    <div className="alert alert-info border-info-subtle shadow-sm p-3 rounded-3 mb-0">
                      <div className="d-flex align-items-start gap-2">
                        <i className="bi bi-hourglass-split text-info fs-4 flex-shrink-0"></i>
                        <div>
                          <h6 className="fw-bold text-info-emphasis mb-1">Revisions Under Verification</h6>
                          <p className="small text-secondary mb-0">
                            Your point-by-point clarification matrix and revised protocol documents have been successfully submitted 
                            and are currently being verified by the Ethics Committee Chair and Secretariat. You will be notified once 
                            formal ethical clearance is signed off or if any further clarification is needed.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Zero Payment Fee Reassurance Invariant */}
                  <div className="card bg-success-subtle bg-opacity-25 border border-success-subtle shadow-xs p-3 rounded-3">
                    <div className="d-flex align-items-start gap-2">
                      <i className="bi bi-shield-check text-success fs-5 mt-1"></i>
                      <div>
                        <h6 className="fw-bold text-success-emphasis mb-1 small text-uppercase">
                          Fee Invariant Retained (₱0 Fee)
                        </h6>
                        <p className="mb-0 small text-secondary">
                          Your Official Receipt (<strong>OR No. {orNumber}</strong>) is verified and permanently credited. 
                          <strong>Zero additional fee or receipt resubmission is required</strong> for revised protocol submissions or clearance issuance.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Formal Appeal & Reconsideration (Approach A) Banner */}
                  {isDisapproved && !isAppealed && (
                    <div className="card bg-danger-subtle bg-opacity-25 border border-danger-subtle shadow-sm p-3 rounded-3">
                      <div className="d-flex align-items-start gap-3">
                        <i className="bi bi-shield-exclamation text-danger fs-3 mt-1 flex-shrink-0"></i>
                        <div className="flex-grow-1">
                          <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-1">
                            <h6 className="fw-bold text-danger mb-0 text-uppercase">
                              Formal Reconsideration &amp; Appeal Available (Cycle 2)
                            </h6>
                            <span className="badge bg-danger text-white">Approach A Active</span>
                          </div>
                          <p className="small text-secondary mb-2">
                            Under AdZU-REC Standard Operating Procedures, you are entitled to file a <strong>Formal Appeal &amp; Request for Reconsideration</strong> under this same protocol without initiating a duplicate application. Submitting corrective safeguards and specialist endorsements will advance this protocol to <strong>Cycle 2 Review under Heightened Board Scrutiny</strong>.
                          </p>
                          {onProceedToAppeal && (
                            <button
                              type="button"
                              className="btn btn-sm btn-danger fw-semibold d-inline-flex align-items-center gap-2 px-3 py-1 rounded-pill shadow-xs"
                              onClick={() => {
                                onClose();
                                onProceedToAppeal(application);
                              }}
                            >
                              <i className="bi bi-arrow-repeat"></i>
                              <span>File Formal Appeal &amp; Reconsideration</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {isDisapproved && isAppealed && (
                    <div className="alert alert-info border-info-subtle shadow-sm p-3 rounded-3 mb-0">
                      <div className="d-flex align-items-start gap-2">
                        <i className="bi bi-shield-shaded text-primary fs-4 flex-shrink-0"></i>
                        <div>
                          <h6 className="fw-bold text-primary mb-1">Formal Appeal Submitted (Cycle 2 Re-Deliberation)</h6>
                          <p className="small text-secondary mb-0">
                            Your formal appeal and corrective protocol documentation have been received and logged under <strong>Doc Ref: {protocolCode}-APL2</strong>. The protocol is scheduled for comprehensive re-evaluation under <strong>Heightened Board Scrutiny</strong>. You will be notified once the full committee convenes.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Ethics Committee Directives for Applicant */}
                  {directivesForRevisions && (
                    <div className="card border-0 shadow-sm p-3 bg-white rounded-3">
                      <div className="d-flex align-items-center justify-content-between mb-2">
                        <span className="fw-bold text-dark d-inline-flex align-items-center gap-2 small text-uppercase">
                          <i className="bi bi-chat-left-quote-fill text-primary"></i> General Directives from Ethics Chair
                        </span>
                        <span className="badge bg-light text-secondary border font-monospace">
                          {chairName}
                        </span>
                      </div>
                      <div className="p-3 bg-light rounded border border-light-subtle">
                        <p className="mb-0 text-dark fw-medium" style={{ whiteSpace: "pre-line", lineHeight: "1.5" }}>
                          {directivesForRevisions}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Summary Notes if any */}
                  {summaryNotes && (
                    <div className="card border-0 shadow-sm p-3 bg-white rounded-3">
                      <span className="fw-bold text-secondary small text-uppercase mb-1">
                        Deliberation Minutes & Synthesis Notes:
                      </span>
                      <p className="small text-muted mb-0 fst-italic">"{summaryNotes}"</p>
                    </div>
                  )}

                  {/* Directives Checklist Matrix Summary */}
                  {isRevisionsRequired && (
                    <div className="card border-0 shadow-sm p-3 bg-white rounded-3">
                      <div className="d-flex align-items-center justify-content-between mb-3 flex-wrap gap-2">
                        <div>
                          <h6 className="fw-bold text-dark text-uppercase small mb-0">
                            Actionable Directives Matrix Checklist
                          </h6>
                          <small className="text-muted">
                            Items requiring explicit responses in your Point-by-Point Matrix
                          </small>
                        </div>
                        <div className="d-flex align-items-center gap-2">
                          <span className="badge bg-warning-subtle text-warning-emphasis border border-warning-subtle px-2 py-1">
                            {totalActionItems > 0 ? `${totalActionItems} Directives Flagged` : "General Directives Only"}
                          </span>
                          <button
                            type="button"
                            onClick={() => setActiveTab("form13")}
                            className="btn btn-sm btn-outline-primary fw-medium"
                          >
                            <i className="bi bi-eye me-1"></i>View Full Form 13
                          </button>
                        </div>
                      </div>

                      {/* Instructions steps */}
                      <div className="border rounded p-3 bg-light">
                        <h6 className="fw-semibold text-primary small text-uppercase mb-2">
                          Mandatory Resubmission Steps:
                        </h6>
                        <ol className="mb-0 small text-secondary ps-3 d-flex flex-column gap-1">
                          <li>
                            Download or print the <strong>ADZU-REC Form 13</strong> notice for complete itemization.
                          </li>
                          <li>
                            Draft a <strong>Point-by-Point Clarification Matrix</strong> addressing each directive above.
                          </li>
                          <li>
                            Provide revised study documents in both <strong>Clean Copy</strong> and <strong>Tracked Changes</strong>.
                          </li>
                          <li>
                            Click <strong>"Proceed to Revise Protocol"</strong> below to open the submission dropzone.
                          </li>
                        </ol>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: OFFICIAL ADZU-REC FORM 13 DOCUMENT (SCREEN & PRINT) */}
              {activeTab === "form13" && (
                <div className="decision-form13-sheet p-4 p-md-5 bg-white rounded shadow-sm" id="printable-form13-notice">
                  
                  {/* Institutional Letterhead */}
                  <div className="d-flex align-items-center justify-content-between border-bottom pb-3 mb-4 page-break-avoid">
                    <div className="d-flex align-items-center gap-3">
                      <img
                        src={adzuSeal}
                        alt="Ateneo de Zamboanga University Seal"
                        style={{ width: "76px", height: "76px", objectFit: "contain" }}
                      />
                      <div>
                        <h6 className="fw-bold mb-0 text-uppercase" style={{ letterSpacing: "0.05em", color: "#060297", fontSize: "0.95rem" }}>
                          Ateneo de Zamboanga University
                        </h6>
                        <h5 className="fw-bolder mb-0 text-dark" style={{ letterSpacing: "0.02em", fontSize: "1.05rem" }}>
                          RESEARCH ETHICS COMMITTEE (AdZU-REC)
                        </h5>
                        <p className="text-secondary mb-0 small" style={{ fontSize: "0.78rem" }}>
                          PHREB Level II Accredited Research Ethics Committee<br />
                          Fr. Eusebio Salvador SJ Campus, La Purisima St., Zamboanga City 7000, Philippines<br />
                          Email: <span className="font-monospace text-dark">rec@adzu.edu.ph</span>
                        </p>
                      </div>
                    </div>

                    <div className="text-end border p-2 rounded bg-light" style={{ minWidth: "150px" }}>
                      <div className="fw-bold font-monospace text-primary small">ADZU-REC Form 13</div>
                      <div className="text-uppercase fw-semibold text-secondary" style={{ fontSize: "0.68rem" }}>
                        {isApproved ? "Clearance Notice" : "Decision Notice"}
                      </div>
                      {isApproved && (
                        <div className="small font-monospace text-success fw-bold" style={{ fontSize: "0.72rem" }}>
                          {certificateNumber}
                        </div>
                      )}
                      <div className="small font-monospace text-dark fw-bold">Cycle {cycleNumber}</div>
                      <div className="text-muted" style={{ fontSize: "0.68rem" }}>{meetingDate}</div>
                    </div>
                  </div>

                  {/* Document Title Banner */}
                  <div className="text-center mb-4 page-break-avoid">
                    <h5 className="fw-bold text-uppercase mb-1" style={{ letterSpacing: "0.04em", color: "#060297" }}>
                      {isApproved ? "Official Certificate of Ethical Clearance & Approval Notice" : "Formal Notice of Committee Action & Actionable Directives"}
                    </h5>
                    <p className="text-muted small mb-0">
                      {isApproved ? "Institutional Research Ethics Review Certification" : "Synthesis of Protocol & Informed Consent Ethical Evaluation"}
                    </p>
                  </div>

                  {/* Protocol Profile Table */}
                  <div className="border rounded mb-4 overflow-hidden page-break-avoid">
                    <div className="bg-light px-3 py-2 border-bottom fw-bold text-uppercase small text-dark d-flex justify-content-between align-items-center">
                      <span><i className="bi bi-folder2-open me-2 text-primary"></i>Protocol Profile</span>
                      <span className="badge bg-secondary font-monospace">{reviewType}</span>
                    </div>
                    <table className="table table-sm table-bordered mb-0 small" style={{ fontSize: "0.82rem" }}>
                      <tbody>
                        <tr>
                          <td className="bg-light fw-bold text-secondary" style={{ width: "22%" }}>Protocol Code:</td>
                          <td className="fw-bold font-monospace text-dark" style={{ width: "28%" }}>{protocolCode}</td>
                          <td className="bg-light fw-bold text-secondary" style={{ width: "22%" }}>Deliberation Date:</td>
                          <td className="fw-semibold text-dark" style={{ width: "28%" }}>{meetingDate}</td>
                        </tr>
                        <tr>
                          <td className="bg-light fw-bold text-secondary">Study Title:</td>
                          <td colSpan="3" className="fw-bold text-dark">{researchTitle}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Official Determination Callout */}
                  <div className={`border-start border-4 ${decisionConfig.borderClass} bg-light p-3 rounded mb-4 page-break-avoid`}>
                    <div className="d-flex align-items-center justify-content-between mb-2 flex-wrap gap-2">
                      <div className="d-flex align-items-center gap-2">
                        <i className={`bi ${decisionConfig.icon} fs-4`} style={{ color: decisionConfig.accentColor }}></i>
                        <div>
                          <span className="text-muted text-uppercase small fw-bold d-block" style={{ fontSize: "0.68rem" }}>
                            Official Committee Action:
                          </span>
                          <h6 className="mb-0 fw-bold" style={{ color: decisionConfig.accentColor }}>
                            {decisionConfig.title}
                          </h6>
                        </div>
                      </div>
                      <span className={`badge ${decisionConfig.badgeClass} px-3 py-2 font-monospace fs-6`}>
                        {recommendation}
                      </span>
                    </div>
                    <p className="small text-secondary mb-0" style={{ lineHeight: "1.45", fontSize: "0.8125rem" }}>
                      {decisionConfig.guidelineText}
                    </p>
                  </div>

                  {/* General Directives */}
                  {directivesForRevisions && (
                    <div className="mb-4 page-break-avoid">
                      <h6 className="fw-bold text-dark text-uppercase small mb-2">
                        Committee Directives for Applicant:
                      </h6>
                      <div className="p-3 bg-light border rounded small" style={{ fontSize: "0.825rem", whiteSpace: "pre-line", lineHeight: "1.5" }}>
                        {directivesForRevisions}
                      </div>
                    </div>
                  )}

                  {/* Filter Toolbar for Form 13 Screen View */}
                  <div className="d-flex justify-content-between align-items-center mb-2 no-print">
                    <span className="fw-bold small text-uppercase text-secondary">
                      Evaluation Criteria Matrix ({viewFilter === "actionable" ? "Flagged Actionable Only" : "All Items"}):
                    </span>
                    <div className="btn-group btn-group-sm">
                      <button
                        type="button"
                        onClick={() => setViewFilter("actionable")}
                        className={`btn btn-xs ${viewFilter === "actionable" ? "btn-primary" : "btn-outline-secondary"}`}
                      >
                        Actionable Only ({totalActionItems})
                      </button>
                      <button
                        type="button"
                        onClick={() => setViewFilter("all")}
                        className={`btn btn-xs ${viewFilter === "all" ? "btn-primary" : "btn-outline-secondary"}`}
                      >
                        All Criteria ({form11Criteria.length + form12Criteria.length})
                      </button>
                    </div>
                  </div>

                  {/* Part I: Form 11 Criteria Table */}
                  <div className="mb-4">
                    <div className="bg-primary-subtle text-primary border border-primary-subtle px-3 py-1 fw-bold small text-uppercase mb-2 rounded page-break-avoid d-flex justify-content-between">
                      <span>Part I: Protocol Ethical Evaluation (ADZU-REC Form 11)</span>
                      <span>{displayForm11.length} Items Listed</span>
                    </div>

                    {displayForm11.length === 0 ? (
                      <div className="alert alert-success py-2 px-3 small border-success-subtle mb-3">
                        <i className="bi bi-check-all me-1"></i>
                        All protocol evaluation criteria (Form 11) satisfied without mandatory modifications.
                      </div>
                    ) : (
                      <table className="table table-bordered table-sm align-middle mb-3 small" style={{ fontSize: "0.8rem" }}>
                        <thead className="table-light">
                          <tr>
                            <th style={{ width: "32%" }}>Criterion & Ethical Requirement</th>
                            <th style={{ width: "18%" }} className="text-center">Committee Assessment</th>
                            <th style={{ width: "35%" }}>Specific Directive / Required Action</th>
                            <th style={{ width: "15%" }} className="text-center">Proponent Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {displayForm11.map((item) => {
                            const state = getItemState(item);
                            const isMod = state.finding === "Requires Modification";

                            return (
                              <tr key={item.question_id} className={isMod ? "table-warning-subtle" : ""}>
                                <td className="align-top">
                                  <strong className="text-dark d-block">{item.label}</strong>
                                  <span className="text-muted font-monospace" style={{ fontSize: "0.68rem" }}>
                                    {item.section_title} • #{item.criterion_key}
                                  </span>
                                </td>
                                <td className="align-top text-center">
                                  <span className={`badge ${
                                    state.finding === "Satisfactory" ? "bg-success-subtle text-success border border-success" :
                                    state.finding === "Requires Modification" ? "bg-warning-subtle text-dark border border-warning" :
                                    state.finding === "Unable to Assess" ? "bg-danger-subtle text-danger border border-danger" :
                                    "bg-light text-secondary border"
                                  }`} style={{ fontSize: "0.72rem" }}>
                                    {state.finding}
                                  </span>
                                </td>
                                <td className="align-top">
                                  <div className="text-dark fw-medium" style={{ whiteSpace: "pre-line" }}>
                                    {state.remarks || <span className="text-muted fst-italic">No specific directives recorded.</span>}
                                  </div>
                                </td>
                                <td className="align-top text-center bg-light">
                                  <div className="font-monospace text-muted" style={{ fontSize: "0.75rem" }}>
                                    [ &nbsp; ] Done
                                  </div>
                                  <div className="text-muted mt-1" style={{ fontSize: "0.65rem" }}>
                                    Pg/Sec: ______
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    )}
                  </div>

                  {/* Part II: Form 12 Criteria Table */}
                  <div className="mb-4">
                    <div className="bg-primary-subtle text-primary border border-primary-subtle px-3 py-1 fw-bold small text-uppercase mb-2 rounded page-break-avoid d-flex justify-content-between">
                      <span>Part II: Informed Consent Process & Documentation (ADZU-REC Form 12)</span>
                      <span>{displayForm12.length} Items Listed</span>
                    </div>

                    {displayForm12.length === 0 ? (
                      <div className="alert alert-success py-2 px-3 small border-success-subtle mb-3">
                        <i className="bi bi-check-all me-1"></i>
                        All informed consent criteria (Form 12) satisfied without mandatory modifications.
                      </div>
                    ) : (
                      <table className="table table-bordered table-sm align-middle mb-3 small" style={{ fontSize: "0.8rem" }}>
                        <thead className="table-light">
                          <tr>
                            <th style={{ width: "32%" }}>Consent Element & Standard</th>
                            <th style={{ width: "18%" }} className="text-center">Committee Assessment</th>
                            <th style={{ width: "35%" }}>Specific Directive / Required Action</th>
                            <th style={{ width: "15%" }} className="text-center">Proponent Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {displayForm12.map((item) => {
                            const state = getItemState(item);
                            const isMod = state.finding === "Requires Modification";

                            return (
                              <tr key={item.question_id} className={isMod ? "table-warning-subtle" : ""}>
                                <td className="align-top">
                                  <strong className="text-dark d-block">{item.label}</strong>
                                  <span className="text-muted font-monospace" style={{ fontSize: "0.68rem" }}>
                                    {item.section_title} • #{item.criterion_key}
                                  </span>
                                </td>
                                <td className="align-top text-center">
                                  <span className={`badge ${
                                    state.finding === "Satisfactory" ? "bg-success-subtle text-success border border-success" :
                                    state.finding === "Requires Modification" ? "bg-warning-subtle text-dark border border-warning" :
                                    state.finding === "Unable to Assess" ? "bg-danger-subtle text-danger border border-danger" :
                                    "bg-light text-secondary border"
                                  }`} style={{ fontSize: "0.72rem" }}>
                                    {state.finding}
                                  </span>
                                </td>
                                <td className="align-top">
                                  <div className="text-dark fw-medium" style={{ whiteSpace: "pre-line" }}>
                                    {state.remarks || <span className="text-muted fst-italic">No specific directives recorded.</span>}
                                  </div>
                                </td>
                                <td className="align-top text-center bg-light">
                                  <div className="font-monospace text-muted" style={{ fontSize: "0.75rem" }}>
                                    [ &nbsp; ] Done
                                  </div>
                                  <div className="text-muted mt-1" style={{ fontSize: "0.65rem" }}>
                                    Pg/Sec: ______
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    )}
                  </div>

                  {/* Resubmission Instructions Box */}
                  <div className="border rounded p-3 mb-4 bg-light page-break-avoid">
                    <h6 className="fw-bold text-dark text-uppercase small mb-2 d-flex align-items-center gap-1">
                      <i className="bi bi-info-circle-fill text-primary"></i>
                      Mandatory Instructions for Resubmission:
                    </h6>
                    <ol className="mb-0 text-secondary ps-3 small" style={{ fontSize: "0.78rem", lineHeight: "1.5" }}>
                      <li>
                        <strong>Point-by-Point Clarification Matrix:</strong> Tabulate each committee directive above with exact protocol page/section citations.
                      </li>
                      <li>
                        <strong>Clean & Tracked Copies:</strong> Upload both clean and tracked versions of all amended documents.
                      </li>
                      <li>
                        <strong>Zero Research Activity:</strong> Data collection remains strictly prohibited prior to ethical clearance certificate issuance.
                      </li>
                    </ol>
                  </div>

                  {/* Sign-off Block */}
                  <div className="pt-3 border-top page-break-avoid">
                    <div className="row g-4 align-items-end">
                      <div className="col-6">
                        <div className="border p-2 rounded bg-light" style={{ maxWidth: "260px" }}>
                          <div className="small fw-bold text-uppercase text-secondary" style={{ fontSize: "0.65rem" }}>
                            Secretariat Archival Reference
                          </div>
                          <div className="font-monospace text-dark mt-1" style={{ fontSize: "0.75rem" }}>
                            Doc Ref: {protocolCode}-ACT{cycleNumber}
                          </div>
                          <div className="text-muted" style={{ fontSize: "0.68rem" }}>
                            Dispatched: {meetingDate}
                          </div>
                        </div>
                      </div>

                      <div className="col-6 text-end">
                        <div className="d-inline-block text-center" style={{ minWidth: "220px" }}>
                          <div style={{ height: "40px" }}></div>
                          <div className="border-bottom border-dark pb-1 mb-1 fw-bold text-dark text-uppercase" style={{ fontSize: "0.85rem" }}>
                            {chairName}
                          </div>
                          <div className="text-secondary small fw-semibold" style={{ fontSize: "0.75rem" }}>
                            Chair, Research Ethics Committee
                          </div>
                          <div className="text-muted" style={{ fontSize: "0.68rem" }}>
                            Ateneo de Zamboanga University
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                </div>
              )}

            </div>

            {/* ================================================================ */}
            {/* 3. MODAL FOOTER                                                  */}
            {/* ================================================================ */}
            <div className="modal-footer bg-white py-3 px-4 border-top d-flex justify-content-between align-items-center no-print">
              <div>
                <button
                  type="button"
                  onClick={handleTriggerPrint}
                  disabled={isPrinting}
                  className="btn btn-outline-dark btn-sm fw-medium d-inline-flex align-items-center gap-2"
                >
                  {isPrinting ? (
                    <>
                      <span className="spinner-border spinner-border-sm text-danger" role="status" aria-hidden="true"></span>
                      <span>Preparing PDF...</span>
                    </>
                  ) : (
                    <>
                      <i className="bi bi-printer-fill text-danger"></i>
                      <span>Download / Print PDF</span>
                    </>
                  )}
                </button>
              </div>

              <div className="d-flex align-items-center gap-2">
                <button
                  type="button"
                  className="btn btn-secondary btn-sm px-3"
                  onClick={onClose}
                >
                  Close
                </button>

                {isRevisionsRequired && onProceedToRevise && (
                  <button
                    type="button"
                    className="btn btn-warning text-dark btn-sm px-4 fw-semibold shadow-xs d-inline-flex align-items-center gap-2"
                    onClick={() => {
                      onClose();
                      onProceedToRevise(application);
                    }}
                  >
                    <i className="bi bi-pencil-square"></i>
                    <span>Proceed to Revise Protocol</span>
                  </button>
                )}

                {isDisapproved && !isAppealed && onProceedToAppeal && (
                  <button
                    type="button"
                    className="btn btn-danger btn-sm px-4 fw-semibold shadow-xs d-inline-flex align-items-center gap-2"
                    onClick={() => {
                      onClose();
                      onProceedToAppeal(application);
                    }}
                  >
                    <i className="bi bi-arrow-repeat"></i>
                    <span>File Formal Appeal &amp; Reconsideration</span>
                  </button>
                )}
              </div>
            </div>

          </div>
        </div>
      </div>
    </>
  );
}
