import React, { useState, useEffect, useMemo } from 'react';
import { useData } from '../contexts/DataContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ExternalLink, TrendingUp, Users, ChevronDown, ChevronUp, Download, Filter, X, CheckCircle, AlertCircle, FileText, Star, Phone, Calendar
} from 'lucide-react';
import '../styles/DirectorOutreachDashboard.css';

// =========================================================================
// HELPER FUNCTIONS
// =========================================================================
function getTimeAgo(date) {
    if (!date) return '';
    const now = new Date();
    const then = new Date(date);
    const seconds = Math.floor((now - then) / 1000);
    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return then.toLocaleDateString();
}

function getStatusColor(status) {
    switch(status) {
      case 'outreach_sent': return '#7AA2F7';
      case 'reply_received': return '#9ECE6A';
      case 'accepted': return '#73daca';
      case 'declined': return '#f7768e';
      case 'call_scheduled': return '#BB9AF7';
      case 'ready_for_submission': return '#e0af68';
      default: return '#c0caf5';
    }
}

function getStatusLabel(status) {
    switch(status) {
      case 'outreach_sent': return 'Outreach Sent';
      case 'reply_received': return 'Reply Received';
      case 'accepted': return 'Accepted';
      case 'declined': return 'Declined';
      case 'call_scheduled': return 'Call Scheduled';
      case 'ready_for_submission': return 'Ready for Submission';
      default: return status;
    }
}

function formatCallDate(dateString) {
    if (!dateString) return null;
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
    });
}

// =========================================================================
// OutreachCard Component
// =========================================================================
const OutreachCard = ({ activity, onToggleNotes, isExpanded }) => {
    const statusColor = getStatusColor(activity.activity_status);
    const recruiterInitial = activity.recruiters?.name?.charAt(0) || 'R';
    const formattedCallDate = formatCallDate(activity.scheduled_call_date);

    return (
        <motion.div
            key={activity.id}
            className="outreach-card"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            layout
        >
            <div className="card-col card-col-candidate">
                <div className="recruiter-avatar" style={{ backgroundColor: statusColor }}>
                    {recruiterInitial}
                </div>
                <div className="candidate-info">
                    <div className="candidate-header">
                        <span className="candidate-name">{activity.candidate_name || 'LinkedIn Contact'}</span>
                        {activity.rating > 0 && (
                            <div className="card-rating-display">
                                <span>{activity.rating}</span>
                                <Star size={16} className="filled" />
                            </div>
                        )}
                    </div>
                    <span className="recruiter-name-label">
                        <Users size={14} /> {activity.recruiters?.name || 'Unknown'}
                    </span>
                </div>
            </div>
            <div className="card-col card-col-position">
                <span className="position-title">{activity.positions?.title || 'Unknown Position'}</span>
                <span className="status-badge" style={{ backgroundColor: statusColor }}>
                    {getStatusLabel(activity.activity_status)}
                </span>
            </div>
            <div className="card-col card-col-contact">
                {activity.activity_status === 'call_scheduled' && (
                    <>
                        {formattedCallDate && ( <span className="call-info"><Calendar size={14} /> {formattedCallDate}</span> )}
                        {activity.candidate_phone && ( <span className="call-info"><Phone size={14} /> {activity.candidate_phone}</span> )}
                    </>
                )}
            </div>
            <div className="card-col card-col-actions">
                <div className="action-buttons">
                     <a href={activity.linkedin_url} target="_blank" rel="noopener noreferrer" className="btn-linkedin" title="View LinkedIn Profile" onClick={(e) => e.stopPropagation()}>
                        <ExternalLink size={14} /> LinkedIn
                     </a>
                     {activity.notes && (
                        <button className="btn-notes-toggle" onClick={(e) => { e.stopPropagation(); onToggleNotes(activity.id); }} title="Toggle Notes">
                            <ChevronDown size={16} />
                        </button>
                     )}
                </div>
            </div>
            <AnimatePresence>
              {isExpanded && activity.notes && (
                  <motion.div className="expanded-notes-card-footer" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}>
                      <strong>Notes:</strong> {activity.notes}
                  </motion.div>
              )}
            </AnimatePresence>
        </motion.div>
    );
};


