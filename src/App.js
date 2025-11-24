import React, { useState, useEffect } from 'react';
import './styles/polish.css';
import './styles/animations.css';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
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
import CompanyDocuments from './pages/CompanyDocuments';
import PublicCareerPage from './pages/PublicCareerPage';
import GlobalSearch from './components/GlobalSearch';
import QuickAddPanel from './components/QuickAddPanel';
import FeatureBanner from './components/FeatureBanner';
import { usePageTransition } from './hooks/usePageTransition';
import 'nprogress/nprogress.css';
import './styles/App.css';

// Component to protect application routes
const ProtectedRoute = ({ children }) => {
  const { session, loadingSession } = useData();

  if (loadingSession) {
    return <div className="loading-state">Loading application...</div>;
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

// Component to enable page transition loading bar
const AppContent = ({ children }) => {
  usePageTransition();
  return children;
};

function App() {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true);
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);

  // Keyboard shortcut for Quick Add (Cmd+J / Ctrl+J)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'j') {
        e.preventDefault();
        setIsQuickAddOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <SplashScreen>
      <DataProvider>
        <Router>
          <AppContent>
            <div className={`app ${isSidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
              <Routes>
                {/* Public route for Login */}
                <Route path="/login" element={<Login />} />
                <Route path="/careers" element={<PublicCareerPage />} />

                {/* Protected Routes Wrapper */}
                <Route path="*" element={
                  <ProtectedRoute>
                    <ConfirmationProvider>
                      <GlobalSearch />
                      <QuickAddPanel isOpen={isQuickAddOpen} onClose={() => setIsQuickAddOpen(false)} />
                      <Sidebar isCollapsed={isSidebarCollapsed} setIsCollapsed={setIsSidebarCollapsed} />

                      <div className="main-content">
                        <FeatureBanner />
                        <Routes>
                          <Route index element={<Dashboard />} />
                          <Route path="/director-review" element={<DirectorReview />} />
                          <Route path="/director-outreach-dashboard" element={<DirectorOutreachDashboard />} />
                          <Route path="/strategy-manager" element={<StrategyManager />} />
                          <Route path="/clients" element={<Clients />} />
                          <Route path="/positions" element={<Positions />} />
                          <Route path="/our-team" element={<Recruiters />} />
                          <Route path="/talent-pool" element={<TalentPool />} />
                          <Route path="/active-tracker" element={<ActiveTracker />} />
                          <Route path="/recruiter-outreach" element={<RecruiterOutreach />} />
                          <Route path="/interview-hub" element={<InterviewHub />} />
                          <Route path="/commissions" element={<Commissions />} />
                          <Route path="/role-history" element={<RoleHistory />} />
                          <Route path="/rubric-generator" element={<RubricGenerator />} />
                          <Route path="/documents" element={<CompanyDocuments />} />
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