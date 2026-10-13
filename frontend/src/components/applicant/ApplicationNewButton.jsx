import React from "react";
import { Link } from "react-router-dom";

// New Application Button Component, takes up an entire row in ApplicationDashboard

function ApplicationNewButton({ onNewApplication }) {
  return (
    <Link
        to="/applicant/form"
        className="btn btn-primary w-100 d-flex align-items-center justify-content-center"
        onClick={onNewApplication}
    >
        <i className="bi bi-plus-lg me-2"></i> Create a New Protocol Application for Ethics Review
    </Link>
  );
}

export default ApplicationNewButton;