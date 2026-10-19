import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

const DRAFT_STORAGE_KEY = "adzu_rec_application_draft_v1";

const PRIORITY_ORDER = {
  STAGE5_REVISION: 1,
  STAGE3_REVISION: 2,
  PAYMENT_REJECTED: 3,
  DISAPPROVED_APPEAL: 4,
  DRAFT: 5,
  PAYMENT_PENDING: 6,
};

/**
 * ActionRequiredTray
 * Responsive action center tray that surfaces urgent, actionable protocol items
 * requiring immediate proponent review, revision, payment, or submission.
 *
 * Adheres to 8-point spatial rhythm, 44px minimum tap targets, semantic
 * status left-accent borders, and progressive disclosure.
 * Returns null when zero items require attention.
 */
function ActionRequiredTray({
  applications = [],
  onDeleteDraft,
  onOpenOrModal,
  onOpenRejectionNotice,
  onOpenRevisionNotice,
  onOpenReviseModal,
  onOpenDecisionLetter,
  onOpenFileAppeal,
}) {
  const navigate = useNavigate();
  const [isExpanded, setIsExpanded] = useState(false);

  // Evaluate applications and filter for items requiring proponent intervention
  const actionableItems = useMemo(() => {
    if (!Array.isArray(applications) || applications.length === 0) {
      return [];
    }

    const items = [];

    for (const app of applications) {
      const statusStr = (app.status || "").trim().toLowerCase();
      const paymentStatus = (app.payment_status || "").trim().toLowerCase();
      const isDraft = app.application_id === "local-draft" || statusStr === "draft";
      const isClearanceGranted =
        statusStr === "clearance granted" || statusStr === "certification finished";
      const isRevisionsSubmitted = statusStr === "revisions submitted";

      const hasDecisionLetter = Boolean(
        statusStr === "decision letter issued" ||
        app.has_consolidated_decision === true ||
        app.has_consolidated_decision === "true" ||
        app.has_consolidated_decision === 1
      );

      const recommendation =
        app.latest_consolidation?.consolidated_recommendation ||
        app.consolidated_recommendation ||
        app.recommendation ||
        "";
      const isRevisionsRequired = recommendation.toLowerCase().includes("revision");
      const isDisapproved =
        (recommendation.toLowerCase().includes("disapproved") || statusStr === "rejected") &&
        !isClearanceGranted;

      const isAppealed = Boolean(
        app.is_appealed === true ||
        app.is_appealed === 1 ||
        app.is_appealed === "true" ||
        app.is_appealed === "1" ||
        (app.current_cycle && app.current_cycle > 1)
      );

      const hasActiveRevision = Boolean(
        app.has_active_revision === true ||
        app.has_active_revision === 1 ||
        app.has_active_revision === "true" ||
        app.has_active_revision === "1" ||
        (statusStr === "type of review" && Boolean(app.revision_notes))
      );

      const rawTitle = app.research_title || app.title || "";
      const isUntitled = !rawTitle.trim() || rawTitle.trim().toLowerCase() === "untitled draft";
      const title = isUntitled ? "Untitled Draft Protocol" : rawTitle;
      const protocolCode = app.protocol_code || app.protocol_no || "Draft";
      const key = app.application_id || app.protocol_code || `${statusStr}-${title}`;

      // ------------------------------------------------------------------
      // Type A: Unsubmitted Local Draft
      // ------------------------------------------------------------------
      if (isDraft) {
        items.push({
          key,
          application: app,
          type: "DRAFT",
          protocolCode: protocolCode === "Draft" ? "Local Draft" : protocolCode,
          title,
          badgeLabel: "Unsubmitted Draft",
          badgeClass: "bg-secondary-subtle text-secondary border-secondary-subtle",
          borderClass: "border-start border-4 border-secondary",
          icon: "bi-file-earmark-text",
          description: "Draft protocol not yet submitted for ethics pre-assessment.",
          primaryAction: {
            label: "Continue Editing",
            icon: "bi-pencil-square",
            variant: "btn-primary",
            onClick: () => {
              if (app.form_data) {
                try {
                  localStorage.setItem(
                    DRAFT_STORAGE_KEY,
                    JSON.stringify({
                      data: app.form_data,
                      savedAt: app.updated_at || app.submission_date || new Date().toISOString(),
                    })
                  );
                } catch (err) {
                  console.error("Error serializing draft to localStorage:", err);
                }
              }
              navigate("/applicant/form");
            },
            ariaLabel: `Continue editing draft protocol ${title}`,
          },
          secondaryAction: onDeleteDraft
            ? {
                label: "Discard",
                icon: "bi-trash3",
                variant: "btn-outline-danger",
                onClick: () => onDeleteDraft(app),
                ariaLabel: `Discard draft protocol ${title}`,
              }
            : null,
        });
        continue;
      }

      // ------------------------------------------------------------------
      // Type D1: Payment Rejected (Secretariat returned Official Receipt)
      // ------------------------------------------------------------------
      if (paymentStatus === "rejected") {
        items.push({
          key,
          application: app,
          type: "PAYMENT_REJECTED",
          protocolCode,
          title,
          badgeLabel: "Official Receipt Rejected",
          badgeClass: "bg-danger-subtle text-danger border-danger-subtle",
          borderClass: "border-start border-4 border-danger",
          icon: "bi-x-octagon-fill text-danger",
          description: "Payment verification returned. Secretariat feedback requires a corrected receipt submission.",
          primaryAction: {
            label: "Resubmit OR",
            icon: "bi-arrow-repeat",
            variant: "btn-danger text-white",
            onClick: () => {
              if (onOpenOrModal) {
                onOpenOrModal(app);
              } else if (onOpenRejectionNotice) {
                onOpenRejectionNotice(app);
              }
            },
            ariaLabel: `Resubmit Official Receipt for protocol ${protocolCode}`,
          },
          secondaryAction: onOpenRejectionNotice
            ? {
                label: "Feedback",
                icon: "bi-info-circle",
                variant: "btn-outline-danger",
                onClick: () => onOpenRejectionNotice(app),
                ariaLabel: `View rejection feedback for protocol ${protocolCode}`,
              }
            : null,
        });
        continue;
      }

      // ------------------------------------------------------------------
      // Type D2: Payment Required (Awaiting Proponent OR submission)
      // ------------------------------------------------------------------
      if (statusStr === "payment pending" && paymentStatus !== "approved" && paymentStatus !== "verified") {
        items.push({
          key,
          application: app,
          type: "PAYMENT_PENDING",
          protocolCode,
          title,
          badgeLabel: "Payment Required",
          badgeClass: "bg-danger-subtle text-danger border-danger-subtle",
          borderClass: "border-start border-4 border-danger",
          icon: "bi-receipt text-danger",
          description: "Official Receipt details and payment proof required before ethics pre-assessment proceeds.",
          primaryAction: {
            label: "Submit OR",
            icon: "bi-receipt",
            variant: "btn-primary",
            onClick: () => onOpenOrModal && onOpenOrModal(app),
            ariaLabel: `Submit Official Receipt for protocol ${protocolCode}`,
          },
        });
        continue;
      }

      // ------------------------------------------------------------------
      // Type B: Stage 5 Post-Decision Directives (Minor / Major Revisions)
      // ------------------------------------------------------------------
      if (!isClearanceGranted && !isRevisionsSubmitted && hasDecisionLetter && isRevisionsRequired) {
        items.push({
          key,
          application: app,
          type: "STAGE5_REVISION",
          protocolCode,
          title,
          badgeLabel: "Revisions Mandated by Board",
          badgeClass: "bg-warning-subtle text-warning-emphasis border-warning-subtle",
          borderClass: "border-start border-4 border-warning",
          icon: "bi-exclamation-diamond-fill text-warning",
          description: `Deliberation outcome: ${recommendation || "Mandated Revisions"}. Revised protocol documents must be submitted.`,
          primaryAction: {
            label: "Submit Revised Protocol",
            icon: "bi-arrow-up-circle-fill",
            variant: "btn-warning text-dark fw-semibold",
            onClick: () => {
              if (onOpenReviseModal) {
                onOpenReviseModal(app);
              } else if (onOpenDecisionLetter) {
                onOpenDecisionLetter(app);
              }
            },
            ariaLabel: `Submit revised protocol for ${protocolCode}`,
          },
          secondaryAction: onOpenDecisionLetter
            ? {
                label: "Decision Notice",
                icon: "bi-file-earmark-text",
                variant: "btn-outline-primary",
                onClick: () => onOpenDecisionLetter(app),
                ariaLabel: `View official decision notice for ${protocolCode}`,
              }
            : null,
        });
        continue;
      }

      // ------------------------------------------------------------------
      // Type E: Disapproved with 90-Day Appeal Window
      // ------------------------------------------------------------------
      if (!isClearanceGranted && isDisapproved && !isAppealed) {
        items.push({
          key,
          application: app,
          type: "DISAPPROVED_APPEAL",
          protocolCode,
          title,
          badgeLabel: "Appeal Eligible (90 Days)",
          badgeClass: "bg-danger-subtle text-danger border-danger-subtle",
          borderClass: "border-start border-4 border-danger",
          icon: "bi-shield-exclamation text-danger",
          description: "Application was disapproved. Proponent may file a formal reconsideration within 90 calendar days.",
          primaryAction: {
            label: "File Protocol Appeal",
            icon: "bi-arrow-repeat",
            variant: "btn-outline-danger fw-semibold",
            onClick: () => {
              if (onOpenFileAppeal) {
                onOpenFileAppeal(app);
              } else if (onOpenDecisionLetter) {
                onOpenDecisionLetter(app);
              }
            },
            ariaLabel: `File formal appeal for disapproved protocol ${protocolCode}`,
          },
          secondaryAction: onOpenDecisionLetter
            ? {
                label: "Decision Notice",
                icon: "bi-file-earmark-text",
                variant: "btn-outline-secondary",
                onClick: () => onOpenDecisionLetter(app),
                ariaLabel: `View decision letter for ${protocolCode}`,
              }
            : null,
        });
        continue;
      }

      // ------------------------------------------------------------------
      // Type C: Stage 3 Pre-Assessment Revision Directives
      // ------------------------------------------------------------------
      if (!hasDecisionLetter && hasActiveRevision) {
        items.push({
          key,
          application: app,
          type: "STAGE3_REVISION",
          protocolCode,
          title,
          badgeLabel: "Preliminary Directives",
          badgeClass: "bg-warning-subtle text-warning-emphasis border-warning-subtle",
          borderClass: "border-start border-4 border-warning",
          icon: "bi-pencil-square text-warning",
          description: "Pre-assessment directives issued by Ethics Review Committee. Document modifications required.",
          primaryAction: {
            label: "View Directives & Revise",
            icon: "bi-pencil-square",
            variant: "btn-warning text-dark fw-semibold",
            onClick: () => {
              if (onOpenReviseModal) {
                onOpenReviseModal(app);
              } else if (onOpenRevisionNotice) {
                onOpenRevisionNotice(app);
              }
            },
            ariaLabel: `View directives and revise protocol ${protocolCode}`,
          },
          secondaryAction: onOpenRevisionNotice
            ? {
                label: "Directives",
                icon: "bi-card-list",
                variant: "btn-outline-secondary",
                onClick: () => onOpenRevisionNotice(app),
                ariaLabel: `View preliminary directives for ${protocolCode}`,
              }
            : null,
        });
        continue;
      }
    }

    // Sort by actionable priority
    items.sort((a, b) => (PRIORITY_ORDER[a.type] || 99) - (PRIORITY_ORDER[b.type] || 99));

    return items;
  }, [
    applications,
    navigate,
    onDeleteDraft,
    onOpenOrModal,
    onOpenRejectionNotice,
    onOpenRevisionNotice,
    onOpenReviseModal,
    onOpenDecisionLetter,
    onOpenFileAppeal,
  ]);

  // Zero-State Footprint: Render nothing if no actions are pending
  if (actionableItems.length === 0) {
    return null;
  }

  // Display top 3 items if not expanded, or all items if expanded or total <= 3
  const visibleItems = isExpanded || actionableItems.length <= 3
    ? actionableItems
    : actionableItems.slice(0, 3);

  return (
    <section
      className="card border-0 shadow-sm rounded-4 mb-4"
      style={{
        backgroundColor: "#f8fafd",
        border: "1px solid rgba(0, 51, 102, 0.12)",
      }}
      aria-label="Pending proponent actions"
      aria-labelledby="action-center-heading"
    >
      <div className="card-body p-3 p-md-4">
        {/* Tray Header */}
        <div className="d-flex align-items-center justify-content-between mb-3 flex-wrap gap-2">
          <div className="d-flex align-items-center gap-2">
            <div
              className="d-inline-flex align-items-center justify-content-center bg-warning-subtle text-warning-emphasis rounded-circle shadow-xs"
              style={{ width: "38px", height: "38px", minWidth: "38px" }}
            >
              <i className="bi bi-exclamation-octagon-fill fs-5" aria-hidden="true"></i>
            </div>
            <div>
              <h2 id="action-center-heading" className="h5 fw-bold mb-0 text-dark">
                Action Center / Attention Required
              </h2>
              <p className="text-secondary small mb-0">
                Applications requiring immediate proponent submission, revision, or payment
              </p>
            </div>
          </div>

          <div className="d-flex align-items-center gap-2 flex-wrap">
            {actionableItems.length > 3 && (
              <button
                type="button"
                className="btn btn-sm btn-outline-primary rounded-pill px-3 py-1 fw-medium"
                onClick={() => setIsExpanded((prev) => !prev)}
                aria-expanded={isExpanded}
              >
                <span>{isExpanded ? "Show fewer (3)" : `View all ${actionableItems.length} actions`}</span>
                <i className={`bi bi-chevron-${isExpanded ? "up" : "down"} ms-1`}></i>
              </button>
            )}

            <span className="badge bg-warning-subtle text-warning-emphasis border border-warning-subtle px-3 py-2 rounded-pill fw-semibold d-inline-flex align-items-center gap-1 shadow-xs">
              <i className="bi bi-bell-fill" aria-hidden="true"></i>
              <span>
                {actionableItems.length} Pending Action{actionableItems.length > 1 ? "s" : ""}
              </span>
            </span>
          </div>
        </div>

        {/* Responsive Grid: col-12 mobile, col-lg-6 inside col-md-9 on standard desktop, col-xxl-4 on ultra-wide */}
        <div className="row g-3">
          {visibleItems.map((item) => (
            <div className="col-12 col-lg-6 col-xxl-4" key={item.key}>
              <div
                className={`card h-100 shadow-sm ${item.borderClass} bg-white rounded-3 d-flex flex-column`}
              >
                <div className="card-body p-3 d-flex flex-column">
                  {/* Meta Row: Badge & Protocol Code */}
                  <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-2">
                    <span
                      className={`badge ${item.badgeClass} border px-2 py-1 rounded-pill small fw-semibold`}
                    >
                      <i className={`bi ${item.icon} me-1`} aria-hidden="true"></i>
                      {item.badgeLabel}
                    </span>
                    <span
                      className="badge bg-light text-secondary border font-monospace small flex-shrink-0"
                      title={item.protocolCode}
                    >
                      {item.protocolCode}
                    </span>
                  </div>

                  {/* Protocol Title (Two-line Clamp for visual alignment) */}
                  <h3
                    className="card-title h6 fw-bold text-dark mb-2"
                    style={{
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                      minHeight: "2.6em",
                      lineHeight: "1.3",
                    }}
                    title={item.title}
                  >
                    {item.title}
                  </h3>

                  {/* Contextual Description */}
                  <p className="card-text text-secondary small mb-3 flex-grow-1">
                    {item.description}
                  </p>

                  {/* Action Buttons Row: Wrapped flex to prevent edge clipping on narrow widths */}
                  <div className="d-flex align-items-center flex-wrap gap-2 mt-auto pt-2 border-top">
                    {item.primaryAction && (
                      <button
                        type="button"
                        className={`btn btn-sm ${item.primaryAction.variant} flex-grow-1 d-inline-flex align-items-center justify-content-center gap-2 rounded-pill shadow-xs px-3`}
                        style={{ minHeight: "44px" }}
                        onClick={item.primaryAction.onClick}
                        aria-label={item.primaryAction.ariaLabel}
                      >
                        <i className={`bi ${item.primaryAction.icon}`} aria-hidden="true"></i>
                        <span>{item.primaryAction.label}</span>
                      </button>
                    )}

                    {item.secondaryAction && (
                      <button
                        type="button"
                        className={`btn btn-sm ${item.secondaryAction.variant} flex-grow-1 flex-sm-grow-0 d-inline-flex align-items-center justify-content-center gap-1 rounded-pill shadow-xs px-3`}
                        style={{ minHeight: "44px" }}
                        onClick={item.secondaryAction.onClick}
                        aria-label={item.secondaryAction.ariaLabel}
                      >
                        <i className={`bi ${item.secondaryAction.icon}`} aria-hidden="true"></i>
                        <span>{item.secondaryAction.label}</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default ActionRequiredTray;
