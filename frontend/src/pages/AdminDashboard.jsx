import React from 'react';
import adzuSeal from '../assets/AdZU Seal.png';

function AdminDashboard() {
    const adminName = "Sean Matthew Araneta";
    const role = "Secretariat";

    return (
      <div className="min-vh-100 d-flex flex-column"> 

            {/* Header Class */}
            <header className="brand-header shadow-sm" style={{ height: '10vh' }}>
                {/* Header Content */}
                <div className='container-fluid d-flex justify-content-between align-items-center h-100 px-4 gap-3'>
                    {/* AdZU Seal w/ Dynamic Welcome Message */}
                    <div className='d-flex align-items-center h-100 gap-4'>
                        {/* AdZU Seal */}
                        <img 
                            src={adzuSeal} 
                            alt="AdZU Seal"
                            className='img-fluid' 
                            style={{ maxHeight: '70%',  width: 'auto' }}/> 

                        {/* Welcome Message */}
                        <div>
                            <h4 className='mb-0 fw-bold'>Welcome, {adminName}</h4>
                            <small className='text-light opacity-50 d-none d-md-block'>AdZU Research Ethics Committee {role}</small>
                        </div>
                    </div>

                    {/* Profile Pic Icon */}
                    <div className='d-flex align-items-center h-100'>
                        <i  
                            className='bi bi-person-circle text-emphasis'
                            style={{
                                fontSize: '5vh',
                                lineHeight: 1
                            }}    
                        ></i>
                    </div>
                </div>
            </header>

            <main className='container my-3 flex-grow-1'>
                
            </main>

            <footer>
                
            </footer>

      </div>
  );
}

export default AdminDashboard;
