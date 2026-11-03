import React, { useState, useEffect } from 'react';
import { apiClient } from './services/api';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import AdminDashboard from './pages/AdminDashboard';
import AdminLogin from './pages/Auth/AdminLogin';
import AdminHome from './pages/AdminHome';
import AdminAnalytics from './pages/AdminAnalytics';
import AdminLayout from './components/AdminLayout';
import ApplicantLogin from './pages/Auth/ApplicantLogin';
import ApplicantSignup from './pages/Auth/ApplicantSignup';
import ApplicantDashboard from './pages/ApplicantDashboard';
import ApplicantForm from './pages/ApplicationCreate/ApplicantForm';

function ApplicantRoute({ children }) {
  const isAuthenticated = Boolean(localStorage.getItem('applicantId'));
  return isAuthenticated ? children : <Navigate to="/applicant/login" replace />;
}

function App() {
  const [serverStatus, setServerStatus] = useState({ status: 'connecting', message: 'Checking API...' });

  useEffect(() => {
    apiClient.get('/')
      .then((data) => setServerStatus(data))
      .catch((err) => setServerStatus({ status: 'offline', message: 'PHP Backend not connected yet.' }));
  }, []);

  return (
      <Routes>

        {/* For Admin Login */}
        <Route path="/admin/login" element={<AdminLogin />} />

        {/* Admin Section with Shared Layout */}
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<Navigate to="/admin/home" replace />} />
          <Route path="home" element={<AdminHome />} />
          <Route path="dashboard" element={<AdminDashboard />} />
          <Route path="analytics" element={<AdminAnalytics />} />
        </Route>

        {/* Testing .jsx files and checking formats */}
        {/* For Applicant Form */}
        <Route path="/applicant/login" element={<ApplicantLogin />} /> 
        <Route path="/applicant/signup" element={<ApplicantSignup />} />

        <Route
          path="/applicant/form"
          element={
            <ApplicantRoute>
              <ApplicantForm />
            </ApplicantRoute>
          }
        />

        <Route
          path="/applicant/dashboard"
          element={
            <ApplicantRoute>
              <ApplicantDashboard />
            </ApplicantRoute>
          }
        />

        {/* Default Route */}
        <Route path="*" element={<Navigate to="/admin/login" replace />} />
      </Routes>
  );
}

export default App;
