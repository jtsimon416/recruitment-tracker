import React, { useState, useEffect, useMemo } from 'react';
import { useData } from '../contexts/DataContext';
import { useConfirmation } from '../contexts/ConfirmationContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ExternalLink, TrendingUp, Users, ChevronDown, ChevronUp, Download, Filter, X, CheckCircle, AlertCircle, FileText, Star, Phone, Calendar, Archive
} from 'lucide-react';
import '../styles/DirectorOutreachDashboard.css';
import '../styles/ArchiveManagement.css';

// =========================================================================
// HELPER FUNCTIONS (UPDATED for Rose Gold Theme)
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
    // Custom colors matching the Rose Gold Dark Theme
    switch(status) {
      case 'outreach_sent': return '#F4C2A8'; // Peachy-Rose (light tone for sent)
      case 'reply_received': return '#B8D4D0'; // Mint-Cream (soft success)
      case 'accepted': return '#9ECE6A';       // Existing Green (high success)
      case 'declined': return '#F7A9BA';       // Dusty-Pink (decline/warning)
      case 'call_scheduled': return '#C5B9D6'; // Soft-Lavender (scheduled action)
      case 'ready_for_submission': return '#E8B4B8'; // Rose-Gold (submission)
      case 'gone_cold': return '#64748b';      // Slate-Gray (inactive/stalled)
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
      case 'gone_cold': return 'Gone Cold';
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
// FilterSelection Component (reusable dropdown-to-tag component)
// =========================================================================
const FilterSelection = ({ label, items, selectedItems, onToggle }) => {
  // Create a map for quick lookups (id -> name)
  const itemMap = useMemo(() => {
    return items.reduce((map, item) => {
      map[item.id] = item.name;
      return map;
    }, {});
  }, [items]);

  return (
    <div className="filter-section">
      <label className="filter-section-label">{label}</label>
      <div className="filter-select-wrapper">
        <select 
          className="filter-select" 
          onChange={(e) => {
            if (e.target.value) onToggle(e.target.value);
            e.target.value = ''; // Reset select
          }} 
          value=""
        >
          <option value="">Select {label.toLowerCase()}...</option>
          {items.map(item => (
            <option 
              key={item.id} 
              value={item.id} 
              disabled={selectedItems.includes(item.id)}
            >
              {itemMap[item.id] || item.name}
            </option>
          ))}
        </select>
      </div>
      {selectedItems.length > 0 && (
        <div className="selected-filter-tags">
          {selectedItems.map(itemId => (
            <span key={itemId} className="selected-filter-tag">
              {itemMap[itemId] || itemId}
              <button onClick={() => onToggle(itemId)}>&times;</button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

// =========================================================================
// OutreachCard Component (Modified Candidate Name/Info structure)
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
                    {/* Candidate Name is now directly a span in candidate-info for easier left-alignment/stacking */}
                    <span className="candidate-name">{activity.candidate_name || 'LinkedIn Contact'}</span>
                    <span className="recruiter-name-label">
                        <Users size={14} /> {activity.recruiters?.name || 'Unknown'}
                    </span>
                    {/* Rating is moved down here to keep the main name column vertical */}
                    {activity.rating > 0 && (
                        <div className="card-rating-display">
                            <span>{activity.rating}</span>
                            <Star size={14} className="filled" />
                        </div>
                    )}
                </div>
            </div>
            <div className="card-col card-col-position">
                <span className="position-title">{activity.positions?.title || 'Unknown Position'}</span>
                {/* The new CSS will make this badge smaller */}
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
                <span className="last-activity-label">
                    Last Update: {getTimeAgo(activity.updated_at || activity.created_at)}
                </span>
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
  const {
    recruiters,
    positions,
    outreachActivities,
    fetchAllOutreachActivities,
    fetchPositions,
    archiveOutreachForPosition
  } = useData();
  const { showConfirmation } = useConfirmation();
  const [loading, setLoading] = useState(true);
  const [expandedNotes, setExpandedNotes] = useState({});

  // --- ARCHIVE MANAGEMENT STATE ---
  const [selectedArchivePosition, setSelectedArchivePosition] = useState('');
  const [archivePreview, setArchivePreview] = useState({ newProfiles: 0, existingProfiles: 0 });
  const [archiving, setArchiving] = useState(false);
  
  // --- FILTER STATE ---
  const [filterPanelExpanded, setFilterPanelExpanded] = useState(false); 
  const [filterRecruiters, setFilterRecruiters] = useState([]);
  const [filterPositions, setFilterPositions] = useState([]);
  const [filterStatuses, setFilterStatuses] = useState([]);
  const [dateFilter, setDateFilter] = useState('week');
  const [customDateStart, setCustomDateStart] = useState('');
  const [customDateEnd, setCustomDateEnd] = useState('');
  
  // --- PAGINATION STATE ---
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10; // Display 10 items per page

  const outreachStages = [ 'outreach_sent', 'reply_received', 'accepted', 'call_scheduled', 'declined', 'ready_for_submission', 'gone_cold' ];
  
  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    await Promise.all([ fetchAllOutreachActivities(), fetchPositions() ]);
    setLoading(false);
  }

  function toggleNotes(activityId) { setExpandedNotes(prev => ({...prev, [activityId]: !prev[activityId]})); }
  
  // Filter out managers/directors from the recruiter list
  const recruiterFilterList = useMemo(() => {
    return recruiters.filter(r => {
        const role = r.role?.toLowerCase() || '';
        return role !== 'director' && !role.includes('manager');
    });
  }, [recruiters]);
  
  // Filtered Activities (Full List)
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

  // PAGINATION LOGIC
  const totalItems = filteredActivities.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);

  const paginatedActivities = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredActivities.slice(startIndex, endIndex);
  }, [filteredActivities, currentPage, itemsPerPage]);

  // Reset page number when filters change
  useEffect(() => {
      // Only reset if the page is out of bounds of the new total pages, 
      // or if we are filtering, to ensure the user lands on page 1 of the new results.
      if (currentPage > totalPages && totalPages > 0) {
          setCurrentPage(totalPages);
      } else if (currentPage !== 1 && (filterRecruiters.length > 0 || filterPositions.length > 0 || filterStatuses.length > 0 || dateFilter !== 'week')) {
        setCurrentPage(1);
      }
      
  }, [totalItems, totalPages, filterRecruiters, filterPositions, filterStatuses, dateFilter]);
  
  // Filter toggle functions (keep unchanged)
  function toggleRecruiterFilter(id) { setFilterRecruiters(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]); }
  function togglePositionFilter(id) { setFilterPositions(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]); }
  function toggleStatusFilter(status) { setFilterStatuses(prev => prev.includes(status) ? prev.filter(s => s !== status) : [...prev, status]); }
  function clearFilters() { setFilterRecruiters([]); setFilterPositions([]); setFilterStatuses([]); setDateFilter('week'); setCustomDateStart(''); setCustomDateEnd(''); }

  // -------------------------------------------------------------------
  // ARCHIVE MANAGEMENT FUNCTIONS
  // -------------------------------------------------------------------

  // Get closed positions for archive dropdown
  const closedPositions = useMemo(() => {
    return positions.filter(p => p.status === 'Closed').sort((a, b) => {
      const dateA = new Date(a.date_closed || 0);
      const dateB = new Date(b.date_closed || 0);
      return dateB - dateA; // Most recently closed first
    });
  }, [positions]);

  // Handle archive position selection and preview
  const handleArchivePositionChange = async (positionId) => {
    console.log('🔍 Archive Preview: Selected position ID:', positionId);
    setSelectedArchivePosition(positionId);

    if (!positionId) {
      setArchivePreview({ newProfiles: 0, existingProfiles: 0 });
      return;
    }

    // Get outreach records for this position
    const outreachForPosition = outreachActivities.filter(a => a.position_id === positionId);
    console.log('📋 Outreach records for this position:', outreachForPosition.length);
    console.log('📋 Sample records:', outreachForPosition.slice(0, 3));

    // Check how many are new vs existing in candidates table
    let newCount = 0;
    let existingCount = 0;

    // Import supabase to check candidates
    const { supabase } = await import('../services/supabaseClient');

    // Fetch all candidates once for comparison
    const { data: allCandidates, error: candidatesError } = await supabase
      .from('candidates')
      .select('id, linkedin_url');

    if (candidatesError) {
      console.error('❌ Error fetching candidates:', candidatesError);
      return;
    }

    console.log('👥 Total candidates in database:', allCandidates?.length || 0);

    // Normalize function (same as in RecruiterOutreach.js)
    const normalizeLinkedInURL = (url) => {
      if (!url) return null;
      let normalized = url.toLowerCase().trim();
      normalized = normalized.replace(/^https?:\/\//, '');
      normalized = normalized.replace(/^www\./, '');
      normalized = normalized.replace(/\/$/, '');
      normalized = normalized.split('?')[0].split('#')[0];
      return normalized;
    };

    // Create a Set of normalized candidate URLs for fast lookup
    const candidateUrlSet = new Set(
      allCandidates?.map(c => normalizeLinkedInURL(c.linkedin_url)).filter(Boolean) || []
    );

    console.log('🔗 Normalized candidate URLs in database:', candidateUrlSet.size);

    for (const record of outreachForPosition) {
      if (!record.linkedin_url) {
        console.log('⚠️ Skipping record without LinkedIn URL:', record);
        continue;
      }

      const normalizedUrl = normalizeLinkedInURL(record.linkedin_url);
      const exists = candidateUrlSet.has(normalizedUrl);

      if (exists) {
        existingCount++;
        console.log('✅ Already exists:', record.candidate_name, '-', normalizedUrl);
      } else {
        newCount++;
        console.log('🆕 New profile:', record.candidate_name, '-', normalizedUrl);
      }
    }

    console.log('📊 Final counts - New:', newCount, 'Existing:', existingCount);
    setArchivePreview({ newProfiles: newCount, existingProfiles: existingCount });
  };

  // Handle archive button click
  const handleArchiveClick = async () => {
    if (!selectedArchivePosition || archivePreview.newProfiles === 0) return;

    const selectedPosition = closedPositions.find(p => p.id === selectedArchivePosition);
    const positionTitle = selectedPosition ? `${selectedPosition.title} @ ${selectedPosition.clients?.company_name || 'Unknown Client'}` : 'this position';

    // Show confirmation modal
    showConfirmation({
      type: 'info',
      title: 'Archive Outreach to Talent Pool?',
      message: `This will create ${archivePreview.newProfiles} new shell profiles in the Talent Pool. ${archivePreview.existingProfiles} candidates are already in the system and will be skipped.`,
      contextInfo: positionTitle,
      confirmText: 'Archive Now',
      cancelText: 'Cancel',
      onConfirm: async () => {
        setArchiving(true);
        try {
          const result = await archiveOutreachForPosition(selectedArchivePosition);

          if (result.success) {
            showConfirmation({
              type: 'success',
              title: 'Success!',
              message: `Archived ${result.newProfilesCreated} candidates to Talent Pool! ${result.existingProfilesSkipped} were already in the system.`,
            });

            // Reset state
            setSelectedArchivePosition('');
            setArchivePreview({ newProfiles: 0, existingProfiles: 0 });
          } else {
            showConfirmation({
              type: 'error',
              title: 'Archive Failed',
              message: result.error || 'An error occurred while archiving.',
            });
          }
        } catch (error) {
          console.error('Archive error:', error);
          showConfirmation({
            type: 'error',
            title: 'Archive Failed',
            message: 'An unexpected error occurred. Please try again.',
          });
        } finally {
          setArchiving(false);
        }
      }
    });
  };

  // Data for filter dropdowns (keep unchanged)
  const recruiterItems = useMemo(() => 
    recruiterFilterList.map(r => ({ id: r.id, name: r.name })),
  [recruiterFilterList]);
  
  const positionItems = useMemo(() =>
    positions.filter(p => p.status === 'Open').map(p => ({ id: p.id, name: p.title })),
  [positions]);

  const statusItems = useMemo(() =>
    outreachStages.map(s => ({ id: s, name: getStatusLabel(s) })),
  [outreachStages]);

  // Calculate active filter count (keep unchanged)
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filterRecruiters.length > 0) count++;
    if (filterPositions.length > 0) count++;
    if (filterStatuses.length > 0) count++;
    if (dateFilter !== 'week' || customDateStart || customDateEnd) count++; 
    return count;
  }, [filterRecruiters, filterPositions, filterStatuses, dateFilter, customDateStart, customDateEnd]);


  return (
    <div className="page-container director-outreach-container">
      <div className="page-header"> <h1>Team Outreach Dashboard</h1> <p className="subtitle">Real-time visibility into recruiter LinkedIn activity</p> </div>

      {/* =================================== */}
      {/* === ARCHIVE MANAGEMENT SECTION === */}
      {/* =================================== */}
      <div className="archive-management-section">
        <h2 className="archive-section-title">
          <Archive size={20} />
          Archive Outreach to Talent Pool
        </h2>
        <p style={{ color: '#a0a0c0', marginBottom: '1rem' }}>
          Select a closed position to archive its outreach history as searchable profiles in the Talent Pool.
        </p>
        <select
          className="archive-position-selector"
          value={selectedArchivePosition}
          onChange={(e) => handleArchivePositionChange(e.target.value)}
          disabled={archiving}
        >
          <option value="">Select Closed Position...</option>
          {closedPositions.map(position => {
            const closedDate = position.date_closed
              ? new Date(position.date_closed).toLocaleDateString()
              : '(Date Not Recorded)';
            const companyName = position.clients?.company_name || 'Unknown Client';
            return (
              <option key={position.id} value={position.id}>
                {position.title} @ {companyName} - Closed {closedDate}
              </option>
            );
          })}
        </select>
        <button
          className={`btn-archive-outreach ${archivePreview.newProfiles === 0 && selectedArchivePosition ? 'already-archived' : ''}`}
          onClick={handleArchiveClick}
          disabled={!selectedArchivePosition || archivePreview.newProfiles === 0 || archiving}
        >
          <Archive size={16} />
          {archiving ? (
            'Archiving...'
          ) : archivePreview.newProfiles === 0 && selectedArchivePosition ? (
            'Already Archived (0 new profiles)'
          ) : selectedArchivePosition ? (
            `Archive Outreach (${archivePreview.newProfiles} new, ${archivePreview.existingProfiles} existing)`
          ) : (
            'Archive Outreach'
          )}
        </button>
      </div>

      {/* =================================== */}
      {/* === ADVANCED FILTER PANEL ==== */}
      {/* =================================== */}
      <div className="advanced-filter-panel">
        <div className="filter-panel-header" onClick={() => setFilterPanelExpanded(!filterPanelExpanded)}>
          <div className="filter-header-left">
            <Filter size={20} />
            <h3>Filters</h3>
            {activeFilterCount > 0 && <span className="filter-count-badge">{activeFilterCount}</span>}
          </div>
          <div className="filter-header-right">
            {activeFilterCount > 0 && (
              <button className="btn-clear-filters" onClick={(e) => { e.stopPropagation(); clearFilters(); }}>
                Clear All
              </button>
            )}
            <button className="btn-toggle-panel">
              {filterPanelExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
            </button>
          </div>
        </div>
        
        <AnimatePresence>
          {filterPanelExpanded && (
            <motion.div
              className="filter-panel-content"
              initial={{ height: 0, opacity: 0, padding: '0 24px' }}
              animate={{ height: 'auto', opacity: 1, padding: '24px 24px' }}
              exit={{ height: 0, opacity: 0, padding: '0 24px' }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
            >
              <div className="filter-row">
                <FilterSelection
                  label="Recruiters"
                  items={recruiterItems}
                  selectedItems={filterRecruiters}
                  onToggle={toggleRecruiterFilter}
                />
                <FilterSelection
                  label="Positions"
                  items={positionItems}
                  selectedItems={filterPositions}
                  onToggle={togglePositionFilter}
                />
              </div>
              <div className="filter-row">
                <FilterSelection
                  label="Status"
                  items={statusItems}
                  selectedItems={filterStatuses}
                  onToggle={toggleStatusFilter}
                />
                <div className="filter-section">
                  <label className="filter-section-label">Date Range</label>
                  <div className="date-range-inputs">
                    <select className="filter-select" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)}>
                      <option value="today">Today</option>
                      <option value="week">This Week</option>
                      <option value="month">This Month</option>
                      <option value="custom">Custom Range</option>
                    </select>
                    {dateFilter === 'custom' && (
                      <>
                        <input type="date" className="filter-date-input" value={customDateStart} onChange={(e) => setCustomDateStart(e.target.value)} />
                        <span className="date-separator">to</span>
                        <input type="date" className="filter-date-input" value={customDateEnd} onChange={(e) => setCustomDateEnd(e.target.value)} />
                      </>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      {/* =================================== */}
      {/* === END OF FILTER PANEL ========= */}
      {/* =================================== */}

      
      <div className="activity-feed-section">
        <div className="section-header"> 
            <h2>Live Activity Feed</h2> 
            <span className="activity-count">
                {totalItems} total activities 
                {totalItems > itemsPerPage && ` (Page ${currentPage} of ${totalPages})`}
            </span> 
        </div>
        <div className="activity-cards-container"> 
          {loading ? (
             <div className="empty-state"><p>Loading activities...</p></div>
          ) : (
            paginatedActivities.length === 0 ? ( <div className="empty-state"> <p>No activities found matching filters.</p> </div> ) : ( paginatedActivities.map(activity => ( <OutreachCard key={activity.id} activity={activity} onToggleNotes={toggleNotes} isExpanded={expandedNotes[activity.id]} /> )) )
          )}
        </div>

        {/* =================================== */}
        {/* === PAGINATION CONTROLS ==== */}
        {/* =================================== */}
        {totalPages > 1 && (
            <div className="pagination-controls-bar">
                <button
                    className="btn-page"
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                >
                    ◀ Previous
                </button>
                <span className="pagination-info">
                    Page {currentPage} of {totalPages}
                </span>
                <button
                    className="btn-page"
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                >
                    Next ▶
                </button>
            </div>
        )}
        {/* =================================== */}
        {/* === END: PAGINATION CONTROLS ==== */}
        {/* =================================== */}
      </div>
    </div>
  );
}

export default DirectorOutreachDashboard;