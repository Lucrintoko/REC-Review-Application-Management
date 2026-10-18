import React, { useState, useMemo, useEffect } from 'react';
import Swal from 'sweetalert2';
import { formatDate } from '../../utils/formatters';

// Standardized AdZU REC Document Taxonomy & Badging
const DOCUMENT_CATEGORIES = {
    revised_protocol_clean: {
        label: "Revised Protocol (Clean)",
        badgeClass: "bg-success text-white",
        icon: "bi-file-earmark-check-fill"
    },
    revised_protocol_tracked: {
        label: "Revised Protocol (Tracked)",
        badgeClass: "bg-warning text-dark",
        icon: "bi-file-earmark-diff-fill"
    },
    clarification_matrix: {
        label: "Clarification Matrix",
        badgeClass: "bg-primary text-white",
        icon: "bi-table"
    },
    updated_consent_form: {
        label: "Updated Consent Form",
        badgeClass: "bg-info text-dark",
        icon: "bi-person-check-fill"
    },
    technical_review_letter: {
        label: "Tech Review Endorsement",
        badgeClass: "bg-secondary text-white",
        icon: "bi-patch-check-fill"
    },
    supplementary_instrument: {
        label: "Supplementary Tools",
        badgeClass: "bg-secondary text-white",
        icon: "bi-journal-text"
    },
    other_supporting: {
        label: "Supporting Document",
        badgeClass: "bg-light text-dark border",
        icon: "bi-paperclip"
    }
};

/**
 * RevisionsVerificationModal
 * Stage 7 Admin Workspace UI for Ethics Committee Chair & Secretariat
 * Dual-pane verification workbench for Stage 6 revised protocols.
 */
