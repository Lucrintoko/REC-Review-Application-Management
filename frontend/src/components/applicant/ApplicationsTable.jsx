import React from "react";
import SortableTh from "./SortableTh";
import ApplicationRow from "./ApplicationRow";
import { APPLICATION_COLUMNS } from "../../constants/applicationTypes";

/**
 * Renders the responsive applications table with sorting, loading state, and empty state.
 */
function ApplicationsTable({
  columns = APPLICATION_COLUMNS,
  applications = [],
  isLoading = false,
  sortConfig,
  onSort,
  onClearFilters,
  hasActiveFilters = false,
  onSelectApplication,
  onOpenOrModal,
}) {
  return (
    <div
      className="table-responsive border rounded shadow-sm flex-grow-1"
      style={{ maxHeight: "55vh", overflowY: "auto" }}
    >
      <table className="table table-striped table-hover align-middle mb-0">
        <thead className="table-light sticky-top shadow-sm">
          <tr>
            {columns.map((col) => (
              <SortableTh
                key={col.key}
                column={col}
                sortConfig={sortConfig}
                onSort={onSort}
              />
            ))}
          </tr>
        </thead>
        <tbody>
          {isLoading ? (
            <tr>
              <td colSpan={columns.length} className="text-center py-4 text-muted">
                <div
                  className="spinner-border spinner-border-sm text-primary me-2"
                  role="status"
                ></div>
                <span>Loading applications...</span>
              </td>
            </tr>
          ) : applications.length > 0 ? (
            applications.map((app) => (
              <ApplicationRow
                key={app.application_id || app.protocol_code || app.id}
                application={app}
                onSelect={onSelectApplication}
                onOpenOrModal={onOpenOrModal}
              />
            ))
          ) : (
            <tr>
              <td colSpan={columns.length} className="text-center py-5 text-muted">
                <i className="bi bi-inbox fs-2 d-block mb-2 text-secondary opacity-50"></i>
                <p className="mb-2">No applications found.</p>
                {hasActiveFilters && (
                  <button
                    className="btn btn-sm btn-outline-secondary"
                    type="button"
                    onClick={onClearFilters}
                  >
                    <i className="bi bi-arrow-counterclockwise me-1"></i>Reset filters
                  </button>
                )}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export default ApplicationsTable;
