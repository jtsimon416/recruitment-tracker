import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../services/supabaseClient';
import { useData } from '../contexts/DataContext';
import { useLocation } from 'react-router-dom';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import '../styles/ActiveTracker.css';

function ActiveTracker() {
  const { newCommentCandidateIds, clearCommentNotifications } = useData();
  const location = useLocation();
  
  const [pipeline, setPipeline] = useState([]);
  const [positions, setPositions] = useState([]);
  const [recruiters, setRecruiters] = useState([]);
  const [view, setView] = useState('list'); // Default to 'list'
  const [expandedCard, setExpandedCard] = useState(null);
  const [showCommentsModal, setShowCommentsModal] = useState(false);
  const [selectedPipelineEntry, setSelectedPipelineEntry] = useState(null);
  const [comments, setComments] = useState([]);
  const [commentData, setCommentData] = useState({ author_name: '', comment_text: '' });
  const [editingComment, setEditingComment] = useState(null);
  const [editingText, setEditingText] = useState('');
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedPosition, setSelectedPosition] = useState('all');
  const [selectedRecruiter, setSelectedRecruiter] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedStage, setSelectedStage] = useState('all'); 
  
  // Sorting
  const [sortConfig, setSortConfig] = useState({ key: 'candidates.name', direction: 'ascending' });
  const [confirmDeleteId, setConfirmDeleteId] = useState(null); 

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
    if (location.state?.view) {
      setView(location.state.view);
    }
    if (!loading && location.state?.openCommentsForCandidate) {
      const { openCommentsForCandidate, positionId } = location.state;
      const pipelineEntry = pipeline.find(p => p.candidate_id === openCommentsForCandidate && p.position_id === positionId);
      
      if (pipelineEntry) {
        setSelectedPosition(positionId);
        openCommentsModal(pipelineEntry);
      }
    }
  }, [loading, location.state, pipeline]);


  async function fetchPipeline() {
    const { data: pipelineData, error: pipelineError } = await supabase
      .from('pipeline')
      .select('*, candidates(*), positions(*, clients(*)), recruiters(*)')
      .order('created_at', { ascending: false });
    
    if (pipelineError) {
      console.error('Error fetching pipeline:', pipelineError);
      setPipeline([]);
    } else {
      setPipeline(pipelineData || []);
    }
  }

  async function fetchPositions() {
    const { data, error } = await supabase
      .from('positions')
      .select('*')
      .eq('status', 'Open')
      .order('title');
    
    if (error) console.error('Error fetching positions:', error);
    else setPositions(data || []);
  }

  async function fetchRecruiters() {
    const { data, error } = await supabase
      .from('recruiters')
      .select('*')
      .order('name');

    if (error) console.error('Error fetching recruiters:', error);
    else setRecruiters(data || []);
  }

  async function fetchComments(candidateId) {
    const { data, error } = await supabase
      .from('comments')
      .select('*')
      .eq('candidate_id', candidateId)
      .order('created_at', { ascending: false });
    
    if (error) console.error('Error fetching comments:', error);
    else setComments(data || []);
  }

  const filteredAndSortedPipeline = useMemo(() => {
    let filtered = [...pipeline];

    if (selectedPosition !== 'all') {
      filtered = filtered.filter(p => p.position_id === selectedPosition);
    }
    if (selectedRecruiter !== 'all') {
      filtered = filtered.filter(p => p.recruiter_id === parseInt(selectedRecruiter));
    }
    if (selectedStatus !== 'all') {
      filtered = filtered.filter(p => (p.status || 'Active') === selectedStatus);
    }
    if (selectedStage !== 'all') {
        filtered = filtered.filter(p => p.stage === selectedStage);
    }

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
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  const getSortIndicator = (key) => {
    if (sortConfig.key !== key) return null;
    return sortConfig.direction === 'ascending' ? ' ▲' : ' ▼';
  };

  async function handleStageChange(pipelineId, newStage) {
    // This function is correctly used only by the List View dropdown
    const { error } = await supabase
      .from('pipeline')
      .update({ stage: newStage, updated_at: new Date().toISOString() })
      .eq('id', pipelineId);
    
    if (error) console.error('Error updating stage:', error.message);
    else fetchPipeline();
  }
  
  async function handleOnDragEnd(result) {
    const { destination, draggableId } = result;

    if (!destination || destination.droppableId === result.source.droppableId) {
      return;
    }

    const newStage = destination.droppableId;
    const pipelineId = draggableId;

    // Optimistically update UI
    const updatedPipeline = pipeline.map(p => 
      p.id.toString() === draggableId ? { ...p, stage: newStage } : p
    );
    setPipeline(updatedPipeline); 
    
    // Persist change to database
    const { error } = await supabase
      .from('pipeline')
      .update({ 
          stage: newStage,
          updated_at: new Date().toISOString() 
      })
      .eq('id', pipelineId); 

    if (error) {
      console.error('Error updating stage via drag-and-drop:', error);
      fetchPipeline(); // Revert state on failure
    }
  }

  async function handleStatusChange(pipelineId, newStatus) {
    const { error } = await supabase
      .from('pipeline')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', pipelineId);
    
    if (error) alert('Error updating status: ' + error.message);
    else fetchPipeline();
  }

  async function handleRemove(pipelineId) {
    if (confirmDeleteId !== pipelineId) {
        setConfirmDeleteId(pipelineId);
        setTimeout(() => setConfirmDeleteId(null), 3000);
        return;
    }

    const { error } = await supabase.from('pipeline').delete().eq('id', pipelineId);
    if (error) {
        alert('Error removing from pipeline: ' + error.message);
    } else {
        fetchPipeline();
    }
    setConfirmDeleteId(null);
  }

  async function openCommentsModal(pipelineEntry) {
    setSelectedPipelineEntry(pipelineEntry);
    await fetchComments(pipelineEntry.candidate_id);
    setCommentData({ author_name: '', comment_text: '' });
    clearCommentNotifications(pipelineEntry.candidate_id);
    setShowCommentsModal(true);
  }

  async function handleAddComment(e) {
    e.preventDefault();
    if (!commentData.author_name || !commentData.comment_text) return;
    const { error } = await supabase.from('comments').insert([{
      candidate_id: selectedPipelineEntry.candidate_id,
      ...commentData
    }]);
    if (error) alert('Error adding comment: ' + error.message);
    else {
      setCommentData(prev => ({ ...prev, comment_text: '' }));
      fetchComments(selectedPipelineEntry.candidate_id);
    }
  }

  function handleEditComment(comment) {
    setEditingComment(comment);
    setEditingText(comment.comment_text);
  }

  async function handleUpdateComment(e) {
    e.preventDefault();
    if (!editingText) return;
    const { error } = await supabase.from('comments').update({ comment_text: editingText }).eq('id', editingComment.id);
    if (error) alert('Error updating comment: ' + error.message);
    else {
      setEditingComment(null);
      setEditingText('');
      fetchComments(selectedPipelineEntry.candidate_id);
    }
  }

  async function handleDeleteComment(commentId) {
    if (window.confirm('Delete this comment?')) {
      const { error } = await supabase.from('comments').delete().eq('id', commentId);
      if (error) alert('Error deleting comment: ' + error.message);
      else fetchComments(selectedPipelineEntry.candidate_id);
    }
  }
  
  function renderListView() {
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
                    <div 
                      className={`pipeline-row status-${(item.status || 'active').toLowerCase()} ${newCommentCandidateIds.includes(item.candidate_id) ? 'has-new-comment' : ''}`}
                      onClick={() => setExpandedCard(expandedCard === item.id ? null : item.id)}
                    >
                      <div className="candidate-name-cell"><strong>{item.candidates?.name || 'Unknown'}</strong></div>
                      <div>{item.recruiters?.name || 'N/A'}</div>
                      <div>{item.candidates?.phone || 'N/A'}</div>
                      <div>
                        <select
                          className="status-select"
                          value={item.status || 'Active'}
                          onChange={(e) => { e.stopPropagation(); handleStatusChange(item.id, e.target.value); }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          {statuses.map(status => <option key={status} value={status}>{status}</option>)}
                        </select>
                      </div>
                      
                      {/* --- STAGE DROPDOWN RESTORED FOR LIST VIEW --- */}
                      <div>
                        <select
                          className="stage-select"
                          value={item.stage}
                          onChange={(e) => { e.stopPropagation(); handleStageChange(item.id, e.target.value); }} 
                          onClick={(e) => e.stopPropagation()}
                        >
                          {stages.map(stage => <option key={stage} value={stage}>{stage}</option>)}
                        </select>
                      </div>
                      {/* --- END RESTORED --- */}
                      
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
                    {expandedCard === item.id && item.candidates?.notes && (
                      <div className="pipeline-row-notes"><strong>Notes:</strong> {item.candidates.notes}</div>
                    )}
                  </React.Fragment>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    );
  }

  function renderPipelineView() {
    return (
      <div className="pipeline-view">
        {filteredAndSortedPipeline.length === 0 && selectedStage !== 'all' ? (
          <div className="empty-state"><h3>No matching pipeline entries</h3><p>Adjust your filters to see results.</p></div>
        ) : (
          <DragDropContext onDragEnd={handleOnDragEnd}> 
            <div className="kanban-board">
              {stages.map((stage) => {
                const stageItems = filteredAndSortedPipeline.filter(p => p.stage === stage);
                
                if (selectedStage !== 'all' && selectedStage !== stage) {
                  return null; 
                }

                return (
                  <Droppable droppableId={stage} key={stage}>
                    {(provided, snapshot) => (
                      <div 
                        className="kanban-column"
                        {...provided.droppableProps}
                        ref={provided.innerRef}
                        style={{
                            background: snapshot.isDraggingOver ? 'var(--hover-bg)' : 'var(--card-bg)'
                        }}
                      >
                        <div className="column-header"><h3>{stage}</h3><span className="count">{stageItems.length}</span></div>
                        <div className="column-content">
                          {stageItems.map((item, index) => (
                            <Draggable draggableId={item.id.toString()} index={index} key={item.id}>
                              {(provided, snapshot) => (
                                <div 
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...provided.dragHandleProps} 
                                  className={`pipeline-card status-${(item.status || 'active').toLowerCase()} ${newCommentCandidateIds.includes(item.candidate_id) ? 'has-new-comment' : ''}`}
                                  onClick={() => setExpandedCard(expandedCard === item.id ? null : item.id)}
                                  style={{
                                      ...provided.draggableProps.style,
                                      opacity: snapshot.isDragging ? 0.8 : 1,
                                  }}
                                >
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
                                    
                                    {/* --- NEW CONTAINER FOR TOP ROW ACTIONS (Status + Comments) --- */}
                                    <div className="card-actions-horizontal">
                                      <select className="status-select" value={item.status || 'Active'} onChange={(e) => handleStatusChange(item.id, e.target.value)} onClick={(e) => e.stopPropagation()}>
                                        {statuses.map(s => <option key={s} value={s}>{s}</option>)}
                                      </select>
                                      <div className="comments-button-wrapper">
                                        {newCommentCandidateIds.includes(item.candidate_id) && <div className="indicator-dot-small"></div>}
                                        <button className="btn-comments" onClick={() => openCommentsModal(item)}>Comments</button>
                                      </div>
                                    </div>
                                    {/* --- REMOVE BUTTON MOVED TO ITS OWN LINE (BOTTOM ROW) --- */}
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
  }


  if (loading) {
    return <div className="loading-state">Loading Active Tracker...</div>;
  }
  
  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Active Tracker</h1>
        <div className="header-controls">
          <select className="position-filter" value={selectedStage} onChange={(e) => setSelectedStage(e.target.value)}>
            <option value="all">All Stages</option>
            {stages.map(stage => <option key={stage} value={stage}>{stage}</option>)}
          </select>
          
          <select className="position-filter" value={selectedPosition} onChange={(e) => setSelectedPosition(e.target.value)}>
            <option value="all">All Positions</option>
            {positions.map(pos => <option key={pos.id} value={pos.id}>{pos.title}</option>)}
          </select>
          <select className="position-filter" value={selectedRecruiter} onChange={(e) => setSelectedRecruiter(e.target.value)}>
            <option value="all">All Recruiters</option>
            {recruiters.map(rec => <option key={rec.id} value={rec.id}>{rec.name}</option>)}
          </select>
          <select className="position-filter" value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value)}>
            <option value="all">All Statuses</option>
            {statuses.map(status => <option key={status} value={status}>{status}</option>)}
          </select>
          <div className="view-toggle">
            <button className={`toggle-btn ${view === 'list' ? 'active' : ''}`} onClick={() => setView('list')}>List</button>
            <button className={`toggle-btn ${view === 'pipeline' ? 'active' : ''}`} onClick={() => setView('pipeline')}>Pipeline</button>
          </div>
        </div>
      </div>
      {view === 'list' ? renderListView() : renderPipelineView()}
      {showCommentsModal && (
        <div className="modal-overlay" onClick={() => setShowCommentsModal(false)}>
          <div className="modal-content modal-large" onClick={(e) => e.stopPropagation()}>
            <h2>Comments for {selectedPipelineEntry?.candidates?.name}</h2>
            <div className="comments-section">
              <form onSubmit={handleAddComment} className="comment-form">
                <div className="form-group"><label>Your Name *</label><input type="text" required value={commentData.author_name} onChange={(e) => setCommentData({...commentData, author_name: e.target.value})} /></div>
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
    </div>
  );
}

export default ActiveTracker;