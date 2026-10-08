import React, { useRef } from "react";

/**
 * Reusable File Upload Preview & Selector Component
 */
function FileUploadWidget({
  label,
  file,
  onFileSelect,
  onFileRemove,
  accept = ".pdf,.doc,.docx",
  isRequired = false,
  error,
}) {
  const inputRef = useRef(null);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      const formattedSize =
        selected.size > 1024 * 1024
          ? (selected.size / (1024 * 1024)).toFixed(2) + " MB"
          : (selected.size / 1024).toFixed(1) + " KB";

      onFileSelect({
        name: selected.name,
        size: selected.size,
        formattedSize,
        type: selected.type,
        lastModified: selected.lastModified,
        rawFile: selected, // Store the raw file object for actual uploading
      });
    }
  };

  return (
    <div
      className={`p-2 rounded-2 border ${
        error ? "border-danger bg-danger-subtle" : "border-light-subtle bg-light"
      } mt-1`}
    >
      <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
        <div className="d-flex align-items-center gap-2">
          <i
            className={`bi ${
              file ? "bi-file-earmark-check-fill text-success fs-5" : "bi-upload text-muted fs-5"
            }`}
          ></i>
          <div>
            <span className="small fw-semibold text-secondary d-block">
              {label} {isRequired && <span className="text-danger">*</span>}
            </span>
            {file ? (
              <span className="small text-success fw-medium">
                {file.name} ({file.formattedSize})
              </span>
            ) : (
              <span className="small text-muted fst-italic">
                No file attached (PDF, DOC, DOCX up to 10MB)
              </span>
            )}
          </div>
        </div>

        <div className="d-flex gap-1">
          <input
            type="file"
            ref={inputRef}
            onChange={handleFileChange}
            accept={accept}
            className="d-none"
          />
          <button
            type="button"
            className={`btn btn-sm ${file ? "btn-outline-secondary" : "btn-outline-primary"}`}
            onClick={() => inputRef.current && inputRef.current.click()}
          >
            <i className={`bi ${file ? "bi-arrow-repeat me-1" : "bi-cloud-upload me-1"}`}></i>
            {file ? "Replace File" : "Choose File"}
          </button>
          {file && (
            <button
              type="button"
              className="btn btn-sm btn-outline-danger"
              onClick={onFileRemove}
              title="Remove file"
            >
              <i className="bi bi-trash"></i>
            </button>
          )}
        </div>
      </div>
      {error && <div className="text-danger small mt-1">{error}</div>}
    </div>
  );
}

export default FileUploadWidget;

