import React from "react";
import adzuSeal from "../assets/AdZU Seal.png";

/**
 * Reusable Header component for dashboards (Applicant, Admin, Secretariat).
 */
function DashboardHeader({ userName = "Applicant", subtitle = "Applicant for Research Ethics Review" }) {
  return (
    <header className="brand-header shadow-sm" style={{ height: "10vh" }}>
      <div className="container-fluid d-flex justify-content-between align-items-center h-100 px-5 gap-3">
        <div className="d-flex align-items-center h-100 gap-4">
          {/* AdZU Seal */}
          <div className="d-flex align-items-center h-100">
            <img
              src={adzuSeal}
              alt="AdZU Seal"
              className="img-fluid"
              style={{ maxHeight: "70%", width: "auto" }}
            />
          </div>
          {/* Welcome Message */}
          <div>
            <h4 className="mb-0 fw-bold">Welcome, {userName}</h4>
            <small className="text-light opacity-50 d-none d-md-block">{subtitle}</small>
          </div>
        </div>
        {/* Profile Pic Icon */}
        <div className="d-flex align-items-center h-100">
          <i
            className="bi bi-person-circle text-emphasis"
            style={{
              fontSize: "5vh",
              lineHeight: 1,
            }}
          ></i>
        </div>
      </div>
    </header>
  );
}

export default DashboardHeader;
