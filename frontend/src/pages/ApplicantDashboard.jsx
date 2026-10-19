import React, { useState } from "react";
import DashboardHeader from "../components/applicant/DashboardHeader";
import DashboardFooter from "../components/applicant/DashboardFooter";
import SidebarFilter from "../components/applicant/SidebarFilter";
import ApplicationSearchBar from "../components/applicant/ApplicationSearchBar";
import ActionRequiredTray from "../components/applicant/ActionRequiredTray";
import ApplicationsTable from "../components/applicant/ApplicationsTable";
import ApplicationNewButton from "../components/applicant/ApplicationNewButton";
import SubmitORModal from "../components/applicant/SubmitORModal";
import PaymentRejectionNoticeModal from "../components/applicant/PaymentRejectionNoticeModal";
import ProtocolRevisionNoticeModal from "../components/applicant/ProtocolRevisionNoticeModal";
import ReviseProtocolModal from "../components/applicant/ReviseProtocolModal";
import ApplicantDecisionLetterModal from "../components/applicant/ApplicantDecisionLetterModal";
import ProtocolAppealModal from "../components/applicant/ProtocolAppealModal";
import ErrorBoundary from "../components/ErrorBoundary";
import { useApplications } from "../hooks/useApplications";
import { useTableSortFilter } from "../hooks/useTableSortFilter";
import Swal from "sweetalert2";

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
  const applicantDepartment = localStorage.getItem('applicantDepartment') || "Ateneo de Zamboanga University";
  const applicantEmail = localStorage.getItem('applicantEmail') || "applicant@adzu.edu.ph";
  const [selectedOrApp, setSelectedOrApp] = useState(null);
  const [rejectionNoticeApp, setRejectionNoticeApp] = useState(null);
  const [revisionNoticeApp, setRevisionNoticeApp] = useState(null);
  const [reviseProtocolApp, setReviseProtocolApp] = useState(null);
  const [decisionLetterApp, setDecisionLetterApp] = useState(null);
  const [appealProtocolApp, setAppealProtocolApp] = useState(null);

  // 1. Fetch applications data via custom hook (handles API, abort controller, loading, error, and fallback data)
  const { applications, isLoading, refetch, deleteApplication } = useApplications();

  const handleDeleteDraft = async (application) => {
    const studyTitle = application.research_title || application.title || "Untitled Draft";

    const result = await Swal.fire({
      title: "Discard Draft Application?",
      html: `
        <div class="text-start">
          <p class="text-secondary small mb-2">You are about to permanently discard the unsubmitted draft:</p>
          <div class="p-2 px-3 bg-light border rounded mb-3 text-dark fw-semibold small font-monospace text-truncate">
            ${studyTitle}
          </div>
          <div class="alert alert-danger py-2 px-3 mb-0 d-flex align-items-center gap-2 small">
            <i class="bi bi-exclamation-triangle-fill flex-shrink-0 fs-5"></i>
            <div>
              <strong>Irreversible Action:</strong> All local entries, uploaded document references, and progress will be lost.
            </div>
          </div>
        </div>
      `,
      icon: "warning",
      iconColor: "#d97706",
      showCancelButton: true,
      confirmButtonText: '<i class="bi bi-trash3-fill me-1"></i> Yes, Discard Draft',
      cancelButtonText: "Keep Draft",
      confirmButtonColor: "#dc3545",
      cancelButtonColor: "#003366",
      reverseButtons: true,
      focusCancel: true,
      customClass: {
        popup: "rounded-4 shadow-lg border-0 p-3",
        confirmButton: "btn btn-danger px-4 py-2 rounded-pill fw-semibold shadow-sm",
        cancelButton: "btn btn-outline-secondary px-4 py-2 rounded-pill fw-medium me-2",
      },
      buttonsStyling: false,
    });

    if (!result.isConfirmed) {
      return;
    }

    try {
      await deleteApplication(application);

      await Swal.fire({
        toast: true,
        position: "top-end",
        icon: "success",
        title: "Draft discarded successfully",
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true,
        customClass: {
          popup: "rounded-3 shadow-sm",
        },
      });
    } catch (error) {
      await Swal.fire({
        icon: "error",
        title: "Discard Failed",
        text: error instanceof Error ? error.message : "The draft could not be discarded. Please try again.",
        confirmButtonColor: "#003366",
        confirmButtonText: "Close",
        customClass: {
          confirmButton: "btn btn-primary px-4 py-2 rounded-pill fw-medium",
        },
        buttonsStyling: false,
      });
    }
  };

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
      <DashboardHeader
        userName={applicantName}
        userDepartment={applicantDepartment}
        userEmail={applicantEmail}
      />

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
            {/* Urgent Action Center / Action Required Tray */}
            <ActionRequiredTray
              applications={applications}
              onDeleteDraft={handleDeleteDraft}
              onOpenOrModal={setSelectedOrApp}
              onOpenRejectionNotice={setRejectionNoticeApp}
              onOpenRevisionNotice={setRevisionNoticeApp}
              onOpenReviseModal={setReviseProtocolApp}
              onOpenDecisionLetter={setDecisionLetterApp}
              onOpenFileAppeal={setAppealProtocolApp}
            />

            {/* Applications Table Card */}
            <div className="card shadow-sm flex-grow-1">
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
                    onOpenRejectionNotice={setRejectionNoticeApp}
                    onOpenRevisionNotice={setRevisionNoticeApp}
                    onOpenReviseModal={setReviseProtocolApp}
                    onOpenDecisionLetter={setDecisionLetterApp}
                    onOpenFileAppeal={setAppealProtocolApp}
                    onDeleteDraft={handleDeleteDraft}
                  />
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>

      {/* Footer */}
      <DashboardFooter />

      {/* Modal Subsystem Wrapped in ErrorBoundary */}
      <ErrorBoundary>
        {/* Submit OR Modal */}
        <SubmitORModal
          show={!!selectedOrApp}
          application={selectedOrApp}
          onClose={() => setSelectedOrApp(null)}
          onSuccess={handleOrSuccess}
        />

        {/* Payment Rejection Feedback Notice Modal */}
        <PaymentRejectionNoticeModal
          show={!!rejectionNoticeApp}
          application={rejectionNoticeApp}
          onClose={() => setRejectionNoticeApp(null)}
          onProceedToResubmit={(app) => {
            setRejectionNoticeApp(null);
            setSelectedOrApp(app);
          }}
        />

        {/* Protocol Revision Directives Notice Modal */}
        <ProtocolRevisionNoticeModal
          show={!!revisionNoticeApp}
          application={revisionNoticeApp}
          onClose={() => setRevisionNoticeApp(null)}
          onProceedToRevise={(app) => {
            setRevisionNoticeApp(null);
            setReviseProtocolApp(app);
          }}
        />

        {/* Revise Protocol Modal */}
        <ReviseProtocolModal
          show={!!reviseProtocolApp}
          application={reviseProtocolApp}
          onClose={() => setReviseProtocolApp(null)}
          onSuccess={() => {
            setReviseProtocolApp(null);
            refetch();
          }}
        />

        {/* Stage 5: Applicant Decision Letter & Directives Notice Modal */}
        <ApplicantDecisionLetterModal
          show={!!decisionLetterApp}
          application={decisionLetterApp}
          onClose={() => setDecisionLetterApp(null)}
          onProceedToRevise={(app) => {
            setDecisionLetterApp(null);
            setReviseProtocolApp(app);
          }}
          onProceedToAppeal={(app) => {
            setDecisionLetterApp(null);
            setAppealProtocolApp(app);
          }}
        />

        {/* Stage 5: Formal Reconsideration & Protocol Appeal Modal (Approach A) */}
        <ProtocolAppealModal
          show={!!appealProtocolApp}
          application={appealProtocolApp}
          onClose={() => setAppealProtocolApp(null)}
          onSuccess={() => {
            setAppealProtocolApp(null);
            refetch();
          }}
        />
      </ErrorBoundary>
    </div>
  );
}

export default ApplicantDashboard;