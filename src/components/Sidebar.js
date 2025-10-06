import React from 'react';
import { NavLink } from 'react-router-dom';
import { useData } from '../contexts/DataContext';
import '../styles/Sidebar.css';

function Sidebar() {
  const { newCommentCandidateIds, user, handleLogout } = useData();
  const notificationCount = newCommentCandidateIds.length;
  
  // --- ACTION REQUIRED ---
  // On the next line, replace 'brian.griffiths@brydongama.com' with your Director's actual email address.
  const isDirector = user?.email === 'brian.griffiths@brydongama.com'; 

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-logo-wrapper">
            <h2>Recruitment Tracker</h2>
        </div>
        
        <div className="user-info">
          <p>Logged in as: <strong>{user?.email || 'N/A'}</strong></p>
          <p className="user-role">{isDirector ? 'DIRECTOR' : 'RECRUITER'}</p>
        </div>
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

      <div className="sidebar-footer">
        <button className="btn-logout" onClick={handleLogout}>
          Log Out
        </button>
      </div>
    </div>
  );
}

export default Sidebar;