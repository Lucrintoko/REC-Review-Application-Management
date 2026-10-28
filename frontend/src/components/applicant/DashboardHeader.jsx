import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import adzuSeal from "../../assets/AdZU Seal.png";
import {
  removeApplicantDraft,
  removeLegacyApplicantDraft,
} from "../../utils/applicantDraftStorage";

/**
 * DashboardHeader
 * Primary navigation header for the Applicant Portal.
 * Features institutional branding, welcome greeting, and an accessible profile pill dropdown with logout.
 */
function DashboardHeader({
  userName,
  userDepartment,
  userEmail,
  subtitle = "Applicant for Research Ethics Review",
  onLogout,
}) {
  const navigate = useNavigate();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Fallback to active localStorage session data if props are omitted
  const displayName =
    userName || localStorage.getItem("applicantName") || "Applicant";
  const displayDepartment =
    userDepartment ||
    localStorage.getItem("applicantDepartment") ||
    "";
  const displayEmail =
    userEmail ||
    localStorage.getItem("applicantEmail") ||
    "";

  // Click-outside and keyboard accessibility dismissal
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const handleLogout = () => {
    setIsDropdownOpen(false);

    // Clear proponent session state
    localStorage.removeItem("applicantId");
    localStorage.removeItem("applicantName");
    localStorage.removeItem("applicantDepartment");
    localStorage.removeItem("applicantEmail");
    removeApplicantDraft();
    removeLegacyApplicantDraft();

    if (onLogout) {
      onLogout();
    } else {
      navigate("/applicant/login");
    }
  };

  return (
    <header className="brand-header shadow-sm" style={{ minHeight: "72px" }}>
      <div className="container-fluid d-flex justify-content-between align-items-center h-100 px-3 px-md-4 px-lg-5 py-2 gap-3">
        {/* Left Side: Institutional Identity & Proponent Greeting */}
        <div className="d-flex align-items-center gap-3 gap-md-4">
          <div className="d-flex align-items-center">
            <img
              src={adzuSeal}
              alt="Ateneo de Zamboanga University Seal"
              className="img-fluid"
              style={{ maxHeight: "50px", width: "auto" }}
            />
          </div>
          <div>
            <h5 className="mb-0 fw-bold text-white fs-5 fs-md-4">
              Welcome, {displayName}
            </h5>
            <small className="text-light opacity-75 d-none d-md-block">
              {subtitle}
            </small>
          </div>
        </div>

        {/* Right Side: Proponent Profile Pill & Dropdown Menu */}
        <div className="position-relative" ref={dropdownRef}>
          <button
            type="button"
            className="btn btn-sm d-flex align-items-center gap-2 py-1 px-2 px-md-3 rounded-pill border border-light border-opacity-25 shadow-sm text-white"
            style={{
              backgroundColor: "rgba(255, 255, 255, 0.12)",
              backdropFilter: "blur(6px)",
              cursor: "pointer",
              transition:
                "background-color 0.15s ease-in-out, border-color 0.15s ease-in-out",
              minHeight: "44px",
            }}
            onClick={() => setIsDropdownOpen((prev) => !prev)}
            aria-expanded={isDropdownOpen}
            aria-haspopup="true"
            aria-label="Proponent account menu"
            title={`Account options for ${displayName}`}
          >
            <i className="bi bi-person-circle fs-4 lh-1 text-white"></i>
            <div
              className="d-none d-md-flex flex-column text-start"
              style={{ lineHeight: 1.15 }}
            >
              <span
                className="fw-semibold text-white small text-truncate"
                style={{ maxWidth: "160px" }}
              >
                {displayName}
              </span>
              <span
                className="text-light opacity-75 text-truncate"
                style={{ fontSize: "0.75rem", maxWidth: "160px" }}
              >
                {displayDepartment}
              </span>
            </div>
            <i
              className="bi bi-chevron-down small text-white-50 ms-1 d-none d-md-inline"
              style={{
                transform: isDropdownOpen ? "rotate(180deg)" : "rotate(0deg)",
                transition: "transform 0.2s ease",
              }}
            ></i>
          </button>

          {/* Anchored Dropdown Menu */}
          {isDropdownOpen && (
            <div
              className="dropdown-menu dropdown-menu-end show shadow-lg border-0 rounded-3 mt-2 p-3 position-absolute end-0"
              style={{
                minWidth: "280px",
                zIndex: 1050,
                backgroundColor: "#ffffff",
              }}
              role="menu"
              aria-label="User account details"
            >
              {/* Proponent Profile Identity Header */}
              <div className="d-flex align-items-center gap-3 pb-3 border-bottom">
                <div
                  className="rounded-circle d-flex align-items-center justify-content-center fw-bold flex-shrink-0"
                  style={{
                    width: "44px",
                    height: "44px",
                    backgroundColor: "#dce1ff",
                    color: "#060297",
                    fontSize: "1.1rem",
                  }}
                >
                  {displayName.charAt(0).toUpperCase()}
                </div>
                <div className="overflow-hidden">
                  <h6
                    className="mb-0 fw-bold text-dark text-truncate"
                    title={displayName}
                  >
                    {displayName}
                  </h6>
                  <small
                    className="text-muted d-block text-truncate"
                    title={displayEmail}
                  >
                    {displayEmail}
                  </small>
                  <span
                    className="badge rounded-pill mt-1"
                    style={{
                      backgroundColor: "#fff4e5",
                      color: "#b25e00",
                      border: "1px solid #ffd8a8",
                      fontSize: "0.7rem",
                      fontWeight: 600,
                    }}
                  >
                    <i className="bi bi-mortarboard me-1"></i>
                    Research Proponent
                  </span>
                </div>
              </div>

              {/* Affiliation / Department Details */}
              <div className="py-2 px-1 text-muted small border-bottom mb-3">
                <div className="d-flex align-items-center gap-2">
                  <i className="bi bi-building text-secondary flex-shrink-0"></i>
                  <span className="text-truncate" title={displayDepartment}>
                    {displayDepartment}
                  </span>
                </div>
              </div>

              {/* Logout Action */}
              <button
                type="button"
                className="btn btn-outline-danger w-100 d-flex align-items-center justify-content-center gap-2 py-2 rounded-2 fw-semibold"
                onClick={handleLogout}
              >
                <i className="bi bi-box-arrow-right fs-6"></i>
                <span>Log Out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

export default DashboardHeader;
