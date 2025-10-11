import React, { useState, useEffect, useMemo } from 'react';
import { useData } from '../contexts/DataContext';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ExternalLink, TrendingUp, Users, Phone, MessageCircle,
  ChevronDown, ChevronUp, Download, Filter, X, CheckCircle, AlertCircle
} from 'lucide-react';
import '../styles/DirectorOutreachDashboard.css';

function DirectorOutreachDashboard() {
  const {
    recruiters,
    positions,
    outreachActivities,
    fetchAllOutreachActivities,
    fetchPositions
  } = useData();

  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [expandedNotes, setExpandedNotes] = useState({});
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  // Filters
  const [filterRecruiters, setFilterRecruiters] = useState([]);
  const [filterPositions, setFilterPositions] = useState([]);
  const [filterStatuses, setFilterStatuses] = useState([]);
  const [dateFilter, setDateFilter] = useState('week');
  const [customDateStart, setCustomDateStart] = useState('');
  const [customDateEnd, setCustomDateEnd] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    await Promise.all([
      fetchAllOutreachActivities(),
      fetchPositions()
    ]);
    setLoading(false);
  }

  function showToast(message, type = 'success') {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
  }

  function getTimeAgo(date) {
    const now = new Date();
    const then = new Date(date);
    const seconds = Math.floor((now - then) / 1000);

    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 172800) return 'Yesterday';
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
    return then.toLocaleDateString();
  }

  function getStatusColor(status) {
    switch(status) {
      case 'outreach_sent': return '#7AA2F7';
      case 'reply_received': return '#9ECE6A';
      case 'call_scheduled': return '#BB9AF7';
      case 'cold': return '#565f89';
      case 'completed': return '#7dcfff';
      default: return '#c0caf5';
    }
  }

  function getStatusLabel(status) {
    switch(status) {
      case 'outreach_sent': return 'Outreach Sent';
      case 'reply_received': return 'Reply Received';
      case 'call_scheduled': return 'Call Scheduled';
      case 'cold': return 'Cold';
      case 'completed': return 'Completed';
      default: return status;
    }
  }

  // Metrics Calculations
  const metrics = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);

    const todayActivities = outreachActivities.filter(a => new Date(a.created_at) >= today);
    const weekActivities = outreachActivities.filter(a => new Date(a.created_at) >= weekAgo);

    const todayOutreach = todayActivities.filter(a => a.activity_status === 'outreach_sent').length;
    const todayReplies = todayActivities.filter(a => a.activity_status === 'reply_received').length;

    const weekOutreach = weekActivities.filter(a => a.activity_status === 'outreach_sent').length;
    const weekReplies = weekActivities.filter(a => a.activity_status === 'reply_received').length;
    const weekCalls = weekActivities.filter(a => a.activity_status === 'call_scheduled').length;
    const weekResponseRate = weekOutreach > 0 ? ((weekReplies / weekOutreach) * 100).toFixed(1) : 0;

    return {
      todayOutreach,
      todayReplies,
      weekOutreach,
      weekReplies,
      weekCalls,
      weekResponseRate
    };
  }, [outreachActivities]);

  // Team Breakdown
  const teamBreakdown = useMemo(() => {
    const now = new Date();
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    const weekActivities = outreachActivities.filter(a => new Date(a.created_at) >= weekAgo);

    const recruiterStats = recruiters.map(recruiter => {
      const recruiterActivities = weekActivities.filter(a => a.recruiter_id === recruiter.id);
      const outreachCount = recruiterActivities.filter(a => a.activity_status === 'outreach_sent').length;
      const replyCount = recruiterActivities.filter(a => a.activity_status === 'reply_received').length;
      const callCount = recruiterActivities.filter(a => a.activity_status === 'call_scheduled').length;
      const responseRate = outreachCount > 0 ? ((replyCount / outreachCount) * 100).toFixed(1) : 0;

      // Most active position
      const positionCounts = {};
      recruiterActivities.forEach(a => {
        const posTitle = a.positions?.title || 'Unknown';
        positionCounts[posTitle] = (positionCounts[posTitle] || 0) + 1;
      });
      const mostActivePosition = Object.keys(positionCounts).length > 0
        ? Object.keys(positionCounts).reduce((a, b) => positionCounts[a] > positionCounts[b] ? a : b)
        : 'N/A';

      return {
        recruiter,
        outreachCount,
        replyCount,
        callCount,
        responseRate,
        mostActivePosition
      };
    });

    return recruiterStats.sort((a, b) => b.outreachCount - a.outreachCount);
  }, [outreachActivities, recruiters]);

  // Filtered Activities
  const filteredActivities = useMemo(() => {
    let filtered = [...outreachActivities];

    // Filter by recruiters
    if (filterRecruiters.length > 0) {
      filtered = filtered.filter(a => filterRecruiters.includes(a.recruiter_id));
    }

    // Filter by positions
    if (filterPositions.length > 0) {
      filtered = filtered.filter(a => filterPositions.includes(a.position_id));
    }

    // Filter by statuses
    if (filterStatuses.length > 0) {
      filtered = filtered.filter(a => filterStatuses.includes(a.activity_status));
    }

    // Filter by date
    if (dateFilter === 'today') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      filtered = filtered.filter(a => new Date(a.created_at) >= today);
    } else if (dateFilter === 'week') {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      filtered = filtered.filter(a => new Date(a.created_at) >= weekAgo);
    } else if (dateFilter === 'month') {
      const monthAgo = new Date();
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      filtered = filtered.filter(a => new Date(a.created_at) >= monthAgo);
    } else if (dateFilter === 'custom' && customDateStart && customDateEnd) {
      const start = new Date(customDateStart);
      const end = new Date(customDateEnd);
      end.setHours(23, 59, 59, 999);
      filtered = filtered.filter(a => {
        const date = new Date(a.created_at);
        return date >= start && date <= end;
      });
    }

    return filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }, [outreachActivities, filterRecruiters, filterPositions, filterStatuses, dateFilter, customDateStart, customDateEnd]);

  function toggleRecruiterFilter(recruiterId) {
    setFilterRecruiters(prev =>
      prev.includes(recruiterId)
        ? prev.filter(id => id !== recruiterId)
        : [...prev, recruiterId]
    );
  }

  function togglePositionFilter(positionId) {
    setFilterPositions(prev =>
      prev.includes(positionId)
        ? prev.filter(id => id !== positionId)
        : [...prev, positionId]
    );
  }

  function toggleStatusFilter(status) {
    setFilterStatuses(prev =>
      prev.includes(status)
        ? prev.filter(s => s !== status)
        : [...prev, status]
    );
  }

  function clearFilters() {
    setFilterRecruiters([]);
    setFilterPositions([]);
    setFilterStatuses([]);
    setDateFilter('week');
    setCustomDateStart('');
    setCustomDateEnd('');
  }

  function exportToCSV() {
    const headers = ['Date', 'Recruiter', 'Candidate', 'LinkedIn URL', 'Position', 'Status', 'Notes'];
    const rows = filteredActivities.map(a => [
      new Date(a.created_at).toLocaleDateString(),
      a.recruiters?.name || 'Unknown',
      a.candidate_name || 'LinkedIn Contact',
      a.linkedin_url,
      a.positions?.title || 'Unknown',
      getStatusLabel(a.activity_status),
      (a.notes || '').replace(/"/g, '""')
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `outreach-activities-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    showToast('CSV exported successfully!');
  }

  async function handleAddToPipeline(activity) {
    // TODO: Implement add to pipeline functionality
    const confirm = window.confirm(`Add ${activity.candidate_name || 'this candidate'} to the pipeline?`);
    if (!confirm) return;

    showToast('Feature coming soon: Add to pipeline', 'info');
    // This would create a new pipeline entry with the candidate data
    // navigate('/active-tracker', { state: { ... } });
  }

  if (loading) return <div className="loading-state">Loading outreach dashboard...</div>;

  return (
    <div className="page-container director-outreach-container">
      {/* Toast Notification */}
      <AnimatePresence>
        {toast.show && (
          <motion.div
            className={`toast toast-${toast.type}`}
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
          >
            {toast.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Page Header */}
      <div className="page-header">
        <h1>Team Outreach Dashboard</h1>
        <p className="subtitle">Real-time visibility into recruiter LinkedIn activity</p>
      </div>

      {/* A. METRICS CARDS */}
      <div className="metrics-grid">
        <div className="metric-card metric-today">
          <h3>Today</h3>
          <div className="metric-row">
            <div className="metric-item">
              <span className="metric-label">Outreach</span>
              <span className="metric-value">{metrics.todayOutreach}</span>
            </div>
            <div className="metric-item">
              <span className="metric-label">Replies</span>
              <span className="metric-value">{metrics.todayReplies}</span>
            </div>
          </div>
        </div>

        <div className="metric-card metric-week">
          <h3>This Week</h3>
          <div className="metric-row">
            <div className="metric-item">
              <span className="metric-label">Outreach</span>
              <span className="metric-value">{metrics.weekOutreach}</span>
            </div>
            <div className="metric-item">
              <span className="metric-label">Replies</span>
              <span className="metric-value">{metrics.weekReplies}</span>
            </div>
            <div className="metric-item">
              <span className="metric-label">Calls</span>
              <span className="metric-value">{metrics.weekCalls}</span>
            </div>
            <div className="metric-item">
              <span className="metric-label">Response Rate</span>
              <span className="metric-value">{metrics.weekResponseRate}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* B. TEAM ACTIVITY BREAKDOWN */}
      <div className="team-breakdown-section">
        <h2>Team Activity Breakdown (This Week)</h2>
        <div className="team-table">
          <div className="team-table-header">
            <div>Recruiter</div>
            <div>Outreach</div>
            <div>Replies</div>
            <div>Calls</div>
            <div>Response Rate</div>
            <div>Most Active Position</div>
          </div>
          {teamBreakdown.length === 0 ? (
            <div className="empty-state">No team activity this week</div>
          ) : (
            teamBreakdown.map(stat => (
              <div key={stat.recruiter.id} className="team-table-row">
                <div className="recruiter-cell">
                  <strong>{stat.recruiter.name}</strong>
                </div>
                <div className="stat-value">{stat.outreachCount}</div>
                <div className="stat-value">{stat.replyCount}</div>
                <div className="stat-value">{stat.callCount}</div>
                <div className="stat-value">{stat.responseRate}%</div>
                <div className="position-cell">{stat.mostActivePosition}</div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* C. FILTERS */}
      <div className="filters-section">
        <div className="filters-header">
          <h2><Filter size={20} /> Filters</h2>
          <div className="filter-actions">
            <button className="btn-export" onClick={exportToCSV}>
              <Download size={16} /> Export CSV
            </button>
            <button className="btn-clear-filters" onClick={clearFilters}>
              Clear Filters
            </button>
          </div>
        </div>

        <div className="filters-grid">
          {/* Recruiter Filter */}
          <div className="filter-group">
            <label>Recruiters</label>
            <div className="filter-chips">
              {recruiters.map(recruiter => (
                <button
                  key={recruiter.id}
                  className={`filter-chip ${filterRecruiters.includes(recruiter.id) ? 'active' : ''}`}
                  onClick={() => toggleRecruiterFilter(recruiter.id)}
                >
                  {recruiter.name}
                  {filterRecruiters.includes(recruiter.id) && <X size={14} />}
                </button>
              ))}
            </div>
          </div>

          {/* Position Filter */}
          <div className="filter-group">
            <label>Positions</label>
            <div className="filter-chips">
              {positions.filter(p => p.status === 'Open').map(position => (
                <button
                  key={position.id}
                  className={`filter-chip ${filterPositions.includes(position.id) ? 'active' : ''}`}
                  onClick={() => togglePositionFilter(position.id)}
                >
                  {position.title}
                  {filterPositions.includes(position.id) && <X size={14} />}
                </button>
              ))}
            </div>
          </div>

          {/* Status Filter */}
          <div className="filter-group">
            <label>Status</label>
            <div className="filter-chips">
              {['outreach_sent', 'reply_received', 'call_scheduled', 'completed'].map(status => (
                <button
                  key={status}
                  className={`filter-chip ${filterStatuses.includes(status) ? 'active' : ''}`}
                  onClick={() => toggleStatusFilter(status)}
                  style={{
                    borderColor: filterStatuses.includes(status) ? getStatusColor(status) : '#414868'
                  }}
                >
                  {getStatusLabel(status)}
                  {filterStatuses.includes(status) && <X size={14} />}
                </button>
              ))}
            </div>
          </div>

          {/* Date Filter */}
          <div className="filter-group">
            <label>Date Range</label>
            <div className="date-filter-row">
              <select value={dateFilter} onChange={(e) => setDateFilter(e.target.value)}>
                <option value="today">Today</option>
                <option value="week">This Week</option>
                <option value="month">This Month</option>
                <option value="custom">Custom Range</option>
              </select>
              {dateFilter === 'custom' && (
                <>
                  <input
                    type="date"
                    value={customDateStart}
                    onChange={(e) => setCustomDateStart(e.target.value)}
                    placeholder="Start date"
                  />
                  <input
                    type="date"
                    value={customDateEnd}
                    onChange={(e) => setCustomDateEnd(e.target.value)}
                    placeholder="End date"
                  />
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* D. LIVE ACTIVITY FEED */}
      <div className="activity-feed-section">
        <div className="section-header">
          <h2>Live Activity Feed</h2>
          <span className="activity-count">{filteredActivities.length} activities</span>
        </div>

        <div className="activity-feed">
          {filteredActivities.length === 0 ? (
            <div className="empty-state">
              <p>No activities found. Adjust your filters or wait for recruiters to log activity.</p>
            </div>
          ) : (
            filteredActivities.map(activity => (
              <motion.div
                key={activity.id}
                className="activity-card"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                layout
              >
                <div className="activity-header">
                  <div className="recruiter-info">
                    <div className="recruiter-avatar">
                      {activity.recruiters?.name?.charAt(0) || 'R'}
                    </div>
                    <div className="recruiter-details">
                      <strong>{activity.recruiters?.name || 'Unknown Recruiter'}</strong>
                      <span className="time-ago">{getTimeAgo(activity.created_at)}</span>
                    </div>
                  </div>
                  <span
                    className="status-badge"
                    style={{ backgroundColor: getStatusColor(activity.activity_status) }}
                  >
                    {getStatusLabel(activity.activity_status)}
                  </span>
                </div>

                <div className="activity-body">
                  <div className="candidate-info">
                    <h3>{activity.candidate_name || 'LinkedIn Contact'}</h3>
                    <p className="position-name">{activity.positions?.title || 'Unknown Position'}</p>
                  </div>

                  <a
                    href={activity.linkedin_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="linkedin-button"
                  >
                    <ExternalLink size={20} /> View LinkedIn Profile
                  </a>

                  {activity.notes && (
                    <div className="activity-notes">
                      <button
                        className="btn-collapse"
                        onClick={() => setExpandedNotes(prev => ({...prev, [activity.id]: !prev[activity.id]}))}
                      >
                        {expandedNotes[activity.id] ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        Notes
                      </button>
                      {expandedNotes[activity.id] && (
                        <p className="notes-content">{activity.notes}</p>
                      )}
                    </div>
                  )}
                </div>

                <div className="activity-footer">
                  <button
                    className="btn-add-pipeline"
                    onClick={() => handleAddToPipeline(activity)}
                  >
                    Add to Pipeline
                  </button>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default DirectorOutreachDashboard;
