import React from "react";

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an unhandled error:", error, errorInfo);
    this.setState({ errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="container my-5 py-5 text-center">
          <div className="card shadow-sm border-danger mx-auto" style={{ maxWidth: "600px" }}>
            <div className="card-header bg-danger text-white py-3">
              <h5 className="mb-0 fw-bold">
                <i className="bi bi-exclamation-triangle-fill me-2"></i>Application Render Notice
              </h5>
            </div>
            <div className="card-body p-4 text-start">
              <p className="text-secondary mb-3">
                A rendering issue was prevented from crashing the application.
              </p>
              {this.state.error && (
                <div className="alert alert-light border small font-monospace text-danger p-2 mb-3">
                  {this.state.error.toString()}
                </div>
              )}
              <button
                type="button"
                className="btn btn-primary w-100 fw-semibold"
                onClick={() => {
                  this.setState({ hasError: false, error: null });
                  window.location.reload();
                }}
              >
                <i className="bi bi-arrow-clockwise me-2"></i>Reload Dashboard
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