export default function RevisionsVerificationModal({ protocol, onClose, onRefresh }) {
    const adminId = localStorage.getItem('adminId') || 1;
    const adminName = localStorage.getItem('adminName') || "Ethics Committee Chair";

    // 1. Safe parsing of form_data and extraction of revision submissions
    const parsedFormData = useMemo(() => {
        if (!protocol?.form_data) return {};
        if (typeof protocol.form_data === 'string') {
            try {
                return JSON.parse(protocol.form_data);
            } catch (err) {
                console.error("Failed to parse protocol form_data JSON:", err);
                return {};
            }
        }
        return protocol.form_data;
    }, [protocol?.form_data]);

    const revisionSubmissions = useMemo(() => {
        const subs = parsedFormData?.revision_submissions;
        return Array.isArray(subs) ? subs : [];
    }, [parsedFormData]);

    // Active attempt selector (defaults to latest submission)
    const [selectedAttemptIndex, setSelectedAttemptIndex] = useState(
        revisionSubmissions.length > 0 ? revisionSubmissions.length - 1 : 0
    );

    useEffect(() => {
        if (revisionSubmissions.length > 0) {
            setSelectedAttemptIndex(revisionSubmissions.length - 1);
        }
    }, [revisionSubmissions.length]);

    const activeSubmission = revisionSubmissions[selectedAttemptIndex] || null;
    const attemptNo = activeSubmission?.attempt_no || (selectedAttemptIndex + 1);
    const complianceMatrix = activeSubmission?.compliance_matrix || [];
    const submittedFiles = activeSubmission?.files || [];
    const coverNotes = activeSubmission?.cover_notes || parsedFormData?.revision_notes || "No executive summary notes provided.";

    // 2. Verification Form State
    const [checklistState, setChecklistState] = useState({});
    const [generalNotes, setGeneralNotes] = useState('');
    const [validityYears, setValidityYears] = useState(1);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formError, setFormError] = useState(null);

    // Initialize/Reset Verification Checklist whenever active submission changes
    useEffect(() => {
        const initialChecklist = {};
        if (Array.isArray(complianceMatrix) && complianceMatrix.length > 0) {
            complianceMatrix.forEach((item, idx) => {
                const qId = item.question_id || item.criterion_key || `directive_${idx}`;
                initialChecklist[qId] = {
                    status: 'Satisfied', // Smart-default to 'Satisfied'
                    evaluator_remarks: ''
                };
            });
        }
        setChecklistState(initialChecklist);
        setFormError(null);
    }, [selectedAttemptIndex, activeSubmission, complianceMatrix]);

    // SweetAlert2 Modal Layering Helper (zIndex guarantee)
    const fireSwal = (options) => {
        return Swal.fire({
            ...options,
            didOpen: (popup) => {
                const container = Swal.getContainer();
                if (container) container.style.zIndex = '9999';
                if (options.didOpen) options.didOpen(popup);
            }
        });
    };

    // Calculate Dynamic Certificate Validity Dates
    const validityDates = useMemo(() => {
        const start = new Date();
        const end = new Date(start);
        end.setFullYear(end.getFullYear() + validityYears);
        end.setDate(end.getDate() - 1);

        const options = { year: 'numeric', month: 'short', day: 'numeric' };
        return {
            startFormatted: start.toLocaleDateString('en-US', options),
            endFormatted: end.toLocaleDateString('en-US', options)
        };
    }, [validityYears]);

    // Metrics for Checklist Verification
    const totalItems = complianceMatrix.length;
    const satisfiedCount = useMemo(() => {
        return Object.values(checklistState).filter(item => item.status === 'Satisfied').length;
    }, [checklistState]);

    const deficientCount = useMemo(() => {
        return Object.values(checklistState).filter(item => item.status === 'Deficient').length;
    }, [checklistState]);

    const areAllSatisfied = totalItems > 0 ? (satisfiedCount === totalItems && deficientCount === 0) : true;
    const hasDeficiencies = deficientCount > 0;

    // Toggle Checklist Item Status
    const handleToggleStatus = (qId, status) => {
        setChecklistState(prev => ({
            ...prev,
            [qId]: {
                ...prev[qId],
                status: status
            }
        }));
    };

    // Update Evaluator Remarks per item
    const handleRemarksChange = (qId, remarks) => {
        setChecklistState(prev => ({
            ...prev,
            [qId]: {
                ...prev[qId],
                evaluator_remarks: remarks
            }
        }));
    };

    // Helper: Resolve Document Download/Preview URL
    const resolveFileUrl = (savedPath) => {
        if (!savedPath) return '#';
        if (savedPath.startsWith('http://') || savedPath.startsWith('https://')) return savedPath;
        const clean = savedPath.replace(/^\/+/, '');
        return `http://localhost/REC-Review-Application-Management/backend/${clean}`;
    };

    // -------------------------------------------------------------------------
    // ACTION HANDLER 1: Grant Ethical Clearance
    // -------------------------------------------------------------------------
    const handleGrantClearance = async () => {
        if (!areAllSatisfied) {
            setFormError("Cannot grant clearance while one or more directives remain marked as Deficient.");
            return;
        }

        const confirmResult = await fireSwal({
            title: 'Grant Official Ethical Clearance?',
            html: `
                <div class="text-start small p-2">
                    <p class="mb-2">You are issuing the official <strong>Certificate of Ethical Clearance</strong> for:</p>
                    <div class="bg-light p-3 rounded-3 border mb-3">
                        <div class="fw-bold text-primary">${protocol?.id || protocol?.protocol_code}</div>
                        <div class="text-truncate">${protocol?.title || protocol?.research_title}</div>
                    </div>
                    <ul class="list-unstyled mb-2 text-secondary">
                        <li class="mb-1"><i class="bi bi-check-circle-fill text-success me-2"></i>All <strong>${totalItems}</strong> directives verified and Satisfied.</li>
                        <li class="mb-1"><i class="bi bi-calendar-check-fill text-primary me-2"></i>Validity: <strong>${validityYears} Year(s)</strong> (${validityDates.startFormatted} – ${validityDates.endFormatted})</li>
                        <li><i class="bi bi-person-badge-fill text-dark me-2"></i>Sign-off Authority: <strong>${adminName}</strong></li>
                    </ul>
                    <p class="text-muted small mb-0 mt-3 border-top pt-2">
                        This action will transition the application to <span class="badge bg-success">Clearance Granted</span>, generate the official clearance certificate record, and dispatch notification to the proponent.
                    </p>
                </div>
            `,
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#198754',
            cancelButtonColor: '#6c757d',
            confirmButtonText: '<i class="bi bi-award-fill me-1"></i> Issue Ethical Clearance',
            cancelButtonText: 'Review Further',
            showLoaderOnConfirm: true,
            preConfirm: async () => {
                const payload = {
                    application_id: protocol.application_id || protocol.id,
                    admin_id: parseInt(adminId, 10),
                    chair_name: adminName,
                    action: 'grant_clearance',
                    verification_checklist: checklistState,
                    general_verification_notes: generalNotes.trim(),
                    validity_period_years: parseInt(validityYears, 10)
                };

                try {
                    const res = await fetch('http://localhost/REC-Review-Application-Management/backend/api/verify_revisions_and_grant_clearance.php', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload)
                    });
                    const json = await res.json();
                    if (!res.ok || json.status !== 'success') {
                        throw new Error(json.message || 'Failed to grant clearance.');
                    }
                    return json;
                } catch (err) {
                    Swal.showValidationMessage(`Operation Failed: ${err.message}`);
                }
            }
        });

        if (confirmResult.isConfirmed) {
            await fireSwal({
                icon: 'success',
                title: 'Ethical Clearance Granted!',
                text: `Protocol ${protocol?.id || protocol?.protocol_code} has been granted official ethical clearance.`,
                confirmButtonColor: '#003366'
            });
            if (onRefresh) onRefresh();
            onClose();
        }
    };

    // -------------------------------------------------------------------------
    // ACTION HANDLER 2: Request Further Clarification (Attempt N+1)
    // -------------------------------------------------------------------------
    const handleRequestClarification = async () => {
        // Validation: Must have deficient items or general notes
        if (!hasDeficiencies && !generalNotes.trim()) {
            setFormError("Please mark at least one directive as Deficient or supply general clarification notes explaining required modifications.");
            return;
        }

        // Validate that all deficient items have evaluator remarks
        for (const [qId, state] of Object.entries(checklistState)) {
            if (state.status === 'Deficient' && !state.evaluator_remarks?.trim()) {
                setFormError("Please provide specific feedback remarks for all directives marked as Deficient.");
                return;
            }
        }

        const confirmResult = await fireSwal({
            title: 'Request Further Clarifications?',
            html: `
                <div class="text-start small p-2">
                    <p class="mb-2">You are returning protocol <strong>${protocol?.id || protocol?.protocol_code}</strong> to the applicant for additional revisions.</p>
                    <div class="alert alert-warning border-warning d-flex align-items-center gap-2 mb-3">
                        <i class="bi bi-exclamation-triangle-fill fs-5 text-warning flex-shrink-0"></i>
                        <div>
                            Application status will return to <strong>Decision Letter Issued</strong> for <strong>Attempt #${attemptNo + 1}</strong>.
                        </div>
                    </div>
                    <ul class="text-secondary mb-0">
                        <li><strong>Deficient Directives:</strong> ${deficientCount}</li>
                        <li><strong>Next Iteration:</strong> Proponent Revisions (Attempt #${attemptNo + 1})</li>
                    </ul>
                </div>
            `,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#dc3545',
            cancelButtonColor: '#6c757d',
            confirmButtonText: '<i class="bi bi-arrow-counterclockwise me-1"></i> Send Back to Proponent',
            cancelButtonText: 'Cancel',
            showLoaderOnConfirm: true,
            preConfirm: async () => {
                const payload = {
                    application_id: protocol.application_id || protocol.id,
                    admin_id: parseInt(adminId, 10),
                    chair_name: adminName,
                    action: 'request_clarification',
                    verification_checklist: checklistState,
                    general_verification_notes: generalNotes.trim()
                };

                try {
                    const res = await fetch('http://localhost/REC-Review-Application-Management/backend/api/verify_revisions_and_grant_clearance.php', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload)
                    });
                    const json = await res.json();
                    if (!res.ok || json.status !== 'success') {
                        throw new Error(json.message || 'Failed to request clarifications.');
                    }
                    return json;
                } catch (err) {
                    Swal.showValidationMessage(`Operation Failed: ${err.message}`);
                }
            }
        });

        if (confirmResult.isConfirmed) {
            await fireSwal({
                icon: 'info',
                title: 'Clarifications Requested',
                text: `Protocol returned to Decision Letter Issued (Attempt #${attemptNo + 1}). Proponent notified.`,
                confirmButtonColor: '#003366'
            });
            if (onRefresh) onRefresh();
            onClose();
        }
    };

    return (
        <>
            {/* Modal Backdrop with High Z-Index */}
            <div className="modal-backdrop show" style={{ backgroundColor: 'rgba(0, 26, 51, 0.7)', zIndex: 1050 }}></div>

            <div 
                className="modal d-block" 
                tabIndex="-1" 
                onClick={onClose} 
                style={{ zIndex: 1055, overflowY: 'hidden' }}
            >
                <div 
                    className="modal-dialog modal-xl modal-dialog-centered" 
                    onClick={(e) => e.stopPropagation()} 
                    style={{ maxWidth: '96vw', height: '94vh', margin: '3vh auto' }}
                >
                    <div className="modal-content border-0 shadow-lg rounded-4 h-100 d-flex flex-column overflow-hidden bg-white">

                        {/* ======================================================== */}
                        {/* 1. TOP BANNER: PROTOCOL META & ATTEMPT SWITCHER          */}
                        {/* ======================================================== */}
                        <div className="modal-header px-4 py-3 border-bottom d-flex align-items-center justify-content-between flex-shrink-0" style={{ backgroundColor: '#f8fafc' }}>
                            <div className="d-flex align-items-center gap-3">
                                <div 
                                    className="rounded-3 d-flex align-items-center justify-content-center text-white shadow-xs" 
                                    style={{ width: '44px', height: '44px', backgroundColor: '#003366' }}
                                >
                                    <i className="bi bi-patch-check-fill fs-4"></i>
                                </div>
                                <div>
                                    <div className="d-flex align-items-center gap-2">
                                        <h5 className="modal-title fw-bold mb-0 text-dark font-monospace">
                                            {protocol?.id || protocol?.protocol_code}
                                        </h5>
                                        <span className="badge bg-primary-subtle text-primary border border-primary px-2 py-1 small">
                                            {protocol?.type || protocol?.review_type || 'FULL BOARD'}
                                        </span>
                                        <span className="badge bg-warning-subtle text-warning-emphasis border border-warning px-2 py-1 small">
                                            <i className="bi bi-clock-history me-1"></i>REVISIONS SUBMITTED
                                        </span>
                                        <span className="badge bg-dark text-white px-2 py-1 small">
                                            Attempt #{attemptNo}
                                        </span>
                                    </div>
                                    <div className="text-secondary small text-truncate mt-1" style={{ maxWidth: '650px' }} title={protocol?.title || protocol?.research_title}>
                                        {protocol?.title || protocol?.research_title}
                                    </div>
                                </div>
                            </div>

                            {/* Attempt Switcher if multiple submissions exist */}
                            <div className="d-flex align-items-center gap-3">
                                {revisionSubmissions.length > 1 && (
                                    <div className="d-flex align-items-center gap-2 bg-white px-3 py-1 rounded-3 border shadow-xs">
                                        <span className="small text-muted fw-semibold">Round:</span>
                                        <div className="btn-group btn-group-sm">
                                            {revisionSubmissions.map((sub, idx) => (
                                                <button
                                                    key={idx}
                                                    type="button"
                                                    className={`btn btn-sm ${selectedAttemptIndex === idx ? 'btn-primary fw-bold' : 'btn-outline-secondary'}`}
                                                    onClick={() => setSelectedAttemptIndex(idx)}
                                                >
                                                    Attempt #{sub.attempt_no || (idx + 1)}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <button
                                    type="button"
                                    className="btn btn-outline-secondary rounded-circle d-flex align-items-center justify-content-center p-0"
                                    style={{ width: '38px', height: '38px' }}
                                    onClick={onClose}
                                    title="Close Window"
                                >
                                    <i className="bi bi-x-lg"></i>
                                </button>
                            </div>
                        </div>

                        {/* Error Notification Banner if any */}
                        {formError && (
                            <div className="alert alert-danger py-2 px-4 mb-0 rounded-0 border-0 border-bottom d-flex align-items-center justify-content-between">
                                <div className="d-flex align-items-center gap-2 small fw-semibold">
                                    <i className="bi bi-exclamation-octagon-fill fs-5"></i>
                                    <span>{formError}</span>
                                </div>
                                <button type="button" className="btn-close btn-close-sm" onClick={() => setFormError(null)}></button>
                            </div>
                        )}

                        {/* ======================================================== */}
                        {/* 2. DUAL-PANE WORKBENCH BODY                              */}
                        {/* ======================================================== */}
                        <div className="modal-body p-0 flex-grow-1 overflow-hidden">
                            <div className="row g-0 h-100">

                                {/* ---------------------------------------------------- */}
                                {/* LEFT PANE: PROPONENT SUBMISSION DOSSIER               */}
                                {/* ---------------------------------------------------- */}
                                <div className="col-12 col-lg-6 border-end d-flex flex-column bg-light-subtle h-100 overflow-hidden">
                                    {/* Left Pane Header */}
                                    <div className="p-3 bg-white border-bottom d-flex align-items-center justify-content-between flex-shrink-0">
                                        <div className="d-flex align-items-center gap-2">
                                            <i className="bi bi-folder2-open text-primary fs-5"></i>
                                            <span className="fw-bold text-dark text-uppercase small">
                                                Proponent Submission Dossier
                                            </span>
                                        </div>
                                        <div className="text-muted small">
                                            <i className="bi bi-person-fill me-1"></i>
                                            {activeSubmission?.proponent_name || protocol?.researchers?.[0] || "Researcher"} • 
                                            <i className="bi bi-calendar-event ms-2 me-1"></i>
                                            {formatDate(activeSubmission?.submitted_at || protocol?.date)}
                                        </div>
                                    </div>

                                    {/* Scrollable Dossier Content */}
                                    <div className="p-4 flex-grow-1 overflow-y-auto">

                                        {/* A. Executive Cover Summary Callout */}
                                        <div className="card border-0 shadow-sm rounded-3 mb-4 border-start border-4 border-primary bg-white">
                                            <div className="card-body p-3">
                                                <div className="d-flex align-items-center gap-2 text-primary fw-bold small text-uppercase mb-2">
                                                    <i className="bi bi-chat-square-quote-fill"></i>
                                                    Executive Cover Summary of Revisions
                                                </div>
                                                <p className="text-secondary mb-0 small lh-base" style={{ whiteSpace: 'pre-wrap' }}>
                                                    {coverNotes}
                                                </p>
                                            </div>
                                        </div>

                                        {/* B. Resubmitted Protocol Documents */}
                                        <div className="mb-4">
                                            <div className="d-flex align-items-center justify-content-between mb-2">
                                                <span className="fw-bold text-dark small text-uppercase">
                                                    <i className="bi bi-file-earmark-diff text-warning me-2"></i>
                                                    Resubmitted Documents ({submittedFiles.length})
                                                </span>
                                                <span className="badge bg-secondary-subtle text-secondary small">
                                                    Attempt #{attemptNo} Artifacts
                                                </span>
                                            </div>

                                            {submittedFiles.length === 0 ? (
                                                <div className="p-3 bg-white border rounded-3 text-center text-muted small">
                                                    No file attachments detected in this revision attempt.
                                                </div>
                                            ) : (
                                                <div className="row g-2">
                                                    {submittedFiles.map((file, idx) => {
                                                        const cat = DOCUMENT_CATEGORIES[file.category] || DOCUMENT_CATEGORIES.other_supporting;
                                                        return (
                                                            <div key={idx} className="col-12">
                                                                <div className="p-3 bg-white border rounded-3 d-flex align-items-center justify-content-between gap-3 shadow-xs hover-shadow transition-all">
                                                                    <div className="d-flex align-items-center gap-3 text-truncate">
                                                                        <div className="rounded-2 p-2 bg-light border d-flex align-items-center justify-content-center">
                                                                            <i className={`bi ${cat.icon} text-primary fs-4`}></i>
                                                                        </div>
                                                                        <div className="text-truncate">
                                                                            <a
                                                                                href={resolveFileUrl(file.savedPath)}
                                                                                target="_blank"
                                                                                rel="noopener noreferrer"
                                                                                className="text-decoration-none fw-semibold text-dark text-truncate d-block small"
                                                                                title={file.name}
                                                                            >
                                                                                {file.name}
                                                                            </a>
                                                                            <div className="d-flex align-items-center gap-2 mt-1">
                                                                                <span className={`badge ${cat.badgeClass}`} style={{ fontSize: '0.7rem' }}>
                                                                                    {cat.label}
                                                                                </span>
                                                                                <span className="text-muted small font-monospace">
                                                                                    {file.size_kb ? `${file.size_kb} KB` : 'PDF Document'}
                                                                                </span>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                    <a
                                                                        href={resolveFileUrl(file.savedPath)}
                                                                        target="_blank"
                                                                        rel="noopener noreferrer"
                                                                        className="btn btn-outline-primary btn-sm px-3 d-inline-flex align-items-center gap-1 shadow-xs fw-semibold flex-shrink-0"
                                                                    >
                                                                        <i className="bi bi-box-arrow-up-right"></i> View
                                                                    </a>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>

                                        {/* C. Directives Point-by-Point Clarification Matrix */}
                                        <div>
                                            <div className="d-flex align-items-center justify-content-between mb-2">
                                                <span className="fw-bold text-dark small text-uppercase">
                                                    <i className="bi bi-list-check text-primary me-2"></i>
                                                    Directives Compliance Matrix ({complianceMatrix.length})
                                                </span>
                                                <span className="badge bg-primary-subtle text-primary border border-primary small">
                                                    Point-by-Point Responses
                                                </span>
                                            </div>

                                            {complianceMatrix.length === 0 ? (
                                                <div className="p-4 bg-white border rounded-3 text-center text-muted small">
                                                    <i className="bi bi-info-circle fs-4 d-block mb-2 text-primary"></i>
                                                    No itemized compliance matrix included. Please review the executive cover notes and attached files.
                                                </div>
                                            ) : (
                                                <div className="d-flex flex-column gap-3">
                                                    {complianceMatrix.map((item, idx) => {
                                                        const qId = item.question_id || item.criterion_key || `directive_${idx}`;
                                                        const currentStatus = checklistState[qId]?.status || 'Satisfied';

                                                        return (
                                                            <div key={idx} className="card border rounded-3 bg-white shadow-xs">
                                                                {/* Item Header */}
                                                                <div className="card-header bg-white py-2 px-3 border-bottom d-flex align-items-center justify-content-between">
                                                                    <span className="badge bg-secondary-subtle text-dark border small fw-bold">
                                                                        Directive #{idx + 1}
                                                                    </span>
                                                                    <span className="fw-bold text-dark small text-truncate ms-2 me-auto">
                                                                        {item.criterion_label || "Ethical Criterion"}
                                                                    </span>
                                                                    <span className={`badge ${currentStatus === 'Satisfied' ? 'bg-success-subtle text-success border border-success' : 'bg-danger-subtle text-danger border border-danger'} small`}>
                                                                        {currentStatus}
                                                                    </span>
                                                                </div>

                                                                {/* Item Body */}
                                                                <div className="card-body p-3">
                                                                    {/* Committee Directive Text */}
                                                                    <div className="mb-3">
                                                                        <div className="text-muted small fw-semibold text-uppercase mb-1">
                                                                            Committee Required Directive:
                                                                        </div>
                                                                        <div className="p-2 bg-light rounded border-start border-3 border-warning small text-dark fst-italic">
                                                                            "{item.directive_text || "Comply with standard revision requirement."}"
                                                                        </div>
                                                                    </div>

                                                                    {/* Proponent Action Taken */}
                                                                    <div className="mb-2">
                                                                        <div className="text-muted small fw-semibold text-uppercase mb-1">
                                                                            Proponent Action Taken:
                                                                        </div>
                                                                        <div className="p-2 bg-success-subtle rounded border border-success-subtle small text-dark lh-base">
                                                                            {item.action_taken || "No response documented."}
                                                                        </div>
                                                                    </div>

                                                                    {/* Page Citation Badge */}
                                                                    <div className="d-flex align-items-center gap-2 mt-2">
                                                                        <span className="badge bg-info-subtle text-dark border border-info px-2 py-1 small">
                                                                            <i className="bi bi-bookmark-check-fill me-1 text-info"></i>
                                                                            Page Citation: {item.page_reference || "N/A"}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>

                                    </div>
                                </div>

                                {/* ---------------------------------------------------- */}
                                {/* RIGHT PANE: VERIFICATION WORKBENCH & SIGN-OFF         */}
                                {/* ---------------------------------------------------- */}
                                <div className="col-12 col-lg-6 d-flex flex-column bg-white h-100 overflow-hidden">
                                    
                                    {/* Right Pane Header */}
                                    <div className="p-3 bg-white border-bottom d-flex align-items-center justify-content-between flex-shrink-0">
                                        <div className="d-flex align-items-center gap-2">
                                            <i className="bi bi-clipboard2-check-fill text-success fs-5"></i>
                                            <span className="fw-bold text-dark text-uppercase small">
                                                Verification Workbench & Clearance Sign-Off
                                            </span>
                                        </div>
                                        <div className="d-flex align-items-center gap-2">
                                            <span className={`badge ${areAllSatisfied ? 'bg-success' : 'bg-warning text-dark'} px-2 py-1 small`}>
                                                {satisfiedCount} of {totalItems} Satisfied
                                            </span>
                                        </div>
                                    </div>

                                    {/* Scrollable Workbench Form Content */}
                                    <div className="p-4 flex-grow-1 overflow-y-auto">

                                        {/* Real-Time Progress Bar */}
                                        <div className="mb-4">
                                            <div className="d-flex justify-content-between align-items-center mb-1 small">
                                                <span className="text-secondary fw-semibold">Verification Completeness</span>
                                                <span className="fw-bold text-dark">
                                                    {totalItems > 0 ? Math.round((satisfiedCount / totalItems) * 100) : 100}%
                                                </span>
                                            </div>
                                            <div className="progress" style={{ height: '8px' }}>
                                                <div 
                                                    className={`progress-bar ${areAllSatisfied ? 'bg-success' : 'bg-warning'}`} 
                                                    role="progressbar" 
                                                    style={{ width: `${totalItems > 0 ? (satisfiedCount / totalItems) * 100 : 100}%` }}
                                                ></div>
                                            </div>
                                        </div>

                                        {/* Interactive Directives Verification Checklist */}
                                        <div className="mb-4">
                                            <div className="text-secondary fw-bold small text-uppercase mb-2">
                                                1. Point-by-Point Verification Checklist
                                            </div>

                                            {complianceMatrix.length === 0 ? (
                                                <div className="p-3 bg-light border rounded-3 text-muted small text-center mb-3">
                                                    No structured matrix directives to audit. Verification may be performed based on general notes.
                                                </div>
                                            ) : (
                                                <div className="d-flex flex-column gap-3">
                                                    {complianceMatrix.map((item, idx) => {
                                                        const qId = item.question_id || item.criterion_key || `directive_${idx}`;
                                                        const current = checklistState[qId] || { status: 'Satisfied', evaluator_remarks: '' };
                                                        const isDeficient = current.status === 'Deficient';

                                                        return (
                                                            <div 
                                                                key={idx} 
                                                                className={`p-3 rounded-3 border transition-all ${isDeficient ? 'bg-danger-subtle border-danger' : 'bg-light border-light-subtle'}`}
                                                            >
                                                                <div className="d-flex justify-content-between align-items-start gap-2 mb-2">
                                                                    <div>
                                                                        <span className="badge bg-white text-dark border px-2 py-1 small fw-bold me-2">
                                                                            #{idx + 1}
                                                                        </span>
                                                                        <span className="fw-bold text-dark small">
                                                                            {item.criterion_label}
                                                                        </span>
                                                                    </div>

                                                                    {/* Segmented Toggle Pills */}
                                                                    <div className="btn-group btn-group-sm shadow-xs flex-shrink-0" role="group">
                                                                        <button
                                                                            type="button"
                                                                            className={`btn btn-sm px-3 fw-bold ${current.status === 'Satisfied' ? 'btn-success text-white' : 'btn-outline-success bg-white'}`}
                                                                            onClick={() => handleToggleStatus(qId, 'Satisfied')}
                                                                        >
                                                                            <i className="bi bi-check-circle-fill me-1"></i> Satisfied
                                                                        </button>
                                                                        <button
                                                                            type="button"
                                                                            className={`btn btn-sm px-3 fw-bold ${current.status === 'Deficient' ? 'btn-danger text-white' : 'btn-outline-danger bg-white'}`}
                                                                            onClick={() => handleToggleStatus(qId, 'Deficient')}
                                                                        >
                                                                            <i className="bi bi-x-circle-fill me-1"></i> Deficient
                                                                        </button>
                                                                    </div>
                                                                </div>

                                                                {/* Summary of Action and Page */}
                                                                <div className="small text-muted mb-2 ps-1">
                                                                    <span className="fw-semibold text-dark">Action:</span> {item.action_taken || "—"} 
                                                                    <span className="ms-2 badge bg-light text-secondary border font-monospace">
                                                                        {item.page_reference || "p. N/A"}
                                                                    </span>
                                                                </div>

                                                                {/* Evaluator Feedback Remarks */}
                                                                <div className="mt-2">
                                                                    <label className="form-label small fw-semibold text-secondary mb-1">
                                                                        {isDeficient ? (
                                                                            <span className="text-danger">
                                                                                <i className="bi bi-exclamation-circle-fill me-1"></i>
                                                                                Specific Deficiency Remarks (Required):
                                                                            </span>
                                                                        ) : (
                                                                            <span>Verification / Audit Note (Optional):</span>
                                                                        )}
                                                                    </label>
                                                                    <input
                                                                        type="text"
                                                                        className={`form-control form-control-sm bg-white ${isDeficient && !current.evaluator_remarks?.trim() ? 'border-danger is-invalid' : ''}`}
                                                                        placeholder={isDeficient ? "Explain why this directive is deficient and what must be corrected..." : "Audited and verified compliant."}
                                                                        value={current.evaluator_remarks || ''}
                                                                        onChange={(e) => handleRemarksChange(qId, e.target.value)}
                                                                    />
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>

                                        {/* Overall Verification Remarks */}
                                        <div className="mb-4">
                                            <div className="text-secondary fw-bold small text-uppercase mb-2">
                                                2. General Verification Notes
                                            </div>
                                            <textarea
                                                className="form-control form-control-sm bg-white"
                                                rows="3"
                                                placeholder="Enter overarching synthesis notes, committee remarks, or institutional instructions..."
                                                value={generalNotes}
                                                onChange={(e) => setGeneralNotes(e.target.value)}
                                            ></textarea>
                                        </div>

                                        {/* Ethical Clearance Validity Period Configuration */}
                                        <div className="card border rounded-3 bg-light p-3 mb-2 shadow-xs">
                                            <div className="d-flex align-items-center justify-content-between mb-2">
                                                <span className="fw-bold text-dark small text-uppercase">
                                                    <i className="bi bi-award-fill text-warning me-2"></i>
                                                    3. Ethical Clearance Certificate Validity
                                                </span>
                                                <span className="badge bg-success-subtle text-success border border-success small">
                                                    AdZU Standard Policy
                                                </span>
                                            </div>

                                            <div className="row g-2 align-items-center">
                                                <div className="col-12 col-md-5">
                                                    <label className="form-label small text-secondary mb-1">Validity Period:</label>
                                                    <select
                                                        className="form-select form-select-sm fw-semibold"
                                                        value={validityYears}
                                                        onChange={(e) => setValidityYears(parseInt(e.target.value, 10))}
                                                    >
                                                        <option value={1}>1 Year (Standard Approval)</option>
                                                        <option value={2}>2 Years (Longitudinal Study)</option>
                                                        <option value={3}>3 Years (Extended Research)</option>
                                                    </select>
                                                </div>
                                                <div className="col-12 col-md-7">
                                                    <div className="p-2 bg-white rounded border small mt-3 mt-md-0">
                                                        <div className="text-muted" style={{ fontSize: '0.75rem' }}>Certificate Term:</div>
                                                        <div className="fw-bold text-success">
                                                            {validityDates.startFormatted} – {validityDates.endFormatted} ({validityYears} Year{validityYears > 1 ? 's' : ''})
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                    </div>

                                    {/* Action Footer Buttons */}
                                    <div className="p-3 bg-white border-top d-flex align-items-center justify-content-between gap-2 flex-shrink-0">
                                        <button
                                            type="button"
                                            className="btn btn-outline-secondary px-3 py-2 fw-semibold small"
                                            onClick={onClose}
                                            disabled={isSubmitting}
                                        >
                                            Cancel
                                        </button>

                                        <div className="d-flex align-items-center gap-2">
                                            {/* Button: Request Clarification */}
                                            <button
                                                type="button"
                                                className={`btn btn-sm px-3 py-2 fw-bold text-nowrap ${hasDeficiencies || generalNotes.trim() ? 'btn-outline-danger' : 'btn-outline-secondary opacity-50'}`}
                                                onClick={handleRequestClarification}
                                                disabled={isSubmitting || (!hasDeficiencies && !generalNotes.trim())}
                                                title={!hasDeficiencies && !generalNotes.trim() ? "Mark a directive as deficient or enter general notes to return application" : "Return protocol for Attempt N+1"}
                                            >
                                                <i className="bi bi-arrow-counterclockwise me-1"></i> Request Clarification
                                            </button>

                                            {/* Button: Grant Ethical Clearance */}
                                            <button
                                                type="button"
                                                className={`btn btn-sm px-4 py-2 fw-bold text-nowrap shadow-sm ${areAllSatisfied ? 'btn-success text-white' : 'btn-secondary disabled opacity-50'}`}
                                                onClick={handleGrantClearance}
                                                disabled={isSubmitting || !areAllSatisfied}
                                                title={!areAllSatisfied ? "All directives must be verified and Satisfied before granting ethical clearance" : "Issue Certificate of Ethical Clearance"}
                                            >
                                                <i className="bi bi-award-fill me-1"></i> Grant Ethical Clearance
                                            </button>
                                        </div>
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
