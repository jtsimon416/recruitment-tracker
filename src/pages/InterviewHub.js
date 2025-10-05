import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';
import '../styles/InterviewHub.css';

function InterviewHub() {
  const [interviews, setInterviews] = useState([]);
  const [positions, setPositions] = useState([]);
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    candidate_id: '',
    position_id: '',
    interview_date: '',
    interview_type: '',
    interviewer_name: '',
    feedback: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [interviewsRes, positionsRes, candidatesRes] = await Promise.all([
        supabase.from('interviews').select(`
          *,
          candidates (name, email),
          positions (title, clients (company_name))
        `).order('interview_date', { ascending: true }),
        supabase.from('positions').select('*, clients(company_name)').eq('status', 'Open'),
        supabase.from('candidates').select('*').order('name')
      ]);

      if (interviewsRes.error) throw interviewsRes.error;
      if (positionsRes.error) throw positionsRes.error;
      if (candidatesRes.error) throw candidatesRes.error;

      setInterviews(interviewsRes.data || []);
      setPositions(positionsRes.data || []);
      setCandidates(candidatesRes.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const { error } = await supabase.from('interviews').insert([formData]);
      if (error) throw error;

      alert('Interview scheduled successfully!');
      setFormData({
        candidate_id: '',
        position_id: '',
        interview_date: '',
        interview_type: '',
        interviewer_name: '',
        feedback: ''
      });
      setShowForm(false);
      fetchData();
    } catch (error) {
      console.error('Error scheduling interview:', error);
      alert('Error scheduling interview. Please try again.');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this interview?')) return;

    try {
      const { error } = await supabase.from('interviews').delete().eq('id', id);
      if (error) throw error;
      fetchData();
    } catch (error) {
      console.error('Error deleting interview:', error);
    }
  };

  const now = new Date();
  const upcomingInterviews = interviews.filter(i => new Date(i.interview_date) >= now);
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
        <form className="interview-form" onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label>Position *</label>
              <select
                required
                value={formData.position_id}
                onChange={(e) => setFormData({ ...formData, position_id: e.target.value })}
              >
                <option value="">Select position...</option>
                {positions.map(pos => (
                  <option key={pos.id} value={pos.id}>
                    {pos.title} - {pos.clients?.company_name}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Candidate *</label>
              <select
                required
                value={formData.candidate_id}
                onChange={(e) => setFormData({ ...formData, candidate_id: e.target.value })}
              >
                <option value="">Select candidate...</option>
                {candidates.map(candidate => (
                  <option key={candidate.id} value={candidate.id}>
                    {candidate.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Interview Date & Time *</label>
              <input
                type="datetime-local"
                required
                value={formData.interview_date}
                onChange={(e) => setFormData({ ...formData, interview_date: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>Interview Type</label>
              <select
                value={formData.interview_type}
                onChange={(e) => setFormData({ ...formData, interview_type: e.target.value })}
              >
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
            <input
              type="text"
              value={formData.interviewer_name}
              onChange={(e) => setFormData({ ...formData, interviewer_name: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label>Interview Feedback & Notes</label>
            <p className="field-helper">Record observations, strengths, concerns, and recommendation</p>
            <textarea
              rows="5"
              placeholder="Technical Skills:&#10;Communication:&#10;Culture Fit:&#10;Overall Impression:&#10;Recommendation (Hire/No Hire/Maybe):"
              value={formData.feedback}
              onChange={(e) => setFormData({ ...formData, feedback: e.target.value })}
            />
          </div>
          <button type="submit" className="btn-primary">Schedule Interview</button>
        </form>
      )}

      <div className="interviews-section">
        <h2>Upcoming Interviews ({upcomingInterviews.length})</h2>
        {upcomingInterviews.length === 0 ? (
          <p className="empty-state">No upcoming interviews scheduled.</p>
        ) : (
          <div className="interviews-list">
            {upcomingInterviews.map(interview => (
              <div key={interview.id} className="interview-card upcoming">
                <div className="interview-header">
                  <div>
                    <h3>{interview.candidates?.name || 'Unknown Candidate'}</h3>
                    <p className="position-info">
                      {interview.positions?.title || 'Unknown Position'} - {interview.positions?.clients?.company_name || 'Unknown Client'}
                    </p>
                  </div>
                  <span className="interview-type">{interview.interview_type || 'Interview'}</span>
                </div>
                <div className="interview-details">
                  <p><strong>Date:</strong> {new Date(interview.interview_date).toLocaleString()}</p>
                  {interview.interviewer_name && (
                    <p><strong>Interviewer:</strong> {interview.interviewer_name}</p>
                  )}
                  {interview.candidates?.email && (
                    <p><strong>Email:</strong> {interview.candidates.email}</p>
                  )}
                  {interview.feedback && (
                    <div className="feedback-box">
                      <strong>Interview Feedback:</strong>
                      <p>{interview.feedback}</p>
                    </div>
                  )}
                </div>
                <div className="interview-actions">
                  <button className="btn-delete" onClick={() => handleDelete(interview.id)}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="interviews-section">
        <h2>Past Interviews ({pastInterviews.length})</h2>
        {pastInterviews.length === 0 ? (
          <p className="empty-state">No past interviews recorded.</p>
        ) : (
          <div className="interviews-list">
            {pastInterviews.map(interview => (
              <div key={interview.id} className="interview-card past">
                <div className="interview-header">
                  <div>
                    <h3>{interview.candidates?.name || 'Unknown Candidate'}</h3>
                    <p className="position-info">
                      {interview.positions?.title || 'Unknown Position'} - {interview.positions?.clients?.company_name || 'Unknown Client'}
                    </p>
                  </div>
                  <span className="interview-type">{interview.interview_type || 'Interview'}</span>
                </div>
                <div className="interview-details">
                  <p><strong>Date:</strong> {new Date(interview.interview_date).toLocaleString()}</p>
                  {interview.interviewer_name && (
                    <p><strong>Interviewer:</strong> {interview.interviewer_name}</p>
                  )}
                  {interview.feedback && (
                    <div className="feedback-box">
                      <strong>Interview Feedback:</strong>
                      <p>{interview.feedback}</p>
                    </div>
                  )}
                </div>
                <div className="interview-actions">
                  <button className="btn-delete" onClick={() => handleDelete(interview.id)}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default InterviewHub;