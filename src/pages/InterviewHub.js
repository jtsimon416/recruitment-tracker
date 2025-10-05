import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';
import '../styles/InterviewHub.css';

function InterviewHub() {
  const [interviews, setInterviews] = useState([]);
  const [positions, setPositions] = useState([]);
  const [candidates, setCandidates] = useState([]);
  const [pipeline, setPipeline] = useState([]); // <-- To get pipeline data
  const [filteredCandidates, setFilteredCandidates] = useState([]); // <-- For the dynamic dropdown
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingInterview, setEditingInterview] = useState(null);

  const [formData, setFormData] = useState({
    candidate_id: '',
    position_id: '',
    interview_date: '',
    interview_type: '',
    interviewer_name: '',
    feedback: '',
    outcome: ''
  });

  const stages = [
    'Screening',
    'Submit to Client',
    'Interview 1',
    'Interview 2',
    'Interview 3',
    'Offer',
    'Hired'
  ];

  useEffect(() => {
    fetchData();
  }, []);

  // --- UPDATED: Handle filtering when a position is selected ---
  useEffect(() => {
    if (formData.position_id) {
      // Find all pipeline entries for the selected position
      const pipelineForPosition = pipeline.filter(p => p.position_id === formData.position_id);
      const candidateIds = pipelineForPosition.map(p => p.candidate_id);
      
      // Filter the main candidate list to only those in the pipeline
      const candidatesInPipeline = candidates.filter(c => candidateIds.includes(c.id));
      setFilteredCandidates(candidatesInPipeline);
    } else {
      setFilteredCandidates([]); // Clear if no position is selected
    }
  }, [formData.position_id, pipeline, candidates]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [interviewsRes, positionsRes, candidatesRes, pipelineRes] = await Promise.all([
        supabase.from('interviews').select(`*, candidates(name, email), positions(title, clients(company_name))`).order('interview_date', { ascending: false }),
        supabase.from('positions').select('*, clients(company_name)').eq('status', 'Open'),
        supabase.from('candidates').select('*').order('name'),
        supabase.from('pipeline').select('*') // <-- Fetch pipeline data
      ]);

      if (interviewsRes.error) throw interviewsRes.error;
      if (positionsRes.error) throw positionsRes.error;
      if (candidatesRes.error) throw candidatesRes.error;
      if (pipelineRes.error) throw pipelineRes.error;

      setInterviews(interviewsRes.data || []);
      setPositions(positionsRes.data || []);
      setCandidates(candidatesRes.data || []);
      setPipeline(pipelineRes.data || []); // <-- Set pipeline state
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const resetForm = () => {
    setFormData({
      candidate_id: '',
      position_id: '',
      interview_date: '',
      interview_type: '',
      interviewer_name: '',
      feedback: '',
      outcome: ''
    });
    setShowForm(false);
    setEditingInterview(null);
  };

  const handleScheduleSubmit = async (e) => {
    e.preventDefault();
    try {
      const { error } = await supabase.from('interviews').insert([{
        candidate_id: formData.candidate_id,
        position_id: formData.position_id,
        interview_date: formData.interview_date,
        interview_type: formData.interview_type,
        interviewer_name: formData.interviewer_name,
      }]);
      if (error) throw error;

      alert('Interview scheduled successfully!');
      resetForm();
      fetchData();
    } catch (error) {
      console.error('Error scheduling interview:', error);
      alert('Error scheduling interview. Please try again.');
    }
  };

  const handleUpdateSubmit = async (e) => {
    e.preventDefault();
    try {
      const { error: interviewError } = await supabase.from('interviews').update({
        feedback: formData.feedback,
        outcome: formData.outcome
      }).eq('id', editingInterview.id);

      if (interviewError) throw interviewError;

      const { data: pipelineEntries, error: pipelineError } = await supabase
        .from('pipeline')
        .select('*')
        .eq('candidate_id', editingInterview.candidate_id)
        .eq('position_id', editingInterview.position_id);
      
      if (pipelineError || !pipelineEntries || pipelineEntries.length === 0) {
        // This is not an error if we just want to save feedback without advancing.
        // We'll just skip the pipeline update part.
        alert('Feedback saved! (Candidate not found in active pipeline for this role).');
        resetForm();
        fetchData();
        return;
      }
      
      const pipelineEntry = pipelineEntries[0];

      if (formData.outcome === 'Passed') {
        const currentStageIndex = stages.indexOf(pipelineEntry.stage);
        const nextStage = stages[currentStageIndex + 1] || 'Offer';
        
        const { error: updateStageError } = await supabase.from('pipeline').update({ stage: nextStage }).eq('id', pipelineEntry.id);
        if (updateStageError) throw updateStageError;
        alert('Feedback saved and candidate advanced to next stage!');

      } else if (formData.outcome === 'Failed') {
        const { error: updateStatusError } = await supabase.from('pipeline').update({ status: 'Reject' }).eq('id', pipelineEntry.id);
        if (updateStatusError) throw updateStatusError;
        alert('Feedback saved and candidate has been rejected.');
      } else {
        alert('Feedback saved!');
      }

      resetForm();
      fetchData();

    } catch (error) {
      console.error('Error updating interview:', error);
      alert('Error updating interview. Please try again.');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this interview schedule?')) return;
    try {
      const { error } = await supabase.from('interviews').delete().eq('id', id);
      if (error) throw error;
      fetchData();
    } catch (error) {
      console.error('Error deleting interview:', error);
    }
  };
  
  const openUpdateModal = (interview) => {
    setEditingInterview(interview);
    setFormData({
      ...formData,
      feedback: interview.feedback || '',
      outcome: interview.outcome || ''
    });
  };

  const now = new Date();
  const upcomingInterviews = interviews.filter(i => new Date(i.interview_date) >= now).sort((a, b) => new Date(a.interview_date) - new Date(b.interview_date));
  const pastInterviews = interviews.filter(i => new Date(i.interview_date) < now);

  if (loading) return <div className="loading">Loading...</div>;

  return (
    <div className="interview-hub-page">
      <div className="page-header">
        <h1>Interview Hub</h1>
        <button className="btn-primary" onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancel' : '+ Schedule Interview'}
        </button>
      </div>

      {showForm && (
        <form className="interview-form" onSubmit={handleScheduleSubmit}>
           <h2>Schedule New Interview</h2>
          <div className="form-row">
            <div className="form-group">
              <label>Position *</label>
              <select required value={formData.position_id} onChange={(e) => setFormData({ ...formData, position_id: e.target.value, candidate_id: '' })}>
                <option value="">Select position...</option>
                {positions.map(pos => ( <option key={pos.id} value={pos.id}> {pos.title} - {pos.clients?.company_name} </option> ))}
              </select>
            </div>
            <div className="form-group">
              <label>Candidate *</label>
              <select required disabled={!formData.position_id} value={formData.candidate_id} onChange={(e) => setFormData({ ...formData, candidate_id: e.target.value })}>
                <option value="">{formData.position_id ? 'Select candidate...' : 'Select a position first'}</option>
                {/* --- UPDATED: Use filtered candidates --- */}
                {filteredCandidates.map(candidate => ( <option key={candidate.id} value={candidate.id}>{candidate.name}</option>))}
              </select>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Interview Date & Time *</label>
              <input type="datetime-local" required value={formData.interview_date} onChange={(e) => setFormData({ ...formData, interview_date: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Interview Type</label>
              <select value={formData.interview_type} onChange={(e) => setFormData({ ...formData, interview_type: e.target.value })}>
                <option value="">Select type...</option>
                <option value="Phone Screen">Phone Screen</option>
                <option value="Video Interview">Video Interview</option>
                <option value="In-Person">In-Person</option>
                <option value="Technical">Technical</option>
                <option value="Panel">Panel</option>
              </select>
            </div>
          </div>
          <div className="form-group">
            <label>Interviewer Name</label>
            <input type="text" value={formData.interviewer_name} onChange={(e) => setFormData({ ...formData, interviewer_name: e.target.value })} />
          </div>
          <button type="submit" className="btn-primary">Schedule Interview</button>
        </form>
      )}

      <div className="interviews-section">
        <h2>Upcoming Interviews ({upcomingInterviews.length})</h2>
        {upcomingInterviews.length === 0 ? (<p className="empty-state">No upcoming interviews scheduled.</p>) : (
          <div className="interviews-list">
            {upcomingInterviews.map(interview => (
              <div key={interview.id} className="interview-card upcoming">
                <div className="interview-header">
                  <div><h3>{interview.candidates?.name || 'Unknown Candidate'}</h3><p className="position-info">{interview.positions?.title || 'Unknown Position'} - {interview.positions?.clients?.company_name || 'Unknown Client'}</p></div>
                  <span className="interview-type">{interview.interview_type || 'Interview'}</span>
                </div>
                <div className="interview-details">
                  <p><strong>Date:</strong> {new Date(interview.interview_date).toLocaleString()}</p>
                  {interview.interviewer_name && (<p><strong>Interviewer:</strong> {interview.interviewer_name}</p>)}
                </div>
                <div className="interview-actions">
                  <button className="btn-update" onClick={() => openUpdateModal(interview)}>Update Outcome</button>
                  <button className="btn-delete" onClick={() => handleDelete(interview.id)}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="interviews-section">
        <h2>Past Interviews ({pastInterviews.length})</h2>
        {pastInterviews.length === 0 ? (<p className="empty-state">No past interviews recorded.</p>) : (
          <div className="interviews-list">
            {pastInterviews.map(interview => (
              <div key={interview.id} className="interview-card past">
                <div className="interview-header">
                  <div><h3>{interview.candidates?.name || 'Unknown Candidate'}</h3><p className="position-info">{interview.positions?.title || 'Unknown Position'} - {interview.positions?.clients?.company_name || 'Unknown Client'}</p></div>
                  {interview.outcome && (<span className={`outcome-badge ${interview.outcome.toLowerCase()}`}>{interview.outcome}</span>)}
                </div>
                <div className="interview-details">
                  <p><strong>Date:</strong> {new Date(interview.interview_date).toLocaleString()}</p>
                  {interview.interviewer_name && (<p><strong>Interviewer:</strong> {interview.interviewer_name}</p>)}
                  {interview.feedback && (
                    <div className="feedback-box"><strong>Interview Feedback:</strong><p>{interview.feedback}</p></div>
                  )}
                </div>
                <div className="interview-actions">
                   <button className="btn-update" onClick={() => openUpdateModal(interview)}>Edit Feedback</button>
                  <button className="btn-delete" onClick={() => handleDelete(interview.id)}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {editingInterview && (
        <div className="modal-overlay" onClick={resetForm}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Update Interview Outcome</h2>
            <p className="modal-candidate-info">{editingInterview.candidates?.name} for {editingInterview.positions?.title}</p>
            <form onSubmit={handleUpdateSubmit}>
               <div className="form-group">
                <label>Interview Feedback & Notes</label>
                <p className="field-helper">Record observations, strengths, concerns, and recommendation</p>
                <textarea rows="5" placeholder="Technical Skills:&#10;Communication:&#10;Culture Fit:&#10;Overall Impression:&#10;Recommendation (Hire/No Hire/Maybe):" value={formData.feedback} onChange={(e) => setFormData({ ...formData, feedback: e.target.value })}/>
              </div>
              <div className="form-group">
                <label>Outcome</label>
                 <select value={formData.outcome} onChange={(e) => setFormData({ ...formData, outcome: e.target.value })}>
                    <option value="">Select Outcome...</option>
                    <option value="Passed">Passed & Advance Stage</option>
                    <option value="Failed">Failed & Reject</option>
                 </select>
              </div>
              <div className="modal-actions">
                 <button type="button" className="btn-secondary" onClick={resetForm}>Cancel</button>
                 <button type="submit" className="btn-primary">Save Outcome</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default InterviewHub;

