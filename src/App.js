import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
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
import { usePageTransition } from './hooks/usePageTransition';
import 'nprogress/nprogress.css';
import './styles/App.css';

// Tab Visibility Splash Screen Component
const TabReturnSplash = ({ isVisible }) => {
  if (!isVisible) return null;

  return (
    <motion.div
      className="splash-screen"
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 1.1 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
      style={{ zIndex: 9999 }}
    >
      <div className="splash-content">
        <motion.h1
          className="splash-logo"
          initial={{ opacity: 0.5 }}
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        >
          HIRE LOGIC
        </motion.h1>
        <motion.div
          className="splash-tagline"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          Recruitment Excellence
        </motion.div>
      </div>
    </motion.div>
  );
};

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
  const [showTabReturnSplash, setShowTabReturnSplash] = useState(false);

  // Detect tab visibility changes - show splash when returning
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // User just came back to the tab - show splash screen
        setShowTabReturnSplash(true);
        // Hide splash after 2.6 seconds (same as SplashScreen component)
        setTimeout(() => setShowTabReturnSplash(false), 2600);
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  return (
    <SplashScreen>
      <DataProvider>
        <Router basename="/recruitment-tracker">
          <AppContent>
            {/* Global Tab Return Splash - visible on all pages */}
            <AnimatePresence>
              <TabReturnSplash isVisible={showTabReturnSplash} />
            </AnimatePresence>

            <div className="app">
              <Routes>
                {/* Public route for Login */}
                <Route path="/login" element={<Login />} />

                {/* Protected Routes Wrapper: All other paths require login */}
                <Route path="*" element={
                  <ProtectedRoute>
                    <ConfirmationProvider>
                      <Sidebar />
                      <div className="main-content">
                        <Routes>
                          <Route path="/" element={<Dashboard />} />
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