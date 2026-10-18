import React from "react";
import { Link } from "react-router-dom";

/**
 * Top control bar containing search input, clear button, and "+ New" application button.
 * New button should be encompassing an entire row.
 */
function ApplicationSearchBar({
  searchQuery,
  onSearchChange,
  onClearSearch,
  onNewApplication,
}) {
  return (
      <div className="d-flex gap-2 align-items-center">
        <div className="input-group">
          <label className="visually-hidden" htmlFor="application-search">
            Search applications
          </label>
          <input
            id="application-search"
            type="text"
            className="form-control"
            placeholder="Search applications..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
          />
          {searchQuery && (
            <button
              className="btn btn-outline-secondary border-start-0"
              type="button"
              onClick={onClearSearch}
              title="Clear search"
              aria-label="Clear search"
            >
              <i className="bi bi-x-lg"></i>
            </button>
          )}
        </div>
      </div>
  );
}

export default ApplicationSearchBar;
