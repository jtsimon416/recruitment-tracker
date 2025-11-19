import React, { useEffect, useRef } from 'react';
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
  Target,        // Active Tracker (NEW)
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

function Sidebar({ isCollapsed, setIsCollapsed }) {
  // Original context usage
  const { newCommentCandidateIds, user, userProfile, handleLogout, isDirectorOrManager } = useData();
  const notificationCount = newCommentCandidateIds.length;
  const sidebarRef = useRef(null);

  useEffect(() => {
    if (isCollapsed && sidebarRef.current) {
      const activeLink = sidebarRef.current.querySelector('.nav-link.active');
      if (activeLink) {
        activeLink.scrollIntoView({
          behavior: 'smooth',
          block: 'center' // Center the active link in the visible area
        });
      }
    }
  }, [isCollapsed]);

  // Added check for userProfile loading state
  if (!userProfile) {
    return <div className={`sidebar ${isCollapsed ? 'collapsed' : ''} loading`}></div>; // Basic loading state
  }

  return (
    <div 
      className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}
      onMouseEnter={() => setIsCollapsed(false)}
      onMouseLeave={() => setIsCollapsed(true)}
      ref={sidebarRef}
    >
      <div className="sidebar-header">
        <div className="sidebar-logo-wrapper">
          <h2 style={{ color: 'yellow' }}><span className="nav-link-text">HIRE LOGIC</span></h2>
        </div>
        <div className="sidebar-logo-collapsed">HL</div>

        <div className="user-info">
          <p><span className="nav-link-text">Logged in as: <strong>{userProfile?.name || user?.email || 'N/A'}</strong></span></p>
          <p className="user-role"><span className="nav-link-text">{userProfile?.role ? userProfile.role.toUpperCase() : 'RECRUITER'}</span></p>
        </div>
      </div>

      <nav className="sidebar-nav">
        {/* --- Section 1: Overview --- */}
        <div className="nav-section">
          <h3><span className="nav-section-title">Overview</span></h3>
          <NavLink to="/" className="nav-link">
            <BarChart2 size={18} />
            <span className="nav-link-text">Dashboard</span>
          </NavLink>
        </div>

        {/* --- Section 2: Director Actions (Conditional) --- */}
        {isDirectorOrManager && (
          <div className="nav-section">
            <h3><span className="nav-section-title">Director Actions</span></h3>
            <NavLink to="/director-review" className="nav-link">
              <ShieldCheck size={18} />
              <span className="nav-link-text">Director Review</span>
            </NavLink>
            <NavLink to="/director-outreach-dashboard" className="nav-link">
              <Users size={18} /> {/* Original Icon */}
              <span className="nav-link-text">Outreach Dashboard</span>
            </NavLink>
            <NavLink to="/strategy-manager" className="nav-link">
              <Activity size={18} /> {/* Original Icon */}
              <span className="nav-link-text">Strategy Manager</span>
            </NavLink>
             <NavLink to="/commissions" className="nav-link">
              <DollarSign size={18} />
              <span className="nav-link-text">Commissions</span>
            </NavLink>
          </div>
        )}

        {/* --- Section 3: Workflow (Moved Up & Reordered) --- */}
        <div className="nav-section">
          <h3><span className="nav-section-title">Workflow</span></h3>
          {/* My Outreach (Conditional for Recruiters) */}
          {!isDirectorOrManager && (
            <NavLink to="/recruiter-outreach" className="nav-link">
              <MessageSquare size={18} /> {/* Use new icon */}
              <span className="nav-link-text">My Outreach</span>
            </NavLink>
          )}
          {/* Talent Pool */}
          <NavLink to="/talent-pool" className="nav-link">
            <UserPlus size={18} />
            <span className="nav-link-text">Talent Pool</span>
          </NavLink>
          {/* Active Tracker */}
          <div className="nav-link-wrapper">
            <NavLink to="/active-tracker" className="nav-link">
              <Target size={18} />
              <span className="nav-link-text">Active Tracker</span>
            </NavLink>
            {notificationCount > 0 && (
              <div className="indicator-badge">{notificationCount}</div>
            )}
          </div>
          {/* Interviews */}
          <NavLink to="/interview-hub" className="nav-link">
             <Handshake size={18} />
             <span className="nav-link-text">Interview Hub</span>
          </NavLink>
           {/* Documents */}
           <NavLink to="/documents" className="nav-link">
             <FileText size={18} />
             <span className="nav-link-text">Documents</span>
           </NavLink>
        </div>


        {/* --- Section 4: Data Management (Moved Down & Reordered) --- */}
        <div className="nav-section">
          <h3><span className="nav-section-title">Data Management</span></h3>
          {/* Positions */}
          <NavLink to="/positions" className="nav-link">
            <Clipboard size={18} />
            <span className="nav-link-text">Positions</span>
          </NavLink>
          {/* Our Team */}
          <NavLink to="/our-team" className="nav-link">
             {/* Corrected: Use imported User icon */}
             <User size={18} />
             <span className="nav-link-text">Our Team</span>
          </NavLink>
          {/* Clients */}
          <NavLink to="/clients" className="nav-link">
             <Building size={18} />
             <span className="nav-link-text">Clients</span>
          </NavLink>
          {/* Role Close */}
          <NavLink to="/role-history" className="nav-link">
            <Award size={18} />
            <span className="nav-link-text">Role History</span> {/* Kept original name */}
          </NavLink>
        </div>

        {/* --- Section 5: AI Tools --- */}
        <div className="nav-section">
          <h3><span className="nav-section-title">AI Tools</span></h3>
          <NavLink to="/rubric-generator" className="nav-link">
             <Cpu size={18} />
             <span className="nav-link-text">Rubric Generator</span>
          </NavLink>
        </div>
      </nav>

      <div className="sidebar-footer">
        {/* Using handleLogout from useData context */}
        <button className="btn-logout" onClick={handleLogout}>
          <LogOut size={18} />
          <span className="nav-link-text">Log Out</span>
        </button>
      </div>
    </div>
  );
}

export default Sidebar;