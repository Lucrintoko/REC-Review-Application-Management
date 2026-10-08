import React from 'react';
/**
 * Reusable Radio Option Cards Group (Used in Sections 8, 9, 10)
 */
function RadioCardGroup({ options, value, onChange, name, gridCols = "col-12 col-md-6" }) {
  return (
    <div className="row g-2">
      {options.map((opt) => {
        const isChecked = value === opt;
        return (
          <div key={opt} className={gridCols}>
            <div
              className={`p-3 border rounded-3 h-100 transition-all ${
                isChecked ? "border-primary bg-primary-subtle" : "bg-white"
              }`}
              style={{ cursor: "pointer" }}
              onClick={() => onChange(opt)}
            >
              <div className="form-check m-0">
                <input
                  className="form-check-input"
                  type="radio"
                  name={name}
                  id={`${name}_${opt}`}
                  value={opt}
                  checked={isChecked}
                  onChange={() => onChange(opt)}
                />
                <label className="form-check-label fw-medium small ps-1" htmlFor={`${name}_${opt}`}>
                  {opt}
                </label>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default RadioCardGroup;

