import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';
import { useData } from '../contexts/DataContext';
import '../styles/ActiveTracker.css';

function ActiveTracker() {
  const { newCommentCandidateIds, clearCommentNotifications } = useData();
  
  const [pipeline, setPipeline] = useState([]);
  const [filteredPipeline, setFilteredPipeline] = useState([]);
  const [positions, setPositions] = useState([]);
  const [selectedPosition, setSelectedPosition] = useState('all');
  const [view, setView] = useState('list');
  const [expandedCard, setExpandedCard] = useState(null);
  const [showCommentsModal, setShowCommentsModal] = useState(false);
  const [selectedPipelineEntry, setSelectedPipelineEntry] = useState(null);
  const [comments, setComments] = useState([]);
  const [commentData, setCommentData] = useState({
    author_name: '',
    comment_text: ''
  });
  const [editingComment, setEditingComment] = useState(null);
  const [editingText, setEditingText] = useState('');

  const stages = [
    'Screening',
    'Submit to Client',
    'Interview 1',
    'Interview 2',
    'Interview 3',
    'Offer',
    'Hired'
  ];

  const statuses = ['Active', 'Hold', 'Reject'];

  useEffect(() => {
    fetchPipeline();
    fetchPositions();
  }, []);

  useEffect(() => {
    filterPipeline();
  }, [pipeline, selectedPosition]);

  async function fetchPipeline() {
    const { data: pipelineData, error: pipelineError } = await supabase
      .from('pipeline')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (pipelineError) {
      console.error('Error fetching pipeline:', pipelineError);
      setPipeline([]);
      return;
    }

    if (!pipelineData || pipelineData.length === 0) {
      setPipeline([]);
      return;
    }

    const enrichedData = await Promise.all(
      pipelineData.map(async (item) => {
        let candidate = null;
        let position = null;
        let recruiter = null;

        if (item.candidate_id) {
          const { data } = await supabase
            .from('candidates')
            .select('*')
            .eq('id', item.candidate_id)
            .single();
          candidate = data;
        }

        if (item.position_id) {
          const { data } = await supabase
            .from('positions')
            .select('*, clients(*)')
            .eq('id', item.position_id)
            .single();
          position = data;
        }

        if (item.recruiter_id) {
          const { data } = await supabase
            .from('recruiters')
            .select('*')
            .eq('id', item.recruiter_id)
            .single();
          recruiter = data;
        }

        return {
          ...item,
          candidates: candidate,
          positions: position,
          recruiters: recruiter
        };
      })
    );

    setPipeline(enrichedData);
  }

  async function fetchPositions() {
    const { data, error } = await supabase
      .from('positions')
      .select('*')
      .eq('status', 'Open')
      .order('title');
    
    if (error) {
      console.error('Error fetching positions:', error);
    } else {
      setPositions(data || []);
    }
  }

  async function fetchComments(candidateId) {
    const { data, error } = await supabase
      .from('comments')
      .select('*')
      .eq('candidate_id', candidateId)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching comments:', error);
    } else {
      setComments(data || []);
    }
  }

  function filterPipeline() {
    if (selectedPosition === 'all') {
      setFilteredPipeline(pipeline);
    } else {
      setFilteredPipeline(pipeline.filter(p => p.position_id === selectedPosition));
    }
  }

  async function handleStageChange(pipelineId, newStage) {
    const { error } = await supabase
      .from('pipeline')
      .update({ stage: newStage, updated_at: new Date().toISOString() })
      .eq('id', pipelineId);
    
    if (error) {
      alert('Error updating stage: ' + error.message);
    } else {
      fetchPipeline();
    }
  }

  async function handleStatusChange(pipelineId, newStatus) {
    const { error } = await supabase
      .from('pipeline')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', pipelineId);
    
    if (error) {
      alert('Error updating status: ' + error.message);
    } else {
      fetchPipeline();
    }
  }

  async function handleRemove(pipelineId) {
    if (!window.confirm('Remove this candidate from the pipeline?')) return;
    
    const { error } = await supabase
      .from('pipeline')
      .delete()
      .eq('id', pipelineId);
    
    if (error) {
      alert('Error removing from pipeline: ' + error.message);
    } else {
      fetchPipeline();
    }
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
    if (!commentData.author_name || !commentData.comment_text) {
      alert('Please fill in both your name and comment');
      return;
    }

    const { error } = await supabase.from('comments').insert([{
      candidate_id: selectedPipelineEntry.candidate_id,
      author_name: commentData.author_name,
      comment_text: commentData.comment_text
    }]);
    
    if (error) {
      alert('Error adding comment: ' + error.message);
    } else {
      setCommentData({ author_name: commentData.author_name, comment_text: '' });
      await fetchComments(selectedPipelineEntry.candidate_id);
    }
  }

  function handleEditComment(comment) {
    setEditingComment(comment);
    setEditingText(comment.comment_text);
  }

  async function handleUpdateComment(e) {
    e.preventDefault();
    if (!editingText) {
        alert('Comment cannot be empty');
        return;
    }
    const { error } = await supabase
      .from('comments')
      .update({ comment_text: editingText })
      .eq('id', editingComment.id);
    if (error) {
        alert('Error updating comment: ' + error.message);
    } else {
        setEditingComment(null);
        setEditingText('');
        fetchComments(selectedPipelineEntry.candidate_id);
    }
  }

  async function handleDeleteComment(commentId) {
      if (window.confirm('Are you sure you want to delete this comment?')) {
          const { error } = await supabase
              .from('comments')
              .delete()
              .eq('id', commentId);
          if (error) {
              alert('Error deleting comment: ' + error.message);
          } else {
              fetchComments(selectedPipelineEntry.candidate_id);
          }
      }
  }

  function renderListView() {
    const groupedByPosition = {};
    filteredPipeline.forEach(item => {
      const posTitle = item.positions?.title || 'Unknown Position';
      if (!groupedByPosition[posTitle]) {
        groupedByPosition[posTitle] = [];
      }
      groupedByPosition[posTitle].push(item);
    });

    return (
      <div className="list-view">
        {Object.keys(groupedByPosition).length === 0 ? (
          <div className="empty-state">
            <h3>No pipeline entries yet</h3>
            <p>Add candidates from the Talent Pool to get started.</p>
          </div>
        ) : (
          Object.keys(groupedByPosition).map(posTitle => (
            <div key={posTitle} className="position-section">
              <h2 className="position-section-title">{posTitle}</h2>
              <div className="pipeline-table">
                <div className="pipeline-header">
                  <div>Candidate</div>
                  <div>Recruiter</div>
                  <div>Phone</div>
                  <div>Status</div>
                  <div>Stage</div>
                  <div>Actions</div>
                </div>
                {groupedByPosition[posTitle].map(item => (
                  <React.Fragment key={item.id}>
                    <div 
                      className={`pipeline-row status-${item.status?.toLowerCase()} ${newCommentCandidateIds.includes(item.candidate_id) ? 'has-new-comment' : ''}`}
                      onClick={() => setExpandedCard(expandedCard === item.id ? null : item.id)}
                    >
                      <div className="candidate-name-cell">
                        <strong>{item.candidates?.name || 'Unknown Candidate'}</strong>
                      </div>
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
                      <div className="actions-cell" onClick={(e) => e.stopPropagation()}>
                        {newCommentCandidateIds.includes(item.candidate_id) && <div className="indicator-dot-small"></div>}
                        <button className="btn-comments" onClick={() => openCommentsModal(item)}>Comments</button>
                        <button className="btn-remove" onClick={() => handleRemove(item.id)}>Remove</button>
                      </div>
                    </div>
                    {expandedCard === item.id && item.notes && (
                      <div className="pipeline-row-notes"><strong>Notes:</strong> {item.notes}</div>
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
        {filteredPipeline.length === 0 ? (
          <div className="empty-state"><h3>No pipeline entries yet</h3><p>Add candidates from the Talent Pool to get started.</p></div>
        ) : (
          <div className="kanban-board">
            {stages.map(stage => {
              const stageItems = filteredPipeline.filter(p => p.stage === stage);
              return (
                <div key={stage} className="kanban-column">
                  <div className="column-header"><h3>{stage}</h3><span className="count">{stageItems.length}</span></div>
                  <div className="column-content">
                    {stageItems.map(item => (
                      <div 
                        key={item.id} 
                        className={`pipeline-card status-${item.status?.toLowerCase()} ${newCommentCandidateIds.includes(item.candidate_id) ? 'has-new-comment' : ''}`}
                        onClick={() => setExpandedCard(expandedCard === item.id ? null : item.id)}
                      >
                        <div className="card-header">
                          <strong>{item.candidates?.name || 'Unknown Candidate'}</strong>
                          <span className={`kanban-status-badge status-badge-${item.status?.toLowerCase()}`}>{item.status || 'Active'}</span>
                        </div>
                        <div className="card-body">
                          <p className="card-position-title">{item.positions?.title}</p>
                          <p className="client-name">{item.positions?.clients?.company_name}</p>
                          {expandedCard === item.id && (
                            <div className="card-expanded-section"><strong>Notes:</strong><p>{item.notes || 'No notes available'}</p></div>
                          )}
                        </div>
                        <div className="card-actions" onClick={(e) => e.stopPropagation()}>
                          <select className="stage-select" value={item.stage} onChange={(e) => handleStageChange(item.id, e.target.value)}>
                            {stages.map(stage => <option key={stage} value={stage}>{stage}</option>)}
                          </select>
                          <div className="comments-button-wrapper">
                             {newCommentCandidateIds.includes(item.candidate_id) && <div className="indicator-dot-small"></div>}
                             <button className="btn-comments" onClick={() => openCommentsModal(item)}>Comments</button>
                          </div>
                          <button className="btn-remove" onClick={() => handleRemove(item.id)}>Remove</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Active Tracker</h1>
        <div className="header-controls">
          <select className="position-filter" value={selectedPosition} onChange={(e) => setSelectedPosition(e.target.value)}>
            <option value="all">All Positions</option>
            {positions.map(pos => <option key={pos.id} value={pos.id}>{pos.title}</option>)}
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
                <div className="form-group"><label>Your Name *</label><input type="text" required placeholder="e.g., Director Jane" value={commentData.author_name} onChange={(e) => setCommentData({...commentData, author_name: e.target.value})} /></div>
                <div className="form-group"><label>Comment *</label><textarea required rows="3" placeholder="Leave feedback about this candidate..." value={commentData.comment_text} onChange={(e) => setCommentData({...commentData, comment_text: e.target.value})} /></div>
                <button type="submit" className="btn-primary">Add Comment</button>
              </form>
              <div className="comments-list">
                <h3>Comment History ({comments.length})</h3>
                {comments.length === 0 ? (<p className="empty-comments">No comments yet. Be the first to comment!</p>) : (
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

