/**
 * Reusable Researcher Entry Manager (Used in Sections 3 & 4)
 */

function ResearcherManager({
  researchers,
  onAdd,
  onRemove,
  onUpdate,
  isPrimary = true,
  roleOptions = ["Principal Investigator", "Co-Principal Investigator", "Lead Faculty Researcher"],
  validationErrors = {},
}) {
  return (
    <div>
      {researchers.length === 0 && !isPrimary && (
        <div className="p-3 text-center bg-light rounded-3 text-muted small border mb-3">
          No co-researchers added yet. Click below if you have collaborators assisting in data collection.
        </div>
      )}

      {researchers.map((person, index) => {
        const nameError = validationErrors[`researcher_${index}_name`];
        const emailError = validationErrors[`researcher_${index}_email`];

        return (
        <div key={person.id || index} className="p-3 bg-light rounded-3 mb-3 border position-relative">
          <div className="d-flex justify-content-between align-items-center mb-2">
            <span className={`badge ${isPrimary ? "bg-primary" : "bg-secondary"}`}>
              {isPrimary ? `Primary Researcher #${index + 1}` : `Co-Researcher #${index + 1}`}
              {person.role ? ` (${person.role})` : ""}
            </span>
            {(researchers.length > 1 || !isPrimary) && (
              <button
                type="button"
                className="btn btn-sm btn-outline-danger"
                onClick={() => onRemove(person.id || index)}
                title="Remove researcher"
              >
                <i className="bi bi-trash me-1"></i> Remove
              </button>
            )}
          </div>

          <div className="row g-3">
            <div className="col-12 col-md-6">
              <label className="form-label small fw-semibold">
                First Name: {isPrimary && <span className="text-danger">*</span>}
              </label>
              <input
                type="text"
                className={`form-control form-control-sm ${nameError ? "is-invalid" : ""}`}
                value={person.firstName}
                onChange={(e) => onUpdate(person.id || index, "firstName", e.target.value)}
                placeholder="e.g. Juan"
              />
            </div>

            <div className="col-12 col-md-6">
              <label className="form-label small fw-semibold">
                Last Name: {isPrimary && <span className="text-danger">*</span>}
              </label>
              <input
                type="text"
                className={`form-control form-control-sm ${nameError ? "is-invalid" : ""}`}
                value={person.lastName}
                onChange={(e) => onUpdate(person.id || index, "lastName", e.target.value)}
                placeholder="e.g. Dela Cruz"
              />
              {nameError && <div className="invalid-feedback">{nameError}</div>}
            </div>

            <div className="col-12 col-md-6">
              <label className="form-label small fw-semibold">
                Email Address: {isPrimary && <span className="text-danger">*</span>}
              </label>
              <input
                type="email"
                className={`form-control form-control-sm ${emailError ? "is-invalid" : ""}`}
                value={person.email}
                onChange={(e) => onUpdate(person.id || index, "email", e.target.value)}
                placeholder="name@adzu.edu.ph"
              />
              {emailError && <div className="invalid-feedback">{emailError}</div>}
            </div>

            <div className="col-12 col-md-6">
              <label className="form-label small fw-semibold">Contact Number:</label>
              <input
                type="text"
                className="form-control form-control-sm"
                value={person.contactNumber || ""}
                onChange={(e) => onUpdate(person.id || index, "contactNumber", e.target.value)}
                placeholder="e.g. 09171234567"
              />
            </div>

            <div className="col-12 col-md-8">
              <label className="form-label small fw-semibold">
                Department / Institutional Affiliation: {isPrimary && <span className="text-danger">*</span>}
              </label>
              <input
                type="text"
                className="form-control form-control-sm"
                value={person.department || person.affiliation || ""}
                onChange={(e) =>
                  onUpdate(person.id || index, isPrimary ? "department" : "affiliation", e.target.value)
                }
                placeholder="e.g. College of Science and Information Technology"
              />
            </div>

            <div className="col-12 col-md-4">
              <label className="form-label small fw-semibold">Role:</label>
              {isPrimary ? (
                <select
                  className="form-select form-select-sm"
                  value={person.role}
                  onChange={(e) => onUpdate(person.id || index, "role", e.target.value)}
                >
                  <option value="">Select role...</option>
                  {roleOptions.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  className="form-control form-control-sm"
                  value={person.role || ""}
                  onChange={(e) => onUpdate(person.id || index, "role", e.target.value)}
                  placeholder="e.g. Student Co-Researcher"
                />
              )}
            </div>
          </div>
        </div>
        );
      })}

      <button
        type="button"
        className={`btn btn-sm ${isPrimary ? "btn-outline-primary" : "btn-outline-secondary"}`}
        onClick={onAdd}
      >
        <i className="bi bi-plus-circle me-1"></i> {isPrimary ? "Add Another Primary Researcher" : "Add Co-Researcher"}
      </button>
    </div>
  );
}

export default ResearcherManager;
