import React, { useState } from "react";
import DashboardHeader from "../components/applicant/DashboardHeader";
import DashboardFooter from "../components/applicant/DashboardFooter";
import SidebarFilter from "../components/applicant/SidebarFilter";
import ApplicationSearchBar from "../components/applicant/ApplicationSearchBar";
import ApplicationsTable from "../components/applicant/ApplicationsTable";
import ApplicationNewButton from "../components/applicant/ApplicationNewButton";
import SubmitORModal from "../components/applicant/SubmitORModal";
import { useApplications } from "../hooks/useApplications";
import { useTableSortFilter } from "../hooks/useTableSortFilter";

const SORT_LABELS = {
  research_title: "Title",
  protocol_code: "Protocol No.",
  submission_date: "Date",
  status: "Status",
};

/**
 * ApplicantDashboard
 * Primary dashboard view for applicants to view, filter, sort, and manage ethics review applications.
 */
function ApplicantDashboard({
  onNavigateHome,
  onNewApplication,
  onSelectApplication,
}) {
  const applicantName = localStorage.getItem('applicantName') || "Juan Dela Cruz";
  const [selectedOrApp, setSelectedOrApp] = useState(null);

  // 1. Fetch applications data via custom hook (handles API, abort controller, loading, error, and fallback data)
  const { applications, isLoading, refetch } = useApplications();

  // 2. Manage client-side filtering and sorting via custom hook
  const {
    selectedType,
    setSelectedType,
    searchQuery,
    setSearchQuery,
    sortConfig,
    handleSort,
    sortedApplications,
    getTypeCount,
    clearFilters,
  } = useTableSortFilter(applications);

  const hasActiveFilters = selectedType !== "ALL" || searchQuery.trim().length > 0;

  const handleOrSuccess = () => {
    setSelectedOrApp(null);
    refetch(); // Refresh table data to reflect new status
  };

  return (
    <div className="min-vh-100 d-flex flex-column">
      {/* Header */}
      <DashboardHeader userName={applicantName} />

      {/* Main Dashboard Layout */}
      <main className="container my-4 flex-grow-1 d-flex flex-column">
        <div className="row g-4 flex-grow-1 align-items-stretch">
          {/* Left Column: Filter Sidebar */}
          {/* Should be smaller margin on mobile */}
          <aside className="col-md-3 d-flex flex-column gap-3">
            <SidebarFilter
              selectedType={selectedType}
              onSelectType={setSelectedType}
              getTypeCount={getTypeCount}
              totalApplicationsCount={applications.length}
              onBackHome={onNavigateHome}
            />
          </aside>

          {/* Right Column: Applications Table & Search Controls */}
          <section className="col-md-9 d-flex flex-column">
            <div className="card shadow-sm h-100">
              <div className="card-body d-flex flex-column">
                {/* Header with Title and Search/New Action Bar */}
                <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
                  <div>
                    <h5 className="card-title mb-0">
                      Your Applications
                      {selectedType !== "ALL" && (
                        <span className="badge bg-primary ms-2 fs-6 fw-normal">
                          {selectedType}
                        </span>
                      )}
                    </h5>
                    <small className="text-muted">
                      Showing {sortedApplications.length} of {applications.length} applications
                      {sortConfig.key && (
                        <span className="ms-2 fst-italic">
                          • Sorted by {SORT_LABELS[sortConfig.key] || sortConfig.key} (
                          {sortConfig.direction === "asc" ? "ascending" : "descending"})
                        </span>
                      )}
                    </small>
                  </div>

                  <ApplicationSearchBar
                    searchQuery={searchQuery}
                    onSearchChange={setSearchQuery}
                    onClearSearch={() => setSearchQuery("")}
                    onNewApplication={onNewApplication}
                  />
                </div>
                
                {/* New Application Button */}
                <div className="mb-3">
                  <ApplicationNewButton onNewApplication={onNewApplication} />
                </div>

                {/* Applications Table */}
                <div className="flex-grow-1 d-flex flex-column">
                  <ApplicationsTable
                    applications={sortedApplications}
                    isLoading={isLoading}
                    sortConfig={sortConfig}
                    onSort={handleSort}
                    onClearFilters={clearFilters}
                    hasActiveFilters={hasActiveFilters}
                    onSelectApplication={onSelectApplication}
                    onOpenOrModal={setSelectedOrApp}
                  />
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>

      {/* Footer */}
      <DashboardFooter />

      {/* Submit OR Modal */}
      <SubmitORModal
        show={!!selectedOrApp}
        application={selectedOrApp}
        onClose={() => setSelectedOrApp(null)}
        onSuccess={handleOrSuccess}
      />
    </div>
  );
}

export default ApplicantDashboard;