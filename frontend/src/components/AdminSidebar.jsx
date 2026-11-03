import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import adzuSeal from '../assets/AdZU Seal.png';

const ADZU_BLUE = '#003366';
const ADZU_GOLD = '#D4AF37';

function AdminSidebar({ isCollapsed, onToggle }) {
    // To figure out where the user currently is
    const location = useLocation();

    const navItems = [
        { path: '/admin/home', label: 'Home Page', icon: 'bi-house' },
        { path: '/admin/dashboard', label: 'Research Protocols', icon: 'bi-file-earmark-text' },
        { path: '/admin/analytics', label: 'Data & Analytics', icon: 'bi-bar-chart' },
    ];

    const handleLogout = () => {
        // Clear admin authentication session without wiping UI preferences
        localStorage.removeItem('adminName');
        localStorage.removeItem('adminRole');
        localStorage.removeItem('adminId');
        window.location.href = '/admin/login';
    };

    return (
        <aside
            className='d-flex flex-column flex-shrink-0 bg-light border-end d-print-none position-sticky top-0'
            style={{
                width: isCollapsed ? '72px' : '256px',
                height: '100vh',
                transition: 'width 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                overflowX: 'hidden',
                zIndex: 1030,
            }}
            aria-label='Admin Navigation Sidebar'
        >
            {/* Top Side: Brand Seal & Collapse Toggle */}
            <div className={`d-flex align-items-center ${isCollapsed ? 'justify-content-center flex-column pt-3 gap-2' : 'justify-content-between p-3 pb-2'}`}>
                <div className={`d-flex align-items-center ${isCollapsed ? 'justify-content-center' : 'gap-2'}`} style={{ minWidth: 0 }}>
                    <img
                        src={adzuSeal}
                        alt="AdZU Seal"
                        style={{
                            width: isCollapsed ? '36px' : '44px',
                            height: 'auto',
                            objectFit: 'contain',
                            transition: 'width 0.2s ease',
                        }}
                        title={isCollapsed ? "AdZU Ethics Review Management System" : undefined}
                    />
                    {!isCollapsed && (
                        <div className="text-truncate" style={{ lineHeight: 1.2 }}>
                            <span className="fw-bold fs-6 text-primary d-block text-truncate">AdZU REC</span>
                            <small className="text-muted" style={{ fontSize: '11px' }}>Review Management</small>
                        </div>
                    )}
                </div>

                <button
                    type="button"
                    onClick={onToggle}
                    className="btn btn-sm btn-outline-secondary border-0 d-flex align-items-center justify-content-center rounded-circle"
                    style={{ width: '32px', height: '32px', minWidth: '32px' }}
                    title={isCollapsed ? "Expand sidebar (Ctrl+B)" : "Collapse sidebar (Ctrl+B)"}
                    aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                >
                    <i className={`bi ${isCollapsed ? 'bi-chevron-right' : 'bi-chevron-left'} fs-6`}></i>
                </button>
            </div>

            <hr className="my-2 text-secondary opacity-25" />

            {/* Middle Side: Navigation Links */}
            <ul className="nav nav-pills flex-column mb-auto px-2 gap-1">
                {navItems.map((item) => {
                    const isActive = location.pathname === item.path;
                    return (
                        <li key={item.path} className="nav-item">
                            <Link
                                to={item.path}
                                title={isCollapsed ? item.label : undefined}
                                className={`nav-link d-flex align-items-center ${isCollapsed ? 'justify-content-center px-0' : 'px-3'} py-2 rounded-3 text-truncate ${isActive ? 'active' : 'text-dark'}`}
                                style={{
                                    height: '44px',
                                    backgroundColor: isActive ? ADZU_BLUE : 'transparent',
                                    color: isActive ? '#ffffff' : '#495057',
                                    fontWeight: isActive ? 600 : 500,
                                    borderLeft: (isActive && !isCollapsed) ? `4px solid ${ADZU_GOLD}` : 'none',
                                    transition: 'background-color 0.15s ease, color 0.15s ease',
                                }}
                            >
                                <i
                                    className={`bi ${item.icon} fs-5 ${!isCollapsed ? 'me-3' : ''}`}
                                    style={{ lineHeight: 1 }}
                                ></i>
                                {!isCollapsed && (
                                    <span className="text-truncate" style={{ whiteSpace: 'nowrap' }}>
                                        {item.label}
                                    </span>
                                )}
                            </Link>
                        </li>
                    );
                })}
            </ul>

            <hr className="my-2 text-secondary opacity-25" />

            {/* Bottom Side: Logout Button */}
            <div className={`p-2 mb-2 ${isCollapsed ? 'd-flex justify-content-center' : ''}`}>
                <button
                    type="button"
                    title={isCollapsed ? "Logout" : undefined}
                    className={`btn btn-outline-danger ${isCollapsed ? 'd-flex align-items-center justify-content-center rounded-3' : 'w-100 d-flex align-items-center justify-content-center rounded-3'}`}
                    style={{ height: '44px', width: isCollapsed ? '44px' : '100%' }}
                    onClick={handleLogout}
                >
                    <i className={`bi bi-box-arrow-right fs-5 ${!isCollapsed ? 'me-2' : ''}`}></i>
                    {!isCollapsed && <strong className="text-truncate">Logout</strong>}
                </button>
            </div>
        </aside>
    );
}

export default AdminSidebar;
