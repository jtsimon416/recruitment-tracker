import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { DataProvider, useData } from './contexts/DataContext';
import Sidebar from './components/Sidebar';
import Clients from './pages/Clients';
import Positions from './pages/Positions';
import Recruiters from './pages/Recruiters';
import TalentPool from './pages/TalentPool';
import ActiveTracker from './pages/ActiveTracker';
import InterviewHub from './pages/InterviewHub';
import Commissions from './pages/Commissions';
import RoleHistory from './pages/RoleHistory';
import RubricGenerator from './pages/RubricGenerator';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import DirectorReview from './pages/DirectorReview'; // New Import
import './styles/App.css';

// Component to protect application routes
const ProtectedRoute = ({ children }) => {
  const { session, loadingSession } = useData();
  
  if (loadingSession) {
    // Simple loading screen while checking session
    return <div className="loading-state">Loading application...</div>;
  }
  
  // If no session, redirect to login
  if (!session) {
    return <Navigate to="/login" replace />;
  }

  return children;
};


function App() {
  return (
    <DataProvider>
      <Router>
        <div className="app">
          <Routes>
            {/* Public route for Login */}
            <Route path="/login" element={<Login />} />
            
            {/* Protected Routes Wrapper: All other paths require login */}
            <Route path="*" element={
              <ProtectedRoute>
                <Sidebar />
                <div className="main-content">
                  <Routes>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/director-review" element={<DirectorReview />} /> {/* New Route */}
                    <Route path="/clients" element={<Clients />} />
                    <Route path="/positions" element={<Positions />} />
                    <Route path="/recruiters" element={<Recruiters />} />
                    <Route path="/talent-pool" element={<TalentPool />} />
                    <Route path="/active-tracker" element={<ActiveTracker />} />
                    <Route path="/interview-hub" element={<InterviewHub />} />
                    <Route path="/commissions" element={<Commissions />} />
                    <Route path="/role-history" element={<RoleHistory />} />
                    <Route path="/rubric-generator" element={<RubricGenerator />} />
                  </Routes>
                </div>
              </ProtectedRoute>
            } />
          </Routes>
        </div>
      </Router>
    </DataProvider>
  );
}

export default App;