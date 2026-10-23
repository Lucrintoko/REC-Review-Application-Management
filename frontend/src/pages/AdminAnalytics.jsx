import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
    BarChart, Bar,
    LineChart, Line,
    PieChart, Pie,
    XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell
} from 'recharts';
import { apiClient } from '../services/api';
import ExecutiveKpiTiles from '../components/admin/ExecutiveKpiTiles';
import adzuSeal from '../assets/AdZU Seal.png';

const MONTH_NAMES = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
];

const MONTH_SHORT = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

// The 8 Academic Colleges & Schools of Ateneo de Zamboanga University
export const ACADEMIC_COLLEGES = [
    { 
        code: 'CSITE', 
        name: 'Science, Info Tech & Engineering', 
        fullName: 'College of Science, Information, Technology, and Engineering',
        accentColor: '#003366',
        icon: 'bi-cpu-fill',
        keywords: ['science', 'information technology', 'engineering', 'csite']
    },
    { 
        code: 'CON', 
        name: 'College of Nursing', 
        fullName: 'College of Nursing',
        accentColor: '#198754',
        icon: 'bi-heart-pulse-fill',
        keywords: ['nursing', 'con']
    },
    { 
        code: 'SEd', 
        name: 'School of Education', 
        fullName: 'School of Education',
        accentColor: '#fd7e14',
        icon: 'bi-mortarboard-fill',
        keywords: ['education', 'sed']
    },
    { 
        code: 'SLA', 
        name: 'School of Liberal Arts', 
        fullName: 'School of Liberal Arts',
        accentColor: '#0d6efd',
        icon: 'bi-book-fill',
        keywords: ['liberal arts', 'sla']
    },
    { 
        code: 'SMA', 
        name: 'Management & Accountancy', 
        fullName: 'School of Management and Accountancy',
        accentColor: '#b8860b',
        icon: 'bi-briefcase-fill',
        keywords: ['management', 'accountancy', 'sma', 'business']
    },
    { 
        code: 'GS', 
        name: 'Graduate School', 
        fullName: 'Graduate School',
        accentColor: '#6f42c1',
        icon: 'bi-award-fill',
        keywords: ['graduate school', 'graduate studies', 'grad school']
    },
    { 
        code: 'SOM', 
        name: 'School of Medicine', 
        fullName: 'School of Medicine',
        accentColor: '#dc3545',
        icon: 'bi-hospital-fill',
        keywords: ['medicine', 'som', 'medical']
    },
    { 
        code: 'Law', 
        name: 'College of Law', 
        fullName: 'Rosendo U. Castillo Jr. College of Law',
        accentColor: '#495057',
        icon: 'bi-shield-shaded',
        keywords: ['law', 'castillo', 'legal']
    }
];

// Dedicated External Entities & Partner Institutions Unit
export const EXTERNAL_ENTITY_DEF = {
    code: 'EXT',
    name: 'External Entities & Partners',
    fullName: 'External Entities & Partner Institutions (ZCMC, DOH, WMSU, etc.)',
    accentColor: '#087990', // Deep Oceanic Teal
    icon: 'bi-globe2',
    isExternal: true,
    keywords: [
        'external', 'partner', 'zcmc', 'zamboanga city medical center', 
        'doh', 'department of health', 'wmsu', 'brent', 'hospital', 
        'chd ix', 'clinic', 'ngo', 'pharma', 'sponsored'
    ]
};

// All Institutional Units (8 Academic Colleges + External Partners)
export const ALL_INSTITUTIONAL_UNITS = [...ACADEMIC_COLLEGES, EXTERNAL_ENTITY_DEF];

// Matches Protocol to its Academic Unit or External Entity
export function getCollegeForProtocol(protocol) {
    // 1. Direct Applicant Affiliation Check from Database
    const affiliation = (protocol.applicant_affiliation || '').toLowerCase();
    if (affiliation === 'external') {
        return 'EXT';
    }

    const rawDept = (
        protocol.applicant_department || 
        protocol.department_agency || 
        protocol.form_data?.institution_department || 
        protocol.form_data?.primary_researchers?.[0]?.department || 
        ''
    ).toLowerCase();

    const instName = (
        protocol.form_data?.institution_name || 
        protocol.institution_name || 
        ''
    ).toLowerCase();

    // 2. Explicit external institution name (non-AdZU)
    if (instName && !instName.includes('adzu') && !instName.includes('ateneo')) {
        return 'EXT';
    }

    // 3. External keyword heuristics (prevents false SOM attribution for ZCMC / Brent Hospital)
    if (!rawDept.includes('adzu') && !rawDept.includes('ateneo')) {
        if (EXTERNAL_ENTITY_DEF.keywords.some(kw => rawDept.includes(kw) || instName.includes(kw))) {
            return 'EXT';
        }
    }

    // 4. Internal AdZU Colleges & Schools keyword match
    for (const college of ACADEMIC_COLLEGES) {
        if (college.keywords.some(kw => rawDept.includes(kw))) {
            return college.code;
        }
    }

    // 5. Fallback for generic graduate studies
    if ((protocol.research_type || '').toLowerCase() === 'graduate') {
        return 'GS';
    }

    // 6. Externally funded fallback if not matched to internal college
    if ((protocol.research_type || '').toLowerCase() === 'externally funded') {
        return 'EXT';
    }

    return 'OTHER';
}

// Safely parse ISO date strings (YYYY-MM-DD) avoiding UTC timezone shifts
export function parseDateParts(dateStr) {
    if (!dateStr || typeof dateStr !== 'string') return null;
    const cleanStr = dateStr.split('T')[0];
    const parts = cleanStr.split('-');
    if (parts.length < 3) return null;
    return {
        year: parseInt(parts[0], 10),
        month: parseInt(parts[1], 10) - 1, // 0-indexed month (0 = Jan)
        day: parseInt(parts[2], 10),
    };
}

