import React from 'react';
import { NavLink } from 'react-router-dom';
import { useData } from '../contexts/DataContext';
import '../styles/Sidebar.css';

function Sidebar() {
  const { newCommentCandidateIds } = useData();
  const notificationCount = newCommentCandidateIds.length;

  // No onClick handler is needed here anymore, as the notification is cleared
  // when the user opens the comments modal on the ActiveTracker page.

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <h2>Recruitment Tracker</h2>
      </div>
      
      <nav className="sidebar-nav">
        <div className="nav-section">
          <h3>Overview</h3>
          <NavLink to="/" className="nav-link">Dashboard</NavLink>
        </div>

        <div className="nav-section">
          <h3>Data Management</h3>
          <NavLink to="/clients" className="nav-link">Clients</NavLink>
          <NavLink to="/positions" className="nav-link">Positions</NavLink>
          <NavLink to="/recruiters" className="nav-link">Recruiters</NavLink>
          <NavLink to="/talent-pool" className="nav-link">Talent Pool</NavLink>
        </div>

        <div className="nav-section">
          <h3>Workflow</h3>
          <div className="nav-link-wrapper">
            <NavLink to="/active-tracker" className="nav-link">
              Active Tracker
            </NavLink>
            {notificationCount > 0 && (
              <div className="indicator-badge">
                {notificationCount}
              </div>
            )}
          </div>
          <NavLink to="/interview-hub" className="nav-link">Interview Hub</NavLink>
          <NavLink to="/commissions" className="nav-link">Commissions</NavLink>
          <NavLink to="/role-history" className="nav-link">Role History</NavLink>
        </div>

        <div className="nav-section">
          <h3>AI Tools</h3>
          <NavLink to="/rubric-generator" className="nav-link">Rubric Generator</NavLink>
        </div>
      </nav>
    </div>
  );
}

export default Sidebar;

