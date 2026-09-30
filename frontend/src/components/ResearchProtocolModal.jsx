import React from "react";

function ResearchProtocolModal ({ protocol, onClose }) {
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
                            <p className="mb-0 text-secondary" style={{ fontSize: '1.1rem' }}>
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
                                    className="btn bg-theme-tertiary text-light text-uppercase fw-bold"
                                    style={{ 
                                        letterSpacing: '1px', 
                                        fontSize: '1.15rem'
                                    }}
                                >Update Status</button>
                            </div>

                        </div>

                    </div>
                </div>
            </div>
        </>
    );
}

export default ResearchProtocolModal;