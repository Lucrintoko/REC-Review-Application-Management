import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
// For Graphing
import { 
    BarChart, Bar,
    LineChart, Line,
    PieChart, Pie,
    XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
 } from 'recharts';

function AdminAnalytics () {
    const navigate = useNavigate();

    // Take admin name from local storage
    const adminName = localStorage.getItem('adminName') || "Admin";

    // Prevent user from just typing in /admin/analytics
    useEffect(() => {
        // If browser doesn't have any session data
        if (!localStorage.getItem('adminName')) {
            // Redirect to login page
            navigate('/admin/login')
        }
    }, [navigate]);

    // Storage for all protocol data
    const [protocolData, setProtocolData] = useState([]);

    // Fetching data from the database
    useEffect(() => {
        // Fetching live data from database JSON
        fetch('http://localhost/REC-Review-Application-Management/backend/api/applications')
            .then(response => response.json())
            .then(databaseJSON => {
                const formattedData = databaseJSON.data.map(row => ({
                    ...row,
                    research_type: row.research_type.toUpperCase(),
                    status: row.status.toUpperCase() 
                }));

                setProtocolData(formattedData);
            })
        .catch (error => console.error("Error Fetching Data: ", error))
    }, []);

    // Getting current date from user's computer
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();

    // Isolation of current Month data
    const thisMonthProtocols = protocolData.filter(protocol => {
        const pDate = new Date(protocol.submission_date);
        return pDate.getMonth() === currentMonth && pDate.getFullYear() === currentYear;
    });

    // Calculate Final Decisions (All-Time)
    const finalDecisions = [
        { name: 'Clearance Granted', count: protocolData.filter(p => p.status === 'CLEARANCE GRANTED').length },
        { name: 'Rejected', count: protocolData.filter(p => p.status === 'REJECTED').length },
        { name: 'Withdrawn', count: protocolData.filter(p => p.status === 'WITHDRAWN').length }
    ];

    const monthCounts = {
        'Jan': 0, 'Feb': 0, 'Mar': 0, 'Apr': 0, 'May': 0, 'Jun': 0,
        'Jul': 0, 'Aug': 0, 'Sep': 0, 'Oct': 0, 'Nov': 0, 'Dec': 0
    };

    protocolData.forEach(protocol => {
        const dateObj = new Date(protocol.submission_date);
        if (dateObj.getFullYear() === currentYear) {
            const monthName = dateObj.toLocaleString('en-US', { month: 'short' });
            monthCounts[monthName] += 1;
        }
    });

    const submissionOvertime = Object.keys(monthCounts).map(key => ({
        month: key,
        submissions: monthCounts[key]
    }));

    const activePipeline = [
        { name: 'Under Review', count: protocolData.filter(p => p.status === 'UNDER REVIEW').length, fill: '#ffc107' },
        { name: 'Revising', count: protocolData.filter(p => p.status === 'REVISING').length, fill: '#0dcaf0' },
        { name: 'Payment Pending', count: protocolData.filter(p => p.status === 'PAYMENT PENDING').length, fill: '#dc3545' },
        { name: 'Drafts', count: protocolData.filter(p => p.status === 'DRAFT').length, fill: '#6c757d' }
    ].filter(stat => stat.count > 0); // Hide Empty Slices

    return (
        <div className='min-vh-100 d-flex flex-column bg-body-tertiary'>

            {/* Header Class */}
            <header className='brand-header shadow-sm' style={{ height: '8vh' }}>

                <div className='container-fluid d-flex justify-content-between align-items-center h-100 px-4 gap-3'>
                    <div className='d-flex align-items-center h-100 gap-4'>
                        <div>
                            <h4 className='mb-0 fw-bold'>Welcome Back, {adminName}</h4>
                            <small className='text-light opacity-50 d-none d-md-block'>Analytics & Insights Dashboard</small>
                        </div>
                    </div>
                </div>

            </header>

            {/* Content Class */}
            <main className='container-fluid px-4 my-4 flex-grow-1'>

                {/* Title */}
                <div className='d-flex align-items-center gap-3 mb-4'>
                    <i className='bi bi-graph-up-arrow border border-3 border-dark p-1 rounded text-dark fs-3' style={{ lineHeight: 1 }}></i>
                    <p className='fw-bold fs-5 mb-1'>Analytics Overview</p>
                </div>

                <div className='row g-4'>

                    {/* Top Card: Main Analytics (Clearance Granted, Withdrawn, Rejected) */}
                    <div className='col-12'>
                        <div className='card shadow-sm border-0 p-4'>
                            <h6 className='fw-bold text-center mb-4'>Final Decisions (All-Time)</h6>
                            <div style={{ width: '100%', height: 250 }}>
                                <ResponsiveContainer>
                                    <BarChart data={finalDecisions} layout="vertical">
                                        <CartesianGrid strokeDasharray={'3 3'} />
                                        <XAxis type='number' />
                                        <YAxis dataKey='name' type='category' width={150} />
                                        <Tooltip />
                                        <Legend />
                                        <Bar dataKey='count' fill='#198754' radius={[0, 4, 4, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>

                    {/* Bottom Charts */}
                    {/* Bottom Left: Line Chart (Submissions Overtime) */}
                    <div className='col-12 col-xl-6'>
                        <div className='card shadow-sm border-0 p-4 h-100'>
                            <h6 className='fw-bold text-center mb-4'>Submission Volume ({currentYear})</h6>
                            <div style={{ width: '100%', height: 300 }}>
                                <ResponsiveContainer>
                                    <LineChart data={submissionOvertime}>
                                        <CartesianGrid strokeDasharray='3 3' />
                                        <XAxis dataKey='month' />
                                        <YAxis />
                                        <Tooltip />
                                        <Legend />
                                        <Line type='monotone' dataKey='submissions' stroke='#0d6efd' strokeWidth={3} />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>

                    {/* Bottom Right: Donut Chart () */}
                    <div className='col-12 col-xl-6'>
                        <div className='card shadow-sm border-0 p-4 h-100'>
                            <h6 className='fw-bold text-center mb-4'>Current Active Pipelines</h6>
                            <div style={{ width: '100%', height: 300 }}>
                                <ResponsiveContainer>
                                    <PieChart>
                                        <Pie 
                                            data={activePipeline}
                                            dataKey='count'
                                            nameKey='name'
                                            cx='50%'
                                            cy='50%'
                                            innerRadius={60}
                                            outerRadius={100}
                                            paddingAngle={5}

                                            // Custom Label to show in Pie Chart
                                            label={({ name, value }) => `${name}: ${value}`}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>

                </div>

            </main>

        </div>
    )
}

export default AdminAnalytics;