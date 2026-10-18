import React, { useState } from 'react';
import adzuSeal from '../../assets/AdZU Seal.png';
import { formatDate } from '../../utils/formatters';
import { printIsolatedElement } from '../../utils/printHelper';

// Generates the Consolidation Letter of the Ethics Chair with Offline PDF Generator

export default function ConsolidatedDecisionLetterModal({
    show,
    onClose,
    protocol,
    consolidationData,
    chairFindings = {},
    consolidatedRecommendation = 'Minor Revisions',
    directivesForRevisions = '',
    summaryNotes = '',
    meetingDate = '',
    chairName = 'Ethics Committee Chair'
}) {
    // Top-level hooks strictly before early returns to preserve Hook Count Invariance
    const [viewFilter, setViewFilter] = useState('actionable');
    const [isPrinting, setIsPrinting] = useState(false);

    if (!show) return null;

    // Protocol identification extraction
    const protocolCode = protocol?.protocol_code || protocol?.id || 'REC-PENDING';
    const researchTitle = protocol?.research_title || protocol?.title || 'Untitled Research Protocol';
    const proponentsList = (protocol?.proponents && protocol.proponents.length > 0)
        ? protocol.proponents.join(', ')
        : (protocol?.researchers && protocol.researchers.length > 0)
            ? protocol.researchers.join(', ')
            : 'Unspecified Proponents';
    const institution = protocol?.institution || 'Ateneo de Zamboanga University';
    const reviewType = protocol?.review_type || protocol?.type || 'EXPEDITED REVIEW';
    const cycleNumber = consolidationData?.consolidation_meta?.cycle_number || 1;
    const deliberationDate = meetingDate ? formatDate(meetingDate) : formatDate(new Date().toISOString());

    // Criteria sets
    const form11Criteria = consolidationData?.criteria_matrix?.form11 || [];
    const form12Criteria = consolidationData?.criteria_matrix?.form12 || [];

    // Helper: compute active finding for any criterion (prioritizing live Chair changes)
    const getItemState = (item) => {
        const live = chairFindings[item.question_id];
        const finding = live?.finding || item.chair_state?.finding || item.smart_default_finding || 'Satisfactory';
        const remarks = (live?.remarks !== undefined) 
            ? live.remarks 
            : (item.chair_state?.remarks || item.smart_default_remarks || '');
        const isActionRequired = (finding === 'Requires Modification' || finding === 'Unable to Assess');
        return { finding, remarks, isActionRequired };
    };

    // Filter criteria based on active view toggle
    const filterItems = (list) => {
        if (viewFilter === 'all') return list;
        return list.filter(item => getItemState(item).isActionRequired);
    };

    const displayForm11 = filterItems(form11Criteria);
    const displayForm12 = filterItems(form12Criteria);
    const totalActionItems = [...form11Criteria, ...form12Criteria].filter(i => getItemState(i).isActionRequired).length;

    // Handle Print via Isolated Canvas Engine
    const handleTriggerPrint = async () => {
        setIsPrinting(true);
        try {
            await printIsolatedElement('printable-decision-letter', `ADZU-REC Form 13 - ${protocolCode}`);
        } catch (err) {
            console.error('Error invoking isolated print:', err);
        } finally {
            setIsPrinting(false);
        }
    };

    // Decision Banner Configurations
    const getDecisionConfig = (rec) => {
        switch (rec) {
            case 'Approved':
                return {
                    title: 'ETHICALLY APPROVED',
                    badgeClass: 'bg-success text-white',
                    cardBorderClass: 'border-success',
                    accentColor: '#198754',
                    icon: 'bi-check-circle-fill',
                    guidelineText: 'The protocol meets international and national ethical guidelines for research involving human participants. Ethical clearance is granted for a maximum of one (1) calendar year from the date of this notice, subject to timely submission of annual progress reports and compliance with continuing review obligations.'
                };
            case 'Minor Revisions':
            case 'Minor Revisions Required':
                return {
                    title: 'MINOR REVISIONS REQUIRED',
                    badgeClass: 'bg-warning text-dark',
                    cardBorderClass: 'border-warning',
                    accentColor: '#d39e00',
                    icon: 'bi-pencil-square',
                    guidelineText: 'The Research Ethics Committee has determined that minor ethical modifications or clarifications are required. The Principal Investigator must submit a point-by-point response matrix accompanied by tracked and clean copies of revised protocol documents within fourteen (14) calendar days of receiving this notice.'
                };
            case 'Major Revisions':
            case 'Major Revision Required':
                return {
                    title: 'MAJOR REVISIONS REQUIRED',
                    badgeClass: 'bg-danger text-white',
                    cardBorderClass: 'border-danger',
                    accentColor: '#dc3545',
                    icon: 'bi-exclamation-triangle-fill',
                    guidelineText: 'Substantial ethical deficiencies or safety ambiguities have been identified. The Principal Investigator must restructure the protocol in accordance with the actionable directives below and submit a revised package for full committee re-deliberation within thirty (30) calendar days.'
                };
            case 'Disapproved':
                return {
                    title: 'DISAPPROVED',
                    badgeClass: 'bg-dark text-white',
                    cardBorderClass: 'border-dark',
                    accentColor: '#212529',
                    icon: 'bi-x-circle-fill',
                    guidelineText: 'The proposed research violates foundational ethical principles or presents unacceptable risks to human participants that cannot be sufficiently mitigated. Protocol recruitment and research activities are strictly prohibited under Ateneo de Zamboanga University auspices.'
                };
            default:
                return {
                    title: rec ? rec.toUpperCase() : 'UNDER REVIEW',
                    badgeClass: 'bg-primary text-white',
                    cardBorderClass: 'border-primary',
                    accentColor: '#060297',
                    icon: 'bi-info-circle-fill',
                    guidelineText: 'Please refer to the specific directives articulated by the Ethics Committee Chair below.'
                };
        }
    };

    const decisionConfig = getDecisionConfig(consolidatedRecommendation);

    return (
        <>
            {/* Inline Print & Screen Stylesheet */}
            <style>
                {`
                @media screen {
                    .letter-preview-backdrop {
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
                    .letter-sheet-container {
                        max-width: 860px;
                        width: 100%;
                        margin: 24px auto;
                        background: #ffffff;
                        box-shadow: 0 10px 30px rgba(0,0,0,0.22);
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
                    .letter-preview-backdrop,
                    .letter-sheet-container,
                    #printable-decision-letter,
                    #printable-decision-letter * {
                        visibility: visible !important;
                    }
                    .no-print {
                        display: none !important;
                    }
                    .letter-preview-backdrop {
                        position: static !important;
                        width: 100% !important;
                        height: auto !important;
                        background: transparent !important;
                        backdrop-filter: none !important;
                        overflow: visible !important;
                    }
                    .letter-sheet-container {
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

            <div className="letter-preview-backdrop">
                
                {/* 1. TOP INTERACTIVE TOOLBAR (Hidden in Print) */}
                <div className="bg-dark text-white px-4 py-2 d-flex flex-wrap align-items-center justify-content-between gap-3 flex-shrink-0 no-print border-bottom border-secondary">
                    <div className="d-flex align-items-center gap-2">
                        <i className="bi bi-file-earmark-pdf-fill text-danger fs-4"></i>
                        <div>
                            <h6 className="mb-0 fw-bold text-white">
                                Official Decision Letter & Directives Matrix Preview
                            </h6>
                            <small className="text-secondary font-monospace">
                                ADZU-REC Form 13 • {protocolCode} • Cycle {cycleNumber}
                            </small>
                        </div>
                    </div>

                    {/* Filter Segmented Control */}
                    <div className="d-flex align-items-center gap-2">
                        <span className="small text-secondary me-1 d-none d-md-inline">Scope:</span>
                        <div className="btn-group btn-group-sm shadow-xs" role="group">
                            <button
                                type="button"
                                onClick={() => setViewFilter('actionable')}
                                className={`btn ${viewFilter === 'actionable' ? 'btn-primary fw-bold' : 'btn-outline-light'}`}
                            >
                                <i className="bi bi-exclamation-circle me-1"></i>
                                Actionable Items ({totalActionItems})
                            </button>
                            <button
                                type="button"
                                onClick={() => setViewFilter('all')}
                                className={`btn ${viewFilter === 'all' ? 'btn-primary fw-bold' : 'btn-outline-light'}`}
                            >
                                <i className="bi bi-list-check me-1"></i>
                                Complete Matrix ({form11Criteria.length + form12Criteria.length})
                            </button>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="d-flex align-items-center gap-2">
                        <button
                            type="button"
                            onClick={handleTriggerPrint}
                            disabled={isPrinting}
                            className="btn btn-sm btn-success fw-bold d-flex align-items-center gap-2 shadow-xs"
                        >
                            {isPrinting ? (
                                <>
                                    <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                                    <span>Preparing PDF...</span>
                                </>
                            ) : (
                                <>
                                    <i className="bi bi-printer-fill"></i>
                                    <span>Print / Save as PDF</span>
                                </>
                            )}
                        </button>

                        <button
                            type="button"
                            onClick={onClose}
                            className="btn btn-sm btn-outline-light"
                            aria-label="Close"
                        >
                            <i className="bi bi-x-lg"></i>
                            <span className="ms-1 d-none d-sm-inline">Close</span>
                        </button>
                    </div>
                </div>

                {/* 2. SCROLLABLE DOCUMENT VIEWPORT */}
                <div className="flex-grow-1 overflow-y-auto px-3 py-2">
                    <div className="letter-sheet-container p-4 p-md-5" id="printable-decision-letter">
                        
                        {/* A. INSTITUTIONAL LETTERHEAD */}
                        <div className="d-flex align-items-center justify-content-between border-bottom pb-3 mb-4 page-break-avoid">
                            {/* University Seal */}
                            <div className="d-flex align-items-center gap-3">
                                <img
                                    src={adzuSeal}
                                    alt="Ateneo de Zamboanga University Seal"
                                    style={{ width: '78px', height: '78px', objectFit: 'contain' }}
                                    onError={(e) => {
                                        e.target.style.display = 'none';
                                    }}
                                />
                                <div>
                                    <h6 className="fw-bold mb-0 text-uppercase" style={{ letterSpacing: '0.05em', color: '#060297', fontSize: '0.95rem' }}>
                                        Ateneo de Zamboanga University
                                    </h6>
                                    <h5 className="fw-bolder mb-0 text-dark" style={{ letterSpacing: '0.02em', fontSize: '1.1rem' }}>
                                        RESEARCH ETHICS COMMITTEE (AdZU-REC)
                                    </h5>
                                    <p className="text-secondary mb-0 small" style={{ fontSize: '0.78rem' }}>
                                        PHREB Level II Accredited Research Ethics Committee<br />
                                        Fr. Eusebio Salvador SJ Campus, La Purisima St., Zamboanga City 7000, Philippines<br />
                                        Email: <span className="font-monospace text-dark">rec@adzu.edu.ph</span> • Web: <span className="font-monospace text-dark">www.adzu.edu.ph/rec</span>
                                    </p>
                                </div>
                            </div>

                            {/* Document Control Box */}
                            <div className="text-end border p-2 rounded bg-light" style={{ minWidth: '155px' }}>
                                <div className="fw-bold font-monospace text-theme-primary small">
                                    ADZU-REC Form 13
                                </div>
                                <div className="text-uppercase fw-semibold text-secondary" style={{ fontSize: '0.68rem' }}>
                                    Decision Notice
                                </div>
                                <div className="small font-monospace text-dark fw-bold">
                                    Cycle {cycleNumber}
                                </div>
                                <div className="text-muted" style={{ fontSize: '0.68rem' }}>
                                    {deliberationDate}
                                </div>
                            </div>
                        </div>

                        {/* B. DOCUMENT TITLE BANNER */}
                        <div className="text-center mb-4 page-break-avoid">
                            <h5 className="fw-bold text-uppercase mb-1" style={{ letterSpacing: '0.04em', color: '#060297' }}>
                                Formal Notice of Committee Action & Actionable Directives
                            </h5>
                            <p className="text-muted small mb-0">
                                Synthesis of Protocol & Informed Consent Ethical Evaluation
                            </p>
                        </div>

                        {/* C. PROTOCOL METADATA LEDGER*/}
                        <div className="border rounded mb-4 overflow-hidden page-break-avoid">
                            <div className="bg-light px-3 py-2 border-bottom fw-bold text-uppercase small text-dark d-flex justify-content-between align-items-center">
                                <span><i className="bi bi-folder2-open me-2 text-primary"></i>Protocol Profile</span>
                                <span className="badge bg-secondary font-monospace">{reviewType}</span>
                            </div>
                            <table className="table table-sm table-bordered mb-0 small" style={{ fontSize: '0.82rem' }}>
                                <tbody>
                                    <tr>
                                        <td className="bg-light fw-bold text-secondary" style={{ width: '22%' }}>Protocol Code:</td>
                                        <td className="fw-bold font-monospace text-dark" style={{ width: '28%' }}>{protocolCode}</td>
                                        <td className="bg-light fw-bold text-secondary" style={{ width: '22%' }}>Deliberation Date:</td>
                                        <td className="fw-semibold text-dark" style={{ width: '28%' }}>{deliberationDate}</td>
                                    </tr>
                                    <tr>
                                        <td className="bg-light fw-bold text-secondary">Study Title:</td>
                                        <td colSpan="3" className="fw-bold text-dark">{researchTitle}</td>
                                    </tr>
                                    <tr>
                                        <td className="bg-light fw-bold text-secondary">Proponent / PI:</td>
                                        <td className="fw-semibold text-dark">{proponentsList}</td>
                                        <td className="bg-light fw-bold text-secondary">Affiliation:</td>
                                        <td className="text-dark">{institution}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        {/* D. OFFICIAL COMMITTEE DECISION BANNER */}
                        <div className={`border-start border-4 ${decisionConfig.cardBorderClass} bg-light p-3 rounded mb-4 page-break-avoid shadow-xs`}>
                            <div className="d-flex align-items-center justify-content-between mb-2 flex-wrap gap-2">
                                <div className="d-flex align-items-center gap-2">
                                    <i className={`bi ${decisionConfig.icon} fs-4`} style={{ color: decisionConfig.accentColor }}></i>
                                    <div>
                                        <span className="text-muted text-uppercase small fw-bold d-block" style={{ fontSize: '0.68rem' }}>
                                            Official Committee Determination:
                                        </span>
                                        <h5 className="mb-0 fw-bold" style={{ color: decisionConfig.accentColor }}>
                                            {decisionConfig.title}
                                        </h5>
                                    </div>
                                </div>
                                <span className={`badge ${decisionConfig.badgeClass} px-3 py-2 font-monospace fs-6`}>
                                    Status: {consolidatedRecommendation}
                                </span>
                            </div>
                            <p className="small text-secondary mb-0" style={{ lineHeight: '1.45', fontSize: '0.8125rem' }}>
                                {decisionConfig.guidelineText}
                            </p>
                        </div>

                        {/* E. CHAIR DIRECTIVES & DELIBERATION NOTES */}
                        {directivesForRevisions && (
                            <div className="mb-4 page-break-avoid">
                                <h6 className="fw-bold text-dark text-uppercase small mb-2 d-flex align-items-center gap-2">
                                    <i className="bi bi-megaphone-fill text-primary"></i>
                                    General Committee Directives for Applicant:
                                </h6>
                                <div className="p-3 bg-light border rounded small" style={{ fontSize: '0.825rem', whiteSpace: 'pre-line', lineHeight: '1.5' }}>
                                    {directivesForRevisions}
                                </div>
                            </div>
                        )}

                        {summaryNotes && (
                            <div className="mb-4 page-break-avoid">
                                <h6 className="fw-bold text-secondary text-uppercase small mb-1" style={{ fontSize: '0.72rem' }}>
                                    Deliberation Summary Notes & Minutes Reference:
                                </h6>
                                <div className="p-2 border rounded bg-white text-muted small fst-italic" style={{ fontSize: '0.78rem', whiteSpace: 'pre-line' }}>
                                    "{summaryNotes}"
                                </div>
                            </div>
                        )}

                        {/* F. ACTIONABLE DIRECTIVES & EVALUATION MATRIX */}
                        <div className="mb-4">
                            <div className="d-flex justify-content-between align-items-center mb-2 page-break-avoid">
                                <h6 className="fw-bold text-dark text-uppercase small mb-0 d-flex align-items-center gap-2">
                                    <i className="bi bi-table text-primary"></i>
                                    Actionable Directives & Evaluation Matrix
                                </h6>
                                <span className="small text-muted font-monospace" style={{ fontSize: '0.72rem' }}>
                                    Showing: {viewFilter === 'actionable' ? 'Criteria Requiring Action' : 'All Assessed Criteria'}
                                </span>
                            </div>

                            <p className="text-secondary small mb-3 page-break-avoid" style={{ fontSize: '0.75rem' }}>
                                The Principal Investigator must address each finding below in the revised protocol submission. The right-hand column is formatted for offline compliance tracking and response matrix referencing.
                            </p>

                            {/* SECTION 1: FORM 11 (PROTOCOL EVALUATION) */}
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
                                    <table className="table table-bordered table-sm align-middle mb-3 small" style={{ fontSize: '0.8rem' }}>
                                        <thead className="table-light">
                                            <tr>
                                                <th style={{ width: '30%' }}>Criterion & Ethical Requirement</th>
                                                <th style={{ width: '18%' }} className="text-center">Committee Assessment</th>
                                                <th style={{ width: '37%' }}>Specific Directive / Required Action</th>
                                                <th style={{ width: '15%' }} className="text-center">Proponent Action</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {displayForm11.map((item) => {
                                                const state = getItemState(item);
                                                const isMod = state.finding === 'Requires Modification';

                                                return (
                                                    <tr key={item.question_id} className={isMod ? 'table-warning-subtle' : ''}>
                                                        <td className="align-top">
                                                            <strong className="text-dark d-block">{item.label}</strong>
                                                            <span className="text-muted font-monospace" style={{ fontSize: '0.68rem' }}>
                                                                {item.section_title} • #{item.criterion_key}
                                                            </span>
                                                        </td>
                                                        <td className="align-top text-center">
                                                            <span className={`badge ${
                                                                state.finding === 'Satisfactory' ? 'bg-success-subtle text-success border border-success' :
                                                                state.finding === 'Requires Modification' ? 'bg-warning-subtle text-dark border border-warning' :
                                                                state.finding === 'Unable to Assess' ? 'bg-danger-subtle text-danger border border-danger' :
                                                                'bg-light text-secondary border'
                                                            }`} style={{ fontSize: '0.72rem' }}>
                                                                {state.finding}
                                                            </span>
                                                        </td>
                                                        <td className="align-top">
                                                            <div className="text-dark fw-medium" style={{ whiteSpace: 'pre-line' }}>
                                                                {state.remarks || <span className="text-muted fst-italic">No specific directives recorded.</span>}
                                                            </div>
                                                        </td>
                                                        <td className="align-top text-center bg-light">
                                                            <div className="font-monospace text-muted" style={{ fontSize: '0.75rem' }}>
                                                                [ &nbsp; ] Done
                                                            </div>
                                                            <div className="text-muted mt-1" style={{ fontSize: '0.65rem' }}>
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

                            {/* SECTION 2: FORM 12 (INFORMED CONSENT EVALUATION) */}
                            <div className="mb-4">
                                <div className="bg-primary-subtle text-primary border border-primary-subtle px-3 py-1 fw-bold small text-uppercase mb-2 rounded page-break-avoid d-flex justify-content-between">
                                    <span>Part II: Informed Consent Process & Documentation (ADZU-REC Form 12)</span>
                                    <span>{displayForm12.length} Items Listed</span>
                                </div>

                                {displayForm12.length === 0 ? (
                                    <div className="alert alert-success py-2 px-3 small border-success-subtle mb-3">
                                        <i className="bi bi-check-all me-1"></i>
                                        All informed consent documentation criteria (Form 12) satisfied without mandatory modifications.
                                    </div>
                                ) : (
                                    <table className="table table-bordered table-sm align-middle mb-3 small" style={{ fontSize: '0.8rem' }}>
                                        <thead className="table-light">
                                            <tr>
                                                <th style={{ width: '30%' }}>Consent Element & Standard</th>
                                                <th style={{ width: '18%' }} className="text-center">Committee Assessment</th>
                                                <th style={{ width: '37%' }}>Specific Directive / Required Action</th>
                                                <th style={{ width: '15%' }} className="text-center">Proponent Action</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {displayForm12.map((item) => {
                                                const state = getItemState(item);
                                                const isMod = state.finding === 'Requires Modification';

                                                return (
                                                    <tr key={item.question_id} className={isMod ? 'table-warning-subtle' : ''}>
                                                        <td className="align-top">
                                                            <strong className="text-dark d-block">{item.label}</strong>
                                                            <span className="text-muted font-monospace" style={{ fontSize: '0.68rem' }}>
                                                                {item.section_title} • #{item.criterion_key}
                                                            </span>
                                                        </td>
                                                        <td className="align-top text-center">
                                                            <span className={`badge ${
                                                                state.finding === 'Satisfactory' ? 'bg-success-subtle text-success border border-success' :
                                                                state.finding === 'Requires Modification' ? 'bg-warning-subtle text-dark border border-warning' :
                                                                state.finding === 'Unable to Assess' ? 'bg-danger-subtle text-danger border border-danger' :
                                                                'bg-light text-secondary border'
                                                            }`} style={{ fontSize: '0.72rem' }}>
                                                                {state.finding}
                                                            </span>
                                                        </td>
                                                        <td className="align-top">
                                                            <div className="text-dark fw-medium" style={{ whiteSpace: 'pre-line' }}>
                                                                {state.remarks || <span className="text-muted fst-italic">No specific directives recorded.</span>}
                                                            </div>
                                                        </td>
                                                        <td className="align-top text-center bg-light">
                                                            <div className="font-monospace text-muted" style={{ fontSize: '0.75rem' }}>
                                                                [ &nbsp; ] Done
                                                            </div>
                                                            <div className="text-muted mt-1" style={{ fontSize: '0.65rem' }}>
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
                        </div>

                        {/* G. MANDATORY RESUBMISSION GUIDELINES */}
                        <div className="border rounded p-3 mb-4 bg-light page-break-avoid">
                            <h6 className="fw-bold text-dark text-uppercase small mb-2 d-flex align-items-center gap-1">
                                <i className="bi bi-info-circle-fill text-primary"></i>
                                Mandatory Instructions for Resubmission & Compliance:
                            </h6>
                            <ol className="mb-0 text-secondary ps-3 small" style={{ fontSize: '0.78rem', lineHeight: '1.5' }}>
                                <li>
                                    <strong>Point-by-Point Clarification Matrix:</strong> Prepare a formal tabular document explicitly quoting each Committee Directive above, paired with the specific amendment made and corresponding protocol page/line numbers.
                                </li>
                                <li>
                                    <strong>Tracked & Clean Protocol Copies:</strong> Submit two (2) electronic copies: (a) one copy highlighting all modifications in tracked changes, and (b) one clean copy for committee archival.
                                </li>
                                <li>
                                    <strong>Zero Research Activity Mandate:</strong> In accordance with PHREB Standard Operating Procedures, <em>no recruitment, consent gathering, or data collection</em> may commence prior to receipt of the signed <strong>Certificate of Ethical Clearance</strong>.
                                </li>
                            </ol>
                        </div>

                        {/* H. OFFICIAL SIGN-OFF & ATTESTATION BLOCK */}
                        <div className="pt-3 border-top page-break-avoid">
                            <div className="row g-4 align-items-end">
                                {/* Secretariat Archival Stamp */}
                                <div className="col-6">
                                    <div className="border p-2 rounded bg-light" style={{ maxWidth: '280px' }}>
                                        <div className="small fw-bold text-uppercase text-secondary" style={{ fontSize: '0.65rem' }}>
                                            AdZU REC Secretariat Archival
                                        </div>
                                        <div className="font-monospace text-dark mt-1" style={{ fontSize: '0.75rem' }}>
                                            Doc Ref: {protocolCode}-ACT{cycleNumber}
                                        </div>
                                        <div className="text-muted" style={{ fontSize: '0.68rem' }}>
                                            Date Dispatched: {deliberationDate}
                                        </div>
                                    </div>
                                </div>

                                {/* Chair Signature Block */}
                                <div className="col-6 text-end">
                                    <div className="d-inline-block text-center" style={{ minWidth: '240px' }}>
                                        <div style={{ height: '44px' }}></div>
                                        <div className="border-bottom border-dark pb-1 mb-1 fw-bold text-dark text-uppercase" style={{ fontSize: '0.88rem' }}>
                                            {chairName}
                                        </div>
                                        <div className="text-secondary small fw-semibold" style={{ fontSize: '0.75rem' }}>
                                            Chair, Research Ethics Committee
                                        </div>
                                        <div className="text-muted" style={{ fontSize: '0.68rem' }}>
                                            Ateneo de Zamboanga University
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