function AdminAnalytics() {
    const navigate = useNavigate();

    // Take admin credentials from localStorage
    const adminName = localStorage.getItem('adminName') || "Admin";

    // Authentication Guard
    useEffect(() => {
        if (!localStorage.getItem('adminName')) {
            navigate('/admin/login');
        }
    }, [navigate]);

    // Data State
    const [protocolData, setProtocolData] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [fetchError, setFetchError] = useState(null);

    // Temporal Filter State (Phase 2)
    const [reportMode, setReportMode] = useState('yearly'); // 'yearly' | 'monthly'
    const [selectedYear, setSelectedYear] = useState(2026);
    const [selectedMonth, setSelectedMonth] = useState(9); // 0-indexed: 9 = October

    // Collegiate Focus State (Phase 3)
    const [selectedCollege, setSelectedCollege] = useState('ALL');

    // Fetch data using centralized apiClient (Proxy compliant)
    useEffect(() => {
        let isMounted = true;
        setIsLoading(true);
        setFetchError(null);

        apiClient.get('/applications')
            .then(databaseJSON => {
                if (!isMounted) return;
                const rows = Array.isArray(databaseJSON.data) ? databaseJSON.data : [];
                const formattedData = rows.map(row => ({
                    ...row,
                    research_type: (row.research_type || '').toUpperCase(),
                    status: (row.status || '').toUpperCase(),
                }));
                setProtocolData(formattedData);
                setIsLoading(false);
            })
            .catch(error => {
                if (!isMounted) return;
                console.error("Error Fetching Analytics Data: ", error);
                setFetchError(error.message || "Failed to load analytics data");
                setIsLoading(false);
            });

        return () => { isMounted = false; };
    }, []);

    // Derive available years from data
    const availableYears = useMemo(() => {
        const yearsSet = new Set([2025, 2026]);
        protocolData.forEach(p => {
            const parts = parseDateParts(p.submission_date);
            if (parts?.year) yearsSet.add(parts.year);
        });
        return Array.from(yearsSet).sort((a, b) => b - a);
    }, [protocolData]);

    // Derived Date Range Title
    const reportingPeriodTitle = useMemo(() => {
        if (reportMode === 'yearly') {
            return `Annual Statistics Report — Calendar Year ${selectedYear}`;
        }
        return `Monthly Statistics Report — ${MONTH_NAMES[selectedMonth]} ${selectedYear}`;
    }, [reportMode, selectedYear, selectedMonth]);

    const reportingDateSpan = useMemo(() => {
        if (reportMode === 'yearly') {
            return `Jan 01, ${selectedYear} – Dec 31, ${selectedYear}`;
        }
        const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
        return `${MONTH_SHORT[selectedMonth]} 01, ${selectedYear} – ${MONTH_SHORT[selectedMonth]} ${daysInMonth}, ${selectedYear}`;
    }, [reportMode, selectedYear, selectedMonth]);

    // INSTITUTIONAL UNITS & EXTERNAL ENTITIES ANALYTICS DATA
    const collegeAnalyticsData = useMemo(() => {
        // Evaluate all protocols active within the selected temporal reporting window
        const periodProtocols = protocolData.filter(protocol => {
            const parts = parseDateParts(protocol.submission_date);
            if (!parts) return false;
            if (reportMode === 'yearly') {
                return parts.year === selectedYear;
            }
            return parts.year === selectedYear && parts.month === selectedMonth;
        });

        return ALL_INSTITUTIONAL_UNITS.map(college => {
            const collegeProtocols = periodProtocols.filter(p => getCollegeForProtocol(p) === college.code);
            const total = collegeProtocols.length;
            const cleared = collegeProtocols.filter(p => p.status === 'CLEARANCE GRANTED').length;
            const ongoing = collegeProtocols.filter(p => [
                'ONGOING REVIEW', 
                'CONSOLIDATION OF EVALUATION', 
                'TYPE OF REVIEW',
                'PROTOCOLS SUBMITTED',
                'PAYMENT VERIFIED'
            ].includes(p.status)).length;
            const pending = Math.max(0, total - cleared - ongoing);
            const rate = total > 0 ? Math.round((cleared / total) * 100) : 0;

            return {
                code: college.code,
                name: college.name,
                fullName: college.fullName,
                accentColor: college.accentColor,
                icon: college.icon,
                isExternal: Boolean(college.isExternal),
                total,
                cleared,
                ongoing,
                pending,
                rate
            };
        });
    }, [protocolData, reportMode, selectedYear, selectedMonth]);

    // Separate Internal Colleges and External Partners for UI Tiering
    const internalCollegesData = useMemo(() => {
        return collegeAnalyticsData.filter(c => !c.isExternal);
    }, [collegeAnalyticsData]);

    const externalEntityData = useMemo(() => {
        return collegeAnalyticsData.find(c => c.isExternal) || {
            code: 'EXT',
            name: 'External Entities & Partners',
            fullName: 'External Entities & Partner Institutions',
            accentColor: '#087990',
            icon: 'bi-globe2',
            isExternal: true,
            total: 0,
            cleared: 0,
            ongoing: 0,
            pending: 0,
            rate: 0
        };
    }, [collegeAnalyticsData]);

    // FILTERED DATA (Responds to the Selected College by the User)
    const activeCollegeObject = useMemo(() => {
        if (selectedCollege === 'ALL') return null;
        return ALL_INSTITUTIONAL_UNITS.find(c => c.code === selectedCollege) || null;
    }, [selectedCollege]);

    const filteredProtocols = useMemo(() => {
        if (selectedCollege === 'ALL') return protocolData;
        return protocolData.filter(p => getCollegeForProtocol(p) === selectedCollege);
    }, [protocolData, selectedCollege]);

    // New Protocols Intake in Period (matching submission_date, excluding drafts)
    const periodIntakeProtocols = useMemo(() => {
        return filteredProtocols.filter(protocol => {
            if (protocol.status === 'DRAFT') return false;
            const parts = parseDateParts(protocol.submission_date);
            if (!parts) return false;
            if (reportMode === 'yearly') {
                return parts.year === selectedYear;
            }
            return parts.year === selectedYear && parts.month === selectedMonth;
        });
    }, [filteredProtocols, reportMode, selectedYear, selectedMonth]);

    // 2. Clearances Issued in Period (matching clearance_date)
    const periodClearances = useMemo(() => {
        return filteredProtocols.filter(protocol => {
            const clrParts = parseDateParts(protocol.clearance_date) || 
                (protocol.status === 'CLEARANCE GRANTED' ? parseDateParts(protocol.decision_date || protocol.submission_date) : null);
            if (!clrParts) return false;
            if (reportMode === 'yearly') {
                return clrParts.year === selectedYear;
            }
            return clrParts.year === selectedYear && clrParts.month === selectedMonth;
        });
    }, [filteredProtocols, reportMode, selectedYear, selectedMonth]);

    // 3. Final Decisions in Period
    const finalDecisions = useMemo(() => {
        const decisions = filteredProtocols.filter(protocol => {
            const isTerminal = ['CLEARANCE GRANTED', 'REJECTED', 'WITHDRAWN'].includes(protocol.status);
            if (!isTerminal) return false;

            const dateParts = parseDateParts(protocol.clearance_date) || 
                              parseDateParts(protocol.decision_date) || 
                              parseDateParts(protocol.submission_date);
            if (!dateParts) return false;

            if (reportMode === 'yearly') {
                return dateParts.year === selectedYear;
            }
            return dateParts.year === selectedYear && dateParts.month === selectedMonth;
        });

        return [
            { name: 'Clearance Granted', count: decisions.filter(p => p.status === 'CLEARANCE GRANTED').length, fill: '#198754' },
            { name: 'Rejected', count: decisions.filter(p => p.status === 'REJECTED').length, fill: '#dc3545' },
            { name: 'Withdrawn', count: decisions.filter(p => p.status === 'WITHDRAWN').length, fill: '#6c757d' }
        ];
    }, [filteredProtocols, reportMode, selectedYear, selectedMonth]);

    // 4. Velocity Trend Data (Dynamic: 12 Months in Yearly Mode vs. 5 Weeks in Monthly Mode)
    const velocityTrendData = useMemo(() => {
        if (reportMode === 'yearly') {
            const counts = {};
            MONTH_SHORT.forEach(m => { counts[m] = { submissions: 0, clearances: 0 }; });

            filteredProtocols.forEach(p => {
                if (p.status !== 'DRAFT') {
                    const subParts = parseDateParts(p.submission_date);
                    if (subParts && subParts.year === selectedYear) {
                        const mName = MONTH_SHORT[subParts.month];
                        if (counts[mName]) counts[mName].submissions += 1;
                    }
                }

                const clrParts = parseDateParts(p.clearance_date);
                if (clrParts && clrParts.year === selectedYear) {
                    const mName = MONTH_SHORT[clrParts.month];
                    if (counts[mName]) counts[mName].clearances += 1;
                }
            });

            return MONTH_SHORT.map(m => ({
                interval: m,
                submissions: counts[m].submissions,
                clearances: counts[m].clearances,
            }));
        }

        // Monthly Mode: 5-Week Breakdown
        const weekBuckets = [
            { interval: 'W1 (1-7)', minDay: 1, maxDay: 7, submissions: 0, clearances: 0 },
            { interval: 'W2 (8-14)', minDay: 8, maxDay: 14, submissions: 0, clearances: 0 },
            { interval: 'W3 (15-21)', minDay: 15, maxDay: 21, submissions: 0, clearances: 0 },
            { interval: 'W4 (22-28)', minDay: 22, maxDay: 28, submissions: 0, clearances: 0 },
            { interval: 'W5 (29-31)', minDay: 29, maxDay: 31, submissions: 0, clearances: 0 },
        ];

        filteredProtocols.forEach(p => {
            if (p.status !== 'DRAFT') {
                const subParts = parseDateParts(p.submission_date);
                if (subParts && subParts.year === selectedYear && subParts.month === selectedMonth) {
                    const bucket = weekBuckets.find(w => subParts.day >= w.minDay && subParts.day <= w.maxDay);
                    if (bucket) bucket.submissions += 1;
                }
            }

            const clrParts = parseDateParts(p.clearance_date);
            if (clrParts && clrParts.year === selectedYear && clrParts.month === selectedMonth) {
                const bucket = weekBuckets.find(w => clrParts.day >= w.minDay && clrParts.day <= w.maxDay);
                if (bucket) bucket.clearances += 1;
            }
        });

        return weekBuckets.map(w => ({
            interval: w.interval,
            submissions: w.submissions,
            clearances: w.clearances,
        }));
    }, [filteredProtocols, reportMode, selectedYear, selectedMonth]);

    // 5. Active Pipeline Breakdown
    const activePipeline = useMemo(() => {
        const statuses = [
            { name: 'Ongoing Review', count: filteredProtocols.filter(p => p.status === 'ONGOING REVIEW').length, fill: '#ffc107' },
            { name: 'Decision Letter Issued', count: filteredProtocols.filter(p => p.status === 'DECISION LETTER ISSUED').length, fill: '#0dcaf0' },
            { name: 'Payment Pending', count: filteredProtocols.filter(p => p.status === 'PAYMENT PENDING').length, fill: '#dc3545' },
            { name: 'Consolidation of Evaluation', count: filteredProtocols.filter(p => p.status === 'CONSOLIDATION OF EVALUATION').length, fill: '#003366' },
            { name: 'Type of Review', count: filteredProtocols.filter(p => p.status === 'TYPE OF REVIEW').length, fill: '#6f42c1' },
            { name: 'Drafts', count: filteredProtocols.filter(p => p.status === 'DRAFT').length, fill: '#6c757d' }
        ];
        return statuses.filter(s => s.count > 0);
    }, [filteredProtocols]);

    return (
        <div className='min-vh-100 d-flex flex-column bg-body-tertiary'>

            {/* Embedded Print & PDF Media Stylesheet */}
            <style>{`
                @media print {
                    @page {
                        size: letter portrait;
                        margin: 12mm 15mm 15mm 15mm;
                    }
                    * {
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }
                    body {
                        background-color: #ffffff !important;
                        color: #000000 !important;
                        font-size: 10pt;
                    }
                    html, body, 
                    #root,
                    .min-vh-100, 
                    .flex-grow-1,
                    div[style*="overflowY: auto"],
                    div[style*="overflow-y: auto"],
                    div[style*="height: 100vh"] {
                        height: auto !important;
                        min-height: auto !important;
                        max-height: none !important;
                        overflow: visible !important;
                        position: static !important;
                        background-color: #ffffff !important;
                    }
                    header.brand-header,
                    .brand-header,
                    aside,
                    nav,
                    .border-end[style*="position: sticky"],
                    .d-print-none,
                    button,
                    select,
                    .btn-group {
                        display: none !important;
                    }
                    main {
                        margin: 0 !important;
                        padding: 0 !important;
                        width: 100% !important;
                        max-width: 100% !important;
                    }
                    .card {
                        border: 1px solid #dee2e6 !important;
                        box-shadow: none !important;
                        break-inside: avoid !important;
                        page-break-inside: avoid !important;
                        margin-bottom: 1rem !important;
                        background-color: #ffffff !important;
                    }
                    .row, 
                    table, 
                    tr, 
                    .chart-container,
                    .signature-block {
                        break-inside: avoid !important;
                        page-break-inside: avoid !important;
                    }
                    .table {
                        border-color: #333333 !important;
                    }
                    .table th {
                        background-color: #f1f3f5 !important;
                        color: #000000 !important;
                        border-bottom: 2px solid #000000 !important;
                    }
                }
            `}</style>

            {/* Brand Header */}
            <header className='brand-header shadow-sm' style={{ minHeight: '64px', backgroundColor: '#003366' }}>
                <div className='container-fluid d-flex justify-content-between align-items-center h-100 px-4 py-2 gap-3 text-white'>
                    <div className='d-flex align-items-center gap-3'>
                        <Link to="/admin/dashboard" className="btn btn-sm btn-outline-light d-flex align-items-center gap-2 rounded-pill px-3">
                            <i className="bi bi-arrow-left"></i>
                            <span className="d-none d-sm-inline">Back to Dashboard</span>
                        </Link>
                        <div>
                            <h5 className='mb-0 fw-bold text-white'>Ateneo de Zamboanga University REC</h5>
                            <small className='text-light opacity-75'>Ethics Review Analytics & Office Reporting</small>
                        </div>
                    </div>

                    <div className='d-flex align-items-center gap-2'>
                        <span className='badge bg-light text-dark px-3 py-2 rounded-pill shadow-xs'>
                            <i className='bi bi-person-badge me-1 text-primary'></i>
                            {adminName} (Admin)
                        </span>
                    </div>
                </div>
            </header>

            {/* Main Content Area */}
            <main className='container-fluid px-4 my-4 flex-grow-1'>

                {/* OFFICIAL PRINT-ONLY LETTERHEAD (AdZU Institutional Header) */}
                <div className='d-none d-print-block mb-4 pb-3 border-bottom border-2 border-dark'>
                    <div className='d-flex align-items-center gap-3 mb-3'>
                        <img 
                            src={adzuSeal} 
                            alt="AdZU Official Seal" 
                            style={{ width: '75px', height: '75px', objectFit: 'contain' }} 
                        />
                        <div className='flex-grow-1'>
                            <h6 className='fw-bold text-uppercase mb-0' style={{ color: '#003366', letterSpacing: '0.8px' }}>
                                Ateneo de Zamboanga University
                            </h6>
                            <h5 className='fw-bolder mb-0 text-dark' style={{ letterSpacing: '0.5px' }}>
                                RESEARCH ETHICS COMMITTEE
                            </h5>
                            <small className='text-secondary d-block'>
                                Office of the University Research Ethics Committee • Fr. Eusebio G. Salvador SJ Campus, La Purisima St., Zamboanga City 7000
                            </small>
                        </div>
                    </div>

                    {/* Dossier Grid */}
                    <div className='bg-light p-3 rounded-2 border border-secondary-subtle'>
                        <div className='row g-2 small'>
                            <div className='col-7'>
                                <span className='text-muted d-block'>DOCUMENT TITLE:</span>
                                <strong className='text-dark fs-6 text-uppercase'>{reportingPeriodTitle}</strong>
                            </div>
                            <div className='col-5 text-end'>
                                <span className='text-muted d-block'>DATE GENERATED:</span>
                                <strong className='text-dark'>
                                    {new Date().toLocaleDateString('en-PH', { 
                                        year: 'numeric', 
                                        month: 'long', 
                                        day: 'numeric', 
                                        hour: '2-digit', 
                                        minute: '2-digit' 
                                    })}
                                </strong>
                            </div>
                            <div className='col-7 pt-1 border-top border-light-subtle'>
                                <span className='text-muted me-2'>Institutional Scope:</span>
                                <strong className='text-primary'>
                                    {selectedCollege === 'ALL' ? 'All 8 Academic Colleges & Schools' : (activeCollegeObject?.fullName || selectedCollege)}
                                </strong>
                            </div>
                            <div className='col-5 text-end pt-1 border-light-subtle'>
                                <span className='text-muted me-2'>Prepared By:</span>
                                <strong className='text-dark'>{adminName} (REC Secretariat)</strong>
                            </div>
                        </div>
                    </div>
                </div>

                {/* INTERACTIVE CONTROL CENTER */}
                <div className='card border-0 shadow-sm rounded-4 mb-4'>
                    <div className='card-body p-3 p-md-4'>
                        <div className='d-flex flex-column flex-lg-row align-items-lg-center justify-content-between gap-3'>
                            {/* Page & Active Scope Identity */}
                            <div>
                                <div className='d-flex align-items-center gap-2 mb-1 flex-wrap'>
                                    <h4 className='fw-bold mb-0 text-dark'>Analytics & Reporting</h4>
                                    <span className={`badge ${reportMode === 'yearly' ? 'bg-primary-subtle text-primary border border-primary-subtle' : 'bg-info-subtle text-info-emphasis border border-info-subtle'} rounded-pill px-3 py-1 fw-semibold`}>
                                        <i className={`bi ${reportMode === 'yearly' ? 'bi-calendar-check' : 'bi-calendar3'} me-1`}></i>
                                        {reportMode === 'yearly' ? 'Annual Scope' : 'Monthly Scope'}
                                    </span>
                                    {selectedCollege !== 'ALL' && (
                                        <span className='badge bg-warning-subtle text-warning-emphasis border border-warning-subtle rounded-pill px-3 py-1 fw-semibold d-inline-flex align-items-center gap-1'>
                                            <i className='bi bi-funnel-fill text-warning'></i>
                                            Focus: {activeCollegeObject?.name || selectedCollege}
                                            <button 
                                                type='button' 
                                                className='btn-close ms-1' 
                                                style={{ fontSize: '0.65rem' }} 
                                                aria-label='Clear college focus' 
                                                onClick={() => setSelectedCollege('ALL')}
                                            />
                                        </span>
                                    )}
                                </div>
                                <p className='text-secondary small mb-0'>
                                    Official ethics review protocol throughput, clearance productivity, and office statistics.
                                </p>
                            </div>

                            {/* Temporal Filter Controls */}
                            <div className='d-flex flex-wrap align-items-center gap-2'>
                                {/* Segmented Mode Switcher */}
                                <div className='btn-group shadow-xs' role='group' aria-label='Report Temporal Mode Switcher'>
                                    <button
                                        type='button'
                                        className={`btn btn-sm px-3 fw-medium ${reportMode === 'monthly' ? 'btn-primary' : 'btn-outline-secondary'}`}
                                        onClick={() => setReportMode('monthly')}
                                    >
                                        Monthly
                                    </button>
                                    <button
                                        type='button'
                                        className={`btn btn-sm px-3 fw-medium ${reportMode === 'yearly' ? 'btn-primary' : 'btn-outline-secondary'}`}
                                        onClick={() => setReportMode('yearly')}
                                    >
                                        Yearly
                                    </button>
                                </div>

                                {/* Month Selector: Progressively disclosed in Monthly mode */}
                                {reportMode === 'monthly' && (
                                    <select
                                        className='form-select form-select-sm shadow-xs border-primary'
                                        style={{ width: '135px' }}
                                        value={selectedMonth}
                                        onChange={(e) => setSelectedMonth(Number(e.target.value))}
                                        aria-label='Select Reporting Month'
                                    >
                                        {MONTH_NAMES.map((m, idx) => (
                                            <option key={m} value={idx}>
                                                {m}
                                            </option>
                                        ))}
                                    </select>
                                )}

                                {/* Year Selector: Always visible */}
                                <select
                                    className='form-select form-select-sm shadow-xs'
                                    style={{ width: '105px' }}
                                    value={selectedYear}
                                    onChange={(e) => setSelectedYear(Number(e.target.value))}
                                    aria-label='Select Reporting Year'
                                >
                                    {availableYears.map(yr => (
                                        <option key={yr} value={yr}>
                                            {yr}
                                        </option>
                                    ))}
                                </select>

                                {/* Print / Export PDF Action Button */}
                                <button
                                    type='button'
                                    onClick={() => window.print()}
                                    className='btn btn-sm btn-primary d-flex align-items-center gap-2 rounded-pill px-3 shadow-xs d-print-none'
                                    title='Print or Export Official University PDF Report'
                                >
                                    <i className='bi bi-printer-fill'></i>
                                    <span className='fw-semibold'>Print / PDF</span>
                                </button>
                            </div>
                        </div>

                        {/* Active Period Context Banner */}
                        <div className='mt-3 pt-3 border-top d-flex align-items-center justify-content-between flex-wrap gap-2 text-secondary small'>
                            <div>
                                <strong className='text-dark'>Active Reporting Window: </strong>
                                <span className='text-primary fw-semibold'>{reportingPeriodTitle}</span>
                                <span className='text-muted ms-2'>({reportingDateSpan})</span>
                            </div>
                            <div className='d-flex align-items-center gap-3'>
                                <span>Total Protocols: <strong className='text-dark'>{filteredProtocols.length}</strong></span>
                                <span>Period Intake: <strong className='text-success'>{periodIntakeProtocols.length}</strong></span>
                                <span>Period Clearances: <strong className='text-primary'>{periodClearances.length}</strong></span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Loading & Error States */}
                {isLoading && (
                    <div className='text-center py-5'>
                        <div className='spinner-border text-primary' role='status'>
                            <span className='visually-hidden'>Loading analytics...</span>
                        </div>
                        <p className='text-secondary small mt-2'>Loading ethics review analytics...</p>
                    </div>
                )}

                {fetchError && (
                    <div className='alert alert-danger d-flex align-items-center gap-2 rounded-3 shadow-sm' role='alert'>
                        <i className='bi bi-exclamation-triangle-fill fs-5'></i>
                        <div>{fetchError}</div>
                    </div>
                )}

                {!isLoading && !fetchError && (
                    <>
                        {/* EXECUTIVE STAT TILES */}
                        <ExecutiveKpiTiles 
                            reportMode={reportMode}
                            selectedYear={selectedYear}
                            selectedMonth={selectedMonth}
                            selectedCollege={selectedCollege}
                            activeCollegeObject={activeCollegeObject}
                            filteredProtocols={filteredProtocols}
                            periodIntakeProtocols={periodIntakeProtocols}
                            periodClearances={periodClearances}
                            monthShortNames={MONTH_SHORT}
                        />

                        {/* INSTITUTIONAL & EXTERNAL REVIEW DISTRIBUTION HYBRID SECTION */}
                        <div className='card border-0 shadow-sm rounded-4 mb-4'>
                            <div className='card-body p-3 p-md-4'>
                                {/* Section Header */}
                                <div className='d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2'>
                                    <div>
                                        <h5 className='fw-bold mb-1 text-dark d-flex align-items-center gap-2'>
                                            <i className='bi bi-buildings text-primary'></i>
                                            <span>Institutional & External Review Distribution</span>
                                        </h5>
                                        <small className='text-secondary'>
                                            Review workload, protocol volume, and clearance distribution across the 8 AdZU academic units and external partner institutions
                                        </small>
                                    </div>
                                    {selectedCollege !== 'ALL' && (
                                        <button 
                                            type='button'
                                            className='btn btn-sm btn-outline-danger rounded-pill d-flex align-items-center gap-1 shadow-xs'
                                            onClick={() => setSelectedCollege('ALL')}
                                        >
                                            <i className='bi bi-x-circle'></i>
                                            <span>Reset Focus ({selectedCollege})</span>
                                        </button>
                                    )}
                                </div>

                                <div className='row g-4'>
                                    {/* Left: Stacked Horizontal Bar Chart (col-12 col-lg-7) */}
                                    <div className='col-12 col-lg-7'>
                                        <div className='p-3 bg-white rounded-3 border h-100 d-flex flex-column'>
                                            <div className='d-flex justify-content-between align-items-center mb-2'>
                                                <h6 className='fw-bold text-dark mb-0'>Protocol Volume & Clearance Status</h6>
                                                <span className='badge bg-light text-secondary border font-monospace small'>
                                                    {reportMode === 'monthly' ? `${MONTH_SHORT[selectedMonth]} ${selectedYear}` : `CY ${selectedYear}`}
                                                </span>
                                            </div>
                                            <div style={{ width: '100%', height: 385 }}>
                                                <ResponsiveContainer>
                                                    <BarChart data={collegeAnalyticsData} layout="vertical" margin={{ top: 10, right: 30, left: 10, bottom: 5 }}>
                                                        <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#E9ECEF" />
                                                        <XAxis type="number" tick={{ fontSize: 12, fill: '#6C757D' }} />
                                                        <YAxis 
                                                            dataKey="code" 
                                                            type="category" 
                                                            width={55} 
                                                            tick={({ x, y, payload }) => {
                                                                const isExt = payload.value === 'EXT';
                                                                return (
                                                                    <text 
                                                                        x={x} 
                                                                        y={y} 
                                                                        dy={4} 
                                                                        textAnchor="end" 
                                                                        fontSize={11} 
                                                                        fontWeight={isExt ? 'bold' : '600'} 
                                                                        fill={isExt ? '#087990' : '#003366'}
                                                                    >
                                                                        {payload.value}
                                                                    </text>
                                                                );
                                                            }} 
                                                        />
                                                        <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                                                        <Legend iconType="circle" wrapperStyle={{ paddingTop: '8px', fontSize: '12px' }} />
                                                        <Bar dataKey="cleared" name="Clearance Granted" stackId="col" fill="#198754" />
                                                        <Bar dataKey="ongoing" name="Under Review" stackId="col" fill="#D4AF37" />
                                                        <Bar dataKey="pending" name="Pending / Revisions" stackId="col" fill="#003366" radius={[0, 4, 4, 0]} />
                                                    </BarChart>
                                                </ResponsiveContainer>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Right: Tiered Institutional Focus Matrix (col-12 col-lg-5) */}
                                    <div className='col-12 col-lg-5'>
                                        <div className='p-3 bg-white rounded-3 border h-100 d-flex flex-column'>
                                            <div className='d-flex justify-content-between align-items-center mb-2'>
                                                <h6 className='fw-bold text-dark mb-0'>Institutional Focus Matrix</h6>
                                                <small className='text-muted fst-italic'>Click to isolate metrics</small>
                                            </div>

                                            {/* Row 1: The 8 Internal Academic Colleges (2 Cols x 4 Rows) */}
                                            <div className='row g-2 align-content-start mb-2'>
                                                {internalCollegesData.map(col => {
                                                    const isSelected = selectedCollege === col.code;
                                                    return (
                                                        <div key={col.code} className='col-6'>
                                                            <div
                                                                className={`p-2 rounded-3 border transition-all h-100 d-flex flex-column justify-content-between ${
                                                                    isSelected 
                                                                        ? 'border-primary bg-primary bg-opacity-10 shadow-sm' 
                                                                        : 'bg-light bg-opacity-50 border-light-subtle hover-shadow'
                                                                }`}
                                                                style={{ cursor: 'pointer', transition: 'all 0.15s ease-in-out', minHeight: '70px' }}
                                                                onClick={() => setSelectedCollege(prev => prev === col.code ? 'ALL' : col.code)}
                                                                role='button'
                                                                tabIndex={0}
                                                                title={`${col.fullName} (${col.total} protocols)`}
                                                            >
                                                                <div className='d-flex justify-content-between align-items-center mb-1'>
                                                                    <span 
                                                                        className='badge rounded-pill px-2 py-1 small fw-bold text-white'
                                                                        style={{ backgroundColor: col.accentColor, fontSize: '0.68rem' }}
                                                                    >
                                                                        <i className={`bi ${col.icon} me-1`}></i>
                                                                        {col.code}
                                                                    </span>
                                                                    <strong className='fs-6 text-dark'>{col.total}</strong>
                                                                </div>

                                                                <div className='text-truncate fw-semibold text-secondary' style={{ fontSize: '0.72rem' }}>
                                                                    {col.name}
                                                                </div>

                                                                <div className='d-flex justify-content-between align-items-center mt-1 pt-1 border-top border-light-subtle' style={{ fontSize: '0.68rem' }}>
                                                                    <span className='text-success fw-semibold'>
                                                                        <i className='bi bi-check-circle-fill me-1'></i>
                                                                        {col.cleared} Clr
                                                                    </span>
                                                                    <span className='text-muted'>{col.rate}%</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>

                                            {/* Row 2: Featured Full-Width External Entities Card (col-12) */}
                                            <div className='mt-auto pt-2 border-top border-light-subtle'>
                                                <div
                                                    className={`p-2 p-md-3 rounded-3 border transition-all ${
                                                        selectedCollege === 'EXT' 
                                                            ? 'border-info bg-info bg-opacity-10 shadow-sm' 
                                                            : 'bg-info-subtle bg-opacity-25 border-info-subtle hover-shadow'
                                                    }`}
                                                    style={{ cursor: 'pointer', transition: 'all 0.15s ease-in-out' }}
                                                    onClick={() => setSelectedCollege(prev => prev === 'EXT' ? 'ALL' : 'EXT')}
                                                    role='button'
                                                    tabIndex={0}
                                                    title='External Entities & Partner Institutions (ZCMC, DOH CHD IX, WMSU, Brent Hospital, NGOs)'
                                                >
                                                    <div className='d-flex justify-content-between align-items-center mb-1'>
                                                        <div className='d-flex align-items-center gap-2'>
                                                            <span 
                                                                className='badge rounded-pill px-2 py-1 small fw-bold text-white'
                                                                style={{ backgroundColor: externalEntityData.accentColor }}
                                                            >
                                                                <i className={`bi ${externalEntityData.icon} me-1`}></i>
                                                                {externalEntityData.code}
                                                            </span>
                                                            <strong className='text-dark' style={{ fontSize: '0.82rem' }}>
                                                                {externalEntityData.name}
                                                            </strong>
                                                        </div>
                                                        <strong className='fs-6 text-dark'>{externalEntityData.total}</strong>
                                                    </div>

                                                    <p className='text-muted small mb-2 lh-sm' style={{ fontSize: '0.70rem' }}>
                                                        ZCMC, DOH CHD IX, WMSU, Brent Hospital, Pharma & NGOs
                                                    </p>

                                                    <div className='d-flex justify-content-between align-items-center pt-1 border-top border-info-subtle' style={{ fontSize: '0.72rem' }}>
                                                        <span className='text-info-emphasis fw-semibold'>
                                                            <i className='bi bi-activity me-1'></i>
                                                            {externalEntityData.ongoing} Under Review
                                                        </span>
                                                        <span className='text-success fw-bold'>
                                                            <i className='bi bi-check-circle-fill me-1'></i>
                                                            {externalEntityData.cleared} Cleared ({externalEntityData.rate}%)
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>

                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* PRINT-OPTIMIZED INSTITUTIONAL SUMMARY TABLE (8 Academic Units + External Partners Ledger) */}
                        <div className='d-none d-print-block card border border-dark rounded-0 mb-4'>
                            <div className='card-header bg-light py-2 border-bottom border-dark'>
                                <h6 className='fw-bold text-dark mb-0 text-uppercase' style={{ letterSpacing: '0.5px' }}>
                                    Institutional & External Protocol Intake Ledger
                                </h6>
                            </div>
                            <div className='card-body p-0'>
                                <table className='table table-bordered table-sm mb-0 align-middle text-center' style={{ fontSize: '9pt' }}>
                                    <thead className='table-light'>
                                        <tr className='text-uppercase text-secondary'>
                                            <th className='text-start ps-3' style={{ width: '40%' }}>Unit / Affiliate Organization</th>
                                            <th style={{ width: '15%' }}>Total Intake</th>
                                            <th style={{ width: '15%' }}>Under Review</th>
                                            <th style={{ width: '15%' }}>Cleared</th>
                                            <th style={{ width: '15%' }}>Clearance Rate</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {/* Section I: Internal Academic Colleges & Schools */}
                                        <tr className='table-secondary text-start'>
                                            <td colSpan={5} className='ps-3 py-1 fw-bold text-dark small text-uppercase'>
                                                I. Internal Academic Colleges & Schools
                                            </td>
                                        </tr>
                                        {internalCollegesData.map(col => (
                                            <tr key={col.code}>
                                                <td className='text-start ps-3'>
                                                    <span className='fw-bold me-2 font-monospace' style={{ color: '#003366' }}>[{col.code}]</span>
                                                    <span>{col.fullName}</span>
                                                </td>
                                                <td className='fw-semibold'>{col.total}</td>
                                                <td className='text-warning-emphasis'>{col.ongoing}</td>
                                                <td className='text-success fw-bold'>{col.cleared}</td>
                                                <td className='fw-semibold'>{col.rate}%</td>
                                            </tr>
                                        ))}

                                        {/* Section II: External Partner Entities */}
                                        <tr className='table-info bg-opacity-25 text-start'>
                                            <td colSpan={5} className='ps-3 py-1 fw-bold text-dark small text-uppercase'>
                                                II. External Entities & Partner Institutions
                                            </td>
                                        </tr>
                                        <tr>
                                            <td className='text-start ps-3'>
                                                <span className='fw-bold me-2 font-monospace text-info-emphasis'>[{externalEntityData.code}]</span>
                                                <span>{externalEntityData.fullName}</span>
                                            </td>
                                            <td className='fw-semibold'>{externalEntityData.total}</td>
                                            <td className='text-warning-emphasis'>{externalEntityData.ongoing}</td>
                                            <td className='text-success fw-bold'>{externalEntityData.cleared}</td>
                                            <td className='fw-semibold'>{externalEntityData.rate}%</td>
                                        </tr>
                                    </tbody>
                                    <tfoot className='table-light border-top border-2 border-dark fw-bold'>
                                        <tr>
                                            <td className='text-start ps-3 text-uppercase'>Institutional Total:</td>
                                            <td>{collegeAnalyticsData.reduce((acc, c) => acc + c.total, 0)}</td>
                                            <td>{collegeAnalyticsData.reduce((acc, c) => acc + c.ongoing, 0)}</td>
                                            <td className='text-success'>{collegeAnalyticsData.reduce((acc, c) => acc + c.cleared, 0)}</td>
                                            <td>
                                                {collegeAnalyticsData.reduce((acc, c) => acc + c.total, 0) > 0 
                                                    ? Math.round((collegeAnalyticsData.reduce((acc, c) => acc + c.cleared, 0) / collegeAnalyticsData.reduce((acc, c) => acc + c.total, 0)) * 100) 
                                                    : 0}%
                                            </td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        </div>

                        {/* Downstream Analytics Row */}
                        <div className='row g-4'>

                            {/* Top Card: Final Decisions for Selected Period */}
                            <div className='col-12'>
                                <div className='card shadow-sm border-0 p-4 rounded-4'>
                                    <div className='d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2'>
                                        <div>
                                            <h6 className='fw-bold text-dark mb-0'>Final Decisions & Dispositions</h6>
                                            <small className='text-muted'>
                                                Outcomes finalized during {reportMode === 'monthly' ? `${MONTH_NAMES[selectedMonth]} ${selectedYear}` : `Calendar Year ${selectedYear}`}
                                                {selectedCollege !== 'ALL' && ` • Filtered to ${activeCollegeObject?.name || selectedCollege}`}
                                            </small>
                                        </div>
                                        <span className='badge bg-light text-secondary border'>
                                            {reportMode === 'monthly' ? 'Monthly Output' : 'Annual Cumulative'}
                                        </span>
                                    </div>
                                    <div style={{ width: '100%', height: 230 }}>
                                        <ResponsiveContainer>
                                            <BarChart data={finalDecisions} layout="vertical" margin={{ top: 10, right: 30, left: 20, bottom: 5 }}>
                                                <CartesianGrid strokeDasharray='3 3' stroke="#e9ecef" />
                                                <XAxis type='number' />
                                                <YAxis dataKey='name' type='category' width={150} tick={{ fontSize: 13, fontWeight: 'bold' }} />
                                                <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                                                <Legend />
                                                <Bar dataKey='count' radius={[0, 6, 6, 0]}>
                                                    {finalDecisions.map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={entry.fill} />
                                                    ))}
                                                </Bar>
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                            </div>

                            {/* Bottom Left: Velocity Trend (Submissions vs. Clearances) */}
                            <div className='col-12 col-xl-6'>
                                <div className='card shadow-sm border-0 p-4 rounded-4 h-100'>
                                    <div className='d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2'>
                                        <div>
                                            <h6 className='fw-bold text-dark mb-0'>
                                                {reportMode === 'monthly' ? `Weekly Intake & Output (${MONTH_SHORT[selectedMonth]} ${selectedYear})` : `Monthly Volume & Clearances (${selectedYear})`}
                                            </h6>
                                            <small className='text-muted'>
                                                {reportMode === 'monthly' ? 'Intake and clearances grouped across 5 calendar weeks' : '12-month trajectory across calendar year'}
                                                {selectedCollege !== 'ALL' && ` • ${selectedCollege}`}
                                            </small>
                                        </div>
                                        <span className='badge bg-light text-secondary border'>
                                            {reportMode === 'monthly' ? 'Weekly Cadence' : '12-Month Trajectory'}
                                        </span>
                                    </div>
                                    <div style={{ width: '100%', height: 300 }}>
                                        <ResponsiveContainer>
                                            <LineChart data={velocityTrendData} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
                                                <CartesianGrid strokeDasharray='3 3' stroke="#e9ecef" />
                                                <XAxis dataKey='interval' tick={{ fontSize: 12 }} />
                                                <YAxis tick={{ fontSize: 12 }} />
                                                <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                                                <Legend />
                                                <Line type='monotone' dataKey='submissions' name='Protocol Intake' stroke='#0d6efd' strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                                                <Line type='monotone' dataKey='clearances' name='Clearances Issued' stroke='#198754' strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                                            </LineChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                            </div>

                            {/* Bottom Right: Active Review Pipeline */}
                            <div className='col-12 col-xl-6'>
                                <div className='card shadow-sm border-0 p-4 rounded-4 h-100'>
                                    <div className='d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2'>
                                        <div>
                                            <h6 className='fw-bold text-dark mb-0'>Active Review Pipeline Distribution</h6>
                                            <small className='text-muted'>
                                                Current operational protocol workload by workflow phase
                                                {selectedCollege !== 'ALL' && ` • ${selectedCollege}`}
                                            </small>
                                        </div>
                                        <span className='badge bg-primary-subtle text-primary border border-primary-subtle'>
                                            Live Pipeline
                                        </span>
                                    </div>
                                    <div style={{ width: '100%', height: 300 }}>
                                        <ResponsiveContainer>
                                            <PieChart>
                                                <Pie 
                                                    data={activePipeline}
                                                    dataKey='count'
                                                    nameKey='name'
                                                    cx='50%'
                                                    cy='50%'
                                                    innerRadius={65}
                                                    outerRadius={105}
                                                    paddingAngle={4}
                                                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                                                >
                                                    {activePipeline.map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={entry.fill} />
                                                    ))}
                                                </Pie>
                                                <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                            </div>

                        </div>
                    </>
                )}

                {/* OFFICIAL SIGNATURE BLOCK */}
                <div className='d-none d-print-block signature-block mt-5 pt-4' style={{ breakInside: 'avoid', pageBreakInside: 'avoid' }}>
                    <p className='small text-secondary fst-italic mb-4'>
                        I hereby certify that the statistics, clearance yields, and turnaround summaries outlined in this report represent the verified official records of the Ateneo de Zamboanga University Research Ethics Committee as of {new Date().toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' })}.
                    </p>

                    <div className='row mt-4 pt-2'>
                        {/* Left Sign-off: Secretariat */}
                        <div className='col-6 pe-4'>
                            <span className='small text-muted text-uppercase fw-semibold d-block mb-4'>Prepared by:</span>
                            <div className='border-bottom border-dark border-1 mb-2' style={{ height: '40px' }}></div>
                            <strong className='d-block text-dark text-uppercase'>{adminName}</strong>
                            <span className='small text-secondary d-block'>Ethics Review Secretariat</span>
                            <span className='small text-muted d-block'>Date: ________________________</span>
                        </div>

                        {/* Right Sign-off: Committee Chair */}
                        <div className='col-6 ps-4'>
                            <span className='small text-muted text-uppercase fw-semibold d-block mb-4'>Noted & Attested by:</span>
                            <div className='border-bottom border-dark border-1 mb-2' style={{ height: '40px' }}></div>
                            <strong className='d-block text-dark text-uppercase'>Ethics Review Committee Chair</strong>
                            <span className='small text-secondary d-block'>Chairperson, AdZU Research Ethics Committee</span>
                            <span className='small text-muted d-block'>Date: ________________________</span>
                        </div>
                    </div>
                </div>

            </main>

        </div>
    );
}

export default AdminAnalytics;
