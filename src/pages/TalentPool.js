import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';
import '../styles/TalentPool.css';

function TalentPool() {
  const [candidates, setCandidates] = useState([]);
  const [filteredCandidates, setFilteredCandidates] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [showPipelineModal, setShowPipelineModal] = useState(false);
  const [showCommentsModal, setShowCommentsModal] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [comments, setComments] = useState([]);
  const [expandedRow, setExpandedRow] = useState(null);
  const [positions, setPositions] = useState([]);
  const [recruiters, setRecruiters] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [skillFilter, setSkillFilter] = useState('');
  const [locationFilter, setLocationFilter] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    location: '',
    skills: '',
    resume_url: '',
    linkedin_url: '',
    notes: ''
  });

  const [pipelineData, setPipelineData] = useState({
    position_id: '',
    recruiter_id: '',
    stage: 'Screening'
  });

  const [commentData, setCommentData] = useState({
    author_name: '',
    comment_text: ''
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
    fetchCandidates();
    fetchPositions();
    fetchRecruiters();
  }, []);

  useEffect(() => {
    filterCandidates();
  }, [candidates, searchTerm, skillFilter, locationFilter]);

  async function fetchCandidates() {
    const { data, error } = await supabase
      .from('candidates')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching candidates:', error);
    } else {
      setCandidates(data || []);
    }
  }

  async function fetchPositions() {
    const { data, error } = await supabase
      .from('positions')
      .select('*, clients(company_name)')
      .eq('status', 'Open')
      .order('title');
    
    if (error) {
      console.error('Error fetching positions:', error);
    } else {
      setPositions(data || []);
    }
  }

  async function fetchRecruiters() {
    const { data, error } = await supabase
      .from('recruiters')
      .select('*')
      .order('name');
    
    if (error) {
      console.error('Error fetching recruiters:', error);
    } else {
      setRecruiters(data || []);
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

  function filterCandidates() {
    let filtered = candidates;

    if (searchTerm) {
      filtered = filtered.filter(c => 
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.email.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (skillFilter) {
      filtered = filtered.filter(c => 
        c.skills && c.skills.toLowerCase().includes(skillFilter.toLowerCase())
      );
    }

    if (locationFilter) {
      filtered = filtered.filter(c => 
        c.location && c.location.toLowerCase().includes(locationFilter.toLowerCase())
      );
    }

    setFilteredCandidates(filtered);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const { data, error } = await supabase
      .from('candidates')
      .insert([formData]);
    
    if (error) {
      alert('Error adding candidate: ' + error.message);
    } else {
      alert('Candidate added successfully!');
      setFormData({
        name: '',
        email: '',
        phone: '',
        location: '',
        skills: '',
        resume_url: '',
        linkedin_url: '',
        notes: ''
      });
      setShowForm(false);
      fetchCandidates();
    }
  }

  function openPipelineModal(candidate) {
    setSelectedCandidate(candidate);
    setPipelineData({
      position_id: '',
      recruiter_id: '',
      stage: 'Screening'
    });
    setShowPipelineModal(true);
  }

  async function handleAddToPipeline(e) {
    e.preventDefault();
    
    if (!pipelineData.position_id || !pipelineData.recruiter_id) {
      alert('Please select both a position and a recruiter');
      return;
    }

    const { data, error} = await supabase
      .from('pipeline')
      .insert([{
        candidate_id: selectedCandidate.id,
        position_id: pipelineData.position_id,
        recruiter_id: pipelineData.recruiter_id,
        stage: pipelineData.stage
      }]);
    
    if (error) {
      alert('Error adding to pipeline: ' + error.message);
    } else {
      alert('Candidate added to pipeline successfully!');
      setShowPipelineModal(false);
      setSelectedCandidate(null);
    }
  }

  async function openCommentsModal(candidate) {
    setSelectedCandidate(candidate);
    await fetchComments(candidate.id);
    setCommentData({
      author_name: '',
      comment_text: ''
    });
    setShowCommentsModal(true);
  }

  async function handleAddComment(e) {
    e.preventDefault();
    
    if (!commentData.author_name || !commentData.comment_text) {
      alert('Please fill in both your name and comment');
      return;
    }

    const { error } = await supabase
      .from('comments')
      .insert([{
        candidate_id: selectedCandidate.id,
        author_name: commentData.author_name,
        comment_text: commentData.comment_text
      }]);
    
    if (error) {
      alert('Error adding comment: ' + error.message);
    } else {
      setCommentData({
        author_name: commentData.author_name,
        comment_text: ''
      });
      await fetchComments(selectedCandidate.id);
    }
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Talent Pool</h1>
        <button className="btn-primary" onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancel' : '+ Add Candidate'}
        </button>
      </div>

      {showForm && (
        <div className="form-card">
          <h2>Add New Candidate</h2>
          <form onSubmit={handleSubmit}>
            <div className="form-row">
              <div className="form-group">
                <label>Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                />
              </div>
              <div className="form-group">
                <label>Email *</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Phone</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                />
              </div>
              <div className="form-group">
                <label>Location</label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({...formData, location: e.target.value})}
                />
              </div>
            </div>

            <div className="form-group">
              <label>Skills (comma-separated)</label>
              <input
                type="text"
                placeholder="JavaScript, React, Node.js"
                value={formData.skills}
                onChange={(e) => setFormData({...formData, skills: e.target.value})}
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Resume URL</label>
                <input
                  type="url"
                  value={formData.resume_url}
                  onChange={(e) => setFormData({...formData, resume_url: e.target.value})}
                />
              </div>
              <div className="form-group">
                <label>LinkedIn URL</label>
                <input
                  type="url"
                  value={formData.linkedin_url}
                  onChange={(e) => setFormData({...formData, linkedin_url: e.target.value})}
                />
              </div>
            </div>

            <div className="form-group">
              <label>Notes</label>
              <textarea
                rows="3"
                value={formData.notes}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
              />
            </div>

            <button type="submit" className="btn-primary">Add Candidate</button>
          </form>
        </div>
      )}

      <div className="filter-bar">
        <input
          type="text"
          placeholder="Search by name or email..."
          className="search-input"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <input
          type="text"
          placeholder="Filter by skills..."
          className="filter-input"
          value={skillFilter}
          onChange={(e) => setSkillFilter(e.target.value)}
        />
        <input
          type="text"
          placeholder="Filter by location..."
          className="filter-input"
          value={locationFilter}
          onChange={(e) => setLocationFilter(e.target.value)}
        />
      </div>

      <div className="candidates-list">
        <div className="candidates-header">
          <div>Name & LinkedIn</div>
          <div>Skills</div>
          <div>Location</div>
          <div>Phone</div>
          <div>Resume</div>
          <div>Actions</div>
        </div>
        
        {filteredCandidates.map(candidate => (
          <React.Fragment key={candidate.id}>
            <div 
              className="candidate-row"
              onClick={() => setExpandedRow(expandedRow === candidate.id ? null : candidate.id)}
            >
              <div className="candidate-name-cell">
                <div className="candidate-name">{candidate.name}</div>
                {candidate.linkedin_url && (
                  <a 
                    href={candidate.linkedin_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="candidate-linkedin"
                    onClick={(e) => e.stopPropagation()}
                  >
                    LinkedIn
                  </a>
                )}
              </div>
              <div className="skills-cell">{candidate.skills || 'N/A'}</div>
              <div>{candidate.location || 'N/A'}</div>
              <div>{candidate.phone || 'N/A'}</div>
              <div>
                {candidate.resume_url ? (
                  <a 
                    href={candidate.resume_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="btn-link"
                    onClick={(e) => e.stopPropagation()}
                  >
                    View
                  </a>
                ) : (
                  'N/A'
                )}
              </div>
              <div className="actions-cell" onClick={(e) => e.stopPropagation()}>
                <button 
                  className="btn-add-pipeline"
                  onClick={() => openPipelineModal(candidate)}
                >
                  + Pipeline
                </button>
                <button 
                  className="btn-comments"
                  onClick={() => openCommentsModal(candidate)}
                >
                  Comments
                </button>
              </div>
            </div>
            
            {expandedRow === candidate.id && candidate.notes && (
              <div className="candidate-row-notes">
                <strong>Notes:</strong> {candidate.notes}
              </div>
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Pipeline Modal */}
      {showPipelineModal && (
        <div className="modal-overlay" onClick={() => setShowPipelineModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Add to Pipeline</h2>
            <p className="modal-candidate-name">{selectedCandidate?.name}</p>
            
            <form onSubmit={handleAddToPipeline}>
              <div className="form-group">
                <label>Position *</label>
                <select
                  required
                  value={pipelineData.position_id}
                  onChange={(e) => setPipelineData({...pipelineData, position_id: e.target.value})}
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
                <label>Recruiter *</label>
                <select
                  required
                  value={pipelineData.recruiter_id}
                  onChange={(e) => setPipelineData({...pipelineData, recruiter_id: e.target.value})}
                >
                  <option value="">Select recruiter...</option>
                  {recruiters.map(rec => (
                    <option key={rec.id} value={rec.id}>
                      {rec.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Initial Stage</label>
                <select
                  value={pipelineData.stage}
                  onChange={(e) => setPipelineData({...pipelineData, stage: e.target.value})}
                >
                  {stages.map(stage => (
                    <option key={stage} value={stage}>{stage}</option>
                  ))}
                </select>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowPipelineModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Add to Pipeline
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Comments Modal */}
      {showCommentsModal && (
        <div className="modal-overlay" onClick={() => setShowCommentsModal(false)}>
          <div className="modal-content modal-large" onClick={(e) => e.stopPropagation()}>
            <h2>Comments for {selectedCandidate?.name}</h2>
            
            <div className="comments-section">
              <form onSubmit={handleAddComment} className="comment-form">
                <div className="form-group">
                  <label>Your Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g., Director Jane"
                    value={commentData.author_name}
                    onChange={(e) => setCommentData({...commentData, author_name: e.target.value})}
                  />
                </div>
                <div className="form-group">
                  <label>Comment *</label>
                  <textarea
                    required
                    rows="3"
                    placeholder="Leave feedback about this candidate..."
                    value={commentData.comment_text}
                    onChange={(e) => setCommentData({...commentData, comment_text: e.target.value})}
                  />
                </div>
                <button type="submit" className="btn-primary">Add Comment</button>
              </form>

              <div className="comments-list">
                <h3>Comment History ({comments.length})</h3>
                {comments.length === 0 ? (
                  <p className="empty-comments">No comments yet. Be the first to comment!</p>
                ) : (
                  comments.map(comment => (
                    <div key={comment.id} className="comment-item">
                      <div className="comment-header">
                        <strong>{comment.author_name}</strong>
                        <span className="comment-date">
                          {new Date(comment.created_at).toLocaleString()}
                        </span>
                      </div>
                      <p className="comment-text">{comment.comment_text}</p>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setShowCommentsModal(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default TalentPool;
