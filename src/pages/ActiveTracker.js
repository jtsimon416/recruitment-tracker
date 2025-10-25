import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../services/supabaseClient';
import { useData } from '../contexts/DataContext';
import { useLocation, useNavigate } from 'react-router-dom';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Search, ChevronDown, ChevronUp, Binoculars, FileText } from 'lucide-react';
import { useConfirmation } from '../contexts/ConfirmationContext';
import PageTransition from '../components/PageTransition';
import WordDocViewerModal from '../components/Worddocviewermodal';
import '../styles/ActiveTracker.css';

// --- COMPONENT: Info Sidebar for Candidate Details ---
const InfoSidebar = ({ candidate, onClose }) => {
    if (!candidate) return null;
    
    const skillsArray = candidate.skills ? candidate.skills.split(',').map(s => s.trim()).filter(s => s) : [];

    return (
        <div className="info-sidebar-overlay" onClick={onClose}>
            <div className="info-sidebar" onClick={(e) => e.stopPropagation()}>
                <div className="sidebar-header-custom">
                    <h2>Candidate Deep Dive</h2>
                    <button onClick={onClose} className="btn-close-sidebar" type="button">&times;</button>
                </div>
                
                <div className="sidebar-section">
                    <h3>Personal Info</h3>
                    <p><strong>Name:</strong> {candidate.name}</p>
                    <p><strong>Email:</strong> {candidate.email}</p>
                    <p><strong>Phone:</strong> {candidate.phone || 'N/A'}</p>
                    <p><strong>Location:</strong> {candidate.location || 'N/A'}</p>
                    <p><strong>LinkedIn:</strong> {candidate.linkedin_url ? 
                        <a href={candidate.linkedin_url} target="_blank" rel="noopener noreferrer" className="btn-link">View Profile</a> : 'N/A'}
                    </p>
                </div>

                <div className="sidebar-section">
                    <h3>Resume Link</h3>
                    {candidate.resume_url ? (
                        <a href={candidate.resume_url} target="_blank" rel="noopener noreferrer" className="btn-primary" style={{display: 'block', textAlign: 'center', margin: '15px 0'}}>
                            View Original Document
                        </a>
                    ) : (
                        <p>No original resume file link available.</p>
                    )}
                </div>

                <div className="sidebar-section">
                    <h3>Skills & Keywords ({skillsArray.length})</h3>
                    <div className="skills-full-list">
                        {skillsArray.length > 0 ?
                            skillsArray.map((skill, index) => (
                                <span key={index} className="skill-tag-full">{skill}</span>
                            )) : <p>No skills recorded.</p>}
                    </div>
                </div>

                <div className="sidebar-section">
                    <h3>Recruiter Notes</h3>
                    <p className="notes-text-large">{candidate.notes || 'No detailed notes provided.'}</p>
                </div>
            </div>
        </div>
    );
};

