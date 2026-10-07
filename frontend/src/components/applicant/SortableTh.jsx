import React from "react";

/**
 * Reusable sortable table header with full keyboard and screen-reader accessibility.
 */
function SortableTh({ column, sortConfig, onSort }) {
  const isSorted = sortConfig.key === column.key;
  const direction = isSorted ? sortConfig.direction : null;

  const handleKeyDown = (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onSort(column.key);
    }
  };

  return (
    <th
      scope="col"
      style={{ width: column.width, cursor: "pointer" }}
      className="user-select-none"
      onClick={() => onSort(column.key)}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="button"
      aria-sort={isSorted ? (direction === "asc" ? "ascending" : "descending") : "none"}
      title={`Click to sort by ${column.label}`}
    >
      <div className="d-flex align-items-center justify-content-between">
        <span>{column.label}</span>
        {isSorted ? (
          direction === "asc" ? (
            <i className="bi bi-arrow-up text-primary fw-bold ms-1" title="Ascending"></i>
          ) : (
            <i className="bi bi-arrow-down text-primary fw-bold ms-1" title="Descending"></i>
          )
        ) : (
          <i className="bi bi-arrow-down-up text-muted opacity-50 ms-1" title="Click to sort"></i>
        )}
      </div>
    </th>
  );
}

export default SortableTh;
