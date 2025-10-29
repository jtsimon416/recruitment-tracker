import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
// --- REMOVED: 'motion' and 'AnimatePresence' imports are no longer needed ---
import { DataProvider, useData } from './contexts/DataContext';
import { ConfirmationProvider } from './contexts/ConfirmationContext';
import SplashScreen from './components/SplashScreen';
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
import DirectorReview from './pages/DirectorReview';
import RecruiterOutreach from './pages/RecruiterOutreach';
import DirectorOutreachDashboard from './pages/DirectorOutreachDashboard';
import StrategyManager from './pages/StrategyManager';
// --- ADDED: Import the new CompanyDocuments page ---
import CompanyDocuments from './pages/CompanyDocuments';
// --------------------------------------------------
import { usePageTransition } from './hooks/usePageTransition';
import 'nprogress/nprogress.css';
import './styles/App.css';

// --- REMOVED: The entire 'TabReturnSplash' component that was here is now gone. ---

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

// Component to enable page transition loading bar
const AppContent = ({ children }) => {
  usePageTransition(); // Hook to show loading bar on route changes
  return children;
};

function App() {
  // --- REMOVED: The 'showTabReturnSplash' state has been removed. ---
  
  // --- REMOVED: The 'useEffect' hook that listened for tab visibility changes is gone. ---

  return (
    <SplashScreen>
      <DataProvider>
        <Router basename={process.env.NODE_ENV === 'production' ? process.env.PUBLIC_URL : ''}> {/* Only use basename in production */}
          <AppContent>
            {/* --- REMOVED: The 'AnimatePresence' and 'TabReturnSplash' components are gone. --- */}

            <div className="app"> {/* Main app container */}
              <Routes>
                {/* Public route for Login */}
                <Route path="/login" element={<Login />} />

                {/* Protected Routes Wrapper: All other paths require login */}
                {/* Using path="*" ensures this wrapper handles all non-login routes */}
                <Route path="*" element={
                  <ProtectedRoute>
                    <ConfirmationProvider> {/* Context for modals */}
                      {/* Sidebar is rendered inside protected area */}
                      <Sidebar />
                      {/* Main content area takes remaining space */}
                      <div className="main-content">
                        {/* Nested Routes define the pages within the main content area */}
                        <Routes>
                          {/* Default route */}
                          <Route path="/" element={<Dashboard />} />
                          {/* Specific page routes */}
                          <Route path="/dashboard" element={<Dashboard />} />
                          <Route path="/director-review" element={<DirectorReview />} />
                          <Route path="/director-outreach-dashboard" element={<DirectorOutreachDashboard />} />
                          <Route path="/strategy-manager" element={<StrategyManager />} />
                          <Route path="/clients" element={<Clients />} />
                          <Route path="/positions" element={<Positions />} />
                          <Route path="/recruiters" element={<Recruiters />} />
                          <Route path="/talent-pool" element={<TalentPool />} />
                          <Route path="/active-tracker" element={<ActiveTracker />} />
                          <Route path="/recruiter-outreach" element={<RecruiterOutreach />} />
                          <Route path="/interview-hub" element={<InterviewHub />} />
                          <Route path="/commissions" element={<Commissions />} />
                          <Route path="/role-history" element={<RoleHistory />} />
                          <Route path="/rubric-generator" element={<RubricGenerator />} />
                          {/* --- ADDED: Route for the new Company Documents page --- */}
                          <Route path="/documents" element={<CompanyDocuments />} />
                          {/* -------------------------------------------------------- */}
                          {/* Optional: Add a 404 Not Found route */}
                          {/* <Route path="*" element={<div>Page Not Found</div>} /> */}
                        </Routes>
                      </div>
                    </ConfirmationProvider>
                  </ProtectedRoute>
                } />
              </Routes>
            </div>
          </AppContent>
        </Router>
      </DataProvider>
    </SplashScreen>
  );
}

export default App;