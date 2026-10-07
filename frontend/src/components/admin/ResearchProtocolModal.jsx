import React, { useState, useEffect } from "react";
import PaymentVerificationModal from "./PaymentVerificationModal";

function ResearchProtocolModal ({ protocol, onClose, onRefresh }) {
    const [showTable, setShowTable] = useState(false);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [historyData, setHistoryData] = useState([]);

    useEffect(() => {
        if (protocol && protocol.application_id) {
            fetch(`http://localhost/REC-Review-Application-Management/backend/api/protocol_history.php?application_id=${protocol.application_id}`)
                .then(res => res.json())
                .then(data => {
                    if (data.success) {
                        setHistoryData(data.data);
                    } else {
                        console.error("Error fetching history:", data.message);
                    }
                })
                .catch(err => console.error("Error fetching history:", err));
        }
    }, [protocol]);

    // Calculate Progress Percentage
    let progressPercentage = 0;
    const terminalStatuses = ['CLEARANCE GRANTED', 'REJECTED', 'WITHDRAWN', 'ONGOING AMENDMENTS'];

    if (protocol && terminalStatuses.includes(protocol.status)) {
        progressPercentage = 100;
    } else {
        // Total steps of 9 according to consolidated flowchart
        const totalExpectedSteps = 9; 
        const completedSteps = historyData.filter(item => item.status === 'Completed').length;
        // Cap at 99% if not terminal, to prevent showing 100% too early
        progressPercentage = Math.min(99, Math.round((completedSteps / totalExpectedSteps) * 100));
    }

    return (
        <>
            <div className="modal-backdrop show" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}></div>

            <div className="modal d-block" tabIndex="-1" onClick={onClose}>
                <div className="modal-dialog modal-lg modal-dialog-centered " onClick={(e) => e.stopPropagation()}>
                    <div className="modal-content border-0 shadow-lg rounded-4">

                        {/* Header */}
                        <div className="modal-header d-flex align-items-center justify-content-between bg-light text-dark rounded-top-4 border-bottom-2">

                            {/* Left Side */}
                            <div className="d-flex align-items-center g-3">
                                <button
                                    type="button"
                                    className="btn btn-light text-dark p-0 text-decoration-none"
                                    onClick={onClose}
                                >
                                    <i className="bi bi-x-circle fs-4" style={{ lineHeight: 1 }}></i>
                                </button>
                                <h5 className="modal-title mb-0 pb-1 ps-2 fw-bold text-theme-primary" style={{ letterSpacing: '1px' }}>{protocol.id}</h5>
                            </div>

                            {/* Right Side */}
                            <div>
                                <h5 className="text-theme-primary modal-title fw-bold mb-0 pb-1 fs-5" style={{ letterSpacing: '3px' }}>{protocol.type}</h5>
                            </div>
                        </div>

                        {/* Body Content */}
                        <div className="modal-body pt-2" style={{ letterSpacing: '1px' }}>
                            
                            {/* Title */}
                            <h2 className="fw-bold fs-4 mb-0 text-theme-secondary">{protocol.title}</h2>

                            {/* Protocol Researchers */}
                            <p className="mb-0 text-secondary pt-1" style={{ fontSize: '1.1rem' }}>
                                <strong>
                                    {protocol.researchers.length > 1 ? "Protocol Researchers: " : "Protocol Researcher: "}
                                </strong>
                                <span>
                                    {protocol.researchers.join(', ')}
                                </span>
                            </p>

                            {/* Current Status and Update Status Button */}
                            <div className="d-flex justify-content-between align-items-center pt-1 mt-1">
                                <h2 className="fw-bold mb-0 text-theme-primary">{protocol.status}</h2>
                                <button 
                                    type="button" 
                                    className="btn btn-theme-tertiary text-light text-uppercase fw-bold"
                                    style={{ letterSpacing: '1px', fontSize: '1.1rem' }}
                                    onClick={() => {
                                        // Checks if status is for Payment Verification, if yes open PaymentVerificationModal
                                        if (protocol.status === 'PAYMENT VERIFICATION') {
                                            setShowPaymentModal(true);
                                        }
                                    }}
                                >Update Status</button>
                            </div>

                            {/* Process Point History */}
                            <div className="mt-2">
                                
                                {/* Identifier for Dropdown Button */}
                                <h5 className="fst-italic text-secondary">Process History</h5>
                                
                                {/* Dropdown Button */}
                                <button
                                    className="btn btn-outline-secondary d-flex justify-content-between align-items-center w-100 mb-1"
                                    onClick={() => setShowTable(!showTable)}
                                >
                                    <span className="fw-bold text-uppercase mb-0" style={{ letterSpacing: '1px' }}>View Protocol History</span>
                                    {/* Toggles between Up Arrow if Collapsed or Down Arrow if Expanded */}
                                    <i
                                        className={`bi ${showTable ? 'bi-chevron-up' : 'bi-chevron-down'}`}
                                        style={{ lineHeight: 1 }}
                                    ></i>
                                </button>

                                {/* Table w/ set height */}
                                {showTable && (
                                    
                                    <div className="border rounded-3 p-2 bg-light shadow-sm" style={{ height: '400px', overflowY: 'auto', overflowX: 'auto' }}>

                                        {/* Content */}
                                        <table className="table table-striped table-sm table-hover align-middle mb-0 pe-2">
                                            <thead 
                                                className="align-middle position-sticky top-0 table-light"
                                                style={{ 
                                                    zIndex: 1,
                                                    boxShadow: '0 1px 0 0 currentcolor'
                                                 }}
                                            >
                                                <tr>
                                                    <th scope="col">Process Point</th> 
                                                    <th scope="col" className="text-center">Status Completion</th> 
                                                    <th scope="col" className="text-center">Date Of Completion</th> 
                                                    <th scope="col" className="text-center">Proponent/s</th> 
                                                </tr>
                                            </thead>

                                            <tbody>
                                                {historyData.map((item, index) => (
                                                    <tr key={index}>
                                                        
                                                        <td className="fw-bold">{item.processPoint}</td>

                                                        <td className={`fw-bold text-center ${item.status === 'Completed' ? 'text-success' : 'text-warning'}`}>
                                                            {item.status}
                                                        </td>

                                                        <td className="text-muted">{item.dateCompleted ? item.dateCompleted : 'TBD'}</td>

                                                        <td>{item.proponentName}</td>

                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>

                                    </div>
                                )}

                            {/* Progress Bar */}
                            <div className="mt-2 px-2">
                                <div className="d-flex justify-content-between align-items-end mb-1">
                                    <span className="fw-bold text-secondary" style={{ fontSize: '0.9rem', letterSpacing: '1px' }}>
                                        OVERALL PROGRESS
                                    </span>
                                    <span className="fw-bold text-theme-primary">
                                        {progressPercentage}%
                                    </span>
                                </div>
                                
                                <div className="progress shadow-sm" style={{ height: '12px' }}>
                                    <div 
                                        className="progress-bar bg-success progress-bar-striped progress-bar-animated" 
                                        role="progressbar" 
                                        style={{ width: `${progressPercentage}%` }} 
                                        aria-valuenow={progressPercentage} 
                                        aria-valuemin="0" 
                                        aria-valuemax="100"
                                    ></div>
                                </div>
                            </div>

                            </div>

                        </div>

                    </div>
                </div>
            </div>

            {showPaymentModal && (
                <PaymentVerificationModal 
                    protocol={protocol}
                    onClose={(isSuccess) => {
                        setShowPaymentModal(false);
                        if (isSuccess && onRefresh) {
                            onRefresh();
                        }
                    }}
                />
            )}
        </>
    );
}

export default ResearchProtocolModal;