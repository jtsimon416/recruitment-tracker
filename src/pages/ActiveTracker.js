import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../services/supabaseClient';
import { useData } from '../contexts/DataContext';
import { useLocation } from 'react-router-dom';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import '../styles/ActiveTracker.css';

function ActiveTracker() {
  const { newCommentCandidateIds, clearCommentNotifications, user, createNotification } = useData();
  const location = useLocation();
  
  const [pipeline, setPipeline] = useState([]);
  const [positions, setPositions] = useState([]);
  const [recruiters, setRecruiters] = useState([]);
  const [view, setView] = useState('list');
  const [expandedCard, setExpandedCard] = useState(null);
  const [showCommentsModal, setShowCommentsModal] = useState(false);
  const [selectedPipelineEntry, setSelectedPipelineEntry] = useState(null);
  const [comments, setComments] = useState([]);
  const [commentData, setCommentData] = useState({ comment_text: '' });
  const [editingComment, setEditingComment] = useState(null);
  const [editingText, setEditingText] = useState('');
  const [loading, setLoading] = useState(true);

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
    const loadData = async () => {
      await Promise.all([fetchPipeline(), fetchPositions(), fetchRecruiters()]);
      setLoading(false);
    };
    loadData();
  }, []);
  
  useEffect(() => {
    if (pendingMove) {
      const { pipelineId, newStage, oldStage, pipelineItem } = pendingMove;
      const isDirector = user?.email === DIRECTOR_EMAIL;

      if (isDirector) {
        setNotificationModal({
          isOpen: true,
          type: 'stage_change',
          data: { pipelineId, newStage, oldStage, candidateName: pipelineItem.candidates?.name, recruiterName: pipelineItem.recruiters?.name, positionTitle: pipelineItem.positions?.title }
        });
      } else {
        const updateAndHandle = async () => {
          const success = await updateCandidateStage(pipelineId, newStage);
          if (!success) {
            setPipeline(prevPipeline =>
              prevPipeline.map(p => (p.id === pipelineId ? { ...p, stage: oldStage } : p))
            );
          }
        };
        updateAndHandle();
      }
      setPendingMove(null); 
    }
  }, [pendingMove, user]);


  async function fetchPipeline() {
    const { data: pipelineData, error: pipelineError } = await supabase.from('pipeline').select('*, candidates(*), positions(*, clients(*)), recruiters(*)').order('created_at', { ascending: false });
    if (pipelineError) console.error('Error fetching pipeline:', pipelineError);
    else setPipeline(pipelineData || []);
  }

  async function fetchPositions() {
    const { data, error } = await supabase.from('positions').select('*').eq('status', 'Open').order('title');
    if (error) console.error('Error fetching positions:', error);
    else setPositions(data || []);
  }

  async function fetchRecruiters() {
    const { data, error } = await supabase.from('recruiters').select('*').order('name');
    if (error) console.error('Error fetching recruiters:', error);
    else setRecruiters(data || []);
  }

  async function fetchComments(candidateId) {
    const { data, error } = await supabase.from('comments').select('*').eq('candidate_id', candidateId).order('created_at', { ascending: false });
    if (error) console.error('Error fetching comments:', error);
    else setComments(data || []);
  }

  const filteredAndSortedPipeline = useMemo(() => {
    let filtered = [...pipeline];
    if (selectedPosition !== 'all') filtered = filtered.filter(p => p.position_id === selectedPosition);
    if (selectedRecruiter !== 'all') filtered = filtered.filter(p => p.recruiter_id === parseInt(selectedRecruiter));
    if (selectedStatus !== 'all') filtered = filtered.filter(p => (p.status || 'Active') === selectedStatus);
    if (selectedStage !== 'all') filtered = filtered.filter(p => p.stage === selectedStage);
    if (sortConfig.key) {
      filtered.sort((a, b) => {
        if (sortConfig.key === 'stage') {
          const aIndex = stages.indexOf(a.stage);
          const bIndex = stages.indexOf(b.stage);
          if (aIndex < bIndex) return sortConfig.direction === 'ascending' ? -1 : 1;
          if (aIndex > bIndex) return sortConfig.direction === 'ascending' ? 1 : -1;
          return 0;
        }
        const getNestedValue = (obj, path) => path.split('.').reduce((o, k) => (o || {})[k], obj);
        const aValue = getNestedValue(a, sortConfig.key);
        const bValue = getNestedValue(b, sortConfig.key);
        if (aValue < bValue) return sortConfig.direction === 'ascending' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'ascending' ? 1 : -1;
        return 0;
      });
    }
    return filtered;
  }, [pipeline, selectedPosition, selectedRecruiter, selectedStatus, selectedStage, sortConfig]);

  const requestSort = (key) => {
    let direction = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') direction = 'descending';
    setSortConfig({ key, direction });
  };
  
  const getSortIndicator = (key) => {
    if (sortConfig.key !== key) return ' ';
    return sortConfig.direction === 'ascending' ? ' ▲' : ' ▼';
  };
  
  const updateCandidateStage = async (pipelineId, newStage) => {
    const { error } = await supabase
      .from('pipeline')
      .update({ stage: newStage, updated_at: new Date().toISOString() })
      .eq('id', pipelineId);
      
    if (error) {
      console.error('[DB] Error updating stage:', error.message);
      alert('Error updating stage. Reverting change.');
      return false;
    }
    return true;
  };

  const handleStageChange = (pipelineId, newStage) => {
    const pipelineItem = pipeline.find(p => p.id === pipelineId);
    if (!pipelineItem || pipelineItem.stage === newStage) return;

    const updatedPipeline = pipeline.map(p => p.id === pipelineId ? { ...p, stage: newStage } : p);
    setPipeline(updatedPipeline);

    setPendingMove({ pipelineId, newStage, oldStage: pipelineItem.stage, pipelineItem });
  };
  
  // --- BUG FIX START ---
  // This function now handles ID type mismatches, which was the root cause of the error.
  const handleOnDragEnd = (result) => {
    const { destination, source, draggableId } = result;

    if (!destination || (destination.droppableId === source.droppableId && destination.index === source.index)) {
      return;
    }

    // Keep draggableId as a string to ensure consistent comparison
    const pipelineIdAsString = draggableId; 
    
    // Find the item by comparing its ID (converted to a string) with the draggableId
    const pipelineItem = pipeline.find(p => p.id.toString() === pipelineIdAsString);

    // If the item isn't found for any reason, abort to prevent a crash.
    if (!pipelineItem) {
        console.error(`[DRAG END] Could not find pipeline item with ID: ${pipelineIdAsString}. Aborting.`);
        return;
    }

    const newStage = destination.droppableId;
    const oldStage = pipelineItem.stage; // Get the original stage directly from the data

    // Abort if there's no actual stage change
    if (newStage === oldStage) {
      return;
    }

    // Optimistically update the UI to make the drag feel instantaneous
    const updatedPipeline = pipeline.map(p => 
      p.id.toString() === pipelineIdAsString ? { ...p, stage: newStage } : p
    );
    setPipeline(updatedPipeline);
    
    // Set pending move to trigger the database update and notification logic
    setPendingMove({ 
      pipelineId: pipelineItem.id, // Use the original ID (number) for database operations
      newStage, 
      oldStage, 
      pipelineItem 
    });
  };
  // --- BUG FIX END ---

  const handleStatusChange = async (pipelineId, newStatus) => {
    const { error } = await supabase.from('pipeline').update({ status: newStatus, updated_at: new Date().toISOString() }).eq('id', pipelineId);
    if (error) alert('Error updating status: ' + error.message);
    else fetchPipeline();
  };

  const handleRemove = async (pipelineId) => {
    if (confirmDeleteId !== pipelineId) {
      setConfirmDeleteId(pipelineId);
      setTimeout(() => setConfirmDeleteId(null), 3000);
      return;
    }
    const { error } = await supabase.from('pipeline').delete().eq('id', pipelineId);
    if (error) alert('Error removing from pipeline: ' + error.message);
    else fetchPipeline();
    setConfirmDeleteId(null);
  };
  
  const openCommentsModal = async (pipelineEntry) => {
    setSelectedPipelineEntry(pipelineEntry);
    await fetchComments(pipelineEntry.candidate_id);
    setCommentData({ comment_text: '' });
    clearCommentNotifications(pipelineEntry.candidate_id);
    setShowCommentsModal(true);
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!commentData.comment_text) return;
    
    const authorName = user?.email;
    if (!authorName) {
        alert('Could not identify user. Please log in again.');
        return;
    }

    const { data, error } = await supabase.from('comments').insert([{
      candidate_id: selectedPipelineEntry.candidate_id,
      author_name: authorName,
      comment_text: commentData.comment_text
    }]).select().single();

    if (error) { alert('Error adding comment: ' + error.message); return; }

    setCommentData({ comment_text: '' });
    fetchComments(selectedPipelineEntry.candidate_id);

    const isDirector = user?.email === DIRECTOR_EMAIL;
    if (isDirector) {
      setNotificationModal({
        isOpen: true, type: 'comment',
        data: {
          comment: data,
          candidateName: selectedPipelineEntry.candidates?.name,
          recruiterName: selectedPipelineEntry.recruiters?.name,
          positionTitle: selectedPipelineEntry.positions?.title
        }
      });
    }
  };

  const handleNotificationConfirm = async () => {
    const { type, data } = notificationModal;
    setNotificationModal({ isOpen: false, type: null, data: null });

    if (type === 'stage_change') {
      const success = await updateCandidateStage(data.pipelineId, data.newStage);
      if (success) {
        await createNotification({ type: 'stage_change', message: `Candidate ${data.candidateName} was moved from '${data.oldStage}' to '${data.newStage}' for the ${data.positionTitle} role.`, recipient: data.recruiterName });
        alert(`Recruiter has been notified of the stage change.`);
      } else {
        setPipeline(prevPipeline =>
          prevPipeline.map(p => (p.id === data.pipelineId ? { ...p, stage: data.oldStage } : p))
        );
      }
    } else if (type === 'comment') {
      await createNotification({ type: 'new_comment', message: `${data.comment.author_name} left a comment for ${data.candidateName} (${data.positionTitle}): "${data.comment.comment_text}"`, recipient: data.recruiterName });
      alert('Recruiter has been notified of the new comment.');
    }
  };

  const handleNotificationDecline = async () => {
    const { type, data } = notificationModal;
    setNotificationModal({ isOpen: false, type: null, data: null });

    if (type === 'stage_change') {
      const success = await updateCandidateStage(data.pipelineId, data.newStage);
      if (!success) {
        setPipeline(prevPipeline =>
          prevPipeline.map(p => (p.id === data.pipelineId ? { ...p, stage: data.oldStage } : p))
        );
      }
    }
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
  
  const handleEditComment = (comment) => { setEditingComment(comment); setEditingText(comment.comment_text); };
  
  const handleUpdateComment = async (e) => {
    e.preventDefault();
    if (!editingText) return;
    const { error } = await supabase.from('comments').update({ comment_text: editingText }).eq('id', editingComment.id);
    if (error) alert('Error updating comment: ' + error.message);
    else { setEditingComment(null); setEditingText(''); fetchComments(selectedPipelineEntry.candidate_id); }
  };
  
  const handleDeleteComment = async (commentId) => {
    if (window.confirm('Delete this comment?')) {
      const { error } = await supabase.from('comments').delete().eq('id', commentId);
      if (error) alert('Error deleting comment: ' + error.message);
      else fetchComments(selectedPipelineEntry.candidate_id);
    }
  };
  
  const renderListView = () => {
    const groupedByPosition = filteredAndSortedPipeline.reduce((acc, item) => {
      const posTitle = item.positions?.title || 'Unknown Position';
      if (!acc[posTitle]) acc[posTitle] = [];
      acc[posTitle].push(item);
      return acc;
    }, {});

    return (
      <div className="list-view">
        {Object.keys(groupedByPosition).length === 0 ? (
          <div className="empty-state"><h3>No matching pipeline entries</h3><p>Adjust your filters or add candidates to get started.</p></div>
        ) : (
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
                      <div className="candidate-name-cell"><strong>{item.candidates?.name || 'Unknown'}</strong></div>
                      <div>{item.recruiters?.name || 'N/A'}</div>
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
                      <div className="actions-cell" onClick={(e) => e.stopPropagation()}>
                         <div className="comments-button-wrapper">
                            {newCommentCandidateIds.includes(item.candidate_id) && <div className="indicator-dot-small"></div>}
                            <button className="btn-comments" onClick={() => openCommentsModal(item)}>Comments</button>
                         </div>
                         <button className={`btn-remove ${confirmDeleteId === item.id ? 'confirm-delete' : ''}`} onClick={() => handleRemove(item.id)}>
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
          <div className="empty-state"><h3>No matching pipeline entries</h3><p>Adjust your filters to see results.</p></div>
        ) : (
          <DragDropContext onDragEnd={handleOnDragEnd}> 
            <div className="kanban-board">
              {stages.map((stage) => {
                const stageItems = filteredAndSortedPipeline.filter(p => p.stage === stage);
                if (selectedStage !== 'all' && selectedStage !== stage) return null; 
  
                return (
                  <Droppable droppableId={stage} key={stage}>
                    {(provided, snapshot) => (
                      <div className="kanban-column" {...provided.droppableProps} ref={provided.innerRef} style={{ background: snapshot.isDraggingOver ? 'var(--hover-bg)' : 'var(--card-bg)' }}>
                        <div className="column-header"><h3>{stage}</h3><span className="count">{stageItems.length}</span></div>
                        <div className="column-content">
                          {stageItems.map((item, index) => (
                            <Draggable draggableId={item.id.toString()} index={index} key={item.id}>
                              {(provided) => (
                                <div ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps} className={`pipeline-card status-${(item.status || 'active').toLowerCase()} ${newCommentCandidateIds.includes(item.candidate_id) ? 'has-new-comment' : ''}`} onClick={() => setExpandedCard(expandedCard === item.id ? null : item.id)} style={{ ...provided.draggableProps.style }}>
                                  <div className="card-header">
                                    <strong>{item.candidates?.name || 'Unknown'}</strong>
                                    <span className={`kanban-status-badge status-badge-${(item.status || 'active').toLowerCase()}`}>{item.status || 'Active'}</span>
                                  </div>
                                  <div className="card-body">
                                    <p className="card-position-title">{item.positions?.title}</p>
                                    <p className="client-name">{item.positions?.clients?.company_name}</p>
                                    {expandedCard === item.id && (<div className="card-expanded-section"><strong>Notes:</strong><p>{item.candidates?.notes || 'N/A'}</p></div>)}
                                  </div>
                                  <div className="card-actions" onClick={(e) => e.stopPropagation()}>
                                    <div className="card-actions-horizontal">
                                      <select className="status-select" value={item.status || 'Active'} onChange={(e) => handleStatusChange(item.id, e.target.value)} onClick={(e) => e.stopPropagation()}>
                                        {statuses.map(s => <option key={s} value={s}>{s}</option>)}
                                      </select>
                                      <div className="comments-button-wrapper">
                                        {newCommentCandidateIds.includes(item.candidate_id) && <div className="indicator-dot-small"></div>}
                                        <button className="btn-comments" onClick={() => openCommentsModal(item)}>Comments</button>
                                      </div>
                                    </div>
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
  
  if (loading) return <div className="loading-state">Loading Active Tracker...</div>;
  
  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Active Tracker</h1>
        <div className="header-controls">
          <select className="position-filter" value={selectedStage} onChange={(e) => setSelectedStage(e.target.value)}><option value="all">All Stages</option>{stages.map(stage => <option key={stage} value={stage}>{stage}</option>)}</select>
          <select className="position-filter" value={selectedPosition} onChange={(e) => setSelectedPosition(e.target.value)}><option value="all">All Positions</option>{positions.map(pos => <option key={pos.id} value={pos.id}>{pos.title}</option>)}</select>
          <select className="position-filter" value={selectedRecruiter} onChange={(e) => setSelectedRecruiter(e.target.value)}><option value="all">All Recruiters</option>{recruiters.map(rec => <option key={rec.id} value={rec.id}>{rec.name}</option>)}</select>
          <select className="position-filter" value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value)}><option value="all">All Statuses</option>{statuses.map(status => <option key={status} value={status}>{status}</option>)}</select>
          <div className="view-toggle"><button className={`toggle-btn ${view === 'list' ? 'active' : ''}`} onClick={() => setView('list')}>List</button><button className={`toggle-btn ${view === 'pipeline' ? 'active' : ''}`} onClick={() => setView('pipeline')}>Pipeline</button></div>
        </div>
      </div>
      
      {view === 'list' ? renderListView() : renderPipelineView()}
      
      {showCommentsModal && (
        <div className="modal-overlay" onClick={() => setShowCommentsModal(false)}>
          <div className="modal-content modal-large" onClick={(e) => e.stopPropagation()}>
            <h2>Comments for {selectedPipelineEntry?.candidates?.name}</h2>
            <div className="comments-section">
              <form onSubmit={handleAddComment} className="comment-form">
                <div className="form-group"><label>Comment *</label><textarea required rows="3" value={commentData.comment_text} onChange={(e) => setCommentData({...commentData, comment_text: e.target.value})} /></div>
                <button type="submit" className="btn-primary">Add Comment</button>
              </form>
              <div className="comments-list">
                <h3>Comment History ({comments.length})</h3>
                {comments.length === 0 ? (<p className="empty-comments">No comments yet.</p>) : (
                  comments.map(comment => (
                    <div key={comment.id} className="comment-item">
                      {editingComment?.id === comment.id ? (
                        <form onSubmit={handleUpdateComment} className="comment-edit-form">
                          <textarea value={editingText} onChange={(e) => setEditingText(e.target.value)} rows="3" />
                          <div className="comment-edit-actions">
                            <button type="submit" className="btn-save">Save</button>
                            <button type="button" className="btn-cancel" onClick={() => setEditingComment(null)}>Cancel</button>
                          </div>
                        </form>
                      ) : (
                        <>
                          <div className="comment-header"><strong>{comment.author_name}</strong><span className="comment-date">{new Date(comment.created_at).toLocaleString()}</span></div>
                          <p className="comment-text">{comment.comment_text}</p>
                          <div className="comment-actions">
                            <button className="btn-edit" onClick={() => handleEditComment(comment)}>Edit</button>
                            <button className="btn-delete" onClick={() => handleDeleteComment(comment.id)}>Delete</button>
                          </div>
                        </>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
            <div className="modal-actions"><button className="btn-secondary" onClick={() => setShowCommentsModal(false)}>Close</button></div>
          </div>
        </div>
      )}

      {notificationModal.isOpen && (
        <div className="modal-overlay" onClick={closeNotificationModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Confirm Notification</h2>
            {notificationModal.type === 'stage_change' && (
              <p>You've moved <strong>{notificationModal.data.candidateName}</strong> to the <strong>"{notificationModal.data.newStage}"</strong> stage. Would you like to send an email notification to <strong>{notificationModal.data.recruiterName}</strong>?</p>
            )}
            {notificationModal.type === 'comment' && (
              <p>You added a comment for <strong>{notificationModal.data.candidateName}</strong>. Would you like to send an email notification to <strong>{notificationModal.data.recruiterName}</strong>?</p>
            )}
            <div className="modal-actions">
              <button className="btn-secondary" onClick={handleNotificationDecline}>
                No, Just Update
              </button>
              <button className="btn-primary" onClick={handleNotificationConfirm}>
                Yes, Send Email
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ActiveTracker;