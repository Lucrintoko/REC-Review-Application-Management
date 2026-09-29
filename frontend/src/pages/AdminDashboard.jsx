import React, { useState } from 'react';
import adzuSeal from '../assets/AdZU Seal.png';
import ResearchProtocolModal from '../components/ResearchProtocolModal';

function AdminDashboard() {
    const adminName = "Sean Matthew Araneta";
    const role = "Secretariat";
    const protocolData = [                                      
        { id: '2026-0751', title: 'Early Childhood Bilingualism and Its Long-Term Influence on Executive Function Development', type: 'FULL BOARD', status: 'AMENDING', date: 'DEC 4, 2023' },
        { id: '2026-0297', title: 'Cellular Agriculture and Cultured Meat: Nutritional Equivalence and Scalability Economics', type: 'EXEMPTED', status: 'ONGOING REVIEW', date: 'DEC 5, 2023' },
        { id: '2026-1317', title: 'Quantifying Urban Heat Island Mitigation via Green Roofs and Permeable Pavements', type: 'EXEMPTED', status: 'CONSOLIDATION', date: 'DEC 10, 2023' },
        { id: '2026-1437', title: 'The Effectiveness of Virtual Lab Simulations in Chemistry Education for Remote Learners', type: 'EXEMPTED', status: 'AMENDING', date: 'DEC 9, 2023' },
        { id: '2026-0065', title: 'Nurse Staffing Ratios and Their Direct Correlation with Postoperative Patient Mortality', type: 'EXPEDITED', status: 'DELIBERATION', date: 'DEC 3, 2023' },
        { id: '2026-0777', title: 'Intellectual Property Rights and Fair Use Boundaries in Generative Model Training Datasets', type: 'EXPEDITED', status: 'CONSOLIDATION', date: 'DEC 5, 2023' },
        { id: '2026-0894', title: 'Gender Representation and Stereotyping in High-Grossing Video Games (2015–2025)', type: 'FULL BOARD', status: 'CONSOLIDATION', date: 'DEC 1, 2023' },
        { id: '2026-0102', title: 'The Role of Culturally Responsive Teaching in Improving First-Generation Student Retention', type: 'EXEMPTED', status: 'AWAITING PROGRESS REPORT', date: 'DEC 8, 2023' },

        { id: '2026-0751', title: 'Early Childhood Bilingualism and Its Long-Term Influence on Executive Function Development', type: 'FULL BOARD', status: 'AMENDING', date: 'DEC 4, 2023' },
        { id: '2026-0297', title: 'Cellular Agriculture and Cultured Meat: Nutritional Equivalence and Scalability Economics', type: 'EXEMPTED', status: 'ONGOING REVIEW', date: 'DEC 5, 2023' },
        { id: '2026-1317', title: 'Quantifying Urban Heat Island Mitigation via Green Roofs and Permeable Pavements', type: 'EXEMPTED', status: 'CONSOLIDATION', date: 'DEC 10, 2023' },
        { id: '2026-1437', title: 'The Effectiveness of Virtual Lab Simulations in Chemistry Education for Remote Learners', type: 'EXEMPTED', status: 'AMENDING', date: 'DEC 9, 2023' },
        { id: '2026-0065', title: 'Nurse Staffing Ratios and Their Direct Correlation with Postoperative Patient Mortality', type: 'EXPEDITED', status: 'DELIBERATION', date: 'DEC 3, 2023' },
        { id: '2026-0777', title: 'Intellectual Property Rights and Fair Use Boundaries in Generative Model Training Datasets', type: 'EXPEDITED', status: 'CONSOLIDATION', date: 'DEC 5, 2023' },
        { id: '2026-0894', title: 'Gender Representation and Stereotyping in High-Grossing Video Games (2015–2025)', type: 'FULL BOARD', status: 'CONSOLIDATION', date: 'DEC 1, 2023' },
        { id: '2026-0102', title: 'The Role of Culturally Responsive Teaching in Improving First-Generation Student Retention', type: 'EXEMPTED', status: 'AWAITING PROGRESS REPORT', date: 'DEC 8, 2023' },

        { id: '2026-0751', title: 'Early Childhood Bilingualism and Its Long-Term Influence on Executive Function Development', type: 'FULL BOARD', status: 'AMENDING', date: 'DEC 4, 2023' },
        { id: '2026-0297', title: 'Cellular Agriculture and Cultured Meat: Nutritional Equivalence and Scalability Economics', type: 'EXEMPTED', status: 'ONGOING REVIEW', date: 'DEC 5, 2023' },
        { id: '2026-1317', title: 'Quantifying Urban Heat Island Mitigation via Green Roofs and Permeable Pavements', type: 'EXEMPTED', status: 'CONSOLIDATION', date: 'DEC 10, 2023' },
        { id: '2026-1437', title: 'The Effectiveness of Virtual Lab Simulations in Chemistry Education for Remote Learners', type: 'EXEMPTED', status: 'AMENDING', date: 'DEC 9, 2023' },
        { id: '2026-0065', title: 'Nurse Staffing Ratios and Their Direct Correlation with Postoperative Patient Mortality', type: 'EXPEDITED', status: 'DELIBERATION', date: 'DEC 3, 2023' },
        { id: '2026-0777', title: 'Intellectual Property Rights and Fair Use Boundaries in Generative Model Training Datasets', type: 'EXPEDITED', status: 'CONSOLIDATION', date: 'DEC 5, 2023' },
        { id: '2026-0894', title: 'Gender Representation and Stereotyping in High-Grossing Video Games (2015–2025)', type: 'FULL BOARD', status: 'CONSOLIDATION', date: 'DEC 1, 2023' },
        { id: '2026-0102', title: 'The Role of Culturally Responsive Teaching in Improving First-Generation Student Retention', type: 'EXEMPTED', status: 'AWAITING PROGRESS REPORT', date: 'DEC 8, 2023' },
    ];
    const [selectedProtocol, setSelectedProtocol] = useState(null);

    // Ensures that Protocol Area Dashboard will always occupy 4x4 grid
    const emptySLots = Array.from({ length: Math.max(0, 16 - protocolData.length) })

    return (
      <div className="min-vh-100 d-flex flex-column"> 

            {/* Header Class */}
            <header className="brand-header shadow-sm" style={{ height: '10vh' }}>
                {/* Header Content */}
                <div className='container-fluid d-flex justify-content-between align-items-center h-100 px-5 gap-3'>
                    {/* AdZU Seal w/ Dynamic Welcome Message */}
                    <div className='d-flex align-items-center h-100 gap-4'>
                        {/* AdZU Seal */}
                        <img 
                            src={adzuSeal} 
                            alt="AdZU Seal"
                            className='img-fluid' 
                            style={{ maxHeight: '70%',  width: 'auto' }}/> 

                        {/* Welcome Message */}
                        <div>
                            <h4 className='mb-0 fw-bold'>Welcome, {adminName}</h4>
                            <small className='text-light opacity-50 d-none d-md-block'>AdZU Research Ethics Committee {role}</small>
                        </div>
                    </div>

                    {/* Profile Pic Icon */}
                    <div className='d-flex align-items-center h-100'>
                        <i  
                            className='bi bi-person-circle text-emphasis'
                            style={{
                                fontSize: '5vh',
                                lineHeight: 1
                            }}    
                        ></i>
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
                    <div className='col-12 col-md-6 col-lg-5 mt-3 mt-md-0 d-flex align-items-center gap-3'>

                        {/* Filter */}
                        <button className='btn btn-outline-secondary border shadow-sm d-flex align-items-center ' type='button'>
                            <i
                                className='bi bi-funnel me-2'
                            ></i>Filter
                        </button>

                        {/* Search Bar */}
                        <div className='input-group shadow-sm'>
                            {/* Text Input */}
                            <input type="text" className='form-control text-truncate' placeholder='Search protocol...' />

                            {/* Search Button */}
                            <button className='btn btn-primary' type='button'>
                                <i
                                    className='bi bi-search me-2'
                                ></i>Search
                            </button>
                        </div>
                        
                    </div>
                </div>

                {/* Main Dashboard Content */}
                <div className='row mt-3 mb-3'>

                    {/* Encompass the whole row */}
                    <div className='col-12'>
                        <div className='card shadow-sm border-0 rounded-4'>
                            <div className='card-body p-4 bg-white rounded-4'>

                                {/* Set Height for Reesearch Protocol 4x4 Area w/ veritcal scrollbar */}
                                <div className='pe-2' style={{ height: '700px', overflowY: 'auto', overflowX: 'hidden' }}>

                                    {/* Research Porotocol Grid */}
                                    <div className='row g-3'>

                                        {/* 4x4 Protocol Grid Area */}
                                        {/* Using map function for displaying the protocols */}
                                        {protocolData.map((protocol, index) => (
                                            <div key={index} className='col col-md-3'>
                                                
                                                {/* Individual protocol cards */}
                                                <div 
                                                    className='card h-100 border-0 shadow-sm rounded-4 overflow-hidden' 
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

                                </div>  

                            </div>
                        </div>
                    </div>

                </div>

                {/* Statistics Dashboard */}
                <div className='row d-flex justify-content-center align-items-center mt-3'>

                    {/* Statistics Dashboard Identifier */}
                    <div className='col d-flex justify-content-center align-items-center gap-3'>
                        <i
                            className='bi bi-bar-chart-fill border border-3 border-dark p-1 rounded fs-3'
                            style={{
                                lineHeight: 1
                            }}
                        ></i>
                        <p className='fw-bold fs-5 mb-1'>Statistics</p>
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
            />
        )}

      </div>
  );
}

export default AdminDashboard;
