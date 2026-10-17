import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import adzuSeal from '../assets/AdZU Seal.png';
import ResearchProtocolModal from '../components/admin/ResearchProtocolModal';
import OngoingReviewModal from '../components/admin/OngoingReviewModal';

function AdminDashboard() {
    const navigate = useNavigate();

    // Taking the data from Admin login Page
    const adminName = localStorage.getItem('adminName') || "Unknown Admin";
    const role = localStorage.getItem('adminRole') || "Staff";
    const adminId = localStorage.getItem('adminId');

    const isReviewerRole = role === 'Primary Reviewer' || role === 'Non-Primary Reviewer';

    // Prevention of people just typing in /admin/dashboard
    useEffect(() => {
        // If browser doesn't have any session data
        if (!localStorage.getItem('adminName')) {
            // Redirect them to the login page
            navigate('/admin/login');
        }
    }, [navigate]);

    // For containing all of the Protocols
    const [protocolData, setProtocolData] = useState([]);
    const [ongoingReviewProtocol, setOngoingReviewProtocol] = useState(null);

    // Fetching the data from the database
    const fetchProtocols = () => {
        fetch('http://localhost/REC-Review-Application-Management/backend/api/applications')
            .then(response => response.json())
            .then(databaseJSON => {
                // Formatting the database data to easier names to call for calling them in the Dashboard
                const formattedData = databaseJSON.data.map(row => ({
                    ...row,
                    application_id: row.application_id,
                    id: row.protocol_code,
                    title: row.research_title,
                    type: (row.review_type || 'Undetermined').toUpperCase(),
                    research_type: row.research_type,
                    status: (row.status || '').toUpperCase(),
                    // Conversion of SQL Date to MMM DD, YYYY
                    date: row.submission_date 
                        ? new Date(row.submission_date).toLocaleDateString('en-US', {
                            month: 'short', day: 'numeric', year: 'numeric'
                        }).toUpperCase()
                        : 'N/A',
                    
                    form_data: row.form_data, // Ensure form_data is passed down
                    assigned_reviewers: row.assigned_reviewers || [],
                    reviews_total: row.reviews_total || 0,
                    reviews_completed: row.reviews_completed || 0,
                    researchers: row.form_data?.primary_researchers 
                        ? row.form_data.primary_researchers.map(r => `${r.firstName} ${r.lastName}`) 
                        : (row.form_data?.contact_name ? [row.form_data.contact_name] : ['N/A'])
                }));

                setProtocolData(formattedData);
            })
            .catch(error => console.error("Error Fetching Data:", error));
    };

    useEffect(() => {
        fetchProtocols();
    }, []);

    // For Protocol Detailed Pop-up Window Togge-able
    const [selectedProtocol, setSelectedProtocol] = useState(null);

    // For View Mode Togge-able; Table Mode will be default
    const [viewMode, setViewMode] = useState('table');
    
    // For Status Filtering
    const [filterStatus, setFilterStatus] = useState('All');

    // Tracking of what user is typing
    const [searchInput, setSearchInput] = useState('');

    // For Search Filtering once button is pressed
    const [activeSearchQuery, setActiveSearchQuery] = useState('');

    // Colors for the badges
    const typeBadgeColors = {
        'FULL BOARD': 'bg-theme-primary',
        'EXPEDITED': 'bg-warning text-dark',
        'EXEMPTED': 'bg-success',
        'UNDETERMINED': 'bg-secondary'
    };

    // Sorting Memory for Protocols
    const [sortConfig, setSortConfig] = useState({ key: 'id', direction: 'ascending' });

    // For when user clicks header switch the sorting
    const handleSort = (key) => {
        let direction = 'ascending';
        if (sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };

    // Helper to find the current reviewer's assignment for this protocol
    const getMyReview = (protocol) => {
        if (!Array.isArray(protocol.assigned_reviewers)) return null;
        return protocol.assigned_reviewers.find(r => String(r.reviewer_id) === String(adminId)) || null;
    };

    // Filter logic
    const filteredProtocols = protocolData.filter(protocol => {
        // Role-Based Access Control Logic for Admins: Secretariat, Chair, & Primary/Non-Primary Reviewer
        let hasAccess = true;
        if (role === 'Secretariat' || role === 'Ethics Chair') {
            const hiddenStatuses = ['DRAFT', 'SUBMITTED', 'PROTOCOLS SUBMITTED'];
            hasAccess = !hiddenStatuses.includes(protocol.status);
        } else if (isReviewerRole) {
            // Reviewers ONLY see protocols assigned to them under Ongoing Review
            const isAssigned = Array.isArray(protocol.assigned_reviewers) &&
                protocol.assigned_reviewers.some(rev => String(rev.reviewer_id) === String(adminId));
            hasAccess = protocol.status === 'ONGOING REVIEW' && isAssigned;
        }

        if (!hasAccess) return false;

        // Dropdown Logic
        let matchesStatus = true;
        if (filterStatus !== 'All') {
            if (filterStatus === 'PENDING_EVALUATION') {
                const myRev = getMyReview(protocol);
                matchesStatus = myRev ? myRev.review_status === 'In Progress' : false;
            } else if (filterStatus === 'SUBMITTED_EVALUATION') {
                const myRev = getMyReview(protocol);
                matchesStatus = myRev ? myRev.review_status === 'Completed' : false;
            } else {
                matchesStatus = protocol.status === filterStatus;
            }
        }

        // ID & Protocol Title Logic
        const matchesSearch = (protocol.title || '').toLowerCase().includes(activeSearchQuery.toLowerCase()) ||
                              (protocol.id || '').toLowerCase().includes(activeSearchQuery.toLowerCase());

        // Protocol Passes if it matches all Logics
        return matchesStatus && matchesSearch;
    });

    // Sorting of Protocols
    const terminalStatuses = ['CLEARANCE GRANTED', 'REJECTED', 'WITHDRAWN', 'AMENDMENTS', 'PAYMENT PENDING'];

    // Add new terminalStatus to push the item down if the admin just needs to see it but not access (Role Based )
    if (role === 'Secretariat') {
        terminalStatuses.push('PAYMENT PENDING');
    }

    const sortedProtocols = [...filteredProtocols].sort((a, b) =>  {
        const aIsTerminal = terminalStatuses.includes(a.status);
        const bIsTerminal = terminalStatuses.includes(b.status);

        // Push terminal statuses to the bottom regardless of current sort configuration
        if (aIsTerminal && !bIsTerminal) return 1;
        if (!aIsTerminal && bIsTerminal) return -1;

        if (a[sortConfig.key] < b[sortConfig.key]) {
            return sortConfig.direction === 'ascending' ? -1 : 1;
        }
        if (a[sortConfig.key] > b[sortConfig.key]) {
            return sortConfig.direction === 'ascending' ? 1 : -1;
        }

        return 0;
    });

    // Dropdown Options for Each Admin Role
    const dropdownOptionsByRole = {
        'Secretariat' : [
            { value: 'All', label: 'All Statuses' },
            { value: 'PAYMENT PENDING', label: 'Payment Pending' },
            { value: 'PAYMENT VERIFIED', label: 'Payment Verified' },
            { value: 'TYPE OF REVIEW', label: 'Type of Review' },
            { value: 'ONGOING REVIEW', label: 'Ongoing Review' },
            { value: 'CONSOLIDATION OF EVALUATION', label: 'Consolidation of Evaluation' },
            { value: 'DECISION LETTER ISSUED', label: 'Decision Letter Issued' },
            { value: 'REVISIONS SUBMITTED', label: 'Revisions Submitted' },
            { value: 'CLEARANCE GRANTED', label: 'Clearance Granted' },
            { value: 'REJECTED', label: 'Rejected' },
            { value: 'WITHDRAWN', label: 'Withdrawn' },
            { value: 'AMENDMENTS', label: 'Amendments' }
        ],
        'Primary Reviewer' : [
            { value: 'All', label: 'All Assigned (Ongoing Review)' },
            { value: 'PENDING_EVALUATION', label: 'Evaluation Pending' },
            { value: 'SUBMITTED_EVALUATION', label: 'Evaluation Submitted' },
        ],
        'Non-Primary Reviewer' : [
            { value: 'All', label: 'All Assigned (Ongoing Review)' },
            { value: 'PENDING_EVALUATION', label: 'Evaluation Pending' },
            { value: 'SUBMITTED_EVALUATION', label: 'Evaluation Submitted' },
        ],
        'Ethics Chair' : [
            { value: 'All', label: 'All Statuses' },
            { value: 'PAYMENT PENDING', label: 'Payment Pending' },
            { value: 'PAYMENT VERIFIED', label: 'Payment Verified' },
            { value: 'TYPE OF REVIEW', label: 'Type of Review' },
            { value: 'ONGOING REVIEW', label: 'Ongoing Review' },
            { value: 'CONSOLIDATION OF EVALUATION', label: 'Consolidation of Evaluation' },
            { value: 'DECISION LETTER ISSUED', label: 'Decision Letter Issued' },
            { value: 'REVISIONS SUBMITTED', label: 'Revisions Submitted' },
            { value: 'CLEARANCE GRANTED', label: 'Clearance Granted' },
            { value: 'REJECTED', label: 'Rejected' },
            { value: 'WITHDRAWN', label: 'Withdrawn' },
            { value: 'AMENDMENTS', label: 'Amendments' }
        ]
    };

    const currentDropdownOptions = dropdownOptionsByRole[role] || [{ value: 'All', label: 'All Statuses' }];

    return (
      <div className="min-vh-100 d-flex flex-column bg-body-tertiary"> 

            {/* Header Class */}
            <header className="brand-header shadow-sm" style={{ height: '8vh' }}>
                {/* Header Content */}
                <div className='container-fluid d-flex justify-content-between align-items-center h-100 px-4 gap-3'>
                    {/* Dynamic Welcome Message */}
                    <div className='d-flex align-items-center h-100 gap-4'>
                        {/* Welcome Message */}
                        <div>
                            <h4 className='mb-0 fw-bold'>Welcome, {adminName}</h4>
                            <small className='text-light opacity-50 d-none d-md-block'>AdZU Research Ethics Committee {role}</small>
                        </div>
                    </div>
                </div>
            </header>

            <main className='container my-4 flex-grow-1'>

                {/* Research Protocol Dashboard Identifier */}
                <div className='row justify-content-between align-items-center'>
                    {/* LEFT SIDE: Dashboard Icon */}
                    <div className='col-auto d-flex align-items-center gap-3'>
                        <i
                            className='bi bi-easel2-fill border border-3 border-dark p-1 rounded text-dark fs-3'
                            style={{
                                lineHeight: 1
                            }}
                        ></i>
                        <p className='fw-bold fs-5 mb-1'>Dashboard</p>
                    </div>

                    {/* RIGHT SIDE: Search Bar and Filter */}
                    <div className='col-12 col-md-7 col-lg-6 mt-3 mt-md-0 d-flex align-items-center gap-3'>

                        {/* Filter */}
                        <select 
                            className="form-select border shadow-sm w-auto text-secondary fw-bold" 
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
                        >
                            {/* Dynamic Rendering of filter options based on role */}
                            {currentDropdownOptions.map((option, index) => (
                                <option key={index} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </select>

                        {/* Search Bar */}
                        <div className='input-group shadow-sm flex-grow-1'>
                            {/* Text Input */}
                            <input 
                                type="text" 
                                className='form-control text-truncate' 
                                placeholder='Search protocol...' 
                                value={searchInput}
                                onChange={(e) => setSearchInput(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        setActiveSearchQuery(searchInput);
                                    }
                                }}
                            />

                            {/* Search Button */}
                            <button 
                                className='btn btn-primary' 
                                type='button'
                                onClick={() => setActiveSearchQuery(searchInput)}
                            >
                                <i
                                    className='bi bi-search me-2'
                                ></i>Search
                            </button>
                        </div>
                        
                    </div>
                </div>

                {/* Main Dashboard Content */}
                <div className='row my-3'>

                    {/* Encompass the whole row */}
                    <div className='col-12'>
                        <div className='card shadow-sm border-0 rounded-4'>
                            <div className='card-body p-4 bg-white rounded-4'>

                                {/* Togge-able Control for Card Mode to Table Mode */}
                                <div className='d-flex justify-content-between align-items-center mb-4'>

                                    {/* Left Side */}
                                    <h5 className='card-title fw-bold mb-0'>Research Protocols</h5>

                                    {/* Right Side */}
                                    <div className='btn-group shadow-sm'>

                                        <button 
                                            className= {`btn ${viewMode === 'table' ? 'btn-primary' : 'btn-outline-primary'}`}
                                            onClick={() => setViewMode('table')}
                                        >
                                            <i className='bi bi-list-ul'></i>
                                        </button>

                                        <button 
                                            className= {`btn ${viewMode === 'grid' ? 'btn-primary' : 'btn-outline-primary'}`}
                                            onClick={() => setViewMode('grid')}    
                                        >
                                            <i className='bi bi-grid'></i>
                                        </button>


                                    </div>

                                </div>

                                {/* Set Height for Research Protocol Area w/ vertical scrollbar */}
                                <div className='pe-2' style={{ height: '700px', overflowY: 'auto', overflowX: 'auto' }}>

                                    {sortedProtocols.length === 0 ? (
                                        <div className="text-center py-5 bg-light rounded-4 border my-4">
                                            <i className="bi bi-journal-check text-muted" style={{ fontSize: '3rem' }}></i>
                                            <h5 className="fw-bold text-dark mt-3">No Protocols Found</h5>
                                            <p className="text-muted small mb-0">
                                                {isReviewerRole 
                                                    ? "You currently have no research protocols assigned for ongoing review."
                                                    : "No research protocols match the selected criteria."}
                                            </p>
                                        </div>
                                    ) : viewMode === 'grid' ? (
                                        <div className='row g-3'>

                                            {/* Using map function for displaying the protocols */}
                                            {sortedProtocols.map((protocol, index) => {
                                                const myRev = getMyReview(protocol);
                                                return (
                                                    <div key={index} className='col-12 col-md-6 col-lg-3'>
                                                        
                                                        {/* Individual protocol cards */}
                                                        <div 
                                                            className={`card h-100 border-0 shadow-sm rounded-4 overflow-hidden ${terminalStatuses.includes(protocol.status) ? 'opacity-50' : ''}`} 
                                                            onClick={() => {
                                                                if (isReviewerRole && protocol.status === 'ONGOING REVIEW') {
                                                                    setOngoingReviewProtocol(protocol);
                                                                } else {
                                                                    setSelectedProtocol(protocol);
                                                                }
                                                            }}
                                                            style={{ 
                                                                backgroundColor: '#f4f6f8', 
                                                                cursor: 'pointer'
                                                            }}
                                                        >

                                                            {/* Header Section of Research Protocol */}
                                                            <div className='brand-header text-white p-2 d-flex align-items-center' style={{ fontSize: '0.65rem' }}>
                                                                <span className='fw-bold ps-1' style={{ flex: 1 }}>{protocol.id}</span>

                                                                <span
                                                                    className='border-start border-end px-2 text-truncate text-center'
                                                                    style={{ flex: 2, borderColor: 'rgba(255,255,255,0.3) !important' }}
                                                                    title={protocol.title}
                                                                >
                                                                    {protocol.title}
                                                                </span>

                                                                <span className='fw-bold text-center ps-1' style={{ flex: 1 }}>{protocol.type}</span>
                                                            </div>

                                                            {/* Body Section of Research Protocol */}
                                                            <div className='card-body d-flex flex-column justify-content-center align-items-center text-center p-3' style={{ minHeight: '110px' }}>
                                                                <p className='mb-1 fw-bold text-dark text-uppercase' style={{ fontSize: '1.2rem' }}>
                                                                    {protocol.status}
                                                                </p>
                                                                {isReviewerRole ? (
                                                                    myRev?.review_status === 'Completed' ? (
                                                                        <span className="badge bg-success-subtle text-success border border-success mt-1 small">
                                                                            <i className="bi bi-check-circle-fill me-1"></i>Evaluation Submitted
                                                                        </span>
                                                                    ) : (
                                                                        <span className="badge bg-warning-subtle text-warning-emphasis border border-warning mt-1 small">
                                                                            <i className="bi bi-hourglass-split me-1"></i>Evaluation Pending
                                                                        </span>
                                                                    )
                                                                ) : (
                                                                    protocol.status === 'ONGOING REVIEW' && (
                                                                        <span className={`badge ${protocol.reviews_completed === protocol.reviews_total && protocol.reviews_total > 0 ? 'bg-success-subtle text-success border border-success' : 'bg-primary-subtle text-theme-primary border border-primary'} mt-1 small`}>
                                                                            <i className="bi bi-people-fill me-1"></i>{protocol.reviews_completed}/{protocol.reviews_total} Completed
                                                                        </span>
                                                                    )
                                                                )}
                                                            </div>

                                                            {/* Footer Section */}
                                                            <div className='brand-header text-white p-2 d-flex justify-content-between align-items-center' style={{ fontSize: '0.75rem' }}>
                                                                <span className='fw-bold ps-2'>{protocol.date}</span>
                                                                <span className='pe-2 text-white opacity-75'>
                                                                    {isReviewerRole ? <><i className="bi bi-pencil-square me-1"></i>Evaluate</> : <><i className="bi bi-eye me-1"></i>Details</>}
                                                                </span>
                                                            </div>

                                                        </div>

                                                    </div>
                                                );
                                            })}
                                            
                                        </div>
                                    ) : (
                                      
                                        <div className='mt-1 pe-2'>
                                            <table className='table table-striped table-hover align-middle'>

                                                {/* Table Headers */}
                                                <thead 
                                                    className='table-light position-sticky top-0 rounded-top-4' 
                                                    style={{ 
                                                        zIndex: 1, 
                                                        boxShadow: '0 1px 0 0 currentcolor' 
                                                    }}
                                                >
                                                    <tr>
                                                        <th 
                                                            scope='col'
                                                            style={{ cursor: 'pointer', userSelect: 'none' }}
                                                            onClick={() => handleSort('id')}
                                                        >
                                                            ID {' '}
                                                            <span className={sortConfig.key === 'id' ? 'text-primary- fs-6' : 'text-muted opacity-50 fs-6'}>
                                                                {sortConfig.key === 'id' && sortConfig.direction === 'descending' ? '▼' : '▲'}
                                                            </span>
                                                        </th>
                                                        <th 
                                                            scope='col'
                                                            style={{ cursor: 'pointer', userSelect: 'none' }}
                                                            onClick={() => handleSort('title')}
                                                        >
                                                            Protocol Title {' '}
                                                            <span className={sortConfig.key === 'title' ? 'text-primary- fs-6' : 'text-muted opacity-50 fs-6'}>
                                                                {sortConfig.key === 'title' && sortConfig.direction === 'descending' ? '▼' : '▲'}
                                                            </span>
                                                        </th>
                                                        <th className='text-center' scope='col'>Type</th>
                                                        <th className='text-center' scope='col'>Status</th>
                                                        <th className='text-center' scope='col'>{isReviewerRole ? 'Your Evaluation' : 'Review Progress'}</th>
                                                        <th 
                                                            scope='col'
                                                            style={{ cursor: 'pointer', userSelect: 'none' }}
                                                            onClick={() => handleSort('date')}
                                                        >
                                                            Date {' '}
                                                            <span className={sortConfig.key === 'date' ? 'text-primary- fs-6' : 'text-muted opacity-50 fs-6'}>
                                                                {sortConfig.key === 'date' && sortConfig.direction === 'descending' ? '▼' : '▲'}
                                                            </span>
                                                        </th>
                                                        <th className='text-center' scope='col'>Action</th>
                                                    </tr>
                                                </thead>

                                                {/* Table Content */}
                                                <tbody>
                                                    {sortedProtocols.map((protocol, index) => {
                                                        const myRev = getMyReview(protocol);
                                                        return (
                                                            <tr
                                                                key={index}
                                                                onClick={() => {
                                                                    if (isReviewerRole && protocol.status === 'ONGOING REVIEW') {
                                                                        setOngoingReviewProtocol(protocol);
                                                                    } else {
                                                                        setSelectedProtocol(protocol);
                                                                    }
                                                                }}
                                                                className={terminalStatuses.includes(protocol.status) ? 'opacity-50 text-muted bg-light' : ''}
                                                                style={{ cursor: 'pointer' }}
                                                            >
                                                                {/* ID */}
                                                                <td className='fw-bold text-theme-primary'>
                                                                    {protocol.id}
                                                                </td>

                                                                {/* Research Protocol Title */}
                                                                <td className='text-truncate' style={{ maxWidth: '360px' }}>
                                                                    <span className="fw-medium text-dark d-block text-truncate" title={protocol.title}>
                                                                        {protocol.title}
                                                                    </span>
                                                                    <small className="text-muted d-block text-truncate" style={{ fontSize: '0.75rem' }}>
                                                                        {protocol.researchers?.join(', ')}
                                                                    </small>
                                                                </td>

                                                                {/* Type */}
                                                                <td className='text-center'>
                                                                    <span className={`badge ${typeBadgeColors[protocol.type] || 'bg-secondary'}`} style={{ minWidth: '90px' }}>
                                                                        {protocol.type}
                                                                    </span>
                                                                </td>

                                                                {/* Status */}
                                                                <td className='fw-medium text-uppercase text-dark text-center small'>
                                                                    {protocol.status}
                                                                </td>

                                                                {/* Your Evaluation / Review Progress */}
                                                                <td className='text-center'>
                                                                    {isReviewerRole ? (
                                                                        myRev ? (
                                                                            myRev.review_status === 'Completed' ? (
                                                                                <span className="badge bg-success-subtle text-success border border-success px-2 py-1 small">
                                                                                    <i className="bi bi-check-circle-fill me-1"></i>Evaluation Submitted
                                                                                </span>
                                                                            ) : (
                                                                                <span className="badge bg-warning-subtle text-warning-emphasis border border-warning px-2 py-1 small">
                                                                                    <i className="bi bi-hourglass-split me-1"></i>Evaluation Pending
                                                                                </span>
                                                                            )
                                                                        ) : (
                                                                            <span className="badge bg-secondary-subtle text-muted small">Not Assigned</span>
                                                                        )
                                                                    ) : (
                                                                        protocol.status === 'ONGOING REVIEW' ? (
                                                                            <span 
                                                                                className={`badge ${protocol.reviews_completed === protocol.reviews_total && protocol.reviews_total > 0 ? 'bg-success-subtle text-success border border-success' : 'bg-primary-subtle text-theme-primary border border-primary'} px-2 py-1 small`}
                                                                                title={`${protocol.reviews_completed} of ${protocol.reviews_total} committee reviews completed`}
                                                                            >
                                                                                <i className="bi bi-people-fill me-1"></i>{protocol.reviews_completed}/{protocol.reviews_total} Completed
                                                                            </span>
                                                                        ) : (
                                                                            <span className="text-muted small">—</span>
                                                                        )
                                                                    )}
                                                                </td>

                                                                {/* Date */}
                                                                <td className='text-secondary small'>
                                                                    {protocol.date}
                                                                </td>

                                                                {/* Action */}
                                                                <td className='text-center'>
                                                                    {isReviewerRole ? (
                                                                        <button 
                                                                            type="button" 
                                                                            className="btn btn-sm btn-primary fw-bold text-nowrap px-3 shadow-xs"
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                if (protocol.status === 'ONGOING REVIEW') {
                                                                                    setOngoingReviewProtocol(protocol);
                                                                                } else {
                                                                                    setSelectedProtocol(protocol);
                                                                                }
                                                                            }}
                                                                        >
                                                                            <i className="bi bi-pencil-square me-1"></i>Evaluate
                                                                        </button>
                                                                    ) : (
                                                                        <button 
                                                                            type="button" 
                                                                            className="btn btn-sm btn-outline-secondary fw-semibold text-nowrap px-2"
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                setSelectedProtocol(protocol);
                                                                            }}
                                                                        >
                                                                            <i className="bi bi-eye me-1"></i>Details
                                                                        </button>
                                                                    )}
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>

                                            </table>
                                        </div>

                                    )}

                                </div>  

                            </div>
                        </div>
                    </div>

                </div>

            </main>

            <footer>
                
            </footer>

        {/* Modal Display Functionalities */}
        {selectedProtocol && (
            <ResearchProtocolModal
                protocol={selectedProtocol}
                onClose={() => setSelectedProtocol(null)}
                onRefresh={() => {
                    fetchProtocols();
                    setSelectedProtocol(null);
                }}
            />
        )}

        {ongoingReviewProtocol && (
            <OngoingReviewModal
                protocol={ongoingReviewProtocol}
                onClose={() => setOngoingReviewProtocol(null)}
                onRefresh={() => {
                    fetchProtocols();
                    setOngoingReviewProtocol(null);
                }}
            />
        )}

      </div>
  );
}

export default AdminDashboard;
