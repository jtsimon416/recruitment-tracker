import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';
import '../styles/InterviewHub.css';

function InterviewHub() {
  // Core Data
  const [interviews, setInterviews] = useState([]);
  const [positions, setPositions] = useState([]);
  const [candidates, setCandidates] = useState([]);
  const [pipeline, setPipeline] = useState([]);
  const [filteredCandidates, setFilteredCandidates] = useState([]);
  const [loading, setLoading] = useState(true);

  // UI State
  const [showScheduleForm, setShowScheduleForm] = useState(false);
  
  // New Modal State Management
  const [modalState, setModalState] = useState({ 
    mode: 'closed', // 'closed', 'update', 'scheduleNext', 'history'
    data: null 
  });
  
  // Form Data States
  const [scheduleFormData, setScheduleFormData] = useState({
    candidate_id: '',
    position_id: '',
    interview_date: '',
    interview_type: '',
    interviewer_name: '',
  });
  const [updateFormData, setUpdateFormData] = useState({
    feedback: '',
  });

  // History State
  const [interviewHistory, setInterviewHistory] = useState([]);
  
  const stages = ['Screening', 'Submit to Client', 'Interview 1', 'Interview 2', 'Interview 3', 'Offer', 'Hired'];

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (scheduleFormData.position_id) {
      const pipelineForPosition = pipeline.filter(p => p.position_id === scheduleFormData.position_id);
      const candidateIds = pipelineForPosition.map(p => p.candidate_id);
      const candidatesInPipeline = candidates.filter(c => candidateIds.includes(c.id));
      setFilteredCandidates(candidatesInPipeline);
    } else {
      setFilteredCandidates([]);
    }
  }, [scheduleFormData.position_id, pipeline, candidates]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [interviewsRes, positionsRes, candidatesRes, pipelineRes] = await Promise.all([
        supabase.from('interviews').select(`*, candidates(name, email), positions(title, clients(company_name))`).order('interview_date', { ascending: false }),
        supabase.from('positions').select('*, clients(company_name)').eq('status', 'Open'),
        supabase.from('candidates').select('*').order('name'),
        supabase.from('pipeline').select('*')
      ]);

      if (interviewsRes.error) throw interviewsRes.error;
      if (positionsRes.error) throw positionsRes.error;
      if (candidatesRes.error) throw candidatesRes.error;
      if (pipelineRes.error) throw pipelineRes.error;

      setInterviews(interviewsRes.data || []);
      setPositions(positionsRes.data || []);
      setCandidates(candidatesRes.data || []);
      setPipeline(pipelineRes.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const resetScheduleForm = () => {
    setScheduleFormData({ candidate_id: '', position_id: '', interview_date: '', interview_type: '', interviewer_name: '' });
    setShowScheduleForm(false);
  };
  
  const closeModal = () => {
    setModalState({ mode: 'closed', data: null });
    setUpdateFormData({ feedback: '' });
    setInterviewHistory([]);
  };

  const handleScheduleSubmit = async (e) => {
    e.preventDefault();
    try {
      const { error } = await supabase.from('interviews').insert([{ ...scheduleFormData }]);
      if (error) throw error;

      alert('Interview scheduled successfully!');
      resetScheduleForm();
      closeModal(); // Close modal if scheduling was a follow-up
      fetchData();
    } catch (error) {
      console.error('Error scheduling interview:', error);
      alert('Error scheduling interview. Please try again.');
    }
  };

  const handleDecisionSubmit = async (decision) => {
    const { interview } = modalState.data;
    
    try {
      // 1. Save feedback for the current interview
      const { error: interviewError } = await supabase.from('interviews').update({
        feedback: updateFormData.feedback,
        outcome: decision === 'advance' ? 'Passed' : decision === 'hold' ? 'Hold' : decision === 'reject' ? 'Failed' : null,
      }).eq('id', interview.id);
      if (interviewError) throw interviewError;

      // 2. Find the corresponding pipeline entry
      const { data: pipelineEntries, error: pipelineError } = await supabase
        .from('pipeline')
        .select('*')
        .eq('candidate_id', interview.candidate_id)
        .eq('position_id', interview.position_id);
      
      if (pipelineError || !pipelineEntries || pipelineEntries.length === 0) {
        alert('Feedback saved! (Candidate not found in active pipeline for this role).');
        closeModal();
        fetchData();
        return;
      }
      
      const pipelineEntry = pipelineEntries[0];
      
      // 3. Perform action based on decision
      if (decision === 'advance') {
        const currentStageIndex = stages.indexOf(pipelineEntry.stage);
        const nextStage = stages[currentStageIndex + 1] || 'Offer';
        
        const { error: updateStageError } = await supabase.from('pipeline').update({ stage: nextStage, status: 'Active' }).eq('id', pipelineEntry.id);
        if (updateStageError) throw updateStageError;

        // Transition to the "Schedule Next Interview" modal
        setModalState({
          mode: 'scheduleNext',
          data: {
            candidate: interview.candidates,
            position: interview.positions,
            nextStage: nextStage
          }
        });
        setScheduleFormData({
            ...scheduleFormData,
            candidate_id: interview.candidate_id,
            position_id: interview.position_id,
            interview_type: nextStage, // Pre-fill type with next stage name
        });

      } else if (decision === 'hold') {
        const { error } = await supabase.from('pipeline').update({ status: 'Hold' }).eq('id', pipelineEntry.id);
        if (error) throw error;
        alert('Feedback saved and candidate is now On Hold.');
        closeModal();
        fetchData();
      } else if (decision === 'reject') {
        const { error } = await supabase.from('pipeline').update({ status: 'Reject' }).eq('id', pipelineEntry.id);
        if (error) throw error;
        alert('Feedback saved and candidate has been rejected.');
        closeModal();
        fetchData();
      } else { // 'save'
        alert('Feedback saved!');
        closeModal();
        fetchData();
      }

    } catch (error) {
      console.error('Error processing decision:', error);
      alert('An error occurred. Please try again.');
    }
  };
  
  const openUpdateModal = (interview) => {
    setModalState({ mode: 'update', data: { interview } });
    setUpdateFormData({ feedback: interview.feedback || '' });
  };
  
  const openHistoryModal = async (candidateId, positionId, candidateInfo, positionInfo) => {
    console.log("Opening history for Candidate:", candidateId, "Position:", positionId);

    if (!candidateId || !positionId) {
      console.error("Error: Missing candidateId or positionId for history modal.");
      alert("Unable to load interview history. Missing candidate or position information.");
      return;
    }

    setModalState({ mode: 'history', data: { candidate: candidateInfo, position: positionInfo } });

    const { data, error } = await supabase
      .from('interviews')
      .select('*')
      .eq('candidate_id', candidateId)
      .eq('position_id', positionId)
      .order('interview_date', { ascending: true });

    if (error) {
      console.error('Error fetching history:', error);
      alert("Error loading interview history: " + error.message);
    } else {
      console.log(`Successfully fetched ${data?.length || 0} interview records`);
      setInterviewHistory(data || []);
    }
  };

  const now = new Date();
  const upcomingInterviews = interviews.filter(i => new Date(i.interview_date) >= now).sort((a, b) => new Date(a.interview_date) - new Date(b.interview_date));
  const pastInterviews = interviews.filter(i => new Date(i.interview_date) < now);

  return (
    <div className="interview-hub-page">
      <div className="page-header">
        <h1>Interview Hub</h1>
        <button className="btn-primary" onClick={() => setShowScheduleForm(!showScheduleForm)}>
          {showScheduleForm ? 'Cancel' : '+ Schedule Interview'}
        </button>
      </div>

      {showScheduleForm && (
        <form className="interview-form" onSubmit={handleScheduleSubmit}>
           <h2>Schedule New Interview</h2>
          <div className="form-row">
            <div className="form-group">
              <label>Position *</label>
              <select required value={scheduleFormData.position_id} onChange={(e) => setScheduleFormData({ ...scheduleFormData, position_id: e.target.value, candidate_id: '' })}>
                <option value="">Select position...</option>
                {positions.map(pos => ( <option key={pos.id} value={pos.id}> {pos.title} - {pos.clients?.company_name} </option> ))}
              </select>
            </div>
            <div className="form-group">
              <label>Candidate *</label>
              <select required disabled={!scheduleFormData.position_id} value={scheduleFormData.candidate_id} onChange={(e) => setScheduleFormData({ ...scheduleFormData, candidate_id: e.target.value })}>
                <option value="">{scheduleFormData.position_id ? 'Select candidate...' : 'Select a position first'}</option>
                {filteredCandidates.map(candidate => ( <option key={candidate.id} value={candidate.id}>{candidate.name}</option>))}
              </select>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Interview Date & Time *</label>
              <input type="datetime-local" required value={scheduleFormData.interview_date} onChange={(e) => setScheduleFormData({ ...scheduleFormData, interview_date: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Interview Type</label>
              <input type="text" placeholder="e.g., Technical Screen, Final Round" value={scheduleFormData.interview_type} onChange={(e) => setScheduleFormData({ ...scheduleFormData, interview_type: e.target.value })} />
            </div>
          </div>
          <div className="form-group">
            <label>Interviewer Name</label>
            <input type="text" value={scheduleFormData.interviewer_name} onChange={(e) => setScheduleFormData({ ...scheduleFormData, interviewer_name: e.target.value })} />
          </div>
          <button type="submit" className="btn-primary">Schedule Interview</button>
        </form>
      )}

      {[
        { title: 'Upcoming Interviews', list: upcomingInterviews, isPast: false },
        { title: 'Past Interviews', list: pastInterviews, isPast: true }
      ].map(section => (
        <div className="interviews-section" key={section.title}>
          <h2>{section.title} ({section.list.length})</h2>
          {section.list.length === 0 ? (<p className="empty-state">No {section.title.toLowerCase()} found.</p>) : (
            <div className="interviews-list">
              {section.list.map(interview => (
                <div key={interview.id} className={`interview-card ${section.isPast ? 'past' : 'upcoming'}`}>

                  {/* Column 1: Candidate & Position Info */}
                  <div className="interview-card-column candidate-info-column">
                    <div className="candidate-name">{interview.candidates?.name || 'Unknown'}</div>
                    <div className="position-info">{interview.positions?.title || 'N/A'}</div>
                    <div className="company-info">{interview.positions?.clients?.company_name || 'N/A'}</div>
                  </div>

                  {/* Column 2: Interview Details */}
                  <div className="interview-card-column interview-details-column">
                    <div className="interview-detail-item">
                      <span className="detail-label">Date:</span>
                      <span className="detail-value">{new Date(interview.interview_date).toLocaleDateString()}</span>
                    </div>
                    <div className="interview-detail-item">
                      <span className="detail-label">Time:</span>
                      <span className="detail-value">{new Date(interview.interview_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <div className="interview-detail-item">
                      <span className="detail-label">Type:</span>
                      <span className="detail-value">{interview.interview_type || 'N/A'}</span>
                    </div>
                  </div>

                  {/* Column 3: Status & Feedback */}
                  <div className="interview-card-column status-feedback-column">
                    {interview.interviewer_name && (
                      <div className="interviewer-info">
                        <span className="detail-label">Interviewer:</span> {interview.interviewer_name}
                      </div>
                    )}
                    {interview.outcome && (
                      <span className={`outcome-badge ${interview.outcome.toLowerCase()}`}>{interview.outcome}</span>
                    )}
                    {!interview.outcome && section.isPast && (
                      <span className="outcome-badge pending">Pending</span>
                    )}
                    {section.isPast && interview.feedback && (
                      <div className="feedback-preview">
                        {interview.feedback.substring(0, 60)}...
                      </div>
                    )}
                  </div>

                  {/* Column 4: Actions */}
                  <div className="interview-card-column actions-column">
                    <button className="btn-update" onClick={() => openUpdateModal(interview)}>Update & Decide</button>
                    <button className="btn-secondary" onClick={() => openHistoryModal(interview.candidate_id, interview.position_id, interview.candidates, interview.positions)}>View History</button>
                  </div>

                </div>
              ))}
            </div>
          )}
        </div>
      ))}
      
      {modalState.mode !== 'closed' && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className={`modal-content ${modalState.mode === 'history' ? 'history-modal-content' : ''}`} onClick={(e) => e.stopPropagation()}>
            
            {modalState.mode === 'update' && (
              <>
                <h2>Update & Decide</h2>
                <p className="modal-candidate-info">{modalState.data.interview.candidates?.name} for {modalState.data.interview.positions?.title}</p>
                <div className="form-group">
                  <label>Interview Feedback & Notes</label>
                  <textarea rows="5" placeholder="Record observations, strengths, concerns, and recommendation..." value={updateFormData.feedback} onChange={(e) => setUpdateFormData({ ...updateFormData, feedback: e.target.value })}/>
                </div>
                <div className="decision-buttons-grid">
                  <button className="decision-btn btn-advance" onClick={() => handleDecisionSubmit('advance')}>✅ Advance to Next Stage</button>
                  <button className="decision-btn btn-hold" onClick={() => handleDecisionSubmit('hold')}>🤔 Hold / Pending Decision</button>
                  <button className="decision-btn btn-reject" onClick={() => handleDecisionSubmit('reject')}>❌ Reject Candidate</button>
                  <button className="decision-btn btn-save-feedback" onClick={() => handleDecisionSubmit('save')}>💾 Just Save Feedback</button>
                </div>
              </>
            )}

            {modalState.mode === 'scheduleNext' && (
              <form onSubmit={handleScheduleSubmit}>
                <h2>Schedule Next Interview: {modalState.data.nextStage}</h2>
                <p className="modal-candidate-info">{modalState.data.candidate.name} for {modalState.data.position.title}</p>
                <div className="form-group">
                  <label>Interview Date & Time *</label>
                  <input type="datetime-local" required value={scheduleFormData.interview_date} onChange={(e) => setScheduleFormData({ ...scheduleFormData, interview_date: e.target.value })} />
                </div>
                 <div className="form-group">
                  <label>Interview Type</label>
                  <input type="text" value={scheduleFormData.interview_type} onChange={(e) => setScheduleFormData({ ...scheduleFormData, interview_type: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Interviewer Name</label>
                  <input type="text" value={scheduleFormData.interviewer_name} onChange={(e) => setScheduleFormData({ ...scheduleFormData, interviewer_name: e.target.value })} />
                </div>
                <div className="modal-actions">
                  <button type="button" className="btn-secondary" onClick={closeModal}>Cancel</button>
                  <button type="submit" className="btn-primary">Schedule Interview</button>
                </div>
              </form>
            )}

            {modalState.mode === 'history' && (
              <>
                <h2>Interview History</h2>
                <p className="modal-candidate-info">{modalState.data.candidate.name} for {modalState.data.position.title}</p>
                {interviewHistory.length > 0 ? interviewHistory.map(interview => (
                  <div key={interview.id} className="history-item">
                    <div className="history-item-header">
                      <h3>{interview.interview_type || 'Interview'}</h3>
                      {interview.outcome && (<span className={`outcome-badge ${interview.outcome.toLowerCase()}`}>{interview.outcome}</span>)}
                    </div>
                    <p><strong>Date:</strong> {new Date(interview.interview_date).toLocaleString()}</p>
                    <p><strong>Interviewer:</strong> {interview.interviewer_name || 'N/A'}</p>
                    {interview.feedback && (
                      <div className="feedback-box">
                        <strong>Feedback:</strong>
                        <p>{interview.feedback}</p>
                      </div>
                    )}
                  </div>
                )) : <p>No interview history found for this candidate on this role.</p>}
                <div className="modal-actions modal-actions-centered">
                  <button className="btn-secondary" onClick={closeModal}>Close</button>
                </div>
              </>
            )}
            
          </div>
        </div>
      )}
    </div>
  );
}

export default InterviewHub;