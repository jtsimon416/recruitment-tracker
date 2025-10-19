import React, { useState, useEffect, useMemo } from 'react';
import { useData } from '../contexts/DataContext';
import { supabase } from '../services/supabaseClient';
import { motion } from 'framer-motion';
import {
  ExternalLink, Phone, CheckCircle, XCircle, PlusCircle, MessageSquare, Star, Calendar, Clock, Trash2, AlertCircle, FileText, Bell
} from 'lucide-react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { useConfirmation } from '../contexts/ConfirmationContext';
import '../styles/RecruiterOutreach.css';

// ===================================
// HELPER COMPONENTS
// ===================================
const StarRating = ({ rating, setRating }) => {
    const [hoverRating, setHoverRating] = useState(0);
    const stars = [1, 2, 3, 4, 5];
    return ( <div className="star-rating-input"> {stars.map((star) => ( <Star key={star} size={24} className={`star-icon ${rating >= star || hoverRating >= star ? 'filled' : ''}`} onMouseEnter={() => setHoverRating(star)} onMouseLeave={() => setHoverRating(0)} onClick={() => setRating(star)} /> ))} </div> );
};

// ===================================
// MY ACTIVE ROLES COMPONENT
// ===================================
const MyActiveRoles = ({ userProfile }) => {
  const [positions, setPositions] = useState([]);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (userProfile?.id) {
      fetchMyPositions();
    }
  }, [userProfile]);

  const fetchMyPositions = async () => {
    const { data } = await supabase
      .from('pipeline')
      .select(`
        position_id,
        positions(*, clients(company_name))
      `)
      .eq('recruiter_id', userProfile.id)
      .eq('status', 'Active');

    if (data) {
      const uniquePositions = [...new Map(
        data.map(item => [item.position_id, item.positions])
      ).values()];

      setPositions(uniquePositions.filter(p => p !== null));
    }
    setLoading(false);
  };

  const calculateTimeRemaining = (deadline) => {
    const now = currentTime;
    const deadlineDate = new Date(deadline);
    const diff = deadlineDate - now;

    if (diff <= 0) {
      const overdue = Math.abs(diff);
      const hours = Math.floor(overdue / 3600000);
      const minutes = Math.floor((overdue % 3600000) / 60000);
      return {
        isOverdue: true,
        display: `OVERDUE BY: ${hours}h ${minutes}m`,
        color: '#F7A9BA'
      };
    }

    const hours = Math.floor(diff / 3600000);
    const minutes = Math.floor((diff % 3600000) / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);

    let color = '#B8D4D0';
    if (hours < 24) color = '#F4C2A8';
    if (hours < 12) color = '#F7A9BA';

    return {
      isOverdue: false,
      display: `${hours}h ${minutes}m ${seconds}s remaining`,
      color
    };
  };

  const [candidateCounts, setCandidateCounts] = useState({});

  useEffect(() => {
    const fetchCounts = async () => {
      const counts = {};
      for (const pos of positions) {
        if (pos.first_slate_started_at && !pos.first_slate_completed_at) {
          const { count } = await supabase
            .from('pipeline')
            .select('*', { count: 'exact', head: true })
            .eq('position_id', pos.id)
            .eq('stage', 'Screening')
            .eq('status', 'Active');
          counts[pos.id] = count || 0;
        }
      }
      setCandidateCounts(counts);
    };
    fetchCounts();
  }, [positions]);

  const hasNewStrategy = (position) => {
    return position.phase_2_strategy_url &&
      !position.strategy_viewed_by?.includes(userProfile.id);
  };

  const viewStrategy = async (position) => {
    const updatedViewedBy = [
      ...(position.strategy_viewed_by || []),
      userProfile.id
    ];

    await supabase
      .from('positions')
      .update({ strategy_viewed_by: updatedViewedBy })
      .eq('id', position.id);

    await supabase
      .from('pipeline_audit_log')
      .insert({
        position_id: position.id,
        event_type: 'strategy_viewed',
        performed_by: userProfile.id,
        notes: `Strategy document viewed by ${userProfile.name}`,
        created_at: new Date().toISOString()
      });

    window.open(position.phase_2_strategy_url, '_blank');
    fetchMyPositions();
  };

  if (loading || positions.length === 0) return null;

  return (
    <div style={{ marginBottom: '2rem' }}>
      <h2 className="section-title" style={{ marginBottom: '1rem' }}>
        🎯 MY ACTIVE ROLES
      </h2>

      {positions.map((position) => {
        const hasActiveSprint = position.first_slate_started_at && !position.first_slate_completed_at;
        const hasStrategy = position.phase_2_strategy_url;
        const isNewStrategy = hasNewStrategy(position);

        return (
          <motion.div
            key={position.id}
            className="first-slate-sprint-card"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            style={{ marginBottom: '1rem' }}
          >
            <div className="first-slate-header">
              <div>
                <div className="first-slate-position-title">
                  {position.title}
                </div>
                <div className="first-slate-company">
                  @ {position.clients?.company_name || 'N/A'}
                </div>
              </div>
            </div>

            {hasActiveSprint && (
              <div style={{ marginTop: '1rem' }}>
                <div style={{ color: 'var(--peachy-rose)', fontWeight: 600, marginBottom: '0.5rem' }}>
                  Phase: First Slate Sprint
                </div>
                <div
                  style={{
                    fontSize: '1.5rem',
                    fontWeight: 700,
                    fontFamily: 'Courier New, monospace',
                    textAlign: 'center',
                    padding: '0.75rem',
                    background: 'rgba(0, 0, 0, 0.3)',
                    borderRadius: '8px',
                    color: calculateTimeRemaining(position.first_slate_deadline).color
                  }}
                >
                  ⏰ {calculateTimeRemaining(position.first_slate_deadline).display}
                </div>
                <div style={{ marginTop: '0.5rem' }}>
                  <div className="progress-bar-container" style={{ height: '20px' }}>
                    <div
                      className="progress-bar-fill"
                      style={{ width: `${((candidateCounts[position.id] || 0) / 8) * 100}%` }}
                    />
                    <div className="progress-bar-text" style={{ fontSize: '0.85rem' }}>
                      {candidateCounts[position.id] || 0} / 8
                    </div>
                  </div>
                </div>
              </div>
            )}

            {hasStrategy && (
              <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border-color)' }}>
                <div style={{ color: 'var(--peachy-rose)', fontWeight: 600, marginBottom: '0.5rem' }}>
                  Phase: Strategy Available
                </div>
                {isNewStrategy && (
                  <div className="new-strategy-badge" style={{ marginBottom: '1rem' }}>
                    <Bell size={16} />
                    NEW STRATEGY UPLOADED!
                  </div>
                )}
                <button
                  className="view-strategy-btn"
                  onClick={() => viewStrategy(position)}
                >
                  <FileText size={16} style={{ verticalAlign: 'middle', marginRight: '0.5rem' }} />
                  VIEW MARCHING ORDERS
                </button>
              </div>
            )}

            <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border-color)' }}>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                My Activity:
              </div>
              <div style={{ marginTop: '0.5rem', color: 'var(--text-primary)' }}>
                • Working on this role
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
};

// ** MODIFIED: This component is now reformatted to match the main dashboard **
const CallsDashboard = ({ activities }) => {
    const scheduledCalls = useMemo(() => 
        activities.filter(a => a.activity_status === 'call_scheduled' && a.scheduled_call_date)
                  .sort((a, b) => new Date(a.scheduled_call_date) - new Date(b.scheduled_call_date)), 
    [activities]);
    
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfToday = new Date(startOfToday); endOfToday.setDate(endOfToday.getDate() + 1);
    
    const startOfWeek = new Date(startOfToday);
    startOfWeek.setDate(startOfWeek.getDate() - (now.getDay() === 0 ? 6 : now.getDay() - 1));
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(endOfWeek.getDate() + 7);

    const callsToday = scheduledCalls.filter(c => new Date(c.scheduled_call_date) >= startOfToday && new Date(c.scheduled_call_date) < endOfToday);
    const callsThisWeek = scheduledCalls.filter(c => new Date(c.scheduled_call_date) >= endOfToday && new Date(c.scheduled_call_date) < endOfWeek);

    const formatCallTime = (dateString) => {
        if (!dateString) return '';
        return new Date(dateString).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    };

    const scrollToCard = (activityId) => {
        const cardElement = document.querySelector(`[data-rbd-draggable-id="${activityId}"]`);
        if (cardElement) {
            cardElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            cardElement.classList.add('highlight');
            setTimeout(() => cardElement.classList.remove('highlight'), 2000);
        }
    };

    return (
        <div className="calls-section-container">
            <div className="calls-column">
                <h2 className="section-title"><Clock size={20} /> Calls Scheduled Today</h2>
                <div className="calls-list">
                    {callsToday.length === 0 ? (
                        <p className="no-calls-message">No calls scheduled for today.</p>
                    ) : (
                        <ul>
                            {callsToday.map(call => (
                                <li key={call.id} onClick={() => scrollToCard(call.id)}>
                                    <div className="call-info-main">
                                        <span className="call-time">{formatCallTime(call.scheduled_call_date)}</span>
                                        <div className="call-details">
                                            <strong>{call.candidate_name}</strong>
                                            <span>{call.positions?.title}</span>
                                        </div>
                                    </div>
                                    <a href={call.linkedin_url} target="_blank" rel="noopener noreferrer" className="btn-call-linkedin" title="View LinkedIn Profile" onClick={(e) => e.stopPropagation()}>
                                        <ExternalLink size={16} />
                                    </a>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>
            <div className="calls-column">
                <h2 className="section-title"><Calendar size={20} /> Upcoming Calls This Week</h2>
                <div className="calls-list">
                    {callsThisWeek.length === 0 ? (
                        <p className="no-calls-message">No other calls scheduled this week.</p>
                    ) : (
                        <ul>
                            {callsThisWeek.map(call => (
                                <li key={call.id} onClick={() => scrollToCard(call.id)}>
                                    <div className="call-info-main">
                                        <span className="call-time">{new Date(call.scheduled_call_date).toLocaleDateString('en-US', { weekday: 'short' })}</span>
                                        <div className="call-details">
                                            <strong>{call.candidate_name}</strong>
                                            <span>{call.positions?.title}</span>
                                        </div>
                                    </div>
                                    <a href={call.linkedin_url} target="_blank" rel="noopener noreferrer" className="btn-call-linkedin" title="View LinkedIn Profile" onClick={(e) => e.stopPropagation()}>
                                        <ExternalLink size={16} />
                                    </a>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>
        </div>
    );
};

// ===================================
// ADD OUTREACH MODAL (UPDATED WITH PERSISTENT STATE)
// ===================================
const AddOutreachModal = ({ 
    onClose, 
    onSave,
    formData,
    setFormData,
    clearFormData
}) => {
    const { positions } = useData();
    
    const handleSubmit = (e) => { 
        e.preventDefault(); 
        onSave({ 
            candidate_name: formData.candidateName, 
            linkedin_url: formData.linkedinUrl, 
            position_id: formData.positionId, 
            notes: formData.notes, 
            activity_status: 'outreach_sent', 
            rating: formData.rating 
        }); 
        // Clear form after successful submission
        clearFormData();
    };
    
    const handleCloseModal = () => {
        // Clear form when user explicitly closes with X or Cancel
        clearFormData();
        onClose();
    };
    
    return ( 
        <div className="modal-overlay" onClick={handleCloseModal}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>Add New Outreach</h2>
                    <button className="btn-close" onClick={handleCloseModal}>&times;</button>
                </div>
                <div className="modal-body">
                    <form onSubmit={handleSubmit}>
                        <div className="form-group">
                            <label>Candidate Name</label>
                            <input 
                                type="text" 
                                value={formData.candidateName} 
                                onChange={(e) => setFormData({ ...formData, candidateName: e.target.value })} 
                                required 
                            />
                        </div>
                        <div className="form-group">
                            <label>LinkedIn URL</label>
                            <input 
                                type="url" 
                                value={formData.linkedinUrl} 
                                onChange={(e) => setFormData({ ...formData, linkedinUrl: e.target.value })} 
                                required 
                            />
                        </div>
                        <div className="form-group">
                            <label>Position</label>
                            <select 
                                value={formData.positionId} 
                                onChange={(e) => setFormData({ ...formData, positionId: e.target.value })} 
                                required
                            >
                                <option value="" disabled>Select a position</option>
                                {positions.filter(p => p.status === 'Open').map(p => (<option key={p.id} value={p.id}>{p.title}</option>))}
                            </select>
                        </div>
                        <div className="form-group">
                            <label>Candidate Rating</label>
                            <StarRating rating={formData.rating} setRating={(rating) => setFormData({ ...formData, rating })} />
                        </div>
                        <div className="form-group">
                            <label>Notes</label>
                            <textarea 
                                value={formData.notes} 
                                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                            ></textarea>
                        </div>
                        <div className="modal-actions">
                            <button type="button" className="btn-secondary" onClick={handleCloseModal}>Cancel</button>
                            <button type="submit" className="btn-primary">Add Outreach</button>
                        </div>
                    </form>
                </div>
            </div>
        </div> 
    );
};

const DeclineReasonModal = ({ onClose, onSubmit }) => {
    const [reason, setReason] = useState('');
    const handleSubmit = (e) => { e.preventDefault(); onSubmit(reason); };
    return ( <div className="modal-overlay" onClick={onClose}> <div className="modal-content" onClick={(e) => e.stopPropagation()}> <form onSubmit={handleSubmit}> <div className="modal-header"><h2>Reason for Decline</h2><button type="button" className="btn-close" onClick={onClose}>&times;</button></div><div className="modal-body"><div className="form-group"><label>Please provide a reason why the candidate declined.</label><textarea value={reason} onChange={(e) => setReason(e.target.value)} required minLength={10}></textarea></div></div><div className="modal-actions"><button type="button" className="btn-secondary" onClick={onClose}>Cancel</button><button type="submit" className="btn-primary-action btn-decline">Confirm Decline</button></div></form> </div></div> );
};
const CallFeedbackModal = ({ onClose, onSubmit }) => {
    const [feedback, setFeedback] = useState('');
    const [nextStep, setNextStep] = useState('ready_for_submission');
    const handleSubmit = (e) => { e.preventDefault(); onSubmit(feedback, nextStep); };
    return ( <div className="modal-overlay" onClick={onClose}> <div className="modal-content" onClick={(e) => e.stopPropagation()}> <form onSubmit={handleSubmit}> <div className="modal-header"><h2>Call Feedback</h2><button type="button" className="btn-close" onClick={onClose}>&times;</button></div><div className="modal-body"><div className="form-group"><label>Provide feedback from the call.</label><textarea value={feedback} onChange={(e) => setFeedback(e.target.value)} required minLength={10}></textarea></div><div className="form-group"><label>Select the next step.</label><div className="radio-group"><label className={`radio-label ${nextStep === 'ready_for_submission' ? 'selected' : ''}`}><input type="radio" value="ready_for_submission" checked={nextStep === 'ready_for_submission'} onChange={(e) => setNextStep(e.target.value)} /> Ready for Submission</label><label className={`radio-label ${nextStep === 'declined' ? 'selected' : ''}`}><input type="radio" value="declined" checked={nextStep === 'declined'} onChange={(e) => setNextStep(e.target.value)} /> Reject Candidate</label></div></div></div><div className="modal-actions"><button type="button" className="btn-secondary" onClick={onClose}>Cancel</button><button type="submit" className="btn-primary">Submit Feedback</button></div></form> </div></div> );
};

// ===================================
// KANBAN CARD COMPONENT
// ===================================
const KanbanCard = ({ activity, onAccept, onDecline, onSchedule, onFeedback, onDelete }) => {
  const { activity_status, rating } = activity;
  const [confirmDelete, setConfirmDelete] = useState(false);
  const handleDeleteClick = (e) => { e.stopPropagation(); if (confirmDelete) { onDelete(activity.id); } else { setConfirmDelete(true); setTimeout(() => setConfirmDelete(false), 3000); } };
  const renderButtons = () => {
    switch(activity_status) {
      case 'reply_received': return ( <div className="action-buttons-group"><button className="btn-accept-interest" onClick={() => onAccept(activity.id)}><CheckCircle size={14} /> Accept</button><button className="btn-decline-interest" onClick={() => onDecline(activity)}><XCircle size={14} /> Decline</button></div> );
      case 'accepted': return <button className="btn-schedule-call" onClick={() => onSchedule(activity)}><Phone size={14} /> Schedule Call</button>;
      case 'call_scheduled': return <button className="btn-feedback" onClick={() => onFeedback(activity)}><MessageSquare size={14} /> Feedback on Call</button>;
      default: return null;
    }
  };
  return (
    <Draggable draggableId={String(activity.id)} index={activity.index}>
      {(provided, snapshot) => (
        <div ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps}>
          <motion.div className={`kanban-card ${snapshot.isDragging ? 'dragging' : ''}`} layoutId={`card-${activity.id}`}>
            <div className="card-top-bar">
                {rating > 0 && (
                    <div className="card-rating-display compact">
                        <span>{rating}</span>
                        <Star size={14} className="filled" />
                    </div>
                )}
                <button
                    className={`btn-delete ${confirmDelete ? 'confirm' : ''}`}
                    onClick={handleDeleteClick}
                    onMouseLeave={() => setConfirmDelete(false)}
                >
                    {confirmDelete ? <><AlertCircle size={14}/> Confirm</> : <Trash2 size={14} />}
                </button>
            </div>
            <div className="card-content">
                <div className="card-header">
                    <strong>{activity.candidate_name || 'LinkedIn Contact'}</strong>
                    <a href={activity.linkedin_url} target="_blank" rel="noopener noreferrer" title="View LinkedIn Profile"><ExternalLink size={16} /></a>
                </div>
                <p className="card-position">{activity.positions?.title || 'No Position'}</p>
            </div>
            <div className="card-button-container">{renderButtons()}</div>
          </motion.div>
        </div>
      )}
    </Draggable>
  );
};

// ===================================
// MAIN RECRUITER OUTREACH COMPONENT
// ===================================
function RecruiterOutreach() {
  const { showConfirmation } = useConfirmation();
  const { userProfile, fetchMyOutreachActivities, addOutreachActivity, updateOutreachActivity, deleteOutreachActivity, fetchPositions } = useData();
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [columns, setColumns] = useState({});
  const [modal, setModal] = useState({ type: null, data: null });
  
  // Form data state - persists across tab switches and accidental clicks
  const [outreachFormData, setOutreachFormData] = useState({
    candidateName: '',
    linkedinUrl: '',
    positionId: '',
    notes: '',
    rating: 0
  });
  
  const clearOutreachFormData = () => {
    setOutreachFormData({
      candidateName: '',
      linkedinUrl: '',
      positionId: '',
      notes: '',
      rating: 0
    });
  };
  
  const outreachStages = [ { id: 'outreach_sent', title: 'Outreach Sent' }, { id: 'reply_received', title: 'Reply Received' }, { id: 'accepted', title: 'Accepted' }, { id: 'call_scheduled', title: 'Call Scheduled' }, { id: 'declined', title: 'Declined' }, { id: 'ready_for_submission', title: 'Ready for Submission' }, ];
  useEffect(() => { if (userProfile?.id) loadActivities(); }, [userProfile]);
  useEffect(() => { const newColumns = outreachStages.reduce((acc, stage) => { acc[stage.id] = { ...stage, items: activities.filter(a => a.activity_status === stage.id).map((a, index) => ({...a, index})), }; return acc; }, {}); setColumns(newColumns); }, [activities]);
  const loadActivities = async () => { if (!loading) setLoading(true); await fetchPositions(); const myActivities = await fetchMyOutreachActivities(userProfile.id); if (myActivities) setActivities(myActivities); setLoading(false); };
  const handleDragEnd = async ({ source, destination, draggableId }) => { if (!destination || (source.droppableId === destination.droppableId && source.index === destination.index)) return; const newStatus = destination.droppableId; setActivities(prev => prev.map(act => String(act.id) === draggableId ? { ...act, activity_status: newStatus } : act)); const { success } = await updateOutreachActivity(draggableId, { activity_status: newStatus }); if (!success) { showConfirmation({ type: 'error', title: 'Error', message: 'Failed to update status. Reverting changes.', confirmText: 'OK', cancelText: null, onConfirm: () => {} }); loadActivities(); } };
  const handleAccept = async (activityId) => { setActivities(prev => prev.map(act => act.id === activityId ? { ...act, activity_status: 'accepted' } : act)); await updateOutreachActivity(activityId, { activity_status: 'accepted' }); };
  const handleDeclineSubmit = async (reason) => { const { id, notes } = modal.data; const updatedNotes = `Declined Reason: ${reason}\n---\n${notes || ''}`; setActivities(prev => prev.map(act => act.id === id ? { ...act, activity_status: 'declined', notes: updatedNotes } : act)); await updateOutreachActivity(id, { activity_status: 'declined', notes: updatedNotes }); setModal({ type: null, data: null }); };
  const handleScheduleSubmit = async (e) => { e.preventDefault(); const { id } = modal.data; const callDate = e.target.elements['call-date'].value; const phone = e.target.elements['candidate-phone'].value; setActivities(prev => prev.map(act => act.id === id ? { ...act, activity_status: 'call_scheduled', candidate_phone: phone, scheduled_call_date: callDate } : act)); await updateOutreachActivity(id, { activity_status: 'call_scheduled', scheduled_call_date: callDate, candidate_phone: phone }); setModal({ type: null, data: null }); };
  const handleFeedbackSubmit = async (feedback, nextStep) => { const { id, notes } = modal.data; const updatedNotes = `Call Feedback: ${feedback}\n---\n${notes || ''}`; setActivities(prev => prev.map(act => act.id === id ? { ...act, activity_status: nextStep, notes: updatedNotes } : act)); await updateOutreachActivity(id, { activity_status: nextStep, notes: updatedNotes }); setModal({ type: null, data: null }); };
  const handleAddOutreach = async (newActivityData) => { const { success } = await addOutreachActivity({ ...newActivityData, recruiter_id: userProfile.id }); if (success) { setModal({ type: null, data: null }); loadActivities(); } else { showConfirmation({ type: 'error', title: 'Error', message: 'Failed to add outreach.', confirmText: 'OK', cancelText: null, onConfirm: () => {} }); } };
  const handleDeleteOutreach = async (activityId) => { setActivities(prev => prev.filter(act => act.id !== activityId)); const { success } = await deleteOutreachActivity(activityId); if (!success) { showConfirmation({ type: 'error', title: 'Error', message: 'Failed to delete the outreach. It will be restored.', confirmText: 'OK', cancelText: null, onConfirm: () => {} }); loadActivities(); } };
  return (
    <div className="recruiter-outreach-container">
      <div className="page-header">
        {/* ** MODIFIED: Personalized Page Title ** */}
        <h1>{userProfile?.name ? `${userProfile.name}'s Outreach` : 'My Outreach'}</h1>
        <div className="header-actions"> <button className="btn-primary-action" onClick={() => setModal({ type: 'add_outreach' })}><PlusCircle size={16} /> Add Outreach</button> </div> </div>
      <MyActiveRoles userProfile={userProfile} />
      <CallsDashboard activities={activities} />
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="kanban-columns">
          {outreachStages.map(({ id, title }) => (
            <Droppable key={id} droppableId={id}>
              {(provided, snapshot) => (
                <div ref={provided.innerRef} {...provided.droppableProps} className={`kanban-column ${snapshot.isDraggingOver ? 'dragging-over' : ''}`}>
                  <div className="column-header"><h3>{title}</h3><span className="count-badge">{columns[id]?.items.length || 0}</span></div>
                  <div className="column-cards"> {columns[id]?.items.map((activity) => ( <KanbanCard key={activity.id} activity={activity} onAccept={handleAccept} onDecline={(data) => setModal({type: 'decline_reason', data})} onSchedule={(data) => setModal({type: 'schedule_call', data})} onFeedback={(data) => setModal({type: 'call_feedback', data})} onDelete={handleDeleteOutreach} /> ))} {provided.placeholder} </div>
                </div>
              )}
            </Droppable>
          ))}
        </div>
      </DragDropContext>
      {modal.type === 'add_outreach' && <AddOutreachModal onClose={() => setModal({ type: null })} onSave={handleAddOutreach} formData={outreachFormData} setFormData={setOutreachFormData} clearFormData={clearOutreachFormData} />}
      {modal.type === 'decline_reason' && <DeclineReasonModal onClose={() => setModal({ type: null })} onSubmit={handleDeclineSubmit} />}
      {modal.type === 'call_feedback' && <CallFeedbackModal onClose={() => setModal({ type: null })} onSubmit={handleFeedbackSubmit} />}
      {modal.type === 'schedule_call' && ( <div className="modal-overlay" onClick={() => setModal({ type: null })}> <div className="modal-content" onClick={(e) => e.stopPropagation()}> <form onSubmit={handleScheduleSubmit}> <div className="modal-header"><h2>Schedule Call for {modal.data?.candidate_name}</h2><button type="button" className="btn-close" onClick={() => setModal({ type: null })}>&times;</button></div><div className="modal-body"><div className="form-group"><label>Date and Time</label><input id="call-date" name="call-date" type="datetime-local" required /></div><div className="form-group"><label>Phone Number</label><input id="candidate-phone" name="candidate-phone" type="tel" placeholder="Enter phone number" /></div></div><div className="modal-actions"><button type="button" className="btn-secondary" onClick={() => setModal({ type: null })}>Cancel</button><button type="submit" className="btn-primary">Schedule</button></div></form> </div></div> )}
    </div>
  );
}
export default RecruiterOutreach;