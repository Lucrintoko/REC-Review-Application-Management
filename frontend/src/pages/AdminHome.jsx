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
    const [hoveredAction, setHoveredAction] = useState(null);

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

    // Quick Hub Trigger Counts
    const pendingPaymentsCount = useMemo(() => protocolData.filter(p => p.status === 'PAYMENT PENDING').length, [protocolData]);
    const assignReviewersCount = useMemo(() => protocolData.filter(p => ['PROTOCOLS SUBMITTED', 'PAYMENT VERIFIED', 'TYPE OF REVIEW'].includes(p.status)).length, [protocolData]);
    const consolidationsCount = useMemo(() => protocolData.filter(p => ['CONSOLIDATION OF EVALUATION', 'DECISION LETTER ISSUED'].includes(p.status)).length, [protocolData]);

    // Phase 3: Priority Triage Queue (Top 6 oldest submissions needing administrative action - FIFO SLA)
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

    // Phase 3: Review Track Telemetry Breakdown
    const trackBreakdown = useMemo(() => {
        const total = totalProtocols || 1;
        return [
            {
                key: 'EXEMPTED',
                label: 'Exempted Review',
                count: exempted,
                pct: Math.round((exempted / total) * 100),
                color: '#198754',
                bgClass: 'bg-success',
                badgeClass: 'bg-success-subtle text-success border border-success-subtle',
                desc: 'Minimal or negligible risk protocols'
            },
            {
                key: 'EXPEDITED',
                label: 'Expedited Review',
                count: expedited,
                pct: Math.round((expedited / total) * 100),
                color: '#b8860b',
                bgClass: 'bg-warning',
                badgeClass: 'bg-warning-subtle text-warning-emphasis border border-warning-subtle',
                desc: 'Minor intervention with moderate risk'
            },
            {
                key: 'FULL_BOARD',
                label: 'Full Board Review',
                count: fullBoard,
                pct: Math.round((fullBoard / total) * 100),
                color: '#0d6efd',
                bgClass: 'bg-primary',
                badgeClass: 'bg-primary-subtle text-primary border border-primary-subtle',
                desc: 'Vulnerable subjects or clinical trials'
            },
            {
                key: 'UNDETERMINED',
                label: 'Undetermined Track',
                count: undetermined,
                pct: Math.round((undetermined / total) * 100),
                color: '#6c757d',
                bgClass: 'bg-secondary',
                badgeClass: 'bg-secondary-subtle text-secondary border border-secondary-subtle',
                desc: 'Awaiting classification by Ethics Chair'
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

    // Micro-Interaction Styles for Interactive KPI Cards
    const getKpiCardStyle = (cardId, accentColor) => ({
        borderLeft: `4px solid ${accentColor}`,
        transition: 'transform 0.18s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.18s ease',
        transform: hoveredKpi === cardId ? 'translateY(-4px)' : 'none',
        boxShadow: hoveredKpi === cardId 
            ? '0 12px 24px -4px rgba(0, 0, 0, 0.09), 0 4px 8px -2px rgba(0, 0, 0, 0.04)' 
            : '0 1px 3px rgba(0, 0, 0, 0.04)',
        cursor: 'pointer'
    });

    // Micro-Interaction Styles for Quick Action Hub Items
    const getQuickActionStyle = (actionId) => ({
        minHeight: '48px',
        transition: 'transform 0.15s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.15s ease, border-color 0.15s ease',
        transform: hoveredAction === actionId ? 'translateY(-2px)' : 'none',
        boxShadow: hoveredAction === actionId 
            ? '0 6px 14px rgba(0, 51, 102, 0.08)' 
            : '0 1px 2px rgba(0, 0, 0, 0.03)',
        borderColor: hoveredAction === actionId ? '#003366' : 'var(--bs-border-color-subtle)',
        backgroundColor: hoveredAction === actionId ? 'rgba(0, 51, 102, 0.015)' : '#ffffff',
        cursor: 'pointer'
    });

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
                                    Live Ops
                                </span>
                            </div>
                            <small className="text-light opacity-75 d-block mt-1">
                                Ateneo Research Ethics Committee • Executive Administration & Review Portal
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
                            <div className="col-12 col-xl-4 d-flex flex-column gap-4">
                                <div className="card border-0 rounded-4 bg-white p-4 shadow-sm" style={{ minHeight: '150px' }}>
                                    <span className="placeholder col-6 mb-3 rounded"></span>
                                    <span className="placeholder col-12 rounded py-2"></span>
                                </div>
                                <div className="card border-0 rounded-4 bg-white p-4 shadow-sm" style={{ minHeight: '150px' }}>
                                    <span className="placeholder col-7 mb-3 rounded"></span>
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
                                
                                {/* Pillar 1: Total Active Portfolio */}
                                <div className="col">
                                    <div 
                                        className="card h-100 border-0 rounded-4 bg-white p-3 p-xl-4 position-relative overflow-hidden"
                                        style={getKpiCardStyle('intake', '#003366')}
                                        onMouseEnter={() => setHoveredKpi('intake')}
                                        onMouseLeave={() => setHoveredKpi(null)}
                                        onClick={() => navigate('/admin/dashboard')}
                                        onKeyDown={(e) => handleKeyActivate(e, () => navigate('/admin/dashboard'))}
                                        role="button"
                                        tabIndex={0}
                                        aria-label="View all active protocols in dashboard"
                                    >
                                        <div className="d-flex justify-content-between align-items-start mb-2">
                                            <div>
                                                <span className="text-uppercase text-secondary fw-bold small font-monospace" style={{ fontSize: '0.72rem', letterSpacing: '0.6px' }}>
                                                    Active Protocols
                                                </span>
                                                <div className="d-flex align-items-baseline gap-2 mt-1">
                                                    <h2 className="fs-2 fw-bolder text-dark mb-0 lh-1">{totalActiveProtocols}</h2>
                                                    <span className="badge bg-primary-subtle text-primary-emphasis border border-primary-subtle rounded-pill small fw-semibold" style={{ fontSize: '0.72rem' }}>
                                                        Portfolio
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
                                        <div className="d-flex align-items-center justify-content-between pt-3 mt-auto border-top border-light-subtle text-secondary small" style={{ fontSize: '0.75rem' }}>
                                            <span>{totalProtocols} Total Submissions</span>
                                            <span className="fw-semibold text-primary d-inline-flex align-items-center">
                                                Inspect <i className="bi bi-chevron-right ms-1"></i>
                                            </span>
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
                                        onClick={() => navigate('/admin/dashboard')}
                                        onKeyDown={(e) => handleKeyActivate(e, () => navigate('/admin/dashboard'))}
                                        role="button"
                                        tabIndex={0}
                                        aria-label="View action required triage queue"
                                    >
                                        <div className="d-flex justify-content-between align-items-start mb-2">
                                            <div>
                                                <span className="text-uppercase text-secondary fw-bold small font-monospace" style={{ fontSize: '0.72rem', letterSpacing: '0.6px' }}>
                                                    Action Required
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
                                        <div className="d-flex align-items-center justify-content-between pt-3 mt-auto border-top border-light-subtle text-secondary small" style={{ fontSize: '0.75rem' }}>
                                            <span>Intake & Payments</span>
                                            <span className="fw-semibold text-warning-emphasis d-inline-flex align-items-center">
                                                Process Now <i className="bi bi-chevron-right ms-1"></i>
                                            </span>
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
                                        onClick={() => navigate('/admin/dashboard')}
                                        onKeyDown={(e) => handleKeyActivate(e, () => navigate('/admin/dashboard'))}
                                        role="button"
                                        tabIndex={0}
                                        aria-label="View active review workload"
                                    >
                                        <div className="d-flex justify-content-between align-items-start mb-2">
                                            <div>
                                                <span className="text-uppercase text-secondary fw-bold small font-monospace" style={{ fontSize: '0.72rem', letterSpacing: '0.6px' }}>
                                                    Active Workload
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
                                        <div className="d-flex align-items-center justify-content-between pt-3 mt-auto border-top border-light-subtle text-secondary small" style={{ fontSize: '0.75rem' }}>
                                            <span>Assigned & Revisions</span>
                                            <span className="fw-semibold text-primary d-inline-flex align-items-center">
                                                Monitor Queue <i className="bi bi-chevron-right ms-1"></i>
                                            </span>
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
                                        onClick={() => navigate('/admin/analytics')}
                                        onKeyDown={(e) => handleKeyActivate(e, () => navigate('/admin/analytics'))}
                                        role="button"
                                        tabIndex={0}
                                        aria-label="View clearances and institutional analytics"
                                    >
                                        <div className="d-flex justify-content-between align-items-start mb-2">
                                            <div>
                                                <span className="text-uppercase text-secondary fw-bold small font-monospace" style={{ fontSize: '0.72rem', letterSpacing: '0.6px' }}>
                                                    Clearances Issued
                                                </span>
                                                <div className="d-flex align-items-baseline gap-2 mt-1">
                                                    <h2 className="fs-2 fw-bolder text-dark mb-0 lh-1">{clearanceGranted}</h2>
                                                    <span className="badge bg-success-subtle text-success-emphasis border border-success-subtle rounded-pill small fw-semibold" style={{ fontSize: '0.72rem' }}>
                                                        <i className="bi bi-arrow-up-right me-1"></i>
                                                        {clearanceYieldRate}% Yield
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
                                        <div className="d-flex align-items-center justify-content-between pt-3 mt-auto border-top border-light-subtle text-secondary small" style={{ fontSize: '0.75rem' }}>
                                            <span>Certified Protocols</span>
                                            <span className="fw-semibold text-success d-inline-flex align-items-center">
                                                Analytics <i className="bi bi-chevron-right ms-1"></i>
                                            </span>
                                        </div>
                                    </div>
                                </div>

                            </div>
                        </section>

                        {/* DUAL PANE OPERATION MATRIX */}
                        <div className="row g-4 mb-4">
                            {/* Priority Inflow & Triage Queue */}
                            <div className="col-12 col-xl-8">
                                <div className="card border-0 shadow-sm rounded-4 h-100 bg-white d-flex flex-column overflow-hidden">
                                    
                                    {/* Header with Dynamic Urgency Badge & Direct CTA */}
                                    <div className="card-header bg-white border-bottom border-light-subtle py-3 px-3 px-xl-4 d-flex flex-column flex-sm-row justify-content-between align-items-sm-center gap-2">
                                        <div>
                                            <div className="d-flex align-items-center gap-2">
                                                <h5 className="fw-bold text-dark mb-0">Priority Inflow & Triage Queue</h5>
                                                <span className="badge bg-warning-subtle text-warning-emphasis border border-warning-subtle rounded-pill px-3 py-1 small fw-bold">
                                                    {actionRequiredCount} Action Needed
                                                </span>
                                            </div>
                                            <small className="text-secondary d-block mt-1">
                                                Incoming protocols pending administrative classification, payment verification, or primary triage
                                            </small>
                                        </div>
                                        <Link 
                                            to="/admin/dashboard" 
                                            className="btn btn-sm btn-outline-primary fw-semibold px-3 py-2 rounded-pill d-inline-flex align-items-center flex-shrink-0 align-self-start align-self-sm-center"
                                            style={{ minHeight: '36px' }}
                                        >
                                            <span>View All in Dashboard</span>
                                            <i className="bi bi-arrow-right ms-1"></i>
                                        </Link>
                                    </div>

                                    {/* Table Body or Empty State */}
                                    <div className="card-body p-0 flex-grow-1 d-flex flex-column">
                                        {priorityTriageQueue.length === 0 ? (
                                            <div className="text-center py-5 px-3 my-auto">
                                                <div className="d-inline-flex align-items-center justify-content-center rounded-circle bg-success-subtle text-success mb-3" style={{ width: '64px', height: '64px' }}>
                                                    <i className="bi bi-check2-circle fs-2"></i>
                                                </div>
                                                <h6 className="fw-bold text-dark mb-1">All Submissions Up to Date</h6>
                                                <p className="text-secondary small mb-3">No incoming protocols currently require administrative triage or classification.</p>
                                                <Link to="/admin/dashboard" className="btn btn-sm btn-outline-primary rounded-pill px-3">
                                                    Open Protocol Registry
                                                </Link>
                                            </div>
                                        ) : (
                                            <div className="table-responsive flex-grow-1">
                                                <table className="table table-hover align-middle mb-0">
                                                    <thead className="table-light border-bottom border-light-subtle">
                                                        <tr style={{ fontSize: '0.72rem', letterSpacing: '0.5px' }} className="text-uppercase text-secondary font-monospace">
                                                            <th className="ps-3 ps-xl-4 py-3">Protocol & Age</th>
                                                            <th className="py-3">Proponent / Affiliation</th>
                                                            <th className="py-3" style={{ minWidth: '220px' }}>Research Title</th>
                                                            <th className="py-3">Review Track</th>
                                                            <th className="py-3">Status</th>
                                                            <th className="pe-3 pe-xl-4 py-3 text-end">Action</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {priorityTriageQueue.map((item) => {
                                                            const turnaroundDays = getTurnaroundDays(item.submission_date);
                                                            const protocolCode = item.protocol_code !== 'N/A' ? item.protocol_code : (item.id || item.application_id);
                                                            const triageUrl = `/admin/dashboard?search=${encodeURIComponent(protocolCode)}&protocolId=${encodeURIComponent(item.application_id)}&autoOpen=true`;
                                                            return (
                                                                <tr 
                                                                    key={item.application_id || item.id}
                                                                    onClick={() => navigate(triageUrl)}
                                                                    onKeyDown={(e) => handleKeyActivate(e, () => navigate(triageUrl))}
                                                                    role="button"
                                                                    tabIndex={0}
                                                                    style={{ cursor: 'pointer' }}
                                                                    aria-label={`Triage protocol ${protocolCode}: ${item.title}`}
                                                                >
                                                                    
                                                                    {/* Protocol Code & Turnaround Urgency Age */}
                                                                    <td className="ps-3 ps-xl-4 py-3 text-nowrap">
                                                                        <div className="fw-bold font-monospace text-primary" style={{ fontSize: '0.82rem' }}>
                                                                            {item.protocol_code !== 'N/A' ? item.protocol_code : item.id}
                                                                        </div>
                                                                        <div className="mt-1">
                                                                            {renderTurnaroundBadge(turnaroundDays)}
                                                                        </div>
                                                                    </td>

                                                                    {/* Proponent & Affiliation Pill */}
                                                                    <td className="py-3">
                                                                        <div className="fw-semibold text-dark text-truncate" style={{ maxWidth: '180px', fontSize: '0.84rem' }} title={item.proponent_name}>
                                                                            {item.proponent_name}
                                                                        </div>
                                                                        <div className="d-flex align-items-center gap-1 mt-1">
                                                                            <span 
                                                                                className={`badge rounded-pill fw-medium ${item.affiliation === 'External' ? 'bg-secondary-subtle text-secondary-emphasis border border-secondary-subtle' : 'bg-primary-subtle text-primary-emphasis border border-primary-subtle'}`}
                                                                                style={{ fontSize: '0.66rem' }}
                                                                            >
                                                                                {item.affiliation || 'Internal'}
                                                                            </span>
                                                                            <span 
                                                                                className="text-secondary small text-truncate" 
                                                                                style={{ maxWidth: '120px', fontSize: '0.72rem' }}
                                                                                title={item.department}
                                                                            >
                                                                                {item.department}
                                                                            </span>
                                                                        </div>
                                                                    </td>

                                                                    {/* Gracefully Truncated Title (2 lines clamp) */}
                                                                    <td className="py-3">
                                                                        <p 
                                                                            className="mb-0 text-dark fw-medium small"
                                                                            title={item.title}
                                                                            style={{
                                                                                display: '-webkit-box',
                                                                                WebkitLineClamp: 2,
                                                                                WebkitBoxOrient: 'vertical',
                                                                                overflow: 'hidden',
                                                                                lineHeight: '1.35',
                                                                                fontSize: '0.82rem'
                                                                            }}
                                                                        >
                                                                            {item.title}
                                                                        </p>
                                                                    </td>

                                                                    {/* Review Track Pill */}
                                                                    <td className="py-3 text-nowrap">
                                                                        {renderTrackBadge(item.type)}
                                                                    </td>

                                                                    {/* WCAG AA Status Pill */}
                                                                    <td className="py-3 text-nowrap">
                                                                        {renderStatusPill(item.status)}
                                                                    </td>

                                                                    {/* Direct Action Link */}
                                                                    <td className="pe-3 pe-xl-4 py-3 text-end text-nowrap">
                                                                        <button 
                                                                            type="button"
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                navigate(triageUrl);
                                                                            }}
                                                                            className="btn btn-sm btn-outline-primary rounded-pill px-3 py-1 fw-semibold d-inline-flex align-items-center"
                                                                            style={{ fontSize: '0.75rem', minHeight: '32px' }}
                                                                            title={`Triage Protocol ${protocolCode}`}
                                                                        >
                                                                            <span>Triage</span>
                                                                            <i className="bi bi-chevron-right ms-1" style={{ fontSize: '0.7rem' }}></i>
                                                                        </button>
                                                                    </td>
                                                                </tr>
                                                            );
                                                        })}
                                                    </tbody>
                                                </table>
                                            </div>
                                        )}
                                    </div>

                                    {/* Queue Summary Footer */}
                                    <div className="card-footer bg-light-subtle border-top border-light-subtle py-2 px-3 px-xl-4 d-flex justify-content-between align-items-center">
                                        <small className="text-secondary" style={{ fontSize: '0.75rem' }}>
                                            Displaying top {priorityTriageQueue.length} priority item{priorityTriageQueue.length !== 1 ? 's' : ''} of {actionRequiredCount} requiring triage
                                        </small>
                                        <Link to="/admin/dashboard" className="text-primary text-decoration-none small fw-semibold d-inline-flex align-items-center" style={{ fontSize: '0.75rem' }}>
                                            <span>Full Workflow Matrix</span>
                                            <i className="bi bi-arrow-right-short ms-1 fs-6"></i>
                                        </Link>
                                    </div>

                                </div>
                            </div>

                            {/* TYPE DISTRIBUTION & SECRETARIAT QUICK HUB */}
                            <div className="col-12 col-xl-4 d-flex flex-column gap-4">
                                
                                {/* Card 1: Review Track Distribution Breakdown */}
                                <div className="card border-0 shadow-sm rounded-4 bg-white">
                                    <div className="card-body p-3 p-xl-4">
                                        <div className="d-flex justify-content-between align-items-start mb-3">
                                            <div>
                                                <h5 className="fw-bold text-dark mb-1">Review Track Distribution</h5>
                                                <small className="text-secondary d-block">
                                                    Active protocol portfolio by risk category
                                                </small>
                                            </div>
                                            <span className="badge bg-primary-subtle text-primary border border-primary-subtle rounded-pill small fw-semibold">
                                                {totalProtocols} Total
                                            </span>
                                        </div>

                                        {/* Stacked Proportional Distribution Bar */}
                                        <div className="progress mb-3 rounded-pill overflow-hidden bg-light border border-light-subtle" style={{ height: '10px' }}>
                                            {trackBreakdown.map((track) => (
                                                track.count > 0 && (
                                                    <div 
                                                        key={track.key}
                                                        className={`progress-bar ${track.bgClass}`}
                                                        role="progressbar" 
                                                        style={{ width: `${track.pct}%`, backgroundColor: track.color }}
                                                        aria-valuenow={track.pct} 
                                                        aria-valuemin="0" 
                                                        aria-valuemax="100"
                                                        aria-label={`${track.label}: ${track.count} protocols (${track.pct}%)`}
                                                        title={`${track.label}: ${track.count} (${track.pct}%)`}
                                                    />
                                                )
                                            ))}
                                        </div>

                                        {/* Track Row Items with Subtitles */}
                                        <div className="d-flex flex-column gap-2">
                                            {trackBreakdown.map((track) => (
                                                <div key={track.key} className="p-2 px-3 rounded-3 bg-light-subtle border border-light-subtle">
                                                    <div className="d-flex justify-content-between align-items-center mb-1">
                                                        <div className="d-flex align-items-center gap-2">
                                                            <span 
                                                                className="rounded-circle d-inline-block flex-shrink-0" 
                                                                style={{ width: '10px', height: '10px', backgroundColor: track.color }}
                                                            />
                                                            <span className="fw-semibold text-dark small">{track.label}</span>
                                                        </div>
                                                        <div className="d-flex align-items-baseline gap-1">
                                                            <span className="fw-bold text-dark fs-6">{track.count}</span>
                                                            <span className="text-secondary small" style={{ fontSize: '0.72rem' }}>({track.pct}%)</span>
                                                        </div>
                                                    </div>
                                                    <div className="d-flex justify-content-between align-items-center">
                                                        <small className="text-secondary text-truncate pe-2" style={{ fontSize: '0.70rem' }}>
                                                            {track.desc}
                                                        </small>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* Card 2: Secretariat Quick Action Hub */}
                                <div className="card border-0 shadow-sm rounded-4 bg-white flex-grow-1">
                                    <div className="card-body p-3 p-xl-4 d-flex flex-column">
                                        <div className="mb-3">
                                            <h5 className="fw-bold text-dark mb-1">Secretariat Quick Hub</h5>
                                            <small className="text-secondary d-block">
                                                High-frequency administrative operational routes
                                            </small>
                                        </div>

                                        <div className="d-flex flex-column gap-2 flex-grow-1 justify-content-between">
                                            
                                            {/* Action 1: Verify Pending Payments */}
                                            <Link 
                                                to="/admin/dashboard?status=PAYMENT%20PENDING" 
                                                className="d-flex align-items-center justify-content-between p-2 px-3 rounded-3 border text-decoration-none"
                                                style={getQuickActionStyle('payments')}
                                                onMouseEnter={() => setHoveredAction('payments')}
                                                onMouseLeave={() => setHoveredAction(null)}
                                            >
                                                <div className="d-flex align-items-center gap-2">
                                                    <div 
                                                        className="d-flex align-items-center justify-content-center rounded-3 flex-shrink-0"
                                                        style={{ width: '36px', height: '36px', backgroundColor: 'rgba(184, 134, 11, 0.1)', color: '#b8860b' }}
                                                    >
                                                        <i className="bi bi-credit-card-2-front-fill fs-6"></i>
                                                    </div>
                                                    <div>
                                                        <span className="d-block fw-semibold text-dark small lh-sm">Verify Pending Payments</span>
                                                        <small className="text-secondary" style={{ fontSize: '0.70rem' }}>Receipts & teller validations</small>
                                                    </div>
                                                </div>
                                                <div className="d-flex align-items-center gap-2">
                                                    <span className="badge bg-warning-subtle text-warning-emphasis border border-warning-subtle rounded-pill font-monospace" style={{ fontSize: '0.70rem' }}>
                                                        {pendingPaymentsCount}
                                                    </span>
                                                    <i className="bi bi-chevron-right text-secondary small"></i>
                                                </div>
                                            </Link>

                                            {/* Action 2: Assign Reviewers & Classify */}
                                            <Link 
                                                to="/admin/dashboard?status=TYPE%20OF%20REVIEW" 
                                                className="d-flex align-items-center justify-content-between p-2 px-3 rounded-3 border text-decoration-none"
                                                style={getQuickActionStyle('assign')}
                                                onMouseEnter={() => setHoveredAction('assign')}
                                                onMouseLeave={() => setHoveredAction(null)}
                                            >
                                                <div className="d-flex align-items-center gap-2">
                                                    <div 
                                                        className="d-flex align-items-center justify-content-center rounded-3 flex-shrink-0"
                                                        style={{ width: '36px', height: '36px', backgroundColor: 'rgba(13, 110, 253, 0.08)', color: '#0d6efd' }}
                                                    >
                                                        <i className="bi bi-person-check-fill fs-6"></i>
                                                    </div>
                                                    <div>
                                                        <span className="d-block fw-semibold text-dark small lh-sm">Assign Reviewers & Classify</span>
                                                        <small className="text-secondary" style={{ fontSize: '0.70rem' }}>Track allocation & reviewer appointment</small>
                                                    </div>
                                                </div>
                                                <div className="d-flex align-items-center gap-2">
                                                    <span className="badge bg-primary-subtle text-primary-emphasis border border-primary-subtle rounded-pill font-monospace" style={{ fontSize: '0.70rem' }}>
                                                        {assignReviewersCount}
                                                    </span>
                                                    <i className="bi bi-chevron-right text-secondary small"></i>
                                                </div>
                                            </Link>

                                            {/* Action 3: Issue Decision Letters */}
                                            <Link 
                                                to="/admin/dashboard?status=CONSOLIDATION%20OF%20EVALUATION" 
                                                className="d-flex align-items-center justify-content-between p-2 px-3 rounded-3 border text-decoration-none"
                                                style={getQuickActionStyle('letters')}
                                                onMouseEnter={() => setHoveredAction('letters')}
                                                onMouseLeave={() => setHoveredAction(null)}
                                            >
                                                <div className="d-flex align-items-center gap-2">
                                                    <div 
                                                        className="d-flex align-items-center justify-content-center rounded-3 flex-shrink-0"
                                                        style={{ width: '36px', height: '36px', backgroundColor: 'rgba(0, 51, 102, 0.08)', color: '#003366' }}
                                                    >
                                                        <i className="bi bi-file-earmark-check-fill fs-6"></i>
                                                    </div>
                                                    <div>
                                                        <span className="d-block fw-semibold text-dark small lh-sm">Issue Decision Letters</span>
                                                        <small className="text-secondary" style={{ fontSize: '0.70rem' }}>Formal REC committee findings</small>
                                                    </div>
                                                </div>
                                                <div className="d-flex align-items-center gap-2">
                                                    <span className="badge bg-info-subtle text-info-emphasis border border-info-subtle rounded-pill font-monospace" style={{ fontSize: '0.70rem' }}>
                                                        {consolidationsCount}
                                                    </span>
                                                    <i className="bi bi-chevron-right text-secondary small"></i>
                                                </div>
                                            </Link>

                                            {/* Action 4: Institutional Compliance Reporting */}
                                            <Link 
                                                to="/admin/analytics" 
                                                className="d-flex align-items-center justify-content-between p-2 px-3 rounded-3 border text-decoration-none"
                                                style={getQuickActionStyle('analytics')}
                                                onMouseEnter={() => setHoveredAction('analytics')}
                                                onMouseLeave={() => setHoveredAction(null)}
                                            >
                                                <div className="d-flex align-items-center gap-2">
                                                    <div 
                                                        className="d-flex align-items-center justify-content-center rounded-3 flex-shrink-0"
                                                        style={{ width: '36px', height: '36px', backgroundColor: 'rgba(25, 135, 84, 0.1)', color: '#198754' }}
                                                    >
                                                        <i className="bi bi-graph-up-arrow fs-6"></i>
                                                    </div>
                                                    <div>
                                                        <span className="d-block fw-semibold text-dark small lh-sm">Compliance Reporting</span>
                                                        <small className="text-secondary" style={{ fontSize: '0.70rem' }}>PHREB accreditation & audit KPIs</small>
                                                    </div>
                                                </div>
                                                <div className="d-flex align-items-center gap-2">
                                                    <span className="badge bg-success-subtle text-success-emphasis border border-success-subtle rounded-pill small fw-semibold" style={{ fontSize: '0.70rem' }}>
                                                        Live
                                                    </span>
                                                    <i className="bi bi-chevron-right text-secondary small"></i>
                                                </div>
                                            </Link>

                                        </div>
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
