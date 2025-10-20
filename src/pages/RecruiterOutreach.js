import React, { useState, useEffect, useMemo } from 'react';
import { useData } from '../contexts/DataContext';
import { supabase } from '../services/supabaseClient';
import { motion } from 'framer-motion';
import {
  ExternalLink, Eye, Edit, Trash2, ChevronUp, ChevronDown,
  Upload, Search, Filter, X, Star
} from 'lucide-react';
import '../styles/RecruiterOutreach.css';

// ===================================
// UTILITY: Extract Name from LinkedIn URL
// ===================================
function extractNameFromLinkedInURL(url) {
  try {
    const match = url.match(/linkedin\.com\/in\/([^\/\?]+)/i);

    if (!match) return null;

    const slug = match[1];
    const cleanSlug = slug.replace(/\/$/, '');
    const parts = cleanSlug.split('-');

    // Remove last part if it's a number (LinkedIn ID)
    const lastPart = parts[parts.length - 1];
    if (/^\d+$/.test(lastPart)) {
      parts.pop();
    }

    // Capitalize each word
    const name = parts
      .map(word => {
        if (['mba', 'phd', 'md', 'cpa', 'cfa'].includes(word.toLowerCase())) {
          return word.toUpperCase();
        }
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
      })
      .join(' ');

    return name || null;
  } catch (error) {
    console.error('Error extracting name from URL:', error);
    return null;
  }
}

// ===================================
// UTILITY: Get Status Badge Info
// ===================================
const getStatusBadge = (status) => {
  const statusMap = {
    'outreach_sent': { label: 'Outreach Sent', emoji: '🟡', class: 'outreach-sent' },
    'reply_received': { label: 'Reply Received', emoji: '🟢', class: 'reply-received' },
    'call_scheduled': { label: 'Call Scheduled', emoji: '🔵', class: 'call-scheduled' },
    'cold': { label: 'Cold', emoji: '❌', class: 'cold' },
    'completed': { label: 'Completed', emoji: '✅', class: 'completed' }
  };

  return statusMap[status] || statusMap['outreach_sent'];
};

// ===================================
// UTILITY: Time Ago
// ===================================
const getTimeAgo = (dateString) => {
  if (!dateString) return 'N/A';

  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHours = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSec < 60) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString();
};

// ===================================
// COMPONENT: Star Rating Display
// ===================================
const StarRatingDisplay = ({ rating }) => {
  const stars = [1, 2, 3, 4, 5];
  return (
    <div className="rating-stars">
      {stars.map((star) => (
        <Star
          key={star}
          size={16}
          className={rating >= star ? 'filled' : 'empty'}
          fill={rating >= star ? '#FFD700' : 'none'}
        />
      ))}
    </div>
  );
};

