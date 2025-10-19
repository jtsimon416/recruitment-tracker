import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../services/supabaseClient';
import * as mammoth from 'mammoth';
import { Pen, Trash, ChevronDown, ChevronUp, X, Filter } from 'lucide-react';
import { useConfirmation } from '../contexts/ConfirmationContext';
import WordDocViewerModal from '../components/Worddocviewermodal';
import '../styles/TalentPool.css';

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
    
    // Split by commas, line breaks, and bullet points
    const newTags = paste
      .split(/[,\n•\-*]/)
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

const AdvancedFilterPanel = ({
  expanded,
  setExpanded,
  searchTerm,
  setSearchTerm,
  selectedSkills,
  setSelectedSkills,
  uniqueSkills,
  filteredSkills,
  skillSearchTerm,
  setSkillSearchTerm,
  selectedLocation,
  setSelectedLocation,
  uniqueLocations,
  dateRangeStart,
  setDateRangeStart,
  dateRangeEnd,
  setDateRangeEnd,
  hasResumeFilter,
  setHasResumeFilter,
  inPipelineFilter,
  setInPipelineFilter,
  activeQuickFilter,
  handleQuickFilter,
  clearAllFilters,
  activeFilterCount
}) => {
  const handleSkillToggle = (skill) => {
    if (selectedSkills.includes(skill)) {
      setSelectedSkills(selectedSkills.filter(s => s !== skill));
    } else {
      setSelectedSkills([...selectedSkills, skill]);
    }
  };

  const quickFilters = [
    { id: 'addedThisWeek', label: 'Added This Week' },
    { id: 'hasResume', label: 'Has Resume' },
    { id: 'noResume', label: 'No Resume' },
    { id: 'inPipeline', label: 'In Pipeline' }
  ];

  return (
    <div className="advanced-filter-panel">
      <div className="filter-panel-header" onClick={() => setExpanded(!expanded)}>
        <div className="filter-header-left">
          <Filter size={20} />
          <h3>Advanced Filters</h3>
          {activeFilterCount > 0 && (
            <span className="filter-count-badge">{activeFilterCount}</span>
          )}
        </div>
        <div className="filter-header-right">
          {activeFilterCount > 0 && (
            <button
              className="btn-clear-filters"
              onClick={(e) => {
                e.stopPropagation();
                clearAllFilters();
              }}
            >
              Clear All
            </button>
          )}
          <button className="btn-toggle-panel">
            {expanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="filter-panel-content">
          {/* Quick Filter Chips */}
          <div className="filter-section">
            <label className="filter-section-label">Quick Filters</label>
            <div className="quick-filter-chips">
              {quickFilters.map(qf => (
                <button
                  key={qf.id}
                  className={`quick-filter-chip ${activeQuickFilter === qf.id ? 'active' : ''}`}
                  onClick={() => handleQuickFilter(qf.id)}
                >
                  {qf.label}
                  {activeQuickFilter === qf.id && <X size={14} style={{ marginLeft: '6px' }} />}
                </button>
              ))}
            </div>
          </div>

          {/* Multi-field Search */}
          <div className="filter-section">
            <label className="filter-section-label">Search Across All Fields</label>
            <input
              type="text"
              placeholder="Search name, email, phone, notes..."
              className="filter-input-full"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Skills Multi-Select */}
          <div className="filter-section">
            <label className="filter-section-label">Skills</label>
            <div className="skills-multiselect">
              {/* NEW: Skills Search Box */}
              <div className="skills-search-box">
                <span className="search-icon">🔍</span>
                <input
                  type="text"
                  className="skills-search-input"
                  placeholder="Type to filter skills..."
                  value={skillSearchTerm}
                  onChange={(e) => setSkillSearchTerm(e.target.value)}
                />
                {skillSearchTerm && (
                  <button
                    className="skills-search-clear"
                    onClick={() => setSkillSearchTerm('')}
                    title="Clear search"
                  >
                    ×
                  </button>
                )}
              </div>

              {/* Skills count indicator */}
              {skillSearchTerm && (
                <div className="skills-count-indicator">
                  Showing {filteredSkills.length} of {uniqueSkills.length} skills
                </div>
              )}

              <select
                className="filter-select"
                onChange={(e) => {
                  if (e.target.value && !selectedSkills.includes(e.target.value)) {
                    setSelectedSkills([...selectedSkills, e.target.value]);
                  }
                  e.target.value = '';
                }}
                value=""
              >
                <option value="">Select skills to filter...</option>
                {filteredSkills.length > 0 ? (
                  filteredSkills.map(skill => (
                    <option key={skill} value={skill} disabled={selectedSkills.includes(skill)}>
                      {skill}
                    </option>
                  ))
                ) : (
                  <option value="" disabled>
                    No skills match '{skillSearchTerm}'
                  </option>
                )}
              </select>
              {selectedSkills.length > 0 && (
                <div className="selected-skills-tags">
                  {selectedSkills.map(skill => (
                    <span key={skill} className="selected-skill-tag">
                      {skill}
                      <button onClick={() => handleSkillToggle(skill)}>×</button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Location Dropdown */}
          <div className="filter-section">
            <label className="filter-section-label">Location</label>
            <select
              className="filter-select"
              value={selectedLocation}
              onChange={(e) => setSelectedLocation(e.target.value)}
            >
              <option value="">All Locations</option>
              {uniqueLocations.map(loc => (
                <option key={loc} value={loc}>{loc}</option>
              ))}
            </select>
          </div>

          {/* Date Range Picker */}
          <div className="filter-section">
            <label className="filter-section-label">Date Added</label>
            <div className="date-range-inputs">
              <input
                type="date"
                className="filter-date-input"
                value={dateRangeStart}
                onChange={(e) => setDateRangeStart(e.target.value)}
                placeholder="Start Date"
              />
              <span className="date-separator">to</span>
              <input
                type="date"
                className="filter-date-input"
                value={dateRangeEnd}
                onChange={(e) => setDateRangeEnd(e.target.value)}
                placeholder="End Date"
              />
            </div>
          </div>

          {/* Toggle Filters */}
          <div className="filter-section">
            <label className="filter-section-label">Additional Filters</label>
            <div className="toggle-filters">
              <label className="toggle-filter-item">
                <input
                  type="checkbox"
                  checked={hasResumeFilter}
                  onChange={(e) => setHasResumeFilter(e.target.checked)}
                />
                <span className="toggle-label">Has Resume</span>
              </label>
              <label className="toggle-filter-item">
                <input
                  type="checkbox"
                  checked={inPipelineFilter}
                  onChange={(e) => setInPipelineFilter(e.target.checked)}
                />
                <span className="toggle-label">Currently in Pipeline</span>
              </label>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

function TalentPool() {
  const { showConfirmation } = useConfirmation();
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
  const [wordDocHtml, setWordDocHtml] = useState('');

  // Advanced filter state variables
  const [filterPanelExpanded, setFilterPanelExpanded] = useState(true);
  const [selectedSkills, setSelectedSkills] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState('');
  const [dateRangeStart, setDateRangeStart] = useState('');
  const [dateRangeEnd, setDateRangeEnd] = useState('');
  const [hasResumeFilter, setHasResumeFilter] = useState(false);
  const [inPipelineFilter, setInPipelineFilter] = useState(false);
  const [activeQuickFilter, setActiveQuickFilter] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [pipelineCandidateIds, setPipelineCandidateIds] = useState([]);
  const [skillSearchTerm, setSkillSearchTerm] = useState('');
  const [debouncedSkillSearchTerm, setDebouncedSkillSearchTerm] = useState('');

  const [currentPage, setCurrentPage] = useState(1);
  const candidatesPerPage = 10;

  const [editingCandidate, setEditingCandidate] = useState(null);
  const [candidateFormData, setCandidateFormData] = useState({
    name: '',
    email: '',
    phone: '',
    location: '',
    linkedin_url: '',
    skills: [],
    notes: '',
    resume_url: ''
  });
  
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editingCommentText, setEditingCommentText] = useState('');
  const [currentUserEmail, setCurrentUserEmail] = useState('');

  // NEW: Word Doc Viewer Modal State
  const [showWordDocModal, setShowWordDocModal] = useState(false);
  const [wordDocUrl, setWordDocUrl] = useState('');
  const [wordDocCandidateName, setWordDocCandidateName] = useState('');

  const [pipelineData, setPipelineData] = useState({
    position_id: '',
    recruiter_id: '',
    stage: 'Screening',
    candidate_id: null,
  });

  useEffect(() => {
    const getCurrentUserEmail = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setCurrentUserEmail(user.email);
    };
    getCurrentUserEmail();
  }, []);

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Debounce skill search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSkillSearchTerm(skillSearchTerm);
    }, 200);
    return () => clearTimeout(timer);
  }, [skillSearchTerm]);
  
  const BUCKET_NAME = 'resumes'; 
  
  const stages = [
    'Screening',
    'Secondary Screening',
    'Technical Interview',
    'Team Interview',
    'Offer',
    'Hired',
    'Rejected'
  ];

  const convertWordToHtml = async (fileUrl) => {
    try {
      const response = await fetch(fileUrl);
      const arrayBuffer = await response.arrayBuffer();
      const result = await mammoth.convertToHtml({ arrayBuffer });
      setWordDocHtml(result.value);
    } catch (error) {
      console.error('Error converting Word doc:', error);
      setWordDocHtml('<p>Unable to preview Word document. Please download to view.</p>');
    }
  };

  useEffect(() => {
    if (candidateFormData.resume_url && candidateFormData.resume_url.includes('.docx')) {
      convertWordToHtml(candidateFormData.resume_url);
    } else {
      setWordDocHtml('');
    }
  }, [candidateFormData.resume_url]);

  async function loadCandidates() {
    try {
      const { data, error } = await supabase
        .from('candidates')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCandidates(data || []);
      setFilteredCandidates(data || []);
    } catch (error) {
      console.error('Error loading candidates:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadPositions() {
    try {
      const { data, error } = await supabase
        .from('positions')
        .select('*')
        .order('title', { ascending: true });

      if (error) throw error;
      setPositions(data || []);
    } catch (error) {
      console.error('Error loading positions:', error);
    }
  }

  async function loadRecruiters() {
    try {
      const { data, error } = await supabase
        .from('recruiters')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;
      setRecruiters(data || []);
    } catch (error) {
      console.error('Error loading recruiters:', error);
    }
  }

  async function loadPipelineCandidates() {
    try {
      const { data, error } = await supabase
        .from('pipeline')
        .select('candidate_id');

      if (error) throw error;
      const ids = data ? data.map(p => p.candidate_id) : [];
      setPipelineCandidateIds(ids);
    } catch (error) {
      console.error('Error loading pipeline candidates:', error);
    }
  }

  useEffect(() => {
    loadCandidates();
    loadPositions();
    loadRecruiters();
    loadPipelineCandidates();
  }, []);

  // Extract unique skills from all candidates
  const uniqueSkills = useMemo(() => {
    const skillsSet = new Set();
    candidates.forEach(c => {
      if (c.skills && typeof c.skills === 'string') {
        c.skills.split(',').forEach(skill => {
          const trimmedSkill = skill.trim();
          if (trimmedSkill) skillsSet.add(trimmedSkill);
        });
      }
    });
    return Array.from(skillsSet).sort();
  }, [candidates]);

  // Extract unique locations from all candidates
  const uniqueLocations = useMemo(() => {
    const locationsSet = new Set();
    candidates.forEach(c => {
      if (c.location && c.location.trim()) {
        locationsSet.add(c.location.trim());
      }
    });
    return Array.from(locationsSet).sort();
  }, [candidates]);

  // Filter skills based on search term
  const filteredSkills = useMemo(() => {
    if (!debouncedSkillSearchTerm) {
      return uniqueSkills;
    }
    const searchLower = debouncedSkillSearchTerm.toLowerCase();
    return uniqueSkills.filter(skill =>
      skill.toLowerCase().includes(searchLower)
    );
  }, [uniqueSkills, debouncedSkillSearchTerm]);

  // Enhanced filter function with useMemo for performance
  const filteredCandidatesResult = useMemo(() => {
    let filtered = candidates;

    // Multi-field search (name, email, phone, notes)
    if (debouncedSearchTerm) {
      const searchLower = debouncedSearchTerm.toLowerCase();
      filtered = filtered.filter(c =>
        c.name?.toLowerCase().includes(searchLower) ||
        c.email?.toLowerCase().includes(searchLower) ||
        c.phone?.toLowerCase().includes(searchLower) ||
        c.notes?.toLowerCase().includes(searchLower)
      );
    }

    // Skills filter - backward compatible with old skillFilter
    if (skillFilter) {
      const searchTerms = skillFilter.toLowerCase().split(',').map(s => s.trim()).filter(s => s);
      if (searchTerms.length > 0) {
        filtered = filtered.filter(c => {
          if (!c.skills) return false;
          const candidateTags = c.skills.toLowerCase().split(',').map(tag => tag.trim());
          return searchTerms.some(searchTerm =>
            candidateTags.some(candidateTag =>
              candidateTag.includes(searchTerm)
            )
          );
        });
      }
    }

    // Multi-select skills filter
    if (selectedSkills.length > 0) {
      filtered = filtered.filter(c => {
        if (!c.skills) return false;
        const candidateSkills = c.skills.toLowerCase().split(',').map(s => s.trim());
        return selectedSkills.every(skill =>
          candidateSkills.some(cs => cs.includes(skill.toLowerCase()))
        );
      });
    }

    // Location filter - backward compatible
    if (locationFilter) {
      filtered = filtered.filter(c =>
        c.location && c.location.toLowerCase().includes(locationFilter.toLowerCase())
      );
    }

    // Selected location dropdown filter
    if (selectedLocation) {
      filtered = filtered.filter(c =>
        c.location && c.location.trim() === selectedLocation
      );
    }

    // Date range filter
    if (dateRangeStart) {
      const startDate = new Date(dateRangeStart);
      filtered = filtered.filter(c => {
        if (!c.created_at) return false;
        return new Date(c.created_at) >= startDate;
      });
    }
    if (dateRangeEnd) {
      const endDate = new Date(dateRangeEnd);
      endDate.setHours(23, 59, 59, 999); // Include the entire end date
      filtered = filtered.filter(c => {
        if (!c.created_at) return false;
        return new Date(c.created_at) <= endDate;
      });
    }

    // Has Resume filter
    if (hasResumeFilter) {
      filtered = filtered.filter(c => c.resume_url && c.resume_url.trim() !== '');
    }

    // In Pipeline filter
    if (inPipelineFilter) {
      filtered = filtered.filter(c => pipelineCandidateIds.includes(c.id));
    }

    return filtered;
  }, [
    candidates,
    debouncedSearchTerm,
    skillFilter,
    selectedSkills,
    locationFilter,
    selectedLocation,
    dateRangeStart,
    dateRangeEnd,
    hasResumeFilter,
    inPipelineFilter,
    pipelineCandidateIds
  ]);

  // Update filteredCandidates whenever filteredCandidatesResult changes
  useEffect(() => {
    if (!loading) {
      setFilteredCandidates(filteredCandidatesResult);
      setCurrentPage(1); // Reset to first page when filters change
    }
  }, [filteredCandidatesResult, loading]);

  // Count active filters
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (debouncedSearchTerm) count++;
    if (skillFilter) count++;
    if (selectedSkills.length > 0) count++;
    if (locationFilter) count++;
    if (selectedLocation) count++;
    if (dateRangeStart) count++;
    if (dateRangeEnd) count++;
    if (hasResumeFilter) count++;
    if (inPipelineFilter) count++;
    return count;
  }, [debouncedSearchTerm, skillFilter, selectedSkills, locationFilter, selectedLocation, dateRangeStart, dateRangeEnd, hasResumeFilter, inPipelineFilter]);

  // Clear all filters
  const clearAllFilters = useCallback(() => {
    setSearchTerm('');
    setSkillFilter('');
    setSelectedSkills([]);
    setSkillSearchTerm('');
    setLocationFilter('');
    setSelectedLocation('');
    setDateRangeStart('');
    setDateRangeEnd('');
    setHasResumeFilter(false);
    setInPipelineFilter(false);
    setActiveQuickFilter('');
  }, []);

  // Handle quick filter clicks
  const handleQuickFilter = useCallback((filterType) => {
    clearAllFilters();
    const today = new Date();
    const oneWeekAgo = new Date(today);
    oneWeekAgo.setDate(today.getDate() - 7);

    switch (filterType) {
      case 'addedThisWeek':
        setDateRangeStart(oneWeekAgo.toISOString().split('T')[0]);
        setActiveQuickFilter('addedThisWeek');
        break;
      case 'noResume':
        setHasResumeFilter(false);
        // We need to invert the logic here - we'll handle this in the filter
        setActiveQuickFilter('noResume');
        break;
      case 'hasResume':
        setHasResumeFilter(true);
        setActiveQuickFilter('hasResume');
        break;
      case 'inPipeline':
        setInPipelineFilter(true);
        setActiveQuickFilter('inPipeline');
        break;
      default:
        setActiveQuickFilter('');
    }
  }, [clearAllFilters]);

  // Special handling for "No Resume" quick filter
  const filteredCandidatesWithQuickFilter = useMemo(() => {
    if (activeQuickFilter === 'noResume') {
      return filteredCandidatesResult.filter(c => !c.resume_url || c.resume_url.trim() === '');
    }
    return filteredCandidatesResult;
  }, [filteredCandidatesResult, activeQuickFilter]);

  // Update the effect to use the quick-filter-aware result
  useEffect(() => {
    if (!loading) {
      setFilteredCandidates(filteredCandidatesWithQuickFilter);
      setCurrentPage(1);
    }
  }, [filteredCandidatesWithQuickFilter, loading]);

  async function handleFileUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    setLoading(true);
    
    try {
      const filePath = `${BUCKET_NAME}/${new Date().getTime()}_${file.name.replace(/\s/g, '_')}`;
      const { error: uploadError } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(filePath, file);

      if (uploadError) throw new Error('File upload failed: ' + uploadError.message);

      const { data: publicURLData } = supabase.storage
        .from(BUCKET_NAME)
        .getPublicUrl(filePath);
        
      const publicURL = publicURLData.publicUrl;

      setCandidateFormData(prev => ({
        ...prev,
        resume_url: publicURL
      }));
      e.target.value = null;
      showConfirmation({
        type: 'success',
        title: 'Success!',
        message: 'Resume successfully uploaded! The link will be attached to the candidate record.',
        confirmText: 'OK',
        cancelText: null,
        onConfirm: () => {}
      });

    } catch (error) {
      console.error('File Upload Error:', error);
      showConfirmation({
        type: 'error',
        title: 'Error',
        message: `An error occurred during file upload: ${error.message}`,
        confirmText: 'OK',
        cancelText: null,
        onConfirm: () => {}
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleManualSubmit(e) {
    e.preventDefault();
    setLoading(true);
    
    const dataToSave = {
        ...candidateFormData,
        skills: Array.isArray(candidateFormData.skills) ? candidateFormData.skills.join(', ') : candidateFormData.skills,
    };

    if (editingCandidate) {
        const { error } = await supabase
            .from('candidates')
            .update(dataToSave)
            .eq('id', editingCandidate.id);

        if (error) {
            showConfirmation({
              type: 'error',
              title: 'Error',
              message: `Error updating candidate: ${error.message}`,
              confirmText: 'OK',
              cancelText: null,
              onConfirm: () => {}
            });
        } else {
            showConfirmation({
              type: 'success',
              title: 'Success!',
              message: 'Candidate updated successfully!',
              confirmText: 'OK',
              cancelText: null,
              onConfirm: () => {}
            });
            resetForm();
            await loadCandidates();
        }
    } else {
        if (!dataToSave.name || !dataToSave.email) {
            showConfirmation({
              type: 'error',
              title: 'Error',
              message: 'Candidate Name and Email are required.',
              confirmText: 'OK',
              cancelText: null,
              onConfirm: () => {}
            });
            setLoading(false);
            return;
        }

        const { error } = await supabase
            .from('candidates')
            .insert([dataToSave]);

        if (error) {
            showConfirmation({
              type: 'error',
              title: 'Error',
              message: `Error adding candidate: ${error.message}`,
              confirmText: 'OK',
              cancelText: null,
              onConfirm: () => {}
            });
        } else {
            showConfirmation({
              type: 'success',
              title: 'Success!',
              message: 'Candidate added successfully!',
              confirmText: 'OK',
              cancelText: null,
              onConfirm: () => {}
            });
            resetForm();
            await loadCandidates();
        }
    }
    setLoading(false);
  }
  
  function handleEdit(candidate) {
    setEditingCandidate(candidate);
    window.scrollTo({ top: 0, behavior: 'smooth' }); 
    
    setCandidateFormData({
        name: candidate.name || '',
        email: candidate.email || '',
        phone: candidate.phone || '',
        location: candidate.location || '',
        linkedin_url: candidate.linkedin_url || '',
        skills: candidate.skills ? candidate.skills.split(',').map(s => s.trim()).filter(s => s) : [],
        notes: candidate.notes || '',
        resume_url: candidate.resume_url || ''
    });
    setShowForm(true);
  }

  async function handleDelete(id) {
    const candidate = candidates.find(c => c.id === id);
    const candidateName = candidate?.name || 'this candidate';

    showConfirmation({
      type: 'delete',
      title: 'Delete Candidate?',
      message: 'This action cannot be undone. The candidate and all associated data will be permanently removed.',
      contextInfo: `Deleting: ${candidateName}`,
      confirmText: 'Delete',
      cancelText: 'Keep',
      onConfirm: async () => {
        setLoading(true);

        try {
          await supabase.from('comments').delete().eq('candidate_id', id);
          await supabase.from('pipeline').delete().eq('candidate_id', id);

          const { error } = await supabase
            .from('candidates')
            .delete()
            .eq('id', id);

          if (error) throw new Error(error.message);

          showConfirmation({
            type: 'success',
            title: 'Success!',
            message: 'Candidate deleted successfully!',
            confirmText: 'OK',
            cancelText: null,
            onConfirm: () => {}
          });
          await loadCandidates();

        } catch (error) {
          console.error('Delete Error:', error);
          showConfirmation({
            type: 'error',
            title: 'Error',
            message: `Error deleting candidate: ${error.message}`,
            confirmText: 'OK',
            cancelText: null,
            onConfirm: () => {}
          });
        } finally {
          setLoading(false);
        }
      }
    });
  }
  
  const openPipelineModal = (candidate) => {
    setSelectedCandidate(candidate);
    setPipelineData({
      position_id: '',
      recruiter_id: '',
      stage: 'Screening',
      candidate_id: candidate.id,
    });
    setShowPipelineModal(true);
  };

  const closePipelineModal = () => {
    setShowPipelineModal(false);
    setSelectedCandidate(null);
    setPipelineData({
      position_id: '',
      recruiter_id: '',
      stage: 'Screening',
      candidate_id: null,
    });
  };

  const handlePipelineSubmit = async (e) => {
    e.preventDefault();
    if (!pipelineData.position_id || !pipelineData.recruiter_id) {
      showConfirmation({
        type: 'error',
        title: 'Error',
        message: 'Please select both a Position and a Recruiter.',
        confirmText: 'OK',
        cancelText: null,
        onConfirm: () => {}
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('pipeline')
        .insert([pipelineData]);

      if (error) throw error;
      showConfirmation({
        type: 'success',
        title: 'Success!',
        message: 'Candidate added to pipeline successfully!',
        confirmText: 'OK',
        cancelText: null,
        onConfirm: () => {}
      });
      closePipelineModal();
    } catch (error) {
      console.error('Pipeline submission error:', error);
      showConfirmation({
        type: 'error',
        title: 'Error',
        message: `Error adding candidate to pipeline: ${error.message}`,
        confirmText: 'OK',
        cancelText: null,
        onConfirm: () => {}
      });
    }
  };

  const openCommentsModal = async (candidate) => {
    setSelectedCandidate(candidate);
    
    try {
      const { data, error } = await supabase
        .from('comments')
        .select('*')
        .eq('candidate_id', candidate.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setComments(data || []);
    } catch (error) {
      console.error('Error fetching comments:', error);
      setComments([]);
    }
    
    setShowCommentsModal(true);
  };

  const closeCommentsModal = () => {
    setShowCommentsModal(false);
    setSelectedCandidate(null);
    setComments([]);
  };

  const handleEditComment = (comment) => {
    setEditingCommentId(comment.id);
    setEditingCommentText(comment.comment_text);
  };

  const handleSaveEditComment = async (commentId) => {
    if (!editingCommentText.trim()) {
      showConfirmation({
        type: 'error',
        title: 'Error',
        message: 'Comment cannot be empty.',
        confirmText: 'OK',
        cancelText: null,
        onConfirm: () => {}
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('comments')
        .update({ comment_text: editingCommentText })
        .eq('id', commentId);

      if (error) throw error;

      const { data, error: fetchError } = await supabase
        .from('comments')
        .select('*')
        .eq('candidate_id', selectedCandidate.id)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      setComments(data || []);
      setEditingCommentId(null);
      setEditingCommentText('');
    } catch (error) {
      console.error('Error updating comment:', error);
      showConfirmation({
        type: 'error',
        title: 'Error',
        message: `Error updating comment: ${error.message}`,
        confirmText: 'OK',
        cancelText: null,
        onConfirm: () => {}
      });
    }
  };

  const handleDeleteComment = async (commentId) => {
    showConfirmation({
      type: 'delete',
      title: 'Delete Comment?',
      message: 'This action cannot be undone. The comment will be permanently removed.',
      confirmText: 'Delete',
      cancelText: 'Keep',
      onConfirm: async () => {
        try {
          const { error } = await supabase
            .from('comments')
            .delete()
            .eq('id', commentId);

          if (error) throw error;

          const { data, error: fetchError } = await supabase
            .from('comments')
            .select('*')
            .eq('candidate_id', selectedCandidate.id)
            .order('created_at', { ascending: false });

          if (fetchError) throw fetchError;
          setComments(data || []);
        } catch (error) {
          console.error('Error deleting comment:', error);
          showConfirmation({
            type: 'error',
            title: 'Error',
            message: `Error deleting comment: ${error.message}`,
            confirmText: 'OK',
            cancelText: null,
            onConfirm: () => {}
          });
        }
      }
    });
  };

  const handleAddComment = async (commentText) => {
    if (!commentText.trim()) {
      showConfirmation({
        type: 'error',
        title: 'Error',
        message: 'Comment cannot be empty.',
        confirmText: 'OK',
        cancelText: null,
        onConfirm: () => {}
      });
      return;
    }

    try {
      // Get current user's email
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw new Error('Unable to get current user');

      // Get recruiter name from recruiters table using email
      const { data: recruiterData, error: recruiterError } = await supabase
        .from('recruiters')
        .select('name')
        .eq('email', user.email)
        .single();

      if (recruiterError) throw new Error('Unable to find recruiter profile');

      const authorName = recruiterData?.name || user.email;

      // Insert comment with author name
      const { error } = await supabase
        .from('comments')
        .insert([{
          candidate_id: selectedCandidate.id,
          comment_text: commentText,
          author_name: authorName,
          created_at: new Date(),
        }]);

      if (error) throw error;

      const { data, error: fetchError } = await supabase
        .from('comments')
        .select('*')
        .eq('candidate_id', selectedCandidate.id)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      setComments(data || []);
    } catch (error) {
      console.error('Error adding comment:', error);
      showConfirmation({
        type: 'error',
        title: 'Error',
        message: `Error adding comment: ${error.message}`,
        confirmText: 'OK',
        cancelText: null,
        onConfirm: () => {}
      });
    }
  };

  // NEW: Handle Resume Click - PDFs open in new tab, Word docs open in modal
  const handleResumeClick = (e, resumeUrl, candidateName) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (resumeUrl.includes('.docx')) {
      // Open Word doc in modal
      setWordDocUrl(resumeUrl);
      setWordDocCandidateName(candidateName);
      setShowWordDocModal(true);
    } else {
      // Open PDF in new tab
      window.open(resumeUrl, '_blank');
    }
  };

  function resetForm() {
    setShowForm(false);
    setEditingCandidate(null);
    setCandidateFormData({
      name: '',
      email: '',
      phone: '',
      location: '',
      linkedin_url: '',
      skills: [],
      notes: '',
      resume_url: ''
    });
    setWordDocHtml('');
  }

  function handleOpenForm() {
    if (editingCandidate) {
      showConfirmation({
        type: 'warning',
        title: 'Warning',
        message: 'Please finish editing the current candidate first.',
        confirmText: 'OK',
        cancelText: null,
        onConfirm: () => {}
      });
      return;
    }
    setShowForm(true);
  }

  const totalPages = Math.ceil(filteredCandidates.length / candidatesPerPage);
  const currentCandidates = filteredCandidates.slice(
    (currentPage - 1) * candidatesPerPage,
    currentPage * candidatesPerPage
  );
  const goToNextPage = () => setCurrentPage(prev => Math.min(prev + 1, totalPages));
  const goToPreviousPage = () => setCurrentPage(prev => Math.max(prev - 1, 1));

  const renderSplitScreenForm = () => (
    <div className="split-screen-container">
      <div className="resume-viewer-panel">
        <div className="resume-panel-header">
          <div>
            <h3>Resume Preview</h3>
            {candidateFormData.resume_url && (
              <div className="resume-file-name">File uploaded</div>
            )}
          </div>
        </div>
        <div className="resume-viewer-content">
          {candidateFormData.resume_url ? (
            candidateFormData.resume_url.includes('.pdf') ? (
              <embed 
                src={candidateFormData.resume_url} 
                type="application/pdf" 
                className="resume-pdf-viewer"
              />
            ) : candidateFormData.resume_url.includes('.docx') ? (
              wordDocHtml ? (
                <div 
                  style={{
                    width: '100%',
                    padding: '20px',
                    overflow: 'auto',
                    color: 'var(--text-primary)',
                    lineHeight: '1.6'
                  }}
                  dangerouslySetInnerHTML={{ __html: wordDocHtml }}
                />
              ) : (
                <div className="resume-placeholder">
                  <i className="fas fa-spinner fa-spin"></i>
                  <p>Converting document...</p>
                </div>
              )
            ) : (
              <div className="resume-placeholder">
                <i className="fas fa-file"></i>
                <p>Unsupported file format</p>
              </div>
            )
          ) : (
            <div className="resume-placeholder">
              <i className="fas fa-file-upload"></i>
              <p>Upload a resume to preview it here</p>
              <p style={{fontSize: '12px', color: 'var(--text-muted)'}}>
                PDFs and Word docs supported
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="form-panel">
        <h2>{editingCandidate ? `Edit: ${editingCandidate.name}` : 'Add Candidate'}</h2>
        
        <form onSubmit={handleManualSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label>Full Name *</label>
              <input 
                type="text" 
                required 
                value={candidateFormData.name} 
                onChange={(e) => setCandidateFormData({...candidateFormData, name: e.target.value})} 
              />
            </div>
            <div className="form-group">
              <label>Email *</label>
              <input 
                type="email" 
                required 
                value={candidateFormData.email} 
                onChange={(e) => setCandidateFormData({...candidateFormData, email: e.target.value})} 
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Phone</label>
              <input 
                type="tel" 
                value={candidateFormData.phone} 
                onChange={(e) => setCandidateFormData({...candidateFormData, phone: e.target.value})} 
              />
            </div>
            <div className="form-group">
              <label>Location</label>
              <input 
                type="text" 
                value={candidateFormData.location} 
                onChange={(e) => setCandidateFormData({...candidateFormData, location: e.target.value})} 
              />
            </div>
          </div>
          
          <div className="form-group">
            <label>LinkedIn URL</label>
            <input 
              type="url" 
              placeholder="Optional" 
              value={candidateFormData.linkedin_url} 
              onChange={(e) => setCandidateFormData({...candidateFormData, linkedin_url: e.target.value})} 
            />
          </div>

          <div className="form-group">
            <label>Skills</label>
            <TagInput 
              tags={candidateFormData.skills} 
              setTags={(skills) => setCandidateFormData({...candidateFormData, skills})} 
            />
          </div>

          <div className="form-group">
            <label>Notes / Summary</label>
            <textarea 
              rows="4" 
              value={candidateFormData.notes} 
              onChange={(e) => setCandidateFormData({...candidateFormData, notes: e.target.value})} 
              placeholder="Paste summary or additional notes here..."
            />
          </div>
          
          <div className="form-group file-upload-section">
            <label>Resume Upload</label>
            {editingCandidate && candidateFormData.resume_url ? (
              <div className="link-status">
                <p>📎 Resume attached (cannot change)</p>
              </div>
            ) : candidateFormData.resume_url ? (
              <div className="link-status">
                <p>✅ Resume ready to save</p>
                <button 
                  type="button" 
                  className="btn-secondary" 
                  onClick={() => setCandidateFormData(prev => ({ ...prev, resume_url: '' }))}
                  style={{marginLeft: '10px', padding: '6px 12px', fontSize: '12px'}}
                >
                  Change
                </button>
              </div>
            ) : (
              <input 
                type="file" 
                accept=".pdf,.docx,.doc" 
                onChange={(e) => handleFileUpload(e)}
                disabled={loading}
              />
            )}
          </div>
          
          <div className="form-submit-area">
            <button 
              type="submit" 
              className="btn-primary" 
              disabled={loading}
              style={{flex: 1}}
            >
              {editingCandidate ? 'Update Candidate' : 'Add Candidate'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Talent Pool</h1>
        <div className="header-action-buttons">
          <button 
            className="btn-primary" 
            onClick={() => handleOpenForm()} 
            disabled={!!editingCandidate}
          >
            + Add Candidate
          </button>
        </div>
      </div>

      {showForm && (
        <>
          {renderSplitScreenForm()}
          <div className="form-close-bar">
            <button className="btn-secondary" onClick={resetForm} style={{width: '200px'}}>
              Cancel / Close
            </button>
          </div>
        </>
      )}

      <AdvancedFilterPanel
        expanded={filterPanelExpanded}
        setExpanded={setFilterPanelExpanded}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        selectedSkills={selectedSkills}
        setSelectedSkills={setSelectedSkills}
        uniqueSkills={uniqueSkills}
        filteredSkills={filteredSkills}
        skillSearchTerm={skillSearchTerm}
        setSkillSearchTerm={setSkillSearchTerm}
        selectedLocation={selectedLocation}
        setSelectedLocation={setSelectedLocation}
        uniqueLocations={uniqueLocations}
        dateRangeStart={dateRangeStart}
        setDateRangeStart={setDateRangeStart}
        dateRangeEnd={dateRangeEnd}
        setDateRangeEnd={setDateRangeEnd}
        hasResumeFilter={hasResumeFilter}
        setHasResumeFilter={setHasResumeFilter}
        inPipelineFilter={inPipelineFilter}
        setInPipelineFilter={setInPipelineFilter}
        activeQuickFilter={activeQuickFilter}
        handleQuickFilter={handleQuickFilter}
        clearAllFilters={clearAllFilters}
        activeFilterCount={activeFilterCount}
      />

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
              <div>{candidate.location || 'N/A'}</div>
              <div>{candidate.phone || 'N/A'}</div>
              <div>
                {candidate.resume_url ? (
                  <a 
                    href="#"
                    className="btn-link" 
                    onClick={(e) => handleResumeClick(e, candidate.resume_url, candidate.name)}
                  >
                    View
                  </a>
                ) : (
                  'N/A'
                )}
              </div>
              
              <div className="actions-cell">
                <button 
                  className="btn-edit" 
                  onClick={(e) => { e.stopPropagation(); handleEdit(candidate); }}
                >
                  Edit
                </button>
                <button 
                  className="btn-add-pipeline" 
                  onClick={(e) => { e.stopPropagation(); openPipelineModal(candidate); }}
                >
                  Pipeline
                </button>
                <button 
                  className="btn-comments" 
                  onClick={(e) => { e.stopPropagation(); openCommentsModal(candidate); }}
                >
                  Comments
                </button>
                <button 
                  className="btn-delete" 
                  onClick={(e) => { e.stopPropagation(); handleDelete(candidate.id); }}
                >
                  Delete
                </button>
              </div>
            </div>
            
            {expandedRow === candidate.id && (
              <div className="expanded-details">
                <p><strong>Email:</strong> {candidate.email || 'N/A'}</p>
                <p><strong>Notes:</strong> {candidate.notes || 'No notes available.'}</p>
              </div>
            )}
          </React.Fragment>
        ))}
      </div>

      <div className="pagination-controls">
        <button onClick={goToPreviousPage} disabled={currentPage === 1} className="btn-secondary">
          Previous
        </button>
        <span className="pagination-info">
          Page {currentPage} of {totalPages}
        </span>
        <button onClick={goToNextPage} disabled={currentPage === totalPages} className="btn-secondary">
          Next
        </button>
      </div>

      {/* NEW: Word Doc Viewer Modal */}
      <WordDocViewerModal 
        isOpen={showWordDocModal}
        onClose={() => setShowWordDocModal(false)}
        resumeUrl={wordDocUrl}
        candidateName={wordDocCandidateName}
      />

      {showPipelineModal && (
        <div className="modal-overlay" onClick={closePipelineModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Add {selectedCandidate?.name} to Pipeline</h2>
            <form onSubmit={handlePipelineSubmit}>
              <div className="form-group">
                <label>Position *</label>
                <select value={pipelineData.position_id} onChange={(e) => setPipelineData({...pipelineData, position_id: e.target.value})} required>
                  <option value="">Select a position...</option>
                  {positions.map(pos => (
                    <option key={pos.id} value={pos.id}>{pos.title}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Recruiter *</label>
                <select value={pipelineData.recruiter_id} onChange={(e) => setPipelineData({...pipelineData, recruiter_id: e.target.value})} required>
                  <option value="">Select a recruiter...</option>
                  {recruiters.map(rec => (
                    <option key={rec.id} value={rec.id}>{rec.name}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Stage</label>
                <select value={pipelineData.stage} onChange={(e) => setPipelineData({...pipelineData, stage: e.target.value})}>
                  {stages.map(stage => (
                    <option key={stage} value={stage}>{stage}</option>
                  ))}
                </select>
              </div>
              <button type="submit" className="btn-primary">Add to Pipeline</button>
              <button type="button" className="btn-secondary" onClick={closePipelineModal}>Cancel</button>
            </form>
          </div>
        </div>
      )}

      {showCommentsModal && (
        <div className="modal-overlay" onClick={closeCommentsModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Comments for {selectedCandidate?.name}</h2>
            
            <form onSubmit={(e) => {
              e.preventDefault();
              const commentText = e.target.commentText.value;
              handleAddComment(commentText);
              e.target.reset();
            }}>
              <div className="form-group">
                <label>Add a Comment</label>
                <textarea name="commentText" rows="3" placeholder="Type your comment..."></textarea>
              </div>
              <button type="submit" className="btn-primary">Add Comment</button>
            </form>

            <div className="comments-list">
              {comments.length > 0 ? (
                comments.map(comment => {
                  const isOwnComment = currentUserEmail && comment.author_name === 
                    recruiters.find(r => r.email === currentUserEmail)?.name;
                  
                  return (
                    <div key={comment.id} className="comment-card">
                      {editingCommentId === comment.id ? (
                        <div>
                          <textarea 
                            value={editingCommentText}
                            onChange={(e) => setEditingCommentText(e.target.value)}
                            rows="3"
                            style={{
                              width: '100%',
                              padding: '10px',
                              background: 'var(--secondary-bg)',
                              border: '1px solid var(--border-color)',
                              borderRadius: '6px',
                              color: 'var(--text-primary)',
                              fontFamily: 'inherit'
                            }}
                          />
                          <div style={{display: 'flex', gap: '10px', marginTop: '10px'}}>
                            <button 
                              onClick={() => handleSaveEditComment(comment.id)}
                              className="btn-primary"
                              style={{padding: '6px 12px', fontSize: '12px'}}
                            >
                              Save
                            </button>
                            <button 
                              onClick={() => setEditingCommentId(null)}
                              className="btn-secondary"
                              style={{padding: '6px 12px', fontSize: '12px'}}
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div>
                          <p style={{margin: '0 0 8px 0', color: 'var(--text-primary)'}}>
                            <strong>{comment.author_name}:</strong> {comment.comment_text}
                          </p>
                          <p className="comment-date">{new Date(comment.created_at).toLocaleDateString()}</p>
                          {isOwnComment && (
                            <div style={{display: 'flex', gap: '10px', marginTop: '8px'}}>
                              <button 
                                onClick={() => handleEditComment(comment)}
                                style={{background: 'none', border: 'none', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center'}}
                                title="Edit comment"
                              >
                                <Pen size={16} color="var(--accent-blue)" />
                              </button>
                              <button 
                                onClick={() => handleDeleteComment(comment.id)}
                                style={{background: 'none', border: 'none', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center'}}
                                title="Delete comment"
                              >
                                <Trash size={16} color="var(--accent-pink)" />
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                <p>No comments yet.</p>
              )}
            </div>

            <button type="button" className="btn-secondary" onClick={closeCommentsModal}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default TalentPool;