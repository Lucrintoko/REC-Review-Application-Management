import React, { useState, useEffect, useMemo } from "react";
import adzuSeal from "../assets/AdZU Seal.png";
import { apiClient } from "../services/api";

// Supported application types / statuses for sidebar filtering
const APPLICATION_TYPES = [
  {
    id: "Drafts",
    label: "Drafts",
    aliases: ["Draft", "Drafts"],
  },
  {
    id: "Ongoing Verification",
    label: "Ongoing Verification",
    aliases: ["Ongoing Verification", "Payment Pending", "Payment Verified", "Submitted"],
  },
  {
    id: "Under Review",
    label: "Under Review",
    aliases: ["Under Review"],
  },
  {
    id: "Needs Revisions",
    label: "Needs Revisions",
    aliases: ["Needs Revisions", "Revisions Required", "Revisions Submitted"],
  },
  {
    id: "Needs Progress Report",
    label: "Needs Progress Report",
    aliases: ["Needs Progress Report"],
  },
  {
    id: "Awaiting Approval",
    label: "Awaiting Approval",
    aliases: ["Awaiting Approval"],
  },
  {
    id: "Certification Finished",
    label: "Certification Finished",
    aliases: ["Certification Finished", "Clearance Granted"],
  },
];

// Fallback seed data in case database/backend is offline or empty during development
const FALLBACK_APPLICATIONS = [
  {
    application_id: 1,
    protocol_code: "REC-2026-001",
    applicant_id: 1,
    research_title: "Ethical Implications of AI-Assisted Clinical Diagnostics in Zamboanga City Health Centers",
    research_type: "Undergraduate",
    review_type: "Expedited",
    status: "Under Review",
    submission_date: "2026-09-15",
  },
  {
    application_id: 2,
    protocol_code: "REC-2026-002",
    applicant_id: 1,
    research_title: "Prevalence of Digital Burnout Among Healthcare Workers in Western Mindanao",
    research_type: "Faculty",
    review_type: "Exempted",
    status: "Clearance Granted",
    submission_date: "2026-09-10",
  },
  {
    application_id: 3,
    protocol_code: "REC-2026-003",
    applicant_id: 1,
    research_title: "Biocultural Diversity and Indigenous Health Practices in Rural Communities",
    research_type: "Graduate",
    review_type: "Full Board",
    status: "Draft",
    submission_date: "2026-09-22",
  },
  {
    application_id: 4,
    protocol_code: "REC-2026-004",
    applicant_id: 1,
    research_title: "Psychological Resilience in Post-Pandemic Blended Learning Environments",
    research_type: "Undergraduate",
    review_type: "Expedited",
    status: "Ongoing Verification",
    submission_date: "2026-09-18",
  },
  {
    application_id: 5,
    protocol_code: "REC-2026-005",
    applicant_id: 1,
    research_title: "Assessing Telehealth Privacy Protocols in Regional Public Hospitals",
    research_type: "Externally Funded",
    review_type: "Full Board",
    status: "Needs Revisions",
    submission_date: "2026-09-05",
  },
  {
    application_id: 6,
    protocol_code: "REC-2026-006",
    applicant_id: 1,
    research_title: "Longitudinal Study on Community Water Fluoridation and Dental Health",
    research_type: "Faculty",
    review_type: "Expedited",
    status: "Needs Progress Report",
    submission_date: "2026-08-28",
  },
  {
    application_id: 7,
    protocol_code: "REC-2026-007",
    applicant_id: 1,
    research_title: "Pediatric Nutritional Interventions in Urban Coastal Barangays",
    research_type: "Graduate",
    review_type: "Expedited",
    status: "Awaiting Approval",
    submission_date: "2026-09-24",
  },
  {
    application_id: 8,
    protocol_code: "REC-2026-008",
    applicant_id: 1,
    research_title: "Epidemiological Surveillance of Vector-Borne Diseases Using Mobile GIS",
    research_type: "Faculty",
    review_type: "Full Board",
    status: "Certification Finished",
    submission_date: "2026-08-12",
  },
];

