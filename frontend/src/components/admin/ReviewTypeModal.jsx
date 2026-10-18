import React, { useState, useEffect, useMemo } from "react";
import Swal from 'sweetalert2';
import { formatDate } from "../../utils/formatters";

// Standardized AdZU REC Document Taxonomy & Visual Badging
const DOCUMENT_CATEGORIES = {
    clarification_matrix: {
        label: "Clarification Matrix",
        badgeClass: "bg-primary text-white",
        icon: "bi-table",
        borderClass: "border-primary"
    },
    revised_protocol_clean: {
        label: "Revised Protocol (Clean)",
        badgeClass: "bg-success text-white",
        icon: "bi-file-earmark-check-fill",
        borderClass: "border-success"
    },
    revised_protocol_tracked: {
        label: "Revised Protocol (Tracked)",
        badgeClass: "bg-warning text-dark",
        icon: "bi-file-earmark-diff-fill",
        borderClass: "border-warning"
    },
    updated_consent_form: {
        label: "Updated Consent / Assent",
        badgeClass: "bg-info text-dark",
        icon: "bi-person-check-fill",
        borderClass: "border-info"
    },
    technical_review_letter: {
        label: "Tech Review Letter",
        badgeClass: "bg-secondary text-white",
        icon: "bi-patch-check-fill",
        borderClass: "border-secondary"
    },
    supplementary_instrument: {
        label: "Supplementary Tools",
        badgeClass: "bg-secondary text-white",
        icon: "bi-journal-text",
        borderClass: "border-secondary"
    },
    other_supporting: {
        label: "Supporting Document",
        badgeClass: "bg-light text-dark border",
        icon: "bi-paperclip",
        borderClass: "border-secondary-subtle"
    }
};

function formatBytes(bytes) {
    if (!bytes || bytes === 0) return "0 KB";
    if (bytes < 1024) return `${bytes} B`;
    const kb = bytes / 1024;
    if (kb < 1024) return `${kb.toFixed(1)} KB`;
    const mb = kb / 1024;
    return `${mb.toFixed(2)} MB`;
}

