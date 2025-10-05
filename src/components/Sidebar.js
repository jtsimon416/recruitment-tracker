import React from 'react';
import { Link } from 'react-router-dom';
import '../styles/Sidebar.css';

function Sidebar() {
  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <h2>Recruitment Tracker</h2>
      </div>
      
      <nav className="sidebar-nav">
        <div className="nav-section">
          <h3>Overview</h3>
          <Link to="/" className="nav-link">Dashboard</Link>
        </div>

        <div className="nav-section">
          <h3>Data Management</h3>
          <Link to="/clients" className="nav-link">Clients</Link>
          <Link to="/positions" className="nav-link">Positions</Link>
          <Link to="/recruiters" className="nav-link">Recruiters</Link>
          <Link to="/talent-pool" className="nav-link">Talent Pool</Link>
        </div>

        <div className="nav-section">
          <h3>Workflow</h3>
          <Link to="/active-tracker" className="nav-link">Active Tracker</Link>
          <Link to="/interview-hub" className="nav-link">Interview Hub</Link>
          <Link to="/commissions" className="nav-link">Commissions</Link>
          <Link to="/role-history" className="nav-link">Role History</Link>
        </div>

        <div className="nav-section">
          <h3>AI Tools</h3>
          <Link to="/rubric-generator" className="nav-link">Rubric Generator</Link>
        </div>
      </nav>
    </div>
  );
}

export default Sidebar;