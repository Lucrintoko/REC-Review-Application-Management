import React, { useMemo, useState } from 'react';

/**
 * ExecutiveKpiTiles Component
 * 
 * Provides a 4-card executive KPI telemetry strip adhering to AdZU brand guidelines,
 * 8-point spatial rhythm, and real-time reactive temporal & collegiate filtering.
 */
export function ExecutiveKpiTiles({
    reportMode = 'yearly',
    selectedYear = 2026,
    selectedMonth = 9,
    selectedCollege = 'ALL',
    activeCollegeObject = null,
    filteredProtocols = [],
    periodIntakeProtocols = [],
    periodClearances = [],
    monthShortNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
}) {
    // -------------------------------------------------------------------------
    // 1. COMPUTED METRICS & WORKLOAD DERIVATIONS
    // -------------------------------------------------------------------------

    // Card 1: Intake Metrics
    const intakeCount = periodIntakeProtocols.length;
    const periodLabel = reportMode === 'yearly' 
        ? `CY ${selectedYear}` 
        : `${monthShortNames[selectedMonth] || ''} ${selectedYear}`;

    // Card 2: Clearances & Clearance Yield Rate
    const clearanceCount = periodClearances.length;
    const clearanceYieldRate = useMemo(() => {
        if (intakeCount === 0) return 0;
        return Math.round((clearanceCount / intakeCount) * 100);
    }, [clearanceCount, intakeCount]);

    // Card 3: Active Review Workload (Ongoing, Consolidation, Review Type, etc.)
    const activeWorkloadData = useMemo(() => {
        const activeStatuses = [
            'ONGOING REVIEW', 
            'CONSOLIDATION OF EVALUATION', 
            'TYPE OF REVIEW',
            'PROTOCOLS SUBMITTED',
            'PAYMENT VERIFIED'
        ];
        const activeList = filteredProtocols.filter(p => activeStatuses.includes(p.status));
        const ongoingCount = activeList.filter(p => p.status === 'ONGOING REVIEW').length;
        const consolidationCount = activeList.filter(p => p.status === 'CONSOLIDATION OF EVALUATION').length;
        const triageCount = activeList.filter(p => ['TYPE OF REVIEW', 'PROTOCOLS SUBMITTED', 'PAYMENT VERIFIED'].includes(p.status)).length;

        return {
            total: activeList.length,
            ongoingCount,
            consolidationCount,
            triageCount
        };
    }, [filteredProtocols]);

    // Card 4: Average Review Turnaround (AdZU REC SLA Benchmark: 30 days)
    const turnaroundData = useMemo(() => {
        const clearedWithDates = periodClearances.filter(p => p.submission_date && (p.clearance_date || p.decision_date));
        
        if (clearedWithDates.length === 0) {
            return {
                avgDays: null,
                slaBadgeClass: 'bg-secondary-subtle text-secondary border border-secondary-subtle',
                slaText: 'No Data in Window',
                isCompliant: true,
                evaluatedCount: 0
            };
        }

        const totalElapsedDays = clearedWithDates.reduce((sum, p) => {
            const subDate = new Date(p.submission_date.split('T')[0]);
            const clrDate = new Date((p.clearance_date || p.decision_date).split('T')[0]);
            const diffTime = Math.max(0, clrDate.getTime() - subDate.getTime());
            const diffDays = Math.max(1, Math.round(diffTime / (1000 * 60 * 60 * 24)));
            return sum + diffDays;
        }, 0);

        const avg = Math.round(totalElapsedDays / clearedWithDates.length);
        const withinSLA = avg <= 30; // AdZU Standard Ethics SLA: 30 days

        return {
            avgDays: avg,
            slaBadgeClass: withinSLA 
                ? 'bg-success-subtle text-success border border-success-subtle' 
                : 'bg-warning-subtle text-warning-emphasis border border-warning-subtle',
            slaText: withinSLA ? 'Within SLA (≤30d)' : 'Exceeds SLA (>30d)',
            isCompliant: withinSLA,
            evaluatedCount: clearedWithDates.length
        };
    }, [periodClearances]);

    // Hover state micro-interaction tracker
    const [hoveredCard, setHoveredCard] = useState(null);

    // Common card micro-interaction styles
    const getCardStyle = (cardId, accentColor) => ({
        borderLeft: `4px solid ${accentColor}`,
        transition: 'transform 0.18s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.18s ease',
        transform: hoveredCard === cardId ? 'translateY(-3px)' : 'none',
        boxShadow: hoveredCard === cardId 
            ? '0 10px 24px -4px rgba(0, 0, 0, 0.08), 0 4px 8px -2px rgba(0, 0, 0, 0.04)' 
            : '0 1px 3px rgba(0, 0, 0, 0.05)',
        cursor: 'default'
    });

    return (
        <section aria-label="Executive Performance Indicators" className="mb-4">
            <div className="row g-3 row-cols-1 row-cols-sm-2 row-cols-xl-4">

                {/* =========================================================
                    CARD 1: TOTAL INTAKE (AdZU Deep Blue #003366)
                    ========================================================= */}
                <div className="col">
                    <div 
                        className="card h-100 border-0 rounded-4 bg-white p-3 p-xl-4 position-relative overflow-hidden shadow-xs"
                        style={getCardStyle(1, '#003366')}
                        onMouseEnter={() => setHoveredCard(1)}
                        onMouseLeave={() => setHoveredCard(null)}
                    >
                        <div className="d-flex justify-content-between align-items-start mb-2">
                            <div>
                                <span className="text-uppercase text-secondary fw-bold small font-monospace tracking-wide" style={{ fontSize: '0.72rem', letterSpacing: '0.6px' }}>
                                    Total Intake
                                </span>
                                <div className="d-flex align-items-baseline gap-2 mt-1">
                                    <h2 className="fs-2 fw-bolder text-dark mb-0 lh-1">
                                        {intakeCount}
                                    </h2>
                                    <span className="badge bg-primary-subtle text-primary border border-primary-subtle rounded-pill small fw-semibold" style={{ fontSize: '0.72rem' }}>
                                        {periodLabel}
                                    </span>
                                </div>
                            </div>
                            <div 
                                className="d-flex align-items-center justify-content-center rounded-3 flex-shrink-0"
                                style={{ width: '44px', height: '44px', backgroundColor: 'rgba(0, 51, 102, 0.08)', color: '#003366' }}
                            >
                                <i className="bi bi-inboxes-fill fs-5" aria-hidden="true"></i>
                            </div>
                        </div>

                        <div className="d-flex align-items-center justify-content-between pt-3 mt-auto border-top border-light-subtle text-secondary small" style={{ fontSize: '0.75rem' }}>
                            <span className="text-truncate">
                                {selectedCollege !== 'ALL' ? (activeCollegeObject?.name || selectedCollege) : 'All Units & Partners'}
                            </span>
                            <span className="fw-medium text-dark font-monospace">
                                {filteredProtocols.length} Total
                            </span>
                        </div>
                    </div>
                </div>

                {/* =========================================================
                    CARD 2: CLEARANCES GRANTED (Emerald Green #198754)
                    ========================================================= */}
                <div className="col">
                    <div 
                        className="card h-100 border-0 rounded-4 bg-white p-3 p-xl-4 position-relative overflow-hidden shadow-xs"
                        style={getCardStyle(2, '#198754')}
                        onMouseEnter={() => setHoveredCard(2)}
                        onMouseLeave={() => setHoveredCard(null)}
                    >
                        <div className="d-flex justify-content-between align-items-start mb-2">
                            <div>
                                <span className="text-uppercase text-secondary fw-bold small font-monospace tracking-wide" style={{ fontSize: '0.72rem', letterSpacing: '0.6px' }}>
                                    Clearances Issued
                                </span>
                                <div className="d-flex align-items-baseline gap-2 mt-1">
                                    <h2 className="fs-2 fw-bolder text-dark mb-0 lh-1">
                                        {clearanceCount}
                                    </h2>
                                    <span className="badge bg-success-subtle text-success border border-success-subtle rounded-pill small fw-semibold" style={{ fontSize: '0.72rem' }}>
                                        <i className="bi bi-arrow-up-right me-1"></i>
                                        {clearanceYieldRate}% Yield
                                    </span>
                                </div>
                            </div>
                            <div 
                                className="d-flex align-items-center justify-content-center rounded-3 flex-shrink-0"
                                style={{ width: '44px', height: '44px', backgroundColor: 'rgba(25, 135, 84, 0.1)', color: '#198754' }}
                            >
                                <i className="bi bi-patch-check-fill fs-5" aria-hidden="true"></i>
                            </div>
                        </div>

                        <div className="d-flex align-items-center justify-content-between pt-3 mt-auto border-top border-light-subtle text-secondary small" style={{ fontSize: '0.75rem' }}>
                            <span className="text-truncate">
                                Formally Certified
                            </span>
                            <span className="text-success fw-semibold">
                                {clearanceCount > 0 ? 'Approvals Logged' : 'Pending Approvals'}
                            </span>
                        </div>
                    </div>
                </div>

                {/* =========================================================
                    CARD 3: ACTIVE REVIEW WORKLOAD (Gold/Amber #b8860b)
                    ========================================================= */}
                <div className="col">
                    <div 
                        className="card h-100 border-0 rounded-4 bg-white p-3 p-xl-4 position-relative overflow-hidden shadow-xs"
                        style={getCardStyle(3, '#b8860b')}
                        onMouseEnter={() => setHoveredCard(3)}
                        onMouseLeave={() => setHoveredCard(null)}
                    >
                        <div className="d-flex justify-content-between align-items-start mb-2">
                            <div>
                                <span className="text-uppercase text-secondary fw-bold small font-monospace tracking-wide" style={{ fontSize: '0.72rem', letterSpacing: '0.6px' }}>
                                    Active Workload
                                </span>
                                <div className="d-flex align-items-baseline gap-2 mt-1">
                                    <h2 className="fs-2 fw-bolder text-dark mb-0 lh-1">
                                        {activeWorkloadData.total}
                                    </h2>
                                    <span className="badge bg-warning-subtle text-warning-emphasis border border-warning-subtle rounded-pill small fw-semibold" style={{ fontSize: '0.72rem' }}>
                                        Live Queue
                                    </span>
                                </div>
                            </div>
                            <div 
                                className="d-flex align-items-center justify-content-center rounded-3 flex-shrink-0"
                                style={{ width: '44px', height: '44px', backgroundColor: 'rgba(184, 134, 11, 0.1)', color: '#b8860b' }}
                            >
                                <i className="bi bi-hourglass-split fs-5" aria-hidden="true"></i>
                            </div>
                        </div>

                        <div className="d-flex align-items-center justify-content-between pt-3 mt-auto border-top border-light-subtle text-secondary small" style={{ fontSize: '0.75rem' }}>
                            <span className="text-truncate">
                                <span className="fw-semibold text-dark">{activeWorkloadData.ongoingCount}</span> in Review
                            </span>
                            <span className="text-muted">
                                <span className="fw-semibold text-dark">{activeWorkloadData.consolidationCount}</span> Consolidating
                            </span>
                        </div>
                    </div>
                </div>

                {/* =========================================================
                    CARD 4: SLA TURNAROUND (Indigo/Purple #6f42c1)
                    ========================================================= */}
                <div className="col">
                    <div 
                        className="card h-100 border-0 rounded-4 bg-white p-3 p-xl-4 position-relative overflow-hidden shadow-xs"
                        style={getCardStyle(4, '#6f42c1')}
                        onMouseEnter={() => setHoveredCard(4)}
                        onMouseLeave={() => setHoveredCard(null)}
                    >
                        <div className="d-flex justify-content-between align-items-start mb-2">
                            <div>
                                <span className="text-uppercase text-secondary fw-bold small font-monospace tracking-wide" style={{ fontSize: '0.72rem', letterSpacing: '0.6px' }}>
                                    Avg. Turnaround
                                </span>
                                <div className="d-flex align-items-baseline gap-2 mt-1">
                                    <h2 className="fs-2 fw-bolder text-dark mb-0 lh-1">
                                        {turnaroundData.avgDays !== null ? `${turnaroundData.avgDays}d` : '—'}
                                    </h2>
                                    <span className={`badge rounded-pill small fw-semibold ${turnaroundData.slaBadgeClass}`} style={{ fontSize: '0.72rem' }}>
                                        {turnaroundData.slaText}
                                    </span>
                                </div>
                            </div>
                            <div 
                                className="d-flex align-items-center justify-content-center rounded-3 flex-shrink-0"
                                style={{ width: '44px', height: '44px', backgroundColor: 'rgba(111, 66, 193, 0.1)', color: '#6f42c1' }}
                            >
                                <i className="bi bi-speedometer2 fs-5" aria-hidden="true"></i>
                            </div>
                        </div>

                        <div className="d-flex align-items-center justify-content-between pt-3 mt-auto border-top border-light-subtle text-secondary small" style={{ fontSize: '0.75rem' }}>
                            <span className="text-truncate">
                                AdZU Target: ≤30 Days
                            </span>
                            <span className="text-muted font-monospace">
                                {turnaroundData.evaluatedCount} Sampled
                            </span>
                        </div>
                    </div>
                </div>

            </div>
        </section>
    );
}

export default ExecutiveKpiTiles;
