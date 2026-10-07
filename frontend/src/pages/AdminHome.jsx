import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Link } from 'react-router-dom';

function AdminHome() {
    const navigate = useNavigate();

    // Takes the admin's name from localStorage
    const adminName = localStorage.getItem('adminName') || "Admin";

    // Prevention of people going for /admin/home
    useEffect(() => {
        // If browser doesn't have any session data
        if (!localStorage.getItem('adminName')) {
            // Redirect to login page
            navigate('/admin/login')
        }
    }, [navigate]);

    // 2. Fetch Protocol Data to calculate the Summary Metrics
    const [protocolData, setProtocolData] = useState([]);

    // Fetching all data from Database
    useEffect(() => {
        fetch('http://localhost/REC-Review-Application-Management/backend/api/applications')
            .then(response => response.json())
            .then(databaseJSON => {
                const formattedData = databaseJSON.data.map(row => ({
                    type: row.review_type.toUpperCase(),
                    status: row.status.toUpperCase(),
                }));
                setProtocolData(formattedData);
            })
            .catch(error => console.error("Error Fetching Data:", error));
    }, []);

    // Metric Calculations
    const totalProtocols = protocolData.length;
    const clearanceGranted = protocolData.filter(p => p.status === 'CLEARANCE GRANTED').length;
    const underReview = protocolData.filter(p => p.status === 'UNDER REVIEW').length;
    const revising = protocolData.filter(p => p.status === 'REVISING').length;
    const ongoingAmendments = protocolData.filter(p => p.status === 'ONGOING AMENDMENTS').length;

    const exempted = protocolData.filter(p => p.type === 'EXEMPTED').length;
    const expedited = protocolData.filter(p => p.type === 'EXPEDITED').length;
    const fullBoard = protocolData.filter(p => p.type === 'FULL BOARD').length;

    return (
        <div className="min-vh-100 d-flex flex-column bg-body-tertiary">
            
            {/* Header Class */}
            <header className="brand-header shadow-sm" style={{ height: '8vh' }}>
                {/* Header Content */}
                <div className='container-fluid d-flex justify-content-between align-items-center h-100 px-4 gap-3'>
                    {/* Dynamic Welcome Message */}
                    <div className='d-flex align-items-center h-100 gap-4'>
                        <div>
                            <h4 className='mb-0 fw-bold'>Welcome back, {adminName}</h4>
                            <small className='text-light opacity-50 d-none d-md-block'>Ethics Research Board Management Dashboard</small>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content Area */}
            <main className='container-fluid px-4 my-4 flex-grow-1'>

            {/* Top Metric Containers */}
            <div className="row g-4 mb-4">
                
                {/* Left Container: Protocol Statuses */}
                <div className="col-12 col-xl-6">

                    <div className="card border-0 shadow-sm rounded-4 h-100">
                        <div className="card-body p-4">
                            <h4 className="fw-bold text-center mb-4">Research Protocol Statuses</h4>
                            <div className="row g-3">
                                {/* Under Review Box */}
                                <div className="col-6">
                                    <div className="bg-light rounded-3 p-3 text-center border">
                                        <p className="mb-2 fw-bold text-secondary" style={{ fontSize: '0.85rem' }}>Under Review</p>
                                        <h2 className="fw-bold mb-0 text-warning">{underReview}</h2>
                                    </div>
                                </div>
                                {/* Clearance Granted Box */}
                                <div className="col-6">
                                    <div className="bg-light rounded-3 p-3 text-center border">
                                        <p className="mb-2 fw-bold text-secondary" style={{ fontSize: '0.85rem' }}>Clearance Granted</p>
                                        <h2 className="fw-bold mb-0 text-success">{clearanceGranted}</h2>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                </div>

                {/* Right Container: Protocol Categories */}
                <div className="col-12 col-xl-6">

                    <div className="card border-0 shadow-sm rounded-4 h-100">
                        <div className="card-body p-4">
                            <h4 className="fw-bold text-center mb-4">Protocol Categorization</h4>
                            <div className="row g-3">
                                {/* Exempted */}
                                <div className="col-4">
                                    <div className="bg-light rounded-3 p-3 text-center border h-100">
                                        <p className="mb-2 fw-bold text-secondary" style={{ fontSize: '0.75rem' }}>Exempted</p>
                                        <h4 className="fw-bold mb-0 text-success">{exempted}</h4>
                                    </div>
                                </div>
                                {/* Expedited */}
                                <div className="col-4">
                                    <div className="bg-light rounded-3 p-3 text-center border h-100">
                                        <p className="mb-2 fw-bold text-secondary" style={{ fontSize: '0.75rem' }}>Expedited</p>
                                        <h4 className="fw-bold mb-0 text-warning">{expedited}</h4>
                                    </div>
                                </div>
                                {/* Full Board */}
                                <div className="col-4">
                                    <div className="bg-light rounded-3 p-3 text-center border h-100">
                                        <p className="mb-2 fw-bold text-secondary" style={{ fontSize: '0.75rem' }}>Full Board</p>
                                        <h4 className="fw-bold mb-0 text-primary">{fullBoard}</h4>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

            </div>

            {/* Overview and Summary Data (Replaces Recent Activities) */}
            <div className="row">

                <div className="col-12">

                    <div className="card border-0 shadow-sm rounded-4">
                        <div className="card-body p-4">
                            <div className="d-flex justify-content-between align-items-center mb-4">
                                <h5 className="fw-bold mb-0">Overview and Summary Data</h5>
                                <span className="badge bg-primary fs-6 px-3 py-2 rounded-pill shadow-sm">
                                    Total Protocols: {totalProtocols}
                                </span>
                            </div>

                            <div className="table-responsive">
                                <table className="table table-hover align-middle">
                                    <thead className="table-light">
                                        <tr>
                                            <th className="text-secondary fw-bold py-3">Database Metric</th>
                                            <th className="text-secondary fw-bold py-3 text-end">Active Count</th>
                                            <th className="text-secondary fw-bold py-3 text-end">Percentage</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {/* Generate Table Rows dynamically based on the math we did earlier */}
                                        {[
                                            { label: 'Draft', value: protocolData.filter(p => p.status === 'DRAFT').length, color: 'text-muted' },
                                            { label: 'Submitted (New)', value: protocolData.filter(p => p.status === 'SUBMITTED').length, color: 'text-dark' },
                                            { label: 'Payment Pending', value: protocolData.filter(p => p.status === 'PAYMENT PENDING').length, color: 'text-danger' },
                                            { label: 'Payment Verified', value: protocolData.filter(p => p.status === 'PAYMENT VERIFIED').length, color: 'text-success' },
                                            { label: 'Determining Review Type', value: protocolData.filter(p => p.status === 'DETERMINING REVIEW TYPE').length, color: 'text-warning' },
                                            { label: 'Under Review', value: underReview, color: 'text-warning' },
                                            { label: 'Recommendations Requested', value: protocolData.filter(p => p.status === 'RECOMMENDATIONS REQUESTED').length, color: 'text-primary' },
                                            { label: 'Revising', value: revising, color: 'text-secondary' },
                                            { label: 'Revisions Submitted', value: protocolData.filter(p => p.status === 'REVISIONS SUBMITTED').length, color: 'text-info' },
                                            { label: 'Clearance Granted', value: clearanceGranted, color: 'text-success' },
                                            { label: 'Rejected', value: protocolData.filter(p => p.status === 'REJECTED').length, color: 'text-danger' },
                                            { label: 'Withdrawn', value: protocolData.filter(p => p.status === 'WITHDRAWN').length, color: 'text-muted' },
                                            { label: 'Ongoing Amendments', value: ongoingAmendments, color: 'text-info' }
                                        ]
                                        // Only show rows that actually have a count > 0 to keep the table clean!
                                        .filter(stat => stat.value > 0)
                                        .map((stat, idx) => (
                                            <tr key={idx}>
                                                <td className="fw-medium py-3">{stat.label}</td>
                                                <td className={`fw-bold fs-5 text-end ${stat.color}`}>{stat.value}</td>
                                                <td className="text-end text-muted fw-bold">
                                                    {totalProtocols > 0 ? Math.round((stat.value / totalProtocols) * 100) : 0}%
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Button to go to Admin Dashboard */}
                            <div className="mt-4 text-center">
                                <Link to="/admin/dashboard" className="btn btn-outline-primary px-4 py-2 fw-bold rounded-3 shadow-sm">
                                    <i className="bi bi-file-earmark-text me-2"></i> View All Protocols
                                </Link>
                            </div>

                        </div>
                    </div>

                </div>

            </div>
        </main>
        </div>
    );
}

export default AdminHome;