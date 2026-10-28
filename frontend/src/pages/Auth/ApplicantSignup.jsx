import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import adzuSeal from '../../assets/AdZU Seal.png';
import backgroundOne from '../../assets/backgrounds/0x01.png';
import backgroundTwo from '../../assets/backgrounds/0x02.png';
import { INSTITUTION_OPTIONS } from '../../constants/institutionalUnits';

const API_URL = 'http://localhost/REC-Review-Application-Management/backend/api/register_applicant.php';
const backgrounds = [backgroundOne, backgroundTwo];

function ApplicantSignup() {
  const navigate = useNavigate();
  const [backgroundImage] = useState(() => backgrounds[Math.floor(Math.random() * backgrounds.length)]);
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    password: '',
    confirm_password: '',
    contact_number: '',
    affiliation_type: 'Internal',
    department_agency: '',
  });
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((previous) => ({
      ...previous,
      [name]: value,
      ...(name === 'affiliation_type' && value === 'Internal'
        ? { department_agency: '' }
        : {}),
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setErrorMessage('');

    if (formData.password.length < 8) {
      setErrorMessage('Password must be at least 8 characters long.');
      return;
    }
    if (formData.password !== formData.confirm_password) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    const confirmation = await Swal.fire({
      icon: 'question',
      title: 'Create applicant account?',
      text: `Create an account for ${formData.first_name} ${formData.last_name}?`,
      showCancelButton: true,
      confirmButtonText: 'Create Account',
      cancelButtonText: 'Review Details',
      confirmButtonColor: '#003366',
      customClass: {
        popup: 'rounded-4 shadow-lg border-0',
        actions: 'd-flex justify-content-center gap-2',
        confirmButton: 'btn btn-primary px-4 py-2 rounded-pill fw-medium',
        cancelButton: 'btn btn-outline-secondary px-4 py-2 rounded-pill fw-medium',
      },
      buttonsStyling: false,
    });

    if (!confirmation.isConfirmed) return;

    setIsSubmitting(true);
    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          first_name: formData.first_name,
          last_name: formData.last_name,
          email: formData.email,
          password: formData.password,
          contact_number: formData.contact_number,
          affiliation_type: formData.affiliation_type,
          department_agency: formData.department_agency,
        }),
      });
      const data = await response.json();

      if (!response.ok || data.status !== 'success') {
        throw new Error(data.message || 'Unable to create the account.');
      }

      await Swal.fire({
        icon: 'success',
        title: 'Account Created',
        text: 'Your applicant account was created successfully. You can now sign in.',
        confirmButtonText: 'Go to Sign In',
        confirmButtonColor: '#003366',
        customClass: {
          popup: 'rounded-4 shadow-lg border-0',
          confirmButton: 'btn btn-primary px-4 py-2 rounded-pill fw-medium',
        },
        buttonsStyling: false,
      });
      navigate('/applicant/login');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to create the account.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="min-vh-100 d-flex align-items-center justify-content-center position-relative py-4"
      style={{
        backgroundImage: `url("${backgroundImage}")`,
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        backgroundSize: 'cover',
      }}
    >
      <div className="position-absolute top-0 start-0 w-100 h-100" style={{ backgroundColor: 'rgba(0, 28, 71, 0.9)' }} aria-hidden="true" />
      <div className="container position-relative" style={{ zIndex: 1 }}>
        <div className="row justify-content-center">
          <div className="col-12 col-md-8 col-lg-7">
            <div className="card shadow-lg border-0 rounded-4">
              <div className="card-body p-4 p-md-5">
                <div className="text-center mb-4">
                  <img src={adzuSeal} alt="AdZU Seal" style={{ width: '70px' }} className="mb-2" />
                  <h4 className="fw-bold text-primary">Create Applicant Account</h4>
                  <p className="text-muted small mb-0">Register to submit and track ethics review applications.</p>
                </div>

                <form onSubmit={handleSubmit}>
                  <div className="row g-3">
                    <div className="col-md-6">
                      <label className="form-label fw-semibold">First name</label>
                      <input name="first_name" className="form-control" value={formData.first_name} onChange={handleChange} required disabled={isSubmitting} />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label fw-semibold">Last name</label>
                      <input name="last_name" className="form-control" value={formData.last_name} onChange={handleChange} required disabled={isSubmitting} />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label fw-semibold">Email address</label>
                      <input type="email" name="email" className="form-control" placeholder="name@adzu.edu.ph" value={formData.email} onChange={handleChange} required disabled={isSubmitting} />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label fw-semibold">Contact number</label>
                      <input type="tel" name="contact_number" className="form-control" value={formData.contact_number} onChange={handleChange} required disabled={isSubmitting} />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label fw-semibold">Password</label>
                      <input type="password" name="password" className="form-control" minLength="8" value={formData.password} onChange={handleChange} required disabled={isSubmitting} />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label fw-semibold">Confirm password</label>
                      <input type="password" name="confirm_password" className="form-control" minLength="8" value={formData.confirm_password} onChange={handleChange} required disabled={isSubmitting} />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label fw-semibold">Affiliation</label>
                      <select name="affiliation_type" className="form-select" value={formData.affiliation_type} onChange={handleChange} disabled={isSubmitting}>
                        <option value="Internal">Internal</option>
                        <option value="External">External</option>
                      </select>
                    </div>
                    <div className="col-md-6">
                      <label className="form-label fw-semibold">
                        {formData.affiliation_type === 'Internal' ? 'Department / school / unit' : 'Department / agency'}
                      </label>
                      {formData.affiliation_type === 'Internal' ? (
                        <select
                          name="department_agency"
                          className="form-select"
                          value={formData.department_agency}
                          onChange={handleChange}
                          required
                          disabled={isSubmitting}
                        >
                          <option value="">Select your department or school...</option>
                          {INSTITUTION_OPTIONS.filter((option) => !option.isOpenEnded).map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          name="department_agency"
                          className="form-control"
                          placeholder="Enter your organization or agency"
                          value={formData.department_agency}
                          onChange={handleChange}
                          required
                          disabled={isSubmitting}
                        />
                      )}
                    </div>
                  </div>

                  {errorMessage && <div className="alert alert-danger p-2 mt-3 mb-0 text-center">{errorMessage}</div>}

                  <button type="submit" className="btn btn-primary w-100 fw-bold py-2 mt-4" disabled={isSubmitting}>
                    {isSubmitting ? 'Creating Account...' : 'Create Account'}
                  </button>
                </form>

                <div className="text-center mt-3">
                  <button type="button" className="btn btn-link text-decoration-none small" onClick={() => navigate('/applicant/login')} disabled={isSubmitting}>
                    Already have an account? Sign in
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ApplicantSignup;
