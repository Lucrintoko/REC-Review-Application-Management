import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import adzuSeal from '../assets/AdZU Seal.png';

function AdminSidebar() {
    // To figure out where the user currently is
    const location = useLocation();

    return(
        <div
            className='d-flex flex-column flex-shrink-0 p-3 bg-light border-end d-print-none'
            style={{ width: '240px', height: '100vh', position: 'sticky', top: 0 }}
        >
            {/* Top Side */}
            <div className='text-center mb-2 mt-3'>
                <img src={adzuSeal} alt="AdZU Seal" style={{ width: '100px' }}/>
                <h6 className='mt-3 fw-bold text-primary'>Ethics Review Management System</h6>
            </div>

            <hr />

            {/* Middle Side */}
            <ul className='nav nav-pills flex-column mb-auto mt-2 gap-2'>

                {/* Home Page Linker */}
                <li className='nav-item'>
                    <Link
                        to="/admin/home"
                        className={`nav-link ${location.pathname === '/admin/home' ? 'active' : 'text-dark'}`}
                    >
                        <i className='bi bi-house me-3' style={{ lineHeight: 1 }}></i>
                        Home Page
                    </Link>
                </li>

                {/* Admin Dashboard Linker */}
                <li className='nav-item'>
                    <Link
                        to="/admin/dashboard"
                        className={`nav-link ${location.pathname === '/admin/dashboard' ? 'active' : 'text-dark'}`}
                    >
                        <i className='bi bi-file-earmark-text me-3' style={{ lineHeight: 1 }}></i>
                        Research Protocols
                    </Link>
                </li>

                {/* Data & Analytics Linker */}
                <li className='nav-item'>
                    <Link
                        to="/admin/analytics"
                        className={`nav-link ${location.pathname === '/admin/analytics' ? 'active' : 'text-dark'}`}
                    >
                        <i className='bi bi-bar-chart me-3' style={{ lineHeight: 1 }}></i>
                        Data & Analytics
                    </Link>
                </li>
            </ul>

            {/* Bottom Side */}
            <div className='dropdown mt-2 mb-2'>
                <button
                    className='btn btn-outline-danger w-100 d-flex align-items-center justify-content-center'
                    onClick={() => {
                        // Clear memory and redirect to login
                        localStorage.clear();
                        window.location.href = '/admin/login';
                    }}
                >
                    <i className='bi bi-person-circle fs-5 me-2'></i>
                    <strong>Logout</strong>
                </button>
            </div>

        </div>
    );
}

export default AdminSidebar;