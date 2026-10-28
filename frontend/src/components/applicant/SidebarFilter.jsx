import React from "react";
import { useNavigate } from "react-router-dom";
import { APPLICATION_TYPES } from "../../constants/applicationTypes";
import {
  removeApplicantDraft,
  removeLegacyApplicantDraft,
} from "../../utils/applicantDraftStorage";

/**
 * Sidebar filter component for toggling application categories and viewing counts.
 */
function SidebarFilter({
  selectedType = "ALL",
  onSelectType,
  getTypeCount,
  types = APPLICATION_TYPES,
}) {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("applicantId");
    localStorage.removeItem("applicantName");
    localStorage.removeItem("applicantDepartment");
    localStorage.removeItem("applicantEmail");
    removeApplicantDraft();
    removeLegacyApplicantDraft();
    navigate("/applicant/login");
  };

  return (
    <div className="card shadow-sm h-100">
      <div className="card-body d-flex flex-column">
        <div className="d-grid gap-2">
          {/* Header & Select All */}
          <div className="d-flex justify-content-between align-items-center mb-2">
            <h5 className="card-title mb-0">Application Types</h5>
            <button
              className={`btn btn-sm ${
                selectedType === "ALL" ? "btn-primary" : "btn-outline-primary"
              }`}
              type="button"
              onClick={() => onSelectType("ALL")}
              title="Show all applications"
            >
              <small className="fst-italic">Select All</small>
            </button>
          </div>

          {/* Dynamic Category Filter Buttons */}
          {types.map((type) => {
            const isSelected = selectedType === type.id;
            const count = getTypeCount ? getTypeCount(type) : 0;

            return (
              <button
                key={type.id}
                className={`btn text-start ${
                  isSelected ? "btn-primary text-white shadow-sm" : "btn-outline-primary"
                }`}
                type="button"
                onClick={() => onSelectType(isSelected ? "ALL" : type.id)}
              >
                <div className="d-flex justify-content-between align-items-center">
                  <span>{type.label}</span>
                  <span
                    className={`badge ${
                      isSelected ? "bg-light text-primary" : "bg-primary"
                    }`}
                  >
                    {count}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Pinned to bottom to maintain height symmetry */}
        <div className="mt-auto pt-3">
          <hr className="my-2" />
          <button
            className="btn btn-outline-danger w-100"
            type="button"
            onClick={handleLogout}
          >
            <i className="bi bi-box-arrow-right me-2"></i>Logout
          </button>
        </div>
      </div>
    </div>
  );
}

export default SidebarFilter;
