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
  const [currentFormView, setCurrentFormView] = useState(null); // 'parse' or 'manual'
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

  // --- PAGINATION STATE ---
  const [currentPage, setCurrentPage] = useState(1);
  const candidatesPerPage = 10;
  // --------------------------

  // --- MANUAL/EDIT FORM STATE ---
  const [editingCandidate, setEditingCandidate] = useState(null); // The full candidate object when editing
  const [candidateFormData, setCandidateFormData] = useState({
    name: '',
    email: '',
    phone: '',
    location: '',
    linkedin_url: '',
    skills: [], // As an array for TagInput
    notes: '',
    resume_url: '' // NEW: To store the direct link
  });
  
  // --- PIPELINE MODAL STATE ---
  const [pipelineData, setPipelineData] = useState({
    position_id: '',
    recruiter_id: '',
    stage: 'Screening',
    candidate_id: null,
  });
  
  // --- CONFIG CONSTANTS (Used only for upload logic now) ---
  const BUCKET_NAME = 'resumes'; 
  // NOTE: This URL is used ONLY by the dedicated Parse button
  const APILAYER_WEBHOOK = 'https://jtsimon416.app.n8n.cloud/webhook/00741332-4763-439b-87d0-d19a13f5a0d0'; 
  
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
  
  // --- Load Candidates from DB ---
  async function loadCandidates() {
      const { data, error } = await supabase
          .from('candidates')
          .select('*')
          .order('name');
      if (error) console.error('Error loading candidates:', error);
      else {
          setCandidates(data || []);
          setFilteredCandidates(data || []);
      }
  }

  // Combined function for initial data loading
  useEffect(() => {
    const loadData = async () => {
      await Promise.all([
        loadCandidates(),
        fetchPositions(),
        fetchRecruiters()
      ]);
      setLoading(false);
    };
    loadData();
  }, []);
  
  
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
    // Reset page to 1 whenever filters change
    setCurrentPage(1);
    
    let filtered = candidates;

    if (searchTerm) {
      filtered = filtered.filter(c => 
        c.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.email?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // --- IMPROVED SKILLS FILTER LOGIC ---
    if (skillFilter) {
      // 1. Get user's search terms and normalize them (split by comma, trim, lowercase)
      const searchTerms = skillFilter.toLowerCase().split(',').map(s => s.trim()).filter(s => s);

      if (searchTerms.length > 0) {
        filtered = filtered.filter(c => {
          if (!c.skills) return false;

          // 2. Normalize candidate's skills into an array of lowercase tags
          const candidateTags = c.skills.toLowerCase().split(',').map(tag => tag.trim());

          // 3. Check if the candidate has AT LEAST ONE skill that includes ANY search term
          return searchTerms.some(searchTerm => 
            candidateTags.some(candidateTag => 
              candidateTag.includes(searchTerm)
            )
          );
        });
      }
    }
    // --- END IMPROVED SKILLS FILTER LOGIC ---

    if (locationFilter) {
      filtered = filtered.filter(c => 
        c.location && c.location.toLowerCase().includes(locationFilter.toLowerCase())
      );
    }

    setFilteredCandidates(filtered);
  }

  // Hook to run filter when dependencies change, excluding currentPage
  useEffect(() => {
    if (!loading) {
      filterCandidates();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [candidates, searchTerm, skillFilter, locationFilter, loading]); 

  // --- HANDLER: Uploads File for MANUAL Entry (No Parsing) ---
  // This is called by the file input inside the Manual Entry form.
  async function handleFileUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    setLoading(true);
    
    try {
      // 1. UPLOAD FILE to Supabase Storage (BYPASSES N8N)
      const filePath = `${BUCKET_NAME}/${new Date().getTime()}_${file.name.replace(/\s/g, '_')}`;
      const { error: uploadError } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(filePath, file);

      if (uploadError) throw new Error('File upload failed: ' + uploadError.message);

      // 2. Get the public URL
      const { data: publicURLData } = supabase.storage
        .from(BUCKET_NAME)
        .getPublicUrl(filePath);
        
      const publicURL = publicURLData.publicUrl;

      // 3. Update local state with the URL
      setCandidateFormData(prev => ({
        ...prev,
        resume_url: publicURL
      }));
      e.target.value = null; // Clear input field visually
      alert("Resume successfully uploaded! The link is attached to the candidate record.");

    } catch (error) {
      console.error('File Upload Error:', error);
      alert('An error occurred during file upload: ' + error.message);
    } finally {
      setLoading(false);
    }
  }

  // --- HANDLER: Uploads File for PARSING (N8N Call) ---
  // This is called by the dedicated + Resume (Parse) button form.
  async function handleParseSubmit(e) {
    e.preventDefault();
    const fileInput = e.target.elements.resumeFile;
    const file = fileInput.files[0];
    if (!file) return;

    setLoading(true);
    
    try {
      // 1. UPLOAD FILE to Supabase Storage
      const filePath = `${BUCKET_NAME}/${new Date().getTime()}_${file.name.replace(/\s/g, '_')}`;
      const { error: uploadError } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(filePath, file);

      if (uploadError) throw new Error('File upload failed: ' + uploadError.message);

      // 2. Get the public URL
      const { data: publicURLData } = supabase.storage
        .from(BUCKET_NAME)
        .getPublicUrl(filePath);
        
      const publicURL = publicURLData.publicUrl;

      alert(`Resume uploaded and parsing initiated! Candidate should appear shortly, but may require a refresh due to the external service timeout.`);
      
      // 3. Trigger N8N Parsing Workflow (Fire-and-Forget) - **N8N CALL IS HERE**
      await fetch(APILAYER_WEBHOOK, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resumeUrl: publicURL }),
      });
      
      // 4. Clean up UI and trigger quick refresh
      fileInput.value = '';
      resetForm();
      loadCandidates(); 

    } catch (error) {
      console.error('Parsing/Upload Error:', error);
      alert('WARNING: File upload succeeded, but parsing failed/timed out. Please manually refresh the page to check for the new candidate.');
      fileInput.value = '';
      resetForm();
    } finally {
      setLoading(false);
    }
  }


  // --- HANDLER: MANUAL ADD/EDIT ---
  async function handleManualSubmit(e) {
    e.preventDefault();
    setLoading(true);
    
    // Transform skills array back to comma-separated string
    const dataToSave = {
        ...candidateFormData,
        skills: Array.isArray(candidateFormData.skills) ? candidateFormData.skills.join(', ') : candidateFormData.skills,
    };

    if (editingCandidate) {
        // UPDATE existing candidate
        const { error } = await supabase
            .from('candidates')
            .update(dataToSave)
            .eq('id', editingCandidate.id);
        
        if (error) {
            alert('Error updating candidate: ' + error.message);
        } else {
            alert('Candidate updated successfully!');
            resetForm(); 
            await loadCandidates(); 
        }
    } else {
        // ADD new candidate manually
        // We enforce name and email here as mandatory fields for the Talent Pool.
        if (!dataToSave.name || !dataToSave.email) {
            alert('Candidate Name and Email are required.');
            setLoading(false);
            return;
        }

        const { error } = await supabase
            .from('candidates')
            .insert([dataToSave]);

        if (error) {
            alert('Error adding candidate: ' + error.message);
        } else {
            alert('Candidate added successfully!');
            resetForm(); 
            await loadCandidates(); 
        }
    }
    setLoading(false);
  }
  
  // --- HANDLER: Edit Button Click ---
  function handleEdit(candidate) {
    setEditingCandidate(candidate);
    
    // Auto-scroll to the top to show the newly opened form
    window.scrollTo({ top: 0, behavior: 'smooth' }); 
    
    setCandidateFormData({
        name: candidate.name || '',
        email: candidate.email || '',
        phone: candidate.phone || '',
        location: candidate.location || '',
        linkedin_url: candidate.linkedin_url || '',
        // Split the skills string back into an array for the TagInput
        skills: candidate.skills ? candidate.skills.split(',').map(s => s.trim()).filter(s => s) : [],
        notes: candidate.notes || '',
        resume_url: candidate.resume_url || '' // Load existing URL
    });
    setShowForm(true);
    setCurrentFormView('manual'); // Ensure manual form opens for editing
  }

  // --- HANDLER: Deletes a candidate and associated data ---
  async function handleDelete(id) {
    if (!window.confirm('Are you sure you want to permanently delete this candidate? This will also remove associated comments and pipeline entries.')) return;
    setLoading(true);
    
    try {
      // 1. Delete associated comments
      await supabase.from('comments').delete().eq('candidate_id', id);
      
      // 2. Delete associated pipeline entries
      await supabase.from('pipeline').delete().eq('candidate_id', id);

      // 3. Delete the candidate record
      const { error } = await supabase
        .from('candidates')
        .delete()
        .eq('id', id);
      
      if (error) throw new Error(error.message);
      
      alert('Candidate and all associated data deleted successfully!');
      await loadCandidates();
      
    } catch (error) {
      console.error('Error deleting candidate:', error);
      alert('Error deleting candidate: ' + error.message);
    } finally {
      setLoading(false);
    }
  }
  // -----------------------------------------------------------

  // --- HANDLER: Adds candidate to pipeline from modal ---
  const handleAddToPipeline = async (e) => {
    e.preventDefault();
    if (!pipelineData.position_id || !pipelineData.recruiter_id || !pipelineData.candidate_id) {
      alert('Please select a position and recruiter.');
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase
        .from('pipeline')
        .insert([{
          position_id: pipelineData.position_id,
          recruiter_id: pipelineData.recruiter_id,
          candidate_id: pipelineData.candidate_id,
          stage: pipelineData.stage,
          status: 'Active'
        }]);
      
      if (error) throw error;

      alert(`Candidate added to pipeline successfully!`);
      closePipelineModal();
      setLoading(false);

    } catch (error) {
      console.error('Error adding to pipeline:', error);
      alert('Error adding to pipeline: ' + error.message);
    } finally {
      setLoading(false);
    }
  };
  
  // --- UTILITY: Resets form data only (keeps window open) ---
  function clearFormData() {
      setEditingCandidate(null);
      setCandidateFormData({
        name: '', email: '', phone: '', location: '', linkedin_url: '', skills: [], notes: '', resume_url: ''
      });
  }

  // --- UI Handlers: Resets form data AND closes window ---
  function resetForm() {
    clearFormData();
    setShowForm(false);
    setCurrentFormView(null);
  }

  // --- HANDLER TO OPEN FORMS ---
  const handleOpenForm = (mode) => {
    // If the same form is already open, close it.
    if (showForm && currentFormView === mode) {
        resetForm();
    } else {
        clearFormData(); // Clear old data first
        setCurrentFormView(mode);
        setShowForm(true);
        window.scrollTo({ top: 0, behavior: 'smooth' }); 
    }
  };
  // ----------------------------------


  function openCommentsModal(candidate) {
    setSelectedCandidate(candidate);
    fetchComments(candidate.id);
    setCommentData({ author_name: '', comment_text: '' });
    setShowCommentsModal(true);
  }
  
  function openPipelineModal(candidate) {
    setSelectedCandidate(candidate);
    setPipelineData(prev => ({ 
      ...prev, 
      candidate_id: candidate.id,
      position_id: '',
      recruiter_id: '',
      stage: 'Screening'
    }));
    setShowPipelineModal(true);
  }
  
  function closePipelineModal() {
    setShowPipelineModal(false);
    setSelectedCandidate(null);
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
  
  // --- PAGINATION LOGIC ---
  const indexOfLastCandidate = currentPage * candidatesPerPage;
  const indexOfFirstCandidate = indexOfLastCandidate - candidatesPerPage;
  const currentCandidates = filteredCandidates.slice(
    indexOfFirstCandidate,
    indexOfLastCandidate
  );
  
  const totalPages = Math.ceil(filteredCandidates.length / candidatesPerPage);
  
  const goToNextPage = () => setCurrentPage((prev) => Math.min(prev + 1, totalPages));
  const goToPrevPage = () => setCurrentPage((prev) => Math.max(prev - 1, 1));
  // -------------------------

  if (loading) {
    return <div className="loading-state">Loading Talent Pool...</div>;
  }

  const renderParseForm = () => (
    <div className="form-card">
        <h2 style={{marginBottom: '25px'}}>Upload Resume for Parsing</h2>
        <form onSubmit={handleParseSubmit}>
            <div className="form-group">
                <label>Resume File (.pdf, .docx)*</label>
                <input
                    type="file"
                    name="resumeFile"
                    required
                    accept=".pdf,.docx,.doc"
                    disabled={loading}
                />
            </div>
            <button 
                type="submit" 
                className="btn-primary" 
                disabled={loading}
            >
                Upload & Start Parsing Job
            </button>
            <p style={{marginTop: '15px', color: 'var(--text-muted)', fontSize: '12px'}}>
                **This starts a background job** via N8N. The candidate will appear here after the job completes (up to a minute).
            </p>
        </form>
    </div>
  );

  const renderManualForm = () => (
    <div className="form-card">
        <h2 style={{marginBottom: '25px'}}>{editingCandidate ? `Edit Candidate: ${editingCandidate.name}` : 'Manual Candidate Entry'}</h2>
        
        <form onSubmit={handleManualSubmit}>
          <div className="form-row">
              <div className="form-group">
                  <label>Full Name *</label>
                  <input type="text" required value={candidateFormData.name} onChange={(e) => setCandidateFormData({...candidateFormData, name: e.target.value})} />
              </div>
              <div className="form-group">
                  <label>Email *</label>
                  <input type="email" required value={candidateFormData.email} onChange={(e) => setCandidateFormData({...candidateFormData, email: e.target.value})} />
              </div>
          </div>

          <div className="form-row">
              <div className="form-group">
                  <label>Phone</label>
                  <input type="tel" value={candidateFormData.phone} onChange={(e) => setCandidateFormData({...candidateFormData, phone: e.target.value})} />
              </div>
              <div className="form-group">
                  <label>Location</label>
                  <input type="text" value={candidateFormData.location} onChange={(e) => setCandidateFormData({...candidateFormData, location: e.target.value})} />
              </div>
          </div>
          
          <div className="form-group">
              <label>LinkedIn URL</label>
              <input type="url" placeholder="Optional" value={candidateFormData.linkedin_url} onChange={(e) => setCandidateFormData({...candidateFormData, linkedin_url: e.target.value})} />
          </div>

          <div className="form-group">
              <label>Skills (Type, press Enter/Comma to add)</label>
              <TagInput tags={candidateFormData.skills} setTags={(skills) => setCandidateFormData({...candidateFormData, skills})} />
          </div>

          <div className="form-group">
              <label>Notes</label>
              <textarea rows="4" value={candidateFormData.notes} onChange={(e) => setCandidateFormData({...candidateFormData, notes: e.target.value})} />
          </div>
          
          <div className="form-group file-upload-section">
              <label>Upload Resume (Optional)</label>
              {editingCandidate && candidateFormData.resume_url ? (
                  // Scenario A: Editing and a link already exists (cannot be changed)
                  <div className="link-status">
                      <p>Link Ready: <a href={candidateFormData.resume_url} target="_blank" rel="noopener noreferrer" className="btn-link">View Uploaded Resume</a></p>
                      <p className="sub-header-text">Link cannot be changed after candidate creation.</p>
                  </div>
              ) : candidateFormData.resume_url ? (
                  // Scenario B: New candidate and file has been uploaded (link is present)
                  <div className="link-status">
                      <p>Link Ready: <a href={candidateFormData.resume_url} target="_blank" rel="noopener noreferrer" className="btn-link">View Uploaded Resume</a></p>
                      <button type="button" className="btn-secondary" onClick={() => setCandidateFormData(prev => ({ ...prev, resume_url: '' }))}>
                          Remove Link
                      </button>
                  </div>
              ) : (
                  // Scenario C: New candidate and no file has been uploaded yet (show file input)
                  <input 
                      type="file" 
                      accept=".pdf,.docx,.doc" 
                      onChange={(e) => handleFileUpload(e)}
                      disabled={loading}
                  />
              )}
          </div>
          
          <button type="submit" className="btn-primary" disabled={loading}>
              {editingCandidate ? 'Update Candidate Details' : 'Add Candidate Manually'}
          </button>
        </form>
    </div>
  );


  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Talent Pool</h1>
        <div className="header-action-buttons">
            <button className={`btn-primary ${currentFormView === 'parse' ? 'active' : ''}`} 
                    onClick={() => handleOpenForm('parse')} 
                    disabled={!!editingCandidate}>
                + Resume (Parse)
            </button>
            <button className={`btn-secondary ${currentFormView === 'manual' ? 'active' : ''}`} 
                    onClick={() => handleOpenForm('manual')} 
                    disabled={!!editingCandidate}>
                + Manual Entry
            </button>
        </div>
      </div>

      {/* RENDER FORM BASED ON VIEW STATE */}
      {showForm && (
        <>
            {currentFormView === 'parse' && renderParseForm()}
            {currentFormView === 'manual' && renderManualForm()}
            {/* Display Cancel button only if a form is open */}
            <div className="form-close-bar">
                <button className="btn-secondary" onClick={resetForm} style={{width: '200px'}}>
                    Cancel / Close Form
                </button>
            </div>
        </>
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
          placeholder="Filter by skills (comma-separated)..." 
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
        
        {currentCandidates.map(candidate => (
          <React.Fragment key={candidate.id}>
            <div className="candidate-row" onClick={() => setExpandedRow(expandedRow === candidate.id ? null : candidate.id)}>
              <div className="candidate-name-cell">
                <div className="candidate-name">{candidate.name}</div>
                {candidate.linkedin_url && (<a href={candidate.linkedin_url} target="_blank" rel="noopener noreferrer" className="candidate-linkedin" onClick={(e) => e.stopPropagation()}>LinkedIn</a>)}
              </div>
              {/* --- RENDER SKILLS AS TAGS --- */}
              <div className="skills-cell">
                {candidate.skills && typeof candidate.skills === 'string' ? (
                  <div className="skill-tag-container">
                    {candidate.skills.split(',').map(s => s.trim()).filter(s => s).slice(0, 4).map((skill, index) => (
                      <span key={index} className="skill-tag">{skill}</span>
                    ))}
                    {candidate.skills.split(',').length > 4 && (
                      <span className="skill-extra-count">+{candidate.skills.split(',').length - 4}</span>
                    )}
                  </div>
                ) : (
                  'N/A'
                )}
              </div>
              {/* --- END SKILLS RENDER --- */}
              <div>{candidate.location || 'N/A'}</div>
              <div>{candidate.phone || 'N/A'}</div>
              {/* This displays the link to the uploaded resume file */}
              <div>{candidate.resume_url ? (<a href={candidate.resume_url} target="_blank" rel="noopener noreferrer" className="btn-link" onClick={(e) => e.stopPropagation()}>View</a>) : ('N/A')}</div> 
              <div className="actions-cell" onClick={(e) => e.stopPropagation()}>
                <button className="btn-edit" onClick={() => handleEdit(candidate)}>Edit</button>
                <button className="btn-add-pipeline" onClick={() => openPipelineModal(candidate)}>
                    Add to Pipeline
                </button>
                <button className="btn-comments" onClick={() => openCommentsModal(candidate)}>Comments</button>
                <button className="btn-delete" onClick={(e) => { e.stopPropagation(); handleDelete(candidate.id); }}>
                  Delete
                </button>
              </div>
            </div>
            {expandedRow === candidate.id && candidate.notes && (<div className="candidate-row-notes"><strong>Notes:</strong> {candidate.notes}</div>)}
          </React.Fragment>
        ))}
      </div>
      
      {/* --- PAGINATION CONTROLS --- */}
      {totalPages > 1 && (
        <div className="pagination-controls">
          <button onClick={goToPrevPage} disabled={currentPage === 1} className="btn-secondary">
            Previous Page
          </button>
          <span className="page-info">
            Page {currentPage} of {totalPages}
          </span>
          <button onClick={goToNextPage} disabled={currentPage === totalPages || totalPages === 0} className="btn-secondary">
            Next Page
          </button>
        </div>
      )}
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
      
      {/* --- ADD TO PIPELINE MODAL --- */}
      {showPipelineModal && selectedCandidate && (
        <div className="modal-overlay" onClick={closePipelineModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Add {selectedCandidate.name} to Pipeline</h2>
            <form onSubmit={handleAddToPipeline}>
                <p className="modal-candidate-name">Assign role and recruiter to start tracking.</p>

                <div className="form-group">
                    <label>Position *</label>
                    <select 
                        required 
                        value={pipelineData.position_id} 
                        onChange={(e) => setPipelineData({...pipelineData, position_id: e.target.value})}
                    >
                        <option value="">Select position...</option>
                        {positions.map(pos => (<option key={pos.id} value={pos.id}>{pos.title} - {pos.clients?.company_name || 'N/A'}</option>))}
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
                        {recruiters.map(rec => (<option key={rec.id} value={rec.id}>{rec.name}</option>))}
                    </select>
                </div>
                
                <div className="form-group">
                    <label>Initial Stage</label>
                    <select 
                        value={pipelineData.stage} 
                        onChange={(e) => setPipelineData({...pipelineData, stage: e.target.value})}
                    >
                        {stages.map(stage => (<option key={stage} value={stage}>{stage}</option>))}
                    </select>
                </div>
                
                <div className="modal-actions">
                    <button type="button" className="btn-secondary" onClick={closePipelineModal}>Cancel</button>
                    <button type="submit" className="btn-primary">Add to Active Tracker</button>
                </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default TalentPool;
