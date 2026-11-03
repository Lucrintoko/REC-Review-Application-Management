import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import AdminSidebar from './AdminSidebar';

function AdminLayout({ children }) {
    // Persist sidebar state across route navigation and browser reloads
    const [isCollapsed, setIsCollapsed] = useState(() => {
        return localStorage.getItem('rec_admin_sidebar_collapsed') === 'true';
    });

    const toggleSidebar = () => {
        setIsCollapsed(prev => {
            const nextState = !prev;
            localStorage.setItem('rec_admin_sidebar_collapsed', String(nextState));
            return nextState;
        });
    };

    // Keyboard shortcut (Ctrl+B / Cmd+B), for collapsing the sidebar
    useEffect(() => {
        const handleKeyDown = (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
                e.preventDefault();
                toggleSidebar();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    return (
        <div className='d-flex min-vh-100 bg-light'>
            {/* Adding Sidebar to the Left */}
            <AdminSidebar isCollapsed={isCollapsed} onToggle={toggleSidebar} />

            {/* Fluid Main Content Container with min-w-0 for chart & table reflow */}
            <main
                className='flex-grow-1 bg-white min-w-0'
                style={{
                    overflowY: 'auto',
                    overflowX: 'hidden',
                    height: '100vh',
                }}
            >
                {children || <Outlet />}
            </main>
        </div>
    );
}

export default AdminLayout;
