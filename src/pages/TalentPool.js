import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';
import '../styles/TalentPool.css';

// --- TagInput component remains unchanged ---
const TagInput = ({ tags, setTags }) => {
  const [inputValue, setInputValue] = useState('');

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const newTag = inputValue.trim();
      if (newTag && !tags.includes(newTag)) {
        setTags([...tags, newTag]);
      }
      setInputValue('');
    }
  };

  const removeTag = (tagToRemove) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const paste = e.clipboardData.getData('text');
    const newTags = paste.split(',')
      .map(tag => tag.trim())
      .filter(tag => tag && !tags.includes(tag));
    
    if (newTags.length) {
      setTags([...tags, ...newTags]);
    }
  };

  return (
    <div className="tag-input-container">
      {tags.map(tag => (
        <div key={tag} className="tag-item">
          {tag}
          <button type="button" onClick={() => removeTag(tag)}>
            &times;
          </button>
        </div>
      ))}
      <input
        type="text"
        className="tag-input"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        placeholder="Add skills (or paste a comma-separated list)..."
      />
    </div>
  );
};
// -------------------------------------------

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
  const [loading, setLoading] = useState(true);

  // --- NEW STATE FOR PARSING/PIPELINE ---
  const [resumeFile, setResumeFile] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [pipelineData, setPipelineData] = useState({
    position_id: '',
    recruiter_id: '',
    stage: 'Screening'
  });
  
  // --- CONFIG CONSTANTS (UPDATE THIS LINE) ---
  const SUPABASE_URL = 'https://ksfxucazcyiitaoytese.supabase.co'; 
  const BUCKET_NAME = 'resumes'; 
  // !!! PASTE YOUR N8N WEBHOOK URL HERE !!!
  const APILAYER_WEBHOOK = 'YOUR_N8N_WEBHOOK_URL_HERE'; 
  
  // Stages remain the same
  const stages = [
    'Screening',
    'Submit to Client',
    'Interview 1',
    'Interview 2',
    'Interview 3',
    'Offer',
    'Hired'
  ];

  // Combined function for initial data loading
  useEffect(() => {
    const loadData = async () => {
      await Promise.all([
        fetchCandidates(),
        fetchPositions(),
        fetchRecruiters()
      ]);
      setLoading(false);
    };
    loadData();
  }, []);
  
  
  async function fetchCandidates() {
      // NOTE: Modified fetch to include 'resume_url' in main select
      const { data, error } = await supabase
          .from('candidates')
          .select('*')
          .order('name');
      if (error) console.error('Error fetching candidates:', error);
      else {
          setCandidates(data || []);
          setFilteredCandidates(data || []);
      }
  }
  
  async function fetchPositions() {
      const { data, error } = await supabase
          .from('positions')
          .select('id, title, clients ( company_name )')
          .eq('status', 'Open');
      if (error) console.error('Error fetching positions:', error);
      else setPositions(data || []);
  }

  async function fetchRecruiters() {
      const { data, error } = await supabase
          .from('recruiters')
          .select('id, name');
      if (error) console.error('Error fetching recruiters:', error);
      else setRecruiters(data || []);
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

  const filterCandidates = () => {
    let filtered = candidates;

    if (searchTerm) {
      filtered = filtered.filter(c => 
        c.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.email?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (skillFilter) {
      const skillsToFilter = skillFilter.toLowerCase().split(',').map(s => s.trim()).filter(s => s);
      if (skillsToFilter.length > 0) {
        filtered = filtered.filter(c => 
          c.skills && skillsToFilter.every(skill => c.skills.toLowerCase().includes(skill))
        );
      }
    }

    if (locationFilter) {
      filtered = filtered.filter(c => 
        c.location && c.location.toLowerCase().includes(locationFilter.toLowerCase())
      );
    }

    setFilteredCandidates(filtered);
  }

  useEffect(() => {
    if (!loading) {
      filterCandidates();
    }
  }, [candidates, searchTerm, skillFilter, locationFilter, loading]);


  // --- HANDLER: Uploads, Triggers N8N, and Sets Initial Pipeline ---
  async function handleParseAndSubmit(e) {
    e.preventDefault();
    if (!resumeFile || !pipelineData.position_id || !pipelineData.recruiter_id) {
      alert('Please select a file, position, and recruiter.');
      return;
    }

    setIsProcessing(true);
    const fileToUpload = resumeFile; 
    
    try {
      // 1. Upload File to Supabase Storage (Unique file path based on timestamp)
      const filePath = `${BUCKET_NAME}/${new Date().getTime()}_${fileToUpload.name.replace(/\s/g, '_')}`;
      const { error: uploadError } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(filePath, fileToUpload);

      if (uploadError) throw new Error('File upload failed: ' + uploadError.message);

      // 2. Get the public URL for the N8N parser to access
      const { data: publicURLData } = supabase.storage
        .from(BUCKET_NAME)
        .getPublicUrl(filePath);
        
      const publicURL = publicURLData.publicUrl;


      // 3. Trigger N8N Parsing Workflow
      const n8nResponse = await fetch(APILAYER_WEBHOOK, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resumeUrl: publicURL,
          // Pass the necessary initial pipeline data to N8N
          pipelineData: pipelineData 
        }),
      });
      
      if (!n8nResponse.ok) {
          throw new Error(`N8N webhook failed with status: ${n8nResponse.status}. Check your N8N workflow.`);
      }

      alert(`Resume uploaded and parsing initiated! Candidate is being added to the pipeline.`);
      
      // Reset form states
      setResumeFile(null);
      e.target.reset(); 
      setShowForm(false);
      await fetchCandidates(); // Re-fetch to show the new candidate
      
    } catch (error) {
      console.error('Resume Processing Error:', error);
      alert('An error occurred during resume processing: ' + error.message);
    } finally {
      setIsProcessing(false);
    }
  }

  // --- Placeholder for other unused functions (keep your originals if they are complete) ---
  function openCommentsModal(candidate) {
    setSelectedCandidate(candidate);
    fetchComments(candidate.id);
    setCommentData({ author_name: '', comment_text: '' });
    setShowCommentsModal(true);
  }
  
  const [commentData, setCommentData] = useState({
    author_name: '',
    comment_text: ''
  });

  async function handleAddComment(e) {
    e.preventDefault();
    
    if (!commentData.author_name || !commentData.comment_text) {
      alert('Please fill in both your name and comment');
      return;
    }

    const { error } = await supabase.from('comments').insert([{
      candidate_id: selectedCandidate.id, ...commentData
    }]);
    
    if (error) {
      alert('Error adding comment: ' + error.message);
    } else {
      setCommentData(prev => ({ ...prev, comment_text: '' }));
      await fetchComments(selectedCandidate.id);
    }
  }


  if (loading) {
    return <div className="loading-state">Loading Talent Pool...</div>;
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
          <h2>Add Candidate via Resume Parsing (Drag & Drop)</h2>
          <form onSubmit={handleParseAndSubmit}>
            
            {/* FILE INPUT */}
            <div className="form-group">
                <label>Resume File (.pdf, .docx)*</label>
                <input
                    type="file"
                    required
                    accept=".pdf,.docx,.doc"
                    onChange={(e) => setResumeFile(e.target.files[0])}
                    disabled={isProcessing}
                />
            </div>
            
            {/* MANDATORY PIPELINE FIELDS */}
            <div className="form-row">
                <div className="form-group">
                    <label>Position *</label>
                    <select required value={pipelineData.position_id} onChange={(e) => setPipelineData({...pipelineData, position_id: e.target.value})} disabled={isProcessing}>
                        <option value="">Select position...</option>
                        {positions.map(pos => (<option key={pos.id} value={pos.id}>{pos.title} - {pos.clients?.company_name || 'N/A'}</option>))}
                    </select>
                </div>
                <div className="form-group">
                    <label>Recruiter *</label>
                    <select required value={pipelineData.recruiter_id} onChange={(e) => setPipelineData({...pipelineData, recruiter_id: e.target.value})} disabled={isProcessing}>
                        <option value="">Select recruiter...</option>
                        {recruiters.map(rec => (<option key={rec.id} value={rec.id}>{rec.name}</option>))}
                    </select>
                </div>
            </div>
            
            <button 
                type="submit" 
                className="btn-primary" 
                disabled={isProcessing || !resumeFile}
            >
                {isProcessing ? 'Processing Resume...' : 'Upload & Parse Resume'}
            </button>
            <p style={{marginTop: '15px', color: 'var(--accent-pink)'}}>
                *Candidate details and permanent resume link will be extracted and saved.
            </p>
          </form>
        </div>
      )}

      <div className="filter-bar">
        <input type="text" placeholder="Search by name or email..." className="search-input" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        <input type="text" placeholder="Filter by skills (comma-separated)..." className="filter-input" value={skillFilter} onChange={(e) => setSkillFilter(e.target.value)} />
        <input type="text" placeholder="Filter by location..." className="filter-input" value={locationFilter} onChange={(e) => setLocationFilter(e.target.value)} />
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
            <div className="candidate-row" onClick={() => setExpandedRow(expandedRow === candidate.id ? null : candidate.id)}>
              <div className="candidate-name-cell">
                <div className="candidate-name">{candidate.name}</div>
                {candidate.linkedin_url && (<a href={candidate.linkedin_url} target="_blank" rel="noopener noreferrer" className="candidate-linkedin" onClick={(e) => e.stopPropagation()}>LinkedIn</a>)}
              </div>
              <div className="skills-cell">{candidate.skills || 'N/A'}</div>
              <div>{candidate.location || 'N/A'}</div>
              <div>{candidate.phone || 'N/A'}</div>
              {/* This displays the link to the uploaded resume file */}
              <div>{candidate.resume_url ? (<a href={candidate.resume_url} target="_blank" rel="noopener noreferrer" className="btn-link" onClick={(e) => e.stopPropagation()}>View</a>) : ('N/A')}</div> 
              <div className="actions-cell" onClick={(e) => e.stopPropagation()}>
                <button className="btn-comments" onClick={() => openCommentsModal(candidate)}>Comments</button>
              </div>
            </div>
            {expandedRow === candidate.id && candidate.notes && (<div className="candidate-row-notes"><strong>Notes:</strong> {candidate.notes}</div>)}
          </React.Fragment>
        ))}
      </div>

      {showCommentsModal && selectedCandidate && (
        <div className="modal-overlay" onClick={() => setShowCommentsModal(false)}>
          <div className="modal-content modal-large" onClick={(e) => e.stopPropagation()}>
            <h2>Comments for {selectedCandidate?.name}</h2>
            <div className="comments-section">
              <form onSubmit={handleAddComment} className="comment-form">
                <div className="form-group"><label>Your Name *</label><input type="text" required placeholder="e.g., Director Jane" value={commentData.author_name} onChange={(e) => setCommentData({...commentData, author_name: e.target.value})} /></div>
                <div className="form-group"><label>Comment *</label><textarea required rows="3" placeholder="Leave feedback..." value={commentData.comment_text} onChange={(e) => setCommentData({...commentData, comment_text: e.target.value})} /></div>
                <button type="submit" className="btn-primary">Add Comment</button>
              </form>
              <div className="comments-list">
                <h3>Comment History ({comments.length})</h3>
                {comments.length === 0 ? (<p className="empty-comments">No comments yet.</p>) : (
                  comments.map(comment => (
                    <div key={comment.id} className="comment-item">
                      <div className="comment-header"><strong>{comment.author_name}</strong><span className="comment-date">{new Date(comment.created_at).toLocaleString()}</span></div>
                      <p className="comment-text">{comment.comment_text}</p>
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

export default TalentPool;