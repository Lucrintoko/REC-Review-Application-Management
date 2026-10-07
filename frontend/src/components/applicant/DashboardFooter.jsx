import React from "react";

/**
 * Reusable Footer component for dashboards.
 */
function DashboardFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-light border-top py-4 mt-auto">
      <div className="container">
        <p className="mb-0 text-center text-muted">
          &copy; {currentYear} Ateneo de Zamboanga University. All rights reserved.
        </p>
      </div>
    </footer>
  );
}

export default DashboardFooter;
