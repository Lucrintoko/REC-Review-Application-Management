import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { apiClient } from '../services/api';
import adzuSeal from '../assets/AdZU Seal.png';

function AdminHome() {
    const navigate = useNavigate();

    // Takes the admin's name, role, and ID from localStorage
    const adminName = localStorage.getItem('adminName') || "Admin";
    const adminRole = localStorage.getItem('adminRole') || "Secretariat Staff";
    const adminId = localStorage.getItem('adminId');

    // Authentication guard
    useEffect(() => {
        if (!localStorage.getItem('adminName')) {
            navigate('/admin/login');
        }
    }, [navigate]);

    // Data and Lifecycle State
    const [protocolData, setProtocolData] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [fetchError, setFetchError] = useState(null);

    // Micro-Interaction Hover Trackers
    const [hoveredKpi, setHoveredKpi] = useState(null);
    const [focusedKpi, setFocusedKpi] = useState(null);
    const [hoveredTrack, setHoveredTrack] = useState(null);
    const [focusedTrack, setFocusedTrack] = useState(null);

    // Administrative Inbox Pagination State (3 items per page for fold harmony)
    const [inboxPage, setInboxPage] = useState(1);
    const INBOX_ITEMS_PER_PAGE = 3;

    // Centralized Data Fetching
    const fetchProtocols = useCallback(() => {
        let isMounted = true;
        setIsLoading(true);
        setFetchError(null);

        apiClient.get('/applications')
            .then(databaseJSON => {
                if (!isMounted) return;
                const rawList = Array.isArray(databaseJSON?.data) ? databaseJSON.data : [];
                const formattedData = rawList.map(row => ({
                    application_id: row.application_id,
                    protocol_code: row.protocol_code || 'N/A',
                    id: row.protocol_code || `APP-${row.application_id}`,
                    title: row.research_title || 'Untitled Protocol',
                    type: String(row.review_type || 'Undetermined').trim().toUpperCase(),
                    research_type: String(row.research_type || '').trim().toUpperCase(),
                    status: String(row.status || '').trim().toUpperCase(),
                    submission_date: row.submission_date || null,
                    department: row.applicant_department || row.form_data?.institution_department || 'General Academic',
                    affiliation: row.applicant_affiliation || 'Internal',
                    proponent_name: (row.applicant_first_name && row.applicant_last_name)
                        ? `${row.applicant_first_name} ${row.applicant_last_name}`
                        : (row.form_data?.contact_name || 'N/A'),
                    submitDate: row.submission_date 
                        ? new Date(row.submission_date).toLocaleDateString('en-US', {
                            month: 'short', day: 'numeric', year: 'numeric'
                        })
                        : 'N/A',
                    form_data: row.form_data || null,
                }));
                setProtocolData(formattedData);
                setIsLoading(false);
            })
            .catch(error => {
                if (!isMounted) return;
                console.error("Error Fetching Data:", error);
                setFetchError(error.message || "Failed to connect to backend server.");
                setIsLoading(false);
            });

        return () => { isMounted = false; };
    }, []);

    useEffect(() => {
        const cleanup = fetchProtocols();
        return cleanup;
    }, [fetchProtocols]);

    // OPERATIONAL METRICS & KPI INVARIANTS
    const totalProtocols = protocolData.length;

    // Pillar 1: Total Active Protocols (Excludes Drafts, Rejected, and Withdrawn)
    const totalActiveProtocols = useMemo(() => {
        return protocolData.filter(p => !['DRAFT', 'REJECTED', 'WITHDRAWN'].includes(p.status)).length;
    }, [protocolData]);

    // Pillar 2: Action Required / Triage Queue (Pre-review Administrative Bottlenecks)
    const actionRequiredList = useMemo(() => {
        const triageStatuses = ['PROTOCOLS SUBMITTED', 'PAYMENT PENDING', 'PAYMENT VERIFIED', 'TYPE OF REVIEW'];
        return protocolData.filter(p => triageStatuses.includes(p.status));
    }, [protocolData]);
    const actionRequiredCount = actionRequiredList.length;

    // Pillar 3: Active Workload Queue (In Active Committee Review & Revisions)
    const activeWorkloadList = useMemo(() => {
        const reviewStatuses = ['ONGOING REVIEW', 'CONSOLIDATION OF EVALUATION', 'REVISIONS SUBMITTED', 'AMENDMENTS'];
        return protocolData.filter(p => reviewStatuses.includes(p.status));
    }, [protocolData]);
    const activeWorkloadCount = activeWorkloadList.length;

    // Pillar 4: Certified Clearances & Completed Outcomes
    const clearanceGranted = useMemo(() => protocolData.filter(p => p.status === 'CLEARANCE GRANTED').length, [protocolData]);
    const decisionLetterIssued = useMemo(() => protocolData.filter(p => p.status === 'DECISION LETTER ISSUED').length, [protocolData]);
    const amendments = useMemo(() => protocolData.filter(p => p.status === 'AMENDMENTS').length, [protocolData]);
    const ongoingReview = useMemo(() => protocolData.filter(p => p.status === 'ONGOING REVIEW').length, [protocolData]);

    const clearanceYieldRate = useMemo(() => {
        if (totalActiveProtocols === 0) return 0;
        return Math.round((clearanceGranted / totalActiveProtocols) * 100);
    }, [clearanceGranted, totalActiveProtocols]);

    // Review Track Distribution Counts
    const exempted = useMemo(() => protocolData.filter(p => p.type === 'EXEMPTED').length, [protocolData]);
    const expedited = useMemo(() => protocolData.filter(p => p.type === 'EXPEDITED').length, [protocolData]);
    const fullBoard = useMemo(() => protocolData.filter(p => p.type === 'FULL BOARD').length, [protocolData]);
    const undetermined = useMemo(() => protocolData.filter(p => !['EXEMPTED', 'EXPEDITED', 'FULL BOARD'].includes(p.type)).length, [protocolData]);

    // Priority Triage Queue (Top 6 oldest submissions needing administrative action - FIFO SLA)
    const priorityTriageQueue = useMemo(() => {
        return [...actionRequiredList]
            .sort((a, b) => {
                const timeA = a.submission_date ? new Date(a.submission_date).getTime() : 0;
                const timeB = b.submission_date ? new Date(b.submission_date).getTime() : 0;
                if (timeA !== timeB) return timeA - timeB; // Oldest submissions first for SLA compliance
                return (a.application_id || 0) - (b.application_id || 0); // Deterministic tie-breaker
            })
            .slice(0, 6);
    }, [actionRequiredList]);
    const totalInboxPages = Math.ceil(priorityTriageQueue.length / INBOX_ITEMS_PER_PAGE) || 1;

    // Guards page index if queue items change
    useEffect(() => {
        if (inboxPage > totalInboxPages) {
            setInboxPage(totalInboxPages);
        }
    }, [inboxPage, totalInboxPages]);

    const paginatedTriageQueue = useMemo(() => {
        const startIndex = (inboxPage - 1) * INBOX_ITEMS_PER_PAGE;
        return priorityTriageQueue.slice(startIndex, startIndex + INBOX_ITEMS_PER_PAGE);
    }, [priorityTriageQueue, inboxPage]);

    // Review Track Telemetry Breakdown
    const trackBreakdown = useMemo(() => {
        const total = totalProtocols || 1;
        return [
            {
                key: 'EXEMPTED',
                label: 'Exempted',
                count: exempted,
                pct: Math.round((exempted / total) * 100),
                color: '#198754',
                bgClass: 'bg-success',
                badgeClass: 'bg-success-subtle text-success border border-success-subtle',
                governance: '1 Reviewer (Chair Solo)',
                scope: 'Negligible risk · Anonymized secondary data & public evaluations',
                filterType: 'EXEMPTED'
            },
            {
                key: 'EXPEDITED',
                label: 'Expedited',
                count: expedited,
                pct: Math.round((expedited / total) * 100),
                color: '#b8860b',
                bgClass: 'bg-warning',
                badgeClass: 'bg-warning-subtle text-warning-emphasis border border-warning-subtle',
                governance: '3 Reviewers (2P + 1NP)',
                scope: 'Minimal risk · Non-invasive sampling & routine adult studies',
                filterType: 'EXPEDITED'
            },
            {
                key: 'FULL_BOARD',
                label: 'Full Board',
                count: fullBoard,
                pct: Math.round((fullBoard / total) * 100),
                color: '#0d6efd',
                bgClass: 'bg-primary',
                badgeClass: 'bg-primary-subtle text-primary border border-primary-subtle',
                governance: 'Full Committee Quorum',
                scope: 'Greater than minimal risk · Vulnerable populations & clinical trials',
                filterType: 'FULL BOARD'
            },
            {
                key: 'UNDETERMINED',
                label: 'Undetermined',
                count: undetermined,
                pct: Math.round((undetermined / total) * 100),
                color: '#6c757d',
                bgClass: 'bg-secondary',
                badgeClass: 'bg-secondary-subtle text-secondary border border-secondary-subtle',
                governance: 'Pending Triage',
                scope: 'Initial intake · Awaiting screening & Chair triage',
                filterType: 'UNDETERMINED'
            }
        ];
    }, [totalProtocols, exempted, expedited, fullBoard, undetermined]);

    // Turnaround Age Calculator (Midnight-aligned Calendar Difference)
    const getTurnaroundDays = (submissionDateStr) => {
        if (!submissionDateStr) return null;
        const cleanStr = String(submissionDateStr).split('T')[0];
        const parts = cleanStr.split('-');
        if (parts.length !== 3) return null;
        const [year, month, day] = parts.map(Number);
        if (isNaN(year) || isNaN(month) || isNaN(day)) return null;

        const submissionMidnight = new Date(year, month - 1, day);
        const now = new Date();
        const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        const diffMs = todayMidnight.getTime() - submissionMidnight.getTime();
        const elapsedDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        return Math.max(0, elapsedDays);
    };

    // Urgency-Graded Turnaround Badge Renderer
    const renderTurnaroundBadge = (days) => {
        if (days === null || days === undefined) {
            return (
                <span className="badge bg-light text-secondary border rounded-pill font-monospace" style={{ fontSize: '0.70rem' }}>
                    <i className="bi bi-clock me-1"></i>--
                </span>
            );
        }
        if (days <= 3) {
            return (
                <span className="badge bg-success-subtle text-success-emphasis border border-success-subtle rounded-pill font-monospace fw-semibold" style={{ fontSize: '0.70rem' }} title={`Submitted ${days} day(s) ago (Within 3d target)`}>
                    <i className="bi bi-check-circle me-1"></i>{days}d ago
                </span>
            );
        }
        if (days <= 7) {
            return (
                <span className="badge bg-warning-subtle text-warning-emphasis border border-warning-subtle rounded-pill font-monospace fw-semibold" style={{ fontSize: '0.70rem' }} title={`Submitted ${days} day(s) ago (Approaching 7d threshold)`}>
                    <i className="bi bi-hourglass-split me-1"></i>{days}d ago
                </span>
            );
        }
        return (
            <span className="badge bg-danger-subtle text-danger-emphasis border border-danger-subtle rounded-pill font-monospace fw-bold" style={{ fontSize: '0.70rem' }} title={`Submitted ${days} day(s) ago (Overdue: exceeds 7d triage threshold)`}>
                <i className="bi bi-exclamation-triangle-fill me-1"></i>{days}d ago
            </span>
        );
    };

    // Helper for keyboard activation on role="button" 
    const handleKeyActivate = (e, callback) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            callback();
        }
    };

    // Review Track Pill Renderers
    const renderTrackBadge = (type) => {
        switch (type) {
            case 'EXEMPTED':
                return <span className="badge bg-success-subtle text-success-emphasis border border-success-subtle rounded-pill px-2 py-1 small fw-semibold" style={{ fontSize: '0.70rem' }}>Exempted</span>;
            case 'EXPEDITED':
                return <span className="badge bg-warning-subtle text-warning-emphasis border border-warning-subtle rounded-pill px-2 py-1 small fw-semibold" style={{ fontSize: '0.70rem' }}>Expedited</span>;
            case 'FULL BOARD':
            case 'FULL_BOARD':
                return <span className="badge bg-primary-subtle text-primary-emphasis border border-primary-subtle rounded-pill px-2 py-1 small fw-semibold" style={{ fontSize: '0.70rem' }}>Full Board</span>;
            default:
                return <span className="badge bg-secondary-subtle text-secondary-emphasis border border-secondary-subtle rounded-pill px-2 py-1 small fw-semibold" style={{ fontSize: '0.70rem' }}>Undetermined</span>;
        }
    };

    // WCAG AAA Compliant Status Pill Renderer
    const renderStatusPill = (status) => {
        switch (status) {
            case 'PROTOCOLS SUBMITTED':
                return <span className="badge bg-primary-subtle text-primary-emphasis border border-primary-subtle rounded-pill px-2 py-1 small fw-semibold" style={{ fontSize: '0.70rem' }}>New Intake</span>;
            case 'PAYMENT PENDING':
                return <span className="badge bg-danger-subtle text-danger-emphasis border border-danger-subtle rounded-pill px-2 py-1 small fw-semibold" style={{ fontSize: '0.70rem' }}>Payment Due</span>;
            case 'PAYMENT VERIFIED':
                return <span className="badge bg-info-subtle text-info-emphasis border border-info-subtle rounded-pill px-2 py-1 small fw-semibold" style={{ fontSize: '0.70rem' }}>Payment OK</span>;
            case 'TYPE OF REVIEW':
                return <span className="badge bg-warning-subtle text-warning-emphasis border border-warning-subtle rounded-pill px-2 py-1 small fw-semibold" style={{ fontSize: '0.70rem' }}>Track Needed</span>;
            default:
                return <span className="badge bg-secondary-subtle text-secondary-emphasis border border-secondary-subtle rounded-pill px-2 py-1 small fw-semibold" style={{ fontSize: '0.70rem' }}>{status}</span>;
        }
    };

    // Resolves action bottleneck metadata, iconography, and smart CTA labels
    const getActionMeta = (status) => {
        switch (status) {
            case 'PROTOCOLS SUBMITTED':
                return {
                    label: 'Action: Initial Intake Screening',
                    cta: 'Screen Intake →',
                    icon: 'bi-clipboard-check',
                    badgeClass: 'bg-primary-subtle text-primary border-primary-subtle'
                };
            case 'PAYMENT PENDING':
                return {
                    label: 'Action: Verify Payment Proof',
                    cta: 'Verify Payment →',
                    icon: 'bi-receipt',
                    badgeClass: 'bg-danger-subtle text-danger-emphasis border-danger-subtle'
                };
            case 'PAYMENT VERIFIED':
                return {
                    label: 'Action: Assign Review Track (Payment Cleared)',
                    cta: 'Assign Track →',
                    icon: 'bi-check2-circle',
                    badgeClass: 'bg-info-subtle text-info-emphasis border-info-subtle'
                };
            case 'TYPE OF REVIEW':
                return {
                    label: 'Action: Assign Review Track (Chair Decision Needed)',
                    cta: 'Assign Track →',
                    icon: 'bi-diagram-3-fill',
                    badgeClass: 'bg-warning-subtle text-warning-emphasis border-warning-subtle'
                };
            default:
                return {
                    label: 'Action: Administrative Triage',
                    cta: 'Triage Protocol →',
                    icon: 'bi-arrow-right-circle',
                    badgeClass: 'bg-secondary-subtle text-secondary-emphasis border-secondary-subtle'
                };
        }
    };

    // Micro-Interaction Styles for Interactive KPI Cards
    const getKpiCardStyle = (cardId, accentColor) => {
        const isActive = hoveredKpi === cardId || focusedKpi === cardId;
        return {
            borderLeft: `4px solid ${accentColor}`,
            minHeight: '168px',
            transition: 'transform 0.18s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.18s ease',
            transform: isActive ? 'translateY(-4px)' : 'none',
            boxShadow: isActive 
                ? '0 12px 24px -4px rgba(0, 0, 0, 0.09), 0 4px 8px -2px rgba(0, 0, 0, 0.04)' 
                : '0 1px 3px rgba(0, 0, 0, 0.04)',
            cursor: 'pointer'
        };
    };

    return (
        <div className="min-vh-100 d-flex flex-column bg-body-tertiary">
            {/* EXECUTIVE TOP BAR */}
            <header className="brand-header shadow-sm py-3 py-lg-4 px-3 px-md-4" style={{ backgroundColor: '#003366' }}>
                <div className="container-fluid d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 p-0">
                    
                    {/* Identity & Session Block */}
                    <div className="d-flex align-items-center gap-3">
                        <img 
                            src={adzuSeal} 
                            alt="Ateneo de Zamboanga University Seal" 
                            aria-hidden="true"
                            className="img-fluid rounded-circle bg-white p-1 shadow-sm"
                            style={{ width: '48px', height: '48px', objectFit: 'contain' }}
                        />
                        <div>
                            <div className="d-flex align-items-center gap-2 flex-wrap">
                                <h4 className="mb-0 fw-bold text-white">Welcome back, {adminName}</h4>
                                <span className="badge bg-white text-primary rounded-pill px-2 py-1 small fw-bold">
                                    {adminRole}
                                </span>
                                <span className="badge bg-success-subtle text-success border border-success-subtle rounded-pill px-2 py-1 small fw-semibold d-inline-flex align-items-center">
                                    <span className="spinner-grow spinner-grow-sm me-1 text-success" style={{ width: '6px', height: '6px' }} role="status"></span>
                                    Live Ops • All-Time
                                </span>
                            </div>
                            <small className="text-light opacity-75 d-block mt-1">
                                Ateneo Ethics Research Board • Executive Administration & Review Portal
                            </small>
                        </div>
                    </div>

                    {/* Quick Action Navigation CTAs */}
                    <div className="d-flex align-items-center gap-2 flex-wrap">
                        <Link 
                            to="/admin/dashboard" 
                            className="btn btn-light text-primary fw-semibold px-3 py-2 shadow-sm d-inline-flex align-items-center"
                            style={{ minHeight: '44px' }}
                        >
                            <i className="bi bi-folder2-open me-2 fs-6"></i>
                            Manage Protocols
                        </Link>
                        <Link 
                            to="/admin/analytics" 
                            className="btn btn-outline-light fw-semibold px-3 py-2 d-inline-flex align-items-center"
                            style={{ minHeight: '44px' }}
                        >
                            <i className="bi bi-graph-up-arrow me-2 fs-6"></i>
                            Institutional Analytics
                        </Link>
                    </div>

                </div>
            </header>

            {/* Main Content Area */}
            <main className="container-fluid px-3 px-md-4 my-4 flex-grow-1">

                {/* Loading State: Wireframe Skeleton */}
                {isLoading && (
                    <div className="placeholder-glow" aria-label="Loading operational dashboard">
                        {/* KPI Skeleton Row */}
                        <div className="row g-3 row-cols-1 row-cols-sm-2 row-cols-xl-4 mb-4">
                            {[1, 2, 3, 4].map(n => (
                                <div key={n} className="col">
                                    <div className="card border-0 rounded-4 bg-white p-3 p-xl-4 shadow-sm">
                                        <div className="d-flex justify-content-between mb-2">
                                            <span className="placeholder col-6 rounded"></span>
                                            <span className="placeholder rounded-3" style={{ width: '40px', height: '40px' }}></span>
                                        </div>
                                        <span className="placeholder col-4 fs-3 mb-2 rounded"></span>
                                        <div className="pt-2 border-top border-light-subtle">
                                            <span className="placeholder col-8 rounded"></span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                        {/* Dual Pane Skeleton Row */}
                        <div className="row g-4">
                            <div className="col-12 col-xl-8">
                                <div className="card border-0 rounded-4 bg-white p-4 shadow-sm" style={{ minHeight: '320px' }}>
                                    <span className="placeholder col-5 fs-5 mb-3 rounded"></span>
                                    <span className="placeholder col-12 mb-2 rounded py-2"></span>
                                    <span className="placeholder col-12 mb-2 rounded py-2"></span>
                                    <span className="placeholder col-12 mb-2 rounded py-2"></span>
                                    <span className="placeholder col-8 rounded py-2"></span>
                                </div>
                            </div>
                            <div className="col-12 col-xl-4">
                                <div className="card border-0 rounded-4 bg-white p-4 shadow-sm" style={{ minHeight: '150px' }}>
                                    <span className="placeholder col-6 mb-3 rounded"></span>
                                    <span className="placeholder col-12 rounded py-2 mb-3"></span>
                                    <span className="placeholder col-12 mb-2 rounded py-2"></span>
                                    <span className="placeholder col-12 mb-2 rounded py-2"></span>
                                    <span className="placeholder col-12 mb-2 rounded py-2"></span>
                                    <span className="placeholder col-12 rounded py-2"></span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Error Alert */}
                {fetchError && (
                    <div className="alert alert-danger d-flex align-items-center justify-content-between rounded-3 shadow-sm mb-4" role="alert">
                        <div className="d-flex align-items-center gap-2">
                            <i className="bi bi-exclamation-triangle-fill fs-5"></i>
                            <div>{fetchError}</div>
                        </div>
                        <button className="btn btn-sm btn-outline-danger" onClick={fetchProtocols}>
                            <i className="bi bi-arrow-clockwise me-1"></i> Retry
                        </button>
                    </div>
                )}

                {!isLoading && !fetchError && (
                    <>
                        {/* OPERATION KPI ROW */}
                        <section aria-label="Operational Key Performance Indicators" className="mb-4">
                            <div className="row g-3 row-cols-1 row-cols-sm-2 row-cols-xl-4">
                                
                                {/* Pillar 1: Submitted Protocols / Total Intake */}
                                <div className="col">
                                    <div 
                                        className="card h-100 border-0 rounded-4 bg-white p-3 p-xl-4 position-relative overflow-hidden"
                                        style={getKpiCardStyle('intake', '#003366')}
                                        onMouseEnter={() => setHoveredKpi('intake')}
                                        onMouseLeave={() => setHoveredKpi(null)}
                                        onFocus={() => setFocusedKpi('intake')}
                                        onBlur={() => setFocusedKpi(null)}
                                        onClick={() => navigate('/admin/dashboard')}
                                        onKeyDown={(e) => handleKeyActivate(e, () => navigate('/admin/dashboard'))}
                                        role="button"
                                        tabIndex={0}
                                        aria-label="View all submitted protocols in dashboard"
                                        aria-describedby="kpi-desc-intake"
                                    >
                                        <div className="d-flex justify-content-between align-items-start mb-2">
                                            <div>
                                                <span className="text-uppercase text-secondary fw-bold small font-monospace" style={{ fontSize: '0.72rem', letterSpacing: '0.6px' }}>
                                                    Submitted Protocols
                                                </span>
                                                <div className="d-flex align-items-baseline gap-2 mt-1">
                                                    <h2 className="fs-2 fw-bolder text-dark mb-0 lh-1">{totalProtocols}</h2>
                                                    <span className="badge bg-primary-subtle text-primary-emphasis border border-primary-subtle rounded-pill small fw-semibold" style={{ fontSize: '0.72rem' }}>
                                                        All-Time Intake
                                                    </span>
                                                </div>
                                            </div>
                                            <div 
                                                className="d-flex align-items-center justify-content-center rounded-3 flex-shrink-0"
                                                style={{ width: '48px', height: '48px', backgroundColor: 'rgba(0, 51, 102, 0.08)', color: '#003366' }}
                                            >
                                                <i className="bi bi-inboxes-fill fs-5" aria-hidden="true"></i>
                                            </div>
                                        </div>

                                        {/* Default Action Footer */}
                                        <div className="d-flex align-items-center justify-content-between pt-3 mt-auto border-top border-light-subtle text-secondary small" style={{ fontSize: '0.75rem' }}>
                                            <span>{totalActiveProtocols} Active In-Flight</span>
                                            <span className="fw-semibold text-primary d-inline-flex align-items-center">
                                                Inspect <i className="bi bi-chevron-right ms-1"></i>
                                            </span>
                                        </div>

                                        {/* Hover/Focus ERB Institutional Definition Drawer */}
                                        <div 
                                            id="kpi-desc-intake"
                                            className="position-absolute bottom-0 start-0 end-0 bg-white p-3 border-top border-light-subtle d-flex flex-column justify-content-center"
                                            style={{
                                                transform: (hoveredKpi === 'intake' || focusedKpi === 'intake') ? 'translateY(0)' : 'translateY(100%)',
                                                opacity: (hoveredKpi === 'intake' || focusedKpi === 'intake') ? 1 : 0,
                                                transition: 'transform 0.22s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.18s ease',
                                                zIndex: 2,
                                                boxShadow: '0 -4px 12px rgba(0, 0, 0, 0.05)',
                                                pointerEvents: (hoveredKpi === 'intake' || focusedKpi === 'intake') ? 'auto' : 'none'
                                            }}
                                            aria-hidden={hoveredKpi !== 'intake' && focusedKpi !== 'intake'}
                                        >
                                            <div className="d-flex align-items-center justify-content-between mb-1">
                                                <span className="badge rounded-pill fw-bold text-uppercase font-monospace" style={{ fontSize: '0.65rem', backgroundColor: 'rgba(0, 51, 102, 0.08)', color: '#003366' }}>
                                                    <i className="bi bi-info-circle me-1"></i>ERB Scope
                                                </span>
                                                <span className="text-primary small fw-semibold d-inline-flex align-items-center" style={{ fontSize: '0.70rem' }}>
                                                    Open <i className="bi bi-chevron-right ms-1"></i>
                                                </span>
                                            </div>
                                            <p className="mb-0 text-secondary" style={{ fontSize: '0.73rem', lineHeight: '1.35' }}>
                                                Total volume of all research protocols submitted to the AdZU ERB system across all statuses, reflecting complete intake.
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Pillar 2: Action Required / Triage Queue */}
                                <div className="col">
                                    <div 
                                        className="card h-100 border-0 rounded-4 bg-white p-3 p-xl-4 position-relative overflow-hidden"
                                        style={getKpiCardStyle('action_required', '#b8860b')}
                                        onMouseEnter={() => setHoveredKpi('action_required')}
                                        onMouseLeave={() => setHoveredKpi(null)}
                                        onFocus={() => setFocusedKpi('action_required')}
                                        onBlur={() => setFocusedKpi(null)}
                                        onClick={() => navigate('/admin/dashboard')}
                                        onKeyDown={(e) => handleKeyActivate(e, () => navigate('/admin/dashboard'))}
                                        role="button"
                                        tabIndex={0}
                                        aria-label="View action required triage queue"
                                        aria-describedby="kpi-desc-action_required"
                                    >
                                        <div className="d-flex justify-content-between align-items-start mb-2">
                                            <div>
                                                <span className="text-uppercase text-secondary fw-bold small font-monospace" style={{ fontSize: '0.72rem', letterSpacing: '0.6px' }}>
                                                    Incomplete Requirements
                                                </span>
                                                <div className="d-flex align-items-baseline gap-2 mt-1">
                                                    <h2 className="fs-2 fw-bolder text-dark mb-0 lh-1">{actionRequiredCount}</h2>
                                                    <span className="badge bg-warning-subtle text-warning-emphasis border border-warning-subtle rounded-pill small fw-semibold" style={{ fontSize: '0.72rem' }}>
                                                        Triage Queue
                                                    </span>
                                                </div>
                                            </div>
                                            <div 
                                                className="d-flex align-items-center justify-content-center rounded-3 flex-shrink-0"
                                                style={{ width: '48px', height: '48px', backgroundColor: 'rgba(184, 134, 11, 0.1)', color: '#b8860b' }}
                                            >
                                                <i className="bi bi-hourglass-split fs-5" aria-hidden="true"></i>
                                            </div>
                                        </div>

                                        {/* Default Action Footer */}
                                        <div className="d-flex align-items-center justify-content-between pt-3 mt-auto border-top border-light-subtle text-secondary small" style={{ fontSize: '0.75rem' }}>
                                            <span>Intake & Payments</span>
                                            <span className="fw-semibold text-warning-emphasis d-inline-flex align-items-center">
                                                Process Now <i className="bi bi-chevron-right ms-1"></i>
                                            </span>
                                        </div>

                                        {/* Hover/Focus ERB Institutional Definition Drawer */}
                                        <div 
                                            id="kpi-desc-action_required"
                                            className="position-absolute bottom-0 start-0 end-0 bg-white p-3 border-top border-light-subtle d-flex flex-column justify-content-center"
                                            style={{
                                                transform: (hoveredKpi === 'action_required' || focusedKpi === 'action_required') ? 'translateY(0)' : 'translateY(100%)',
                                                opacity: (hoveredKpi === 'action_required' || focusedKpi === 'action_required') ? 1 : 0,
                                                transition: 'transform 0.22s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.18s ease',
                                                zIndex: 2,
                                                boxShadow: '0 -4px 12px rgba(0, 0, 0, 0.05)',
                                                pointerEvents: (hoveredKpi === 'action_required' || focusedKpi === 'action_required') ? 'auto' : 'none'
                                            }}
                                            aria-hidden={hoveredKpi !== 'action_required' && focusedKpi !== 'action_required'}
                                        >
                                            <div className="d-flex align-items-center justify-content-between mb-1">
                                                <span className="badge rounded-pill fw-bold text-uppercase font-monospace" style={{ fontSize: '0.65rem', backgroundColor: 'rgba(184, 134, 11, 0.1)', color: '#b8860b' }}>
                                                    <i className="bi bi-info-circle me-1"></i>ERB Scope
                                                </span>
                                                <span className="text-warning-emphasis small fw-semibold d-inline-flex align-items-center" style={{ fontSize: '0.70rem' }}>
                                                    Triage <i className="bi bi-chevron-right ms-1"></i>
                                                </span>
                                            </div>
                                            <p className="mb-0 text-secondary" style={{ fontSize: '0.73rem', lineHeight: '1.35' }}>
                                                Protocols requiring immediate Secretariat or Chair administrative action—including document screening, payment verification, and review track classification—before evaluation can begin.
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Pillar 3: Active Workload Queue */}
                                <div className="col">
                                    <div 
                                        className="card h-100 border-0 rounded-4 bg-white p-3 p-xl-4 position-relative overflow-hidden"
                                        style={getKpiCardStyle('workload', '#0d6efd')}
                                        onMouseEnter={() => setHoveredKpi('workload')}
                                        onMouseLeave={() => setHoveredKpi(null)}
                                        onFocus={() => setFocusedKpi('workload')}
                                        onBlur={() => setFocusedKpi(null)}
                                        onClick={() => navigate('/admin/dashboard')}
                                        onKeyDown={(e) => handleKeyActivate(e, () => navigate('/admin/dashboard'))}
                                        role="button"
                                        tabIndex={0}
                                        aria-label="View active review workload"
                                        aria-describedby="kpi-desc-workload"
                                    >
                                        <div className="d-flex justify-content-between align-items-start mb-2">
                                            <div>
                                                <span className="text-uppercase text-secondary fw-bold small font-monospace" style={{ fontSize: '0.72rem', letterSpacing: '0.6px' }}>
                                                    Ongoing Review
                                                </span>
                                                <div className="d-flex align-items-baseline gap-2 mt-1">
                                                    <h2 className="fs-2 fw-bolder text-dark mb-0 lh-1">{activeWorkloadCount}</h2>
                                                    <span className="badge bg-info-subtle text-info-emphasis border border-info-subtle rounded-pill small fw-semibold" style={{ fontSize: '0.72rem' }}>
                                                        Under Review
                                                    </span>
                                                </div>
                                            </div>
                                            <div 
                                                className="d-flex align-items-center justify-content-center rounded-3 flex-shrink-0"
                                                style={{ width: '48px', height: '48px', backgroundColor: 'rgba(13, 110, 253, 0.08)', color: '#0d6efd' }}
                                            >
                                                <i className="bi bi-clipboard2-pulse fs-5" aria-hidden="true"></i>
                                            </div>
                                        </div>

                                        {/* Default Action Footer */}
                                        <div className="d-flex align-items-center justify-content-between pt-3 mt-auto border-top border-light-subtle text-secondary small" style={{ fontSize: '0.75rem' }}>
                                            <span>Assigned & Revisions</span>
                                            <span className="fw-semibold text-primary d-inline-flex align-items-center">
                                                Monitor Queue <i className="bi bi-chevron-right ms-1"></i>
                                            </span>
                                        </div>

                                        {/* Hover/Focus ERB Institutional Definition Drawer */}
                                        <div 
                                            id="kpi-desc-workload"
                                            className="position-absolute bottom-0 start-0 end-0 bg-white p-3 border-top border-light-subtle d-flex flex-column justify-content-center"
                                            style={{
                                                transform: (hoveredKpi === 'workload' || focusedKpi === 'workload') ? 'translateY(0)' : 'translateY(100%)',
                                                opacity: (hoveredKpi === 'workload' || focusedKpi === 'workload') ? 1 : 0,
                                                transition: 'transform 0.22s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.18s ease',
                                                zIndex: 2,
                                                boxShadow: '0 -4px 12px rgba(0, 0, 0, 0.05)',
                                                pointerEvents: (hoveredKpi === 'workload' || focusedKpi === 'workload') ? 'auto' : 'none'
                                            }}
                                            aria-hidden={hoveredKpi !== 'workload' && focusedKpi !== 'workload'}
                                        >
                                            <div className="d-flex align-items-center justify-content-between mb-1">
                                                <span className="badge rounded-pill fw-bold text-uppercase font-monospace" style={{ fontSize: '0.65rem', backgroundColor: 'rgba(13, 110, 253, 0.08)', color: '#0d6efd' }}>
                                                    <i className="bi bi-info-circle me-1"></i>ERB Scope
                                                </span>
                                                <span className="text-primary small fw-semibold d-inline-flex align-items-center" style={{ fontSize: '0.70rem' }}>
                                                    Monitor <i className="bi bi-chevron-right ms-1"></i>
                                                </span>
                                            </div>
                                            <p className="mb-0 text-secondary" style={{ fontSize: '0.73rem', lineHeight: '1.35' }}>
                                                Protocols actively undergoing ethics evaluation by assigned reviewers (Forms 11 & 12), consolidation into decision notices, or applicant revision cycles.
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Pillar 4: Clearances Issued & Yield */}
                                <div className="col">
                                    <div 
                                        className="card h-100 border-0 rounded-4 bg-white p-3 p-xl-4 position-relative overflow-hidden"
                                        style={getKpiCardStyle('clearance', '#198754')}
                                        onMouseEnter={() => setHoveredKpi('clearance')}
                                        onMouseLeave={() => setHoveredKpi(null)}
                                        onFocus={() => setFocusedKpi('clearance')}
                                        onBlur={() => setFocusedKpi(null)}
                                        onClick={() => navigate('/admin/analytics')}
                                        onKeyDown={(e) => handleKeyActivate(e, () => navigate('/admin/analytics'))}
                                        role="button"
                                        tabIndex={0}
                                        aria-label="View clearances and institutional analytics"
                                        aria-describedby="kpi-desc-clearance"
                                    >
                                        <div className="d-flex justify-content-between align-items-start mb-2">
                                            <div>
                                                <span className="text-uppercase text-secondary fw-bold small font-monospace" style={{ fontSize: '0.72rem', letterSpacing: '0.6px' }}>
                                                    Clearances Granted
                                                </span>
                                                <div className="d-flex align-items-baseline gap-2 mt-1">
                                                    <h2 className="fs-2 fw-bolder text-dark mb-0 lh-1">{clearanceGranted}</h2>
                                                    <span className="badge bg-success-subtle text-success-emphasis border border-success-subtle rounded-pill small fw-semibold" style={{ fontSize: '0.72rem' }}>
                                                        <i className="bi bi-arrow-up-right me-1"></i>
                                                        {clearanceYieldRate}% Lifetime Yield
                                                    </span>
                                                </div>
                                            </div>
                                            <div 
                                                className="d-flex align-items-center justify-content-center rounded-3 flex-shrink-0"
                                                style={{ width: '48px', height: '48px', backgroundColor: 'rgba(25, 135, 84, 0.1)', color: '#198754' }}
                                            >
                                                <i className="bi bi-patch-check-fill fs-5" aria-hidden="true"></i>
                                            </div>
                                        </div>

                                        {/* Default Action Footer */}
                                        <div className="d-flex align-items-center justify-content-between pt-3 mt-auto border-top border-light-subtle text-secondary small" style={{ fontSize: '0.75rem' }}>
                                            <span>Certified Protocols</span>
                                            <span className="fw-semibold text-success d-inline-flex align-items-center">
                                                Analytics <i className="bi bi-chevron-right ms-1"></i>
                                            </span>
                                        </div>

                                        {/* Hover/Focus ERB Institutional Definition Drawer */}
                                        <div 
                                            id="kpi-desc-clearance"
                                            className="position-absolute bottom-0 start-0 end-0 bg-white p-3 border-top border-light-subtle d-flex flex-column justify-content-center"
                                            style={{
                                                transform: (hoveredKpi === 'clearance' || focusedKpi === 'clearance') ? 'translateY(0)' : 'translateY(100%)',
                                                opacity: (hoveredKpi === 'clearance' || focusedKpi === 'clearance') ? 1 : 0,
                                                transition: 'transform 0.22s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.18s ease',
                                                zIndex: 2,
                                                boxShadow: '0 -4px 12px rgba(0, 0, 0, 0.05)',
                                                pointerEvents: (hoveredKpi === 'clearance' || focusedKpi === 'clearance') ? 'auto' : 'none'
                                            }}
                                            aria-hidden={hoveredKpi !== 'clearance' && focusedKpi !== 'clearance'}
                                        >
                                            <div className="d-flex align-items-center justify-content-between mb-1">
                                                <span className="badge rounded-pill fw-bold text-uppercase font-monospace" style={{ fontSize: '0.65rem', backgroundColor: 'rgba(25, 135, 84, 0.1)', color: '#198754' }}>
                                                    <i className="bi bi-info-circle me-1"></i>ERB Scope
                                                </span>
                                                <span className="text-success small fw-semibold d-inline-flex align-items-center" style={{ fontSize: '0.70rem' }}>
                                                    Analytics <i className="bi bi-chevron-right ms-1"></i>
                                                </span>
                                            </div>
                                            <p className="mb-0 text-secondary" style={{ fontSize: '0.73rem', lineHeight: '1.35' }}>
                                                Total protocols granted official Certificates of Ethical Clearance authorized to begin research activities, alongside the overall clearance yield rate.
                                            </p>
                                        </div>
                                    </div>
                                </div>

                            </div>
                        </section>

                        {/* DUAL PANE OPERATION MATRIX */}
                        <div className="row g-4 mb-4">
                            {/* Administrative Action Inbox (Model A: Action-Focused Task Feed with Micro-Pagination) */}
                            <div className="col-12 col-xl-8">
                                <div className="card h-100 border-0 shadow-sm rounded-4 bg-white d-flex flex-column overflow-hidden">
                                    
                                    {/* Header with Dynamic Urgency Badge & Direct CTA */}
                                    <div className="card-header bg-white border-bottom border-light-subtle py-3 px-3 px-xl-4 d-flex flex-column flex-sm-row justify-content-between align-items-sm-center gap-2">
                                        <div>
                                            <div className="d-flex align-items-center gap-2">
                                                <h5 className="fw-bold text-dark mb-0">Administrative Action Inbox</h5>
                                                <span className="badge bg-warning-subtle text-warning-emphasis border border-warning-subtle rounded-pill px-3 py-1 small fw-bold">
                                                    {actionRequiredCount} Action Needed
                                                </span>
                                            </div>
                                            <small className="text-secondary d-block mt-1">
                                                Pending protocols requiring immediate intake screening, payment validation, or review track assignment
                                            </small>
                                        </div>
                                        <Link 
                                            to="/admin/dashboard?status=All" 
                                            className="btn btn-sm btn-outline-primary fw-semibold px-3 py-2 rounded-pill d-inline-flex align-items-center flex-shrink-0 align-self-start align-self-sm-center"
                                            style={{ minHeight: '36px' }}
                                        >
                                            <span>View All in Dashboard</span>
                                            <i className="bi bi-arrow-right ms-1"></i>
                                        </Link>
                                    </div>

                                    {/* Task Feed Body with Fixed Minimum Height to Prevent CLS */}
                                    <div className="card-body p-0">
                                        {priorityTriageQueue.length === 0 ? (
                                            <div className="text-center py-5 px-3">
                                                <div 
                                                    className="d-inline-flex align-items-center justify-content-center rounded-circle bg-success-subtle text-success mb-3" 
                                                    style={{ width: '64px', height: '64px' }}
                                                >
                                                    <i className="bi bi-check2-circle fs-2"></i>
                                                </div>
                                                <h6 className="fw-bold text-dark mb-1">All caught up</h6>
                                                <p className="text-secondary small mb-3">
                                                    No incoming protocols currently require administrative triage or classification.
                                                </p>
                                                <Link 
                                                    to="/admin/dashboard?status=All" 
                                                    className="btn btn-sm btn-outline-primary rounded-pill px-3 py-1 fw-semibold"
                                                >
                                                    Open Protocol Registry
                                                </Link>
                                            </div>
                                        ) : (
                                            <div className="list-group list-group-flush">
                                                {paginatedTriageQueue.map((item) => {
                                                    const turnaroundDays = getTurnaroundDays(item.submission_date);
                                                    const protocolCode = item.protocol_code !== 'N/A' ? item.protocol_code : (item.id || item.application_id);
                                                    const deepLinkUrl = `/admin/dashboard?search=${encodeURIComponent(protocolCode)}&protocolId=${encodeURIComponent(item.application_id)}&status=All&autoOpen=true`;
                                                    const actionMeta = getActionMeta(item.status);

                                                    return (
                                                        <div 
                                                            key={item.application_id || item.id}
                                                            onClick={() => navigate(deepLinkUrl)}
                                                            onKeyDown={(e) => handleKeyActivate(e, () => navigate(deepLinkUrl))}
                                                            role="button"
                                                            tabIndex={0}
                                                            className="list-group-item list-group-item-action p-3 p-xl-3 border-bottom border-light-subtle d-flex flex-column gap-2"
                                                            style={{ cursor: 'pointer' }}
                                                            aria-label={`Protocol ${protocolCode}: ${item.title}. ${actionMeta.label}`}
                                                        >
                                                            {/* Tier 1: Metadata Header */}
                                                            <div className="d-flex align-items-center justify-content-between gap-2 flex-wrap">
                                                                <div className="d-flex align-items-center gap-2 flex-wrap text-truncate">
                                                                    <span className="fw-bold font-monospace text-primary small">
                                                                        {protocolCode}
                                                                    </span>
                                                                    <span className="text-body-tertiary d-none d-sm-inline">•</span>
                                                                    <span 
                                                                        className="text-secondary small text-truncate" 
                                                                        style={{ maxWidth: '240px' }} 
                                                                        title={item.proponent_name}
                                                                    >
                                                                        <i className="bi bi-person me-1 text-muted"></i>
                                                                        {item.proponent_name}
                                                                    </span>
                                                                    {item.affiliation && (
                                                                        <span 
                                                                            className={`badge rounded-pill fw-medium ${
                                                                                item.affiliation === 'External' 
                                                                                    ? 'bg-secondary-subtle text-secondary-emphasis border border-secondary-subtle' 
                                                                                    : 'bg-primary-subtle text-primary-emphasis border border-primary-subtle'
                                                                            }`}
                                                                            style={{ fontSize: '0.65rem' }}
                                                                        >
                                                                            {item.affiliation}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                <div className="flex-shrink-0">
                                                                    {renderTurnaroundBadge(turnaroundDays)}
                                                                </div>
                                                            </div>

                                                            {/* Tier 2: Research Title */}
                                                            <h6 
                                                                className="fw-semibold text-dark mb-0" 
                                                                title={item.title} 
                                                                aria-label={item.title}
                                                                style={{
                                                                    display: '-webkit-box',
                                                                    WebkitLineClamp: 2,
                                                                    WebkitBoxOrient: 'vertical',
                                                                    overflow: 'hidden',
                                                                    lineHeight: '1.35',
                                                                    fontSize: '0.88rem'
                                                                }}
                                                            >
                                                                {item.title}
                                                            </h6>

                                                            {/* Tier 3: Action & Direct CTA */}
                                                            <div className="d-flex align-items-center justify-content-between gap-3 mt-1 pt-1">
                                                                <div className="d-flex align-items-center gap-2 small text-truncate">
                                                                    <span 
                                                                        className={`badge rounded-pill d-inline-flex align-items-center gap-1 px-2.5 py-1 fw-semibold border ${actionMeta.badgeClass}`}
                                                                        style={{ fontSize: '0.72rem' }}
                                                                    >
                                                                        <i className={`bi ${actionMeta.icon}`}></i>
                                                                        <span className="text-truncate">{actionMeta.label}</span>
                                                                    </span>
                                                                </div>
                                                                <button 
                                                                    type="button" 
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        navigate(deepLinkUrl);
                                                                    }} 
                                                                    className="btn btn-sm btn-outline-primary rounded-pill px-3 py-1 fw-semibold d-inline-flex align-items-center flex-shrink-0" 
                                                                    style={{ fontSize: '0.76rem', minHeight: '30px' }}
                                                                    title={`${actionMeta.cta} for ${protocolCode}`}
                                                                >
                                                                    <span>{actionMeta.cta}</span>
                                                                </button>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>

                                    {/* Queue Summary & Micro-Pagination Footer */}
                                    <div className="card-footer bg-light-subtle border-top border-light-subtle py-2 px-3 px-xl-4 d-flex flex-column flex-sm-row justify-content-between align-items-sm-center gap-2">
                                        <div className="d-flex align-items-center gap-2">
                                            <small className="text-secondary fw-medium" style={{ fontSize: '0.75rem' }}>
                                                Showing {priorityTriageQueue.length > 0 ? (inboxPage - 1) * INBOX_ITEMS_PER_PAGE + 1 : 0}–{Math.min(inboxPage * INBOX_ITEMS_PER_PAGE, priorityTriageQueue.length)} of {priorityTriageQueue.length} priority items ({actionRequiredCount} total pending)
                                            </small>
                                        </div>

                                        <div className="d-flex align-items-center gap-3 align-self-end align-self-sm-center">
                                            {totalInboxPages > 1 && (
                                                <div className="d-flex align-items-center gap-2">
                                                    <span className="text-secondary small font-monospace fw-semibold" style={{ fontSize: '0.72rem' }}>
                                                        {inboxPage} / {totalInboxPages}
                                                    </span>
                                                    <div className="btn-group btn-group-sm" role="group" aria-label="Inbox pagination">
                                                        <button
                                                            type="button"
                                                            className="btn btn-outline-secondary border-light-subtle bg-white text-dark py-1 px-2 d-inline-flex align-items-center"
                                                            onClick={() => setInboxPage(prev => Math.max(prev - 1, 1))}
                                                            disabled={inboxPage === 1}
                                                            aria-label="Previous page"
                                                            style={{ minWidth: '30px', minHeight: '28px' }}
                                                            title="Previous Page"
                                                        >
                                                            <i className="bi bi-chevron-left small"></i>
                                                        </button>
                                                        <button
                                                            type="button"
                                                            className="btn btn-outline-secondary border-light-subtle bg-white text-dark py-1 px-2 d-inline-flex align-items-center"
                                                            onClick={() => setInboxPage(prev => Math.min(prev + 1, totalInboxPages))}
                                                            disabled={inboxPage === totalInboxPages}
                                                            aria-label="Next page"
                                                            style={{ minWidth: '30px', minHeight: '28px' }}
                                                            title="Next Page"
                                                        >
                                                            <i className="bi bi-chevron-right small"></i>
                                                        </button>
                                                    </div>
                                                </div>
                                            )}

                                            <Link 
                                                to="/admin/dashboard?status=All" 
                                                className="text-primary text-decoration-none small fw-semibold d-inline-flex align-items-center text-nowrap" 
                                                style={{ fontSize: '0.75rem' }}
                                            >
                                                <span>Registry Matrix →</span>
                                            </Link>
                                        </div>
                                    </div>

                                </div>
                            </div>

                            {/* REVIEW TRACK DISTRIBUTION */}
                            <div className="col-12 col-xl-4">
                                
                                {/* Card 1: Review Track Distribution Breakdown (Interactive 1-Click Filter Deck) */}
                                <div className="card h-100 border-0 shadow-sm rounded-4 bg-white d-flex flex-column overflow-hidden">
                                    {/* Header matching Administrative Action Inbox */}
                                    <div className="card-header bg-white border-bottom border-light-subtle py-3 px-3 px-xl-4 d-flex justify-content-between align-items-center">
                                        <div>
                                            <h5 className="fw-bold text-dark mb-0">Review Track Distribution</h5>
                                            <small className="text-secondary d-block mt-1">
                                                Active protocol portfolio by risk category & governance
                                            </small>
                                        </div>
                                        <span className="badge bg-primary-subtle text-primary border border-primary-subtle rounded-pill px-2.5 py-1 small fw-semibold flex-shrink-0">
                                            {totalProtocols} Total
                                        </span>
                                    </div>

                                    {/* Body Distributing 4 Micro-Interaction Cards Evenly */}
                                    <div className="card-body p-3 px-xl-4 d-flex flex-column justify-content-between flex-grow-1">
                                        
                                        {/* Proportional Distribution Bar */}
                                        <div className="progress mb-2 rounded-pill overflow-hidden bg-light border border-light-subtle flex-shrink-0" style={{ height: '8px' }}>
                                            {trackBreakdown.map((track) => (
                                                track.count > 0 && (
                                                    <div 
                                                        key={track.key}
                                                        className={`progress-bar ${track.bgClass}`}
                                                        role="progressbar" 
                                                        style={{ width: `${track.pct}%`, backgroundColor: track.color, cursor: 'pointer' }}
                                                        aria-valuenow={track.pct} 
                                                        aria-valuemin="0" 
                                                        aria-valuemax="100"
                                                        aria-label={`${track.label}: ${track.count} protocols (${track.pct}%)`}
                                                        title={`${track.label}: ${track.count} (${track.pct}%) - Click to filter registry`}
                                                        onClick={() => navigate('/admin/dashboard?type=' + encodeURIComponent(track.filterType))}
                                                    />
                                                )
                                            ))}
                                        </div>

                                        {/* Micro-Interaction Deck: 4 Cards Distributed to Harmonize with Sibling Height */}
                                        <div className="d-flex flex-column justify-content-between flex-grow-1 gap-2" role="region" aria-label="Review track distribution breakdown">
                                            {trackBreakdown.map((track) => {
                                                const isHovered = hoveredTrack === track.key || focusedTrack === track.key;
                                                return (
                                                    <div 
                                                        key={track.key}
                                                        role="button"
                                                        tabIndex={0}
                                                        onClick={() => navigate('/admin/dashboard?type=' + encodeURIComponent(track.filterType))}
                                                        onKeyDown={(e) => handleKeyActivate(e, () => navigate('/admin/dashboard?type=' + encodeURIComponent(track.filterType)))}
                                                        onMouseEnter={() => setHoveredTrack(track.key)}
                                                        onMouseLeave={() => setHoveredTrack(null)}
                                                        onFocus={() => setFocusedTrack(track.key)}
                                                        onBlur={() => setFocusedTrack(null)}
                                                        className="position-relative overflow-hidden rounded-3 bg-white border flex-grow-1 d-flex align-items-center"
                                                        style={{
                                                            cursor: 'pointer',
                                                            borderLeft: `4px solid ${track.color}`,
                                                            borderColor: isHovered ? track.color : 'var(--bs-border-color-translucent, #dee2e6)',
                                                            boxShadow: isHovered 
                                                                ? `0 6px 14px -2px rgba(0, 0, 0, 0.08), 0 0 0 1px ${track.color}25` 
                                                                : '0 1px 3px rgba(0, 0, 0, 0.03)',
                                                            transform: isHovered ? 'translateY(-2px)' : 'none',
                                                            transition: 'transform 0.18s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.18s ease, border-color 0.18s ease',
                                                            outline: 'none',
                                                            minHeight: '62px'
                                                        }}
                                                        aria-label={`${track.label}: ${track.count} protocols (${track.pct}%). Governance: ${track.governance}. Scope: ${track.scope}. Click to filter registry.`}
                                                    >
                                                        {/* Resting State Layer: Clean, scannable, single row */}
                                                        <div className="w-100 px-3 py-2 d-flex align-items-center justify-content-between">
                                                            <div className="d-flex align-items-center gap-2 text-truncate me-2">
                                                                <span className="fw-bold text-dark small text-truncate">{track.label}</span>
                                                                <span 
                                                                    className={`badge rounded-pill font-monospace fw-semibold flex-shrink-0 ${track.badgeClass}`}
                                                                    style={{ fontSize: '0.65rem', padding: '0.2rem 0.5rem' }}
                                                                >
                                                                    {track.governance}
                                                                </span>
                                                            </div>
                                                            <div className="d-flex align-items-center gap-2 flex-shrink-0">
                                                                <div className="d-flex align-items-baseline gap-1">
                                                                    <span className="fw-bolder text-dark fs-6">{track.count}</span>
                                                                    <span className="text-secondary small" style={{ fontSize: '0.72rem' }}>({track.pct}%)</span>
                                                                </div>
                                                                <i 
                                                                    className="bi bi-chevron-right text-secondary small"
                                                                    style={{ fontSize: '0.75rem' }}
                                                                    aria-hidden="true"
                                                                ></i>
                                                            </div>
                                                        </div>

                                                        {/* Slide-Up Micro-Interaction Drawer (KPI-Style Reveal Overlay) */}
                                                        <div 
                                                            className="position-absolute top-0 bottom-0 start-0 end-0 bg-white px-3 py-2 d-flex flex-column justify-content-center"
                                                            style={{
                                                                transform: isHovered ? 'translateY(0)' : 'translateY(100%)',
                                                                opacity: isHovered ? 1 : 0,
                                                                transition: 'transform 0.22s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.18s ease',
                                                                zIndex: 2,
                                                                borderLeft: `4px solid ${track.color}`,
                                                                boxShadow: '0 -2px 8px rgba(0, 0, 0, 0.05)',
                                                                pointerEvents: isHovered ? 'auto' : 'none'
                                                            }}
                                                            aria-hidden={!isHovered}
                                                        >
                                                            <div className="d-flex align-items-center justify-content-between mb-1">
                                                                <span 
                                                                    className="badge rounded-pill font-monospace fw-bold text-uppercase" 
                                                                    style={{ fontSize: '0.62rem', backgroundColor: `${track.color}15`, color: track.color }}
                                                                >
                                                                    <i className="bi bi-info-circle me-1"></i>ERB Scope
                                                                </span>
                                                                <span 
                                                                    className="small fw-semibold d-inline-flex align-items-center" 
                                                                    style={{ fontSize: '0.70rem', color: track.color }}
                                                                >
                                                                    Filter Registry <i className="bi bi-arrow-right ms-1"></i>
                                                                </span>
                                                            </div>
                                                            <p 
                                                                className="mb-0 text-secondary" 
                                                                style={{ fontSize: '0.72rem', lineHeight: '1.3' }}
                                                            >
                                                                {track.scope}
                                                            </p>
                                                        </div>

                                                    </div>
                                                );
                                            })}
                                        </div>

                                    </div>

                                    {/* Matching Card Footer */}
                                    <div className="card-footer bg-light-subtle border-top border-light-subtle py-2 px-3 px-xl-4 d-flex justify-content-between align-items-center">
                                        <small className="text-secondary fw-medium" style={{ fontSize: '0.75rem' }}>
                                            SOP-03 Review Track Classification
                                        </small>
                                        <Link 
                                            to="/admin/dashboard" 
                                            className="text-primary text-decoration-none small fw-semibold d-inline-flex align-items-center text-nowrap" 
                                            style={{ fontSize: '0.75rem' }}
                                        >
                                            <span>Filter Registry →</span>
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </>
                )}

            </main>
        </div>
    );
}

export default AdminHome;
