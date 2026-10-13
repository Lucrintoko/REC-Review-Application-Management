import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import adzuSeal from '../assets/AdZU Seal.png';
import ResearchProtocolModal from '../components/admin/ResearchProtocolModal';

function AdminDashboard() {
    const navigate = useNavigate();

    // Taking the data from Admin login Page
    const adminName = localStorage.getItem('adminName') || "Unknown Admin";
    const role = localStorage.getItem('adminRole') || "Staff";

    // Prevention of people just typing in /admin/dashboard
    useEffect(() => {
        // If browser doesn't have any session data
        if (!localStorage.getItem('adminName')) {
            // Redirect them to the login page
            navigate('admin/login')
        }
    }, [navigate]);

    // For storing Research Protocol Data from the Database Table Research Applications
    // const protocolData = [                                      
    //     { id: '2026-0751', title: 'Early Childhood Bilingualism and Its Long-Term Influence on Executive Function Development', type: 'FULL BOARD', status: 'AMENDING', date: 'DEC 4, 2023', researchers: ['Juan Dela Cruz', 'Maria Clara'] },
    //     { id: '2026-0297', title: 'Cellular Agriculture and Cultured Meat: Nutritional Equivalence and Scalability Economics', type: 'EXEMPTED', status: 'ONGOING REVIEW', date: 'DEC 5, 2023', researchers: ['Jose Rizal'] },
    //     { id: '2026-1317', title: 'Quantifying Urban Heat Island Mitigation via Green Roofs and Permeable Pavements', type: 'EXEMPTED', status: 'CONSOLIDATION', date: 'DEC 10, 2023', researchers: ['Andres Bonifacio', 'Emilio Aguinaldo', 'Apolinario Mabini'] },
    //     { id: '2026-1437', title: 'The Effectiveness of Virtual Lab Simulations in Chemistry Education for Remote Learners', type: 'EXEMPTED', status: 'AMENDING', date: 'DEC 9, 2023', researchers: ['Gabriela Silang'] },
    //     { id: '2026-0065', title: 'Nurse Staffing Ratios and Their Direct Correlation with Postoperative Patient Mortality', type: 'EXPEDITED', status: 'DELIBERATION', date: 'DEC 3, 2023', researchers: ['Antonio Luna', 'Marcelo H. del Pilar'] },
    //     { id: '2026-0777', title: 'Intellectual Property Rights and Fair Use Boundaries in Generative Model Training Datasets', type: 'EXPEDITED', status: 'CONSOLIDATION', date: 'DEC 5, 2023', researchers: ['Emilio Jacinto'] },
    //     { id: '2026-0894', title: 'Gender Representation and Stereotyping in High-Grossing Video Games (2015–2025)', type: 'FULL BOARD', status: 'CONSOLIDATION', date: 'DEC 1, 2023', researchers: ['Melchora Aquino', 'Gregoria de Jesus', 'Teresa Magbanua'] },
    //     { id: '2026-0102', title: 'The Role of Culturally Responsive Teaching in Improving First-Generation Student Retention', type: 'EXEMPTED', status: 'AWAITING PROGRESS REPORT', date: 'DEC 8, 2023', researchers: ['Miguel Malvar'] },

    //     { id: '2026-0751', title: 'Early Childhood Bilingualism and Its Long-Term Influence on Executive Function Development', type: 'FULL BOARD', status: 'AMENDING', date: 'DEC 4, 2023', researchers: ['Juan Dela Cruz', 'Maria Clara'] },
    //     { id: '2026-0297', title: 'Cellular Agriculture and Cultured Meat: Nutritional Equivalence and Scalability Economics', type: 'EXEMPTED', status: 'ONGOING REVIEW', date: 'DEC 5, 2023', researchers: ['Jose Rizal'] },
    //     { id: '2026-1317', title: 'Quantifying Urban Heat Island Mitigation via Green Roofs and Permeable Pavements', type: 'EXEMPTED', status: 'CONSOLIDATION', date: 'DEC 10, 2023', researchers: ['Andres Bonifacio', 'Emilio Aguinaldo', 'Apolinario Mabini'] },
    //     { id: '2026-1437', title: 'The Effectiveness of Virtual Lab Simulations in Chemistry Education for Remote Learners', type: 'EXEMPTED', status: 'AMENDING', date: 'DEC 9, 2023', researchers: ['Gabriela Silang'] },
    //     { id: '2026-0065', title: 'Nurse Staffing Ratios and Their Direct Correlation with Postoperative Patient Mortality', type: 'EXPEDITED', status: 'DELIBERATION', date: 'DEC 3, 2023', researchers: ['Antonio Luna', 'Marcelo H. del Pilar'] },
    //     { id: '2026-0777', title: 'Intellectual Property Rights and Fair Use Boundaries in Generative Model Training Datasets', type: 'EXPEDITED', status: 'CONSOLIDATION', date: 'DEC 5, 2023', researchers: ['Emilio Jacinto'] },
    //     { id: '2026-0894', title: 'Gender Representation and Stereotyping in High-Grossing Video Games (2015–2025)', type: 'FULL BOARD', status: 'CONSOLIDATION', date: 'DEC 1, 2023', researchers: ['Melchora Aquino', 'Gregoria de Jesus', 'Teresa Magbanua'] },
    //     { id: '2026-0102', title: 'The Role of Culturally Responsive Teaching in Improving First-Generation Student Retention', type: 'EXEMPTED', status: 'AWAITING PROGRESS REPORT', date: 'DEC 8, 2023', researchers: ['Miguel Malvar'] },

    //     { id: '2026-0751', title: 'Early Childhood Bilingualism and Its Long-Term Influence on Executive Function Development', type: 'FULL BOARD', status: 'AMENDING', date: 'DEC 4, 2023', researchers: ['Juan Dela Cruz', 'Maria Clara'] },
    //     { id: '2026-0297', title: 'Cellular Agriculture and Cultured Meat: Nutritional Equivalence and Scalability Economics', type: 'EXEMPTED', status: 'ONGOING REVIEW', date: 'DEC 5, 2023', researchers: ['Jose Rizal'] },
    //     { id: '2026-1317', title: 'Quantifying Urban Heat Island Mitigation via Green Roofs and Permeable Pavements', type: 'EXEMPTED', status: 'CONSOLIDATION', date: 'DEC 10, 2023', researchers: ['Andres Bonifacio', 'Emilio Aguinaldo', 'Apolinario Mabini'] },
    //     { id: '2026-1437', title: 'The Effectiveness of Virtual Lab Simulations in Chemistry Education for Remote Learners', type: 'EXEMPTED', status: 'AMENDING', date: 'DEC 9, 2023', researchers: ['Gabriela Silang'] },
    //     { id: '2026-0065', title: 'Nurse Staffing Ratios and Their Direct Correlation with Postoperative Patient Mortality', type: 'EXPEDITED', status: 'DELIBERATION', date: 'DEC 3, 2023', researchers: ['Antonio Luna', 'Marcelo H. del Pilar'] },
    //     { id: '2026-0777', title: 'Intellectual Property Rights and Fair Use Boundaries in Generative Model Training Datasets', type: 'EXPEDITED', status: 'CONSOLIDATION', date: 'DEC 5, 2023', researchers: ['Emilio Jacinto'] },
    //     { id: '2026-0894', title: 'Gender Representation and Stereotyping in High-Grossing Video Games (2015–2025)', type: 'FULL BOARD', status: 'CONSOLIDATION', date: 'DEC 1, 2023', researchers: ['Melchora Aquino', 'Gregoria de Jesus', 'Teresa Magbanua'] },
    //     { id: '2026-0102', title: 'The Role of Culturally Responsive Teaching in Improving First-Generation Student Retention', type: 'EXEMPTED', status: 'AWAITING PROGRESS REPORT', date: 'DEC 8, 2023', researchers: ['Miguel Malvar'] },
    // ];

    // For containing all of the Protocols
    const [protocolData, setProtocolData] = useState([]);

    // Fetching the data from the database
    const fetchProtocols = () => {
        fetch('http://localhost/REC-Review-Application-Management/backend/api/applications')
            .then(response => response.json())
            .then(databaseJSON => {
                // Formatting the database data to easier names to call for calling them in the Dashboard
                const formattedData = databaseJSON.data.map(row => ({
                    application_id: row.application_id,
                    id: row.protocol_code,
                    title: row.research_title,
                    type: row.review_type.toUpperCase(),
                    research_type: row.research_type,
                    status: row.status.toUpperCase(),
                    // Conversion of SQL Date to MMM DD, YYYY
                    date: new Date(row.submission_date).toLocaleDateString('en-US', {
                        month: 'short', day: 'numeric', year: 'numeric'
                    }).toUpperCase(),
                    
                    form_data: row.form_data, // Ensure form_data is passed down
                    researchers: row.form_data?.primary_researchers 
                        ? row.form_data.primary_researchers.map(r => `${r.firstName} ${r.lastName}`) 
                        : (row.form_data?.contact_name ? [row.form_data.contact_name] : ['N/A'])
                }))

                setProtocolData(formattedData);
            })
            .catch(error => console.error("Error Fetching Data:", error));
    };

    useEffect(() => {
        fetchProtocols();
    }, [])

    // For Protocol Detailed Pop-up Window Togge-able
    const [selectedProtocol, setSelectedProtocol] = useState(null);

    // For View Mode Togge-able; Grid Mode will be default
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
        'EXEMPTED': 'bg-success'
    };

    // Sorting Memory for Protocols
    const [sortConfig, setSortConfig] = useState({ key: 'id', direction: 'ascending' })

    // For when user clicks header switch the sorting
    const handleSort = (key) => {
        let direction = 'ascending';
        if (sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction })
    }

    // Filter logic
    const filteredProtocols = protocolData.filter(protocol => {
        // Role-Based Access Control Logic for Admins: Secretariat, Chair, & Primary/Non-Primary Reviewer
        let hasAccess = true;
        if (role === 'Secretariat' || role === 'Ethics Chair') {
            const hiddenStatuses = ['DRAFT', 'SUBMITTED', 'PROTOCOLS SUBMITTED'];
            hasAccess = !hiddenStatuses.includes(protocol.status);
        } else if (role === 'Primary Reviewer' || role === 'Non-Primary Reviewer') {
            hasAccess = protocol.status === 'ONGOING REVIEW';
        }

        if (!hasAccess) return false;

        // Dropdown Logic
        const matchesStatus = filterStatus === 'All' || protocol.status === filterStatus;

        // ID & Protocol Title Logic
        const matchesSearch = protocol.title.toLowerCase().includes(activeSearchQuery.toLowerCase()) ||
                              protocol.id.toLowerCase().includes(activeSearchQuery.toLowerCase());

        // Protocol Passes if it matches all Logics
        return matchesStatus && matchesSearch;
    });

    // Sorting of Protocols
    const terminalStatuses = ['CLEARANCE GRANTED', 'REJECTED', 'WITHDRAWN', 'AMENDMENTS'];

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
            { value: 'All', label: 'All Statuses' },
            { value: 'ONGOING REVIEW', label: 'Ongoing Review' },
        ],
        'Non-Primary Reviewer' : [
            { value: 'All', label: 'All Statuses' },
            { value: 'ONGOING REVIEW', label: 'Ongoing Review' },
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

                                {/* Set Height for Reesearch Protocol 4x4 Area w/ veritcal scrollbar */}
                                <div className='pe-2' style={{ height: '700px', overflowY: 'auto', overflowX: 'auto' }}>

                                    {viewMode === 'grid' ? (
                                        <div className='row g-3'>

                                            {/* Using map function for displaying the protocols */}
                                            {sortedProtocols.map((protocol, index) => (
                                                <div key={index} className='col col-md-3'>
                                                    
                                                    {/* Individual protocol cards */}
                                                    <div 
                                                        className={`card h-100 border-0 shadow-sm rounded-4 overflow-hidden ${terminalStatuses.includes(protocol.status) ? 'opacity-50' : ''}`} 
                                                        onClick={() => setSelectedProtocol(protocol)}
                                                        style={{ 
                                                            backgroundColor: '#f4f6f8', 
                                                            cursor: 'pointer'
                                                        }}
                                                    >

                                                        {/* Header Section of Research Protocol */}
                                                        <div className='brand-header text-white p-2 d-flex align-items-center' style={{ fontSize: '0.65rem' }}>
                                                            {/* Dark Blue Banner */}
                                                            {/* Protocol ID */}
                                                            <span className='fw-bold ps-1' style={{ flex: 1 }}>{protocol.id}</span>

                                                            {/* Truncated Protocol Title */}
                                                            <span
                                                                className='border-start border-end px-2 text-truncate text-center'
                                                                style={{ flex: 2, borderColor: 'rgba(255,255,255,0.3) !important' }}
                                                            >
                                                                {protocol.title}
                                                            </span>

                                                            {/* Protocol Categorization */}
                                                            <span className='fw-bold text-center ps-1' style={{ flex: 1 }}>{protocol.type}</span>
                                                        </div>

                                                        {/* Body Section of Research Protocol */}
                                                        <div className='card-body d-flex justify-content-center align-items-center' style={{ minHeight: '100px' }}>
                                                            <p className='mb-0 text-center fw-medium text-dark text-uppercase' style={{ fontSize: '1.4rem' }}>
                                                                {protocol.status}
                                                            </p>
                                                        </div>

                                                        {/* Footer Section */}
                                                        <div className='brand-header text-white p-2 text-center' style={{ fontSize: '0.75rem' }}>
                                                            <span className='fw-bold'>{protocol.date}</span>
                                                        </div>

                                                    </div>

                                                </div>
                                            ))}
                                            
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
                                                    </tr>
                                                </thead>

                                                {/* Table Content */}
                                                <tbody>
                                                    {sortedProtocols.map((protocol, index) => (
                                                        <tr
                                                            key={index}
                                                            onClick={() => setSelectedProtocol(protocol)}
                                                            className={terminalStatuses.includes(protocol.status) ? 'opacity-50 text-muted bg-light' : ''}
                                                            style={{ cursor: 'pointer' }}
                                                        >
                                                            {/* ID */}
                                                            <td className='fw-bold text-theme-primary'>
                                                                {protocol.id}
                                                            </td>

                                                            {/* Research Protocol Title */}
                                                            <td className='text-truncate' style={{ maxWidth: '400px' }}>
                                                                {protocol.title}
                                                            </td>

                                                            {/* Type */}
                                                            <td className='text-center'>
                                                                <span className={`badge ${typeBadgeColors[protocol.type] || 'bg-secondary'}`} style={{minWidth: '100px' }}>{protocol.type}</span>
                                                            </td>

                                                            {/* Status */}
                                                            <td className='fw-medium text-uppercase text-dark text-center'>
                                                                {protocol.status}
                                                            </td>

                                                            {/* Date */}
                                                            <td className='text-secondary small'>
                                                                {protocol.date}
                                                            </td>
                                                        </tr>
                                                    ))}
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

      </div>
  );
}

export default AdminDashboard;
