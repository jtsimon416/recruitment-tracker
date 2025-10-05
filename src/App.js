import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { DataProvider } from './contexts/DataContext';
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
import './styles/App.css';

function App() {
  return (
    <DataProvider>
      <Router>
        <div className="app">
          <Sidebar />
          <div className="main-content">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/dashboard" element={<Dashboard />} />
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
        </div>
      </Router>
    </DataProvider>
  );
}

export default App;