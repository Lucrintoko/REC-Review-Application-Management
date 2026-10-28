import React, { useState, useEffect, useMemo } from 'react';
import Swal from 'sweetalert2';
import ConsolidatedDecisionLetterModal from './ConsolidatedDecisionLetterModal';

/**
 * ConsolidationModal.jsx
 * Phase 2 & 3 of Stage 5: Consolidation of Evaluation
 * 
 * Enables the Ethics Committee Chair to consolidate peer reviewer evaluations (Form 11 & Form 12)
 * using Approach 3: Smart-Default Synthesis with synchronized split-pane navigation, one-click accelerators,
 * and high-fidelity AdZU REC Form 13 printable PDF decision notice generation.
 */

// Recommendation Hierarchy Options
const RECOMMENDATION_OPTIONS = [
    { value: 'Approved', label: 'Approved (No ethical revisions required)', badgeClass: 'bg-success text-white' },
    { value: 'Minor Revisions', label: 'Minor Revisions Required', badgeClass: 'bg-warning text-dark' },
    { value: 'Major Revisions', label: 'Major Revision Required', badgeClass: 'bg-danger text-white' },
    { value: 'Disapproved', label: 'Disapproved', badgeClass: 'bg-dark text-white' }
];

export default function ConsolidationModal({ protocol, onClose, onRefresh }) {
    const adminId = localStorage.getItem('adminId');
    const adminName = localStorage.getItem('adminName') || "Ethics Chair";
    const role = localStorage.getItem('adminRole') || "Ethics Committee Chair";

    // Data State
    const [isLoading, setIsLoading] = useState(true);
    const [fetchError, setFetchError] = useState(null);
    const [consolidationData, setConsolidationData] = useState(null);

    // Active Navigation State
    const [activeFormTab, setActiveFormTab] = useState('form11'); // 'form11' | 'form12'
    const [activeQuestionId, setActiveQuestionId] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [lastSavedTime, setLastSavedTime] = useState(null);
    const [showLetterPreview, setShowLetterPreview] = useState(false);

    // Chair Synthesis Form State
    const [chairFindings, setChairFindings] = useState({});
    const [consolidatedRecommendation, setConsolidatedRecommendation] = useState('Minor Revisions');
    const [directivesForRevisions, setDirectivesForRevisions] = useState('');
    const [summaryNotes, setSummaryNotes] = useState('');
    const [meetingDate, setMeetingDate] = useState(new Date().toISOString().split('T')[0]);

    // SweetAlert2 Modal Overlay Layering Helper
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

    // -------------------------------------------------------------------------
    // 1. Anonymization Helper & Fetch Consolidation Data
    // -------------------------------------------------------------------------
    const anonymizeText = (text, roster = null) => {
        if (!text || typeof text !== 'string') return text;
        let sanitized = text;
        const activeRoster = roster || consolidationData?.reviewer_roster || [];
        activeRoster.forEach((rev, idx) => {
            if (!rev.reviewer_name) return;
            const name = rev.reviewer_name.trim();
            if (!name) return;
            const escaped = name.replace(/[.*+?^$\{\}()|[\]\\]/g, (m) => '\\' + m);
            const replacement = `Reviewer ${idx + 1}`;
            sanitized = sanitized.replace(new RegExp(`\\\[${escaped}\\\]:?`, 'gi'), `${replacement}:`);
            sanitized = sanitized.replace(new RegExp(`\\b${escaped}\\b:?`, 'gi'), `${replacement}:`);
        });
        return sanitized;
    };

    const fetchConsolidationData = async () => {
        if (!protocol?.application_id) return;
        setIsLoading(true);
        setFetchError(null);

        try {
            const res = await fetch(`http://localhost/REC-Review-Application-Management/backend/api/get_consolidation_data.php?application_id=${protocol.application_id}`);
            const json = await res.json();

            if (!res.ok || json.status !== 'success') {
                throw new Error(json.message || 'Failed to load consolidation data.');
            }

            const data = json.data;
            setConsolidationData(data);

            // Initialize Chair Findings State from API response (saved draft or smart defaults)
            const initialFindings = {};
            const allCriteria = [
                ...(data.criteria_matrix?.form11 || []),
                ...(data.criteria_matrix?.form12 || [])
            ];

            allCriteria.forEach((item) => {
                const smartRemarks = anonymizeText(item.smart_default_remarks || '', data.reviewer_roster);
                const chairRemarks = item.chair_state?.remarks !== undefined 
                    ? anonymizeText(item.chair_state.remarks, data.reviewer_roster)
                    : smartRemarks;

                initialFindings[item.question_id] = {
                    finding: item.chair_state?.finding || item.smart_default_finding || 'Satisfactory',
                    remarks: chairRemarks,
                    is_modified: item.chair_state?.is_modified || false
                };
            });
            setChairFindings(initialFindings);

            // Initialize Overall Decision state
            setConsolidatedRecommendation(
                data.consolidation_meta?.consolidated_recommendation ||
                data.synthesized_recommendation?.current_value ||
                data.synthesized_recommendation?.smart_default ||
                'Minor Revisions'
            );
            setDirectivesForRevisions(anonymizeText(data.consolidation_meta?.directives_for_revisions || '', data.reviewer_roster));
            setSummaryNotes(anonymizeText(data.consolidation_meta?.summary_notes || '', data.reviewer_roster));
            if (data.consolidation_meta?.meeting_date) {
                setMeetingDate(data.consolidation_meta.meeting_date);
            }
            if (data.consolidation_meta?.updated_at) {
                setLastSavedTime(new Date(data.consolidation_meta.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
            }

            // Set default active question
            if (data.criteria_matrix?.form11?.length > 0) {
                setActiveQuestionId(data.criteria_matrix.form11[0].question_id);
            }

        } catch (err) {
            console.error("Error loading consolidation:", err);
            setFetchError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchConsolidationData();
    }, [protocol?.application_id]);

    // Active criteria array based on tab
    const currentCriteriaList = useMemo(() => {
        if (!consolidationData?.criteria_matrix) return [];
        return activeFormTab === 'form11'
            ? (consolidationData.criteria_matrix.form11 || [])
            : (consolidationData.criteria_matrix.form12 || []);
    }, [consolidationData, activeFormTab]);

    // Question statistics
    const stats = useMemo(() => {
        const list = currentCriteriaList;
        const total = list.length;
        const unanimous = list.filter(q => q.consensus_type === 'unanimous').length;
        const split = list.filter(q => q.consensus_type === 'split').length;
        const flagged = list.filter(q => q.is_flagged).length;
        return { total, unanimous, split, flagged };
    }, [currentCriteriaList]);

    // -------------------------------------------------------------------------
    // 2. Synchronized Navigation
    // -------------------------------------------------------------------------
    const scrollToQuestion = (questionId) => {
        setActiveQuestionId(questionId);
        const leftTarget = document.getElementById(`left-${questionId}`);
        const rightTarget = document.getElementById(`right-${questionId}`);

        if (leftTarget) {
            leftTarget.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
        if (rightTarget) {
            rightTarget.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    };

    // Switch form tab and focus first item
    const handleSwitchTab = (tabKey) => {
        setActiveFormTab(tabKey);
        const targetList = consolidationData?.criteria_matrix?.[tabKey] || [];
        if (targetList.length > 0) {
            scrollToQuestion(targetList[0].question_id);
        }
    };

    // -------------------------------------------------------------------------
    // 3. Synthesis Form Handlers & Text Accelerators
    // -------------------------------------------------------------------------
    const handleFindingChange = (questionId, newFinding) => {
        setChairFindings(prev => ({
            ...prev,
            [questionId]: {
                ...(prev[questionId] || {}),
                finding: newFinding,
                is_modified: true
            }
        }));
    };

    const handleRemarksChange = (questionId, newRemarks) => {
        setChairFindings(prev => ({
            ...prev,
            [questionId]: {
                ...(prev[questionId] || {}),
                remarks: newRemarks,
                is_modified: true
            }
        }));
    };

    const applyAccelerator = (questionId, text) => {
        if (!text) return;
        const cleanText = anonymizeText(text);
        setChairFindings(prev => ({
            ...prev,
            [questionId]: {
                ...(prev[questionId] || {}),
                remarks: cleanText,
                is_modified: true
            }
        }));
    };

    const clearRemarks = (item) => {
        setChairFindings(prev => ({
            ...prev,
            [item.question_id]: {
                finding: prev[item.question_id]?.finding || item.smart_default_finding,
                remarks: "",
                is_modified: true
            }
        }));
    };

    const resetToSmartDefault = (item) => {
        setChairFindings(prev => ({
            ...prev,
            [item.question_id]: {
                finding: item.smart_default_finding,
                remarks: anonymizeText(item.smart_default_remarks),
                is_modified: false
            }
        }));
    };

    // -------------------------------------------------------------------------
    // 4. Offline PDF Readiness Handler
    // -------------------------------------------------------------------------
    const handleExportOfflinePDF = () => {
        setShowLetterPreview(true);
    };

    // -------------------------------------------------------------------------
    // 5. Save Draft Action
    // -------------------------------------------------------------------------
    const handleSaveDraft = async (silent = false) => {
        if (isSubmitting) return;
        setIsSubmitting(true);

        const payload = {
            application_id: protocol.application_id,
            chair_id: adminId ? parseInt(adminId, 10) : 1,
            status: 'Draft',
            consolidated_recommendation: consolidatedRecommendation,
            summary_notes: summaryNotes,
            directives_for_revisions: directivesForRevisions,
            meeting_date: meetingDate,
            per_question_findings: chairFindings,
            cycle_number: consolidationData?.consolidation_meta?.cycle_number || consolidationData?.protocol?.active_cycle || protocol?.current_cycle || 1
        };

        try {
            const res = await fetch('http://localhost/REC-Review-Application-Management/backend/api/save_consolidation.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const json = await res.json();

            if (!res.ok || json.status !== 'success') {
                throw new Error(json.message || 'Failed to save consolidation draft.');
            }

            const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            setLastSavedTime(now);

            if (!silent) {
                fireSwal({
                    icon: 'success',
                    title: 'Draft Saved',
                    text: `Consolidation draft saved successfully at ${now}.`,
                    timer: 1600,
                    showConfirmButton: false
                });
            }
        } catch (err) {
            fireSwal({
                icon: 'error',
                title: 'Save Failed',
                text: err.message,
                confirmButtonColor: '#060297'
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    // -------------------------------------------------------------------------
    // 6. Finalize & Issue Decision Flow
    // -------------------------------------------------------------------------
    const checkForReviewerNameLeaks = () => {
        const roster = consolidationData?.reviewer_roster || [];
        const leakedNames = new Set();

        const checkString = (str) => {
            if (!str) return;
            roster.forEach(rev => {
                if (rev.reviewer_name && rev.reviewer_name.trim()) {
                    const nameLower = rev.reviewer_name.trim().toLowerCase();
                    if (str.toLowerCase().includes(nameLower)) {
                        leakedNames.add(rev.reviewer_name.trim());
                    }
                }
            });
        };

        checkString(directivesForRevisions);
        checkString(summaryNotes);
        Object.values(chairFindings).forEach(item => checkString(item?.remarks));

        return Array.from(leakedNames);
    };

    const handleFinalizeDecision = () => {
        const leaks = checkForReviewerNameLeaks();
        if (leaks.length > 0) {
            fireSwal({
                icon: 'warning',
                title: 'Reviewer Confidentiality Warning',
                html: `
                    <div class="text-start small">
                        <p class="mb-2">The following reviewer names were detected in consolidated directives or remarks:</p>
                        <ul class="text-danger ps-3 mb-2">
                            ${leaks.map(name => `<li><strong>${name}</strong></li>`).join('')}
                        </ul>
                        <p class="mb-0 text-muted">Per REC Double-Blind review policy, reviewer identities must not be disclosed in decision notices.</p>
                    </div>
                `,
                showCancelButton: true,
                confirmButtonColor: '#060297',
                cancelButtonColor: '#6c757d',
                confirmButtonText: '<i class="bi bi-shield-check me-1"></i> Auto-Scrub & Continue',
                cancelButtonText: 'Edit Manually'
            }).then((res) => {
                if (res.isConfirmed) {
                    setDirectivesForRevisions(prev => anonymizeText(prev));
                    setSummaryNotes(prev => anonymizeText(prev));
                    setChairFindings(prev => {
                        const cleaned = {};
                        Object.keys(prev).forEach(k => {
                            cleaned[k] = { ...prev[k], remarks: anonymizeText(prev[k]?.remarks) };
                        });
                        return cleaned;
                    });
                    fireSwal({
                        icon: 'success',
                        title: 'Reviewer Names Anonymized',
                        text: 'Reviewer names have been replaced with anonymous identifiers (Reviewer 1, Reviewer 2). Please click Finalize again to issue the decision.',
                        timer: 2000,
                        showConfirmButton: false
                    });
                }
            });
            return;
        }

        const errors = [];

        if (!consolidatedRecommendation) {
            errors.push("An official consolidated recommendation must be selected.");
        }

        if (['Minor Revisions', 'Major Revisions', 'Disapproved'].includes(consolidatedRecommendation)) {
            if (!directivesForRevisions || !directivesForRevisions.trim()) {
                errors.push(`Actionable directives for the applicant are required for '${consolidatedRecommendation}'.`);
            }
        }

        if (!meetingDate) {
            errors.push("Official Ethics Committee meeting date is required.");
        }

        if (errors.length > 0) {
            fireSwal({
                icon: 'warning',
                title: 'Finalization Incomplete',
                html: `
                    <div class="text-start small">
                        <p class="mb-2">Please resolve the following required items before finalizing:</p>
                        <ul class="text-danger ps-3 mb-0">
                            ${errors.map(e => `<li>${e}</li>`).join('')}
                        </ul>
                    </div>
                `,
                confirmButtonColor: '#060297'
            });
            return;
        }

        fireSwal({
            title: 'Finalize Consolidated Evaluation?',
            html: `
                <div class="text-start small">
                    <p class="mb-2">You are issuing the official Committee Decision for protocol <strong>${protocol?.id || protocol?.protocol_code}</strong>.</p>
                    <div class="bg-light p-3 rounded-3 mb-3 border">
                        <div class="d-flex justify-content-between mb-1">
                            <span class="text-muted">Consolidated Decision:</span>
                            <strong class="text-dark">${consolidatedRecommendation}</strong>
                        </div>
                        <div class="d-flex justify-content-between mb-1">
                            <span class="text-muted">Meeting Date:</span>
                            <span class="text-dark">${meetingDate}</span>
                        </div>
                        <div class="d-flex justify-content-between">
                            <span class="text-muted">Ethics Chair:</span>
                            <span class="text-dark">${adminName}</span>
                        </div>
                    </div>
                    <div class="alert ${consolidatedRecommendation === 'Approved' ? 'alert-success border-success-subtle' : 'alert-warning border-warning-subtle'} py-2 px-3 small mb-0">
                        <i class="bi ${consolidatedRecommendation === 'Approved' ? 'bi-patch-check-fill text-success' : 'bi-exclamation-triangle-fill'} me-1"></i>
                        ${consolidatedRecommendation === 'Approved'
                            ? 'Finalizing will lock all peer evaluations and immediately grant official <strong>Ethical Clearance (Clearance Granted)</strong> with zero revisions required.'
                            : 'Finalizing will lock all peer evaluations, update protocol status to <strong>\'Decision Letter Issued\'</strong>, and generate the formal notification letter for the proponent.'
                        }
                    </div>
                </div>
            `,
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#060297',
            cancelButtonColor: '#6c757d',
            confirmButtonText: '<i class="bi bi-check2-circle me-1"></i> Finalize & Issue Decision',
            cancelButtonText: 'Review Further',
            showLoaderOnConfirm: true,
            preConfirm: async () => {
                const payload = {
                    application_id: protocol.application_id,
                    chair_id: adminId ? parseInt(adminId, 10) : 1,
                    status: 'Finalized',
                    consolidated_recommendation: consolidatedRecommendation,
                    summary_notes: summaryNotes,
                    directives_for_revisions: directivesForRevisions,
                    meeting_date: meetingDate,
                    per_question_findings: chairFindings,
                    cycle_number: consolidationData?.consolidation_meta?.cycle_number || consolidationData?.protocol?.active_cycle || protocol?.current_cycle || 1
                };

                try {
                    const res = await fetch('http://localhost/REC-Review-Application-Management/backend/api/save_consolidation.php', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload)
                    });
                    const json = await res.json();

                    if (!res.ok || json.status !== 'success') {
                        throw new Error(json.message || 'Finalization failed');
                    }
                    return json;
                } catch (err) {
                    Swal.showValidationMessage(`Error: ${err.message}`);
                }
            }
        }).then((result) => {
            if (result.isConfirmed) {
                const isCleared = result.value?.new_app_status === 'Clearance Granted' || consolidatedRecommendation === 'Approved';
                fireSwal({
                    icon: 'success',
                    title: isCleared ? 'Clearance Granted!' : 'Decision Finalized!',
                    text: isCleared 
                        ? 'Consolidated evaluation finalized. Protocol has been approved with zero revisions and official Ethical Clearance is granted!'
                        : 'Consolidated evaluation finalized. The protocol has progressed to Decision Letter Issued.',
                    confirmButtonColor: '#060297'
                }).then(() => {
                    if (onRefresh) onRefresh();
                    onClose();
                });
            }
        });
    };

    // -------------------------------------------------------------------------
    // Render Helper: Consensus Badge
    // -------------------------------------------------------------------------
    const renderConsensusBadge = (consensusType) => {
        if (consensusType === 'unanimous') {
            return (
                <span className="badge bg-success-subtle text-success border border-success px-2 py-1 small">
                    <i className="bi bi-check-circle-fill me-1"></i>Unanimous
                </span>
            );
        }
        if (consensusType === 'split') {
            return (
                <span className="badge bg-warning-subtle text-warning-emphasis border border-warning px-2 py-1 small">
                    <i className="bi bi-pie-chart-fill me-1"></i>Split Consensus
                </span>
            );
        }
        return (
            <span className="badge bg-danger-subtle text-danger border border-danger px-2 py-1 small">
                <i className="bi bi-exclamation-octagon-fill me-1"></i>Flagged Issue
            </span>
        );
    };

    return (
        <>
            {/* Modal Backdrop with Proper Z-Index */}
            <div className="modal-backdrop show" style={{ backgroundColor: 'rgba(0,0,0,0.65)', zIndex: 1050 }}></div>

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
                        {/* 1. MODAL HEADER: PROTOCOL META & ACTIONS                 */}
                        {/* ======================================================== */}
                        <div className="modal-header bg-white border-bottom px-4 py-3 d-flex justify-content-between align-items-center flex-shrink-0">
                            <div className="d-flex align-items-center gap-3">
                                <div className="bg-light p-2 rounded-3 text-theme-primary border">
                                    <i className="bi bi-diagram-3-fill fs-4 lh-1"></i>
                                </div>
                                <div>
                                    <div className="d-flex align-items-center gap-2 flex-wrap">
                                        <span className="badge bg-theme-primary px-3 py-1 fs-6 font-monospace">
                                            {protocol?.id || protocol?.protocol_code || 'REC-XXXX-XXXX'}
                                        </span>
                                        <span className="badge bg-secondary-subtle text-dark border px-2 py-1 small">
                                            {protocol?.type || protocol?.review_type || 'EXPEDITED'}
                                        </span>
                                        <span className="badge bg-primary-subtle text-theme-primary border border-primary px-2 py-1 small">
                                            <i className="bi bi-diagram-3 me-1"></i>Consolidation of Evaluation
                                        </span>
                                        <span className="badge bg-light text-secondary border px-2 py-1 small">
                                            Cycle {consolidationData?.consolidation_meta?.cycle_number || consolidationData?.protocol?.active_cycle || 1}
                                        </span>
                                        {consolidationData?.protocol?.is_appealed && (
                                            <span className="badge px-2 py-1 text-uppercase fw-bold" style={{ backgroundColor: '#c59b27', color: '#002147', fontSize: '0.72rem' }}>
                                                <i className="bi bi-shield-exclamation me-1"></i>Appeal Re-deliberation
                                            </span>
                                        )}
                                        {lastSavedTime && (
                                            <span className="badge bg-success-subtle text-success border border-success px-2 py-1 small">
                                                <i className="bi bi-clock-history me-1"></i>Saved {lastSavedTime}
                                            </span>
                                        )}
                                    </div>
                                    <h6 className="fw-bold text-dark text-truncate mt-1 mb-0" style={{ maxWidth: '650px' }} title={protocol?.title || protocol?.research_title}>
                                        {protocol?.title || protocol?.research_title || 'Untitled Research Protocol'}
                                    </h6>
                                    <small className="text-muted">
                                        Proponents: <strong className="text-dark">{protocol?.researchers?.join(', ') || protocol?.proponents?.join(', ') || 'N/A'}</strong>
                                        <span className="mx-2">•</span>
                                        Chair: <strong className="text-dark">{adminName}</strong>
                                    </small>
                                </div>
                            </div>

                            {/* Header Actions */}
                            <div className="d-flex align-items-center gap-2">
                                <button
                                    type="button"
                                    onClick={handleExportOfflinePDF}
                                    className="btn btn-sm btn-outline-secondary d-flex align-items-center gap-1 shadow-xs"
                                    title="Export Offline Consolidation PDF Package"
                                >
                                    <i className="bi bi-file-earmark-pdf-fill text-danger"></i>
                                    <span className="d-none d-md-inline">Offline PDF</span>
                                </button>
                                <button 
                                    type="button" 
                                    className="btn-close" 
                                    onClick={onClose} 
                                    aria-label="Close"
                                ></button>
                            </div>
                        </div>

                        {/* ======================================================== */}
                        {/* 2. SUB-HEADER: REVIEWER ROSTER & WORKSPACE CONTROLS      */}
                        {/* ======================================================== */}
                        <div className="bg-light border-bottom px-4 py-2 flex-shrink-0">
                            <div className="row g-2 align-items-center">
                                {/* Reviewer Roster Ribbon */}
                                <div className="col-12 col-lg-8">
                                    <div className="d-flex align-items-center gap-2 overflow-x-auto pb-1">
                                        <span className="small text-secondary text-uppercase fw-bold text-nowrap me-1">
                                            <i className="bi bi-people-fill me-1"></i>Committee Reviewers:
                                        </span>
                                        {(consolidationData?.reviewer_roster || []).map((rev) => {
                                            const rec = rev.recommendation || 'Pending';
                                            return (
                                                <div 
                                                    key={rev.reviewer_id} 
                                                    className="d-inline-flex align-items-center gap-2 bg-white border rounded-pill px-3 py-1 shadow-xs flex-shrink-0"
                                                >
                                                    <span className="badge bg-secondary-subtle text-dark border font-monospace" style={{ fontSize: '0.68rem' }}>
                                                        {rev.reviewer_role === 'Primary Reviewer' ? 'Primary' : 'Non-Primary'}
                                                    </span>
                                                    <strong className="small text-dark text-truncate" style={{ maxWidth: '140px' }}>
                                                        {rev.reviewer_name}
                                                    </strong>
                                                    <span className={`badge ${
                                                        rec === 'Approved' ? 'bg-success text-white' :
                                                        rec.includes('Minor') ? 'bg-warning text-dark' :
                                                        rec.includes('Major') ? 'bg-danger text-white' :
                                                        rec === 'Disapproved' ? 'bg-dark text-white' :
                                                        'bg-secondary text-white'
                                                    }`} style={{ fontSize: '0.68rem' }}>
                                                        {rec}
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Form Tabs */}
                                <div className="col-12 col-lg-4 text-lg-end">
                                    <div className="btn-group btn-group-sm shadow-xs" role="group">
                                        <button
                                            type="button"
                                            onClick={() => handleSwitchTab('form11')}
                                            className={`btn fw-semibold px-3 ${activeFormTab === 'form11' ? 'btn-theme-primary' : 'btn-outline-secondary bg-white'}`}
                                        >
                                            <i className="bi bi-file-earmark-text me-1"></i>Form 11 (Protocol)
                                            <span className="badge bg-white text-dark ms-1">15</span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleSwitchTab('form12')}
                                            className={`btn fw-semibold px-3 ${activeFormTab === 'form12' ? 'btn-theme-primary' : 'btn-outline-secondary bg-white'}`}
                                        >
                                            <i className="bi bi-person-check me-1"></i>Form 12 (Consent)
                                            <span className="badge bg-white text-dark ms-1">16</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* ======================================================== */}
                        {/* 3. SYNCHRONIZED QUESTION NAVIGATOR STRIP                 */}
                        {/* ======================================================== */}
                        <div className="bg-white border-bottom px-4 py-2 flex-shrink-0 d-flex align-items-center justify-content-between overflow-x-auto">
                            <div className="d-flex align-items-center gap-1">
                                <span className="small text-muted fw-bold text-uppercase me-2 text-nowrap">
                                    Jump to Item:
                                </span>
                                {currentCriteriaList.map((item, idx) => {
                                    const isActive = activeQuestionId === item.question_id;
                                    const dotColor = item.is_flagged ? 'bg-danger' : item.consensus_type === 'split' ? 'bg-warning' : 'bg-success';
                                    return (
                                        <button
                                            key={item.question_id}
                                            type="button"
                                            onClick={() => scrollToQuestion(item.question_id)}
                                            className={`btn btn-sm py-0 px-2 rounded-pill font-monospace border position-relative ${
                                                isActive ? 'btn-primary text-white fw-bold shadow-xs' : 'btn-light text-dark'
                                            }`}
                                            style={{ fontSize: '0.75rem', minWidth: '42px' }}
                                            title={`${idx + 1}. ${item.label} (${item.consensus_type})`}
                                        >
                                            <span className={`position-absolute top-0 start-100 translate-middle p-1 ${dotColor} border border-light rounded-circle`}></span>
                                            Q{idx + 1}
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Consensus Summary Counter */}
                            <div className="d-none d-xl-flex align-items-center gap-2 small text-nowrap ps-3 border-start">
                                <span className="text-success fw-semibold"><i className="bi bi-circle-fill me-1" style={{ fontSize: '0.5rem' }}></i>{stats.unanimous} Unanimous</span>
                                <span className="text-warning-emphasis fw-semibold"><i className="bi bi-circle-fill me-1" style={{ fontSize: '0.5rem' }}></i>{stats.split} Split</span>
                                {stats.flagged > 0 && (
                                    <span className="text-danger fw-bold"><i className="bi bi-circle-fill me-1" style={{ fontSize: '0.5rem' }}></i>{stats.flagged} Flagged</span>
                                )}
                            </div>
                        </div>

                        {/* ======================================================== */}
                        {/* 4. MODAL BODY: DUAL SPLIT-PANE WORKSPACE                 */}
                        {/* ======================================================== */}
                        <div className="modal-body p-0 flex-grow-1 overflow-hidden">
                            {isLoading ? (
                                <div className="d-flex flex-column align-items-center justify-content-center h-100 py-5">
                                    <div className="spinner-border text-theme-primary mb-3" style={{ width: '3rem', height: '3rem' }} role="status">
                                        <span className="visually-hidden">Loading...</span>
                                    </div>
                                    <h6 className="fw-bold text-dark">Synthesizing Peer Review Form Responses...</h6>
                                    <p className="text-muted small">Loading Form 11 and Form 12 comparison matrix and smart defaults.</p>
                                </div>
                            ) : fetchError ? (
                                <div className="p-4 text-center">
                                    <div className="alert alert-danger d-inline-block text-start p-4 rounded-4 shadow-sm" style={{ maxWidth: '600px' }}>
                                        <h5 className="alert-heading fw-bold mb-2"><i className="bi bi-exclamation-triangle-fill me-2"></i>Failed to Load Data</h5>
                                        <p className="mb-3 small">{fetchError}</p>
                                        <button type="button" onClick={fetchConsolidationData} className="btn btn-sm btn-outline-danger">
                                            <i className="bi bi-arrow-clockwise me-1"></i>Retry Loading
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="row g-0 h-100">

                                    {/* ------------------------------------------------ */}
                                    {/* LEFT PANE (50%): PEER REVIEWER COMPARISON MATRIX */}
                                    {/* ------------------------------------------------ */}
                                    <div className="col-12 col-lg-6 h-100 d-flex flex-column border-end bg-light overflow-hidden">
                                        <div className="p-3 bg-white border-bottom flex-shrink-0 d-flex justify-content-between align-items-center">
                                            <div>
                                                <h6 className="fw-bold text-dark mb-0">
                                                    <i className="bi bi-people-fill text-theme-primary me-2"></i>
                                                    Peer Reviewer Evaluations
                                                </h6>
                                                <span className="text-secondary small" style={{ fontSize: '0.78rem' }}>
                                                    Verbatim ratings and specific comments submitted by assigned reviewers.
                                                </span>
                                            </div>
                                            <span className="badge bg-secondary-subtle text-dark border font-monospace">
                                                {currentCriteriaList.length} Items
                                            </span>
                                        </div>

                                        {/* Scrollable Questions Column */}
                                        <div className="p-3 overflow-y-auto flex-grow-1 d-flex flex-column gap-3">
                                            {currentCriteriaList.map((item, index) => {
                                                const isActive = activeQuestionId === item.question_id;
                                                return (
                                                    <div
                                                        key={item.question_id}
                                                        id={`left-${item.question_id}`}
                                                        onClick={() => setActiveQuestionId(item.question_id)}
                                                        className={`card border-0 shadow-sm rounded-3 transition-all ${
                                                            isActive ? 'ring-2 border-primary shadow' : ''
                                                        }`}
                                                        style={{
                                                            borderLeft: item.is_flagged 
                                                                ? '5px solid #dc3545 !important' 
                                                                : item.consensus_type === 'split' 
                                                                ? '5px solid #ffc107 !important' 
                                                                : '5px solid #198754 !important'
                                                        }}
                                                    >
                                                        <div className="card-header bg-white border-bottom py-2 px-3 d-flex justify-content-between align-items-center">
                                                            <div className="d-flex align-items-center gap-2">
                                                                <span className="badge bg-theme-primary font-monospace">
                                                                    Item {index + 1}
                                                                </span>
                                                                <span className="small text-muted fw-semibold">
                                                                    {item.section_title}
                                                                </span>
                                                            </div>
                                                            {renderConsensusBadge(item.consensus_type)}
                                                        </div>

                                                        <div className="card-body p-3">
                                                            <h6 className="fw-bold text-dark mb-1 small">
                                                                {item.label}
                                                            </h6>
                                                            {item.helper_text && (
                                                                <p className="text-muted mb-3" style={{ fontSize: '0.75rem' }}>
                                                                    {item.helper_text}
                                                                </p>
                                                            )}

                                                            {/* Peer Reviewer Responses Comparison */}
                                                            <div className="d-flex flex-column gap-2">
                                                                {item.reviewer_responses.map((rev) => {
                                                                    const isPositive = ['yes', 'satisfactory'].includes(String(rev.response).toLowerCase());
                                                                    return (
                                                                        <div 
                                                                            key={rev.reviewer_id} 
                                                                            className="bg-light p-2 rounded-3 border"
                                                                        >
                                                                            <div className="d-flex justify-content-between align-items-center mb-1">
                                                                                <span className="small fw-bold text-dark">
                                                                                    {rev.reviewer_name}
                                                                                    <span className="text-muted fw-normal ms-1 font-monospace" style={{ fontSize: '0.7rem' }}>
                                                                                        ({rev.reviewer_role})
                                                                                    </span>
                                                                                </span>
                                                                                <span className={`badge ${
                                                                                    isPositive ? 'bg-success text-white' : 
                                                                                    rev.response === 'No' ? 'bg-danger text-white' : 
                                                                                    'bg-warning text-dark'
                                                                                }`} style={{ fontSize: '0.7rem' }}>
                                                                                    {rev.response}
                                                                                </span>
                                                                            </div>
                                                                            {rev.comment ? (
                                                                                <div className="p-2 bg-white rounded border-start border-3 border-secondary small fst-italic text-secondary">
                                                                                    "{rev.comment}"
                                                                                </div>
                                                                            ) : (
                                                                                <span className="text-muted small" style={{ fontSize: '0.72rem' }}>
                                                                                    No specific notes recorded.
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* ------------------------------------------------ */}
                                    {/* RIGHT PANE (50%): CHAIR CONSOLIDATED SYNTHESIS   */}
                                    {/* ------------------------------------------------ */}
                                    <div className="col-12 col-lg-6 h-100 d-flex flex-column bg-white overflow-hidden">
                                        <div className="p-3 bg-white border-bottom flex-shrink-0 d-flex justify-content-between align-items-center">
                                            <div>
                                                <h6 className="fw-bold text-dark mb-0">
                                                    <i className="bi bi-pencil-square text-theme-primary me-2"></i>
                                                    Chair Synthesis & Directives Form
                                                </h6>
                                                <span className="text-secondary small" style={{ fontSize: '0.78rem' }}>
                                                    Smart-Default synthesis prefilled. Adjust findings or inject peer feedback with accelerators.
                                                </span>
                                            </div>
                                            <div className="d-flex align-items-center gap-1">
                                                <span className="badge bg-success-subtle text-success border border-success font-monospace small">
                                                    Approach 3: Smart-Default
                                                </span>
                                            </div>
                                        </div>

                                        {/* Scrollable Chair Synthesis Column */}
                                        <div className="p-3 overflow-y-auto flex-grow-1 d-flex flex-column gap-3">
                                            {currentCriteriaList.map((item, index) => {
                                                const isActive = activeQuestionId === item.question_id;
                                                const currentFinding = chairFindings[item.question_id]?.finding || item.smart_default_finding;
                                                const currentRemarks = chairFindings[item.question_id]?.remarks ?? item.smart_default_remarks;
                                                const isModified = chairFindings[item.question_id]?.is_modified;

                                                return (
                                                    <div
                                                        key={item.question_id}
                                                        id={`right-${item.question_id}`}
                                                        onClick={() => setActiveQuestionId(item.question_id)}
                                                        className={`card border-0 shadow-sm rounded-3 transition-all ${
                                                            isActive ? 'ring-2 border-primary shadow' : ''
                                                        }`}
                                                    >
                                                        <div className="card-header bg-white border-bottom py-2 px-3 d-flex justify-content-between align-items-center">
                                                            <div className="d-flex align-items-center gap-2">
                                                                <span className="badge bg-theme-primary font-monospace">
                                                                    Consolidated Item {index + 1}
                                                                </span>
                                                                {isModified && (
                                                                    <span className="badge bg-info-subtle text-info border border-info" style={{ fontSize: '0.68rem' }}>
                                                                        <i className="bi bi-pencil-fill me-1"></i>Edited
                                                                    </span>
                                                                )}
                                                            </div>
                                                            {renderConsensusBadge(item.consensus_type)}
                                                        </div>

                                                        <div className="card-body p-3">
                                                            <label className="fw-bold text-dark small mb-2 d-block">
                                                                {item.label}
                                                            </label>

                                                            {/* Finding Selector Buttons */}
                                                            <div className="d-flex gap-2 mb-3 flex-wrap">
                                                                {["Satisfactory", "Requires Modification", "Unable to Assess"].map((opt) => {
                                                                    const isSelected = currentFinding === opt;
                                                                    return (
                                                                        <button
                                                                            key={opt}
                                                                            type="button"
                                                                            onClick={() => handleFindingChange(item.question_id, opt)}
                                                                            className={`btn btn-sm px-3 rounded-pill fw-semibold ${
                                                                                isSelected
                                                                                    ? (opt === 'Satisfactory' ? 'btn-success' : opt === 'Requires Modification' ? 'btn-danger' : 'btn-secondary')
                                                                                    : 'btn-outline-secondary'
                                                                            }`}
                                                                        >
                                                                            {opt}
                                                                        </button>
                                                                    );
                                                                })}
                                                            </div>

                                                            {/* Text Accelerators & Action Toolbar */}
                                                            <div className="d-flex justify-content-between align-items-center bg-light px-3 py-2 rounded-top border border-bottom-0 flex-wrap gap-2">
                                                                {/* Left Cluster: Peer Accelerators */}
                                                                <div className="d-flex align-items-center gap-1 flex-wrap">
                                                                    <span className="small text-secondary fw-bold me-1 d-flex align-items-center" style={{ fontSize: '0.72rem' }}>
                                                                        <i className="bi bi-lightning-charge-fill text-warning me-1"></i>Accelerators:
                                                                    </span>
                                                                    {item.accelerators?.use_rev_1 && (
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => applyAccelerator(item.question_id, item.accelerators.use_rev_1)}
                                                                            className="btn btn-xs btn-outline-primary py-0 px-2 rounded-pill d-inline-flex align-items-center gap-1"
                                                                            style={{ fontSize: '0.7rem' }}
                                                                            title={item.accelerators.use_rev_1}
                                                                        >
                                                                            <i className="bi bi-clipboard-check"></i>
                                                                            <span>Use Rev 1</span>
                                                                        </button>
                                                                    )}
                                                                    {item.accelerators?.use_rev_2 && (
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => applyAccelerator(item.question_id, item.accelerators.use_rev_2)}
                                                                            className="btn btn-xs btn-outline-primary py-0 px-2 rounded-pill d-inline-flex align-items-center gap-1"
                                                                            style={{ fontSize: '0.7rem' }}
                                                                            title={item.accelerators.use_rev_2}
                                                                        >
                                                                            <i className="bi bi-clipboard-check"></i>
                                                                            <span>Use Rev 2</span>
                                                                        </button>
                                                                    )}
                                                                    {item.accelerators?.merge_comments && (
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => applyAccelerator(item.question_id, item.accelerators.merge_comments)}
                                                                            className="btn btn-xs btn-theme-primary py-0 px-2 rounded-pill d-inline-flex align-items-center gap-1 shadow-xs"
                                                                            style={{ fontSize: '0.7rem' }}
                                                                            title="Merge peer comments into an anonymized bulleted synthesis"
                                                                            aria-label="Merge peer comments anonymously"
                                                                        >
                                                                            <i className="bi bi-shield-check text-warning"></i>
                                                                            <span>Merge Comments (Anonymized)</span>
                                                                        </button>
                                                                    )}
                                                                </div>

                                                                {/* Right Cluster: Default Restoration & Clear Canvas */}
                                                                <div className="d-flex align-items-center gap-1 ms-auto">
                                                                    {/* Restore Smart-Default Synthesis */}
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => resetToSmartDefault(item)}
                                                                        className="btn btn-xs btn-outline-secondary py-0 px-2 rounded-pill d-inline-flex align-items-center gap-1"
                                                                        style={{ fontSize: '0.7rem' }}
                                                                        title="Restore pre-calculated smart-default finding & consensus remarks"
                                                                    >
                                                                        <i className="bi bi-arrow-counterclockwise"></i>
                                                                        <span>Default</span>
                                                                    </button>

                                                                    {/* Clear Remarks to blank */}
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => clearRemarks(item)}
                                                                        className="btn btn-xs btn-outline-danger py-0 px-2 rounded-pill d-inline-flex align-items-center gap-1"
                                                                        style={{ fontSize: '0.7rem' }}
                                                                        title="Clear remarks to write a custom directive from a blank slate"
                                                                        disabled={!currentRemarks}
                                                                    >
                                                                        <i className="bi bi-x-circle"></i>
                                                                        <span>Clear</span>
                                                                    </button>
                                                                </div>
                                                            </div>

                                                            {/* Remarks Textarea */}
                                                            <textarea
                                                                rows="3"
                                                                className="form-control form-control-sm rounded-bottom rounded-0 border-top-0"
                                                                placeholder="Enter consolidated remarks, applicant directives, or justification (or use an accelerator above)..."
                                                                value={currentRemarks ?? ''}
                                                                onChange={(e) => handleRemarksChange(item.question_id, e.target.value)}
                                                            />
                                                        </div>
                                                    </div>
                                                );
                                            })}

                                            {/* ==================================================== */}
                                            {/* BLOCK: OVERALL SYNTHESIS & FINAL RECOMMENDATION      */}
                                            {/* ==================================================== */}
                                            <div className="card border-0 shadow-sm rounded-3 p-3 bg-white border-top border-4 border-theme-primary mt-2">
                                                <h6 className="fw-bold text-dark text-uppercase mb-3 d-flex align-items-center justify-content-between">
                                                    <span>
                                                        <i className="bi bi-award-fill text-theme-primary me-2"></i>
                                                        Final Consolidated Decision & Directives
                                                    </span>
                                                    <span className="badge bg-primary-subtle text-theme-primary font-monospace small">
                                                        Official REC Decision
                                                    </span>
                                                </h6>

                                                {/* Algorithmic Smart Default Callout */}
                                                <div className="alert alert-light border py-2 px-3 mb-3 rounded-3 small">
                                                    <div className="d-flex align-items-center gap-2 mb-1">
                                                        <i className="bi bi-robot text-primary fs-5"></i>
                                                        <strong>Smart-Default Consensus Recommendation:</strong>
                                                        <span className="badge bg-secondary font-monospace">
                                                            {consolidationData?.synthesized_recommendation?.smart_default || 'Minor Revisions'}
                                                        </span>
                                                    </div>
                                                    <p className="mb-0 text-muted" style={{ fontSize: '0.75rem' }}>
                                                        {consolidationData?.synthesized_recommendation?.reasons}
                                                    </p>
                                                </div>

                                                {/* Consolidated Recommendation Selector */}
                                                <div className="mb-3">
                                                    <label className="fw-bold text-dark small mb-1">
                                                        Official Committee Recommendation:
                                                    </label>
                                                    <select
                                                        className="form-select form-select-sm fw-semibold"
                                                        value={consolidatedRecommendation}
                                                        onChange={(e) => setConsolidatedRecommendation(e.target.value)}
                                                    >
                                                        {RECOMMENDATION_OPTIONS.map((opt) => (
                                                            <option key={opt.value} value={opt.value}>
                                                                {opt.label}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>

                                                {/* Meeting Date */}
                                                <div className="mb-3">
                                                    <label className="fw-bold text-dark small mb-1">
                                                        Meeting Date / Adjudication Date:
                                                    </label>
                                                    <input
                                                        type="date"
                                                        className="form-control form-control-sm"
                                                        value={meetingDate}
                                                        onChange={(e) => setMeetingDate(e.target.value)}
                                                    />
                                                </div>

                                                {/* Directives for Applicant */}
                                                <div className="mb-3">
                                                    <label className="fw-bold text-dark small mb-1">
                                                        Directives for Revisions (Inserted into Official Decision Letter):
                                                    </label>
                                                    <textarea
                                                        rows="4"
                                                        className="form-control form-control-sm"
                                                        placeholder="State explicit, actionable directives that the Principal Investigator must address in their revision matrix..."
                                                        value={directivesForRevisions}
                                                        onChange={(e) => setDirectivesForRevisions(e.target.value)}
                                                    />
                                                </div>

                                                {/* Committee Internal Notes */}
                                                <div className="mb-2">
                                                    <label className="fw-bold text-dark small mb-1">
                                                        Internal Committee Notes & Deliberation Record:
                                                    </label>
                                                    <textarea
                                                        rows="2"
                                                        className="form-control form-control-sm"
                                                        placeholder="Internal rationale, meeting minutes notes, or administrative reminders..."
                                                        value={summaryNotes}
                                                        onChange={(e) => setSummaryNotes(e.target.value)}
                                                    />
                                                </div>
                                            </div>

                                        </div>
                                    </div>

                                </div>
                            )}
                        </div>

                        {/* ======================================================== */}
                        {/* 5. MODAL FOOTER: ACTION WORKFLOW BAR                     */}
                        {/* ======================================================== */}
                        <div className="modal-footer bg-light border-top px-4 py-3 d-flex justify-content-between align-items-center flex-shrink-0">
                            <div className="d-flex align-items-center gap-2">
                                <span className="small text-muted">
                                    Status: <strong className="text-dark">{consolidationData?.consolidation_meta?.status || 'Draft'}</strong>
                                </span>
                                {lastSavedTime && (
                                    <span className="small text-secondary">
                                        • Last saved: {lastSavedTime}
                                    </span>
                                )}
                            </div>

                            <div className="d-flex align-items-center gap-2">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    disabled={isSubmitting}
                                    className="btn btn-sm btn-outline-secondary px-3"
                                >
                                    Close
                                </button>

                                <button
                                    type="button"
                                    onClick={() => handleSaveDraft(false)}
                                    disabled={isSubmitting || isLoading}
                                    className="btn btn-sm btn-outline-primary px-3 shadow-xs"
                                >
                                    {isSubmitting ? (
                                        <><span className="spinner-border spinner-border-sm me-1"></span>Saving...</>
                                    ) : (
                                        <><i className="bi bi-save me-1"></i>Save Draft</>
                                    )}
                                </button>

                                <button
                                    type="button"
                                    onClick={handleFinalizeDecision}
                                    disabled={isSubmitting || isLoading}
                                    className="btn btn-sm btn-theme-primary px-4 fw-bold shadow-xs"
                                >
                                    <i className="bi bi-check2-circle me-1"></i>Finalize & Issue Decision
                                </button>
                            </div>
                        </div>

                    </div>
                </div>
            </div>

            {/* Stage 5 Phase 3: Formal Offline PDF & Decision Letter Modal */}
            <ConsolidatedDecisionLetterModal
                show={showLetterPreview}
                onClose={() => setShowLetterPreview(false)}
                protocol={protocol}
                consolidationData={consolidationData}
                chairFindings={chairFindings}
                consolidatedRecommendation={consolidatedRecommendation}
                directivesForRevisions={directivesForRevisions}
                summaryNotes={summaryNotes}
                meetingDate={meetingDate}
                chairName={adminName}
            />
        </>
    );
}