function ReviewTypeModal({ protocol, onClose }) {
    // Decision Pathway Mode: 'assign' (Forward) vs 'revision' (Return)
    const [decisionMode, setDecisionMode] = useState('assign');
    const [reviewType, setReviewType] = useState('');
    const [notes, setNotes] = useState('');
    const [notesError, setNotesError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    // Reviewer Pool State & Assignment State (Phase 2 Stage 4)
    const [reviewersData, setReviewersData] = useState({ all: [], primary: [], non_primary: [], chair: [] });
    const [isLoadingReviewers, setIsLoadingReviewers] = useState(false);
    const [primaryReviewer1, setPrimaryReviewer1] = useState('');
    const [primaryReviewer2, setPrimaryReviewer2] = useState('');
    const [nonPrimaryReviewer, setNonPrimaryReviewer] = useState('');
    const [reviewerError, setReviewerError] = useState('');

    // Lifecycle state for protocol history & resubmission tracking
    const [historyData, setHistoryData] = useState([]);
    const [isLoadingHistory, setIsLoadingHistory] = useState(false);

    // View Tabs: 'reconciliation' | 'documents' | 'synopsis'
    const [activeTab, setActiveTab] = useState('reconciliation');

    // 1. Fetch protocol history to obtain previous chair directives and applicant remarks
    useEffect(() => {
        if (protocol && protocol.application_id) {
            setIsLoadingHistory(true);
            fetch(`http://localhost/REC-Review-Application-Management/backend/api/protocol_history.php?application_id=${protocol.application_id}`)
                .then(res => res.json())
                .then(data => {
                    setIsLoadingHistory(false);
                    if (data.success && Array.isArray(data.data)) {
                        setHistoryData(data.data);
                    }
                })
                .catch(err => {
                    console.error("Error fetching protocol history in ReviewTypeModal:", err);
                    setIsLoadingHistory(false);
                });
        }
    }, [protocol?.application_id]);

    // 2. Fetch active committee reviewers on mount
    useEffect(() => {
        setIsLoadingReviewers(true);
        fetch('http://localhost/REC-Review-Application-Management/backend/api/get_reviewers.php')
            .then(res => res.json())
            .then(data => {
                setIsLoadingReviewers(false);
                if (data.success && data.data) {
                    setReviewersData(data.data);
                }
            })
            .catch(err => {
                console.error("Error fetching committee reviewers in ReviewTypeModal:", err);
                setIsLoadingReviewers(false);
            });
    }, []);

    // 3. Parse Revision Submissions array from form_data
    const revisionSubmissions = useMemo(() => {
        if (protocol?.form_data?.revision_submissions && Array.isArray(protocol.form_data.revision_submissions)) {
            return protocol.form_data.revision_submissions;
        }
        return [];
    }, [protocol?.form_data]);

    const latestRevision = revisionSubmissions.length > 0
        ? revisionSubmissions[revisionSubmissions.length - 1]
        : null;

    // 3. Extract and deduplicate Newly Resubmitted Documents
    const resubmittedFiles = useMemo(() => {
        const list = [];
        const seenPaths = new Set();

        // Pass A: revision_submissions array
        revisionSubmissions.forEach(sub => {
            (sub.files || []).forEach(file => {
                if (file?.savedPath && !seenPaths.has(file.savedPath)) {
                    seenPaths.add(file.savedPath);
                    list.push({
                        ...file,
                        attempt_no: sub.attempt_no || 1,
                        submitted_at: sub.submitted_at
                    });
                }
            });
        });

        // Pass B: requirements.revisedDocuments fallback
        const reqRevised = protocol?.form_data?.requirements?.revisedDocuments || [];
        reqRevised.forEach(file => {
            if (file?.savedPath && !seenPaths.has(file.savedPath)) {
                seenPaths.add(file.savedPath);
                list.push({
                    ...file,
                    attempt_no: revisionSubmissions.length || 1
                });
            }
        });

        return list;
    }, [protocol?.form_data, revisionSubmissions]);

    // 4. Extract Original Baseline Documents (excluding any resubmission files)
    const originalFiles = useMemo(() => {
        const resubmittedPaths = new Set(resubmittedFiles.map(f => f.savedPath));
        const baseline = [];
        const seen = new Set();

        const recurse = (obj) => {
            if (Array.isArray(obj)) {
                obj.forEach(item => recurse(item));
            } else if (obj && typeof obj === 'object') {
                if (obj.savedPath && obj.name) {
                    if (!resubmittedPaths.has(obj.savedPath) && !seen.has(obj.savedPath) && !obj.savedPath.includes('/rev_')) {
                        seen.add(obj.savedPath);
                        baseline.push(obj);
                    }
                } else {
                    for (let key in obj) {
                        if (key !== 'revision_submissions' && key !== 'revisedDocuments') {
                            recurse(obj[key]);
                        }
                    }
                }
            }
        };

        if (protocol?.form_data) {
            recurse(protocol.form_data);
        }
        return baseline;
    }, [protocol?.form_data, resubmittedFiles]);

    // 5. Attempt & Rebuttal Resolution Logic
    const pendingHistoryRow = useMemo(() => {
        return historyData.find(h => h.processPoint === 'Review Type Assessment' && h.status === 'Pending');
    }, [historyData]);

    const currentAttemptNo = pendingHistoryRow?.attemptNo 
        || (revisionSubmissions.length > 0 ? revisionSubmissions.length + 1 : 1);

    const isResubmission = Boolean(revisionSubmissions.length > 0 || currentAttemptNo > 1 || protocol?.has_active_revision || protocol?.revision_notes);

    // Locate preceding Chair Directives from history
    const previousChairStep = useMemo(() => {
        return [...historyData].reverse().find(h => h.processPoint === 'Review Type Assessment' && h.isRejected);
    }, [historyData]);

    // Locate completed Protocol Revision row
    const applicantRevisionStep = useMemo(() => {
        return [...historyData].reverse().find(h => (h.processPoint === 'Protocol Revision' || h.processPoint === 'Proponent Revisions') && h.status === 'Completed');
    }, [historyData]);

    const previousChairDirectives = previousChairStep?.notes 
        || protocol?.revision_notes
        || "The Ethics Review Committee Chair returned this protocol requesting modifications and clarifications prior to review type classification.";
    const chairProponentName = previousChairStep?.proponentName 
        || protocol?.chair_proponent_name 
        || "Ethics Review Committee Chair";
    const chairDateIssued = previousChairStep?.dateCompleted 
        || (protocol?.revision_requested_at ? formatDate(protocol.revision_requested_at) : "Previous Assessment Cycle");

    const applicantRemarks = latestRevision?.notes 
        || applicantRevisionStep?.notes 
        || protocol?.applicant_rebuttal_notes
        || "The applicant submitted revised protocol package and clarification documents addressing the directives.";
    const applicantProponentName = applicantRevisionStep?.proponentName 
        || (protocol?.researchers && protocol.researchers[0]) 
        || "Lead Proponent";
    const applicantSubmitDate = latestRevision?.submitted_at 
        ? formatDate(latestRevision.submitted_at) 
        : (applicantRevisionStep?.dateCompleted || "Recently Resubmitted");

    const protocolCode = protocol?.id || protocol?.protocol_code || 'N/A';
    const protocolTitle = protocol?.title || protocol?.research_title || 'Untitled Protocol';
    const submissionDate = protocol?.date || protocol?.submission_date || 'N/A';

    const researchersList = protocol?.researchers && protocol.researchers.length > 0
        ? protocol.researchers.join(', ')
        : (protocol?.form_data?.primary_researchers 
            ? protocol.form_data.primary_researchers.map(r => `${r.firstName} ${r.lastName}`).join(', ')
            : 'N/A');

    // Checklist coverage calculation
    const hasClarificationMatrix = resubmittedFiles.some(f => f.category === 'clarification_matrix');
    const hasCleanProtocol = resubmittedFiles.some(f => f.category === 'revised_protocol_clean');
    const hasTrackedProtocol = resubmittedFiles.some(f => f.category === 'revised_protocol_tracked');

    // SweetAlert Modal Overlay Helper
    const fireSwal = (options) => {
        return Swal.fire({
            ...options,
            didOpen: () => {
                const container = Swal.getContainer();
                if (container) container.style.zIndex = '1100';
            }
        });
    };

    // --- Action 1: Assign Review Type (Positive Path with Reviewer Allocation) ---
    const handleAssign = () => {
        if (!reviewType) {
            fireSwal({
                title: 'Review Type Required',
                text: 'Please select a review category (Exempted, Expedited, or Full Board).',
                icon: 'warning'
            });
            return;
        }

        // Validation for Expedited Track
        if (reviewType === 'Expedited') {
            if (!primaryReviewer1 || !primaryReviewer2 || !nonPrimaryReviewer) {
                setReviewerError('Please select both Primary Reviewers and one Non-Primary Reviewer.');
                fireSwal({
                    title: 'Reviewers Incomplete',
                    text: 'Expedited review requires 2 Primary Reviewers and 1 Non-Primary Reviewer to be selected.',
                    icon: 'warning'
                });
                return;
            }

            if (primaryReviewer1 === primaryReviewer2) {
                setReviewerError('Primary Reviewer 1 and Primary Reviewer 2 cannot be the same person.');
                fireSwal({
                    title: 'Duplicate Reviewer',
                    text: 'Please select two different Primary Reviewers.',
                    icon: 'warning'
                });
                return;
            }
        }

        setReviewerError('');

        // Dynamic SweetAlert Confirmation Summary
        let assignmentSummary = '';
        if (reviewType === 'Exempted') {
            assignmentSummary = 'The Ethics Committee Chair will be assigned as the autonomous sole evaluator.';
        } else if (reviewType === 'Expedited') {
            const p1 = reviewersData.primary.find(r => r.admin_id.toString() === primaryReviewer1);
            const p2 = reviewersData.primary.find(r => r.admin_id.toString() === primaryReviewer2);
            const np = reviewersData.non_primary.find(r => r.admin_id.toString() === nonPrimaryReviewer);
            assignmentSummary = `Assigned Reviewers:<br/>
                • <b>Primary:</b> ${p1 ? p1.first_name + ' ' + p1.last_name : ''}<br/>
                • <b>Primary:</b> ${p2 ? p2.first_name + ' ' + p2.last_name : ''}<br/>
                • <b>Non-Primary:</b> ${np ? np.first_name + ' ' + np.last_name : ''}`;
        } else if (reviewType === 'Full Board') {
            assignmentSummary = `All <b>${reviewersData.all.length || 'active'}</b> committee members will be convened and assigned to this protocol.`;
        }

        fireSwal({
            title: 'Confirm Review Assignment',
            html: `Are you sure you want to assign <b>${reviewType}</b> to protocol <b>${protocolCode}</b>?<br/><br/><div class="text-start bg-light p-3 rounded small border mb-2">${assignmentSummary}</div><small class="text-muted">This will advance the application to 'Ongoing Review'.</small>`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#060297',
            cancelButtonColor: '#6c757d',
            confirmButtonText: 'Yes, Assign Review Type',
            cancelButtonText: 'Cancel'
        }).then((result) => {
            if (result.isConfirmed) {
                const payload = {
                    application_id: protocol.application_id,
                    action: 'Assign',
                    review_type: reviewType,
                    notes: notes.trim(),
                    admin_id: localStorage.getItem('adminId') ? parseInt(localStorage.getItem('adminId')) : 2
                };

                if (reviewType === 'Expedited') {
                    payload.reviewer_assignments = {
                        primary_reviewer_1: parseInt(primaryReviewer1),
                        primary_reviewer_2: parseInt(primaryReviewer2),
                        non_primary_reviewer: parseInt(nonPrimaryReviewer)
                    };
                }

                executeSubmit(payload);
            }
        });
    };

    // --- Action 2: Return for Revision (Revision/Rejection Path) ---
    const handleReturnForRevision = () => {
        if (!notes.trim()) {
            setNotesError('Please provide revision instructions explaining what the applicant must correct or provide.');
            return;
        }
        setNotesError('');

        fireSwal({
            title: 'Return for Further Revision?',
            html: `Are you sure you want to return protocol <b>${protocolCode}</b> to the applicant for additional modifications?<br/><br/><small class="text-muted">Payment status will remain verified. A new 'Protocol Revision' task will be queued for the applicant.</small>`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d26000',
            cancelButtonColor: '#6c757d',
            confirmButtonText: 'Yes, Return for Revision',
            cancelButtonText: 'Cancel'
        }).then((result) => {
            if (result.isConfirmed) {
                executeSubmit({
                    application_id: protocol.application_id,
                    action: 'Reject',
                    notes: notes.trim(),
                    admin_id: localStorage.getItem('adminId') ? parseInt(localStorage.getItem('adminId')) : 2
                });
            }
        });
    };

    // --- Core API Execution ---
    const executeSubmit = (payload) => {
        setIsLoading(true);

        fetch('http://localhost/REC-Review-Application-Management/backend/api/assign_review_type.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        })
        .then(res => res.json())
        .then(data => {
            setIsLoading(false);
            if (data.success) {
                fireSwal({
                    title: 'Success!',
                    text: data.message,
                    icon: 'success',
                    confirmButtonColor: '#198754', 
                    confirmButtonText: 'OK'
                }).then(() => {
                    onClose(true); // Close modal and trigger dashboard refresh
                });
            } else {
                fireSwal({
                    title: 'Action Failed',
                    text: data.message || "An error occurred while processing the request.",
                    icon: 'error',
                    confirmButtonColor: '#dc3545'
                });
            }
        })
        .catch(err => {
            console.error(err);
            setIsLoading(false);
            fireSwal({
                title: 'Connection Error',
                text: "Failed to connect to the backend server.",
                icon: 'error',
                confirmButtonColor: '#dc3545'
            });
        });
    };

    return (
        <>
            {/* Modal Backdrop with High Z-Index */}
            <div className="modal-backdrop show" style={{ backgroundColor: 'rgba(0,0,0,0.65)', zIndex: 1060 }}></div>

            <div className="modal d-block" tabIndex="-1" onClick={() => !isLoading && onClose(false)} style={{ zIndex: 1065, overflowY: 'hidden' }}>
                <div className="modal-dialog modal-xl modal-dialog-centered modal-dialog-scrollable" onClick={(e) => e.stopPropagation()}>
                    <div className="modal-content border-0 shadow-lg rounded-4" style={{ maxHeight: '92vh' }}>
                        
                        {/* ======================================================== */}
                        {/* 1. MODAL HEADER WITH ATTEMPT STATUS BANNER               */}
                        {/* ======================================================== */}
                        <div className="modal-header bg-white border-bottom px-4 py-3 rounded-top-4 d-flex justify-content-between align-items-center">
                            <div className="d-flex align-items-center gap-3">
                                <div className="bg-light p-2 rounded-3 text-theme-primary border">
                                    <i className="bi bi-shield-check fs-4 lh-1"></i>
                                </div>
                                <div>
                                    <div className="d-flex align-items-center gap-2 flex-wrap">
                                        <h5 className="modal-title fw-bold text-theme-primary mb-0" style={{ letterSpacing: '0.5px' }}>
                                            Review Type Assessment
                                        </h5>
                                        {/* Dynamic Resubmission Attempt Pill */}
                                        {isResubmission ? (
                                            <span className="badge bg-warning text-dark border border-warning-subtle px-2 py-1 small fw-bold">
                                                <i className="bi bi-arrow-repeat me-1"></i>
                                                Attempt #{currentAttemptNo}: Resubmission Under Review
                                            </span>
                                        ) : (
                                            <span className="badge bg-light text-secondary border px-2 py-1 small">
                                                Initial Submission (Attempt #1)
                                            </span>
                                        )}
                                    </div>
                                    <small className="text-muted d-block mt-1">
                                        Evaluate ethical risk context, inspect applicant rebuttal, and assign review track
                                    </small>
                                </div>
                            </div>
                            <div className="d-flex align-items-center gap-2">
                                <span className="badge bg-theme-primary px-3 py-2 fs-6 fw-bold font-monospace">
                                    {protocolCode}
                                </span>
                                <button 
                                    type="button" 
                                    className="btn-close ms-2" 
                                    disabled={isLoading} 
                                    onClick={() => onClose(false)}
                                    aria-label="Close"
                                ></button>
                            </div>
                        </div>

                        {/* ======================================================== */}
                        {/* 2. MODAL BODY (SCROLLABLE CONTAINER)                     */}
                        {/* ======================================================== */}
                        <div className="modal-body p-4 bg-body-tertiary">
                            
                            {/* SECTION: PROTOCOL TITLE & BASIC META */}
                            <div className="card border-0 shadow-sm rounded-4 mb-3">
                                <div className="card-body p-3 px-4">
                                    <div className="d-flex justify-content-between align-items-start gap-3 flex-wrap">
                                        <div style={{ maxWidth: '80%' }}>
                                            <span className="text-secondary small fw-bold text-uppercase d-block mb-1">
                                                Research Protocol Title
                                            </span>
                                            <h5 className="fw-bold text-dark mb-1 lh-sm">
                                                {protocolTitle}
                                            </h5>
                                            <div className="d-flex align-items-center gap-3 text-secondary small flex-wrap mt-2">
                                                <div>
                                                    <i className="bi bi-people-fill me-1 text-theme-secondary"></i>
                                                    <strong>Proponent(s):</strong> {researchersList}
                                                </div>
                                                <div>
                                                    <i className="bi bi-calendar-event me-1 text-theme-secondary"></i>
                                                    <strong>Initial Submission:</strong> {submissionDate}
                                                </div>
                                                {protocol?.form_data?.study_type && (
                                                    <div>
                                                        <i className="bi bi-tag-fill me-1 text-theme-secondary"></i>
                                                        <strong>Study Type:</strong> {protocol.form_data.study_type === 'Other (please specify)' ? protocol.form_data.study_type_other : protocol.form_data.study_type}
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <div className="text-end">
                                            <span className="badge bg-success-subtle text-success-emphasis border border-success-subtle px-3 py-2 d-inline-flex align-items-center gap-1">
                                                <i className="bi bi-cash-coin"></i>
                                                Payment Verified (₱0 Fee)
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* ======================================================== */}
                            {/* SECTION: ADAPTIVE CONTENT TABS                           */}
                            {/* ======================================================== */}
                            <div className="card border-0 shadow-sm rounded-4 mb-4 overflow-hidden">
                                <div className="card-header bg-white border-bottom p-2 px-3">
                                    <ul className="nav nav-pills card-header-pills gap-1" role="tablist">
                                        {isResubmission && (
                                            <li className="nav-item" role="presentation">
                                                <button
                                                    type="button"
                                                    className={`nav-link btn-sm rounded-pill px-3 fw-bold d-inline-flex align-items-center gap-2 ${activeTab === 'reconciliation' ? 'active bg-theme-primary text-white shadow-sm' : 'text-secondary'}`}
                                                    onClick={() => setActiveTab('reconciliation')}
                                                >
                                                    <i className="bi bi-arrow-left-right"></i>
                                                    Directives vs. Rebuttal Remarks
                                                    <span className="badge bg-warning text-dark font-monospace">Attempt #{currentAttemptNo}</span>
                                                </button>
                                            </li>
                                        )}
                                        <li className="nav-item" role="presentation">
                                            <button
                                                type="button"
                                                className={`nav-link btn-sm rounded-pill px-3 fw-bold d-inline-flex align-items-center gap-2 ${(!isResubmission && activeTab === 'reconciliation') || activeTab === 'documents' ? 'active bg-theme-primary text-white shadow-sm' : 'text-secondary'}`}
                                                onClick={() => setActiveTab('documents')}
                                            >
                                                <i className="bi bi-folder2-open"></i>
                                                Document Repository
                                                <span className="badge bg-light text-dark border">
                                                    {resubmittedFiles.length + originalFiles.length}
                                                </span>
                                            </button>
                                        </li>
                                        <li className="nav-item" role="presentation">
                                            <button
                                                type="button"
                                                className={`nav-link btn-sm rounded-pill px-3 fw-bold d-inline-flex align-items-center gap-2 ${activeTab === 'synopsis' ? 'active bg-theme-primary text-white shadow-sm' : 'text-secondary'}`}
                                                onClick={() => setActiveTab('synopsis')}
                                            >
                                                <i className="bi bi-file-earmark-text"></i>
                                                Objectives & Ethical Risks
                                            </button>
                                        </li>
                                    </ul>
                                </div>

                                <div className="card-body p-4">

                                    {/* ---------------------------------------------------- */}
                                    {/* TAB 1: DIRECTIVES VS REBUTTAL (SIDE-BY-SIDE MATRIX)  */}
                                    {/* ---------------------------------------------------- */}
                                    {isResubmission && activeTab === 'reconciliation' && (
                                        <div>
                                            <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
                                                <div>
                                                    <h6 className="fw-bold text-dark mb-0">
                                                        <i className="bi bi-chat-square-quote-fill me-2 text-warning"></i>
                                                        Ethics Directives Reconciliation Grid
                                                    </h6>
                                                    <small className="text-muted">
                                                        Evaluate applicant rebuttal remarks against previous Committee Chair directives
                                                    </small>
                                                </div>
                                                <span className="badge bg-light text-secondary border px-3 py-1 font-monospace small">
                                                    Resubmitted: {applicantSubmitDate}
                                                </span>
                                            </div>

                                            {/* Comparative 2-Column Side-by-Side Callouts */}
                                            <div className="row g-3 mb-4">
                                                {/* Left Column: Ethics Chair Directives */}
                                                <div className="col-12 col-lg-6">
                                                    <div className="card h-100 border-0 bg-warning-subtle bg-opacity-25 border-start border-4 border-warning rounded-3 shadow-xs">
                                                        <div className="card-header bg-transparent border-bottom border-warning-subtle py-2 px-3 d-flex justify-content-between align-items-center">
                                                            <span className="fw-bold text-dark small text-uppercase d-inline-flex align-items-center gap-1">
                                                                <i className="bi bi-exclamation-triangle-fill text-warning"></i>
                                                                Chair Directives Issued
                                                            </span>
                                                            <span className="badge bg-warning text-dark font-monospace" style={{ fontSize: '0.75rem' }}>
                                                                {chairDateIssued}
                                                            </span>
                                                        </div>
                                                        <div className="card-body p-3">
                                                            <div className="small text-secondary mb-2">
                                                                Evaluator: <strong className="text-dark">{chairProponentName}</strong>
                                                            </div>
                                                            <div className="p-3 bg-white rounded border border-warning-subtle shadow-xs">
                                                                <p className="mb-0 text-dark small fst-italic lh-base" style={{ whiteSpace: "pre-line" }}>
                                                                    "{previousChairDirectives}"
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Right Column: Applicant's Rebuttal Response */}
                                                <div className="col-12 col-lg-6">
                                                    <div className="card h-100 border-0 bg-primary-subtle bg-opacity-25 border-start border-4 border-primary rounded-3 shadow-xs">
                                                        <div className="card-header bg-transparent border-bottom border-primary-subtle py-2 px-3 d-flex justify-content-between align-items-center">
                                                            <span className="fw-bold text-theme-primary small text-uppercase d-inline-flex align-items-center gap-1">
                                                                <i className="bi bi-check2-circle text-primary"></i>
                                                                Applicant Clarification Remarks
                                                            </span>
                                                            <span className="badge bg-theme-primary text-white font-monospace" style={{ fontSize: '0.75rem' }}>
                                                                {applicantSubmitDate}
                                                            </span>
                                                        </div>
                                                        <div className="card-body p-3">
                                                            <div className="small text-secondary mb-2">
                                                                Submitted by: <strong className="text-dark">{applicantProponentName}</strong>
                                                            </div>
                                                            <div className="p-3 bg-white rounded border border-primary-subtle shadow-xs">
                                                                <p className="mb-0 text-dark small fw-medium lh-base" style={{ whiteSpace: "pre-line", maxHeight: '200px', overflowY: 'auto' }}>
                                                                    {applicantRemarks}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Checklist Bar for Mandatory Revision Documents */}
                                            <div className="p-3 bg-light rounded-3 border mb-3">
                                                <div className="d-flex align-items-center justify-content-between mb-2 flex-wrap gap-1">
                                                    <span className="small fw-bold text-uppercase text-dark">
                                                        <i className="bi bi-clipboard-check-fill text-primary me-1"></i>
                                                        Revision Package Verification Status:
                                                    </span>
                                                    <small className="text-muted">Required for Stage 3 Assessment</small>
                                                </div>
                                                <div className="d-flex flex-wrap gap-2">
                                                    <span className={`badge d-inline-flex align-items-center gap-1 px-3 py-2 ${hasCleanProtocol ? 'bg-success text-white' : 'bg-warning-subtle text-dark border border-warning'}`}>
                                                        <i className={`bi ${hasCleanProtocol ? 'bi-check-circle-fill' : 'bi-exclamation-circle'}`}></i>
                                                        Clean Copy Protocol: {hasCleanProtocol ? 'Present' : 'Not Uploaded'}
                                                    </span>
                                                    <span className={`badge d-inline-flex align-items-center gap-1 px-3 py-2 ${hasTrackedProtocol ? 'bg-success text-white' : 'bg-warning-subtle text-dark border border-warning'}`}>
                                                        <i className={`bi ${hasTrackedProtocol ? 'bi-check-circle-fill' : 'bi-exclamation-circle'}`}></i>
                                                        Tracked Changes Protocol: {hasTrackedProtocol ? 'Present' : 'Not Uploaded'}
                                                    </span>
                                                    <span className={`badge d-inline-flex align-items-center gap-1 px-3 py-2 ${hasClarificationMatrix ? 'bg-success text-white' : 'bg-secondary-subtle text-secondary border'}`}>
                                                        <i className={`bi ${hasClarificationMatrix ? 'bi-check-circle-fill' : 'bi-dash-circle'}`}></i>
                                                        Clarification Matrix Doc: {hasClarificationMatrix ? 'Present' : 'In Remarks / Optional'}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Resubmitted Files Quick Grid */}
                                            {resubmittedFiles.length > 0 && (
                                                <div>
                                                    <div className="text-secondary fw-bold small text-uppercase mb-2">
                                                        Newly Resubmitted Documents ({resubmittedFiles.length})
                                                    </div>
                                                    <div className="row g-2">
                                                        {resubmittedFiles.map((file, idx) => {
                                                            const catInfo = DOCUMENT_CATEGORIES[file.category] || DOCUMENT_CATEGORIES.other_supporting;
                                                            return (
                                                                <div key={idx} className="col-12 col-md-6">
                                                                    <div className="p-2 px-3 bg-white border rounded-3 d-flex align-items-center justify-content-between gap-2 shadow-xs">
                                                                        <div className="d-flex align-items-center gap-2 text-truncate">
                                                                            <i className={`bi ${catInfo.icon} text-primary fs-5 flex-shrink-0`}></i>
                                                                            <div className="text-truncate">
                                                                                <a 
                                                                                    href={'/' + file.savedPath} 
                                                                                    target="_blank" 
                                                                                    rel="noopener noreferrer" 
                                                                                    className="text-decoration-none fw-semibold text-dark text-truncate d-block small"
                                                                                    title={file.name}
                                                                                >
                                                                                    {file.name}
                                                                                </a>
                                                                                <div className="d-flex align-items-center gap-2 mt-1">
                                                                                    <span className={`badge ${catInfo.badgeClass}`} style={{ fontSize: '0.7rem' }}>
                                                                                        {catInfo.label}
                                                                                    </span>
                                                                                    <span className="text-muted font-monospace" style={{ fontSize: '0.75rem' }}>
                                                                                        {file.size_kb ? `${file.size_kb} KB` : formatBytes(file.size)}
                                                                                    </span>
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                        <a 
                                                                            href={'/' + file.savedPath} 
                                                                            target="_blank" 
                                                                            rel="noopener noreferrer" 
                                                                            className="btn btn-outline-secondary btn-sm p-1 px-2 d-inline-flex align-items-center gap-1"
                                                                            title="Open document in new tab"
                                                                        >
                                                                            <i className="bi bi-box-arrow-up-right"></i>
                                                                        </a>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* ---------------------------------------------------- */}
                                    {/* TAB 2: DOCUMENT REPOSITORY (RESUBMITTED + BASELINE) */}
                                    {/* ---------------------------------------------------- */}
                                    {((!isResubmission && activeTab === 'reconciliation') || activeTab === 'documents') && (
                                        <div>
                                            {/* Sub-Section A: Newly Resubmitted Documents */}
                                            {resubmittedFiles.length > 0 && (
                                                <div className="mb-4">
                                                    <div className="d-flex justify-content-between align-items-center mb-2">
                                                        <span className="fw-bold text-dark small text-uppercase">
                                                            <i className="bi bi-file-earmark-diff me-2 text-warning"></i>
                                                            Newly Resubmitted Documents ({resubmittedFiles.length})
                                                        </span>
                                                        <span className="badge bg-warning-subtle text-dark border border-warning small">
                                                            Latest Attempt Files
                                                        </span>
                                                    </div>
                                                    <div className="row g-2">
                                                        {resubmittedFiles.map((file, idx) => {
                                                            const catInfo = DOCUMENT_CATEGORIES[file.category] || DOCUMENT_CATEGORIES.other_supporting;
                                                            return (
                                                                <div key={idx} className="col-12 col-md-6">
                                                                    <div className="p-3 bg-white border rounded-3 shadow-xs d-flex align-items-center justify-content-between gap-2">
                                                                        <div className="d-flex align-items-center gap-3 text-truncate">
                                                                            <div className="bg-light p-2 rounded text-primary">
                                                                                <i className={`bi ${catInfo.icon} fs-4`}></i>
                                                                            </div>
                                                                            <div className="text-truncate">
                                                                                <span className="fw-bold text-dark d-block text-truncate small" title={file.name}>
                                                                                    {file.name}
                                                                                </span>
                                                                                <div className="d-flex align-items-center gap-2 mt-1">
                                                                                    <span className={`badge ${catInfo.badgeClass}`} style={{ fontSize: '0.7rem' }}>
                                                                                        {catInfo.label}
                                                                                    </span>
                                                                                    <span className="text-muted font-monospace small">
                                                                                        {file.size_kb ? `${file.size_kb} KB` : formatBytes(file.size)}
                                                                                    </span>
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                        <a 
                                                                            href={'/' + file.savedPath} 
                                                                            target="_blank" 
                                                                            rel="noopener noreferrer" 
                                                                            className="btn btn-outline-secondary btn-sm p-2 d-inline-flex align-items-center gap-1"
                                                                            title="Open document in new window"
                                                                        >
                                                                            <i className="bi bi-box-arrow-up-right"></i>
                                                                        </a>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Sub-Section B: Original Baseline Documents */}
                                            <div>
                                                <div className="d-flex justify-content-between align-items-center mb-2">
                                                    <span className="fw-bold text-secondary small text-uppercase">
                                                        <i className="bi bi-archive me-2 text-secondary"></i>
                                                        Original Submission Documents ({originalFiles.length})
                                                    </span>
                                                    <span className="badge bg-light text-secondary border small">Baseline Reference</span>
                                                </div>
                                                {originalFiles.length > 0 ? (
                                                    <div className="row g-2">
                                                        {originalFiles.map((file, idx) => (
                                                            <div key={idx} className="col-12 col-md-6">
                                                                <div className="p-2 px-3 bg-white border rounded-3 d-flex align-items-center justify-content-between gap-2 shadow-xs">
                                                                    <div className="d-flex align-items-center gap-2 text-truncate">
                                                                        <i className="bi bi-file-earmark-pdf text-danger fs-5 flex-shrink-0"></i>
                                                                        <div className="text-truncate">
                                                                            <span className="fw-medium text-dark d-block text-truncate small" title={file.name}>
                                                                                {file.name}
                                                                            </span>
                                                                            <small className="text-muted font-monospace" style={{ fontSize: '0.75rem' }}>
                                                                                {file.size ? formatBytes(file.size) : 'Initial Package'}
                                                                            </small>
                                                                        </div>
                                                                    </div>
                                                                    <a 
                                                                        href={'/' + file.savedPath} 
                                                                        target="_blank" 
                                                                        rel="noopener noreferrer" 
                                                                        className="btn btn-outline-secondary btn-sm p-1 px-2"
                                                                        title="Open document"
                                                                    >
                                                                        <i className="bi bi-box-arrow-up-right"></i>
                                                                    </a>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <div className="p-3 bg-light rounded text-center text-muted small border">
                                                        No initial baseline documents found.
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {/* ---------------------------------------------------- */}
                                    {/* TAB 3: OBJECTIVES & ETHICAL RISKS                    */}
                                    {/* ---------------------------------------------------- */}
                                    {activeTab === 'synopsis' && (
                                        <div className="row g-4">
                                            {/* Study Synopsis */}
                                            <div className="col-12 col-lg-7 border-end-lg pe-lg-4">
                                                <div className="text-secondary fw-bold small text-uppercase mb-2">
                                                    Study Objectives & Synopsis
                                                </div>
                                                <div className="bg-light p-3 rounded-3 border">
                                                    <p className="text-dark mb-0 small lh-base" style={{ maxHeight: '180px', overflowY: 'auto' }}>
                                                        {protocol?.form_data?.description_objectives || protocol?.form_data?.description_study || 'No specific description/objectives provided in form data.'}
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Ethical Risk Factors */}
                                            <div className="col-12 col-lg-5 ps-lg-4">
                                                <div className="text-secondary fw-bold small text-uppercase mb-2">
                                                    Ethical Risk Factors
                                                </div>
                                                <div className="d-flex flex-column gap-2">
                                                    <div className="d-flex justify-content-between align-items-center p-2 rounded-2 bg-light border small">
                                                        <span className="fw-semibold text-muted">Technical Review:</span>
                                                        {protocol?.form_data?.compliance_technical_reviewed === 'Yes' 
                                                            ? <span className="badge bg-success px-2 py-1">Passed ({protocol?.form_data?.compliance_technical_body || 'Approved'})</span> 
                                                            : <span className="badge bg-warning text-dark px-2 py-1">No Prior Tech Review</span>}
                                                    </div>
                                                    <div className="d-flex justify-content-between align-items-center p-2 rounded-2 bg-light border small">
                                                        <span className="fw-semibold text-muted">Vulnerable Groups:</span>
                                                        {!protocol?.form_data?.requirements?.assentForm?.notApplicable 
                                                            ? <span className="badge bg-danger px-2 py-1">Assent Required</span> 
                                                            : <span className="badge bg-secondary px-2 py-1">Not Applicable</span>}
                                                    </div>
                                                    <div className="d-flex justify-content-between align-items-center p-2 rounded-2 bg-light border small">
                                                        <span className="fw-semibold text-muted">External ERC:</span>
                                                        <span className="text-dark fw-bold">
                                                            {protocol?.form_data?.compliance_other_erc === 'Yes' 
                                                                ? `Yes (${protocol?.form_data?.compliance_other_erc_name || 'Declared'})` 
                                                                : 'None'}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                </div>
                            </div>

                            {/* ======================================================== */}
                            {/* SECTION 3: DECISION WORKFLOW PANEL                       */}
                            {/* ======================================================== */}
                            <div className="card border-0 shadow-sm rounded-4">
                                <div className="card-header bg-white border-bottom p-3">
                                    <div className="d-flex flex-column flex-sm-row justify-content-between align-items-sm-center gap-2">
                                        <div>
                                            <h6 className="fw-bold text-dark mb-0">
                                                <i className="bi bi-sliders me-2 text-theme-primary"></i>Decision Pathway
                                            </h6>
                                            <small className="text-muted">Choose whether to advance the protocol or request further revisions</small>
                                        </div>

                                        {/* Segmented Mode Control */}
                                        <div className="nav nav-pills nav-fill p-1 bg-light rounded-pill border gap-1" role="tablist">
                                            <button 
                                                type="button" 
                                                className={`btn btn-sm rounded-pill px-3 fw-bold transition-all ${decisionMode === 'assign' ? 'btn-theme-primary text-white shadow-sm' : 'text-secondary border-0 bg-transparent'}`}
                                                onClick={() => { setDecisionMode('assign'); setNotesError(''); }}
                                            >
                                                <i className="bi bi-check2-circle me-1"></i> Assign Review Type
                                            </button>
                                            <button 
                                                type="button" 
                                                className={`btn btn-sm rounded-pill px-3 fw-bold transition-all ${decisionMode === 'revision' ? 'btn-warning text-dark shadow-sm' : 'text-secondary border-0 bg-transparent'}`}
                                                onClick={() => setDecisionMode('revision')}
                                            >
                                                <i className="bi bi-arrow-counterclockwise me-1"></i> Return for Revision
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                <div className="card-body p-4">
                                    {/* PATHWAY A: ASSIGN REVIEW TYPE */}
                                    {decisionMode === 'assign' && (
                                        <>
                                            <div className="mb-3">
                                                <label className="form-label fw-bold text-dark mb-2">
                                                    Select Board Review Category:
                                                </label>
                                                <div className="row g-3">
                                                    {/* Card 1: Exempted */}
                                                    <div className="col-12 col-md-4">
                                                        <div 
                                                            className={`card h-100 p-3 rounded-3 border-2 transition-all ${reviewType === 'Exempted' ? 'border-success bg-success bg-opacity-10 shadow-sm' : 'border-light-subtle bg-white'}`}
                                                            onClick={() => setReviewType('Exempted')}
                                                            style={{ cursor: 'pointer' }}
                                                        >
                                                            <div className="d-flex justify-content-between align-items-center mb-2">
                                                                <span className="badge bg-success px-2 py-1">Exempted</span>
                                                                <input 
                                                                    type="radio" 
                                                                    className="form-check-input mt-0" 
                                                                    name="reviewType"
                                                                    checked={reviewType === 'Exempted'} 
                                                                    onChange={() => setReviewType('Exempted')} 
                                                                />
                                                            </div>
                                                            <div className="fw-bold text-dark small mb-1">Less than Minimal Risk</div>
                                                            <p className="text-muted small mb-0 lh-sm" style={{ fontSize: '0.8rem' }}>
                                                                Research with non-identifiable surveys, educational evaluations, or benign behavioral observations.
                                                            </p>
                                                        </div>
                                                    </div>

                                                    {/* Card 2: Expedited */}
                                                    <div className="col-12 col-md-4">
                                                        <div 
                                                            className={`card h-100 p-3 rounded-3 border-2 transition-all ${reviewType === 'Expedited' ? 'border-warning bg-warning bg-opacity-10 shadow-sm' : 'border-light-subtle bg-white'}`}
                                                            onClick={() => setReviewType('Expedited')}
                                                            style={{ cursor: 'pointer' }}
                                                        >
                                                            <div className="d-flex justify-content-between align-items-center mb-2">
                                                                <span className="badge bg-warning text-dark px-2 py-1">Expedited</span>
                                                                <input 
                                                                    type="radio" 
                                                                    className="form-check-input mt-0" 
                                                                    name="reviewType"
                                                                    checked={reviewType === 'Expedited'} 
                                                                    onChange={() => setReviewType('Expedited')} 
                                                                />
                                                            </div>
                                                            <div className="fw-bold text-dark small mb-1">Standard Minimal Risk</div>
                                                            <p className="text-muted small mb-0 lh-sm" style={{ fontSize: '0.8rem' }}>
                                                                Non-invasive procedures, routine collections, healthy adult participants without vulnerable cohorts.
                                                            </p>
                                                        </div>
                                                    </div>

                                                    {/* Card 3: Full Board */}
                                                    <div className="col-12 col-md-4">
                                                        <div 
                                                            className={`card h-100 p-3 rounded-3 border-2 transition-all ${reviewType === 'Full Board' ? 'border-primary bg-primary bg-opacity-10 shadow-sm' : 'border-light-subtle bg-white'}`}
                                                            onClick={() => setReviewType('Full Board')}
                                                            style={{ cursor: 'pointer' }}
                                                        >
                                                            <div className="d-flex justify-content-between align-items-center mb-2">
                                                                <span className="badge bg-theme-primary text-white px-2 py-1">Full Board</span>
                                                                <input 
                                                                    type="radio" 
                                                                    className="form-check-input mt-0" 
                                                                    name="reviewType"
                                                                    checked={reviewType === 'Full Board'} 
                                                                    onChange={() => setReviewType('Full Board')} 
                                                                />
                                                            </div>
                                                            <div className="fw-bold text-dark small mb-1">More than Minimal Risk</div>
                                                            <p className="text-muted small mb-0 lh-sm" style={{ fontSize: '0.8rem' }}>
                                                                Clinical trials, invasive tests, or research with vulnerable groups (minors, indigenous, prisoners).
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* DYNAMIC REVIEWER ASSIGNMENT PANEL (PHASE 2 STAGE 4) */}
                                            {reviewType && (
                                                <div className="mb-4">
                                                    {/* Track 1: Exempted -> Autonomous Fast-Track */}
                                                    {reviewType === 'Exempted' && (
                                                        <div className="card border-0 bg-success-subtle bg-opacity-25 border-start border-4 border-success rounded-3 p-3 shadow-xs">
                                                            <div className="d-flex align-items-start gap-3">
                                                                <div className="bg-success text-white p-2 rounded-3 flex-shrink-0">
                                                                    <i className="bi bi-shield-check fs-4 lh-1"></i>
                                                                </div>
                                                                <div className="flex-grow-1">
                                                                    <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-1">
                                                                        <h6 className="fw-bold text-success-emphasis mb-0">
                                                                            Autonomous Fast-Track: Ethics Committee Chair
                                                                        </h6>
                                                                        <span className="badge bg-success text-white px-2 py-1 small">
                                                                            Sole Evaluator & Signatory
                                                                        </span>
                                                                    </div>
                                                                    <p className="text-dark small mb-2 lh-base">
                                                                        Under AdZU REC Standard Operating Procedures, protocols categorized as <strong>Exempted</strong> (&lt; minimal risk) qualify for autonomous fast-track evaluation directly conducted by the Ethics Committee Chair. 
                                                                        <strong> No external or secondary committee reviewers are required.</strong>
                                                                    </p>
                                                                    <div className="p-2 px-3 bg-white border border-success-subtle rounded-2 d-inline-flex align-items-center gap-2">
                                                                        <i className="bi bi-person-badge-fill text-success fs-5"></i>
                                                                        <div className="small">
                                                                            <span className="fw-bold text-dark d-block">
                                                                                {reviewersData.chair?.[0] ? `${reviewersData.chair[0].first_name} ${reviewersData.chair[0].last_name}` : 'Ethics Committee Chair'}
                                                                            </span>
                                                                            <span className="text-muted" style={{ fontSize: '0.75rem' }}>
                                                                                Autonomous Ethical Reviewer & Executive Signatory
                                                                            </span>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Track 2: Expedited -> 2 Primary + 1 Non-Primary Dropdowns */}
                                                    {reviewType === 'Expedited' && (
                                                        <div className="card border-0 bg-warning-subtle bg-opacity-25 border-start border-4 border-warning rounded-3 p-3 shadow-xs">
                                                            <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-2">
                                                                <div className="d-flex align-items-center gap-2">
                                                                    <i className="bi bi-people-fill text-warning fs-5"></i>
                                                                    <h6 className="fw-bold text-dark mb-0">
                                                                        Expedited Review Team Composition (3 Reviewers Required)
                                                                    </h6>
                                                                </div>
                                                                <span className="badge bg-warning text-dark px-2 py-1 small fw-bold">
                                                                    2 Primary Reviewers + 1 Non-Primary Reviewer
                                                                </span>
                                                            </div>
                                                            <p className="text-muted small mb-3">
                                                                Assign two Primary Reviewers (content/methodology experts) and one Non-Primary Reviewer (lay or legal representative) to conduct independent evaluations.
                                                            </p>

                                                            {reviewerError && (
                                                                <div className="alert alert-danger py-2 px-3 small d-flex align-items-center gap-2 mb-3">
                                                                    <i className="bi bi-exclamation-octagon-fill text-danger flex-shrink-0"></i>
                                                                    <span>{reviewerError}</span>
                                                                </div>
                                                            )}

                                                            <div className="row g-3">
                                                                {/* Primary Reviewer 1 */}
                                                                <div className="col-12 col-md-4">
                                                                    <label className="form-label small fw-bold text-dark mb-1">
                                                                        Primary Reviewer 1 <span className="text-danger">*</span>
                                                                    </label>
                                                                    <select 
                                                                        className={`form-select form-select-sm ${!primaryReviewer1 && reviewerError ? 'is-invalid border-danger' : ''}`}
                                                                        value={primaryReviewer1}
                                                                        onChange={(e) => {
                                                                            setPrimaryReviewer1(e.target.value);
                                                                            if (reviewerError) setReviewerError('');
                                                                        }}
                                                                        disabled={isLoadingReviewers}
                                                                    >
                                                                        <option value="">-- Select Primary Reviewer 1 --</option>
                                                                        {reviewersData.primary.map(r => (
                                                                            <option 
                                                                                key={r.admin_id} 
                                                                                value={r.admin_id}
                                                                                disabled={r.admin_id.toString() === primaryReviewer2}
                                                                            >
                                                                                {r.first_name} {r.last_name} {r.specialization ? `(${r.specialization})` : ''} {r.admin_id.toString() === primaryReviewer2 ? '— (Selected as Reviewer 2)' : ''}
                                                                            </option>
                                                                        ))}
                                                                    </select>
                                                                    <div className="form-text text-muted" style={{ fontSize: '0.72rem' }}>
                                                                        Subject matter / protocol design expert
                                                                    </div>
                                                                </div>

                                                                {/* Primary Reviewer 2 */}
                                                                <div className="col-12 col-md-4">
                                                                    <label className="form-label small fw-bold text-dark mb-1">
                                                                        Primary Reviewer 2 <span className="text-danger">*</span>
                                                                    </label>
                                                                    <select 
                                                                        className={`form-select form-select-sm ${!primaryReviewer2 && reviewerError ? 'is-invalid border-danger' : ''}`}
                                                                        value={primaryReviewer2}
                                                                        onChange={(e) => {
                                                                            setPrimaryReviewer2(e.target.value);
                                                                            if (reviewerError) setReviewerError('');
                                                                        }}
                                                                        disabled={isLoadingReviewers}
                                                                    >
                                                                        <option value="">-- Select Primary Reviewer 2 --</option>
                                                                        {reviewersData.primary.map(r => (
                                                                            <option 
                                                                                key={r.admin_id} 
                                                                                value={r.admin_id}
                                                                                disabled={r.admin_id.toString() === primaryReviewer1}
                                                                            >
                                                                                {r.first_name} {r.last_name} {r.specialization ? `(${r.specialization})` : ''} {r.admin_id.toString() === primaryReviewer1 ? '— (Selected as Reviewer 1)' : ''}
                                                                            </option>
                                                                        ))}
                                                                    </select>
                                                                    <div className="form-text text-muted" style={{ fontSize: '0.72rem' }}>
                                                                        Distinct subject matter specialist
                                                                    </div>
                                                                </div>

                                                                {/* Non-Primary Reviewer */}
                                                                <div className="col-12 col-md-4">
                                                                    <label className="form-label small fw-bold text-dark mb-1">
                                                                        Non-Primary Reviewer <span className="text-danger">*</span>
                                                                    </label>
                                                                    <select 
                                                                        className={`form-select form-select-sm ${!nonPrimaryReviewer && reviewerError ? 'is-invalid border-danger' : ''}`}
                                                                        value={nonPrimaryReviewer}
                                                                        onChange={(e) => {
                                                                            setNonPrimaryReviewer(e.target.value);
                                                                            if (reviewerError) setReviewerError('');
                                                                        }}
                                                                        disabled={isLoadingReviewers}
                                                                    >
                                                                        <option value="">-- Select Non-Primary Reviewer --</option>
                                                                        {reviewersData.non_primary.map(r => (
                                                                            <option key={r.admin_id} value={r.admin_id}>
                                                                                {r.first_name} {r.last_name} {r.specialization ? `(${r.specialization})` : ''}
                                                                            </option>
                                                                        ))}
                                                                    </select>
                                                                    <div className="form-text text-muted" style={{ fontSize: '0.72rem' }}>
                                                                        Lay / community / legal perspective
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Track 3: Full Board -> Full Committee Convening Roster Preview */}
                                                    {reviewType === 'Full Board' && (
                                                        <div className="card border-0 bg-primary-subtle bg-opacity-25 border-start border-4 border-primary rounded-3 p-3 shadow-xs">
                                                            <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-2">
                                                                <div className="d-flex align-items-center gap-2">
                                                                    <i className="bi bi-diagram-3-fill text-theme-primary fs-5"></i>
                                                                    <h6 className="fw-bold text-dark mb-0">
                                                                        Full Committee Convening: Board Roster Preview
                                                                    </h6>
                                                                </div>
                                                                <span className="badge bg-theme-primary text-white px-2 py-1 small">
                                                                    {reviewersData.all.length} Total Board Members Convening
                                                                </span>
                                                            </div>
                                                            <p className="text-muted small mb-3">
                                                                Protocols with more than minimal risk require full committee deliberation. All active board members (Primary Reviewers, Non-Primary Reviewers, and Ethics Chair) will be automatically assigned to review the dossier and convene for the board assembly.
                                                            </p>

                                                            {isLoadingReviewers ? (
                                                                <div className="text-center py-3">
                                                                    <div className="spinner-border spinner-border-sm text-theme-primary me-2" role="status"></div>
                                                                    <span className="text-muted small">Loading committee roster...</span>
                                                                </div>
                                                            ) : (
                                                                <div className="row g-2">
                                                                    {reviewersData.all.map((r) => {
                                                                        let roleBadgeClass = 'bg-secondary-subtle text-secondary border';
                                                                        let roleIcon = 'bi-person';
                                                                        if (r.role === 'Ethics Chair') {
                                                                            roleBadgeClass = 'bg-warning-subtle text-warning-emphasis border border-warning';
                                                                            roleIcon = 'bi-shield-check';
                                                                        } else if (r.role === 'Primary Reviewer') {
                                                                            roleBadgeClass = 'bg-primary-subtle text-theme-primary border border-primary-subtle';
                                                                            roleIcon = 'bi-mortarboard-fill';
                                                                        } else if (r.role === 'Non-Primary Reviewer') {
                                                                            roleBadgeClass = 'bg-info-subtle text-info-emphasis border border-info-subtle';
                                                                            roleIcon = 'bi-people-fill';
                                                                        }

                                                                        return (
                                                                            <div key={r.admin_id} className="col-12 col-md-6 col-lg-4">
                                                                                <div className="card h-100 border rounded-3 p-2 px-3 shadow-xs bg-white">
                                                                                    <div className="d-flex align-items-center gap-2">
                                                                                        <div className="bg-light p-2 rounded-circle text-theme-primary flex-shrink-0">
                                                                                            <i className={`bi ${roleIcon} fs-5`}></i>
                                                                                        </div>
                                                                                        <div className="text-truncate">
                                                                                            <span className="fw-bold text-dark d-block text-truncate small" title={`${r.first_name} ${r.last_name}`}>
                                                                                                {r.first_name} {r.last_name}
                                                                                            </span>
                                                                                            <div className="d-flex align-items-center gap-1 flex-wrap mt-1">
                                                                                                <span className={`badge ${roleBadgeClass}`} style={{ fontSize: '0.68rem' }}>
                                                                                                    {r.role}
                                                                                                </span>
                                                                                                {r.specialization && (
                                                                                                    <small className="text-muted text-truncate" style={{ fontSize: '0.72rem', maxWidth: '120px' }} title={r.specialization}>
                                                                                                        {r.specialization}
                                                                                                    </small>
                                                                                                )}
                                                                                            </div>
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
                                                </div>
                                            )}

                                            {/* Notes Field (Optional) */}
                                            <div className="mb-0">
                                                <label className="form-label fw-bold text-secondary small mb-1">
                                                    Chair Directives & Notes <span className="fw-normal text-muted">(Optional)</span>
                                                </label>
                                                <textarea 
                                                    className="form-control" 
                                                    rows="2" 
                                                    placeholder="Enter any initial guidance or notes for the assigned review committee..."
                                                    value={notes}
                                                    onChange={(e) => setNotes(e.target.value)}
                                                    disabled={isLoading}
                                                ></textarea>
                                                <div className="form-text small">
                                                    These notes will be logged in the protocol history and visible to assigned reviewers.
                                                </div>
                                            </div>
                                        </>
                                    )}

                                    {/* PATHWAY B: RETURN FOR REVISION */}
                                    {decisionMode === 'revision' && (
                                        <>
                                            {/* Informative Alert */}
                                            <div className="alert alert-warning border-0 d-flex align-items-start rounded-3 p-3 mb-3">
                                                <i className="bi bi-exclamation-triangle-fill fs-5 text-warning me-3 mt-1"></i>
                                                <div className="small">
                                                    <strong className="d-block mb-1 text-dark">Returning Protocol to Applicant for Revision</strong>
                                                    The current review assessment will be logged as <em>Revision Required</em>. A new <strong>Protocol Revision</strong> step will be generated for the applicant. <strong>Payment verification remains intact</strong> and will not be reset.
                                                </div>
                                            </div>

                                            {/* Notes Field (Mandatory with Live Validation) */}
                                            <div className="mb-0">
                                                <label className="form-label fw-bold text-danger small mb-1">
                                                    Revision Directives for Applicant <span className="text-danger fw-bold">* (Required)</span>
                                                </label>
                                                <textarea 
                                                    className={`form-control ${notesError ? 'is-invalid border-danger' : 'border-warning'}`} 
                                                    rows="3" 
                                                    placeholder="Specify the exact issues, missing documents, or revisions the applicant must address (e.g., Incomplete assent form, clarify inclusion criteria in Section 4)..."
                                                    value={notes}
                                                    onChange={(e) => {
                                                        setNotes(e.target.value);
                                                        if (e.target.value.trim()) setNotesError('');
                                                    }}
                                                    disabled={isLoading}
                                                    autoFocus
                                                ></textarea>
                                                {notesError ? (
                                                    <div className="invalid-feedback d-block fw-bold small mt-1">
                                                        <i className="bi bi-exclamation-circle me-1"></i>{notesError}
                                                    </div>
                                                ) : (
                                                    <div className="form-text text-muted small">
                                                        Please be thorough so the applicant can submit compliant revisions without delays.
                                                    </div>
                                                )}
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="modal-footer bg-white border-top px-4 py-3 rounded-bottom-4 d-flex justify-content-between align-items-center">
                            <button 
                                type="button" 
                                className="btn btn-outline-secondary px-4 fw-semibold" 
                                onClick={() => onClose(false)}
                                disabled={isLoading}
                            >
                                Cancel
                            </button>

                            <div>
                                {decisionMode === 'assign' ? (
                                    <button 
                                        type="button" 
                                        className="btn btn-theme-primary px-4 fw-bold text-white shadow-sm" 
                                        onClick={handleAssign}
                                        disabled={
                                            isLoading || 
                                            !reviewType || 
                                            (reviewType === 'Expedited' && (!primaryReviewer1 || !primaryReviewer2 || !nonPrimaryReviewer || primaryReviewer1 === primaryReviewer2))
                                        }
                                    >
                                        {isLoading ? (
                                            <><span className="spinner-border spinner-border-sm me-2" role="status"></span>Assigning...</>
                                        ) : (
                                            <><i className="bi bi-check2-circle me-2"></i>Assign Review Type</>
                                        )}
                                    </button>
                                ) : (
                                    <button 
                                        type="button" 
                                        className="btn btn-warning px-4 fw-bold text-dark shadow-sm" 
                                        onClick={handleReturnForRevision}
                                        disabled={isLoading}
                                    >
                                        {isLoading ? (
                                            <><span className="spinner-border spinner-border-sm me-2" role="status"></span>Submitting...</>
                                        ) : (
                                            <><i className="bi bi-arrow-counterclockwise me-2"></i>Return for Revision</>
                                        )}
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

export default ReviewTypeModal;
