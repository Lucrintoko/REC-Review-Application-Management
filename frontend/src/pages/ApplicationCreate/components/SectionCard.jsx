/**
 * Standard Card Wrapper for Form Sections (DRY Layout)
 */
function SectionCard({ id, number, title, isRequired, isComplete, icon, children, badgeClass }) {
  return (
    <div id={id} className={`card shadow-sm border-0 mb-4 rounded-3 ${badgeClass || ""}`}>
      <div className="card-header bg-white py-3 border-bottom d-flex justify-content-between align-items-center">
        <div className="d-flex align-items-center gap-2">
          <span className="badge bg-primary rounded-circle p-2">
            <i className={`bi ${icon}`}></i>
          </span>
          <h5 className="fw-bold mb-0 text-dark">
            {number}. {title} {isRequired && <span className="text-danger">*</span>}
          </h5>
        </div>
        <div>
          {isComplete ? (
            <span className="badge bg-success-subtle text-success">
              <i className="bi bi-check-circle me-1"></i> Complete
            </span>
          ) : isRequired ? (
            <span className="badge bg-warning-subtle text-warning">Incomplete</span>
          ) : (
            <span className="badge bg-light text-muted">Optional</span>
          )}
        </div>
      </div>
      <div className="card-body p-4">{children}</div>
    </div>
  );
}

export default SectionCard;
