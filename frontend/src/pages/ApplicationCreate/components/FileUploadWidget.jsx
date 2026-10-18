import React, { useRef, useState } from "react";

/**
 * Reusable Multi-File & Single-File Upload Component with Drag & Drop
 */
function FileUploadWidget({
  label,
  file,
  files,
  multiple = true,
  onFileSelect,
  onFileRemove,
  accept = ".pdf,.doc,.docx",
  isRequired = false,
  error,
  maxSizeMB = 15,
  helpText,
}) {
  const inputRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [localError, setLocalError] = useState(null);

  // Normalize incoming files into an array
  const fileList = React.useMemo(() => {
    if (Array.isArray(files)) return files.filter(Boolean);
    if (Array.isArray(file)) return file.filter(Boolean);
    if (file && typeof file === "object" && file.name) return [file];
    return [];
  }, [files, file]);

  const formatFileSize = (bytes) => {
    if (!bytes || bytes === 0) return "0 KB";
    if (bytes >= 1024 * 1024) {
      return (bytes / (1024 * 1024)).toFixed(2) + " MB";
    }
    return (bytes / 1024).toFixed(1) + " KB";
  };

  const getFileIcon = (fileName) => {
    const ext = (fileName || "").split(".").pop().toLowerCase();
    if (ext === "pdf") return "bi-file-earmark-pdf-fill text-danger";
    if (ext === "doc" || ext === "docx") return "bi-file-earmark-word-fill text-primary";
    if (ext === "zip" || ext === "rar" || ext === "7z") return "bi-file-earmark-zip-fill text-warning";
    if (["jpg", "jpeg", "png"].includes(ext)) return "bi-file-earmark-image-fill text-success";
    return "bi-file-earmark-text-fill text-secondary";
  };

  const processSelectedFiles = (incomingFiles) => {
    if (!incomingFiles || incomingFiles.length === 0) return;

    setLocalError(null);
    const validFiles = [];
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    const errors = [];

    Array.from(incomingFiles).forEach((raw) => {
      if (raw.size > maxSizeBytes) {
        errors.push(`"${raw.name}" exceeds the ${maxSizeMB}MB limit (${formatFileSize(raw.size)}).`);
        return;
      }

      validFiles.push({
        name: raw.name,
        size: raw.size,
        formattedSize: formatFileSize(raw.size),
        type: raw.type,
        lastModified: raw.lastModified,
        rawFile: raw,
      });
    });

    if (errors.length > 0) {
      setLocalError(errors.join(" "));
    }

    if (validFiles.length === 0) return;

    let updatedList;
    if (multiple) {
      // Avoid duplicate file names by updating or appending
      const existingNames = new Set(fileList.map((f) => f.name));
      const newAdditions = validFiles.filter((f) => !existingNames.has(f.name));
      updatedList = [...fileList, ...newAdditions];
    } else {
      updatedList = [validFiles[0]];
    }

    if (onFileSelect) {
      // Pass both array and single-file fallback for backward compatibility
      onFileSelect(multiple ? updatedList : updatedList[0], updatedList);
    }
  };

  const handleInputChange = (e) => {
    processSelectedFiles(e.target.files);
    // Reset file input so user can re-select the same file if desired
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer && e.dataTransfer.files) {
      processSelectedFiles(e.dataTransfer.files);
    }
  };

  const handleRemoveItem = (index, e) => {
    e.stopPropagation();
    const updated = fileList.filter((_, i) => i !== index);
    if (updated.length === 0) {
      if (onFileRemove) onFileRemove();
      if (onFileSelect) onFileSelect(multiple ? [] : null, []);
    } else {
      if (onFileSelect) {
        onFileSelect(multiple ? updated : updated[0], updated);
      }
    }
  };

  const handleClearAll = (e) => {
    e.stopPropagation();
    if (onFileRemove) onFileRemove();
    if (onFileSelect) onFileSelect(multiple ? [] : null, []);
  };

  const totalBytes = fileList.reduce((acc, curr) => acc + (curr.size || 0), 0);
  const displayError = error || localError;

  return (
    <div
      className={`p-3 rounded-3 border transition-all ${
        displayError
          ? "border-danger bg-danger-subtle"
          : isDragging
          ? "border-primary bg-primary-subtle shadow-sm"
          : fileList.length > 0
          ? "border-success-subtle bg-white shadow-xs"
          : "border-light-subtle bg-light"
      } mt-2`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      style={{ transition: "all 0.2s ease-in-out" }}
    >
      {/* Header and Label */}
      <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-2">
        <div className="d-flex align-items-center gap-2">
          <i
            className={`bi ${
              fileList.length > 0
                ? "bi-file-earmark-check-fill text-success fs-5"
                : "bi-cloud-arrow-up text-primary fs-5"
            }`}
          ></i>
          <div>
            <span className="small fw-bold text-dark d-block">
              {label} {isRequired && <span className="text-danger">*</span>}
            </span>
            <small className="text-muted">
              {helpText ||
                (multiple
                  ? `Upload one or more files (${accept.replace(/\./g, "").toUpperCase()}, up to ${maxSizeMB}MB each)`
                  : `Upload file (${accept.replace(/\./g, "").toUpperCase()}, up to ${maxSizeMB}MB)`)}
            </small>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="d-flex align-items-center gap-1">
          <input
            type="file"
            ref={inputRef}
            onChange={handleInputChange}
            accept={accept}
            multiple={multiple}
            className="d-none"
          />
          <button
            type="button"
            className={`btn btn-sm ${
              fileList.length > 0 ? "btn-outline-primary" : "btn-primary"
            } d-inline-flex align-items-center gap-1`}
            onClick={() => inputRef.current && inputRef.current.click()}
          >
            <i className={`bi ${fileList.length > 0 && multiple ? "bi-plus-lg" : "bi-cloud-upload"}`}></i>
            <span>{fileList.length > 0 ? (multiple ? "Add More Files" : "Replace File") : "Choose File(s)"}</span>
          </button>

          {fileList.length > 0 && (
            <button
              type="button"
              className="btn btn-sm btn-outline-danger"
              onClick={handleClearAll}
              title="Remove all files"
            >
              <i className="bi bi-trash me-1"></i>
              <span className="d-none d-sm-inline">Clear</span>
            </button>
          )}
        </div>
      </div>

      {/* Files List Display */}
      {fileList.length > 0 ? (
        <div className="mt-2 pt-2 border-top">
          <div className="d-flex justify-content-between align-items-center mb-2">
            <span className="badge bg-success-subtle text-success border border-success-subtle d-inline-flex align-items-center gap-1">
              <i className="bi bi-check2-circle"></i>
              {fileList.length} {fileList.length === 1 ? "file" : "files"} attached ({formatFileSize(totalBytes)})
            </span>
            {isDragging && <span className="small text-primary fw-bold">Drop files to add!</span>}
          </div>

          <div className="d-flex flex-column gap-1">
            {fileList.map((f, idx) => (
              <div
                key={f.name + "-" + idx}
                className="d-flex justify-content-between align-items-center p-2 rounded bg-light border border-light-subtle"
                style={{ fontSize: "0.85rem" }}
              >
                <div className="d-flex align-items-center gap-2 text-truncate me-2">
                  <i className={`bi ${getFileIcon(f.name)} fs-6`}></i>
                  <span className="fw-medium text-dark text-truncate" title={f.name}>
                    {f.name}
                  </span>
                  <span className="text-muted small">({f.formattedSize || formatFileSize(f.size)})</span>
                </div>
                <button
                  type="button"
                  className="btn btn-sm btn-link text-danger p-0 ms-2 text-decoration-none"
                  onClick={(e) => handleRemoveItem(idx, e)}
                  title="Remove this file"
                  aria-label={`Remove ${f.name}`}
                >
                  <i className="bi bi-x-circle-fill fs-6"></i>
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div
          className="text-center py-2 px-3 border border-dashed rounded-2 mt-2 bg-white text-muted cursor-pointer"
          onClick={() => inputRef.current && inputRef.current.click()}
          style={{ cursor: "pointer", borderStyle: "dashed" }}
        >
          <span className="small fst-italic">
            <i className="bi bi-upload me-1 text-primary"></i>
            Click here to browse or drag & drop {multiple ? "multiple files" : "a file"} here
          </span>
        </div>
      )}

      {/* Error Message */}
      {displayError && (
        <div className="text-danger small mt-2 d-flex align-items-center gap-1">
          <i className="bi bi-exclamation-circle-fill"></i>
          <span>{displayError}</span>
        </div>
      )}
    </div>
  );
}

export default FileUploadWidget;
