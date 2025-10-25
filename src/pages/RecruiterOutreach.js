import React, { useState, useEffect, useMemo } from 'react';
import { useData } from '../contexts/DataContext';
import { useConfirmation } from '../contexts/ConfirmationContext';
import { supabase } from '../services/supabaseClient';
import { motion, AnimatePresence } from 'framer-motion'; // Keep AnimatePresence
import { useNavigate } from 'react-router-dom';
import mammoth from 'mammoth';
import {
  ExternalLink, Eye, Edit, Trash2, ChevronUp, ChevronDown,
  Upload, Search, Filter, X, Star, Calendar, FileText, Bell, AlertCircle,
  ArrowRightLeft
} from 'lucide-react';
import DocumentViewerModal from '../components/DocumentViewerModal';

// --- ADDED: Imports for the new Date/Time Picker ---
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
// ---------------------------------------------------

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
// UTILITY: Normalize LinkedIn URL
// ===================================
function normalizeLinkedInURL(url) {
  try {
    if (!url) return null;

    // Convert to lowercase
    let normalized = url.toLowerCase().trim();

    // Remove protocol (http://, https://)
    normalized = normalized.replace(/^https?:\/\//, '');

    // Remove www.
    normalized = normalized.replace(/^www\./, '');

    // Remove trailing slash
    normalized = normalized.replace(/\/$/, '');

    // Remove query parameters and fragments
    normalized = normalized.split('?')[0].split('#')[0];

    return normalized;
  } catch (error) {
    console.error('Error normalizing URL:', error);
    return url;
  }
}

// ===================================
// UTILITY: Get Status Badge Info
// ===================================
const getStatusBadge = (status) => {
  const statusMap = {
    'outreach_sent': { label: 'Outreach Sent', emoji: '🟡', class: 'outreach-sent', color: '#e0af68' },
    'reply_received': { label: 'Reply Received', emoji: '🟢', class: 'reply-received', color: '#9ece6a' },
    'accepted': { label: 'Accepted', emoji: '✅', class: 'accepted', color: '#73daca' },
    'call_scheduled': { label: 'Call Scheduled', emoji: '🔵', class: 'call-scheduled', color: '#7aa2f7' },
    'declined': { label: 'Declined', emoji: '❌', class: 'declined', color: '#f7768e' },
    'ready_for_submission': { label: 'Ready for Submission', emoji: '🚀', class: 'ready-submission', color: '#bb9af7' },
    'gone_cold': { label: 'Gone Cold', emoji: '❄️', class: 'gone-cold', color: '#64748b' }
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
// COMPONENT: MY ACTIVE ROLES
// ===================================
const MyActiveRoles = ({ userProfile }) => {
  const [activeRoles, setActiveRoles] = useState([]);
  const [roleInstructions, setRoleInstructions] = useState({});
  const [loading, setLoading] = useState(true);
  const [viewingDocument, setViewingDocument] = useState(null);

  useEffect(() => {
    if (userProfile?.id) {
      fetchMyActiveRoles();
    }
    // Add userProfile as a dependency
  }, [userProfile]);

  const fetchMyActiveRoles = async () => {
    console.log('🔍 Fetching all open roles for recruiter:', userProfile.id);
    setLoading(true);

    try {
      // Fetch all open position details directly
      const { data: positionsData, error: positionsError } = await supabase
        .from('positions')
        .select('*, clients(company_name)')
        .eq('status', 'Open'); // No ordering here, we sort later

      if (positionsError) throw positionsError;
      
      const openPositions = positionsData || [];
      console.log('✅ Fetched all open roles:', openPositions);
      setActiveRoles(openPositions); // Set unsorted roles first

      // If there are open positions, get their IDs to fetch instructions
      if (openPositions.length > 0) {
        const positionIds = openPositions.map(p => p.id);
        await fetchRoleInstructionsForPositions(positionIds);
      }
      
    } catch (error) {
      console.error('❌ Error fetching active roles:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRoleInstructionsForPositions = async (positionIds) => {
    console.log('🔍 Fetching role instructions for positions:', positionIds);

    try {
      const { data, error } = await supabase
        .from('role_instructions')
        .select('*')
        .in('position_id', positionIds)
        .order('uploaded_at', { ascending: false }); // Newest instruction first

      if (error) throw error;

      console.log('✅ Fetched role instructions:', data);

      // Group by position_id
      const grouped = {};
      if (data) {
        data.forEach(doc => {
          if (!grouped[doc.position_id]) {
            grouped[doc.position_id] = [];
          }
          grouped[doc.position_id].push(doc);
        });
      }

      setRoleInstructions(grouped);
    } catch (error) {
      console.error('❌ Error fetching role instructions:', error);
    }
  };

  // NEW: Sort roles by the most recent instruction date
  const sortedActiveRoles = useMemo(() => {
    return [...activeRoles].sort((a, b) => {
      // Find the most recent instruction for each role (it's the first in the list)
      const mostRecentA = roleInstructions[a.id]?.[0]?.uploaded_at;
      const mostRecentB = roleInstructions[b.id]?.[0]?.uploaded_at;

      // If both have instructions, sort by date
      if (mostRecentA && mostRecentB) {
        return new Date(mostRecentB) - new Date(mostRecentA);
      }
      // If only A has instructions, it comes first
      if (mostRecentA) return -1;
      // If only B has instructions, it comes first
      if (mostRecentB) return 1;
      // If neither has instructions, keep original order
      return 0; 
    });
  }, [activeRoles, roleInstructions]);


  const hasNewInstructions = (document) => {
    if (!document) return false;
    const viewedBy = Array.isArray(document.viewed_by) ? document.viewed_by : [];
    return !viewedBy.includes(userProfile.id);
  };

  const handleViewInstructions = async (document, position) => {
    console.log('👁️ Opening instructions document:', document.id);
    setViewingDocument({
      document,
      position
    });
  };

  const handleMarkAsViewed = async (documentId, positionId, fileName) => {
    try {
      console.log('✅ Marking document as viewed:', documentId);

      // Fetch current viewed_by array for this document
      const { data: currentData, error: fetchError } = await supabase
        .from('role_instructions')
        .select('viewed_by')
        .eq('id', documentId)
        .single();

      if (fetchError) throw fetchError;

      const viewedBy = Array.isArray(currentData.viewed_by) ? currentData.viewed_by : [];

      if (!viewedBy.includes(userProfile.id)) {
        // Add recruiter to viewed_by array
        const { error: updateError } = await supabase
          .from('role_instructions')
          .update({
            viewed_by: [...viewedBy, userProfile.id]
          })
          .eq('id', documentId);

        if (updateError) throw updateError;

        // Create audit log
        await supabase
          .from('pipeline_audit_log')
          .insert({
            position_id: positionId,
            event_type: 'role_instructions_viewed',
            performed_by: userProfile.id,
            notes: `Recruiter viewed instructions: ${fileName}`,
            metadata: { document_id: documentId, filename: fileName },
            created_at: new Date().toISOString()
          });

        console.log('✅ Document marked as viewed');

        // Refresh active roles and instructions
        await fetchMyActiveRoles();
      }
    } catch (error) {
      console.error('❌ Error marking document as viewed:', error);
    }
  };

  if (loading) {
    return (
      <div className="my-active-roles-section">
        <p style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
          Loading your active roles...
        </p>
      </div>
    );
  }

  if (activeRoles.length === 0) {
    return null; // Don't show section if no active roles
  }

  return (
    <>
      <div className="my-active-roles-section">
        <h2 className="active-roles-title">🎯 MY ACTIVE ROLES</h2>
        {/* THIS IS THE SECTION WE ARE MODIFYING (THE GRID) */}
        <div className="active-roles-grid">
          {/* UPDATED: Map over sortedActiveRoles instead of activeRoles */}
          {sortedActiveRoles.map((position) => {
            const documents = roleInstructions[position.id] || [];
            
            return (
              <motion.div
                key={position.id}
                className="active-role-card"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <div className="active-role-header">
                  <h3 className="active-role-title">{position.title}</h3>
                  <p className="active-role-company">
                    @ {position.clients?.company_name || 'N/A'}
                  </p>
                </div>

                {/* Role Instructions - Multiple Documents */}
                {documents.length > 0 && (
                  <div className="role-instructions-section">
                    <h4 className="role-instructions-header">
                      📋 Role Instructions ({documents.length})
                    </h4>
                    {/* THIS IS THE LIST WE WILL MAKE SCROLLABLE */}
                    <div className="role-instructions-list">
                      {documents.map((doc) => {
                        const isNew = hasNewInstructions(doc);
                        const uploadDate = new Date(doc.uploaded_at).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric'
                        });

                        return (
                          <div key={doc.id} className="role-instructions-box">
                            <div className="instructions-header">
                              <div className="instructions-meta">
                                <span className="instructions-filename">
                                  <FileText size={14} />
                                  {doc.file_name || 'Role Instructions'}
                                </span>
                                <span className="instructions-date">
                                  <Calendar size={12} />
                                  {uploadDate}
                                </span>
                              </div>
                              {isNew && (
                                <div className="new-instructions-badge">
                                  <Bell size={14} />
                                  <span>NEW</span>
                                </div>
                              )}
                            </div>

                            {doc.notes && (
                              <div className="instructions-notes">
                                <strong>Manager Notes:</strong>
                                <p>{doc.notes}</p>
                              </div>
                            )}

                            <button
                              className="btn-view-instructions"
                              onClick={() => handleViewInstructions(doc, position)}
                            >
                              <Eye size={16} />
                              View Document
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Document Viewer Modal */}
      <AnimatePresence>
        {viewingDocument && (
          <DocumentViewerModal
            documentUrl={viewingDocument.document.file_url}
            documentTitle={`Role Instructions - ${viewingDocument.document.file_name || 'Document'}`}
            onClose={() => setViewingDocument(null)}
            onViewed={() => handleMarkAsViewed(
              viewingDocument.document.id,
              viewingDocument.position.id,
              viewingDocument.document.file_name
            )}
          />
        )}
      </AnimatePresence>
    </>
  );
};

// ===================================
// COMPONENT: Calls Dashboard
// ===================================
const MyCallsDashboard = ({ outreachActivities }) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const endOfToday = new Date(today);
  endOfToday.setHours(23, 59, 59, 999);

  const endOfWeek = new Date(today);
  endOfWeek.setDate(today.getDate() + 7);

  // Filter calls scheduled for today
  const callsToday = outreachActivities.filter(activity => {
    if (!activity.scheduled_call_date) return false;

    // --- MODIFIED: Added check for activity status ---
    if (activity.activity_status !== 'call_scheduled') return false;
    // -------------------------------------------------

    const callDate = new Date(activity.scheduled_call_date);
    return callDate >= today && callDate <= endOfToday;
  });

  // Filter calls scheduled this week
  const callsThisWeek = outreachActivities.filter(activity => {
    if (!activity.scheduled_call_date) return false;
    
    // --- MODIFIED: Added check for activity status ---
    if (activity.activity_status !== 'call_scheduled') return false;
    // -------------------------------------------------
    
    const callDate = new Date(activity.scheduled_call_date);
    return callDate > endOfToday && callDate <= endOfWeek;
  });

  const formatCallTime = (dateString) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const formatCallDay = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short'
    });
  };

  return (
    <div className="calls-dashboard-section">
      <div className="calls-dashboard-grid">
        {/* Calls Today */}
        <div className="calls-dashboard-card">
          <h3 className="calls-dashboard-title">
            <AlertCircle size={20} /> Calls Scheduled Today
          </h3>
          <div className="calls-list">
            {callsToday.length === 0 ? (
              <p className="no-calls-message">No calls scheduled for today.</p>
            ) : (
              <ul>
                {callsToday.map(activity => (
                  <li key={activity.id} className="call-item">
                    <div className="call-info-main">
                      <span className="call-time">
                        {formatCallTime(activity.scheduled_call_date)}
                      </span>
                      <div className="call-details">
                        <strong>{activity.candidate_name}</strong>
                        <span>{activity.positions?.title || 'N/A'}</span>
                      </div>
                    </div>
                    <a
                      href={activity.linkedin_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-call-linkedin"
                      title="View LinkedIn"
                    >
                      <ExternalLink size={16} />
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Calls This Week */}
        <div className="calls-dashboard-card">
          <h3 className="calls-dashboard-title">
            <Calendar size={20} /> Calls Scheduled This Week
          </h3>
          <div className="calls-list">
            {callsThisWeek.length === 0 ? (
              <p className="no-calls-message">No calls scheduled for this week.</p>
            ) : (
              <ul>
                {callsThisWeek.map(activity => (
                  <li key={activity.id} className="call-item">
                    <div className="call-info-main">
                      <span className="call-day-badge">
                        {formatCallDay(activity.scheduled_call_date)}
                      </span>
                      <div className="call-details">
                        <strong>{activity.candidate_name}</strong>
                        <span>{activity.positions?.title || 'N/A'}</span>
                      </div>
                    </div>
                    <a
                      href={activity.linkedin_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-call-linkedin"
                      title="View LinkedIn"
                    >
                      <ExternalLink size={16} />
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// ===================================
// COMPONENT: Quick Rating Modal
// ===================================
const QuickRatingScreen = ({ contacts, onComplete, showConfirmation }) => {
  const [ratings, setRatings] = useState({});
  const [processing, setProcessing] = useState(false);

  const updateRating = (contactId, rating) => {
    setRatings(prev => ({ ...prev, [contactId]: rating }));
  };

  const saveRatings = async () => {
    setProcessing(true);
    try {
      for (const contactId in ratings) {
        await supabase
          .from('recruiter_outreach')
          .update({ rating: ratings[contactId] })
          .eq('id', contactId);
      }

      showConfirmation({
        type: 'success',
        title: 'Success!',
        message: 'Ratings saved!'
      });
      onComplete();
    } catch (error) {
      showConfirmation({
        type: 'error',
        title: 'Error',
        message: `Error saving ratings: ${error.message}`
      });
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onComplete}>
      <motion.div
        className="modal-content quick-rating-modal"
        onClick={(e) => e.stopPropagation()}
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
      >
        <div className="modal-header">
          <h2>Quick Rating - {contacts.length} Contacts</h2>
          <button className="btn-close-modal" onClick={onComplete}>
            <X size={20} />
          </button>
        </div>
        <div className="modal-body">
          <p className="rating-instructions">
            Rate these contacts based on their profile quality (optional - you can skip):
          </p>
          <div className="quick-rating-list">
            {contacts.map(contact => (
              <div key={contact.id} className="quick-rating-item">
                <span className="contact-name">{contact.candidate_name}</span>
                <div className="star-rating-input">
                  {[1, 2, 3, 4, 5].map(star => (
                    <button
                      key={star}
                      type="button"
                      className={`star-btn ${(ratings[contact.id] || 0) >= star ? 'filled' : ''}`}
                      onClick={() => updateRating(contact.id, star)}
                    >
                      <Star size={20} fill={(ratings[contact.id] || 0) >= star ? '#FFD700' : 'none'} />
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn-secondary" onClick={onComplete}>
            Skip Ratings
          </button>
          <button className="btn-primary" onClick={saveRatings} disabled={processing}>
            {processing ? 'Saving...' : 'Save Ratings'}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

// ===================================
// MAIN COMPONENT
// ===================================
function RecruiterOutreach() {
  const navigate = useNavigate();
  const { showConfirmation } = useConfirmation();
  const { userProfile, fetchMyOutreachActivities, addOutreachActivity, updateOutreachActivity, deleteOutreachActivity, positions, fetchPositions } = useData();

  // --- ADDED: Reusable list of stages for dropdowns ---
  const outreachStages = [
    { value: 'outreach_sent', label: 'Outreach Sent' },
    { value: 'reply_received', label: 'Reply Received' },
    { value: 'accepted', label: 'Accepted' },
    { value: 'call_scheduled', label: 'Call Scheduled' },
    { value: 'declined', label: 'Declined' },
    { value: 'ready_for_submission', label: 'Ready for Submission' },
    { value: 'gone_cold', label: 'Gone Cold' }
  ];
  // ----------------------------------------------------

  // Data State
  const [outreachActivities, setOutreachActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  // Bulk Upload State
  const [bulkUploadText, setBulkUploadText] = useState('');
  const [selectedBulkPosition, setSelectedBulkPosition] = useState('');
  const [bulkPreview, setBulkPreview] = useState(null);
  const [processingBulk, setProcessingBulk] = useState(false);

  // Quick Rating State
  const [showQuickRating, setShowQuickRating] = useState(false);
  const [newlyAddedContacts, setNewlyAddedContacts] = useState([]);

  // Filter State
  const [filters, setFilters] = useState({
    positionId: '',
    status: '',
    rating: '',
    searchQuery: '',
    dateRange: '',
    followup_needed: false
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
  const [showPipelineModal, setShowPipelineModal] = useState(false);
  const [selectedOutreach, setSelectedOutreach] = useState(null);
  const [existingCandidateId, setExistingCandidateId] = useState(null);

  // Edit Modal State
  const [editingActivity, setEditingActivity] = useState(null);

  // --- ADDED: State for quick stage-change dropdown ---
  const [quickEditingStageId, setQuickEditingStageId] = useState(null);
  // ----------------------------------------------------

  // --- ADDED: State for notification banner ---
  const [showGoneColdBanner, setShowGoneColdBanner] = useState(true);
  // ----------------------------------------------------

  // --- ADDED: State for duplicate detection ---
  const [checkingDuplicates, setCheckingDuplicates] = useState(false);
  const [duplicatesFound, setDuplicatesFound] = useState([]);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  // ----------------------------------------------------
  const [activeTab, setActiveTab] = useState('roles'); // 'roles' will be the default tab

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
  // DUPLICATE CHECK FUNCTION - THREE SCENARIO LOGIC
  // ===================================
  // SCENARIO 1: Hard Block - Actively Owned (in pipeline or active outreach)
  // SCENARIO 2: Allow & Re-engage - In Talent Pool but Available
  // SCENARIO 3: New Candidate - Not found anywhere

  const checkForDuplicates = async (urls) => {
    try {
      const duplicatesFound = [];
      const allowedUrls = [];

      for (const url of urls) {
        const normalizedUrl = normalizeLinkedInURL(url);

        // SCENARIO 1a: Hard Block - Check if in Active Pipeline
        // First, find the candidate by LinkedIn URL (normalize for comparison)
        const { data: allCandidatesForPipeline } = await supabase
          .from('candidates')
          .select('id, name, linkedin_url');

        const candidateForPipeline = allCandidatesForPipeline?.find(candidate =>
          normalizeLinkedInURL(candidate.linkedin_url) === normalizedUrl
        );

        if (candidateForPipeline) {
          // Now check if this candidate is in active pipeline
          const { data: pipelineCheck } = await supabase
            .from('pipeline')
            .select('id, candidate_id, recruiters(name), positions(title), status')
            .eq('candidate_id', candidateForPipeline.id)
            .eq('status', 'Active')
            .maybeSingle();

          if (pipelineCheck) {
            duplicatesFound.push({
              url: url,
              candidateName: candidateForPipeline.name,
              location: `Active Pipeline - ${pipelineCheck.positions?.title || 'Unknown Position'}`,
              owner: pipelineCheck.recruiters?.name || 'Unknown Recruiter'
            });
            continue;
          }
        }

        // SCENARIO 1b: Hard Block - Check if in Active Outreach (not gone_cold or declined)
        const { data: outreachCheck } = await supabase
          .from('recruiter_outreach')
          .select('id, candidate_name, recruiters(name), positions(title), activity_status')
          .eq('linkedin_url', normalizedUrl)
          .not('activity_status', 'in', '(gone_cold,declined)')
          .maybeSingle();

        if (outreachCheck) {
          duplicatesFound.push({
            url: url,
            candidateName: outreachCheck.candidate_name,
            location: `Active Outreach - ${outreachCheck.positions?.title || 'Unknown Position'}`,
            owner: outreachCheck.recruiters?.name || 'Unknown Recruiter'
          });
          continue;
        }

        // SCENARIO 2: Allow & Re-engage - Check if in Talent Pool
        // We need to fetch ALL candidates and normalize their URLs for comparison
        // because the database might store URLs with https:// prefix
        const { data: allCandidates } = await supabase
          .from('candidates')
          .select('id, name, linkedin_url');

        // Find a match by normalizing each candidate's URL
        const talentPoolMatch = allCandidates?.find(candidate =>
          normalizeLinkedInURL(candidate.linkedin_url) === normalizedUrl
        );

        if (talentPoolMatch) {
          // Found in Talent Pool, not actively owned - ALLOW
          allowedUrls.push({
            url: url,
            candidateId: talentPoolMatch.id,
            candidateName: talentPoolMatch.name,
            isReengagement: true
          });
          continue;
        }

        // SCENARIO 3: New Candidate - Not found anywhere
        allowedUrls.push({
          url: url,
          candidateId: null,
          candidateName: extractNameFromLinkedInURL(url) || 'Unknown Name',
          isReengagement: false
        });
      }

      return { duplicatesFound, allowedUrls };

    } catch (error) {
      console.error('Error checking for duplicates:', error);
      showConfirmation({
        type: 'error',
        title: 'Error',
        message: 'Error checking for duplicates. Please try again.'
      });
      return { duplicatesFound: [], allowedUrls: [] };
    }
  };

  // ===================================
  // BULK UPLOAD FUNCTIONS
  // ===================================

  const processBulkURLs = () => {
    if (!bulkUploadText.trim()) {
      showConfirmation({
        type: 'warning',
        title: 'Missing Input',
        message: 'Please paste some LinkedIn URLs'
      });
      return;
    }

    if (!selectedBulkPosition) {
      showConfirmation({
        type: 'warning',
        title: 'Missing Selection',
        message: 'Please select a position'
      });
      return;
    }

    const urls = bulkUploadText
      .split('\n')
      .map(url => url.trim())
      .filter(url => url && url.includes('linkedin.com'));

    if (urls.length === 0) {
      showConfirmation({
        type: 'warning',
        title: 'No URLs Found',
        message: 'No valid LinkedIn URLs found'
      });
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

    // --- UPDATED: Three-scenario duplicate check ---
    setCheckingDuplicates(true);

    try {
      const urlsToCheck = bulkPreview.map(contact => contact.url);
      const { duplicatesFound, allowedUrls } = await checkForDuplicates(urlsToCheck);

      setCheckingDuplicates(false);

      if (duplicatesFound.length > 0) {
        // Duplicates found - block upload and show modal
        setDuplicatesFound(duplicatesFound);
        setShowDuplicateModal(true);
        return; // Stop the upload process
      }

      // No duplicates - proceed with upload of allowed URLs
      setProcessingBulk(true);

      const insertData = allowedUrls.map(item => ({
        recruiter_id: userProfile.id,
        position_id: selectedBulkPosition,
        linkedin_url: item.url,
        candidate_name: item.candidateName,
        activity_status: 'outreach_sent',
        rating: 0,
        followup_needed: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }));

      const { data, error } = await supabase
        .from('recruiter_outreach')
        .insert(insertData)
        .select();

      if (error) throw error;

      // Show success message with re-engagement count
      const reengagementCount = allowedUrls.filter(u => u.isReengagement).length;
      const newCount = allowedUrls.length - reengagementCount;

      let message = `Successfully added ${allowedUrls.length} contact${allowedUrls.length === 1 ? '' : 's'}!`;
      if (reengagementCount > 0) {
        message += ` (${reengagementCount} re-engaged from Talent Pool)`;
      }

      showConfirmation({
        type: 'success',
        title: 'Success!',
        message: message
      });

      setBulkUploadText('');
      setSelectedBulkPosition('');
      setBulkPreview(null);

      await loadData();

      // Show quick rating screen
      if (data && data.length > 0) {
        setNewlyAddedContacts(data);
        setShowQuickRating(true);
      }

    } catch (error) {
      console.error('Error bulk uploading:', error);
      showConfirmation({
        type: 'error',
        title: 'Error',
        message: `Error adding contacts: ${error.message}`
      });
      setCheckingDuplicates(false);
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

  const handleQuickRatingComplete = async () => {
    setShowQuickRating(false);
    setNewlyAddedContacts([]);
    await loadData();
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

    if (filters.followup_needed) {
      result = result.filter(a => a.followup_needed === true);
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
          bValue = a.rating || 0;
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

  // --- ADDED: Identify outreach items going cold (4+ days old with status 'outreach_sent') ---
  const goingColdOutreach = useMemo(() => {
    const fourDaysAgo = new Date();
    fourDaysAgo.setDate(fourDaysAgo.getDate() - 4);

    return outreachActivities.filter(activity => {
      if (activity.activity_status !== 'outreach_sent') return false;
      const createdDate = new Date(activity.created_at);
      return createdDate <= fourDaysAgo;
    });
  }, [outreachActivities]);
  // ----------------------------------------------------

  useEffect(() => {
    setCurrentPage(1);
  }, [filters]);

  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  // --- MODIFIED: Quick filters are now toggleable ---
  const setQuickFilter = (type) => {
    switch(type) {
      case 'today':
        setFilters(prev => ({ 
          ...prev, 
          // If it's already 'today', toggle it off, otherwise set it to 'today'
          dateRange: prev.dateRange === 'today' ? '' : 'today', 
          // Deactivate other quick filters
          followup_needed: false,
          rating: '' 
        }));
        break;
      case 'week':
        setFilters(prev => ({ 
          ...prev, 
          // If it's already 'week', toggle it off, otherwise set it to 'week'
          dateRange: prev.dateRange === 'week' ? '' : 'week', 
          // Deactivate other quick filters
          followup_needed: false,
          rating: '' 
        }));
        break;
      case 'followup':
        setFilters(prev => ({ 
          ...prev, 
          // Toggle followup_needed
          followup_needed: !prev.followup_needed,
          // Deactivate other quick filters
          dateRange: '',
          rating: ''
        }));
        break;
      case 'hotleads':
        setFilters(prev => ({ 
          ...prev, 
          // If it's already '5', toggle it off, otherwise set it to '5'
          rating: prev.rating === '5' ? '' : '5',
          // Deactivate other quick filters
          dateRange: '',
          followup_needed: false
        }));
        break;
      case 'clear':
        setFilters({
          positionId: '',
          status: '',
          rating: '',
          searchQuery: '',
          dateRange: '',
          followup_needed: false
        });
        break;
      default:
        break;
    }
  };
  // ----------------------------------------------------

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
      showConfirmation({
        type: 'error',
        title: 'Error',
        message: 'Error deleting activity'
      });
    }
  };

  const handleEdit = (activity) => {
    setEditingActivity({
      ...activity,
      scheduled_call_date: activity.scheduled_call_date || '',
      candidate_phone: activity.candidate_phone || ''
    });
  };

  const saveEdit = async () => {
    if (!editingActivity) return;

    const updates = {
      candidate_name: editingActivity.candidate_name,
      activity_status: editingActivity.activity_status,
      rating: editingActivity.rating,
      notes: editingActivity.notes,
      scheduled_call_date: editingActivity.scheduled_call_date || null,
      candidate_phone: editingActivity.candidate_phone || null,
      updated_at: new Date().toISOString()
    };

    // Auto-set followup_needed based on status
    if (editingActivity.activity_status === 'reply_received') {
      updates.followup_needed = true;
    } else if (['call_scheduled', 'declined', 'ready_for_submission', 'accepted'].includes(editingActivity.activity_status)) {
      updates.followup_needed = false;
    }

    const { success } = await updateOutreachActivity(editingActivity.id, updates);

    if (success) {
      setEditingActivity(null);
      await loadData();
    } else {
      showConfirmation({
        type: 'error',
        title: 'Error',
        message: 'Error updating activity'
      });
    }
  };

  // --- MODIFIED: Handler for the quick stage-change button ---
  const handleQuickStageChange = async (activityId, newStage) => {
    // If the new stage is 'Call Scheduled', open the edit modal instead of saving directly
    if (newStage === 'call_scheduled') {
      // Find the activity details first
      const activityToEdit = outreachActivities.find(act => act.id === activityId);
      if (activityToEdit) {
        
        // --- ADDED: Immediately update status before opening modal ---
        try {
            const updates = {
                activity_status: newStage,
                updated_at: new Date().toISOString(),
                // Auto-set followup needed
                followup_needed: false 
            };
            const { success } = await updateOutreachActivity(activityId, updates);
            if (!success) {
                throw new Error("Failed to pre-update status.");
            }
            // Update the local state immediately for the modal
            setOutreachActivities(prev => prev.map(act => act.id === activityId ? {...act, ...updates} : act));
             
            // Open the edit modal
            handleEdit({...activityToEdit, ...updates}); // Pass updated activity to modal
        } catch (error) {
             console.error("Error pre-updating status:", error);
             showConfirmation({
               type: 'error',
               title: 'Error',
               message: 'Could not update status before opening modal. Please try again.'
             });
        }
        // ------------------------------------------------------------------

      } else {
        console.error("Could not find activity to edit:", activityId);
        showConfirmation({
          type: 'error',
          title: 'Error',
          message: 'Error finding candidate details to open the modal.'
        });
      }
      setQuickEditingStageId(null); // Close the dropdown regardless
      return; // Stop execution here for call_scheduled
    }

    // --- Existing logic for other statuses ---
    const updates = {
      activity_status: newStage,
      updated_at: new Date().toISOString()
    };

    // Auto-set followup_needed based on status, just like in the modal
    if (newStage === 'reply_received') {
      updates.followup_needed = true;
    } else if (['declined', 'ready_for_submission', 'accepted'].includes(newStage)) { // Excluded call_scheduled
      updates.followup_needed = false;
    }

    // Call the update function from DataContext
    const { success } = await updateOutreachActivity(activityId, updates); // Use activityId directly

    if (success) {
      // Close the dropdown
      setQuickEditingStageId(null);
      // Refresh the data in the table
      await loadData();
    } else {
      showConfirmation({
        type: 'error',
        title: 'Error',
        message: 'Error updating status'
      });
      // Close dropdown even on error
      setQuickEditingStageId(null);
    }
  };
  // -----------------------------------------------------------

  const handleConvertToPipeline = async (outreach) => {
    // 1. Check if candidate exists based on LinkedIn URL
    if (!outreach.linkedin_url) { // Changed from candidate_linkedin to linkedin_url
      showConfirmation({ type: 'error', title: 'Missing URL', message: 'Please add a LinkedIn URL to this outreach log before converting.' });
      return;
    }

    const { data: existing, error } = await supabase
      .from('candidates')
      .select('id, name')
      .eq('linkedin_url', outreach.linkedin_url) // Changed from candidate_linkedin to linkedin_url
      .single();

    if (existing) {
      // SCENARIO 2: Candidate Exists
      setExistingCandidateId(existing.id);
      setSelectedOutreach(outreach);
      setShowPipelineModal(true);
    } else {
      // SCENARIO 1: New Candidate
      // Redirect to Talent Pool with state
      navigate('/talent-pool', { 
        state: { 
          fromOutreach: {
            name: outreach.candidate_name,
            linkedin_url: outreach.linkedin_url,
            notes: outreach.notes,
            position_id: outreach.position_id
          }
        } 
      });
    }
  };

  const handlePipelineSubmit = async (e) => {
    e.preventDefault();
    const positionId = e.target.position_id.value;
    const stage = e.target.stage.value;

    const { data: { user } } = await supabase.auth.getUser();
    const { data: recruiter } = await supabase.from('recruiters').select('id').eq('email', user.email).single();

    if (!recruiter) {
      showConfirmation({ type: 'error', title: 'Error', message: 'Could not find your recruiter profile.' });
      return;
    }

    const { error } = await supabase.from('pipeline').insert([{
      candidate_id: existingCandidateId,
      position_id: positionId,
      stage: stage,
      recruiter_id: recruiter.id
    }]);

    if (error) {
      showConfirmation({ type: 'error', title: 'Error', message: `Save failed: ${error.message}` });
    } else {
      showConfirmation({ type: 'success', title: 'Success!', message: 'Candidate added to pipeline.' });
      setShowPipelineModal(false);
      setSelectedOutreach(null);
      setExistingCandidateId(null);
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
      <div className="page-header">
        <h1>My Outreach</h1>
      </div>

      <div className="strategy-tabs">
        <button
          className={activeTab === 'roles' ? 'active' : ''}
          onClick={() => setActiveTab('roles')}
        >
          Active Roles & Calls
        </button>
        <button
          className={activeTab === 'sourcing' ? 'active' : ''}
          onClick={() => setActiveTab('sourcing')}
        >
          Sourcing & Outreach
        </button>
      </div>

      {activeTab === 'roles' && (
        <div className="tab-content">
          {/* MY ACTIVE ROLES Section */}
          <MyActiveRoles userProfile={userProfile} />
          {/* --- ADDED: Gone Cold Notification Banner --- */}
      {showGoneColdBanner && goingColdOutreach.length > 0 && (
        <div className="gone-cold-notification-banner">
          <div className="banner-content">
            <div className="banner-icon">⚠️</div>
            <div className="banner-message">
              <strong>The following contacts will be moved to 'Gone Cold' (no response in 4+ days):</strong>
              <span className="banner-names">
                {goingColdOutreach.map((activity, index) => (
                  <span key={activity.id}>
                    {activity.candidate_name || 'Unknown'}
                    {index < goingColdOutreach.length - 1 ? ', ' : ''}
                  </span>
                ))}
              </span>
              <p className="banner-note">Don't worry - if they reply later, you can still update their status!</p>
            </div>
          </div>
          <button
            className="banner-close-btn"
            onClick={() => setShowGoneColdBanner(false)}
            title="Dismiss notification"
          >
            <X size={20} />
          </button>
        </div>
      )}
      {/* -------------------------------------------- */}

          {/* Calls Dashboard */}
          <MyCallsDashboard outreachActivities={outreachActivities} />
        </div>
      )}

      {activeTab === 'sourcing' && (
        <div className="tab-content">
          <div className="outreach-table-section">
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
              <button className="btn-confirm-bulk" onClick={confirmBulkUpload} disabled={processingBulk || checkingDuplicates}>
                {checkingDuplicates ? 'Checking for duplicates...' : processingBulk ? 'Adding...' : '✅ Confirm & Add All'}
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
              {/* --- MODIFIED: Using the stages array for consistency --- */}
              {outreachStages.map(stage => (
                <option key={stage.value} value={stage.value}>{stage.label}</option>
              ))}
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

        {/* --- MODIFIED: Buttons are now wired to the updated toggle logic --- */}
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
            className={`quick-filter-btn ${filters.followup_needed ? 'active' : ''}`}
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
                            
                            {/* --- MODIFIED: Quick Stage-Change Button/Dropdown --- */}
                            {quickEditingStageId === activity.id ? (
                              <select
                                value={activity.activity_status}
                                onClick={(e) => e.stopPropagation()} // Prevent row click
                                onChange={(e) => {
                                  e.stopPropagation(); // Prevent row click
                                  // Pass activity.id instead of the full activity object
                                  handleQuickStageChange(activity.id, e.target.value); 
                                }}
                                onBlur={(e) => { // Close when clicking away
                                  e.stopPropagation();
                                  setQuickEditingStageId(null);
                                }}
                                autoFocus
                                style={{ // Inline styles to match theme
                                  backgroundColor: 'var(--secondary-bg)',
                                  color: 'var(--text-primary)',
                                  border: '1px solid var(--border-color)',
                                  borderRadius: '4px',
                                  padding: '2px',
                                  marginRight: '4px'
                                }}
                              >
                                {outreachStages.map(stage => (
                                  <option key={stage.value} value={stage.value}>
                                    {stage.label}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <button
                                className="btn-action"
                                onClick={(e) => {
                                  e.stopPropagation(); // Prevent row click
                                  setQuickEditingStageId(activity.id);
                                }}
                                title="Change Stage"
                              >
                                <ArrowRightLeft size={16} />
                              </button>
                            )}
                            {/* -------------------------------------------------- */}
                            
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
                      <tr>
                        <td colSpan="6" className="convert-to-pipeline-cell">
                          {activity.activity_status === 'ready_for_submission' && (
                            <button className="btn-primary" onClick={() => handleConvertToPipeline(activity)}>Convert to Pipeline</button>
                          )}
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
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingActivity && (
        <div className="modal-overlay" onClick={() => setEditingActivity(null)}>
          <motion.div
            className="modal-content edit-outreach-modal"
            onClick={(e) => e.stopPropagation()}
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
          >
            <div className="modal-header">
              <h2>Edit Outreach</h2>
              <button className="btn-close-modal" onClick={() => setEditingActivity(null)}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Candidate Name</label>
                <input
                  type="text"
                  className="form-input"
                  value={editingActivity.candidate_name || ''}
                  onChange={(e) => setEditingActivity({ ...editingActivity, candidate_name: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Status</label>
                <select
                  className="form-select"
                  value={editingActivity.activity_status}
                  onChange={(e) => setEditingActivity({ ...editingActivity, activity_status: e.target.value })}
                >
                  {/* --- MODIFIED: Using the stages array for consistency --- */}
                  {outreachStages.map(stage => (
                    <option key={stage.value} value={stage.value}>{stage.label}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Rating</label>
                <div className="star-rating-input">
                  {[1, 2, 3, 4, 5].map(star => (
                    <button
                      key={star}
                      type="button"
                      className={`star-btn ${(editingActivity.rating || 0) >= star ? 'filled' : ''}`}
                      onClick={() => setEditingActivity({ ...editingActivity, rating: star })}
                    >
                      <Star size={24} fill={(editingActivity.rating || 0) >= star ? '#FFD700' : 'none'} />
                    </button>
                  ))}
                  {(editingActivity.rating || 0) > 0 && (
                    <button
                      type="button"
                      className="btn-clear-rating"
                      onClick={() => setEditingActivity({ ...editingActivity, rating: 0 })}
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>
              {editingActivity.activity_status === 'call_scheduled' && (
                <>
                  <div className="form-group">
                    <label>Call Date & Time</label>
                    {/* --- MODIFIED: Replaced <input> with <DatePicker> --- */}
                    <DatePicker
                      selected={editingActivity.scheduled_call_date ? new Date(editingActivity.scheduled_call_date) : null}
                      onChange={(date) => setEditingActivity({
                        ...editingActivity,
                        scheduled_call_date: date ? date.toISOString() : ''
                      })}
                      showTimeSelect
                      timeFormat="p" // e.g., "4:00 PM"
                      timeIntervals={15} // 15 minute increments
                      dateFormat="MM/dd/yyyy h:mm aa"
                      className="form-input" // Use existing class
                      placeholderText="Click to select a date and time"
                      autoComplete="off"
                    />
                  </div>
                  {/* --------------------------------------------------- */}
                  <div className="form-group">
                    <label>Phone Number</label>
                    <input
                      type="tel"
                      className="form-input"
                      placeholder="(555) 123-4567"
                      value={editingActivity.candidate_phone || ''}
                      onChange={(e) => setEditingActivity({ ...editingActivity, candidate_phone: e.target.value })}
                    />
                  </div>
                </>
              )}
              <div className="form-group">
                <label>Notes</label>
                <textarea
                  className="form-textarea"
                  rows="4"
                  placeholder="Add notes about this contact..."
                  value={editingActivity.notes || ''}
                  // --- THIS IS THE LINE THAT WAS FIXED ---
                  onChange={(e) => setEditingActivity({ ...editingActivity, notes: e.target.value })}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setEditingActivity(null)}>Cancel</button>
              <button className="btn-primary" onClick={saveEdit}>Save Changes</button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Quick Rating Modal */}
      {showQuickRating && newlyAddedContacts.length > 0 && (
        <QuickRatingScreen
          contacts={newlyAddedContacts}
          onComplete={handleQuickRatingComplete}
          showConfirmation={showConfirmation}
        />
      )}

      {showPipelineModal && selectedOutreach && (
        <div className="modal-overlay" onClick={() => setShowPipelineModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Add to Pipeline</h2>
            <form onSubmit={handlePipelineSubmit}>
              <div className="form-group">
                <label>Position *</label>
                <select name="position_id" defaultValue={selectedOutreach.position_id} required>
                  {positions.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Stage</label>
                <select name="stage" defaultValue="Screening">
                  <option>Screening</option>
                  <option>Submit to Client</option>
                  {/* Add other stages if needed */}
                </select>
              </div>
              <div className="form-actions">
                <button type="submit" className="btn-primary">Add to Pipeline</button>
                <button type="button" className="btn-secondary" onClick={() => setShowPipelineModal(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- ADDED: Duplicate Detection Modal --- */}
      {showDuplicateModal && (
        <div className="modal-overlay" onClick={() => setShowDuplicateModal(false)}>
          <motion.div
            className="modal-content duplicate-alert-modal"
            onClick={(e) => e.stopPropagation()}
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
          >
            <div className="modal-header duplicate-modal-header">
              <h2>⚠️ Duplicate Candidates Detected</h2>
              <button className="btn-close-modal" onClick={() => setShowDuplicateModal(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              <p className="duplicate-alert-message">
                Found <strong>{duplicatesFound.length}</strong> duplicate(s) out of <strong>{bulkPreview?.length || 0}</strong> total URLs.
                Please remove these from your list before uploading:
              </p>
              <div className="duplicates-list">
                {duplicatesFound.map((duplicate, index) => (
                  <div key={index} className="duplicate-item">
                    <div className="duplicate-number">{index + 1}</div>
                    <div className="duplicate-details">
                      <div className="duplicate-name">{duplicate.candidateName}</div>
                      <div className="duplicate-url">{duplicate.url}</div>
                      <div className="duplicate-location">→ {duplicate.location}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="modal-footer">
              <button
                className="btn-primary"
                onClick={() => {
                  setShowDuplicateModal(false);
                  setDuplicatesFound([]);
                }}
              >
                OK, I'll Update My List
              </button>
            </div>
          </motion.div>
        </div>
      )}
      {/* -------------------------------------------- */}

    </div>
  );
}

export default RecruiterOutreach;