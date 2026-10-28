import React, { useState, useEffect } from 'react';
import { apiClient } from './services/api';

function App() {
  const [serverStatus, setServerStatus] = useState({ status: 'connecting', message: 'Checking API...' });

  useEffect(() => {
    apiClient.get('/')
      .then((data) => setServerStatus(data))
      .catch((err) => setServerStatus({ status: 'offline', message: 'PHP Backend not connected yet.' }));
  }, []);

  return (
    <div className="min-vh-100 d-flex flex-column">
      {/* Brand Header */}
      <header className="brand-header py-3 px-4 shadow-sm">
        <div className="container-fluid d-flex justify-content-between align-items-center">
          <div>
            <h4 className="mb-0 fw-bold">Ateneo de Zamboanga University</h4>
            <small className="text-light opacity-75">Research Ethics Review Application and Management System (REC-ERB)</small>
          </div>
          <span className="badge bg-warning text-dark px-3 py-2">Team HASA</span>
        </div>
      </header>

      {/* Main Body */}
      <main className="container my-5 flex-grow-1">
        <div className="row g-4">
          {/* Welcome Card */}
          <div className="col-12 col-md-8">
            <div className="card shadow-sm border-0 h-100">
              <div className="card-body p-4">
                <h3 className="card-title fw-semibold text-primary mb-3">
                  <i className="bi bi-shield-check me-2"></i>Ethics Review Portal
                </h3>
                <p className="card-text text-secondary">
                  Welcome to the centralized digital repository and workflow management system for the AdZU Ethics Research Board.
                </p>
                <div className="alert alert-info d-flex align-items-center mb-4" role="alert">
                  <i className="bi bi-info-circle-fill me-2 fs-5"></i>
                  <div>
                    <strong>System Status:</strong> {serverStatus.message}
                  </div>
                </div>

                <div className="d-flex gap-3">
                  <button className="btn btn-primary px-4">
                    <i className="bi bi-box-arrow-in-right me-2"></i>Applicant Login
                  </button>
                  <button className="btn btn-outline-secondary px-4">
                    <i className="bi bi-person-badge me-2"></i>Admin / Reviewer Login
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Stats / Modules Preview */}
          <div className="col-12 col-md-4">
            <div className="card shadow-sm border-0 h-100">
              <div className="card-header bg-white fw-bold py-3">
                <i className="bi bi-diagram-3 me-2 text-primary"></i>Core Workflow Modules
              </div>
              <ul className="list-group list-group-flush">
                <li className="list-group-item d-flex justify-content-between align-items-center">
                  <span>1. Protocol Submission</span>
                  <span className="badge bg-success-subtle text-success">Online</span>
                </li>
                <li className="list-group-item d-flex justify-content-between align-items-center">
                  <span>2. Payment Verification</span>
                  <span className="badge bg-warning-subtle text-warning">AdZU Finance</span>
                </li>
                <li className="list-group-item d-flex justify-content-between align-items-center">
                  <span>3. Ethics Chair Triage</span>
                  <span className="badge bg-info-subtle text-info">Exempted / Expedited / Full</span>
                </li>
                <li className="list-group-item d-flex justify-content-between align-items-center">
                  <span>4. E-Archiving & Decisions</span>
                  <span className="badge bg-primary-subtle text-primary">Clearance</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-light py-3 border-top text-center text-muted small">
        &copy; 2026 Ateneo de Zamboanga University &bull; CS Department &bull; Web Systems and Technologies
      </footer>
    </div>
  );
}

export default App;