function ActiveTracker() {
  const { showConfirmation } = useConfirmation();
  const { 
    pipeline, 
    setPipeline,
    positions, 
    recruiters, 
    loading, 
    refreshData,
    newCommentCandidateIds, 
    clearCommentNotifications, 
    user, 
    createNotification 
  } = useData();
  const location = useLocation();
  
  const openPositions = useMemo(() => {
    return positions.filter(pos => pos.status === 'Open');
  }, [positions]);
  
  const navigate = useNavigate();
  const [view, setView] = useState('list');
  const [expandedCard, setExpandedCard] = useState(null);
  const [showCommentsModal, setShowCommentsModal] = useState(false);
  const [selectedPipelineEntry, setSelectedPipelineEntry] = useState(null);
  const [comments, setComments] = useState([]);
  const [commentData, setCommentData] = useState({ comment_text: '' });
  const [editingComment, setEditingComment] = useState(null);
  const [editingText, setEditingText] = useState('');
  
  const [showInfoSidebar, setShowInfoSidebar] = useState(false);
  const [sidebarCandidate, setSidebarCandidate] = useState(null);

  // NEW: Word Doc Viewer Modal State
  const [showWordDocModal, setShowWordDocModal] = useState(false);
  const [wordDocUrl, setWordDocUrl] = useState('');
  const [wordDocCandidateName, setWordDocCandidateName] = useState('');

  const [notificationModal, setNotificationModal] = useState({ isOpen: false, type: null, data: null });
  const [selectedPosition, setSelectedPosition] = useState('all');
  const [selectedRecruiter, setSelectedRecruiter] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedStage, setSelectedStage] = useState('all'); 
  const [sortConfig, setSortConfig] = useState({ key: 'candidates.name', direction: 'ascending' });
  const [confirmDeleteId, setConfirmDeleteId] = useState(null); 

  const [pendingMove, setPendingMove] = useState(null);

  const DIRECTOR_EMAIL = 'brian.griffiths@brydongama.com';

  const stages = ['Screening', 'Submit to Client', 'Interview 1', 'Interview 2', 'Interview 3', 'Offer', 'Hired'];
  const statuses = ['Active', 'Hold', 'Reject'];
  
  useEffect(() => {
    if (location.state?.candidateId && location.state?.positionId) {
      const matchingEntry = pipeline.find(
        entry => entry.candidate_id === location.state.candidateId && entry.position_id === location.state.positionId
      );
      if (matchingEntry) {
        setExpandedCard(matchingEntry.id);
      }
    }
  }, [location.state, pipeline]);

  useEffect(() => {
    if (pendingMove) {
      const { pipelineId, newStage, oldStage, pipelineItem } = pendingMove;
      const isDirector = user?.email === DIRECTOR_EMAIL;

      if (isDirector) {
        setNotificationModal({
          isOpen: true,
          type: 'stage_change',
          data: { 
            pipelineId, 
            newStage, 
            oldStage, 
            candidateName: pipelineItem.candidates?.name, 
            recruiterName: pipelineItem.recruiters?.name, 
            recruiterEmail: pipelineItem.recruiters?.email,
            positionTitle: pipelineItem.positions?.title 
          }
        });
      } else {
        // RECRUITER MOVED CANDIDATE - NO NOTIFICATION!
        const updateAndHandle = async () => {
          const success = await updateCandidateStage(pipelineId, newStage);
          if (!success) {
            // Revert the change if it failed
            setPipeline(prevPipeline =>
              prevPipeline.map(p => (p.id === pipelineId ? { ...p, stage: oldStage } : p))
            );
          }
          // ✅ REMOVED: No notification sent to Director when recruiter moves candidate
        };
        updateAndHandle();
      }
      setPendingMove(null);
    }
  }, [pendingMove, user, pipeline, DIRECTOR_EMAIL]);
  
  async function updateCandidateStage(id, newStage) {
    const { error } = await supabase
      .from('pipeline')
      .update({ stage: newStage })
      .eq('id', id);

    if (error) {
      console.error('Error updating stage:', error);
      showConfirmation({
        type: 'error',
        title: 'Error',
        message: `Error updating stage: ${error.message}`,
        confirmText: 'OK',
        cancelText: null,
        onConfirm: () => {}
      });
      return false;
    } else {
      await refreshData();
      return true;
    }
  }
  
  async function updateCandidateStatus(id, newStatus) {
    const { error } = await supabase
      .from('pipeline')
      .update({ status: newStatus })
      .eq('id', id);

    if (error) {
      console.error('Error updating status:', error);
      showConfirmation({
        type: 'error',
        title: 'Error',
        message: `Error updating status: ${error.message}`,
        confirmText: 'OK',
        cancelText: null,
        onConfirm: () => {}
      });
    } else {
      await refreshData();
    }
  }
  
  async function removeCandidateFromPipeline(id) {
    const { error } = await supabase
      .from('pipeline')
      .update({ stage: 'Archived' })
      .eq('id', id);

    if (error) {
      console.error('Error removing candidate:', error);
      showConfirmation({
        type: 'error',
        title: 'Error',
        message: `Error removing candidate: ${error.message}`,
        confirmText: 'OK',
        cancelText: null,
        onConfirm: () => {}
      });
    } else {
      await refreshData();
      setConfirmDeleteId(null);
    }
  }
  
  const handleStageChange = (pipelineId, newStage) => {
    const pipelineItem = pipeline.find(p => p.id === pipelineId);
    if (!pipelineItem) return;
    
    const oldStage = pipelineItem.stage;
    setPipeline(prevPipeline =>
      prevPipeline.map(p => (p.id === pipelineId ? { ...p, stage: newStage } : p))
    );
    
    setPendingMove({ pipelineId, newStage, oldStage, pipelineItem });
  };

  const confirmStageChange = async () => {
    const { pipelineId, newStage, oldStage, candidateName, recruiterName, recruiterEmail, positionTitle } = notificationModal.data;
    const success = await updateCandidateStage(pipelineId, newStage);
    if (success) {
      await createNotification({
        type: 'stage_change_director',
        recipient: recruiterEmail,
        message: `Director moved ${candidateName} from "${oldStage}" to "${newStage}" for ${positionTitle}.`
      });
    } else {
      setPipeline(prevPipeline =>
        prevPipeline.map(p => (p.id === pipelineId ? { ...p, stage: oldStage } : p))
      );
    }
    setNotificationModal({ isOpen: false, type: null, data: null });
  };

  const cancelStageChange = () => {
    const { isOpen, type, data } = notificationModal;
    if (isOpen && type === 'stage_change') {
      if (data?.pipelineId && data?.oldStage) {
        setPipeline(prevPipeline =>
          prevPipeline.map(p => p.id === data.pipelineId ? { ...p, stage: data.oldStage } : p)
        );
      }
    }
    setNotificationModal({ isOpen: false, type: null, data: null });
  };

  const closeNotificationModal = () => {
    const { isOpen, type, data } = notificationModal;
    if (isOpen) {
      if (type === 'stage_change') {
        setPipeline(prevPipeline =>
          prevPipeline.map(p => (p.id === data.pipelineId ? { ...p, stage: data.oldStage } : p))
        );
      }
      setNotificationModal({ isOpen: false, type: null, data: null });
    }
  };

  const handleDragEnd = (result) => {
    const { source, destination, draggableId } = result;
    if (!destination || source.droppableId === destination.droppableId) return;
    
    handleStageChange(draggableId, destination.droppableId);
  };
  
  const handleStatusChange = (id, newStatus) => {
    setPipeline(prevPipeline =>
      prevPipeline.map(p => (p.id === id ? { ...p, status: newStatus } : p))
    );
    updateCandidateStatus(id, newStatus);
  };
  
  const handleScheduleInterview = (candidateId, candidateName, positionId, positionTitle) => {
    navigate('/interview-hub', {
      state: {
        fromActiveTracker: {
          candidate_id: candidateId,
          candidate_name: candidateName,
          position_id: positionId,
          position_title: positionTitle,
          isScheduling: true, // Flag to auto-open modal
        },
      },
    });
  };
  const handleRemove = (id) => {
    if (confirmDeleteId === id) {
      removeCandidateFromPipeline(id);
    } else {
      setConfirmDeleteId(id);
    }
  };
  
  const handleOpenInfoSidebar = (candidate) => {
    setSidebarCandidate(candidate);
    setShowInfoSidebar(true);
  };

  // NEW: Handle Resume Click - PDFs open in new tab, Word docs open in modal
  const handleResumeClick = (e, resumeUrl, candidateName) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (resumeUrl.includes('.docx')) {
      // Open Word doc in modal
      setWordDocUrl(resumeUrl);
      setWordDocCandidateName(candidateName);
      setShowWordDocModal(true);
    } else {
      // Open PDF in new tab
      window.open(resumeUrl, '_blank');
    }
  };
  
  const openCommentsModal = async (pipelineEntry) => {
    setSelectedPipelineEntry(pipelineEntry);
    setShowCommentsModal(true);
    await fetchComments(pipelineEntry.candidate_id);
    clearCommentNotifications(pipelineEntry.candidate_id);
  };
  
  async function fetchComments(candidateId) {
    const { data, error } = await supabase
      .from('comments')
      .select(`
        id,
        candidate_id,
        comment_text,
        author_name,
        user_id,
        created_at
      `)
      .eq('candidate_id', candidateId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching comments:', error);
      setComments([]);
    } else {
      setComments(data || []);
    }
  }
  
  async function handleAddComment(e) {
    e.preventDefault();
    if (!commentData.comment_text.trim()) return;

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      showConfirmation({
        type: 'error',
        title: 'Error',
        message: 'You must be logged in to comment',
        confirmText: 'OK',
        cancelText: null,
        onConfirm: () => {}
      });
      return;
    }

    const { data: recruiterProfile } = await supabase
      .from('recruiters')
      .select('name')
      .eq('email', user.email)
      .single();

    let authorName;
    if (recruiterProfile?.name) {
      authorName = recruiterProfile.name;
    } else {
      const emailName = user.email.split('@')[0];
      authorName = emailName
        .split('.')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
    }

    const { error } = await supabase
      .from('comments')
      .insert([{
        candidate_id: selectedPipelineEntry.candidate_id,
        comment_text: commentData.comment_text.trim(),
        user_id: user.id,
        author_name: authorName
      }]);

    if (error) {
      console.error('Add comment error:', error);
      showConfirmation({
        type: 'error',
        title: 'Error',
        message: `Error adding comment: ${error.message}`,
        confirmText: 'OK',
        cancelText: null,
        onConfirm: () => {}
      });
    } else {
      setCommentData({ comment_text: '' });
      await fetchComments(selectedPipelineEntry.candidate_id);
    }
  }
  
  const handleEditComment = (comment) => {
    setEditingComment(comment);
    setEditingText(comment.comment_text);
  };
  
  async function handleUpdateComment(e) {
    e.preventDefault();
    if (!editingText.trim()) return;

    const { error } = await supabase
      .from('comments')
      .update({ comment_text: editingText })
      .eq('id', editingComment.id);

    if (error) {
      showConfirmation({
        type: 'error',
        title: 'Error',
        message: `Error updating comment: ${error.message}`,
        confirmText: 'OK',
        cancelText: null,
        onConfirm: () => {}
      });
    } else {
      await fetchComments(selectedPipelineEntry.candidate_id);
      setEditingComment(null);
      setEditingText('');
    }
  }
  
  async function handleDeleteComment(commentId) {
    showConfirmation({
      type: 'delete',
      title: 'Delete Comment?',
      message: 'This action cannot be undone. The comment will be permanently removed.',
      confirmText: 'Delete',
      cancelText: 'Keep',
      onConfirm: async () => {
        const { error } = await supabase
          .from('comments')
          .delete()
          .eq('id', commentId);

        if (error) {
          showConfirmation({
            type: 'error',
            title: 'Error',
            message: `Error deleting comment: ${error.message}`,
            confirmText: 'OK',
            cancelText: null,
            onConfirm: () => {}
          });
        } else {
          await fetchComments(selectedPipelineEntry.candidate_id);
        }
      }
    });
  }
  
  const filteredAndSortedPipeline = useMemo(() => {
    let filtered = pipeline;
    
    if (selectedPosition !== 'all') {
      filtered = filtered.filter(item => item.position_id === selectedPosition);
    }
    
    if (selectedRecruiter !== 'all') {
      filtered = filtered.filter(item => item.recruiter_id === selectedRecruiter);
    }
    
    if (selectedStatus !== 'all') {
      filtered = filtered.filter(item => item.status === selectedStatus);
    }
    
    if (selectedStage !== 'all') {
      filtered = filtered.filter(item => item.stage === selectedStage);
    }
    
    const sorted = [...filtered].sort((a, b) => {
      let aValue, bValue;
      
      if (sortConfig.key === 'candidates.name') {
        aValue = a.candidates?.name || '';
        bValue = b.candidates?.name || '';
      } else if (sortConfig.key === 'recruiters.name') {
        aValue = a.recruiters?.name || '';
        bValue = b.recruiters?.name || '';
      } else {
        aValue = a[sortConfig.key] || '';
        bValue = b[sortConfig.key] || '';
      }
      
      if (aValue < bValue) return sortConfig.direction === 'ascending' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'ascending' ? 1 : -1;
      return 0;
    });
    
    return sorted;
  }, [pipeline, selectedPosition, selectedRecruiter, selectedStatus, selectedStage, sortConfig]);
  
  const requestSort = (key) => {
    let direction = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };
  
  const getSortIndicator = (key) => {
    if (sortConfig.key !== key) return null;
    return sortConfig.direction === 'ascending' ? ' ↑' : ' ↓';
  };

  const groupedByPosition = useMemo(() => {
    const grouped = {};
    filteredAndSortedPipeline.forEach(item => {
      const posTitle = item.positions?.title || 'Unknown Position';
      if (!grouped[posTitle]) grouped[posTitle] = [];
      grouped[posTitle].push(item);
    });
    return grouped;
  }, [filteredAndSortedPipeline]);
  
  const renderListView = () => {
    return (
      <div className="list-view">
        {!loading && filteredAndSortedPipeline.length === 0 ? (
          <div className="empty-state"><h3>No matching pipeline entries</h3><p>Adjust your filters or add candidates to get started.</p></div>
        ) : !loading && (
          Object.keys(groupedByPosition).map(posTitle => (
            <div key={posTitle} className="position-section">
              <h2 className="position-section-title">{posTitle}</h2>
              <div className="pipeline-table">
                <div className="pipeline-header">
                  <div onClick={() => requestSort('candidates.name')}>Candidate{getSortIndicator('candidates.name')}</div>
                  <div onClick={() => requestSort('recruiters.name')}>Recruiter{getSortIndicator('recruiters.name')}</div>
                  <div>Phone</div>
                  <div onClick={() => requestSort('status')}>Status{getSortIndicator('status')}</div>
                  <div onClick={() => requestSort('stage')}>Stage{getSortIndicator('stage')}</div>
                  <div>Actions</div>
                </div>
                {groupedByPosition[posTitle].map(item => (
                  <React.Fragment key={item.id}>
                    <div className={`pipeline-row status-${(item.status || 'active').toLowerCase()} ${newCommentCandidateIds.includes(item.candidate_id) ? 'has-new-comment' : ''}`} onClick={() => setExpandedCard(expandedCard === item.id ? null : item.id)}>
                      <div className="candidate-name-cell">
                        <strong>{item.candidates?.name}</strong>
                        <Binoculars 
                          size={18} 
                          className="icon-view-details" 
                          onClick={(e) => { e.stopPropagation(); handleOpenInfoSidebar(item.candidates); }}
                          title="View Full Details"
                        />
                        {item.candidates?.resume_url && (
                          <a 
                            href="#" 
                            className="icon-view-resume" 
                            onClick={(e) => handleResumeClick(e, item.candidates.resume_url, item.candidates.name)}
                            title="View Resume"
                          >
                            <FileText size={18} />
                          </a>
                        )}
                        {newCommentCandidateIds.includes(item.candidate_id) && <div className="indicator-dot-small" title="New feedback available"></div>}
                      </div>
                      <div>{item.recruiters?.name}</div>
                      <div>{item.candidates?.phone || 'N/A'}</div>
                      <div>
                        <select className="status-select" value={item.status || 'Active'} onChange={(e) => { e.stopPropagation(); handleStatusChange(item.id, e.target.value); }} onClick={(e) => e.stopPropagation()}>
                          {statuses.map(status => <option key={status} value={status}>{status}</option>)}
                        </select>
                      </div>
                      <div>
                        <select className="stage-select" value={item.stage} onChange={(e) => { e.stopPropagation(); handleStageChange(item.id, e.target.value); }} onClick={(e) => e.stopPropagation()}>
                          {stages.map(stage => <option key={stage} value={stage}>{stage}</option>)}
                        </select>
                      </div>
                      <div className="actions-cell">
                         <div className="comments-button-wrapper">
                            <button className="btn-comments" onClick={(e) => { e.stopPropagation(); openCommentsModal(item); }}>Comments</button>
                         </div>
                         <button 
                            className="btn-secondary" 
                            onClick={(e) => { e.stopPropagation(); handleScheduleInterview(item.candidates.id, item.candidates.name, item.position_id, item.positions.title); }}
                          >
                            Schedule Interview
                          </button>
                         <button className={`btn-remove ${confirmDeleteId === item.id ? 'confirm-delete' : ''}`} onClick={(e) => { e.stopPropagation(); handleRemove(item.id); }}>
                            {confirmDeleteId === item.id ? 'Confirm Delete' : 'Remove'} 
                         </button>
                      </div>
                    </div>
                    {expandedCard === item.id && item.candidates?.notes && (<div className="pipeline-row-notes"><strong>Notes:</strong> {item.candidates.notes}</div>)}
                  </React.Fragment>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    );
  };
  
  const renderPipelineView = () => {
    return (
      <div className="pipeline-view">
        {filteredAndSortedPipeline.length === 0 && selectedStage !== 'all' ? (
          <div className="empty-state"><h3>No candidates in this stage</h3><p>Adjust your filters to see candidates.</p></div>
        ) : (
          <DragDropContext onDragEnd={handleDragEnd}>
            <div className="pipeline-columns">
              {stages.map(stage => {
                const stageItems = selectedStage === 'all' 
                  ? filteredAndSortedPipeline.filter(item => item.stage === stage)
                  : (selectedStage === stage ? filteredAndSortedPipeline : []);
                
                return (
                  <Droppable key={stage} droppableId={stage}>
                    {(provided, snapshot) => (
                      <div className={`pipeline-column ${snapshot.isDraggingOver ? 'dragging-over' : ''}`} ref={provided.innerRef} {...provided.droppableProps}>
                        <div className="column-header">
                          <h3>{stage}</h3>
                          <span className="column-count">{stageItems.length}</span>
                        </div>
                        <div className="column-cards">
                          {stageItems.map((item, index) => (
                            <Draggable key={item.id} draggableId={item.id} index={index}>
                              {(provided, snapshot) => (
                                <div 
                                  className={`pipeline-card ${snapshot.isDragging ? 'dragging' : ''} status-${(item.status || 'active').toLowerCase()} ${newCommentCandidateIds.includes(item.candidate_id) ? 'has-new-comment' : ''}`}
                                  ref={provided.innerRef} 
                                  {...provided.draggableProps} 
                                  {...provided.dragHandleProps}
                                >
                                  <div className="card-header">
                                    <strong>{item.candidates?.name}</strong>
                                    <div className="card-icons">
                                      <Binoculars 
                                        size={16} 
                                        className="icon-view-details" 
                                        onClick={() => handleOpenInfoSidebar(item.candidates)}
                                        title="View Full Details"
                                      />
                                      {item.candidates?.resume_url && (
                                        <a 
                                          href="#" 
                                          className="icon-view-resume" 
                                          onClick={(e) => handleResumeClick(e, item.candidates.resume_url, item.candidates.name)}
                                          title="View Resume"
                                        >
                                          <FileText size={16} />
                                        </a>
                                      )}
                                      {newCommentCandidateIds.includes(item.candidate_id) && <div className="indicator-dot-small" title="New feedback available"></div>}
                                    </div>
                                  </div>                                  <div className="card-body">
                                    <div className="card-info-row">
                                      <span className="card-label">Position:</span>
                                      <span className="card-value">{item.positions?.title}</span>
                                    </div>
                                    <div className="card-info-row">
                                      <span className="card-label">Recruiter:</span>
                                      <span className="card-value">{item.recruiters?.name}</span>
                                    </div>
                                    <div className="card-info-row">
                                      <span className="card-label">Phone:</span>
                                      <span className="card-value">{item.candidates?.phone || 'N/A'}</span>
                                    </div>
                                    <select className="status-select" value={item.status || 'Active'} onChange={(e) => handleStatusChange(item.id, e.target.value)}>
                                      {statuses.map(status => <option key={status} value={status}>{status}</option>)}
                                    </select>
                                  </div>
                                  <div className="card-actions">
                                    <button className="btn-comments" onClick={() => openCommentsModal(item)}>Comments</button>
                                    <button 
                                      className="btn-secondary" 
                                      onClick={() => handleScheduleInterview(item.candidate_id, item.candidates.name, item.position_id, item.positions.title)}
                                    >
                                      Schedule Interview
                                    </button>
                                    <button className={`btn-remove ${confirmDeleteId === item.id ? 'confirm-delete' : ''}`} onClick={() => handleRemove(item.id)}>
                                       {confirmDeleteId === item.id ? 'Confirm Delete' : 'Remove'}
                                    </button>
                                  </div>
                                </div>
                              )}
                            </Draggable>
                          ))}
                          {provided.placeholder}
                        </div>
                      </div>
                    )}
                  </Droppable>
                );
              })}
            </div>
          </DragDropContext>
        )}
      </div>
    );
  };
  
  return (
    <PageTransition isLoading={loading}>
      <div className="page-container">
      <div className="page-header">
        <h1>Active Tracker</h1>
        <div className="header-controls">
          <select className="position-filter" value={selectedStage} onChange={(e) => setSelectedStage(e.target.value)}><option value="all">All Stages</option>{stages.map(stage => <option key={stage} value={stage}>{stage}</option>)}</select>          <select className="position-filter" value={selectedPosition} onChange={(e) => setSelectedPosition(e.target.value)}><option value="all">All Positions</option>{openPositions.map(pos => <option key={pos.id} value={pos.id}>{pos.title}</option>)}</select>
          <select className="position-filter" value={selectedRecruiter} onChange={(e) => setSelectedRecruiter(e.target.value)}><option value="all">All Recruiters</option>{recruiters.map(rec => <option key={rec.id} value={rec.id}>{rec.name}</option>)}</select>
          <select className="position-filter" value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value)}><option value="all">All Statuses</option>{statuses.map(status => <option key={status} value={status}>{status}</option>)}</select>
          <div className="view-toggle"><button className={`toggle-btn ${view === 'list' ? 'active' : ''}`} onClick={() => setView('list')}>List</button><button className={`toggle-btn ${view === 'pipeline' ? 'active' : ''}`} onClick={() => setView('pipeline')}>Pipeline</button></div>
        </div>
      </div>
      
      {view === 'list' ? renderListView() : renderPipelineView()}
      
      {showInfoSidebar && <InfoSidebar candidate={sidebarCandidate} onClose={() => setShowInfoSidebar(false)} />}

      {/* NEW: Word Doc Viewer Modal */}
      <WordDocViewerModal 
        isOpen={showWordDocModal}
        onClose={() => setShowWordDocModal(false)}
        resumeUrl={wordDocUrl}
        candidateName={wordDocCandidateName}
      />
      
      {showCommentsModal && (
        <div className="modal-overlay" onClick={() => setShowCommentsModal(false)}>
          <div className="modal-content comments-modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Comments for {selectedPipelineEntry?.candidates?.name}</h2>
            <form onSubmit={handleAddComment} className="comment-form">
              <textarea value={commentData.comment_text} onChange={(e) => setCommentData({ comment_text: e.target.value })} placeholder="Add a comment..." required />
              <button type="submit" className="btn-primary">Add Comment</button>
            </form>
            <div className="comments-section">
              <h3>Comment History</h3>
              <div className="comments-list">
                {comments.length === 0 ? (
                  <p className="empty-comments">No comments yet.</p>
                ) : (
                  comments.map(comment => (
                    <div key={comment.id} className="comment-item">
                      {editingComment?.id === comment.id ? (
                        <form onSubmit={handleUpdateComment} className="edit-comment-form">
                          <textarea value={editingText} onChange={(e) => setEditingText(e.target.value)} required />
                          <div className="edit-comment-actions">
                            <button type="submit" className="btn-primary">Save</button>
                            <button type="button" className="btn-secondary" onClick={() => { setEditingComment(null); setEditingText(''); }}>Cancel</button>
                          </div>
                        </form>
                      ) : (
                        <>
                          <div className="comment-header">
                            <strong>{comment.author_name || 'Unknown'}</strong>
                            <span className="comment-date">{new Date(comment.created_at).toLocaleString()}</span>
                          </div>
                          <p className="comment-text">{comment.comment_text}</p>
                          {comment.user_id === user?.id && (
                            <div className="comment-actions">
                              <button onClick={() => handleEditComment(comment)} className="btn-edit-comment">Edit</button>
                              <button onClick={() => handleDeleteComment(comment.id)} className="btn-delete-comment">Delete</button>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
            <button onClick={() => setShowCommentsModal(false)} className="btn-secondary modal-close-btn">Close</button>
          </div>
        </div>
      )}
      
      {notificationModal.isOpen && notificationModal.type === 'stage_change' && (
        <div className="modal-overlay" onClick={closeNotificationModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Confirm Stage Change</h2>
            <p><strong>{notificationModal.data.candidateName}</strong> was moved from <strong>{notificationModal.data.oldStage}</strong> to <strong>{notificationModal.data.newStage}</strong> by <strong>{notificationModal.data.recruiterName}</strong> for position <strong>{notificationModal.data.positionTitle}</strong>.</p>
            <p>Do you approve this change?</p>
            <div className="modal-actions">
              <button onClick={confirmStageChange} className="btn-primary">Approve</button>
              <button onClick={cancelStageChange} className="btn-secondary">Reject</button>
            </div>
          </div>
        </div>
      )}
      </div>
    </PageTransition>
  );
}

export default ActiveTracker;