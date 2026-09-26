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
                <div className='container-fluid d-flex justify-content-between align-items-center h-100 px-5 gap-3'>
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

            <main className='container my-4 flex-grow-1'>

                {/* Dashboard Identifier */}
                <div className='row justify-content-between align-items-center'>
                    {/* LEFT SIDE: Dashboard Icon */}
                    <div className='col-auto d-flex align-items-center gap-3'>
                        <i
                            className='bi bi-easel2-fill border border-3 border-dark p-1 rounded text-dark fs-3'
                            style={{
                                lineHeight: 1
                            }}
                        ></i>
                        <p className='fw-bold fs-5 mb-1'>Dashboard</p>
                    </div>

                    {/* RIGHT SIDE: Search Bar and Filter */}
                    <div className='col-12 col-md-6 col-lg-5 mt-3 mt-md-0 d-flex align-items-center  gap-3'>

                        {/* Filter */}
                        <button className='btn btn-outline-secondary border shadow-sm d-flex align-items-center ' type='button'>
                            <i
                                className='bi bi-funnel me-2'
                            ></i>Filter
                        </button>

                        {/* Search Bar */}
                        <div className='input-group shadow-sm'>
                            {/* Text Input */}
                            <input type="text" className='form-control' placeholder='Search protocol...' />

                            {/* Search Button */}
                            <button className='btn btn-primary' type='button'>
                                <i
                                    className='bi bi-search me-2'
                                ></i>Search
                            </button>
                        </div>
                        
                    </div>
                </div>

            </main>

            <footer>
                
            </footer>

      </div>
  );
}

export default AdminDashboard;
