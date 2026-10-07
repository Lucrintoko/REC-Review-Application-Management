import { useState } from "react";

/**
 * Accessible Info Tooltip with click/hover popover
 */
function InfoTooltip({ text, title }) {
  const [show, setShow] = useState(false);

  return (
    <span className="position-relative d-inline-block ms-1">
      <button
        type="button"
        className="btn btn-link p-0 text-primary border-0 align-baseline"
        style={{ textDecoration: "none", verticalAlign: "middle" }}
        onClick={(e) => {
          e.preventDefault();
          setShow((prev) => !prev);
        }}
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        aria-label="More Information"
      >
        <i className="bi bi-info-circle-fill fs-6"></i>
      </button>

      {show && (
        <div
          className="position-absolute bg-dark text-white p-2 rounded-3 shadow text-start"
          style={{
            zIndex: 1060,
            width: "260px",
            bottom: "125%",
            left: "50%",
            transform: "translateX(-50%)",
            fontSize: "0.8rem",
            lineHeight: 1.35,
            pointerEvents: "none",
          }}
        >
          {title && <div className="fw-bold mb-1 border-bottom border-secondary pb-1">{title}</div>}
          <div>{text}</div>
          <div
            className="position-absolute"
            style={{
              top: "100%",
              left: "50%",
              marginLeft: "-5px",
              borderWidth: "5px",
              borderStyle: "solid",
              borderColor: "#212529 transparent transparent transparent",
            }}
          />
        </div>
      )}
    </span>
  );
}

export default InfoTooltip;
