import React, { useState, useEffect } from 'react';
import { apiClient } from './services/api';
import AdminDashboard from './pages/AdminDashboard';
import AdminLogin from './pages/Auth/AdminLogin';
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
    <>
      <ApplicantForm />
    </>
  );
}

export default App;