// =========================================================================
// MAIN DASHBOARD COMPONENT
// =========================================================================
function DirectorOutreachDashboard() {
  const { recruiters, positions, outreachActivities, fetchAllOutreachActivities, fetchPositions } = useData();
  const [loading, setLoading] = useState(true);
  const [expandedNotes, setExpandedNotes] = useState({});
  
  // ** ADDED: Restored state for all filters **
  const [filterRecruiters, setFilterRecruiters] = useState([]);
  const [filterPositions, setFilterPositions] = useState([]);
  const [filterStatuses, setFilterStatuses] = useState([]);
  const [dateFilter, setDateFilter] = useState('week');
  const [customDateStart, setCustomDateStart] = useState('');
  const [customDateEnd, setCustomDateEnd] = useState('');

  const outreachStages = [ 'outreach_sent', 'reply_received', 'accepted', 'call_scheduled', 'declined', 'ready_for_submission' ];
  
  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    await Promise.all([ fetchAllOutreachActivities(), fetchPositions() ]);
    setLoading(false);
  }

  function toggleNotes(activityId) { setExpandedNotes(prev => ({...prev, [activityId]: !prev[activityId]})); }
  
  // ** ADDED: Logic to filter out managers/directors from the recruiter list **
  const recruiterFilterList = useMemo(() => {
    return recruiters.filter(r => {
        const role = r.role?.toLowerCase() || '';
        return role !== 'director' && !role.includes('manager');
    });
  }, [recruiters]);
  
  // ** ADDED: Restored full filtering logic **
  const filteredActivities = useMemo(() => {
    let filtered = [...outreachActivities];
    if (filterRecruiters.length > 0) { filtered = filtered.filter(a => filterRecruiters.includes(a.recruiter_id)); }
    if (filterPositions.length > 0) { filtered = filtered.filter(a => filterPositions.includes(a.position_id)); }
    if (filterStatuses.length > 0) { filtered = filtered.filter(a => filterStatuses.includes(a.activity_status)); }
    if (dateFilter === 'today') { const today = new Date(); today.setHours(0, 0, 0, 0); filtered = filtered.filter(a => new Date(a.created_at) >= today); }
    else if (dateFilter === 'week') { const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7); filtered = filtered.filter(a => new Date(a.created_at) >= weekAgo); }
    else if (dateFilter === 'month') { const monthAgo = new Date(); monthAgo.setMonth(monthAgo.getMonth() - 1); filtered = filtered.filter(a => new Date(a.created_at) >= monthAgo); }
    else if (dateFilter === 'custom' && customDateStart && customDateEnd) { const start = new Date(customDateStart); const end = new Date(customDateEnd); end.setHours(23, 59, 59, 999); filtered = filtered.filter(a => { const date = new Date(a.created_at); return date >= start && date <= end; }); }
    return filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }, [outreachActivities, filterRecruiters, filterPositions, filterStatuses, dateFilter, customDateStart, customDateEnd]);

  function toggleRecruiterFilter(id) { setFilterRecruiters(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]); }
  function togglePositionFilter(id) { setFilterPositions(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]); }
  function toggleStatusFilter(status) { setFilterStatuses(prev => prev.includes(status) ? prev.filter(s => s !== status) : [...prev, status]); }
  function clearFilters() { setFilterRecruiters([]); setFilterPositions([]); setFilterStatuses([]); setDateFilter('week'); setCustomDateStart(''); setCustomDateEnd(''); }

  return (
    <div className="page-container director-outreach-container">
      <div className="page-header"> <h1>Team Outreach Dashboard</h1> <p className="subtitle">Real-time visibility into recruiter LinkedIn activity</p> </div>
      
      <div className="filters-section">
        <div className="filters-header">
            <h2><Filter size={20} /> Filters</h2>
            <button className="btn-clear-filters" onClick={clearFilters}>Clear Filters</button>
        </div>
        <div className="filters-grid">
          <div className="filter-group">
            <label>Recruiters</label>
            <div className="filter-chips">
              {recruiterFilterList.map(recruiter => (
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

          {/* ** ADDED: Restored Position Filter ** */}
          <div className="filter-group">
            <label>Positions</label>
            <div className="filter-chips">
                {positions.filter(p => p.status === 'Open').map(position => (
                    <button key={position.id} className={`filter-chip ${filterPositions.includes(position.id) ? 'active' : ''}`} onClick={() => togglePositionFilter(position.id)}>
                        {position.title}
                        {filterPositions.includes(position.id) && <X size={14} />}
                    </button>
                ))}
            </div>
          </div>
          
          <div className="filter-group">
            <label>Status</label>
            <div className="filter-chips">
              {outreachStages.map(status => (
                <button
                  key={status}
                  className={`filter-chip ${filterStatuses.includes(status) ? 'active' : ''}`}
                  onClick={() => toggleStatusFilter(status)}
                  style={{ borderColor: filterStatuses.includes(status) ? getStatusColor(status) : '#414868' }}
                >
                  {getStatusLabel(status)}
                  {filterStatuses.includes(status) && <X size={14} />}
                </button>
              ))}
            </div>
          </div>

          {/* ** ADDED: Restored Date Filter ** */}
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
                  <input type="date" value={customDateStart} onChange={(e) => setCustomDateStart(e.target.value)} />
                  <input type="date" value={customDateEnd} onChange={(e) => setCustomDateEnd(e.target.value)} />
                </>
              )}
            </div>
          </div>
        </div>
      </div>
      
      <div className="activity-feed-section">
        <div className="section-header"> <h2>Live Activity Feed</h2> <span className="activity-count">{filteredActivities.length} activities</span> </div>
        <div className="activity-cards-container"> 
          {filteredActivities.length === 0 ? ( <div className="empty-state"> <p>No activities found.</p> </div> ) : ( filteredActivities.map(activity => ( <OutreachCard key={activity.id} activity={activity} onToggleNotes={toggleNotes} isExpanded={expandedNotes[activity.id]} /> )) )}
        </div>
      </div>
    </div>
  );
}

export default DirectorOutreachDashboard;