// ===================================
// MAIN COMPONENT
// ===================================
function RecruiterOutreach() {
  const { userProfile, fetchMyOutreachActivities, addOutreachActivity, updateOutreachActivity, deleteOutreachActivity, positions, fetchPositions } = useData();

  // Data State
  const [outreachActivities, setOutreachActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  // Bulk Upload State
  const [bulkUploadText, setBulkUploadText] = useState('');
  const [selectedBulkPosition, setSelectedBulkPosition] = useState('');
  const [bulkPreview, setBulkPreview] = useState(null);
  const [processingBulk, setProcessingBulk] = useState(false);

  // Filter State
  const [filters, setFilters] = useState({
    positionId: '',
    status: '',
    rating: '',
    searchQuery: '',
    dateRange: ''
  });

  // Sort State
  const [sortConfig, setSortConfig] = useState({
    key: 'created_at',
    direction: 'desc'
  });

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  // Expanded Row State
  const [expandedRowId, setExpandedRowId] = useState(null);

  // Edit Modal State
  const [editingActivity, setEditingActivity] = useState(null);

  // Load Data
  useEffect(() => {
    if (userProfile?.id) {
      loadData();
    }
  }, [userProfile]);

  const loadData = async () => {
    setLoading(true);
    await fetchPositions();
    const activities = await fetchMyOutreachActivities(userProfile.id);
    if (activities) {
      setOutreachActivities(activities);
    }
    setLoading(false);
  };

  // ===================================
  // BULK UPLOAD FUNCTIONS
  // ===================================

  const processBulkURLs = () => {
    if (!bulkUploadText.trim()) {
      alert('Please paste some LinkedIn URLs');
      return;
    }

    if (!selectedBulkPosition) {
      alert('Please select a position');
      return;
    }

    const urls = bulkUploadText
      .split('\n')
      .map(url => url.trim())
      .filter(url => url && url.includes('linkedin.com'));

    if (urls.length === 0) {
      alert('No valid LinkedIn URLs found');
      return;
    }

    const contacts = urls.map((url, index) => {
      const extractedName = extractNameFromLinkedInURL(url);
      return {
        id: `temp-${index}`,
        url: url,
        name: extractedName || 'Unknown Name',
        editable: !extractedName
      };
    });

    setBulkPreview(contacts);
  };

  const confirmBulkUpload = async () => {
    if (!bulkPreview || bulkPreview.length === 0) return;

    setProcessingBulk(true);

    try {
      const insertData = bulkPreview.map(contact => ({
        recruiter_id: userProfile.id,
        position_id: selectedBulkPosition,
        linkedin_url: contact.url,
        candidate_name: contact.name,
        activity_status: 'outreach_sent',
        rating: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }));

      const { error } = await supabase
        .from('recruiter_outreach')
        .insert(insertData);

      if (error) throw error;

      alert(`✅ Successfully added ${bulkPreview.length} contacts!`);

      setBulkUploadText('');
      setSelectedBulkPosition('');
      setBulkPreview(null);

      await loadData();

    } catch (error) {
      console.error('Error bulk uploading:', error);
      alert('Error adding contacts: ' + error.message);
    } finally {
      setProcessingBulk(false);
    }
  };

  const cancelBulkUpload = () => {
    setBulkPreview(null);
  };

  const editBulkName = (contactId, newName) => {
    setBulkPreview(prev =>
      prev.map(c =>
        c.id === contactId ? { ...c, name: newName } : c
      )
    );
  };

  // ===================================
  // FILTER & SORT FUNCTIONS
  // ===================================

  const filteredOutreach = useMemo(() => {
    let result = [...outreachActivities];

    if (filters.positionId) {
      result = result.filter(a => a.position_id === filters.positionId);
    }

    if (filters.status) {
      result = result.filter(a => a.activity_status === filters.status);
    }

    if (filters.rating) {
      const minRating = parseInt(filters.rating);
      result = result.filter(a => (a.rating || 0) >= minRating);
    }

    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      result = result.filter(a =>
        (a.candidate_name || '').toLowerCase().includes(query)
      );
    }

    if (filters.dateRange === 'today') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      result = result.filter(a => new Date(a.created_at) >= today);
    } else if (filters.dateRange === 'week') {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      result = result.filter(a => new Date(a.created_at) >= weekAgo);
    }

    return result;
  }, [outreachActivities, filters]);

  const sortedOutreach = useMemo(() => {
    const sorted = [...filteredOutreach];

    sorted.sort((a, b) => {
      let aValue, bValue;

      switch(sortConfig.key) {
        case 'name':
          aValue = (a.candidate_name || '').toLowerCase();
          bValue = (b.candidate_name || '').toLowerCase();
          break;
        case 'position':
          aValue = (a.positions?.title || '').toLowerCase();
          bValue = (b.positions?.title || '').toLowerCase();
          break;
        case 'status':
          aValue = a.activity_status;
          bValue = b.activity_status;
          break;
        case 'rating':
          aValue = a.rating || 0;
          bValue = b.rating || 0;
          break;
        case 'created_at':
          aValue = new Date(a.created_at);
          bValue = new Date(b.created_at);
          break;
        default:
          return 0;
      }

      if (aValue < bValue) {
        return sortConfig.direction === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortConfig.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });

    return sorted;
  }, [filteredOutreach, sortConfig]);

  const paginatedOutreach = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return sortedOutreach.slice(startIndex, endIndex);
  }, [sortedOutreach, currentPage]);

  const totalPages = Math.ceil(sortedOutreach.length / itemsPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [filters]);

  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const setQuickFilter = (type) => {
    switch(type) {
      case 'today':
        setFilters(prev => ({ ...prev, dateRange: 'today' }));
        break;
      case 'week':
        setFilters(prev => ({ ...prev, dateRange: 'week' }));
        break;
      case 'followup':
        setFilters(prev => ({ ...prev, status: 'reply_received' }));
        break;
      case 'hotleads':
        setFilters(prev => ({ ...prev, rating: '5' }));
        break;
      case 'clear':
        setFilters({
          positionId: '',
          status: '',
          rating: '',
          searchQuery: '',
          dateRange: ''
        });
        break;
    }
  };

  // ===================================
  // ROW ACTIONS
  // ===================================

  const toggleRowExpansion = (rowId) => {
    setExpandedRowId(prev => prev === rowId ? null : rowId);
  };

  const handleDelete = async (activityId) => {
    if (!window.confirm('Are you sure you want to delete this outreach activity?')) {
      return;
    }

    const { success } = await deleteOutreachActivity(activityId);

    if (success) {
      await loadData();
    } else {
      alert('Error deleting activity');
    }
  };

  const handleEdit = (activity) => {
    setEditingActivity(activity);
  };

  const saveEdit = async () => {
    if (!editingActivity) return;

    const { success } = await updateOutreachActivity(editingActivity.id, {
      candidate_name: editingActivity.candidate_name,
      activity_status: editingActivity.activity_status,
      rating: editingActivity.rating,
      notes: editingActivity.notes
    });

    if (success) {
      setEditingActivity(null);
      await loadData();
    } else {
      alert('Error updating activity');
    }
  };

  // ===================================
  // RENDER
  // ===================================

  if (loading) {
    return (
      <div className="recruiter-outreach-page">
        <div className="loading-state">
          <p>Loading your outreach activities...</p>
        </div>
      </div>
    );
  }

  const openPositions = positions.filter(p => p.status === 'Open');

  return (
    <div className="recruiter-outreach-page">
      {/* Page Header */}
      <div className="outreach-page-header">
        <h1>📊 MY LINKEDIN OUTREACH</h1>
        <p className="outreach-page-subtitle">Track and manage your LinkedIn recruitment activities</p>
      </div>

      {/* Bulk Upload Card */}
      <div className="bulk-upload-card">
        <h3><Upload size={20} /> BULK UPLOAD OUTREACH</h3>

        {!bulkPreview ? (
          <>
            <textarea
              className="bulk-upload-textarea"
              placeholder="Paste LinkedIn URLs (one per line):&#10;https://linkedin.com/in/john-smith-12345&#10;https://linkedin.com/in/jane-doe-67890&#10;https://linkedin.com/in/mike-johnson-54321"
              value={bulkUploadText}
              onChange={(e) => setBulkUploadText(e.target.value)}
            />

            <select
              className="bulk-upload-position-select"
              value={selectedBulkPosition}
              onChange={(e) => setSelectedBulkPosition(e.target.value)}
            >
              <option value="">Select Position</option>
              {openPositions.map(pos => (
                <option key={pos.id} value={pos.id}>
                  {pos.title} @ {pos.clients?.company_name || 'N/A'}
                </option>
              ))}
            </select>

            <button
              className="btn-process-bulk"
              onClick={processBulkURLs}
              disabled={!bulkUploadText.trim() || !selectedBulkPosition}
            >
              <Upload size={16} />
              Process & Add ({bulkUploadText.split('\n').filter(l => l.trim() && l.includes('linkedin.com')).length} URLs detected)
            </button>
          </>
        ) : (
          <div className="bulk-upload-preview">
            <h4>✅ Preview ({bulkPreview.length} contacts):</h4>
            <ul>
              {bulkPreview.map(contact => (
                <li key={contact.id}>
                  {contact.editable ? (
                    <input
                      type="text"
                      value={contact.name}
                      onChange={(e) => editBulkName(contact.id, e.target.value)}
                      style={{
                        background: 'var(--secondary-bg)',
                        border: '1px solid var(--border-color)',
                        color: 'var(--text-primary)',
                        padding: '0.25rem 0.5rem',
                        borderRadius: '4px'
                      }}
                    />
                  ) : (
                    contact.name
                  )}
                </li>
              ))}
            </ul>
            <div className="bulk-upload-actions">
              <button className="btn-confirm-bulk" onClick={confirmBulkUpload} disabled={processingBulk}>
                {processingBulk ? 'Adding...' : '✅ Confirm & Add All'}
              </button>
              <button className="btn-cancel-bulk" onClick={cancelBulkUpload}>
                ❌ Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Filters Card */}
      <div className="filters-card">
        <h3><Filter size={20} /> FILTERS & SEARCH</h3>

        <div className="filters-grid">
          <div className="filter-group">
            <label>Position:</label>
            <select
              className="filter-select"
              value={filters.positionId}
              onChange={(e) => setFilters(prev => ({ ...prev, positionId: e.target.value }))}
            >
              <option value="">All Positions</option>
              {openPositions.map(pos => (
                <option key={pos.id} value={pos.id}>
                  {pos.title}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label>Status:</label>
            <select
              className="filter-select"
              value={filters.status}
              onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
            >
              <option value="">All Statuses</option>
              <option value="outreach_sent">Outreach Sent</option>
              <option value="reply_received">Reply Received</option>
              <option value="call_scheduled">Call Scheduled</option>
              <option value="cold">Cold</option>
              <option value="completed">Completed</option>
            </select>
          </div>

          <div className="filter-group">
            <label>Rating:</label>
            <select
              className="filter-select"
              value={filters.rating}
              onChange={(e) => setFilters(prev => ({ ...prev, rating: e.target.value }))}
            >
              <option value="">All Ratings</option>
              <option value="5">5 Stars</option>
              <option value="4">4+ Stars</option>
              <option value="3">3+ Stars</option>
            </select>
          </div>

          <div className="filter-group">
            <label>Search:</label>
            <input
              type="text"
              className="filter-search-input"
              placeholder="Search by name..."
              value={filters.searchQuery}
              onChange={(e) => setFilters(prev => ({ ...prev, searchQuery: e.target.value }))}
            />
          </div>
        </div>

        <div className="quick-filters">
          <button
            className={`quick-filter-btn ${filters.dateRange === 'today' ? 'active' : ''}`}
            onClick={() => setQuickFilter('today')}
          >
            Today
          </button>
          <button
            className={`quick-filter-btn ${filters.dateRange === 'week' ? 'active' : ''}`}
            onClick={() => setQuickFilter('week')}
          >
            This Week
          </button>
          <button
            className={`quick-filter-btn ${filters.status === 'reply_received' ? 'active' : ''}`}
            onClick={() => setQuickFilter('followup')}
          >
            Needs Follow-up
          </button>
          <button
            className={`quick-filter-btn ${filters.rating === '5' ? 'active' : ''}`}
            onClick={() => setQuickFilter('hotleads')}
          >
            Hot Leads (5⭐)
          </button>
          <button
            className="quick-filter-btn"
            onClick={() => setQuickFilter('clear')}
          >
            Clear All
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="outreach-table-container">
        <div className="outreach-table-header">
          <h3>📋 MY OUTREACH ACTIVITY</h3>
          <span className="outreach-table-count">({sortedOutreach.length} contacts)</span>
        </div>

        {paginatedOutreach.length === 0 ? (
          <div className="empty-outreach-state">
            <h3>No outreach activities found</h3>
            <p>Use the bulk upload above to add contacts</p>
          </div>
        ) : (
          <>
            <table className="outreach-table">
              <thead>
                <tr>
                  <th className="sortable" onClick={() => handleSort('name')}>
                    Name
                    {sortConfig.key === 'name' && (
                      <span className="sort-indicator">
                        {sortConfig.direction === 'asc' ? '▲' : '▼'}
                      </span>
                    )}
                  </th>
                  <th className="sortable" onClick={() => handleSort('position')}>
                    Position
                    {sortConfig.key === 'position' && (
                      <span className="sort-indicator">
                        {sortConfig.direction === 'asc' ? '▲' : '▼'}
                      </span>
                    )}
                  </th>
                  <th className="sortable" onClick={() => handleSort('status')}>
                    Status
                    {sortConfig.key === 'status' && (
                      <span className="sort-indicator">
                        {sortConfig.direction === 'asc' ? '▲' : '▼'}
                      </span>
                    )}
                  </th>
                  <th className="sortable" onClick={() => handleSort('rating')}>
                    Rating
                    {sortConfig.key === 'rating' && (
                      <span className="sort-indicator">
                        {sortConfig.direction === 'asc' ? '▲' : '▼'}
                      </span>
                    )}
                  </th>
                  <th className="sortable" onClick={() => handleSort('created_at')}>
                    Last Activity
                    {sortConfig.key === 'created_at' && (
                      <span className="sort-indicator">
                        {sortConfig.direction === 'asc' ? '▲' : '▼'}
                      </span>
                    )}
                  </th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedOutreach.map((activity) => {
                  const status = getStatusBadge(activity.activity_status);
                  const isExpanded = expandedRowId === activity.id;

                  return (
                    <React.Fragment key={activity.id}>
                      <tr
                        className={isExpanded ? 'expanded' : ''}
                        onClick={() => toggleRowExpansion(activity.id)}
                      >
                        <td className="candidate-name-cell">
                          {activity.candidate_name || 'Unknown'}
                        </td>
                        <td className="position-cell">
                          {activity.positions?.title || 'N/A'}
                        </td>
                        <td>
                          <span className={`status-badge ${status.class}`}>
                            {status.emoji} {status.label}
                          </span>
                        </td>
                        <td>
                          <StarRatingDisplay rating={activity.rating || 0} />
                        </td>
                        <td className="last-activity-cell">
                          {getTimeAgo(activity.created_at)}
                        </td>
                        <td onClick={(e) => e.stopPropagation()}>
                          <div className="actions-cell">
                            <a
                              href={activity.linkedin_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="btn-action"
                              title="View LinkedIn"
                            >
                              <ExternalLink size={16} />
                            </a>
                            <button
                              className="btn-action"
                              onClick={() => handleEdit(activity)}
                              title="Edit"
                            >
                              <Edit size={16} />
                            </button>
                            <button
                              className="btn-action delete"
                              onClick={() => handleDelete(activity.id)}
                              title="Delete"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>

                      {isExpanded && (
                        <tr className="expanded-row-details">
                          <td colSpan="6">
                            <div className="expanded-row-content">
                              <div className="detail-section">
                                <h4>Contact Info</h4>
                                <div className="detail-item">
                                  <span className="detail-label">Name:</span>
                                  <span className="detail-value">{activity.candidate_name || 'N/A'}</span>
                                </div>
                                <div className="detail-item">
                                  <span className="detail-label">LinkedIn:</span>
                                  <a
                                    href={activity.linkedin_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="detail-value link"
                                  >
                                    View Profile <ExternalLink size={14} />
                                  </a>
                                </div>
                              </div>

                              <div className="detail-section">
                                <h4>Activity Details</h4>
                                <div className="detail-item">
                                  <span className="detail-label">Position:</span>
                                  <span className="detail-value">{activity.positions?.title || 'N/A'}</span>
                                </div>
                                <div className="detail-item">
                                  <span className="detail-label">Status:</span>
                                  <span className="detail-value">{status.label}</span>
                                </div>
                                <div className="detail-item">
                                  <span className="detail-label">Rating:</span>
                                  <span className="detail-value">
                                    <StarRatingDisplay rating={activity.rating || 0} />
                                  </span>
                                </div>
                              </div>

                              <div className="detail-section">
                                <h4>Timeline</h4>
                                <div className="detail-item">
                                  <span className="detail-label">Created:</span>
                                  <span className="detail-value">
                                    {new Date(activity.created_at).toLocaleString()}
                                  </span>
                                </div>
                                <div className="detail-item">
                                  <span className="detail-label">Last Updated:</span>
                                  <span className="detail-value">
                                    {activity.updated_at ? new Date(activity.updated_at).toLocaleString() : 'N/A'}
                                  </span>
                                </div>
                              </div>

                              <div className="notes-section">
                                <h4>Notes</h4>
                                <div className="notes-content">
                                  {activity.notes || 'No notes added yet'}
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>

            {/* Pagination */}
            <div className="table-pagination">
              <span className="pagination-info">
                Showing {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, sortedOutreach.length)} of {sortedOutreach.length}
              </span>
              <div className="pagination-controls">
                <button
                  className="btn-page"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                >
                  ◀ Previous
                </button>
                <span className="btn-page active">
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
            </div>
          </>
        )}
      </div>

      {/* Edit Modal */}
      {editingActivity && (
        <div className="modal-overlay" onClick={() => setEditingActivity(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Edit Outreach Activity</h2>
              <button className="btn-close" onClick={() => setEditingActivity(null)}>&times;</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Candidate Name</label>
                <input
                  type="text"
                  value={editingActivity.candidate_name || ''}
                  onChange={(e) => setEditingActivity({ ...editingActivity, candidate_name: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Status</label>
                <select
                  value={editingActivity.activity_status}
                  onChange={(e) => setEditingActivity({ ...editingActivity, activity_status: e.target.value })}
                >
                  <option value="outreach_sent">Outreach Sent</option>
                  <option value="reply_received">Reply Received</option>
                  <option value="call_scheduled">Call Scheduled</option>
                  <option value="cold">Cold</option>
                  <option value="completed">Completed</option>
                </select>
              </div>
              <div className="form-group">
                <label>Rating</label>
                <select
                  value={editingActivity.rating || 0}
                  onChange={(e) => setEditingActivity({ ...editingActivity, rating: parseInt(e.target.value) })}
                >
                  <option value="0">No Rating</option>
                  <option value="1">1 Star</option>
                  <option value="2">2 Stars</option>
                  <option value="3">3 Stars</option>
                  <option value="4">4 Stars</option>
                  <option value="5">5 Stars</option>
                </select>
              </div>
              <div className="form-group">
                <label>Notes</label>
                <textarea
                  value={editingActivity.notes || ''}
                  onChange={(e) => setEditingActivity({ ...editingActivity, notes: e.target.value })}
                  rows={4}
                />
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setEditingActivity(null)}>Cancel</button>
              <button className="btn-primary" onClick={saveEdit}>Save Changes</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default RecruiterOutreach;
