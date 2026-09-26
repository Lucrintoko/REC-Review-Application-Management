import React, { useState, useEffect } from 'react';
import { apiClient } from './services/api';
import AdminDashboard from './pages/AdminDashboard';
import AdminLogin from './pages/Auth/AdminLogin';

function App() {
  const [serverStatus, setServerStatus] = useState({ status: 'connecting', message: 'Checking API...' });

  useEffect(() => {
    apiClient.get('/')
      .then((data) => setServerStatus(data))
      .catch((err) => setServerStatus({ status: 'offline', message: 'PHP Backend not connected yet.' }));
  }, []);

  return (
    <>
      <AdminDashboard />
    </>
  );
}

export default App;
