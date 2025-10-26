import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../services/supabaseClient';
import * as mammoth from 'mammoth';
import { useLocation, useNavigate } from 'react-router-dom';
import { Pen, Trash, ChevronDown, ChevronUp, X, Filter, Clipboard } from 'lucide-react';
import { useConfirmation } from '../contexts/ConfirmationContext';
import { useData } from '../contexts/DataContext';
import WordDocViewerModal from '../components/Worddocviewermodal';
import '../styles/TalentPool.css';
import '../styles/ArchiveManagement.css';

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
  hasLinkedInProfileFilter,
  setHasLinkedInProfileFilter,
  inPipelineFilter,
  setInPipelineFilter,
  activeQuickFilter,
  handleQuickFilter,
  clearAllFilters,
  activeFilterCount
}) => {
  const handleSkillToggle = (skill) => {
    setSelectedSkills(prev => prev.includes(skill) ? prev.filter(s => s !== skill) : [...prev, skill]);
  };

  const quickFilters = [{ id: 'addedThisWeek', label: 'Added This Week' }];

  return (
    <div className="advanced-filter-panel">
      <div className="filter-panel-header" onClick={() => setExpanded(!expanded)}>
        <div className="filter-header-left">
          <Filter size={20} />
          <h3>Advanced Filters</h3>
          {activeFilterCount > 0 && <span className="filter-count-badge">{activeFilterCount}</span>}
        </div>
        <div className="filter-header-right">
          {activeFilterCount > 0 && (
            <button className="btn-clear-filters" onClick={(e) => { e.stopPropagation(); clearAllFilters(); }}>
              Clear All
            </button>
          )}
          <button className="btn-toggle-panel">
            {expanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </button>
        </div>
      </div>
      {expanded && (
        <div className="filter-panel-content-compact">
          <div className="filter-row-compact">
            <div className="filter-section" style={{ gridColumn: '1 / span 2' }}>
              <label className="filter-section-label">Search Across All Fields</label>
              <input type="text" placeholder="Search name, email, phone, notes..." className="filter-input-full" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
            <div className="filter-section">
              <label className="filter-section-label">Quick Filter</label>
              <div className="quick-filter-chips">
                {quickFilters.map(qf => (
                  <button key={qf.id} className={`quick-filter-chip ${activeQuickFilter === qf.id ? 'active' : ''}`} onClick={() => handleQuickFilter(qf.id)}>
                    {qf.label}
                    {activeQuickFilter === qf.id && <X size={14} style={{ marginLeft: '6px' }} />}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="filter-row-compact" style={{ gridTemplateColumns: '1fr' }}>
            <div className="filter-section">
              <label className="filter-section-label">Skills</label>
              <div className="skills-multiselect">
                <div className="skills-search-box">
                  <span className="search-icon">🔍</span>
                  <input type="text" className="skills-search-input" placeholder="Type to filter skills..." value={skillSearchTerm} onChange={(e) => setSkillSearchTerm(e.target.value)} />
                  {skillSearchTerm && <button className="skills-search-clear" onClick={() => setSkillSearchTerm('')}>×</button>}
                </div>
                {skillSearchTerm && <div className="skills-count-indicator">Showing {filteredSkills.length} of {uniqueSkills.length} skills</div>}
                <select className="filter-select" onChange={(e) => { if (e.target.value && !selectedSkills.includes(e.target.value)) setSelectedSkills([...selectedSkills, e.target.value]); e.target.value = ''; }} value="">
                  <option value="">Select skills to filter...</option>
                  {filteredSkills.length > 0 ? filteredSkills.map(skill => <option key={skill} value={skill} disabled={selectedSkills.includes(skill)}>{skill}</option>) : <option value="" disabled>No skills match '{skillSearchTerm}'</option>}
                </select>
                {selectedSkills.length > 0 && (
                  <div className="selected-skills-tags">
                    {selectedSkills.map(skill => (
                      <span key={skill} className="selected-skill-tag">{skill}<button onClick={() => handleSkillToggle(skill)}>×</button></span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="filter-row-compact">
            <div className="filter-section">
              <label className="filter-section-label">Location</label>
              <select className="filter-select" value={selectedLocation} onChange={(e) => setSelectedLocation(e.target.value)}>
                <option value="">All Locations</option>
                {uniqueLocations.map(loc => <option key={loc} value={loc}>{loc}</option>)}
              </select>
            </div>
            <div className="filter-section">
              <label className="filter-section-label">Date Added</label>
              <div className="date-range-inputs">
                <input type="date" className="filter-date-input" value={dateRangeStart} onChange={(e) => setDateRangeStart(e.target.value)} />
                <span className="date-separator">to</span>
                <input type="date" className="filter-date-input" value={dateRangeEnd} onChange={(e) => setDateRangeEnd(e.target.value)} />
              </div>
            </div>
            <div className="filter-section">
              <label className="filter-section-label">Additional Filters</label>
              <div className="toggle-filters">
                <label className="toggle-filter-item">
                  <input type="checkbox" checked={hasResumeFilter} onChange={(e) => setHasResumeFilter(e.target.checked)} />
                  <span className="toggle-label">Has Resume</span>
                </label>
                <label className="toggle-filter-item">
                  <input type="checkbox" checked={hasLinkedInProfileFilter} onChange={(e) => setHasLinkedInProfileFilter(e.target.checked)} />
                  <span className="toggle-label">Has LinkedIn Profile</span>
                </label>
                <label className="toggle-filter-item">
                  <input type="checkbox" checked={inPipelineFilter} onChange={(e) => setInPipelineFilter(e.target.checked)} />
                  <span className="toggle-label">Currently in Pipeline</span>
                </label>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

function TalentPool() {
  const location = useLocation();
  const navigate = useNavigate();
  const { showConfirmation } = useConfirmation();
  const { fetchAllOutreachRecords, refreshData } = useData();
  const [candidates, setCandidates] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [showPipelineModal, setShowPipelineModal] = useState(false);
  const [showCommentsModal, setShowCommentsModal] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [comments, setComments] = useState([]);
  const [expandedRow, setExpandedRow] = useState(null);
  const [positions, setPositions] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [wordDocHtml, setWordDocHtml] = useState('');

  // *** THIS IS THE FIX: Changed from 'true' to 'false' ***
  const [filterPanelExpanded, setFilterPanelExpanded] = useState(false);

  const [selectedSkills, setSelectedSkills] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState('');
  const [dateRangeStart, setDateRangeStart] = useState('');
  const [dateRangeEnd, setDateRangeEnd] = useState('');
  const [hasResumeFilter, setHasResumeFilter] = useState(false);
  const [hasLinkedInProfileFilter, setHasLinkedInProfileFilter] = useState(false);
  const [inPipelineFilter, setInPipelineFilter] = useState(false);
  const [activeQuickFilter, setActiveQuickFilter] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [pipelineCandidateIds, setPipelineCandidateIds] = useState([]);
  const [skillSearchTerm, setSkillSearchTerm] = useState('');
  const [debouncedSkillSearchTerm, setDebouncedSkillSearchTerm] = useState('');

  const [currentPage, setCurrentPage] = useState(1);
  const candidatesPerPage = 10;

  // --- NEW: SOURCING HISTORY FILTERS ---
  const [showLinkedInProfilesOnly, setShowLinkedInProfilesOnly] = useState(false);
  const [outreachRecords, setOutreachRecords] = useState([]);
  const [recruiters, setRecruiters] = useState([]);
  const [selectedSourcingPositions, setSelectedSourcingPositions] = useState([]);
  const [selectedSourcingStatuses, setSelectedSourcingStatuses] = useState([]);
  const [selectedSourcingRatings, setSelectedSourcingRatings] = useState([]);
  const [selectedSourcingRecruiters, setSelectedSourcingRecruiters] = useState([]);
  
  const [editingCandidate, setEditingCandidate] = useState(null);
  const [candidateFormData, setCandidateFormData] = useState({
    name: '',
    email: '',
    phone: '',
    location: '',
    linkedin_url: '',
    skills: [],
    notes: '',
    resume_url: '',
    document_type: 'Resume',
    created_by_recruiter: ''
  });
  
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editingCommentText, setEditingCommentText] = useState('');
  
  const [showWordDocModal, setShowWordDocModal] = useState(false);
  const [wordDocUrl, setWordDocUrl] = useState('');
  const [wordDocCandidateName, setWordDocCandidateName] = useState('');
  const [positionToAutoAdd, setPositionToAutoAdd] = useState(null);
  
  const [pipelineData, setPipelineData] = useState({
    position_id: '',
    stage: 'Screening',
    candidate_id: null,
  });

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearchTerm(searchTerm), 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSkillSearchTerm(skillSearchTerm), 200);
    return () => clearTimeout(timer);
  }, [skillSearchTerm]);

  useEffect(() => {
    if (location.state?.fromOutreach) {
      const { fromOutreach } = location.state;

      // Open the form
      setShowForm(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });

      // Pre-populate the form
      setCandidateFormData(prevData => ({
        ...prevData,
        name: fromOutreach.name || '',
        linkedin_url: fromOutreach.linkedin_url || '',
        notes: fromOutreach.notes || '',
      }));

      // Store the position_id for later
      setPositionToAutoAdd(fromOutreach.position_id);

      // Clear the state from location to prevent re-trigger
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [skillSearchTerm]);
  
  const BUCKET_NAME = 'resumes'; 
  const stages = ['Screening', 'Secondary Screening', 'Technical Interview', 'Team Interview', 'Offer', 'Hired', 'Rejected'];

  const convertWordToHtml = async (fileUrl) => {
    try {
      const response = await fetch(fileUrl);
      const arrayBuffer = await response.arrayBuffer();
      const result = await mammoth.convertToHtml({ arrayBuffer });
      setWordDocHtml(result.value);
    } catch (error) {
      console.error('Error converting Word doc:', error);
      setWordDocHtml('<p>Unable to preview Word document.</p>');
    }
  };

  useEffect(() => {
    if (candidateFormData.resume_url && candidateFormData.resume_url.endsWith('.docx')) {
      convertWordToHtml(candidateFormData.resume_url);
    } else {
      setWordDocHtml('');
    }
  }, [candidateFormData.resume_url]);

  const loadCandidates = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('candidates').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      setCandidates(data || []);
    } catch (error) {
      console.error('Error loading candidates:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadData = useCallback(async () => {
    await Promise.all([
      loadCandidates(),
      (async () => {
        const { data, error } = await supabase.from('positions').select('*').order('title');
        if (error) console.error('Error loading positions:', error); else setPositions(data || []);
      })(),
      (async () => {
        const { data, error } = await supabase.from('pipeline').select('candidate_id');
        if (error) console.error('Error loading pipeline candidates:', error); else setPipelineCandidateIds(data?.map(p => p.candidate_id) || []);
      })(),
      // NEW: Load outreach records for Smart Filters
      (async () => {
        const records = await fetchAllOutreachRecords();
        setOutreachRecords(records);
      })(),
      // NEW: Load recruiters for Smart Filters
      (async () => {
        const { data, error } = await supabase.from('recruiters').select('*').order('name');
        if (error) console.error('Error loading recruiters:', error); else setRecruiters(data || []);
      })()
    ]);
  }, [loadCandidates, fetchAllOutreachRecords]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const uniqueSkills = useMemo(() => Array.from(new Set(candidates.flatMap(c => c.skills ? c.skills.split(',').map(s => s.trim()).filter(Boolean) : []))).sort(), [candidates]);
  const uniqueLocations = useMemo(() => Array.from(new Set(candidates.map(c => c.location?.trim()).filter(Boolean))).sort(), [candidates]);
  const filteredSkills = useMemo(() => debouncedSkillSearchTerm ? uniqueSkills.filter(skill => skill.toLowerCase().includes(debouncedSkillSearchTerm.toLowerCase())) : uniqueSkills, [uniqueSkills, debouncedSkillSearchTerm]);

  const filteredCandidates = useMemo(() => {
    // STEP 1: Apply main filters first (Status, Location, Skills, etc.)
    let filtered = candidates.filter(c => {
      // Standard Filters (always apply)
      if (debouncedSearchTerm) {
        const search = debouncedSearchTerm.toLowerCase();
        if (!(c.name?.toLowerCase().includes(search) || c.email?.toLowerCase().includes(search) || c.phone?.toLowerCase().includes(search) || c.notes?.toLowerCase().includes(search))) return false;
      }
      if (selectedSkills.length > 0) {
        const candidateSkills = c.skills ? c.skills.toLowerCase().split(',').map(s => s.trim()) : [];
        if (!selectedSkills.every(skill => candidateSkills.some(cs => cs.includes(skill.toLowerCase())))) return false;
      }
      if (selectedLocation && c.location?.trim() !== selectedLocation) return false;
      if (dateRangeStart && new Date(c.created_at) < new Date(dateRangeStart)) return false;
      if (dateRangeEnd) {
        const endDate = new Date(dateRangeEnd);
        endDate.setHours(23, 59, 59, 999);
        if (new Date(c.created_at) > endDate) return false;
      }
      if (hasResumeFilter && c.document_type !== 'Resume') return false;
      if (hasLinkedInProfileFilter && c.document_type !== 'LinkedIn Profile') return false;
      if (inPipelineFilter && !pipelineCandidateIds.includes(c.id)) return false;
      return true;
    });

    // STEP 2: Apply LinkedIn Profiles Only filter + Cumulative Sourcing Smart Filters
    if (showLinkedInProfilesOnly && outreachRecords) {
      // Build candidate ID to outreach map for efficient lookups
      const candidateIdToOutreachMap = {};
      outreachRecords.forEach(outreach => {
        // Find candidate by matching linkedin_url
        const matchingCandidate = filtered.find(
          c => c.linkedin_url?.toLowerCase() === outreach.linkedin_url?.toLowerCase()
        );
        if (matchingCandidate) {
          if (!candidateIdToOutreachMap[matchingCandidate.id]) {
            candidateIdToOutreachMap[matchingCandidate.id] = [];
          }
          candidateIdToOutreachMap[matchingCandidate.id].push(outreach);
        }
      });

      // First: Filter to only show LinkedIn profiles (shell or sourced)
      filtered = filtered.filter(c => {
        const isSourced = c.profile_type === 'shell' || candidateIdToOutreachMap[c.id];
        return isSourced;
      });

      // Then: Apply cumulative sourcing smart filters
      // Filter by Position (if active)
      if (selectedSourcingPositions.length > 0) {
        const matchingCandidateIds = new Set();
        filtered.forEach(c => {
          const candidateOutreach = candidateIdToOutreachMap[c.id] || [];
          const matchesPosition = candidateOutreach.some(
            o => selectedSourcingPositions.includes(o.position_id)
          );
          if (matchesPosition) {
            matchingCandidateIds.add(c.id);
          }
        });
        filtered = filtered.filter(c => matchingCandidateIds.has(c.id));
      }

      // Filter by Last Outreach Status (if active, cumulative on filtered list)
      if (selectedSourcingStatuses.length > 0) {
        const matchingCandidateIds = new Set();
        filtered.forEach(c => {
          const candidateOutreach = candidateIdToOutreachMap[c.id] || [];
          if (candidateOutreach.length > 0) {
            // Sort by created_at descending to find the latest outreach
            const latestOutreach = [...candidateOutreach].sort(
              (a, b) => new Date(b.created_at) - new Date(a.created_at)
            )[0];
            if (latestOutreach && selectedSourcingStatuses.includes(latestOutreach.activity_status)) {
              matchingCandidateIds.add(c.id);
            }
          }
        });
        filtered = filtered.filter(c => matchingCandidateIds.has(c.id));
      }

      // Filter by Star Rating (if active, cumulative on filtered list)
      if (selectedSourcingRatings.length > 0) {
        const matchingCandidateIds = new Set();
        filtered.forEach(c => {
          const candidateOutreach = candidateIdToOutreachMap[c.id] || [];
          const meetsRating = candidateOutreach.some(o => selectedSourcingRatings.includes(o.rating));
          if (meetsRating) {
            matchingCandidateIds.add(c.id);
          }
        });
        filtered = filtered.filter(c => matchingCandidateIds.has(c.id));
      }

      // Filter by Sourced By Recruiter (if active, cumulative on filtered list)
      if (selectedSourcingRecruiters.length > 0) {
        const matchingCandidateIds = new Set();
        filtered.forEach(c => {
          const candidateOutreach = candidateIdToOutreachMap[c.id] || [];
          const matchesRecruiter = candidateOutreach.some(
            o => selectedSourcingRecruiters.includes(o.recruiter_id)
          );
          if (matchesRecruiter) {
            matchingCandidateIds.add(c.id);
          }
        });
        filtered = filtered.filter(c => matchingCandidateIds.has(c.id));
      }
    }

    return filtered;
  }, [
    candidates, debouncedSearchTerm, selectedSkills, selectedLocation, dateRangeStart, dateRangeEnd,
    hasResumeFilter, hasLinkedInProfileFilter, inPipelineFilter, pipelineCandidateIds,
    showLinkedInProfilesOnly, outreachRecords, selectedSourcingPositions, selectedSourcingStatuses,
    selectedSourcingRatings, selectedSourcingRecruiters
  ]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (debouncedSearchTerm) count++;
    if (selectedSkills.length > 0) count++;
    if (selectedLocation) count++;
    if (dateRangeStart || dateRangeEnd) count++;
    if (hasResumeFilter) count++;
    if (hasLinkedInProfileFilter) count++;
    if (inPipelineFilter) count++;
    return count;
  }, [debouncedSearchTerm, selectedSkills, selectedLocation, dateRangeStart, dateRangeEnd, hasResumeFilter, hasLinkedInProfileFilter, inPipelineFilter]);

  const clearAllFilters = useCallback(() => {
    setSearchTerm('');
    setSelectedSkills([]);
    setSkillSearchTerm('');
    setSelectedLocation('');
    setDateRangeStart('');
    setDateRangeEnd('');
    setHasResumeFilter(false);
    setHasLinkedInProfileFilter(false);
    setInPipelineFilter(false);
    setActiveQuickFilter('');
    // Clear sourcing filters
    setShowLinkedInProfilesOnly(false);
    setSelectedSourcingPositions([]);
    setSelectedSourcingStatuses([]);
    setSelectedSourcingRatings([]);
    setSelectedSourcingRecruiters([]);
  }, []);

  const handleQuickFilter = useCallback((filterType) => {
    const isDeactivating = activeQuickFilter === filterType;
    clearAllFilters();
    if (isDeactivating) return;
    
    if (filterType === 'addedThisWeek') {
      const today = new Date();
      const oneWeekAgo = new Date(today);
      oneWeekAgo.setDate(today.getDate() - 7);
      setDateRangeStart(oneWeekAgo.toISOString().split('T')[0]);
      setDateRangeEnd(today.toISOString().split('T')[0]);
      setActiveQuickFilter('addedThisWeek');
    }
  }, [clearAllFilters, activeQuickFilter]);

  const handlePasteFromClipboard = async (fieldName) => {
    try {
      const text = await navigator.clipboard.readText();

      if (fieldName === 'skills') {
        // This field expects an array.
        // Split the pasted text by commas, newlines, or bullets.
        const newTags = text
          .split(/[,\n•\-*]/) // Split by common delimiters
          .map(tag => tag.trim())
          .filter(tag => tag); // Remove empty strings

        // Update the state, merging with any existing tags
        setCandidateFormData(prevData => {
          // Ensure prevData.skills is always an array
          const existingTags = Array.isArray(prevData.skills) ? prevData.skills : [];
          // Filter out duplicates
          const uniqueNewTags = newTags.filter(tag => !existingTags.includes(tag));
          return {
            ...prevData,
            skills: [...existingTags, ...uniqueNewTags]
          };
        });

      } else {
        // This is for all other fields (name, email, notes, etc.)
        // They expect a string.
        setCandidateFormData(prevData => ({ ...prevData, [fieldName]: text }));
      }
    } catch (err) {
      console.error('Failed to read clipboard contents: ', err);
    }
  };


  async function handleFileUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    setLoading(true);
    try {
      const filePath = `${BUCKET_NAME}/${new Date().getTime()}_${file.name.replace(/\s/g, '_')}`;
      const { error } = await supabase.storage.from(BUCKET_NAME).upload(filePath, file);
      if (error) throw error;
      const { data } = supabase.storage.from(BUCKET_NAME).getPublicUrl(filePath);
      setCandidateFormData(prev => ({ ...prev, resume_url: data.publicUrl }));
      e.target.value = null;
      showConfirmation({ type: 'success', title: 'Success!', message: 'File uploaded!' });
    } catch (error) {
      showConfirmation({ type: 'error', title: 'Error', message: `Upload failed: ${error.message}` });
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
      // If upgrading from shell to full, change profile_type
      if (editingCandidate.profile_type === 'shell') {
        dataToSave.profile_type = 'full';
      }

      const { error } = await supabase.from('candidates').update(dataToSave).eq('id', editingCandidate.id);
      if (error) {
        showConfirmation({ type: 'error', title: 'Error', message: `Update failed: ${error.message}` });
      } else {
        const upgradeMessage = editingCandidate.profile_type === 'shell'
          ? 'Profile upgraded to full candidate!'
          : 'Candidate updated.';
        showConfirmation({ type: 'success', title: 'Success!', message: upgradeMessage });
        resetForm();
        await loadCandidates();
      }
      setLoading(false);
      return;
    }

    // --- NEW VALIDATION AND DUPLICATE CHECK LOGIC ---
    if (!dataToSave.email && !dataToSave.linkedin_url) {
        showConfirmation({ type: 'error', title: 'Missing Information', message: 'Please provide either an Email or a LinkedIn URL to save the candidate.' });
        setLoading(false);
        return;
    }

    if (dataToSave.email) {
      const { data: existing, error: checkError } = await supabase.from('candidates').select('name').eq('email', dataToSave.email).single();
      if (checkError && checkError.code !== 'PGRST116') {
        showConfirmation({ type: 'error', title: 'Error', message: `Could not check for duplicates: ${checkError.message}` });
        setLoading(false);
        return;
      }
      if (existing) {
        showConfirmation({ type: 'warning', title: 'Duplicate Found', message: `A candidate named "${existing.name}" with this email already exists.` });
        setLoading(false);
        return;
      }
    } else if (dataToSave.linkedin_url) {
      const { data: existing, error: checkError } = await supabase.from('candidates').select('name').eq('linkedin_url', dataToSave.linkedin_url).single();
      if (checkError && checkError.code !== 'PGRST116') {
        showConfirmation({ type: 'error', title: 'Error', message: `Could not check for duplicates: ${checkError.message}` });
        setLoading(false);
        return;
      }
      if (existing) {
        showConfirmation({ type: 'warning', title: 'Duplicate Found', message: `A candidate named "${existing.name}" with this LinkedIn profile already exists.` });
        setLoading(false);
        return;
      }
    }
    // --- END VALIDATION AND DUPLICATE CHECK LOGIC ---

    const { data: { user } } = await supabase.auth.getUser();
    let recruiterName = 'Unknown';
    if (user) {
      const { data: recruiter } = await supabase.from('recruiters').select('name').eq('email', user.email).single();
      if (recruiter) recruiterName = recruiter.name;
    }
    dataToSave.created_by_recruiter = recruiterName;
    
    const { error } = await supabase.from('candidates').insert([dataToSave]);
    if (error) {
      showConfirmation({ type: 'error', title: 'Error', message: `Save failed: ${error.message}` });
    } else {
      showConfirmation({ type: 'success', title: 'Success!', message: 'Candidate added.' });
      resetForm();
      await loadCandidates();
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
      skills: candidate.skills ? candidate.skills.split(',').map(s => s.trim()).filter(Boolean) : [],
      notes: candidate.notes || '',
      resume_url: candidate.resume_url || '',
      document_type: candidate.document_type || 'Resume',
      created_by_recruiter: candidate.created_by_recruiter || ''
    });
    setShowForm(true);
  }

  // NEW: Handle shell profile upgrade
  function handleUpgradeShell(candidate) {
    setEditingCandidate(candidate);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setCandidateFormData({
      name: candidate.name || '',
      email: candidate.email || '',
      phone: candidate.phone || '',
      location: candidate.location || '',
      linkedin_url: candidate.linkedin_url || '',
      skills: candidate.skills ? candidate.skills.split(',').map(s => s.trim()).filter(Boolean) : [],
      notes: `Upgraded from LinkedIn profile. Original sourcing history available.`,
      resume_url: candidate.resume_url || '',
      document_type: candidate.document_type || 'Resume',
      created_by_recruiter: candidate.created_by_recruiter || ''
    });
    setShowForm(true);
  }

  async function handleDelete(id) {
    showConfirmation({
      type: 'delete',
      title: 'Delete Candidate?',
      message: 'This is permanent.',
      onConfirm: async () => {
        setLoading(true);
        try {
          await supabase.from('comments').delete().eq('candidate_id', id);
          await supabase.from('pipeline').delete().eq('candidate_id', id);
          const { error } = await supabase.from('candidates').delete().eq('id', id);
          if (error) throw error;
          showConfirmation({ type: 'success', title: 'Success!', message: 'Candidate deleted.' });
          await loadCandidates();
        } catch (error) {
          showConfirmation({ type: 'error', title: 'Error', message: `Delete failed: ${error.message}` });
        } finally {
          setLoading(false);
        }
      }
    });
  }
  
  const openPipelineModal = (candidate) => {
    setSelectedCandidate(candidate);
    setPipelineData({ position_id: '', stage: 'Screening', candidate_id: candidate.id });
    setShowPipelineModal(true);
  };
  const closePipelineModal = () => setShowPipelineModal(false);

  const handlePipelineSubmit = async (e) => {
    e.preventDefault();
    if (!pipelineData.position_id) {
      showConfirmation({ type: 'error', title: 'Error', message: 'A Position is required.' });
      return;
    }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      showConfirmation({ type: 'error', title: 'Error', message: 'You must be logged in.' });
      return;
    }
    const { data: recruiter } = await supabase.from('recruiters').select('id').eq('email', user.email).single();
    if (!recruiter) {
      showConfirmation({ type: 'error', title: 'Error', message: 'Could not find your recruiter profile.' });
      return;
    }
    
    const dataToSave = { ...pipelineData, recruiter_id: recruiter.id };
    const { error } = await supabase.from('pipeline').insert([dataToSave]);
    if (error) {
      showConfirmation({ type: 'error', title: 'Error', message: `Save failed: ${error.message}` });
    } else {
      showConfirmation({ type: 'success', title: 'Success!', message: 'Added to pipeline.' });
      closePipelineModal();
      await refreshData();
    }
  };

  const openCommentsModal = async (candidate) => {
    setSelectedCandidate(candidate);
    const { data, error } = await supabase.from('comments').select('*').eq('candidate_id', candidate.id).order('created_at', { ascending: false });
    if (error) console.error('Error fetching comments:', error);
    setComments(data || []);
    setShowCommentsModal(true);
  };
  const closeCommentsModal = () => setShowCommentsModal(false);

  const handleAddComment = async (commentText) => {
      if (!commentText.trim()) return;
      const { data: { user } } = await supabase.auth.getUser();
      const { data: recruiter } = await supabase.from('recruiters').select('name').eq('email', user.email).single();
      const { error } = await supabase.from('comments').insert([{
          candidate_id: selectedCandidate.id,
          comment_text: commentText,
          author_name: recruiter?.name || user.email
      }]);
      if (error) console.error(error); else openCommentsModal(selectedCandidate);
  };

  const handleEditComment = (comment) => {
    setEditingCommentId(comment.id);
    setEditingCommentText(comment.comment_text);
  };

  const handleSaveEditComment = async (commentId) => {
    if (!editingCommentText.trim()) return;
    await supabase.from('comments').update({ comment_text: editingCommentText }).eq('id', commentId);
    setEditingCommentId(null);
    openCommentsModal(selectedCandidate);
  };

  const handleDeleteComment = (commentId) => {
    showConfirmation({
        type: 'delete',
        title: 'Delete Comment?',
        onConfirm: async () => {
            await supabase.from('comments').delete().eq('id', commentId);
            openCommentsModal(selectedCandidate);
        }
    });
  };

  const handleResumeClick = (e, candidate) => {
    e.preventDefault();
    e.stopPropagation();
    if (candidate.resume_url?.endsWith('.docx')) {
      setWordDocUrl(candidate.resume_url);
      setWordDocCandidateName(candidate.name);
      setShowWordDocModal(true);
    } else if (candidate.resume_url) {
      window.open(candidate.resume_url, '_blank');
    }
  };

  function resetForm() {
    setShowForm(false);
    setEditingCandidate(null);
    setCandidateFormData({ name: '', email: '', phone: '', location: '', linkedin_url: '', skills: [], notes: '', resume_url: '', document_type: 'Resume', created_by_recruiter: '' });
    setWordDocHtml('');
  }

  function handleOpenForm() {
    if (editingCandidate) return;
    setShowForm(true);
  }

  const totalPages = Math.ceil(filteredCandidates.length / candidatesPerPage);
  const currentCandidates = filteredCandidates.slice((currentPage - 1) * candidatesPerPage, currentPage * candidatesPerPage);
  const goToNextPage = () => setCurrentPage(prev => Math.min(prev + 1, totalPages));
  const goToPreviousPage = () => setCurrentPage(prev => Math.max(prev - 1, 1));

  const renderSplitScreenForm = () => (
    <div className="split-screen-container">
      <div className="resume-viewer-panel">
        <div className="resume-panel-header"><h3>Document Preview</h3></div>
        <div className="resume-viewer-content">
          {candidateFormData.resume_url ? (
            candidateFormData.resume_url.endsWith('.pdf') ? <embed src={candidateFormData.resume_url} type="application/pdf" className="resume-pdf-viewer" /> :
            candidateFormData.resume_url.endsWith('.docx') ? (wordDocHtml ? <div dangerouslySetInnerHTML={{ __html: wordDocHtml }} /> : <p>Converting...</p>) :
            <p>Unsupported file</p>
          ) : <div className="resume-placeholder"><p>Upload a file to preview</p></div>}
        </div>
      </div>
      <div className="form-panel">
        <h2>{editingCandidate ? `Edit: ${editingCandidate.name}` : 'Add Candidate'}</h2>
        <form onSubmit={handleManualSubmit}>
          <div className="form-row"><div className="form-group">
  <label>Full Name *</label>
  <div className="input-with-button">
    <input type="text" required value={candidateFormData.name} onChange={(e) => setCandidateFormData({...candidateFormData, name: e.target.value})} />
    <button type="button" className="btn-paste" onClick={() => handlePasteFromClipboard('name')} title="Paste from Clipboard">
      <Clipboard size={16} />
    </button>
  </div>
</div><div className="form-group">
  <label>Email</label>
  <div className="input-with-button">
    <input type="email" value={candidateFormData.email} onChange={(e) => setCandidateFormData({...candidateFormData, email: e.target.value})} />
    <button type="button" className="btn-paste" onClick={() => handlePasteFromClipboard('email')} title="Paste from Clipboard">
      <Clipboard size={16} />
    </button>
  </div>
</div></div>
          <div className="form-row"><div className="form-group">
  <label>Phone</label>
  <div className="input-with-button">
    <input type="tel" value={candidateFormData.phone} onChange={(e) => setCandidateFormData({...candidateFormData, phone: e.target.value})} />
    <button type="button" className="btn-paste" onClick={() => handlePasteFromClipboard('phone')} title="Paste from Clipboard">
      <Clipboard size={16} />
    </button>
  </div>
</div><div className="form-group">
  <label>Location</label>
  <div className="input-with-button">
    <input type="text" value={candidateFormData.location} onChange={(e) => setCandidateFormData({...candidateFormData, location: e.target.value})} />
    <button type="button" className="btn-paste" onClick={() => handlePasteFromClipboard('location')} title="Paste from Clipboard">
      <Clipboard size={16} />
    </button>
  </div>
</div></div>
          <div className="form-group">
  <label>LinkedIn URL</label>
  <div className="input-with-button">
    <input type="text" value={candidateFormData.linkedin_url} onChange={(e) => setCandidateFormData({...candidateFormData, linkedin_url: e.target.value})} />
    <button type="button" className="btn-paste" onClick={() => handlePasteFromClipboard('linkedin_url')} title="Paste from Clipboard">
      <Clipboard size={16} />
    </button>
  </div>
</div>
          <div className="form-group form-group-with-button">
  <label>
    Skills
    <button type="button" className="btn-paste-label" onClick={() => handlePasteFromClipboard('skills')} title="Paste raw text into Skills box">
      <Clipboard size={14} /> Paste
    </button>
  </label>
  <TagInput tags={candidateFormData.skills} setTags={(skills) => setCandidateFormData({...candidateFormData, skills})} />
</div>
          <div className="form-group form-group-with-button">
  <label>
    Notes / Summary
    <button type="button" className="btn-paste-label" onClick={() => handlePasteFromClipboard('notes')} title="Paste from Clipboard">
      <Clipboard size={14} /> Paste
    </button>
  </label>
  <textarea rows="4" value={candidateFormData.notes} onChange={(e) => setCandidateFormData({...candidateFormData, notes: e.target.value})} />
</div>
          <div className="form-group file-upload-section">
            <label>Document Upload</label>
            <div className="document-type-selector">
              <label><input type="radio" value="Resume" checked={candidateFormData.document_type === 'Resume'} onChange={(e) => setCandidateFormData({...candidateFormData, document_type: e.target.value})} />Resume</label>
              <label><input type="radio" value="LinkedIn Profile" checked={candidateFormData.document_type === 'LinkedIn Profile'} onChange={(e) => setCandidateFormData({...candidateFormData, document_type: e.target.value})} />LinkedIn Profile</label>
            </div>
            {candidateFormData.resume_url ? (<div className="link-status"><p>✅ File ready to save</p><button type="button" className="btn-secondary" onClick={() => setCandidateFormData(prev => ({ ...prev, resume_url: '' }))}>Change</button></div>) : <input type="file" accept=".pdf,.docx" onChange={handleFileUpload} disabled={loading} />}
          </div>
          <div className="form-submit-area"><button type="submit" className="btn-primary" disabled={loading}>{editingCandidate ? 'Update Candidate' : 'Add Candidate'}</button></div>
        </form>
      </div>
    </div>
  );

  return (
    <div className="page-container">
      <div className="page-header"><h1>Talent Pool</h1><button className="btn-primary" onClick={handleOpenForm} disabled={!!editingCandidate}>+ Add Candidate</button></div>
      {showForm && (<><div className="form-close-bar"><button className="btn-secondary" onClick={resetForm}>Cancel / Close</button></div>{renderSplitScreenForm()}</>)}
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
        hasLinkedInProfileFilter={hasLinkedInProfileFilter}
        setHasLinkedInProfileFilter={setHasLinkedInProfileFilter}
        inPipelineFilter={inPipelineFilter}
        setInPipelineFilter={setInPipelineFilter}
        activeQuickFilter={activeQuickFilter}
        handleQuickFilter={handleQuickFilter}
        clearAllFilters={clearAllFilters}
        activeFilterCount={activeFilterCount}
      />

      {/* NEW: LinkedIn Profiles Only Toggle */}
      <div className="linkedin-profiles-toggle" onClick={() => setShowLinkedInProfilesOnly(!showLinkedInProfilesOnly)}>
        <input
          type="checkbox"
          checked={showLinkedInProfilesOnly}
          onChange={(e) => setShowLinkedInProfilesOnly(e.target.checked)}
          onClick={(e) => e.stopPropagation()}
        />
        <label onClick={(e) => e.stopPropagation()}>📋 Show LinkedIn Profiles Only</label>
      </div>

      {/* NEW: Sourcing Smart Filters (only visible when toggle is ON) */}
      {showLinkedInProfilesOnly && (
        <div className="sourcing-filters-section">
          <h3 className="sourcing-filters-title">🔍 Sourcing Smart Filters</h3>

          <div className="sourcing-filters-container">
            <div className="sourcing-filter-item">
              <label>Sourced For Position</label>
              <select
                multiple
                value={selectedSourcingPositions}
                onChange={(e) => {
                  const selected = Array.from(e.target.selectedOptions).map(o => o.value);
                  setSelectedSourcingPositions(selected);
                }}
              >
                {positions.map(pos => (
                  <option key={pos.id} value={pos.id}>{pos.title}</option>
                ))}
              </select>
            </div>

            <div className="sourcing-filter-item">
              <label>Last Outreach Status</label>
              <select
                multiple
                value={selectedSourcingStatuses}
                onChange={(e) => {
                  const selected = Array.from(e.target.selectedOptions).map(o => o.value);
                  setSelectedSourcingStatuses(selected);
                }}
              >
                <option value="outreach_sent">Outreach Sent</option>
                <option value="reply_received">Reply Received</option>
                <option value="accepted">Accepted</option>
                <option value="call_scheduled">Call Scheduled</option>
                <option value="declined">Declined</option>
                <option value="ready_for_submission">Ready for Submission</option>
                <option value="gone_cold">Gone Cold</option>
              </select>
            </div>

            <div className="sourcing-filter-item">
              <label>Star Rating</label>
              <select
                multiple
                value={selectedSourcingRatings.map(r => String(r))}
                onChange={(e) => {
                  const selected = Array.from(e.target.selectedOptions).map(o => parseInt(o.value));
                  setSelectedSourcingRatings(selected);
                }}
              >
                <option value="5">5★</option>
                <option value="4">4★</option>
                <option value="3">3★</option>
                <option value="2">2★</option>
                <option value="1">1★</option>
              </select>
            </div>

            <div className="sourcing-filter-item">
              <label>Sourced By Recruiter</label>
              <select
                multiple
                value={selectedSourcingRecruiters}
                onChange={(e) => {
                  const selected = Array.from(e.target.selectedOptions).map(o => o.value);
                  setSelectedSourcingRecruiters(selected);
                }}
              >
                {recruiters.map(rec => (
                  <option key={rec.id} value={rec.id}>{rec.name}</option>
                ))}
              </select>
            </div>
          </div>

          <button
            className="btn-clear-filters"
            onClick={() => {
              setSelectedSourcingPositions([]);
              setSelectedSourcingStatuses([]);
              setSelectedSourcingRatings([]);
              setSelectedSourcingRecruiters([]);
            }}
          >
            Clear Sourcing Filters
          </button>
        </div>
      )}

      <div className="candidates-list">
        <div className="candidates-header"><div>Name & LinkedIn</div><div>Skills</div><div>Added By</div><div>Document</div><div>Actions</div></div>
        {currentCandidates.map(candidate => (
          <React.Fragment key={candidate.id}>
            <div className="candidate-row" onClick={() => setExpandedRow(expandedRow === candidate.id ? null : candidate.id)}>
              <div className="candidate-name-cell">
                {candidate.profile_type === 'shell' && (
                  <span className="shell-profile-badge">📋 LinkedIn Profile</span>
                )}
                <div className="candidate-name">{candidate.name}</div>
                {candidate.linkedin_url && <a href={candidate.linkedin_url} target="_blank" rel="noopener noreferrer" className="candidate-linkedin" onClick={(e) => e.stopPropagation()}>LinkedIn</a>}
              </div>
              <div className="skills-cell">{candidate.skills && <div className="skill-tag-container">{candidate.skills.split(',').map(s => s.trim()).filter(Boolean).slice(0, 4).map((skill, i) => <span key={i} className="skill-tag">{skill}</span>)}{candidate.skills.split(',').length > 4 && <span className="skill-extra-count">+{candidate.skills.split(',').length - 4}</span>}</div>}</div>
              <div>{candidate.created_by_recruiter || 'N/A'}</div>
              <div>{candidate.resume_url ? <button className="btn-link" onClick={(e) => handleResumeClick(e, candidate)}>{candidate.document_type || 'View'}</button> : 'N/A'}</div>
              <div className="actions-cell">
                <button className="btn-edit" onClick={(e) => { e.stopPropagation(); handleEdit(candidate); }}>Edit</button>
                <button className="btn-add-pipeline" onClick={(e) => { e.stopPropagation(); openPipelineModal(candidate); }}>Pipeline</button>
                <button className="btn-comments" onClick={(e) => { e.stopPropagation(); openCommentsModal(candidate); }}>Comments</button>
                <button className="btn-delete" onClick={(e) => { e.stopPropagation(); handleDelete(candidate.id); }}>Delete</button>
              </div>
            </div>
            {expandedRow === candidate.id && (
              <div className="expanded-details">
                {candidate.profile_type === 'shell' && (
                  <div className="shell-upgrade-banner">
                    <p>📋 This is a LinkedIn profile from past outreach. Add full details to create a complete candidate profile.</p>
                    <button className="btn-upgrade-shell" onClick={() => handleUpgradeShell(candidate)}>
                      ➕ Add Full Profile
                    </button>
                  </div>
                )}
                <p><strong>Email:</strong> {candidate.email || 'N/A'}</p>
                <p><strong>Phone:</strong> {candidate.phone || 'N/A'}</p>
                <p><strong>Location:</strong> {candidate.location || 'N/A'}</p>
                <p><strong>Notes:</strong> {candidate.notes || 'N/A'}</p>
              </div>
            )}
          </React.Fragment>
        ))}
      </div>
      <div className="pagination-controls"><button onClick={goToPreviousPage} disabled={currentPage === 1} className="btn-secondary">Previous</button><span>Page {currentPage} of {totalPages}</span><button onClick={goToNextPage} disabled={currentPage === totalPages} className="btn-secondary">Next</button></div>
      <WordDocViewerModal isOpen={showWordDocModal} onClose={() => setShowWordDocModal(false)} resumeUrl={wordDocUrl} candidateName={wordDocCandidateName} />
      {showPipelineModal && <div className="modal-overlay" onClick={closePipelineModal}><div className="modal-content" onClick={(e) => e.stopPropagation()}><h2>Add {selectedCandidate?.name} to Pipeline</h2><form onSubmit={handlePipelineSubmit}><div className="form-group"><label>Position *</label><select value={pipelineData.position_id} onChange={(e) => setPipelineData({...pipelineData, position_id: e.target.value})} required><option value="">Select...</option>{positions.map(p=><option key={p.id} value={p.id}>{p.title}</option>)}</select></div><div className="form-group"><label>Stage</label><select value={pipelineData.stage} onChange={(e) => setPipelineData({...pipelineData, stage: e.target.value})}>{stages.map(s=><option key={s} value={s}>{s}</option>)}</select></div><div className="form-actions"><button type="submit" className="btn-primary">Add to Pipeline</button><button type="button" className="btn-secondary" onClick={closePipelineModal}>Cancel</button></div></form></div></div>}
      {showCommentsModal && <div className="modal-overlay" onClick={closeCommentsModal}><div className="modal-content" onClick={(e) => e.stopPropagation()}><h2>Comments for {selectedCandidate?.name}</h2><form onSubmit={(e)=>{e.preventDefault(); handleAddComment(e.target.commentText.value); e.target.reset();}}><div className="form-group"><label>New Comment</label><textarea name="commentText" rows="3"></textarea></div><button type="submit" className="btn-primary">Add</button></form><div className="comments-list">{comments.length>0?comments.map(c=><div key={c.id} className="comment-card">{editingCommentId===c.id?(<div><textarea value={editingCommentText} onChange={e=>setEditingCommentText(e.target.value)}/><button onClick={()=>handleSaveEditComment(c.id)}>Save</button><button onClick={()=>setEditingCommentId(null)}>Cancel</button></div>):(<div><p><strong>{c.author_name}:</strong> {c.comment_text}</p><p className="comment-date">{new Date(c.created_at).toLocaleDateString()}</p><button onClick={()=>handleEditComment(c)}><Pen size={14}/></button><button onClick={()=>handleDeleteComment(c.id)}><Trash size={14}/></button></div>)}</div>):<p>No comments.</p>}</div><button type="button" className="btn-secondary" onClick={closeCommentsModal}>Close</button></div></div>}
    </div>
  );
}

export default TalentPool;