function ApplicantDashboard() {
  const applicantName = "Juan Dela Cruz"; // Dynamic applicant data

  // State to store the complete list of applications pulled once from the API
  const [applications, setApplications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Client-side filtering states
  const [selectedType, setSelectedType] = useState("ALL");
  const [searchInput, setSearchInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  // Table sorting state (defaults to newest submission date first)
  const [sortConfig, setSortConfig] = useState({
    key: "submission_date",
    direction: "desc",
  });

  // 1. Pull the applicant's complete list of applications ONCE from the database via API call
  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);

    apiClient
      .get("/applications")
      .then((response) => {
        if (!isMounted) return;
        if (response && response.status === "success" && Array.isArray(response.data)) {
          setApplications(response.data);
        } else if (Array.isArray(response)) {
          setApplications(response);
        } else {
          // Fallback to sample applications if backend table is empty
          setApplications(FALLBACK_APPLICATIONS);
        }
      })
      .catch((error) => {
        console.warn("API request failed or backend offline. Using fallback applications:", error);
        if (isMounted) {
          setApplications(FALLBACK_APPLICATIONS);
        }
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Helper function to check if an application matches a given type filter
  const matchesTypeFilter = (app, typeKey) => {
    if (!typeKey || typeKey === "ALL") return true;

    const typeConfig = APPLICATION_TYPES.find((t) => t.id === typeKey);
    const status = (app.status || "").trim().toLowerCase();
    const type = (app.application_type || app.research_type || "").trim().toLowerCase();
    const key = typeKey.trim().toLowerCase();

    // Check direct status or type matching
    if (status === key || type === key) return true;

    // Check alias list from configuration
    if (typeConfig) {
      if (typeConfig.aliases.some((alias) => alias.toLowerCase() === status)) return true;
      if (typeConfig.aliases.some((alias) => alias.toLowerCase() === type)) return true;
    }

    return false;
  };

  // Helper to compute badge count for each application type from the master list
  const getTypeCount = (typeConfig) => {
    return applications.filter((app) => matchesTypeFilter(app, typeConfig.id)).length;
  };

  // 2. Client-side Filtering in memory based on selectedType and searchTerm
  const filteredApplications = useMemo(() => {
    return applications.filter((app) => {
      // Filter by application type
      const matchesType = matchesTypeFilter(app, selectedType);

      // Filter by search query across title, protocol code, status, and date
      const matchesSearch = (() => {
        if (!searchTerm.trim()) return true;
        const query = searchTerm.toLowerCase().trim();
        const title = (app.research_title || app.title || "").toLowerCase();
        const protocol = (app.protocol_code || app.protocol_no || "").toLowerCase();
        const status = (app.status || "").toLowerCase();
        const date = (app.submission_date || app.date_submitted || "").toLowerCase();

        return (
          title.includes(query) ||
          protocol.includes(query) ||
          status.includes(query) ||
          date.includes(query)
        );
      })();

      return matchesType && matchesSearch;
    });
  }, [applications, selectedType, searchTerm]);

  // 3. Client-side Sorting in memory based on sortConfig
  const sortedApplications = useMemo(() => {
    if (!sortConfig.key) return filteredApplications;

    return [...filteredApplications].sort((a, b) => {
      let aVal = "";
      let bVal = "";

      switch (sortConfig.key) {
        case "research_title":
          aVal = (a.research_title || a.title || "").toLowerCase();
          bVal = (b.research_title || b.title || "").toLowerCase();
          return sortConfig.direction === "asc"
            ? aVal.localeCompare(bVal)
            : bVal.localeCompare(aVal);

        case "protocol_code":
          aVal = a.protocol_code || a.protocol_no || "";
          bVal = b.protocol_code || b.protocol_no || "";
          return sortConfig.direction === "asc"
            ? aVal.localeCompare(bVal, undefined, { numeric: true, sensitivity: "base" })
            : bVal.localeCompare(aVal, undefined, { numeric: true, sensitivity: "base" });

        case "submission_date": {
          const aDate = a.submission_date || a.date_submitted || "";
          const bDate = b.submission_date || b.date_submitted || "";
          const aTime = aDate ? new Date(aDate).getTime() : 0;
          const bTime = bDate ? new Date(bDate).getTime() : 0;
          return sortConfig.direction === "asc" ? aTime - bTime : bTime - aTime;
        }

        case "status":
          aVal = (a.status || "").toLowerCase();
          bVal = (b.status || "").toLowerCase();
          return sortConfig.direction === "asc"
            ? aVal.localeCompare(bVal)
            : bVal.localeCompare(aVal);

        default:
          return 0;
      }
    });
  }, [filteredApplications, sortConfig]);

  // Handle column header clicks to toggle sort order
  const handleSort = (columnKey) => {
    setSortConfig((prev) => {
      if (prev.key === columnKey) {
        return {
          key: columnKey,
          direction: prev.direction === "asc" ? "desc" : "asc",
        };
      }
      return {
        key: columnKey,
        direction: columnKey === "submission_date" ? "desc" : "asc",
      };
    });
  };

  // Helper to render sorting indicator icons
  const getSortIcon = (columnKey) => {
    if (sortConfig.key === columnKey) {
      return sortConfig.direction === "asc" ? (
        <i className="bi bi-arrow-up text-primary fw-bold ms-1" title="Ascending"></i>
      ) : (
        <i className="bi bi-arrow-down text-primary fw-bold ms-1" title="Descending"></i>
      );
    }
    return <i className="bi bi-arrow-down-up text-muted opacity-50 ms-1" title="Click to sort"></i>;
  };

  // Handle clicking the search button or pressing enter
  const handleSearchSubmit = () => {
    setSearchTerm(searchInput);
  };

  const handleSearchKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSearchSubmit();
    }
  };

  const handleClearFilters = () => {
    setSelectedType("ALL");
    setSearchInput("");
    setSearchTerm("");
    setSortConfig({ key: "submission_date", direction: "desc" });
  };

  // Status badge styling helper
  const getStatusBadgeClass = (status) => {
    const norm = (status || "").toLowerCase();
    if (norm.includes("clearance") || norm.includes("finished") || norm.includes("approved")) {
      return "badge bg-success";
    }
    if (norm.includes("under review")) {
      return "badge bg-warning text-dark";
    }
    if (norm.includes("verification") || norm.includes("payment") || norm.includes("submitted")) {
      return "badge bg-info text-dark";
    }
    if (norm.includes("revision") || norm.includes("rejected")) {
      return "badge bg-danger";
    }
    if (norm.includes("progress") || norm.includes("awaiting")) {
      return "badge bg-primary";
    }
    if (norm.includes("draft")) {
      return "badge bg-secondary";
    }
    return "badge bg-secondary";
  };

  // Date formatter
  const formatDate = (dateString) => {
    if (!dateString) return "—";
    try {
      const d = new Date(dateString);
      if (isNaN(d.getTime())) return dateString;
      return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
    } catch {
      return dateString;
    }
  };

  return (
    <div className="min-vh-100 d-flex flex-column">
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
              <h4 className="mb-0 fw-bold">Welcome, {applicantName}</h4>
              <small className="text-light opacity-50 d-none d-md-block">AdZU Research Ethics Committee</small>
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

      <main className="container my-3 flex-grow-1">
        {/* Left Column */}
        <div className="row">
          <div className="col-md-3">
            <div className="card mb-3 shadow-sm">
              <div className="card-body d-flex flex-column gap-3">
                <div className="d-grid gap-2">
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    {/* Header and Select All button */}
                    <h5 className="card-title mb-0">Application Types</h5>
                    <button
                      className={`btn btn-sm ${
                        selectedType === "ALL" ? "btn-primary" : "btn-outline-primary"
                      }`}
                      type="button"
                      onClick={() => setSelectedType("ALL")}
                      title="Show all applications"
                    >
                      <small className="fst-italic">Select All</small>
                    </button>
                  </div>

                  {/* Dynamic Category Filter Buttons */}
                  {APPLICATION_TYPES.map((type) => {
                    const isSelected = selectedType === type.id;
                    const count = getTypeCount(type);

                    return (
                      <button
                        key={type.id}
                        className={`btn text-start ${
                          isSelected ? "btn-primary text-white shadow-sm" : "btn-outline-primary"
                        }`}
                        type="button"
                        onClick={() => setSelectedType(isSelected ? "ALL" : type.id)}
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
                <hr />
                <button className="btn btn-outline-secondary" type="button">
                <i className="bi bi-house-door-fill me-2"></i>Back to Home
                </button>
              </div>
            </div>
          </div>

          {/* Right Column for displaying the list of applications and making new ones */}
          <div className="col-md-9">
            <div className="card mb-3 shadow-sm">
              <div className="card-body">
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
                          • Sorted by {
                            sortConfig.key === "research_title" ? "Title" :
                            sortConfig.key === "protocol_code" ? "Protocol No." :
                            sortConfig.key === "submission_date" ? "Date" : "Status"
                          } ({sortConfig.direction === "asc" ? "ascending" : "descending"})
                        </span>
                      )}
                    </small>
                  </div>

                  {/* Search bar and new application button */}
                  <div className="d-flex gap-2 align-items-center">
                    <div className="input-group">
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Search applications..."
                        value={searchInput}
                        onChange={(e) => {
                          setSearchInput(e.target.value);
                          setSearchTerm(e.target.value); // live filter in memory
                        }}
                        onKeyDown={handleSearchKeyDown}
                      />
                      {searchInput && (
                        <button
                          className="btn btn-outline-secondary border-start-0"
                          type="button"
                          onClick={() => {
                            setSearchInput("");
                            setSearchTerm("");
                          }}
                          title="Clear search"
                        >
                          <i className="bi bi-x-lg"></i>
                        </button>
                      )}
                    </div>
                    <button className="btn btn-primary d-flex align-items-center text-nowrap" type="button">
                      <i className="bi bi-plus-circle me-2"></i>New
                    </button>
                  </div>
                </div>

                {/* Applications Table */}
                <div className="table-responsive border rounded shadow-sm" style={{ maxHeight: "60vh", overflowY: "auto" }}>
                  <table className="table table-striped table-hover align-middle mb-0">
                    <thead className="table-light sticky-top shadow-sm">
                      <tr>
                        <th
                          scope="col"
                          style={{ width: "45%", cursor: "pointer" }}
                          className="user-select-none"
                          onClick={() => handleSort("research_title")}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              handleSort("research_title");
                            }
                          }}
                          tabIndex={0}
                          role="button"
                          aria-sort={
                            sortConfig.key === "research_title"
                              ? sortConfig.direction === "asc"
                                ? "ascending"
                                : "descending"
                              : "none"
                          }
                          title="Click to sort by Application Title"
                        >
                          <div className="d-flex align-items-center justify-content-between">
                            <span>Application Title</span>
                            {getSortIcon("research_title")}
                          </div>
                        </th>
                        <th
                          scope="col"
                          style={{ width: "20%", cursor: "pointer" }}
                          className="user-select-none"
                          onClick={() => handleSort("protocol_code")}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              handleSort("protocol_code");
                            }
                          }}
                          tabIndex={0}
                          role="button"
                          aria-sort={
                            sortConfig.key === "protocol_code"
                              ? sortConfig.direction === "asc"
                                ? "ascending"
                                : "descending"
                              : "none"
                          }
                          title="Click to sort by Protocol No."
                        >
                          <div className="d-flex align-items-center justify-content-between">
                            <span>Protocol No.</span>
                            {getSortIcon("protocol_code")}
                          </div>
                        </th>
                        <th
                          scope="col"
                          style={{ width: "18%", cursor: "pointer" }}
                          className="user-select-none"
                          onClick={() => handleSort("submission_date")}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              handleSort("submission_date");
                            }
                          }}
                          tabIndex={0}
                          role="button"
                          aria-sort={
                            sortConfig.key === "submission_date"
                              ? sortConfig.direction === "asc"
                                ? "ascending"
                                : "descending"
                              : "none"
                          }
                          title="Click to sort by Date Submitted"
                        >
                          <div className="d-flex align-items-center justify-content-between">
                            <span>Date Submitted</span>
                            {getSortIcon("submission_date")}
                          </div>
                        </th>
                        <th
                          scope="col"
                          style={{ width: "17%", cursor: "pointer" }}
                          className="user-select-none"
                          onClick={() => handleSort("status")}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              handleSort("status");
                            }
                          }}
                          tabIndex={0}
                          role="button"
                          aria-sort={
                            sortConfig.key === "status"
                              ? sortConfig.direction === "asc"
                                ? "ascending"
                                : "descending"
                              : "none"
                          }
                          title="Click to sort by Status"
                        >
                          <div className="d-flex align-items-center justify-content-between">
                            <span>Status</span>
                            {getSortIcon("status")}
                          </div>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {isLoading ? (
                        <tr>
                          <td colSpan="4" className="text-center py-4 text-muted">
                            <div className="spinner-border spinner-border-sm text-primary me-2" role="status"></div>
                            <span>Loading applications...</span>
                          </td>
                        </tr>
                      ) : sortedApplications.length > 0 ? (
                        sortedApplications.map((app) => (
                          <tr key={app.application_id || app.protocol_code}>
                            <td>
                              <div className="fw-semibold">{app.research_title || app.title}</div>
                              {app.research_type && (
                                <small className="text-muted">
                                  {app.research_type} {app.review_type ? `• ${app.review_type}` : ""}
                                </small>
                              )}
                            </td>
                            <td>
                              <span className="badge bg-light text-dark border font-monospace">
                                {app.protocol_code || app.protocol_no || "N/A"}
                              </span>
                            </td>
                            <td>{formatDate(app.submission_date || app.date_submitted)}</td>
                            <td>
                              <span className={getStatusBadgeClass(app.status)}>
                                {app.status}
                              </span>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="4" className="text-center py-5 text-muted">
                            <i className="bi bi-inbox fs-2 d-block mb-2 text-secondary opacity-50"></i>
                            <p className="mb-2">No applications found.</p>
                            {(selectedType !== "ALL" || searchTerm.trim()) && (
                              <button
                                className="btn btn-sm btn-outline-secondary"
                                type="button"
                                onClick={handleClearFilters}
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
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="bg-light border-top py-4">
        <div className="container">
          <p className="mb-0 text-center text-muted">
            &copy; 2026 Ateneo de Zamboanga University. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}

export default ApplicantDashboard;