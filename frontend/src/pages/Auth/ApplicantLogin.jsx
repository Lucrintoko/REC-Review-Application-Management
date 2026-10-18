import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import adzuSeal from '../../assets/AdZU Seal.png'; 

function ApplicantLogin() {
  const navigate = useNavigate();

  // Tracking of inputs
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Tracking of Errors
  const [errorMessage, setErrorMessage] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault(); // Stops page from instant refreshing
    setErrorMessage('');

    // Packing e-mail and password into JSON Format
    const loginData = { email: email, password: password };

    try {
      const response = await fetch('http://localhost/REC-Review-Application-Management/backend/api/login_applicant.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginData)
      });
      
      const data = await response.json();

      if (data.status === 'success') {
        localStorage.setItem('applicantName', data.user.first_name + ' ' + data.user.last_name);
        localStorage.setItem('applicantDepartment', data.user.department);
        localStorage.setItem('applicantId', data.user.applicant_id);
        localStorage.setItem('applicantEmail', data.user.email);

        // Teleporting to the Applicant Dashboard
        navigate('/applicant/dashboard');
      } else {
        // Wrong password
        setErrorMessage(data.message);
      }
    } catch (err) {
      setErrorMessage("Could not connect to server.");
    }
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
                  <h4 className="fw-bold text-primary">Applicant Portal</h4>
                  <p className="text-muted small opacity-75">Sign in to submit and track your ethics review applications.</p>
                </div>

                {/* Input Section */}
                <form onSubmit={handleLogin}>
                  {/* Email */}
                  <div className="mb-3">
                    <label className="form-label fw-semibold">Email address</label>
                    <input 
                      type="email" 
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

                <div className="text-center mt-4">
                  <a href="#" className="text-decoration-none small">Forgot password?</a>
                </div>

              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}

export default ApplicantLogin;
