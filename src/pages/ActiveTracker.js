import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../services/supabaseClient';
import { useData } from '../contexts/DataContext';
import { useLocation, useNavigate } from 'react-router-dom';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
// Imports removed for lazy loading
import { STAGES, STATUSES, PIPELINE_STAGES_ORDER, PIPELINE_STATUSES_LIST } from '../constants/pipeline';
import { ChevronUp, ChevronDown, Eye, FileText, Sparkles, AlertCircle, Video, VideoOff, MessageSquare, Calendar, Trash2, Filter } from 'lucide-react';
import { useConfirmation } from '../contexts/ConfirmationContext';
import PageTransition from '../components/PageTransition';
import WordDocViewerModal from '../components/Worddocviewermodal';
import InteractiveFunnelHeader from '../components/InteractiveFunnelHeader'; // NEW IMPORT
import AiAnalysisSidebar from '../components/AiAnalysisSidebar'; // ADDED
import CandidatePreviewCard from '../components/CandidatePreviewCard'; // ADDED
import '../styles/ActiveTracker.css';
import '../styles/ActiveTrackerFilters.css';

// --- COMPONENT: Info Sidebar for Candidate Details ---
const InfoSidebar = ({ candidate, pipelineEntry, onClose }) => {
  const [convertedNotesHtml, setConvertedNotesHtml] = useState(null);

  useEffect(() => {
    const convertDocxToHtml = async () => {
      if (candidate?.notes) {
        let mammoth;
        try {
          mammoth = await import('mammoth');
        } catch (error) {
          console.error("Failed to load mammoth", error);
          return;
        }
        try {
          // If candidate.notes is a URL to a .docx file:
          if (candidate.notes.endsWith('.docx')) {
            const response = await fetch(candidate.notes);
            const arrayBuffer = await response.arrayBuffer();
            const result = await mammoth.convertToHtml({ arrayBuffer: arrayBuffer });
            setConvertedNotesHtml(result.value);
          } else {
            // If it's plain text, format it as simple HTML.
            setConvertedNotesHtml(`<p>${candidate.notes.replace(/\n/g, '<br/>')}</p>`);
          }
        } catch (e) {
          console.error("Error converting notes:", e);
          setConvertedNotesHtml(`<p>Error displaying notes: ${e.message}</p>`);
        }
      }
    };

    convertDocxToHtml();
  }, [candidate?.notes]);

  if (!candidate) return null;

  const skillsArray = candidate.skills ? candidate.skills.split(',').map(s => s.trim()).filter(s => s) : [];

  return (
    <div className="info-sidebar-overlay" onClick={onClose}>
      <div className="info-sidebar slide-in-right" onClick={(e) => e.stopPropagation()}>
        <div className="sidebar-header-custom">
          <h2>Candidate Deep Dive</h2>
          <button onClick={onClose} className="btn-close-sidebar" type="button">&times;</button>
        </div>

        <div className="sidebar-section">
          <h3>Personal Info</h3>
          <p><strong>Name:</strong> {candidate.name}</p>
          <p><strong>Email:</strong> {candidate.email}</p>
          <p><strong>Phone:</strong> {candidate.phone || 'N/A'}</p>
          <p><strong>Location:</strong> {candidate.location || 'N/A'}</p>
          <p><strong>LinkedIn:</strong> {candidate.linkedin_url ?
            <a href={candidate.linkedin_url} target="_blank" rel="noopener noreferrer" className="btn-link">View Profile</a> : 'N/A'}
          </p>
          {pipelineEntry?.created_at && (
            <p><strong>Submitted for Screening:</strong> {new Date(pipelineEntry.created_at).toLocaleDateString()}</p>
          )}
        </div>

        <div className="sidebar-section">
          <h3>Resume Link</h3>
          {candidate.resume_url ? (
            <a href={candidate.resume_url} target="_blank" rel="noopener noreferrer" className="btn-primary" style={{ display: 'block', textAlign: 'center', margin: '15px 0' }}>
              View Original Document
            </a>
          ) : (
            <p>No original resume file link available.</p>
          )}
        </div>

        <div className="sidebar-section">
          <h3>Skills & Keywords ({skillsArray.length})</h3>
          <div className="skills-full-list">
            {skillsArray.length > 0 ?
              skillsArray.map((skill, index) => (
                <span key={index} className="skill-tag-full">{skill}</span>
              )) : <p>No skills recorded.</p>}
          </div>
        </div>

        <div className="sidebar-section">
          <h3><FileText size={16} style={{ marginRight: '8px', verticalAlign: 'text-bottom' }} />Recruiter Notes</h3>
          <div className="notes-document-container">
            {convertedNotesHtml ? (
              <div className="notes-content" dangerouslySetInnerHTML={{ __html: convertedNotesHtml }} />
            ) : (
              <p className="notes-placeholder">No detailed notes provided for this candidate.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const NotesDisplay = ({ notes }) => {
  const [convertedNotesHtml, setConvertedNotesHtml] = useState(null);

  useEffect(() => {
    const convertNotes = async () => {
      if (notes) {
        try {
          // Assuming notes is a string. If it's a URL to a .docx, it would need fetching.
          // For now, treat as plain text and wrap in <p> tags for consistent rendering.
          // If the user truly intends for mammoth to process DOCX content here,
          // the 'notes' field in the database would need to store DOCX content (e.g., base64) or a URL to a DOCX file.
          // As it stands, mammoth.convertToHtml expects an ArrayBuffer or a Buffer, not a plain string.
          // So, if 'notes' is a plain string, mammoth won't work as intended.
          // Given the previous context, it's highly likely 'notes' is plain text.
          // Therefore, we'll format it as simple HTML.
          setConvertedNotesHtml(`<p>${notes.replace(/\n/g, '<br/>')}</p>`);
        } catch (e) {
          console.error("Error converting notes for display:", e);
          setConvertedNotesHtml(`<p>Error displaying notes: ${e.message}</p>`);
        }
      } else {
        setConvertedNotesHtml(null);
      }
    };

    convertNotes();
  }, [notes]);

  if (!notes) return <p>No detailed notes provided.</p>;

  return (
    <div className="pipeline-row-notes">
      <strong>Notes:</strong>
      <div dangerouslySetInnerHTML={{ __html: convertedNotesHtml }} />
    </div>
  );

};

// Helper to get initials
const getInitials = (name) => {
  if (!name) return '';
  return name
    .split(' ')
    .map(word => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

function ActiveTracker() {
  const { showConfirmation } = useConfirmation();
  const {
    pipeline,
    setPipeline,
    positions,
    recruiters,
    loading,
    refreshData,
    newCommentCandidateIds,
    clearCommentNotifications,
    user,
    createNotification,
    isDirectorOrManager
  } = useData();
  const location = useLocation();

  const openPositions = useMemo(() => {
    return positions.filter(pos => pos.status === 'Open');
  }, [positions]);

  const navigate = useNavigate();
  const [view, setView] = useState('list');
  const [expandedCard, setExpandedCard] = useState(null);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [showCommentsModal, setShowCommentsModal] = useState(false);
  const [selectedPipelineEntry, setSelectedPipelineEntry] = useState(null);
  const [comments, setComments] = useState([]);
  const [commentData, setCommentData] = useState({ comment_text: '' });
  const [editingComment, setEditingComment] = useState(null);
  const [editingText, setEditingText] = useState('');

  const [showInfoSidebar, setShowInfoSidebar] = useState(false);
  const [sidebarCandidate, setSidebarCandidate] = useState(null);

  const [showAiAnalysisSidebar, setShowAiAnalysisSidebar] = useState(false);
  const [aiAnalysisData, setAiAnalysisData] = useState(null);
  const [aiAnalysisLoading, setAiAnalysisLoading] = useState(false);
  const [highlightedCandidateIds, setHighlightedCandidateIds] = useState([]);

  // NEW: Word Doc Viewer Modal State
  const [showWordDocModal, setShowWordDocModal] = useState(false);
  const [wordDocUrl, setWordDocUrl] = useState('');
  const [wordDocCandidateName, setWordDocCandidateName] = useState('');

  const [notificationModal, setNotificationModal] = useState({ isOpen: false, type: null, data: null });
  const [selectedPosition, setSelectedPosition] = useState('all');
  const [selectedRecruiter, setSelectedRecruiter] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState(STATUSES.ACTIVE);
  const [selectedStage, setSelectedStage] = useState('all');
  const [sortConfig, setSortConfig] = useState({ key: 'candidates.name', direction: 'ascending' });

  const [pendingMove, setPendingMove] = useState(null);
  const [isCompactMode, setIsCompactMode] = useState(false); // NEW: Compact Mode State
  const [isFocusMode, setIsFocusMode] = useState(false); // NEW: Focus Mode State

  // DIRECTOR_EMAIL constant removed
  // stages and statuses arrays moved to constants/pipeline.js

  const stageOrder = {
    [STAGES.SCREENING]: 1,
    [STAGES.SUBMIT_TO_CLIENT]: 2,
    [STAGES.INTERVIEW_1]: 3,
    [STAGES.INTERVIEW_2]: 4,
    [STAGES.INTERVIEW_3]: 5,
    [STAGES.OFFER]: 6,
    [STAGES.HIRED]: 7
  };

  useEffect(() => {
    if (location.state?.candidateId && location.state?.positionId) {
      const matchingEntry = pipeline.find(
        entry => entry.candidate_id === location.state.candidateId && entry.position_id === location.state.positionId
      );
      if (matchingEntry) {
        setExpandedCard(matchingEntry.id);
        // Also open the InfoSidebar to "view" the candidate
        setSidebarCandidate(matchingEntry);
        setShowInfoSidebar(true);
        // Clear state to prevent reopening on refresh
        window.history.replaceState({}, document.title);
      }
    }
  }, [location.state, pipeline]);

  useEffect(() => {
    if (pendingMove) {
      const { pipelineId, newStage, oldStage, pipelineItem } = pendingMove;
      const isDirector = isDirectorOrManager;

      if (isDirector) {
        setNotificationModal({
          isOpen: true,
          type: 'stage_change',
          data: {
            pipelineId,
            newStage,
            oldStage,
            candidateName: pipelineItem.candidates?.name,
            recruiterName: pipelineItem.recruiters?.name,
            recruiterEmail: pipelineItem.recruiters?.email,
            positionTitle: pipelineItem.positions?.title
          }
        });
      } else {
        // RECRUITER MOVED CANDIDATE - NO NOTIFICATION!
        const updateAndHandle = async () => {
          const success = await updateCandidateStage(pipelineId, newStage, pipelineItem.highest_stage_reached);
          if (!success) {
            // Revert the change if it failed
            setPipeline(prevPipeline =>
              prevPipeline.map(p => (p.id === pipelineId ? { ...p, stage: oldStage } : p))
            );
          }
          // ✅ REMOVED: No notification sent to Director when recruiter moves candidate
        };
        updateAndHandle();
      }
      setPendingMove(null);
    }
  }, [pendingMove, user, pipeline, isDirectorOrManager]);

  // THIS IS THE NEW, SAFER LOGIC
  async function updateCandidateStage(id, newStage, currentHighestStage) {
    const dataToUpdate = {
      stage: newStage,
      updated_at: new Date().toISOString() // Explicitly update timestamp for "Time in Stage" calculation
    };

    // Determine new status based on newStage
    let newStatus = STATUSES.ACTIVE; // Default to Active for most stages
    if (newStage === STATUSES.REJECT) {
      newStatus = STATUSES.REJECT;
    } else if (newStage === STATUSES.HOLD) {
      newStatus = STATUSES.HOLD;
    }
    // If newStage is 'Archived', the initial filter will handle it, no need to set status here.

    dataToUpdate.status = newStatus; // Explicitly set status

    // Manual highest_stage_reached calculation removed - handled by DB trigger
    // RULE 2: If the new stage is 'Reject', 'Hold', etc. (newStageValue is 0)...
    // We do NOT update highest_stage_reached. It is "frozen" at its last known value,
    // which perfectly preserves the stage for the commission report.

    const { error } = await supabase
      .from('pipeline')
      .update(dataToUpdate)
      .eq('id', id);
    if (error) {
      console.error('Error updating stage:', error);
      showConfirmation({
        type: 'error',
        title: 'Error',
        message: `Error updating stage: ${error.message}`,
        confirmText: 'OK',
        cancelText: null,
        onConfirm: () => { }
      });
      return false;
    } else {
      await refreshData();
      return true;
    }
  }

  async function updateCandidateStatus(id, newStatus) {
    const { error } = await supabase
      .from('pipeline')
      .update({ status: newStatus })
      .eq('id', id);

    if (error) {
      console.error('Error updating status:', error);
      showConfirmation({
        type: 'error',
        title: 'Error',
        message: `Error updating status: ${error.message}`,
        confirmText: 'OK',
        cancelText: null,
        onConfirm: () => { }
      });
    } else {
      await refreshData();
    }
  }

  async function removeCandidateFromPipeline(id) {
    const { error } = await supabase
      .from('pipeline')
      .update({ stage: STAGES.ARCHIVED })
      .eq('id', id);

    if (error) {
      console.error('Error removing candidate:', error);
      showConfirmation({
        type: 'error',
        title: 'Error',
        message: `Error removing candidate: ${error.message}`,
        confirmText: 'OK',
        cancelText: null,
        onConfirm: () => { }
      });
    } else {
      await refreshData();
    }
  }

  const handleStageChange = (pipelineId, newStage) => {
    const pipelineItem = pipeline.find(p => p.id === pipelineId);
    if (!pipelineItem) return;

    const oldStage = pipelineItem.stage;
    const currentHighestStage = pipelineItem.highest_stage_reached; // Get the current highest stage

    setPipeline(prevPipeline =>
      prevPipeline.map(p => (p.id === pipelineId ? { ...p, stage: newStage, updated_at: new Date().toISOString() } : p))
    );

    // Pass the current highest stage into the pending move
    setPendingMove({ pipelineId, newStage, oldStage, pipelineItem, currentHighestStage });
  };

  const confirmStageChange = async () => {
    const { pipelineId, newStage, oldStage, candidateName, recruiterName, recruiterEmail, positionTitle, currentHighestStage } = notificationModal.data;
    const success = await updateCandidateStage(pipelineId, newStage, currentHighestStage);
    if (success) {
      await createNotification({
        type: 'stage_change_director',
        recipient: recruiterEmail,
        message: `Director moved ${candidateName} from "${oldStage}" to "${newStage}" for ${positionTitle}.`
      });
    } else {
      setPipeline(prevPipeline =>
        prevPipeline.map(p => (p.id === pipelineId ? { ...p, stage: oldStage } : p))
      );
    }
    setNotificationModal({ isOpen: false, type: null, data: null });
  };

  const cancelStageChange = () => {
    const { isOpen, type, data } = notificationModal;
    if (isOpen && type === 'stage_change') {
      if (data?.pipelineId && data?.oldStage) {
        setPipeline(prevPipeline =>
          prevPipeline.map(p => p.id === data.pipelineId ? { ...p, stage: data.oldStage } : p)
        );
      }
    }
    setNotificationModal({ isOpen: false, type: null, data: null });
  };

  const closeNotificationModal = () => {
    const { isOpen, type, data } = notificationModal;
    if (isOpen) {
      if (type === 'stage_change') {
        setPipeline(prevPipeline =>
          prevPipeline.map(p => (p.id === data.pipelineId ? { ...p, stage: data.oldStage } : p))
        );
      }
      setNotificationModal({ isOpen: false, type: null, data: null });
    }
  };

  const handleDragEnd = (result) => {
    const { source, destination, draggableId } = result;
    if (!destination || source.droppableId === destination.droppableId) return;

    handleStageChange(draggableId, destination.droppableId);
  };

  const handleStatusChange = (id, newStatus) => {
    setPipeline(prevPipeline =>
      prevPipeline.map(p => (p.id === id ? { ...p, status: newStatus } : p))
    );
    updateCandidateStatus(id, newStatus);
  };

  const handleScheduleInterview = (candidateId, candidateName, positionId, positionTitle) => {
    navigate('/interview-hub', {
      state: {
        fromActiveTracker: {
          candidate_id: candidateId,
          candidate_name: candidateName,
          position_id: positionId,
          position_title: positionTitle,
          isScheduling: true, // Flag to auto-open modal
        },
      },
    });
  };
  const handleRemove = (id, candidateName, positionTitle) => {
    showConfirmation({
      type: 'delete',
      title: 'Remove Candidate?',
      message: `Are you sure you want to remove ${candidateName || 'this candidate'} from the "${positionTitle || 'this position'}"?`,
      contextInfo: 'This will move the candidate to the "Archived" stage.',
      confirmText: 'Yes, Remove',
      cancelText: 'Cancel',
      onConfirm: () => {
        removeCandidateFromPipeline(id);
      }
    });
  };

  const handleToggleVideoScreened = (item) => {
    const newStatus = !item.is_video_screened;
    const actionText = newStatus ? 'Mark as Video Screened' : 'Mark as NOT Video Screened';

    showConfirmation({
      type: newStatus ? 'confirm' : 'warning',
      title: `${actionText}?`,
      message: `Are you sure you want to ${actionText.toLowerCase()} for ${item.candidates?.name}?`,
      contextInfo: newStatus ? 'This will verify that the candidate has completed a video screening.' : 'This will remove the video screened verification.',
      confirmText: 'Yes, Update',
      cancelText: 'Cancel',
      onConfirm: async () => {
        const { error } = await supabase
          .from('pipeline')
          .update({
            is_video_screened: newStatus,
            video_screen_reason: newStatus ? null : 'Status manually reverted by user'
          })
          .eq('id', item.id);

        if (error) {
          console.error('Error updating video screen status:', error);
          // You might want to show an error toast here
        } else {
          await refreshData();
        }
      }
    });
  };

  const [sidebarPipelineEntry, setSidebarPipelineEntry] = useState(null);

  const handleOpenInfoSidebar = (candidate, pipelineItem) => {
    setSidebarCandidate(candidate);
    setSidebarPipelineEntry(pipelineItem);
    setShowInfoSidebar(true);
  };

  const handleAnalyzeFit = async (pipelineItem) => {
    // Dynamic imports
    const pdfjsLib = await import('pdfjs-dist');
    const mammoth = await import('mammoth');

    // Set worker source
    pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

    setAiAnalysisLoading(true);
    setAiAnalysisData(null);
    setShowAiAnalysisSidebar(true); // Open sidebar immediately with loading state

    try {
      // 1. Fetch Candidate Data (for resume_url)
      const { data: candidateData, error: candidateError } = await supabase
        .from('candidates')
        .select('resume_url, notes')
        .eq('id', pipelineItem.candidate_id)
        .single();

      if (candidateError) throw candidateError;
      if (!candidateData?.resume_url) throw new Error('Candidate has no resume uploaded.');

      // 2. Fetch Position Data (for job_description)
      const { data: positionData, error: positionError } = await supabase
        .from('positions')
        .select('description')
        .eq('id', pipelineItem.position_id)
        .single();

      if (positionError) throw positionError;
      if (!positionData?.description) throw new Error('Position has no job description.');

      // 3. Fetch Resume Text (using signed URL)
      const { data: signedUrlData, error: signedUrlError } = await supabase.storage
        .from('resumes') // Assuming 'resumes' is the bucket name
        .createSignedUrl(candidateData.resume_url, 60); // 60 seconds expiry

      if (signedUrlError) throw signedUrlError;

      const resumeResponse = await fetch(signedUrlData.signedUrl);
      const resumeArrayBuffer = await resumeResponse.arrayBuffer();

      let resumeText = '';
      if (candidateData.resume_url.endsWith('.pdf')) {
        const pdf = await pdfjsLib.getDocument({ data: resumeArrayBuffer }).promise;
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const text = await page.getTextContent();
          resumeText += text.items.map(item => item.str).join(' ') + '\n';
        }
      } else if (candidateData.resume_url.endsWith('.docx')) {
        const result = await mammoth.extractRawText({ arrayBuffer: resumeArrayBuffer });
        resumeText = result.value;
      } else {
        throw new Error('Unsupported resume file type.');
      }

      // 4. Call Hire Logic AI Edge Function
      const EDGE_FUNCTION_URL = `${supabase.supabaseUrl}/functions/v1/hire-logic-ai`;
      const { data: { session } } = await supabase.auth.getSession(); // Get session correctly
      const response = await fetch(EDGE_FUNCTION_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`, // Use new session object
        },
        body: JSON.stringify({
          resumeText: resumeText,
          role_id: pipelineItem.position_id,
          jobDescriptionText: positionData.description, // Use correct column name
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`AI Analysis failed: ${errorData.error || response.statusText}`);
      }

      const aiAnalysisResult = await response.json();
      setAiAnalysisData(aiAnalysisResult);

    } catch (error) {
      console.error('Hire Logic AI Analysis Error:', error);
      showConfirmation({ type: 'error', title: 'AI Analysis Failed', message: error.message });
      setAiAnalysisData({ grade: 'N/A', summary: `Error: ${error.message}` }); // Display error in sidebar
    } finally {
      setAiAnalysisLoading(false);
    }
  };

  // NEW: Handle Resume Click - PDFs open in new tab, Word docs open in modal
  const handleResumeClick = async (e, resumePath, candidateName) => {
    e.preventDefault();
    e.stopPropagation();

    if (!resumePath) {
      showConfirmation({ type: 'error', title: 'Resume Error', message: 'No resume file available.' });
      return;
    }

    try {
      const { data: signedUrlData, error: signedUrlError } = await supabase.storage
        .from('resumes')
        .createSignedUrl(resumePath, 60); // 60 seconds expiry

      if (signedUrlError) throw signedUrlError;
      const signedUrl = signedUrlData.signedUrl;

      if (resumePath.includes('.docx')) {
        // Open Word doc in modal
        setWordDocUrl(signedUrl);
        setWordDocCandidateName(candidateName);
        setShowWordDocModal(true);
      } else if (resumePath.includes('.pdf')) {
        // Open PDF in new tab
        window.open(signedUrl, '_blank');
      } else {
        showConfirmation({ type: 'error', title: 'Resume Error', message: 'Unsupported resume file type.' });
      }
    } catch (error) {
      console.error('Error generating signed URL or handling resume:', error);
      showConfirmation({ type: 'error', title: 'Resume Error', message: `Failed to open resume: ${error.message}` });
    }
  };

  const openCommentsModal = async (pipelineEntry) => {
    setSelectedPipelineEntry(pipelineEntry);
    setShowCommentsModal(true);
    await fetchComments(pipelineEntry.candidate_id);
    clearCommentNotifications(pipelineEntry.candidate_id);
  };

  async function fetchComments(candidateId) {
    const { data, error } = await supabase
      .from('comments')
      .select(`
        id,
        candidate_id,
        comment_text,
        author_name,
        user_id,
        created_at
      `)
      .eq('candidate_id', candidateId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching comments:', error);
      setComments([]);
    } else {
      setComments(data || []);
    }
  }

  async function handleAddComment(e) {
    e.preventDefault();
    if (!commentData.comment_text.trim()) return;

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      showConfirmation({
        type: 'error',
        title: 'Error',
        message: 'You must be logged in to comment',
        confirmText: 'OK',
        cancelText: null,
        onConfirm: () => { }
      });
      return;
    }

    const { data: recruiterProfile } = await supabase
      .from('recruiters')
      .select('name')
      .eq('email', user.email)
      .single();

    let authorName;
    if (recruiterProfile?.name) {
      authorName = recruiterProfile.name;
    } else {
      const emailName = user.email.split('@')[0];
      authorName = emailName
        .split('.')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
    }

    const { error } = await supabase
      .from('comments')
      .insert([{
        candidate_id: selectedPipelineEntry.candidate_id,
        comment_text: commentData.comment_text.trim(),
        user_id: user.id,
        author_name: authorName
      }]);

    if (error) {
      console.error('Add comment error:', error);
      showConfirmation({
        type: 'error',
        title: 'Error',
        message: `Error adding comment: ${error.message}`,
        confirmText: 'OK',
        cancelText: null,
        onConfirm: () => { }
      });
    } else {
      setCommentData({ comment_text: '' });
      await fetchComments(selectedPipelineEntry.candidate_id);
    }
  }

  const handleEditComment = (comment) => {
    setEditingComment(comment);
    setEditingText(comment.comment_text);
  };

  async function handleUpdateComment(e) {
    e.preventDefault();
    if (!editingText.trim()) return;

    const { error } = await supabase
      .from('comments')
      .update({ comment_text: editingText })
      .eq('id', editingComment.id);

    if (error) {
      showConfirmation({
        type: 'error',
        title: 'Error',
        message: `Error updating comment: ${error.message}`,
        confirmText: 'OK',
        cancelText: null,
        onConfirm: () => { }
      });
    } else {
      await fetchComments(selectedPipelineEntry.candidate_id);
      setEditingComment(null);
      setEditingText('');
    }
  }

  async function handleDeleteComment(commentId) {
    showConfirmation({
      type: 'delete',
      title: 'Delete Comment?',
      message: 'This action cannot be undone. The comment will be permanently removed.',
      confirmText: 'Delete',
      cancelText: 'Keep',
      onConfirm: async () => {
        const { error } = await supabase
          .from('comments')
          .delete()
          .eq('id', commentId);

        if (error) {
          showConfirmation({
            type: 'error',
            title: 'Error',
            message: `Error deleting comment: ${error.message}`,
            confirmText: 'OK',
            cancelText: null,
            onConfirm: () => { }
          });
        } else {
          await fetchComments(selectedPipelineEntry.candidate_id);
        }
      }
    });
  }

  const getStatusClass = (item) => {
    const rawStatus = (item.status || 'Active');
    const cleanedStatus = rawStatus.replace(/^'(.*)'$/, '$1'); // Strip quotes
    const status = cleanedStatus.toLowerCase(); // Then convert to lowercase

    // If the status is 'active', return 'status-active'
    if (status === 'active') {
      return 'status-active';
    }
    // For other statuses (hold, reject), return status-hold, status-reject
    return `status-${status}`;
  };



  const baseFilteredPipeline = useMemo(() => {
    let filtered = pipeline.filter(item => item.positions?.status === 'Open' && item.stage !== STAGES.ARCHIVED);

    if (selectedPosition !== 'all') {
      filtered = filtered.filter(item => item.position_id === selectedPosition);
    }

    if (selectedRecruiter !== 'all') {
      filtered = filtered.filter(item => item.recruiter_id === selectedRecruiter);
    }

    if (selectedStatus !== 'all') {
      filtered = filtered.filter(item => {
        // Always exclude archived candidates
        if (item.stage === STAGES.ARCHIVED) return false;

        const itemStatus = (item.status || STATUSES.ACTIVE)
          .replace(/^'(.*)'$/, '$1') // Remove leading/trailing single quotes
          .toLowerCase();
        const filterStatus = selectedStatus.toLowerCase();

        return itemStatus === filterStatus;
      });
    }

    // Apply stage filter ONLY if selectedStatus is NOT 'Active' or if selectedStage is 'all'
    // This ensures that if 'Active' status is chosen, stage doesn't override it.
    // REMOVED: Stage filtering is now done separately to allow the Funnel to see all stages.
    // if (selectedStage !== 'all' && selectedStatus.toLowerCase() !== 'active') {
    //   filtered = filtered.filter(item => item.stage === selectedStage);
    // }

    const sorted = [...filtered].sort((a, b) => {
      let aValue, bValue;

      if (sortConfig.key === 'candidates.name') {
        aValue = a.candidates?.name || '';
        bValue = b.candidates?.name || '';
      } else if (sortConfig.key === 'recruiters.name') {
        aValue = a.recruiters?.name || '';
        bValue = b.recruiters?.name || '';
      } else {
        aValue = a[sortConfig.key] || '';
        bValue = b[sortConfig.key] || '';
      }

      if (aValue < bValue) return sortConfig.direction === 'ascending' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'ascending' ? 1 : -1;
      return 0;
    });

    return sorted;
  }, [pipeline, selectedPosition, selectedRecruiter, selectedStatus, sortConfig]); // Removed selectedStage dependency

  // NEW: Apply Stage Filter separately for the Views
  const filteredAndSortedPipeline = useMemo(() => {
    if (selectedStage === 'all') {
      return baseFilteredPipeline;
    }
    return baseFilteredPipeline.filter(item => item.stage === selectedStage);
  }, [baseFilteredPipeline, selectedStage]);

  const requestSort = (key) => {
    let direction = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  const getSortIndicator = (key) => {
    if (sortConfig.key !== key) return null;
    return sortConfig.direction === 'ascending' ? ' ↑' : ' ↓';
  };

  const groupedByPosition = useMemo(() => {
    const grouped = {};
    filteredAndSortedPipeline.forEach(item => {
      const posTitle = item.positions?.title || 'Unknown Position';
      if (!grouped[posTitle]) grouped[posTitle] = [];
      grouped[posTitle].push(item);
    });
    return grouped;
  }, [filteredAndSortedPipeline]);

  const urgentCandidates = useMemo(() => {
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

    return pipeline.filter(item =>
      item.stage === 'Screening' &&
      new Date(item.created_at) < threeDaysAgo
    );
  }, [pipeline]);

  const renderListView = () => {
    return (
      <div className="list-view">
        {!loading && filteredAndSortedPipeline.length === 0 ? (
          <div className="empty-state"><h3>No matching pipeline entries</h3><p>Adjust your filters or add candidates to get started.</p></div>
        ) : !loading && (
          Object.keys(groupedByPosition).map(posTitle => (
            <div key={posTitle} className="position-section">
              <h2 className="position-section-title">{posTitle}</h2>
              <div className="pipeline-table">
                <div className="pipeline-header">
                  <div onClick={() => requestSort('candidates.name')}>Candidate{getSortIndicator('candidates.name')}</div>
                  <div onClick={() => requestSort('recruiters.name')}>Recruiter{getSortIndicator('recruiters.name')}</div>
                  <div>Phone</div>
                  <div onClick={() => requestSort('status')}>Status{getSortIndicator('status')}</div>
                  <div onClick={() => requestSort('stage')}>Stage{getSortIndicator('stage')}</div>
                  <div>Actions</div>
                </div>
                {groupedByPosition[posTitle].map(item => (
                  <React.Fragment key={item.id}>
                    <div className={`pipeline-row ${getStatusClass(item)} ${newCommentCandidateIds.includes(item.candidate_id) ? 'has-new-comment' : ''} ${highlightedCandidateIds.includes(item.id) ? 'highlighted-card' : ''} ${isFocusMode && expandedCard === item.id ? 'focused' : ''}`} onClick={() => setExpandedCard(expandedCard === item.id ? null : item.id)}>
                      <div className="candidate-name-cell">
                        <div className="candidate-name-and-icons">
                          <CandidatePreviewCard candidate={item.candidates} source="pipeline" pipelineData={item}>
                            <strong>{item.candidates?.name}</strong>
                          </CandidatePreviewCard>
                          <div className="candidate-icons">
                            <Eye
                              size={18}
                              className="icon-view-details"
                              onClick={(e) => { e.stopPropagation(); handleOpenInfoSidebar(item.candidates, item); }}
                              title="View Full Details"
                            />
                            {item.candidates?.resume_url && (
                              <a
                                href="#"
                                className="icon-view-resume"
                                onClick={(e) => handleResumeClick(e, item.candidates.resume_url, item.candidates.name)}
                                title="View Resume"
                              >
                                <FileText size={18} />
                              </a>
                            )}
                            {item.is_video_screened === true && (
                              <Video size={18} className="icon-video-screened" title="Video Screened: Yes" style={{ color: '#10b981', marginLeft: '8px', cursor: 'help' }} />
                            )}
                            {item.is_video_screened === false && (
                              <span title={`Not Video Screened: ${item.video_screen_reason || 'No reason provided'}`} style={{ cursor: 'help', display: 'inline-flex' }}>
                                <VideoOff size={18} className="icon-video-not-screened" style={{ color: '#ef4444', marginLeft: '8px' }} />
                              </span>
                            )}
                          </div>
                          {newCommentCandidateIds.includes(item.candidate_id) && <div className="indicator-dot-small" title="New feedback available"></div>}
                        </div>
                      </div>
                      <div>{item.recruiters?.name}</div>
                      <div>{item.candidates?.phone || 'N/A'}</div>
                      <div>
                        <select className="status-select" value={item.status || 'Active'} onChange={(e) => { e.stopPropagation(); handleStatusChange(item.id, e.target.value); }} onClick={(e) => e.stopPropagation()}>
                          {PIPELINE_STATUSES_LIST.map(status => <option key={status} value={status}>{status}</option>)}
                        </select>
                      </div>
                      <div>
                        <select className="stage-select" value={item.stage} onChange={(e) => { e.stopPropagation(); handleStageChange(item.id, e.target.value); }} onClick={(e) => e.stopPropagation()}>
                          {PIPELINE_STAGES_ORDER.map(stage => <option key={stage} value={stage}>{stage}</option>)}
                        </select>
                      </div>
                      <div className="actions-cell">
                        <button
                          className="btn-icon-action comments"
                          onClick={(e) => { e.stopPropagation(); openCommentsModal(item); }}
                          title="View Comments"
                        >
                          <MessageSquare size={16} />
                        </button>
                        <button
                          className="btn-icon-action schedule"
                          onClick={(e) => { e.stopPropagation(); handleScheduleInterview(item.candidates.id, item.candidates.name, item.position_id, item.positions.title); }}
                          title="Schedule Interview"
                        >
                          <Calendar size={16} />
                        </button>
                        <button
                          className="btn-icon-action analyze"
                          onClick={(e) => { e.stopPropagation(); handleAnalyzeFit(item); }}
                          title="Hire Logic AI Analysis"
                        >
                          <Sparkles size={16} />
                        </button>
                        <button
                          className={`btn-icon-action video-toggle ${item.is_video_screened ? 'screened' : ''}`}
                          onClick={(e) => { e.stopPropagation(); handleToggleVideoScreened(item); }}
                          title={item.is_video_screened ? "Mark as NOT Video Screened" : "Mark as Video Screened"}
                        >
                          {item.is_video_screened ? <Video size={16} color="#10b981" /> : <VideoOff size={16} />}
                        </button>
                        <button
                          className="btn-icon-action remove"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemove(item.id, item.candidates?.name, item.positions?.title);
                          }}
                          title="Remove Candidate"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                    {expandedCard === item.id && item.candidates?.notes && <NotesDisplay notes={item.candidates.notes} />}
                  </React.Fragment>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    );
  };

  const renderPipelineView = () => {
    return (
      <div className="pipeline-view">
        {filteredAndSortedPipeline.length === 0 && selectedStage !== 'all' ? (
          <div className="empty-state"><h3>No candidates in this stage</h3><p>Adjust your filters to see candidates.</p></div>
        ) : (
          <DragDropContext onDragEnd={handleDragEnd}>
            <div className="pipeline-columns">
              {PIPELINE_STAGES_ORDER.map(stage => {
                const stageItems = selectedStage === 'all'
                  ? filteredAndSortedPipeline.filter(item => item.stage === stage)
                  : (selectedStage === stage ? filteredAndSortedPipeline : []);

                return (
                  <Droppable key={stage} droppableId={stage}>
                    {(provided, snapshot) => (
                      <div className={`pipeline-column ${snapshot.isDraggingOver ? 'dragging-over' : ''} fade-in`} ref={provided.innerRef} {...provided.droppableProps}>
                        <div className="column-header">
                          <h3>{stage}</h3>
                          <span className="column-count">{stageItems.length}</span>
                        </div>
                        <div className="column-cards">
                          {stageItems.map((item, index) => (
                            <Draggable key={item.id} draggableId={item.id} index={index}>
                              {(provided, snapshot) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...provided.dragHandleProps}
                                  className={`pipeline-card ${snapshot.isDragging ? 'dragging' : ''} ${getStatusClass(item)} ${isCompactMode ? 'compact' : ''} ${newCommentCandidateIds.includes(item.candidate_id) ? 'has-new-comment' : ''} ${highlightedCandidateIds.includes(item.id) ? 'highlighted-card' : ''} ${isFocusMode && expandedCard === item.id ? 'focused' : ''}`}
                                  style={{
                                    ...provided.draggableProps.style,
                                    marginBottom: '10px'
                                  }}
                                  onClick={() => setExpandedCard(expandedCard === item.id ? null : item.id)}
                                >
                                  {isCompactMode ? (
                                    // COMPACT MODE CARD
                                    <CandidatePreviewCard
                                      candidate={item.candidates}
                                      source="pipeline"
                                      pipelineData={item}
                                    >
                                      <div className="compact-card-content">
                                        <div className={`status-dot ${getStatusClass(item)}`}></div>
                                        <span className="compact-name">{item.candidates?.name}</span>
                                        <div className="compact-avatar" title={item.recruiters?.name}>
                                          {getInitials(item.recruiters?.name)}
                                        </div>
                                      </div>
                                    </CandidatePreviewCard>
                                  ) : (
                                    // REGULAR MODE CARD
                                    <>
                                      <div className="card-header">
                                        <div className="card-name-row">
                                          <CandidatePreviewCard
                                            candidate={item.candidates}
                                            source="pipeline"
                                            pipelineData={item}
                                          >
                                            <h4>{item.candidates?.name}</h4>
                                          </CandidatePreviewCard>
                                          <div className="card-icons">
                                            {/* Video Screened Indicator */}
                                            <div
                                              className={`icon-video-screen ${item.is_video_screened ? 'screened' : 'not-screened'}`}
                                              title={item.is_video_screened ? "Video Screened" : (item.video_screen_reason || "Not Video Screened")}
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                handleToggleVideoScreened(item);
                                              }}
                                            >
                                              {item.is_video_screened ? <Video size={14} /> : <VideoOff size={14} />}
                                            </div>

                                            {/* AI Analysis Trigger */}
                                            <div
                                              className="icon-ai-analyze"
                                              title="Analyze Fit with AI"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                handleAnalyzeFit(item);
                                              }}
                                            >
                                              <Sparkles size={14} />
                                            </div>

                                            {/* Resume Link */}
                                            {item.candidates?.resume_url && (
                                              <div
                                                className="icon-view-details-kanban"
                                                title="View Resume"
                                                onClick={(e) => handleResumeClick(e, item.candidates.resume_url, item.candidates.name)}
                                              >
                                                <FileText size={14} />
                                              </div>
                                            )}

                                            {/* Comments Trigger */}
                                            <div
                                              className="icon-view-details-kanban"
                                              title="View Comments"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                openCommentsModal(item);
                                              }}
                                            >
                                              <MessageSquare size={14} />
                                              {newCommentCandidateIds.includes(item.candidate_id) && (
                                                <span className="notification-dot-small"></span>
                                              )}
                                            </div>
                                          </div>
                                        </div>
                                        <div className="card-position">{item.positions?.title}</div>
                                        <div className="card-recruiter">{item.recruiters?.name}</div>
                                      </div>

                                      <div className="card-body">
                                        <select
                                          className="card-status-select"
                                          value={item.status || 'Active'}
                                          onChange={(e) => handleStatusChange(item.id, e.target.value)}
                                          onClick={(e) => e.stopPropagation()}
                                        >
                                          {PIPELINE_STATUSES_LIST.map(status => (
                                            <option key={status} value={status}>{status}</option>
                                          ))}
                                        </select>
                                      </div>

                                      <div className="card-actions">
                                        <button
                                          className="btn-schedule"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleScheduleInterview(item.candidate_id, item.candidates?.name, item.position_id, item.positions?.title);
                                          }}
                                        >
                                          <Calendar size={12} /> Schedule
                                        </button>
                                        <button
                                          className="btn-remove-small"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleRemove(item.id, item.candidates?.name, item.positions?.title);
                                          }}
                                        >
                                          <Trash2 size={12} /> Remove
                                        </button>
                                      </div>
                                      {/* Submission Date Display */}
                                      <div className="card-footer-date" style={{ marginTop: '8px', fontSize: '10px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        <Calendar size={10} />
                                        <span>Submitted: {new Date(item.created_at).toLocaleDateString()}</span>
                                      </div>
                                    </>
                                  )}
                                </div>
                              )}
                            </Draggable>
                          ))}
                          {provided.placeholder}
                        </div>
                      </div>
                    )}
                  </Droppable>
                );
              })}
            </div>
          </DragDropContext>
        )}
      </div>
    );
  };

  return (
    <PageTransition isLoading={loading}>
      <div className="page-container">
        <div className="page-header">
          <div className="header-content">
            <h1>Active Tracker</h1>
          </div>
          <div className="header-actions">
            <div className="view-toggle">
              <button className={`toggle-btn ${view === 'list' ? 'active' : ''}`} onClick={() => setView('list')}>List</button>
              <button className={`toggle-btn ${view === 'pipeline' ? 'active' : ''}`} onClick={() => setView('pipeline')}>Pipeline</button>
            </div>
          </div>
        </div>

        {urgentCandidates.length > 0 && (
          <div className="header-alert">
            <div className="alert-content">
              <AlertCircle size={20} className="alert-icon" />
              <div className="alert-text">
                <strong>{urgentCandidates.length} Urgent Candidate{urgentCandidates.length !== 1 ? 's' : ''}:</strong>
                <span className="urgent-names"> {urgentCandidates.map(c => c.candidates?.name).join(', ')}</span>
                <div className="alert-subtext">In Screening for &gt; 3 days</div>
              </div>
            </div>
            <button
              className="btn-primary btn-sm"
              onClick={() => {
                // Highlight urgent candidates
                const urgentIds = urgentCandidates.map(c => c.id);
                setHighlightedCandidateIds(urgentIds);

                // Clear highlight after 5 seconds
                setTimeout(() => setHighlightedCandidateIds([]), 5000);

                setView('list');
              }}
            >
              View Urgent
            </button>
          </div>
        )}

        {/* NEW: Interactive Funnel Header */}
        <InteractiveFunnelHeader
          pipelineData={baseFilteredPipeline} // Use BASE data (unfiltered by stage) so counts show for all stages
          selectedStage={selectedStage}
          onStageSelect={setSelectedStage}
        />

        <div className="filter-section-container">
          <button
            className="filter-toggle-btn"
            onClick={() => setIsFiltersOpen(!isFiltersOpen)}
          >
            <Filter size={16} />
            <span>Filters</span>
            {isFiltersOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>

          {isFiltersOpen && (
            <div className="filter-section collapsible open">
              <div className="header-controls">
                <div className="filter-group">
                  <label>Stage</label>
                  <select className="position-filter" value={selectedStage} onChange={(e) => setSelectedStage(e.target.value)}>
                    <option value="all">All Stages</option>
                    {PIPELINE_STAGES_ORDER.map(stage => <option key={stage} value={stage}>{stage}</option>)}
                  </select>
                </div>
                <div className="filter-group">
                  <label>Position</label>
                  <select className="position-filter" value={selectedPosition} onChange={(e) => setSelectedPosition(e.target.value)}>
                    <option value="all">All Positions</option>
                    {openPositions.map(pos => <option key={pos.id} value={pos.id}>{pos.title}</option>)}
                  </select>
                </div>
                <div className="filter-group">
                  <label>Recruiter</label>
                  <select className="position-filter" value={selectedRecruiter} onChange={(e) => setSelectedRecruiter(e.target.value)}>
                    <option value="all">All Recruiters</option>
                    {recruiters.map(rec => <option key={rec.id} value={rec.id}>{rec.name}</option>)}
                  </select>
                </div>
                <div className="filter-group">
                  <label>Status</label>
                  <select className="position-filter" value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value)}>
                    <option value="all">All Statuses</option>
                    {PIPELINE_STATUSES_LIST.map(status => <option key={status} value={status}>{status}</option>)}
                  </select>
                </div>
                {/* NEW: Compact Mode Toggle */}
                <button
                  className={`toggle-btn ${isCompactMode ? 'active' : ''}`}
                  onClick={() => setIsCompactMode(!isCompactMode)}
                  style={{ width: '100%', justifyContent: 'center' }}
                >
                  {isCompactMode ? 'Expand Cards' : 'Compact Mode'}
                </button>

                {/* NEW: Focus Mode Toggle */}
                <button
                  className={`toggle-btn ${isFocusMode ? 'active' : ''}`}
                  onClick={() => setIsFocusMode(!isFocusMode)}
                  style={{ width: '100%', justifyContent: 'center', marginTop: '10px' }}
                >
                  {isFocusMode ? 'Exit Focus Mode' : 'Enter Focus Mode'}
                </button>
              </div>
            </div>
          )}
        </div>

        {view === 'list' ? renderListView() : renderPipelineView()}

        {showInfoSidebar && <InfoSidebar candidate={sidebarCandidate} pipelineEntry={sidebarPipelineEntry} onClose={() => setShowInfoSidebar(false)} />}

        <AiAnalysisSidebar
          isOpen={showAiAnalysisSidebar}
          onClose={() => setShowAiAnalysisSidebar(false)}
          data={aiAnalysisData}
          loading={aiAnalysisLoading}
        />

        {/* NEW: Word Doc Viewer Modal */}
        <WordDocViewerModal
          isOpen={showWordDocModal}
          onClose={() => setShowWordDocModal(false)}
          resumeUrl={wordDocUrl}
          candidateName={wordDocCandidateName}
        />

        {showCommentsModal && (
          <div className="modal-overlay" onClick={() => setShowCommentsModal(false)}>
            <div className="modal-content comments-modal-content" onClick={(e) => e.stopPropagation()}>
              <h2>Comments for {selectedPipelineEntry?.candidates?.name}</h2>
              <form onSubmit={handleAddComment} className="comment-form">
                <textarea value={commentData.comment_text} onChange={(e) => setCommentData({ comment_text: e.target.value })} placeholder="Add a comment..." required />
                <button type="submit" className="btn-primary">Add Comment</button>
              </form>
              <div className="comments-section">
                <h3>Comment History</h3>
                <div className="comments-list">
                  {comments.length === 0 ? (
                    <p className="empty-comments">No comments yet.</p>
                  ) : (
                    comments.map(comment => (
                      <div key={comment.id} className="comment-item">
                        {editingComment?.id === comment.id ? (
                          <form onSubmit={handleUpdateComment} className="edit-comment-form">
                            <textarea value={editingText} onChange={(e) => setEditingText(e.target.value)} required />
                            <div className="edit-comment-actions">
                              <button type="submit" className="btn-primary">Save</button>
                              <button type="button" className="btn-secondary" onClick={() => { setEditingComment(null); setEditingText(''); }}>Cancel</button>
                            </div>
                          </form>
                        ) : (
                          <>
                            <div className="comment-header">
                              <strong>{comment.author_name || 'Unknown'}</strong>
                              <span className="comment-date">{new Date(comment.created_at).toLocaleString()}</span>
                            </div>
                            <p className="comment-text">{comment.comment_text}</p>
                            {comment.user_id === user?.id && (
                              <div className="comment-actions">
                                <button onClick={() => handleEditComment(comment)} className="btn-edit-comment">Edit</button>
                                <button onClick={() => handleDeleteComment(comment.id)} className="btn-delete-comment">Delete</button>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Notification Modal */}
        {notificationModal.isOpen && notificationModal.type === 'stage_change' && (
          <div className="modal-overlay" onClick={closeNotificationModal}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <h2>Confirm Stage Change</h2>
              <p><strong>{notificationModal.data.candidateName}</strong> was moved from <strong>{notificationModal.data.oldStage}</strong> to <strong>{notificationModal.data.newStage}</strong> by <strong>{notificationModal.data.recruiterName}</strong> for position <strong>{notificationModal.data.positionTitle}</strong>.</p>
              <p>Do you approve this change?</p>
              <div className="modal-actions">
                <button onClick={confirmStageChange} className="btn-primary">Approve</button>
                <button onClick={cancelStageChange} className="btn-secondary">Reject</button>
              </div>
            </div>
          </div>
        )}

      </div>
    </PageTransition>
  );
}

export default ActiveTracker;