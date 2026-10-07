import React, { useState, useEffect } from "react";

function PaymentVerificationModal({ protocol, onClose }) {
    const [paymentData, setPaymentData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [notes, setNotes] = useState('');

    // Fetch the payment details according to Research Protocol on ResearchProtocolModal
    useEffect(() => {
        if (protocol && protocol.application_id) {
            fetch(`http://localhost/REC-Review-Application-Management/backend/api/get_payment.php?application_id=${protocol.application_id}`)
                .then(res => res.json())
                .then(data => {
                    if (data.success) {
                        setPaymentData(data.data);
                    } else {
                        setError(data.message);
                    }
                    setIsLoading(false);
                })
                .catch(err => {
                    console.error("Error fetching payment:", err);
                    setError("Failed to load payment details.");
                    setIsLoading(false);
                });
        }
    }, [protocol]);

    // For Secretariat Payment Verification
    const handleVerification = (action) => {
        setIsLoading(true);
        const admin_id = localStorage.getItem('adminId') ? parseInt(localStorage.getItem('adminId')) : 1; // Fallback to 1 if not re-logged in

        // Sending it to verify payment logic
        fetch('http://localhost/REC-Review-Application-Management/backend/api/verify_payment.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                application_id: protocol.application_id,
                status: action,
                notes: notes,
                admin_id: admin_id
            })
        })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                alert(data.message);
                onClose(true); // Close modal upon success and signal refresh
            } else {
                alert(data.message || "An error occurred");
                setIsLoading(false);
            }
        })
        .catch(err => {
            console.error(err);
            alert("Error connecting to server");
            setIsLoading(false);
        });
    };

    return (
        <>
            {/* Higher Z-Index to guarantee showing up above the ResearchProtocolModal */}
            <div className="modal-backdrop show" style={{ backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 1060 }}></div>

            <div className="modal d-block" tabIndex="-1" onClick={() => onClose(false)} style={{ zIndex: 1065 }}>
                <div className="modal-dialog modal-lg modal-dialog-centered" onClick={(e) => e.stopPropagation()}>
                    <div className="modal-content border-0 shadow-lg rounded-4">
                        
                        {/* Header */}
                        <div className="modal-header bg-light rounded-top-4 border-bottom-2">
                            <h5 className="modal-title fw-bold text-theme-primary" style={{ letterSpacing: '1px' }}>
                                Verify OR Payment
                            </h5>
                            <button type="button" className="btn-close" onClick={() => onClose(false)}></button>
                        </div>

                        {/* Body */}
                        <div className="modal-body p-4">
                            <h6 className="text-secondary fw-bold mb-3">Protocol: {protocol.id}</h6>
                            
                            {isLoading ? (
                                <div className="text-center py-4">
                                    <div className="spinner-border text-primary" role="status"></div>
                                </div>
                            ) : error ? (
                                <div className="alert alert-warning fw-bold">{error}</div>
                            ) : paymentData ? (
                                <div className="bg-light p-3 rounded-3 border mb-4 shadow-sm">
                                    <div className="row mb-2">
                                        <div className="col-5 text-muted fw-bold">OR Number:</div>
                                        <div className="col-7 fw-bold text-dark fs-5">{paymentData.orNumber}</div>
                                    </div>
                                    <div className="row mb-2">
                                        <div className="col-5 text-muted fw-bold">Amount Paid:</div>
                                        <div className="col-7 text-dark fw-semibold">₱ {paymentData.amount}</div>
                                    </div>
                                    <div className="row">
                                        <div className="col-5 text-muted fw-bold">Payment Date:</div>
                                        <div className="col-7 text-dark fw-semibold">{paymentData.paymentDate}</div>
                                    </div>
                                </div>
                            ) : null}

                            <div className="mb-3">
                                <label className="form-label fw-bold text-secondary">Verification Notes (Optional)</label>
                                <textarea 
                                    className="form-control" 
                                    rows="2" 
                                    placeholder="e.g., Verified against physical cashier logbook"
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                ></textarea>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="modal-footer bg-light rounded-bottom-4">
                            <button 
                                type="button" 
                                className="btn btn-outline-danger px-4 fw-bold" 
                                onClick={() => handleVerification('Rejected')}
                                disabled={isLoading || error}
                            >
                                Reject
                            </button>
                            <button 
                                type="button" 
                                className="btn btn-success px-4 fw-bold" 
                                onClick={() => handleVerification('Verified')}
                                disabled={isLoading || error}
                            >
                                Confirm Payment
                            </button>
                        </div>

                    </div>
                </div>
            </div>
        </>
    );
}

export default PaymentVerificationModal;