import React, { useState } from "react";
import Swal from 'sweetalert2';

function ReviewTypeModal({ protocol, onClose }) {
    const [reviewType, setReviewType] = useState('');
    const [notes, setNotes] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const extractFiles = (data) => {
        let files = [];
        const recurse = (obj) => {
            if (Array.isArray(obj)) {
                obj.forEach(item => recurse(item));
            } else if (obj && typeof obj === 'object') {
                if (obj.savedPath && obj.name) {
                    files.push(obj);
                } else {
                    for (let key in obj) {
                        recurse(obj[key]);
                    }
                }
            }
        };
        recurse(data);
        return files;
    };
    
    const uploadedFiles = protocol.form_data ? extractFiles(protocol.form_data) : [];

    const handleAssign = () => {
        if (!reviewType) {
            Swal.fire({
                title: 'Selection Required',
                text: 'Please select a review type.',
                icon: 'warning',
                didOpen: () => {
                    const container = Swal.getContainer();
                    if (container) container.style.zIndex = '1100';
                }
            });
            return;
        }

        setIsLoading(true);
        const admin_id = localStorage.getItem('adminId') ? parseInt(localStorage.getItem('adminId')) : 2;

        fetch('http://localhost/REC-Review-Application-Management/backend/api/assign_review_type.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                application_id: protocol.application_id,
                review_type: reviewType,
                notes: notes,
                admin_id: admin_id
            })
        })
        .then(res => res.json())
        .then(data => {
            setIsLoading(false);
            if (data.success) {
                Swal.fire({
                    title: 'Success!',
                    text: data.message,
                    icon: 'success',
                    confirmButtonColor: '#198754', 
                    confirmButtonText: 'OK',
                    didOpen: () => {
                        const container = Swal.getContainer();
                        if (container) container.style.zIndex = '1100';
                    }
                }).then(() => {
                    onClose(true); // Close modal upon success and signal refresh
                });
            } else {
                Swal.fire({
                    title: 'Assignment Failed',
                    text: data.message || "An error occurred",
                    icon: 'error',
                    confirmButtonColor: '#dc3545',
                    didOpen: () => {
                        const container = Swal.getContainer();
                        if (container) container.style.zIndex = '1100';
                    }
                });
            }
        })
        .catch(err => {
            console.error(err);
            setIsLoading(false);
            Swal.fire({
                title: 'Connection Error',
                text: "Error connecting to server",
                icon: 'error',
                confirmButtonColor: '#dc3545',
                didOpen: () => {
                    const container = Swal.getContainer();
                    if (container) container.style.zIndex = '1100';
                }
            });
        });
    };

    return (
        <>
            <div className="modal-backdrop show" style={{ backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 1060 }}></div>

            <div className="modal d-block" tabIndex="-1" onClick={() => onClose(false)} style={{ zIndex: 1065, overflowY: 'hidden' }}>
                <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable" onClick={(e) => e.stopPropagation()}>
                    <div className="modal-content border-0 shadow-lg rounded-4" style={{ maxHeight: '90vh' }}>
                        
                        {/* Header */}
                        <div className="modal-header bg-light rounded-top-4 border-bottom-2">
                            <h5 className="modal-title fw-bold text-theme-primary" style={{ letterSpacing: '1px' }}>
                                Determine Review Type
                            </h5>
                            <button type="button" className="btn-close" onClick={() => onClose(false)}></button>
                        </div>

                        {/* Body */}
                        <div className="modal-body p-4">
                            {/* Protocol Information Display & Form Summary */}
                            <div className="bg-light p-3 rounded-3 border mb-4 shadow-sm">
                                <h6 className="text-secondary fw-bold mb-3 border-bottom pb-2">Protocol Information & Summary</h6>
                                <div className="row mb-2">
                                    <div className="col-4 text-muted fw-bold">Protocol Code:</div>
                                    <div className="col-8 fw-bold text-dark">{protocol.id || protocol.protocol_code}</div>
                                </div>
                                <div className="row mb-2">
                                    <div className="col-4 text-muted fw-bold">Title:</div>
                                    <div className="col-8 text-dark">{protocol.title || protocol.research_title}</div>
                                </div>
                                <div className="row mb-2">
                                    <div className="col-4 text-muted fw-bold">Date Submitted:</div>
                                    <div className="col-8 text-dark">{protocol.date || protocol.submission_date}</div>
                                </div>
                                <div className="row mb-3">
                                    <div className="col-4 text-muted fw-bold">Researchers:</div>
                                    <div className="col-8 text-dark">
                                        {protocol.researchers ? protocol.researchers.join(', ') : 'N/A'}
                                        {protocol.form_data?.primary_researchers && !protocol.researchers && 
                                            protocol.form_data.primary_researchers.map(r => `${r.firstName} ${r.lastName}`).join(', ')}
                                    </div>
                                </div>

                                {protocol.form_data && (
                                    <>
                                        <h6 className="text-theme-primary fw-bold mb-2 mt-4 border-bottom pb-1">Study Details</h6>
                                        <div className="row mb-2 small">
                                            <div className="col-12 text-muted fw-bold">Objectives:</div>
                                            <div className="col-12 text-dark">{protocol.form_data.description_objectives || 'N/A'}</div>
                                        </div>
                                        <div className="row mb-2 small">
                                            <div className="col-4 text-muted fw-bold">Study Type:</div>
                                            <div className="col-8 text-dark">{protocol.form_data.study_type === 'Other (please specify)' ? protocol.form_data.study_type_other : protocol.form_data.study_type}</div>
                                        </div>
                                        <div className="row mb-2 small">
                                            <div className="col-4 text-muted fw-bold">Funding:</div>
                                            <div className="col-8 text-dark">{protocol.form_data.funding_source}</div>
                                        </div>
                                        <div className="row mb-2 small">
                                            <div className="col-4 text-muted fw-bold">Participants:</div>
                                            <div className="col-8 text-dark">{protocol.form_data.duration_participants_count} subjects (Target: {protocol.form_data.duration_target_population || 'N/A'})</div>
                                        </div>
                                        
                                        <h6 className="text-theme-primary fw-bold mb-2 mt-3 border-bottom pb-1">Risk & Compliance Flags</h6>
                                        <div className="row mb-2 small">
                                            <div className="col-4 text-muted fw-bold">Tech Review:</div>
                                            <div className="col-8">
                                                {protocol.form_data.compliance_technical_reviewed === 'Yes' 
                                                    ? <span className="badge bg-success">Passed ({protocol.form_data.compliance_technical_body})</span> 
                                                    : <span className="badge bg-warning text-dark">No Tech Review</span>}
                                            </div>
                                        </div>
                                        <div className="row mb-2 small">
                                            <div className="col-4 text-muted fw-bold">Vulnerable Groups:</div>
                                            <div className="col-8">
                                                {!protocol.form_data.requirements?.assentForm?.notApplicable 
                                                    ? <span className="badge bg-danger">Yes (Assent Required)</span> 
                                                    : <span className="badge bg-secondary">No (Not Applicable)</span>}
                                            </div>
                                        </div>
                                        <div className="row mb-2 small">
                                            <div className="col-4 text-muted fw-bold">Other ERC:</div>
                                            <div className="col-8 text-dark">
                                                {protocol.form_data.compliance_other_erc === 'Yes' 
                                                    ? `Yes (${protocol.form_data.compliance_other_erc_name} - ${protocol.form_data.compliance_other_erc_status})` 
                                                    : 'No'}
                                            </div>
                                        </div>
                                        
                                        {uploadedFiles.length > 0 && (
                                            <>
                                                <h6 className="text-theme-primary fw-bold mb-2 mt-3 border-bottom pb-1">Uploaded Documents</h6>
                                                <ul className="list-unstyled small ps-3">
                                                    {uploadedFiles.map((file, idx) => (
                                                        <li key={idx} className="mb-1">
                                                            <i className="bi bi-file-earmark-text me-2 text-secondary"></i>
                                                            <a href={'/' + file.savedPath} target="_blank" rel="noopener noreferrer" className="text-decoration-none">
                                                                {file.name}
                                                            </a>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </>
                                        )}
                                    </>
                                )}
                            </div>

                            {/* Radio Button Selection for Review Type */}
                            <h6 className="text-secondary fw-bold mb-3">Select Review Type:</h6>
                            <div className="d-flex flex-column gap-2 mb-4 px-3">
                                <div className="form-check">
                                    <input 
                                        className="form-check-input" 
                                        type="radio" 
                                        name="reviewType" 
                                        id="typeExempted" 
                                        value="Exempted"
                                        checked={reviewType === 'Exempted'}
                                        onChange={(e) => setReviewType(e.target.value)}
                                    />
                                    <label className="form-check-label fw-bold cursor-pointer" htmlFor="typeExempted">
                                        Exempted
                                    </label>
                                    <small className="d-block text-muted">Less than minimal risk research.</small>
                                </div>
                                <div className="form-check">
                                    <input 
                                        className="form-check-input" 
                                        type="radio" 
                                        name="reviewType" 
                                        id="typeExpedited" 
                                        value="Expedited"
                                        checked={reviewType === 'Expedited'}
                                        onChange={(e) => setReviewType(e.target.value)}
                                    />
                                    <label className="form-check-label fw-bold cursor-pointer" htmlFor="typeExpedited">
                                        Expedited
                                    </label>
                                    <small className="d-block text-muted">Minimal risk research.</small>
                                </div>
                                <div className="form-check">
                                    <input 
                                        className="form-check-input" 
                                        type="radio" 
                                        name="reviewType" 
                                        id="typeFullBoard" 
                                        value="Full Board"
                                        checked={reviewType === 'Full Board'}
                                        onChange={(e) => setReviewType(e.target.value)}
                                    />
                                    <label className="form-check-label fw-bold cursor-pointer" htmlFor="typeFullBoard">
                                        Full Board
                                    </label>
                                    <small className="d-block text-muted">More than minimal risk research, requires full board discussion.</small>
                                </div>
                            </div>

                            <div className="mb-3">
                                <label className="form-label fw-bold text-secondary">Notes (Optional)</label>
                                <textarea 
                                    className="form-control" 
                                    rows="2" 
                                    placeholder="Enter any initial notes for the review..."
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                ></textarea>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="modal-footer bg-light rounded-bottom-4">
                            <button 
                                type="button" 
                                className="btn btn-outline-secondary px-4 fw-bold" 
                                onClick={() => onClose(false)}
                                disabled={isLoading}
                            >
                                Cancel
                            </button>
                            <button 
                                type="button" 
                                className="btn btn-theme-primary px-4 fw-bold text-white" 
                                onClick={handleAssign}
                                disabled={isLoading || !reviewType}
                            >
                                {isLoading ? (
                                    <><span className="spinner-border spinner-border-sm me-2"></span>Assigning...</>
                                ) : (
                                    'Assign Review Type'
                                )}
                            </button>
                        </div>

                    </div>
                </div>
            </div>
        </>
    );
}

export default ReviewTypeModal;
