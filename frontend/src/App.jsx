import React, { useState, useEffect } from 'react';
import { apiClient } from './services/api';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import AdminDashboard from './pages/AdminDashboard';
import AdminLogin from './pages/Auth/AdminLogin';
import AdminHome from './pages/AdminHome';
import AdminAnalytics from './pages/AdminAnalytics';
import AdminLayout from './components/AdminLayout';
import ApplicantLogin from './pages/Auth/ApplicantLogin';
import ApplicantDashboard from './pages/ApplicantDashboard';
import ApplicantForm from './pages/ApplicationCreate/ApplicantForm';

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

        {/* For Admin Home Page */}
        <Route 
          path="/admin/home"
          element={
            <AdminLayout>
              <AdminHome />
            </AdminLayout>
          }
        />

        {/* For Admin Dashboard */}
        <Route 
          path="/admin/dashboard" 
          element={
            <AdminLayout>
              <AdminDashboard />
            </AdminLayout>
          }
        />

        {/* For Admin Analytics */}
        <Route 
          path="/admin/analytics"
          element={
            <AdminLayout>
              <AdminAnalytics />
            </AdminLayout>
          }
        />

        {/* Default Route */}
        <Route path="*" element={<Navigate to="/admin/login" replace />} />

        {/* Testing .jsx files and checking formats */}
        {/* For Applicant Form */}
        <Route path="/applicant/login" element={<ApplicantLogin />} /> 

        <Route path="/applicant/form" element={<ApplicantForm />} />

        <Route path="/applicant/dashboard" element={<ApplicantDashboard />} />

      </Routes>
  );
}

export default App;
