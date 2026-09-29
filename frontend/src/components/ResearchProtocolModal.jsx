import React from "react";

function ResearchProtocolModal ({ protocol, onClose }) {
    return (
        <>
            <div className="modal-backdrop show" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}></div>

            <div className="modal d-block" tabIndex="-1" onClick={onClose}>
                <div className="modal-dialog modal-dialog-centered" onClick={(e) => e.stopPropagation()}>
                    <div className="modal-content border-0 shadow-lg rounded-4">

                        {/* Header */}
                        <div className="modal-header d-flex align-items-center justify-content-between bg-light text-dark rounded-top-4 border-bottom-1">

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

                    </div>
                </div>
            </div>
        </>
    );
}

export default ResearchProtocolModal;