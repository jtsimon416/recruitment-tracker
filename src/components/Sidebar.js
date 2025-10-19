import React from 'react';
import { NavLink } from 'react-router-dom';
import { useData } from '../contexts/DataContext';
import { Activity, Users } from 'lucide-react';
import '../styles/Sidebar.css';

function Sidebar() {
  // ** UPDATED: Get the new isDirectorOrManager flag from the context **
  const { newCommentCandidateIds, user, userProfile, handleLogout, isDirectorOrManager } = useData();
  const notificationCount = newCommentCandidateIds.length;

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-logo-wrapper">
            <h2>Recruitment Tracker</h2>
        </div>
        
        <div className="user-info">
          <p>Logged in as: <strong>{userProfile?.name || user?.email || 'N/A'}</strong></p>
          {/* ** UPDATED: Display the role directly from the user's profile ** */}
          <p className="user-role">{userProfile?.role ? userProfile.role.toUpperCase() : 'RECRUITER'}</p>
        </div>
      </div>
      
      <nav className="sidebar-nav">
        <div className="nav-section">
          <h3>Overview</h3>
          <NavLink to="/" className="nav-link">Dashboard</NavLink>
        </div>

        {/* ** UPDATED: Use isDirectorOrManager to show/hide this entire section ** */}
        {isDirectorOrManager && (
            <div className="nav-section">
                <h3>Director Actions</h3>
                <NavLink to="/director-review" className="nav-link">
                    Director Review
                </NavLink>
                <NavLink to="/director-outreach-dashboard" className="nav-link">
                    <Users size={18} style={{ marginRight: '8px' }} />
                    Outreach Dashboard
                </NavLink>
                <NavLink to="/strategy-manager" className="nav-link">
                    <Activity size={18} style={{ marginRight: '8px' }} />
                    Strategy Manager
                </NavLink>
            </div>
        )}

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
          
          {/* ** FIX: Only show 'My Outreach' if the user is NOT a Director/Manager ** */}
          {!isDirectorOrManager && (
            <NavLink to="/recruiter-outreach" className="nav-link">
              <Activity size={18} style={{ marginRight: '8px' }} />
              My Outreach
            </NavLink>
          )}

          <NavLink to="/interview-hub" className="nav-link">Interview Hub</NavLink>
          
          {/* ** ADDED: Conditionally render the Commissions link ** */}
          {isDirectorOrManager && (
            <NavLink to="/commissions" className="nav-link">Commissions</NavLink>
          )}

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