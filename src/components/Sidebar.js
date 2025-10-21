import React from 'react';
import { NavLink } from 'react-router-dom';
// Only import useData, NOT useAuth
import { useData } from '../contexts/DataContext';
// Corrected Icon Imports - Only include used icons
import {
  BarChart2,     // Dashboard
  ShieldCheck,   // Director Review
  Users,         // Director Outreach Dashboard & Recruiters Data Mgt.
  Activity,      // Strategy Manager & Old My Outreach Icon
  Building,      // Clients
  Clipboard,     // Positions
  UserPlus,      // Talent Pool
  ClipboardList, // Active Tracker
  MessageSquare, // My Outreach (New Icon)
  Handshake,     // Interview Hub
  Award,         // Role History
  DollarSign,    // Commissions
  FileText,      // Documents
  Cpu,           // Rubric Generator
  LogOut,        // Logout Button
  User,          // Recruiters (Data Management) - Ensure this is imported
} from 'lucide-react';
import '../styles/Sidebar.css';

function Sidebar() {
  // Original context usage
  const { newCommentCandidateIds, user, userProfile, handleLogout, isDirectorOrManager } = useData();
  const notificationCount = newCommentCandidateIds.length;

  // Added check for userProfile loading state
  if (!userProfile) {
    return <div className="sidebar loading"></div>; // Basic loading state
  }

  return (
    // Use standard div, not motion.div
    <div className="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-logo-wrapper">
          <h2>Recruitment Tracker</h2>
        </div>

        <div className="user-info">
          <p>Logged in as: <strong>{userProfile?.name || user?.email || 'N/A'}</strong></p>
          <p className="user-role">{userProfile?.role ? userProfile.role.toUpperCase() : 'RECRUITER'}</p>
        </div>
      </div>

      <nav className="sidebar-nav">
        {/* --- Section 1: Overview --- */}
        <div className="nav-section">
          <h3>Overview</h3>
          <NavLink to="/" className="nav-link">
            <BarChart2 size={18} />
            Dashboard
          </NavLink>
        </div>

        {/* --- Section 2: Director Actions (Conditional) --- */}
        {isDirectorOrManager && (
          <div className="nav-section">
            <h3>Director Actions</h3>
            <NavLink to="/director-review" className="nav-link">
              <ShieldCheck size={18} />
              Director Review
            </NavLink>
            <NavLink to="/director-outreach-dashboard" className="nav-link">
              <Users size={18} /> {/* Original Icon */}
              Outreach Dashboard
            </NavLink>
            <NavLink to="/strategy-manager" className="nav-link">
              <Activity size={18} /> {/* Original Icon */}
              Strategy Manager
            </NavLink>
             <NavLink to="/commissions" className="nav-link">
              <DollarSign size={18} />
              Commissions
            </NavLink>
          </div>
        )}

        {/* --- Section 3: Workflow (Moved Up & Reordered) --- */}
        <div className="nav-section">
          <h3>Workflow</h3>
          {/* My Outreach (Conditional for Recruiters) */}
          {!isDirectorOrManager && (
            <NavLink to="/recruiter-outreach" className="nav-link">
              <MessageSquare size={18} /> {/* Use new icon */}
              My Outreach
            </NavLink>
          )}
          {/* Talent Pool */}
          <NavLink to="/talent-pool" className="nav-link">
            <UserPlus size={18} />
            Talent Pool
          </NavLink>
          {/* Active Tracker */}
          <div className="nav-link-wrapper">
            <NavLink to="/active-tracker" className="nav-link">
              <ClipboardList size={18} />
              Active Tracker
            </NavLink>
            {notificationCount > 0 && (
              <div className="indicator-badge">{notificationCount}</div>
            )}
          </div>
          {/* Interviews */}
          <NavLink to="/interview-hub" className="nav-link">
             <Handshake size={18} />
             Interview Hub
          </NavLink>
           {/* Documents */}
           <NavLink to="/documents" className="nav-link">
             <FileText size={18} />
             Documents
           </NavLink>
        </div>


        {/* --- Section 4: Data Management (Moved Down & Reordered) --- */}
        <div className="nav-section">
          <h3>Data Management</h3>
          {/* Positions */}
          <NavLink to="/positions" className="nav-link">
            <Clipboard size={18} />
            Positions
          </NavLink>
          {/* Recruiters */}
          <NavLink to="/recruiters" className="nav-link">
             {/* Corrected: Use imported User icon */}
             <User size={18} />
             Recruiters
          </NavLink>
          {/* Clients */}
          <NavLink to="/clients" className="nav-link">
             <Building size={18} />
             Clients
          </NavLink>
          {/* Role Close */}
          <NavLink to="/role-history" className="nav-link">
            <Award size={18} />
            Role History {/* Kept original name */}
          </NavLink>
        </div>

        {/* --- Section 5: AI Tools --- */}
        <div className="nav-section">
          <h3>AI Tools</h3>
          <NavLink to="/rubric-generator" className="nav-link">
             <Cpu size={18} />
             Rubric Generator
          </NavLink>
        </div>
      </nav>

      <div className="sidebar-footer">
        {/* Using handleLogout from useData context */}
        <button className="btn-logout" onClick={handleLogout}>
          <LogOut size={18} />
          Log Out
        </button>
      </div>
    </div>
  );
}

export default Sidebar;