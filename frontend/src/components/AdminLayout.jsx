import React from 'react';
import AdminSidebar from './AdminSidebar';

function AdminLayout ({ children }) {
    return (
        <div className='d-flex min-vh-100'>
            {/* Adding Sidebar to the Left */}
            <AdminSidebar />

            {/* Page Content to be loaded to the right side */}
            <div className='flex-grow-1 bg-white' style={{ overflowY: 'auto', height: '100vh' }}>
                {children}
            </div>
        </div>
    )
}

export default AdminLayout;