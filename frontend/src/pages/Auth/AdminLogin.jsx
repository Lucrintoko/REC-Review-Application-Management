import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import adzuSeal from '../../assets/AdZU Seal.png'; 

function AdminLogin() {
  const navigate = useNavigate();

  // Tracking of inputs
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Tracking of Errors
  const [errorMessage, setErrorMessage] = useState('');

  const handleLogin = (e) => {
    e.preventDefault(); // Stops page from instant refreshing
    setErrorMessage('');

    // Packing e-mail and password into JSON Format
    const loginData = { email: email, password: password };

    fetch('http://localhost/REC-Review-Application-Management/backend/api/login_admin.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(loginData)
    })
    .then(response => response.json())
    .then(data => {
      if (data.status === 'success') {
        // Save their name, role, and id to browser memory
        localStorage.setItem('adminName', data.user.first_name + ' ' + data.user.last_name);
        localStorage.setItem('adminRole', data.user.role);
        localStorage.setItem('adminId', data.user.admin_id);

        // Teleporting to the Admin Dashboard
        navigate('/admin/home');
      } else {
        // Wrong password
        setErrorMessage(data.message);
      }
    })
    .catch(err => setErrorMessage("Could not connect to server."))
  }

  return (
    <div className="min-vh-100 d-flex align-items-center justify-content-center bg-light">
      
      {/* Log-in Box */}
      <div className="container">
        <div className="row justify-content-center">
          
          {/* Phones take up whole screen; Other Viewports go to middle */}
          <div className="col-12 col-md-6 col-lg-5">
            
            {/* Log in Card */}
            <div className="card shadow-lg border-0 rounded-4">
              <div className="card-body p-5">
                
                {/* Header Section */}
                <div className="text-center mb-4">
                  <img src={adzuSeal} alt="AdZU Seal" style={{ width: '80px' }} className="mb-3" />
                  <h4 className="fw-bold text-primary">Reviewer / Admin Portal</h4>
                  <p className="text-muted small opacity-75">Sign in to review applications and manage REC operations.</p>
                </div>

                {/* Input Section */}
                <form onSubmit={handleLogin}>
                  {/* Username */}
                  <div className="mb-3">
                    <label className="form-label fw-semibold">Username</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      placeholder="name@adzu.edu.ph" 
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>

                  {/* Password */}
                  <div className="mb-4">
                    <label className="form-label fw-semibold">Password</label>
                    <input 
                      type="password" 
                      className="form-control" 
                      placeholder="••••••••" 
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>

                  {errorMessage && <div className='alert alert-danger p-2 text-center'>{errorMessage}</div>}

                  <button type="submit" className="btn btn-primary w-100 fw-bold py-2">
                    Sign In
                  </button>
                </form>

              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}

export default AdminLogin;
