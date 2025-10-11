import React, { useState, useEffect, useMemo } from 'react';
import { useData } from '../contexts/DataContext';
import { supabase } from '../services/supabaseClient';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, ExternalLink, Clock, Calendar, ChevronDown, ChevronUp,
  Send, X, AlertCircle, CheckCircle, Filter, Download
} from 'lucide-react';
import PageTransition from '../components/PageTransition';
import '../styles/RecruiterOutreach.css';

function RecruiterOutreach() {
  const {
    user,
    positions,
    fetchPositions,
    fetchMyOutreachActivities,
    createOutreachActivity,
    updateOutreachActivity,
    deleteOutreachActivity
  } = useData();

  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showLogModal, setShowLogModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [scheduleModalData, setScheduleModalData] = useState(null);
  const [expandedNotes, setExpandedNotes] = useState({});
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  // Resume upload state
  const [showResumeModal, setShowResumeModal] = useState(false);
  const [selectedActivityForResume, setSelectedActivityForResume] = useState(null);
  const [resumeUploadMethod, setResumeUploadMethod] = useState(null);
  const [resumeFile, setResumeFile] = useState(null);
  const [manualResumeUrl, setManualResumeUrl] = useState('');

  // Filters
  const [filterPosition, setFilterPosition] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [dateRange, setDateRange] = useState('all');

  // Log Activity Form State
  const [logForm, setLogForm] = useState({
    linkedin_url: '',
    position_id: '',
    candidate_name: '',
    activity_status: 'outreach_sent',
    scheduled_call_date: '',
    scheduled_call_time: '',
    call_duration: '30',
    notes: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    await fetchPositions();
    if (user?.email) {
      const data = await fetchMyOutreachActivities(user.email);
      if (data) {
        setActivities(data);
      }
    }
    setLoading(false);
  }

  function showToast(message, type = 'success') {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
  }

  function validateLinkedInUrl(url) {
    const linkedinPattern = /^https?:\/\/(www\.)?linkedin\.com\/.+/i;
    return linkedinPattern.test(url);
  }

  async function handleLogActivity(e) {
    e.preventDefault();

    // Validate LinkedIn URL
    if (!validateLinkedInUrl(logForm.linkedin_url)) {
      showToast('Please enter a valid LinkedIn URL', 'error');
      return;
    }

    // Check for duplicate
    const duplicate = activities.find(a =>
      a.linkedin_url === logForm.linkedin_url &&
      a.position_id === logForm.position_id
    );

    if (duplicate) {
      const proceed = window.confirm('You already reached out to this person for this role. Continue anyway?');
      if (!proceed) return;
    }

    // Prepare activity data (recruiter_id will be added by DataContext)
    const activityData = {
      position_id: logForm.position_id,
      linkedin_url: logForm.linkedin_url,
      candidate_name: logForm.candidate_name || null,
      activity_status: logForm.activity_status,
      notes: logForm.notes || null
    };

    // Add scheduled call data if applicable
    if (logForm.activity_status === 'call_scheduled' && logForm.scheduled_call_date && logForm.scheduled_call_time) {
      const callDateTime = new Date(`${logForm.scheduled_call_date}T${logForm.scheduled_call_time}`);
      activityData.scheduled_call_date = callDateTime.toISOString();
    }

    const result = await createOutreachActivity(activityData);

    if (result.success) {
      showToast('Activity logged successfully!');
      setShowLogModal(false);
      resetLogForm();
      await loadData();
    } else {
      showToast('Error logging activity: ' + result.error.message, 'error');
    }
  }

  function resetLogForm() {
    setLogForm({
      linkedin_url: '',
      position_id: '',
      candidate_name: '',
      activity_status: 'outreach_sent',
      scheduled_call_date: '',
      scheduled_call_time: '',
      call_duration: '30',
      notes: ''
    });
  }

  async function handleMarkCold(activity) {
    const confirm = window.confirm('Mark this candidate as cold?');
    if (!confirm) return;

    await updateOutreachActivity(activity.id, { activity_status: 'cold' });
    showToast('Candidate marked as cold');
    await loadData();
  }

  async function handleMarkComplete(activity) {
    await updateOutreachActivity(activity.id, { activity_status: 'completed' });
    const addToPipeline = window.confirm('Great! Add this candidate to the formal pipeline?');
    if (addToPipeline) {
      // TODO: Navigate to Talent Pool with pre-filled data
      showToast('Candidate marked complete. Navigate to Talent Pool to add them.');
    } else {
      showToast('Candidate marked complete');
    }
    await loadData();
  }

  function openScheduleModal(activity) {
    setScheduleModalData(activity);
    setShowScheduleModal(true);
  }

  async function handleScheduleCall(e) {
    e.preventDefault();
    const form = e.target;
    const callDate = form.call_date.value;
    const callTime = form.call_time.value;

    if (!callDate || !callTime) {
      showToast('Please select date and time', 'error');
      return;
    }

    const callDateTime = new Date(`${callDate}T${callTime}`);

    await updateOutreachActivity(scheduleModalData.id, {
      activity_status: 'call_scheduled',
      scheduled_call_date: callDateTime.toISOString()
    });

    showToast('Call scheduled successfully!');
    setShowScheduleModal(false);
    setScheduleModalData(null);
    await loadData();
  }

  async function handleDragEnd(result) {
    const { source, destination, draggableId } = result;
    if (!destination || source.droppableId === destination.droppableId) return;

    const activity = activities.find(a => a.id === draggableId);
    if (!activity) return;

    let newStatus = destination.droppableId;

    // Update activity status
    await updateOutreachActivity(activity.id, { activity_status: newStatus });
    await loadData();
    showToast('Status updated');
  }

  async function handleDeleteActivity(activityId) {
    const confirm = window.confirm('Are you sure you want to delete this activity?');
    if (!confirm) return;

    await deleteOutreachActivity(activityId);
    showToast('Activity deleted');
    await loadData();
  }

  // Accept/Decline Interest functions
  async function handleAcceptInterest(activity) {
    const confirm = window.confirm(`Mark ${activity.candidate_name || 'this candidate'} as Accepted Interest?`);
    if (!confirm) return;

    await updateOutreachActivity(activity.id, {
      activity_status: 'accepted',
      notes: `${activity.notes || ''}\n\n✅ Accepted Interest - ${new Date().toLocaleDateString()}`
    });

    showToast('Candidate accepted! You can now upload resume and schedule call.');
    await loadData();
  }

  async function handleDeclineInterest(activity) {
    const reason = prompt('Optional: Why did they decline?');

    await updateOutreachActivity(activity.id, {
      activity_status: 'declined',
      notes: `${activity.notes || ''}\n\n❌ Declined${reason ? ': ' + reason : ''} - ${new Date().toLocaleDateString()}`
    });

    showToast('Candidate marked as declined.');
    await loadData();
  }

  // Resume Upload functions
  function openResumeModal(activity, method) {
    setSelectedActivityForResume(activity);
    setResumeUploadMethod(method);
    setShowResumeModal(true);
    setResumeFile(null);
    setManualResumeUrl('');
  }

  async function handleResumeUploadParse() {
    if (!resumeFile) {
      showToast('Please select a file', 'error');
      return;
    }

    const BUCKET_NAME = 'resumes';
    const fileName = `${Date.now()}_${resumeFile.name}`;

    // Upload to Supabase
    const { error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(fileName, resumeFile);

    if (uploadError) {
      showToast('Upload error: ' + uploadError.message, 'error');
      return;
    }

    const { data: { publicUrl } } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(fileName);

    // Update activity with resume URL
    await updateOutreachActivity(selectedActivityForResume.id, {
      notes: `${selectedActivityForResume.notes || ''}\n\n📄 Resume: ${publicUrl}`
    });

    // Send to N8N for parsing
    try {
      await fetch('https://jtsimon416.app.n8n.cloud/webhook/00741332-4763-439b-87d0-d19a13f5a0d0', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resume_url: publicUrl })
      });
      showToast('Resume uploaded and sent for parsing!');
    } catch (error) {
      showToast('Resume uploaded (parsing unavailable)', 'warning');
    }

    setShowResumeModal(false);
    await loadData();
  }

  async function handleResumeUploadManual() {
    if (!manualResumeUrl.trim()) {
      showToast('Please enter a resume URL', 'error');
      return;
    }

    await updateOutreachActivity(selectedActivityForResume.id, {
      notes: `${selectedActivityForResume.notes || ''}\n\n📄 Resume URL: ${manualResumeUrl}`
    });

    showToast('Resume URL saved!');
    setShowResumeModal(false);
    await loadData();
  }

  // Helper function to check if activity has resume
  function hasResume(activity) {
    return activity.notes && activity.notes.includes('📄 Resume');
  }

  // Add to Talent Pool / Pipeline functions
  async function handleAddToTalentPool(activity) {
    if (!hasResume(activity)) {
      showToast('Resume required to add to Talent Pool', 'error');
      return;
    }

    const confirm = window.confirm(`Add ${activity.candidate_name || 'this candidate'} to Talent Pool?`);
    if (!confirm) return;

    // Extract resume URL from notes
    const resumeMatch = activity.notes.match(/📄 Resume.*?:(.+?)(\n|$)/);
    const resumeUrl = resumeMatch ? resumeMatch[1].trim() : '';

    const candidateData = {
      name: activity.candidate_name || 'LinkedIn Contact',
      email: '', // To be filled later
      linkedin_url: activity.linkedin_url,
      resume_url: resumeUrl,
      notes: activity.notes || '',
      skills: []
    };

    const { error } = await supabase
      .from('candidates')
      .insert([candidateData]);

    if (error) {
      showToast('Error adding to Talent Pool: ' + error.message, 'error');
      return;
    }

    await updateOutreachActivity(activity.id, {
      activity_status: 'added_to_pool'
    });

    showToast('✅ Candidate added to Talent Pool!');
    await loadData();
  }

  async function handleAddToPipeline(activity) {
    if (!hasResume(activity)) {
      showToast('Resume required to add to Pipeline', 'error');
      return;
    }

    const confirm = window.confirm(`Add ${activity.candidate_name || 'this candidate'} to Pipeline for Director screening?`);
    if (!confirm) return;

    // Extract resume URL from notes
    const resumeMatch = activity.notes.match(/📄 Resume.*?:(.+?)(\n|$)/);
    const resumeUrl = resumeMatch ? resumeMatch[1].trim() : '';

    // First create candidate in Talent Pool
    const candidateData = {
      name: activity.candidate_name || 'LinkedIn Contact',
      email: '',
      linkedin_url: activity.linkedin_url,
      resume_url: resumeUrl,
      notes: activity.notes || '',
      skills: []
    };

    const { data: newCandidate, error: candidateError } = await supabase
      .from('candidates')
      .insert([candidateData])
      .select()
      .single();

    if (candidateError) {
      showToast('Error creating candidate: ' + candidateError.message, 'error');
      return;
    }

    // Then add to pipeline
    const pipelineData = {
      candidate_id: newCandidate.id,
      position_id: activity.position_id,
      recruiter_id: activity.recruiter_id,
      stage: 'Screening',
      status: 'Active'
    };

    const { error: pipelineError } = await supabase
      .from('pipeline')
      .insert([pipelineData]);

    if (pipelineError) {
      showToast('Error adding to pipeline: ' + pipelineError.message, 'error');
      return;
    }

    await updateOutreachActivity(activity.id, {
      activity_status: 'added_to_pipeline'
    });

    showToast('✅ Candidate added to Pipeline and submitted to Director!');
    await loadData();
  }

  // Get today's calls
  const todaysCalls = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return activities.filter(a => {
      if (!a.scheduled_call_date) return false;
      const callDate = new Date(a.scheduled_call_date);
      return callDate >= today && callDate < tomorrow;
    }).sort((a, b) => new Date(a.scheduled_call_date) - new Date(b.scheduled_call_date));
  }, [activities]);

  // Kanban columns (filtered to exclude declined)
  const waitingActivities = useMemo(() => {
    return activities.filter(a => a.activity_status === 'outreach_sent').sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  }, [activities]);

  const repliedActivities = useMemo(() => {
    return activities.filter(a => a.activity_status === 'reply_received').sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }, [activities]);

  const acceptedActivities = useMemo(() => {
    return activities.filter(a => a.activity_status === 'accepted').sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }, [activities]);

  const scheduledActivities = useMemo(() => {
    return activities.filter(a => a.activity_status === 'call_scheduled').sort((a, b) => new Date(a.scheduled_call_date) - new Date(b.scheduled_call_date));
  }, [activities]);

  // Declined count
  const declinedCount = activities.filter(a => a.activity_status === 'declined').length;

  // Recent activity feed with filters
  const recentActivities = useMemo(() => {
    let filtered = activities
      .filter(a => a.activity_status !== 'cold')
      .filter(a => a.activity_status !== 'declined'); // Hide declined

    if (filterPosition !== 'all') {
      filtered = filtered.filter(a => a.position_id === filterPosition);
    }

    if (filterStatus !== 'all') {
      filtered = filtered.filter(a => a.activity_status === filterStatus);
    }

    if (dateRange === 'today') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      filtered = filtered.filter(a => new Date(a.created_at) >= today);
    } else if (dateRange === 'week') {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      filtered = filtered.filter(a => new Date(a.created_at) >= weekAgo);
    }

    return filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 50);
  }, [activities, filterPosition, filterStatus, dateRange]);

  // Next 7 days calendar
  const next7Days = useMemo(() => {
    const days = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date();
      date.setDate(date.getDate() + i);
      date.setHours(0, 0, 0, 0);

      const nextDay = new Date(date);
      nextDay.setDate(nextDay.getDate() + 1);

      const calls = activities.filter(a => {
        if (!a.scheduled_call_date) return false;
        const callDate = new Date(a.scheduled_call_date);
        return callDate >= date && callDate < nextDay;
      }).sort((a, b) => new Date(a.scheduled_call_date) - new Date(b.scheduled_call_date));

      days.push({ date, calls });
    }
    return days;
  }, [activities]);

  function getTimeAgo(date) {
    const now = new Date();
    const then = new Date(date);
    const seconds = Math.floor((now - then) / 1000);

    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)} days ago`;
    return then.toLocaleDateString();
  }

  function formatCallTime(date) {
    return new Date(date).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  }

  function formatCallDateTime(date) {
    const d = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const callDate = new Date(d);
    callDate.setHours(0, 0, 0, 0);

    if (callDate.getTime() === today.getTime()) {
      return `Today ${formatCallTime(d)}`;
    } else if (callDate.getTime() === tomorrow.getTime()) {
      return `Tomorrow ${formatCallTime(d)}`;
    } else {
      return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
    }
  }

  function getUrgencyColor(days) {
    if (days >= 7) return '#f7768e'; // Red
    if (days >= 5) return '#ff9e64'; // Orange
    if (days >= 3) return '#e0af68'; // Yellow
    return '#9ECE6A'; // Green
  }

  function getStatusColor(status) {
    switch(status) {
      case 'outreach_sent': return '#7AA2F7';
      case 'reply_received': return '#9ECE6A';
      case 'accepted': return '#73daca';
      case 'declined': return '#565f89';
      case 'call_scheduled': return '#BB9AF7';
      case 'added_to_pool': return '#7dcfff';
      case 'added_to_pipeline': return '#9ECE6A';
      case 'cold': return '#565f89';
      case 'completed': return '#7dcfff';
      default: return '#c0caf5';
    }
  }

  function getStatusLabel(status) {
    switch(status) {
      case 'outreach_sent': return 'Outreach Sent';
      case 'reply_received': return 'Reply Received';
      case 'accepted': return 'Accepted Interest';
      case 'declined': return 'Declined';
      case 'call_scheduled': return 'Call Scheduled';
      case 'added_to_pool': return 'Added to Pool ✓';
      case 'added_to_pipeline': return 'Added to Pipeline ✓';
      case 'cold': return 'Cold';
      case 'completed': return 'Completed';
      default: return status;
    }
  }

  return (
    <>
    <PageTransition isLoading={loading}>
      <div className="page-container recruiter-outreach-container">
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
        <h1>My LinkedIn Outreach</h1>
        <p className="subtitle">Track your conversations and never miss a follow-up</p>
      </div>

      {/* Declined Count Banner */}
      {declinedCount > 0 && (
        <div className="declined-count-banner">
          ❌ {declinedCount} candidate{declinedCount > 1 ? 's' : ''} declined for active roles
        </div>
      )}

      {/* A. TODAY'S AGENDA */}
      <div className="todays-agenda-section">
        <h2>Today's Agenda</h2>

        <div className="agenda-grid">
          {/* Calls Scheduled Today */}
          <div className="agenda-card">
            <h3><Calendar size={20} /> Calls Scheduled Today</h3>
            {todaysCalls.length === 0 ? (
              <p className="empty-message">No calls scheduled for today</p>
            ) : (
              <div className="calls-list">
                {todaysCalls.map(call => (
                  <div key={call.id} className="call-item">
                    <div className="call-time">{formatCallTime(call.scheduled_call_date)}</div>
                    <div className="call-details">
                      <strong>{call.candidate_name || 'LinkedIn Contact'}</strong>
                      <p>{call.positions?.title}</p>
                      <div className="call-actions">
                        <a href={call.linkedin_url} target="_blank" rel="noopener noreferrer" className="btn-icon">
                          <ExternalLink size={16} /> LinkedIn
                        </a>
                        <button className="btn-small btn-primary" onClick={() => handleMarkComplete(call)}>
                          Mark Complete
                        </button>
                      </div>
                      {call.notes && (
                        <div className="call-notes">
                          <button
                            className="btn-collapse"
                            onClick={() => setExpandedNotes(prev => ({...prev, [call.id]: !prev[call.id]}))}
                          >
                            Prep Notes {expandedNotes[call.id] ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                          </button>
                          {expandedNotes[call.id] && <p className="notes-content">{call.notes}</p>}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>

      {/* C. KANBAN BOARD */}
      <div className="kanban-section">
        <h2>My Active Conversations</h2>
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="kanban-columns">
            {/* WAITING */}
            <Droppable droppableId="outreach_sent">
              {(provided, snapshot) => (
                <div
                  className={`kanban-column ${snapshot.isDraggingOver ? 'dragging-over' : ''}`}
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                >
                  <div className="column-header">
                    <h3>Waiting</h3>
                    <span className="count-badge">{waitingActivities.length}</span>
                  </div>
                  <div className="column-cards">
                    {waitingActivities.map((activity, index) => {
                      const daysSince = Math.floor((new Date() - new Date(activity.created_at)) / (1000 * 60 * 60 * 24));
                      const borderColor = daysSince >= 7 ? '#f7768e' : daysSince >= 5 ? '#e0af68' : 'transparent';

                      return (
                        <Draggable key={activity.id} draggableId={activity.id} index={index}>
                          {(provided, snapshot) => (
                            <motion.div
                              className={`kanban-card ${snapshot.isDragging ? 'dragging' : ''}`}
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              style={{
                                ...provided.draggableProps.style,
                                borderLeft: borderColor !== 'transparent' ? `4px solid ${borderColor}` : 'none'
                              }}
                              layout
                            >
                              <strong>{activity.candidate_name || 'LinkedIn Contact'}</strong>
                              <p className="position-name">{activity.positions?.title}</p>
                              <p className="time-ago">{getTimeAgo(activity.created_at)}</p>
                              <div className="card-actions">
                                <a href={activity.linkedin_url} target="_blank" rel="noopener noreferrer" className="btn-icon">
                                  <ExternalLink size={14} />
                                </a>
                              </div>
                            </motion.div>
                          )}
                        </Draggable>
                      );
                    })}
                    {provided.placeholder}
                  </div>
                </div>
              )}
            </Droppable>

            {/* REPLIED */}
            <Droppable droppableId="reply_received">
              {(provided, snapshot) => (
                <div
                  className={`kanban-column ${snapshot.isDraggingOver ? 'dragging-over' : ''}`}
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                >
                  <div className="column-header">
                    <h3>Replied</h3>
                    <span className="count-badge">{repliedActivities.length}</span>
                  </div>
                  <div className="column-cards">
                    {repliedActivities.map((activity, index) => (
                      <Draggable key={activity.id} draggableId={activity.id} index={index}>
                        {(provided, snapshot) => (
                          <motion.div
                            className={`kanban-card ${snapshot.isDragging ? 'dragging' : ''}`}
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            layout
                          >
                            <strong>{activity.candidate_name || 'LinkedIn Contact'}</strong>
                            <p className="position-name">{activity.positions?.title}</p>
                            <p className="time-ago">{getTimeAgo(activity.created_at)}</p>
                            <div className="card-actions action-buttons-group">
                              <a href={activity.linkedin_url} target="_blank" rel="noopener noreferrer" className="btn-icon">
                                <ExternalLink size={14} />
                              </a>
                              <button
                                className="btn-accept-interest"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleAcceptInterest(activity);
                                }}
                              >
                                <CheckCircle size={16} />
                                Accept
                              </button>
                              <button
                                className="btn-decline-interest"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeclineInterest(activity);
                                }}
                              >
                                <X size={16} />
                                Decline
                              </button>
                            </div>
                          </motion.div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                </div>
              )}
            </Droppable>

            {/* ACCEPTED */}
            <Droppable droppableId="accepted">
              {(provided, snapshot) => (
                <div
                  className={`kanban-column ${snapshot.isDraggingOver ? 'dragging-over' : ''}`}
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                >
                  <div className="column-header">
                    <h3>Accepted</h3>
                    <span className="count-badge">{acceptedActivities.length}</span>
                  </div>
                  <div className="column-cards">
                    {acceptedActivities.map((activity, index) => (
                      <Draggable key={activity.id} draggableId={activity.id} index={index}>
                        {(provided, snapshot) => (
                          <motion.div
                            className={`kanban-card ${snapshot.isDragging ? 'dragging' : ''}`}
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            layout
                          >
                            <strong>{activity.candidate_name || 'LinkedIn Contact'}</strong>
                            <p className="position-name">{activity.positions?.title}</p>
                            <p className="time-ago">{getTimeAgo(activity.created_at)}</p>
                            {hasResume(activity) && (
                              <span className="resume-indicator">📄 Resume Attached</span>
                            )}
                            <div className="card-actions action-buttons-group">
                              <a href={activity.linkedin_url} target="_blank" rel="noopener noreferrer" className="btn-icon">
                                <ExternalLink size={14} />
                              </a>
                              {!hasResume(activity) ? (
                                <>
                                  <button
                                    className="btn-upload-resume"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      openResumeModal(activity, 'parse');
                                    }}
                                  >
                                    📄 Upload Resume
                                  </button>
                                  <button
                                    className="btn-upload-resume-manual"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      openResumeModal(activity, 'manual');
                                    }}
                                  >
                                    🔗 Add URL
                                  </button>
                                </>
                              ) : (
                                <button className="btn-schedule-call" onClick={() => openScheduleModal(activity)}>
                                  📞 Schedule Call
                                </button>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                </div>
              )}
            </Droppable>

            {/* SCHEDULED */}
            <Droppable droppableId="call_scheduled">
              {(provided, snapshot) => (
                <div
                  className={`kanban-column ${snapshot.isDraggingOver ? 'dragging-over' : ''}`}
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                >
                  <div className="column-header">
                    <h3>Scheduled</h3>
                    <span className="count-badge">{scheduledActivities.length}</span>
                  </div>
                  <div className="column-cards">
                    {scheduledActivities.map((activity, index) => (
                      <Draggable key={activity.id} draggableId={activity.id} index={index}>
                        {(provided, snapshot) => (
                          <motion.div
                            className={`kanban-card ${snapshot.isDragging ? 'dragging' : ''}`}
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            layout
                          >
                            <strong>{activity.candidate_name || 'LinkedIn Contact'}</strong>
                            <p className="position-name">{activity.positions?.title}</p>
                            <p className="call-time-display">{formatCallDateTime(activity.scheduled_call_date)}</p>
                            {hasResume(activity) && (
                              <span className="resume-indicator">📄 Resume Attached</span>
                            )}
                            <div className="card-actions action-buttons-group">
                              <a href={activity.linkedin_url} target="_blank" rel="noopener noreferrer" className="btn-icon">
                                <ExternalLink size={14} />
                              </a>
                              {hasResume(activity) ? (
                                <>
                                  <button
                                    className="btn-add-pool"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleAddToTalentPool(activity);
                                    }}
                                  >
                                    💼 Talent Pool
                                  </button>
                                  <button
                                    className="btn-add-pipeline"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleAddToPipeline(activity);
                                    }}
                                  >
                                    🚀 Pipeline
                                  </button>
                                </>
                              ) : (
                                <button
                                  className="btn-upload-resume"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openResumeModal(activity, 'parse');
                                  }}
                                  title="Resume required"
                                >
                                  📄 Upload Resume First
                                </button>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                </div>
              )}
            </Droppable>
          </div>
        </DragDropContext>
      </div>

      {/* D. WEEKLY CALENDAR */}
      <div className="calendar-section">
        <div className="section-header">
          <h2>Next 7 Days</h2>
        </div>
        <div className="calendar-grid">
          {next7Days.map((day, index) => (
            <div key={index} className="calendar-day-card">
              <div className="day-header">
                <strong>{day.date.toLocaleDateString('en-US', { weekday: 'short' })}</strong>
                <span>{day.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
              </div>
              {day.calls.length === 0 ? (
                <p className="no-calls">No calls scheduled</p>
              ) : (
                <div className="day-calls">
                  {day.calls.map(call => (
                    <div key={call.id} className="mini-call-item">
                      <div className="call-time">{formatCallTime(call.scheduled_call_date)}</div>
                      <div className="call-name">{call.candidate_name || 'LinkedIn Contact'}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* E. RECENT ACTIVITY FEED */}
      <div className="activity-feed-section">
        <div className="section-header">
          <h2>Recent Activity</h2>
          <div className="filters">
            <select value={filterPosition} onChange={(e) => setFilterPosition(e.target.value)}>
              <option value="all">All Positions</option>
              {positions.filter(p => p.status === 'Open').map(pos => (
                <option key={pos.id} value={pos.id}>{pos.title}</option>
              ))}
            </select>
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
              <option value="all">All Statuses</option>
              <option value="outreach_sent">Outreach Sent</option>
              <option value="reply_received">Reply Received</option>
              <option value="call_scheduled">Call Scheduled</option>
              <option value="completed">Completed</option>
            </select>
            <select value={dateRange} onChange={(e) => setDateRange(e.target.value)}>
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="week">This Week</option>
            </select>
          </div>
        </div>

        <div className="activity-feed">
          {!loading && recentActivities.length === 0 ? (
            <div className="empty-state">
              <p>No activities found. Start logging your LinkedIn outreach!</p>
            </div>
          ) : !loading && (
            recentActivities.map(activity => (
              <motion.div
                key={activity.id}
                className="activity-card"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                layout
              >
                <div className="activity-header">
                  <div className="activity-title">
                    <strong>{activity.candidate_name || 'LinkedIn Contact'}</strong>
                    <span
                      className="status-badge"
                      style={{ backgroundColor: getStatusColor(activity.activity_status) }}
                    >
                      {getStatusLabel(activity.activity_status)}
                    </span>
                  </div>
                  <span className="time-ago">{getTimeAgo(activity.created_at)}</span>
                </div>

                <div className="activity-body">
                  <a
                    href={activity.linkedin_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="linkedin-link-prominent"
                  >
                    <ExternalLink size={18} /> View LinkedIn Profile
                  </a>
                  <p className="position-info">{activity.positions?.title}</p>

                  {activity.notes && (
                    <div className="activity-notes">
                      <button
                        className="btn-collapse"
                        onClick={() => setExpandedNotes(prev => ({...prev, [`feed-${activity.id}`]: !prev[`feed-${activity.id}`]}))}
                      >
                        Notes {expandedNotes[`feed-${activity.id}`] ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </button>
                      {expandedNotes[`feed-${activity.id}`] && <p className="notes-content">{activity.notes}</p>}
                    </div>
                  )}
                </div>

                <div className="activity-actions">
                  <button className="btn-small btn-secondary" onClick={() => handleDeleteActivity(activity.id)}>
                    Delete
                  </button>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>

      {/* F. LOG ACTIVITY MODAL */}
      <AnimatePresence>
        {showLogModal && (
          <motion.div
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowLogModal(false)}
          >
            <motion.div
              className="modal-content log-modal"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="modal-header">
                <h2>Log LinkedIn Activity</h2>
                <button className="btn-close" onClick={() => setShowLogModal(false)}>
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleLogActivity} className="log-form">
                <div className="form-group">
                  <label>LinkedIn URL *</label>
                  <input
                    type="url"
                    value={logForm.linkedin_url}
                    onChange={(e) => setLogForm({...logForm, linkedin_url: e.target.value})}
                    placeholder="https://www.linkedin.com/in/..."
                    required
                    className="input-large"
                  />
                </div>

                <div className="form-group">
                  <label>Position *</label>
                  <select
                    value={logForm.position_id}
                    onChange={(e) => setLogForm({...logForm, position_id: e.target.value})}
                    required
                  >
                    <option value="">Select a position</option>
                    {positions.filter(p => p.status === 'Open').map(pos => (
                      <option key={pos.id} value={pos.id}>{pos.title}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Candidate Name (optional)</label>
                  <input
                    type="text"
                    value={logForm.candidate_name}
                    onChange={(e) => setLogForm({...logForm, candidate_name: e.target.value})}
                    placeholder="John Doe"
                  />
                </div>

                <div className="form-group">
                  <label>Activity Status</label>
                  <div className="radio-group">
                    <label className="radio-label">
                      <input
                        type="radio"
                        value="outreach_sent"
                        checked={logForm.activity_status === 'outreach_sent'}
                        onChange={(e) => setLogForm({...logForm, activity_status: e.target.value})}
                      />
                      Outreach Sent
                    </label>
                    <label className="radio-label">
                      <input
                        type="radio"
                        value="reply_received"
                        checked={logForm.activity_status === 'reply_received'}
                        onChange={(e) => setLogForm({...logForm, activity_status: e.target.value})}
                      />
                      Reply Received
                    </label>
                    <label className="radio-label">
                      <input
                        type="radio"
                        value="call_scheduled"
                        checked={logForm.activity_status === 'call_scheduled'}
                        onChange={(e) => setLogForm({...logForm, activity_status: e.target.value})}
                      />
                      Call Scheduled
                    </label>
                  </div>
                </div>

                {logForm.activity_status === 'call_scheduled' && (
                  <div className="form-group-row">
                    <div className="form-group">
                      <label>Date *</label>
                      <input
                        type="date"
                        value={logForm.scheduled_call_date}
                        onChange={(e) => setLogForm({...logForm, scheduled_call_date: e.target.value})}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label>Time *</label>
                      <input
                        type="time"
                        value={logForm.scheduled_call_time}
                        onChange={(e) => setLogForm({...logForm, scheduled_call_time: e.target.value})}
                        required
                      />
                    </div>
                  </div>
                )}

                <div className="form-group">
                  <label>Notes (optional)</label>
                  <textarea
                    value={logForm.notes}
                    onChange={(e) => setLogForm({...logForm, notes: e.target.value})}
                    placeholder="Add any relevant notes..."
                    rows="3"
                  />
                </div>

                <div className="modal-actions">
                  <button type="button" className="btn-secondary" onClick={() => setShowLogModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary">
                    Save Activity
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* SCHEDULE CALL MODAL */}
      <AnimatePresence>
        {showScheduleModal && scheduleModalData && (
          <motion.div
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowScheduleModal(false)}
          >
            <motion.div
              className="modal-content schedule-modal"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="modal-header">
                <h2>Schedule Call</h2>
                <button className="btn-close" onClick={() => setShowScheduleModal(false)}>
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleScheduleCall} className="schedule-form">
                <p className="modal-subtitle">
                  {scheduleModalData.candidate_name || 'LinkedIn Contact'} - {scheduleModalData.positions?.title}
                </p>

                <div className="form-group-row">
                  <div className="form-group">
                    <label>Date *</label>
                    <input type="date" name="call_date" required />
                  </div>
                  <div className="form-group">
                    <label>Time *</label>
                    <input type="time" name="call_time" required />
                  </div>
                </div>

                <div className="modal-actions">
                  <button type="button" className="btn-secondary" onClick={() => setShowScheduleModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary">
                    Schedule Call
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* RESUME UPLOAD MODAL */}
      {showResumeModal && (
        <div className="modal-overlay" onClick={() => setShowResumeModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Upload Resume</h2>
            <p className="modal-subtext">
              For: {selectedActivityForResume?.candidate_name || 'LinkedIn Contact'}
            </p>

            {resumeUploadMethod === 'parse' ? (
              <div className="form-group">
                <label>Select Resume File (.pdf, .doc, .docx)</label>
                <input
                  type="file"
                  accept=".pdf,.doc,.docx"
                  onChange={(e) => setResumeFile(e.target.files[0])}
                  className="file-input"
                />
                <div className="modal-actions">
                  <button className="btn-primary" onClick={handleResumeUploadParse}>
                    Upload & Parse
                  </button>
                  <button className="btn-secondary" onClick={() => setShowResumeModal(false)}>
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="form-group">
                <label>Resume URL</label>
                <input
                  type="url"
                  value={manualResumeUrl}
                  onChange={(e) => setManualResumeUrl(e.target.value)}
                  placeholder="https://..."
                  className="input-field"
                />
                <div className="modal-actions">
                  <button className="btn-primary" onClick={handleResumeUploadManual}>
                    Save URL
                  </button>
                  <button className="btn-secondary" onClick={() => setShowResumeModal(false)}>
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      </div>
    </PageTransition>

    {/* Floating Log Activity Button - OUTSIDE PageTransition */}
    <motion.button
      className="btn-floating-add"
      onClick={() => setShowLogModal(true)}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.95 }}
      title="Log New Outreach Activity"
      style={{
        position: 'fixed',
        bottom: '30px',
        right: '30px',
        zIndex: 9999
      }}
    >
      <Plus size={24} />
    </motion.button>
  </>
  );
}

export default RecruiterOutreach;
