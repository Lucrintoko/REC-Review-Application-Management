import React from 'react';
import adzuSeal from '../../assets/AdZU Seal.png'; 

function AdminLogin() {
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
                <form>
                  {/* Username */}
                  <div className="mb-3">
                    <label className="form-label fw-semibold">Username</label>
                    <input type="text" className="form-control" placeholder="name@adzu.edu.ph" />
                  </div>

                  {/* Password */}
                  <div className="mb-4">
                    <label className="form-label fw-semibold">Password</label>
                    <input type="password" className="form-control" placeholder="••••••••" />
                  </div>

                  <button type="submit" className="btn btn-primary w-100 fw-bold py-2">
                    Sign In
                  </button>
                </form>

                <div className="text-center mt-4">
                  <a href="#" className="text-decoration-none small text-danger">Forgot password?</a>
                </div>

              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}

export default AdminLogin;
