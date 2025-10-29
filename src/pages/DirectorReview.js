import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';
import { useData } from '../contexts/DataContext';
import { useConfirmation } from '../contexts/ConfirmationContext';
import { FaFileAlt, FaExclamationCircle, FaLightbulb } from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, Check, X, Archive, Send, MessageSquare, ExternalLink, ChevronDown, ChevronUp, Edit, Trash2, TrendingUp, Clock, BarChart3, AlertCircle } from 'lucide-react';
import '../styles/DirectorReview.css';

// --- CommentsModal Component ---
const CommentsModal = ({
    pipelineEntry,
    comments,
    handleCommentChange,
    handleFinalDecision,
    onClose,
    userProfile,
    editingComment,
    setEditingComment,
    editingText,
    setEditingText,
    handleUpdateComment,
    handleDeleteComment,
    fetchCandidatesForReview,
    commentTemplates
}) => {

    // Handlers for managing the edit state *within the modal*
    const handleEditClick = (comment) => {
        setEditingComment(comment); // Tell parent which comment is being edited
        setEditingText(comment.comment_text); // Tell parent the initial text
    };

    const handleCancelEdit = () => {
        setEditingComment(null); // Tell parent to stop editing
        setEditingText(''); // Clear edit text
    };

    // Helper to call the update function passed from parent
    const submitUpdate = (e) => {
        e.preventDefault();
        handleUpdateComment(); // This triggers the function in DirectorReview
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <motion.div
              className="modal-content"
              onClick={(e) => e.stopPropagation()}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
            >
                {/* Header: Close button removed */ }
                <div className="modal-header">
                  <h2>Feedback for {pipelineEntry.candidates.name}</h2>
                </div>

                {/* Body: Contains scrollable comment history and new comment form */ }
                <div className="modal-body">
                    <div className="modal-comments-history">
                        {/* Display existing comments */}
                        {pipelineEntry.comments && pipelineEntry.comments.length > 0 ? (
                            pipelineEntry.comments.map(comment => (
                                <div key={comment.id} className="comment">
                                    {/* Edit Form (shown when editing this comment) */ }
                                    {editingComment?.id === comment.id ? (
                                        <form onSubmit={submitUpdate} className="edit-comment-form">
                                            <textarea
                                                value={editingText} // Controlled by parent state
                                                onChange={(e) => setEditingText(e.target.value)} // Update parent state
                                                required
                                                rows="3"
                                                className="edit-comment-textarea"
                                            />
                                            <div className="edit-comment-actions">
                                                <button type="submit" className="btn btn-primary btn-small">Update</button>
                                                <button type="button" className="btn btn-secondary btn-small" onClick={handleCancelEdit}>Cancel</button>
                                            </div>
                                        </form>
                                    ) : (
                                        /* Default Comment Display */
                                        <>
                                            <div className="comment-header">
                                                <p className="comment-author"><strong>{comment.author_name}:</strong></p>
                                                <small className="comment-date">{new Date(comment.created_at).toLocaleString()}</small>
                                            </div>
                                            <p className="comment-text-body">{comment.comment_text}</p>
                                            {/* Edit/Delete Icons - Only show if user owns the comment */ }
                                            {userProfile?.id === comment.user_id && (
                                                <div className="comment-actions">
                                                    <button onClick={() => handleEditClick(comment)} className="btn-icon" title="Edit Comment">
                                                        <Edit size={14} />
                                                    </button>
                                                    {/* Pass comment.id directly to parent delete handler */ }
                                                    <button onClick={() => handleDeleteComment(comment.id)} className="btn-icon" title="Delete Comment">
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>
                            ))
                        ) : <p className="no-comments-message">No comment history for this candidate.</p>}
                    </div>

                    <div className="form-group">
                      <label htmlFor="decision-comments">Your Decision & Comment</label>
                      <div className="quick-templates">
                        <label className="templates-label">Quick Templates:</label>
                        <div className="template-buttons">
                          {commentTemplates.map((template, idx) => (
                            <button
                              key={idx}
                              type="button"
                              className="template-btn"
                              onClick={() => handleCommentChange(pipelineEntry.id, template)}
                            >
                              {template}
                            </button>
                          ))}
                        </div>
                      </div>
                      <textarea
                          id="decision-comments"
                          value={comments[pipelineEntry.id] || ''}
                          onChange={e => handleCommentChange(pipelineEntry.id, e.target.value)}
                          placeholder="Provide your feedback here... (Required for Hold/Reject)"
                          rows="5"
                          className="form-textarea"
                      />
                    </div>
                </div>

                {/* Footer: Close button added, action buttons grouped */ }
                <div className="modal-footer">
                    {/* New "Close" button on the left */ }
                    <button onClick={onClose} className="btn btn-secondary btn-close-footer">
                        <X size={16} /> Close
                    </button>

                    {/* Action buttons grouped on the right */ }
                    <div className="modal-action-group">
                        {/* Text Shortened: "& Notify" removed */ }
                        <button onClick={() => handleFinalDecision(pipelineEntry, 'Hold', comments[pipelineEntry.id] || '')} className="btn btn-warning">
                          <Archive size={16} /> Hold
                        </button>
                        <button onClick={() => handleFinalDecision(pipelineEntry, 'Reject', comments[pipelineEntry.id] || '')} className="btn btn-danger">
                          <X size={16} /> Reject
                        </button>
                        <button onClick={() => handleFinalDecision(pipelineEntry, 'Submit to Client', comments[pipelineEntry.id] || '')} className="btn btn-primary">
                          <Send size={16} /> Submit to Client
                        </button>
                        <button onClick={() => handleFinalDecision(pipelineEntry, 'Comment Only', comments[pipelineEntry.id] || '')} className="btn btn-secondary">
                          <MessageSquare size={16} /> Save Comment Only
                        </button>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

// --- ReviewHeader Component --- (No Changes Needed)
const ReviewHeader = () => {
    const [isExpanded, setIsExpanded] = useState(false);
    const toggleExpand = () => setIsExpanded(!isExpanded);
    // ... (rest of ReviewHeader component is unchanged) ...
     return (
        <div className="review-header-container">
            <div className="review-header-title" onClick={toggleExpand}>
                <div className="review-header-left">
                  <FaLightbulb className="lightbulb-icon" />
                  <h3>Director Review Workflow</h3>
                </div>
                <button className="btn-toggle-panel">
                  {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </button>
            </div>
            
            <AnimatePresence>
            {isExpanded && (
                <motion.div 
                  className="review-header-content"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3, ease: 'easeInOut' }}
                >
                    <p>This dashboard is your <strong>action center</strong> for all candidates entering or needing a decision before client submission.</p>
                    <ul>
                        <li><strong>Screening Queue:</strong> Candidates submitted by Recruiters and awaiting your initial <strong>Go/No-Go</strong> decision.</li>
                        <li><strong>Hold Queue:</strong> Candidates previously marked <strong>Hold</strong> that require re-review or further action.</li>
                        <li><strong>Key Actions:</strong> Use <strong>Submit</strong> to move a candidate to the client pipeline. Use <strong>Hold/Reject</strong> <em>with a comment</em> to notify the Recruiter with feedback.</li>
                    </ul>
                </motion.div>
            )}
            </AnimatePresence>
        </div>
    );
};

// --- NEW: Aging Candidate Warning Box Component ---
const AgingWarningBox = ({ candidates, level }) => {
    const isRed = level === 'red';
    const icon = isRed ? '🚨' : '⚠️';
    const title = isRed
        ? 'Action Required: Candidates Aging (Over 5 Days)'
        : 'Action Needed Soon: Candidates Aging (3-5 Days)';

    return (
        <div className={`aging-warning-box ${level}`}>
            <div className="banner-content">
                <div className="banner-icon">{icon}</div>
                <div className="banner-message">
                    <strong>{title}</strong>
                    <span className="banner-names">
                        {candidates.map((c, index) => (
                            <span key={c.id}>
                                {c.candidates.name}
                                {index < candidates.length - 1 ? ', ' : ''}
                            </span>
                        ))}
                    </span>
                    <p className="banner-note">
                        {isRed
                            ? 'These candidates have been waiting over 5 days. Please review and take action immediately.'
                            : 'These candidates are approaching the 5-day mark. Consider reviewing them soon.'}
                    </p>
                </div>
            </div>
        </div>
    );
};


// --- Main DirectorReview Component ---
function DirectorReview() {
    const { user, userProfile, createNotification } = useData();
    const [candidatesForReview, setCandidatesForReview] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [comments, setComments] = useState({});
    const [showAlert, setShowAlert] = useState(false);
    const [alertMessage, setAlertMessage] = useState("");
    const [alertType, setAlertType] = useState("success");
    const [showCommentsModal, setShowCommentsModal] = useState(false);
    const [selectedCandidateForComments, setSelectedCandidateForComments] = useState(null);
    const [editingComment, setEditingComment] = useState(null);
    const [editingText, setEditingText] = useState('');
    const [activeTab, setActiveTab] = useState('needs-review');

    const { showConfirmation } = useConfirmation(); // For confirmation popups

    // --- displayAlert function using the state ---
    const displayAlert = (message, type = "success") => {
        setAlertMessage(message);
        setAlertType(type);
        setShowAlert(true);
        // Automatically hide after 4 seconds
        setTimeout(() => setShowAlert(false), 4000);
    };

    // Fetch candidates function (now also handles sorting comments)
    const fetchCandidatesForReview = async (isInitialLoad = false) => {
        if (isInitialLoad) setLoading(true); // Only show full loading on initial mount
        try {
            const { data: pipelineData, error: pipelineError } = await supabase
                .from('pipeline')
                .select(`id, candidates ( id, name, email, phone, resume_url, linkedin_url, document_type, comments ( id, comment_text, author_name, created_at, user_id ) ), positions ( id, title, client_id, clients ( company_name ) ), recruiters ( id, name, email ), stage, status, created_at`)
                .or('stage.eq.Screening,status.eq.Hold')
                .order('created_at', { ascending: false });

            if (pipelineError) throw pipelineError;

            // Sort comments within each candidate object DESCENDING (newest first)
            const finalData = pipelineData.map(p => ({
                ...p,
                // Ensure comments is always an array before sorting
                comments: (p.candidates?.comments || []).sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
            }));

            setCandidatesForReview(finalData);
            setError(null);
        } catch (err) {
            console.error("Error fetching candidates:", err);
            setError(err.message);
            setCandidatesForReview([]); // Clear data on error to avoid stale display
            displayAlert(`Error loading review queue: ${err.message}`, 'error');
        } finally {
             if (isInitialLoad) setLoading(false); // Turn off loading after initial fetch
        }
    };

    // Initial data load on component mount
    useEffect(() => {
        fetchCandidatesForReview(true); // Pass true for initial load
    }, []);

    // Handles changes in the NEW comment text area
    const handleCommentChange = (id, text) => setComments(prev => ({ ...prev, [id]: text }));

    // --- Edit/Delete Logic Handlers Now Defined Here ---
    const handleUpdateComment = async () => {
        if (!editingComment || !editingText.trim()) return;
        const commentIdToUpdate = editingComment.id;
        const candidateIdForUpdate = editingComment.candidate_id;

        // Clear editing state immediately for better UX
        setEditingComment(null);
        setEditingText('');

        const { error } = await supabase
            .from('comments')
            .update({ comment_text: editingText })
            .eq('id', commentIdToUpdate);

        if (error) {
            displayAlert(`Error updating comment: ${error.message}`, 'error');
            // No automatic revert needed as fetch will correct it, or could add revert logic
            await fetchCandidatesForReview(); // Fetch to get correct state on error
        } else {
            displayAlert('Comment updated successfully.', 'success');
            // Refresh candidate data to show the update definitively
            await fetchCandidatesForReview();
             // Ensure the modal also shows the latest data if still open
            if (selectedCandidateForComments?.candidates.id === candidateIdForUpdate) {
                const updatedSelected = candidatesForReview.find(p => p.candidates.id === candidateIdForUpdate);
                if (updatedSelected) {
                     setSelectedCandidateForComments(updatedSelected);
                }
            }
        }
    };

    const handleDeleteComment = (commentId) => {
        showConfirmation({
            type: 'delete',
            title: 'Delete Comment?',
            message: 'Are you sure you want to permanently delete this comment?',
            onConfirm: async () => {
                 let candidateIdForUpdate = null;
                 // Find candidateId before deleting
                 for(const p of candidatesForReview) {
                     if(p.comments.some(c => c.id === commentId)) {
                         candidateIdForUpdate = p.candidates.id;
                         break;
                     }
                 }

                const { error } = await supabase
                    .from('comments')
                    .delete()
                    .eq('id', commentId);

                if (error) {
                    displayAlert(`Error deleting comment: ${error.message}`, 'error');
                } else {
                    displayAlert('Comment deleted successfully.', 'success');
                    // Refresh data to remove the comment from UI
                    await fetchCandidatesForReview();
                     // Ensure the modal also shows the latest data if still open
                     if (selectedCandidateForComments?.candidates.id === candidateIdForUpdate) {
                        const updatedSelected = candidatesForReview.find(p => p.candidates.id === candidateIdForUpdate);
                        // If the candidate still exists after refresh, update modal state
                        if (updatedSelected) {
                             setSelectedCandidateForComments(updatedSelected);
                        } else {
                            // If the candidate somehow got removed, close modal
                            closeCommentsModal();
                        }
                    }
                }
            }
        });
    };
    // --- End Edit/Delete Logic Handlers ---


    // Handles the final decision (Approve/Reject/Hold/Comment)
    const handleFinalDecision = async (pipelineEntry, action, commentText) => {
       // ... (rest of handleFinalDecision logic, using displayAlert) ...
        console.log(`--- DR DEBUG START: user exists=${!!user}, user profile role=${userProfile?.role}, action=${action}`);
        
        if (!user) { displayAlert("User data not available.", 'error'); return; }
        const authorName = userProfile?.name || 'Director';
        let newStage = pipelineEntry.stage;
        let newStatus = pipelineEntry.status;
        const isHold = action === "Hold", isReject = action === "Reject", isSubmit = action === "Submit to Client", isCommentOnly = action === "Comment Only";

        if (!commentText.trim() && (isHold || isReject)) {
             displayAlert(`A comment is required for ${action}.`, 'warning');
             return; 
        }

        if (isHold) newStatus = "Hold";
        else if (isReject) { newStatus = "Reject"; if (pipelineEntry.stage === 'Screening') newStage = 'Reject'; }
        else if (isSubmit) { newStage = "Submitted to Client"; newStatus = "Active"; }
        else if (isCommentOnly && !commentText.trim()) {
            displayAlert(`Comment was empty, no action taken.`, 'info');
            closeCommentsModal(); 
            return;
        }

        // setLoading(true); // Optional: add modal-specific loading indicator
        const { data: { user: authUser } } = await supabase.auth.getUser();
    
        // Insert NEW comment if text exists
        if (commentText.trim()) {
            const { error: commentError } = await supabase.from('comments').insert([{ 
                candidate_id: pipelineEntry.candidates.id, 
                author_name: authorName, 
                comment_text: commentText, 
                user_id: authUser?.id 
            }]);
            if (commentError) { 
                displayAlert(`Error adding comment: ${commentError.message}`, 'error'); 
                // setLoading(false); 
                return; 
            }
        }

        // Update pipeline stage/status (unless 'Comment Only')
        if (isHold || isReject || isSubmit) {
            const { error: pipelineError } = await supabase.from('pipeline').update({ 
                stage: newStage, 
                status: newStatus, 
                updated_at: new Date().toISOString() 
            }).eq('id', pipelineEntry.id);
            if (pipelineError) { 
                displayAlert(`Error updating status: ${pipelineError.message}`, 'error'); 
                // setLoading(false); 
                return; 
            }
        }
        
        // Notification Logic (unchanged, but ensure recruiter email exists)
        if (userProfile?.role?.toLowerCase() === 'director') {
           // ... (notification logic remains the same) ...
             let shouldNotify = false, notificationMessage = '', notificationType = 'status_change';
            
            if ((isHold || isReject) && commentText.trim()) {
                shouldNotify = true;
                notificationMessage = `Director action on **${pipelineEntry.candidates.name}**: ${action}. Feedback: "${commentText.substring(0, 50)}..."`;
            } else if (isSubmit) {
                shouldNotify = true;
                notificationMessage = `Director moved **${pipelineEntry.candidates.name}** to **Submit to Client** for ${pipelineEntry.positions.title}.`;
            } else if (isCommentOnly && commentText.trim()) {
                shouldNotify = true;
                notificationType = 'new_comment';
                notificationMessage = `Director added a comment on **${pipelineEntry.candidates.name}** for ${pipelineEntry.positions.title}: "${commentText.substring(0, 50)}..."`;
            }
            
            console.log(`--- DR DEBUG: shouldNotify=${shouldNotify}, action=${action}, comment.trim()=${commentText.trim() !== ''}, message length=${notificationMessage.length}, recipient=${pipelineEntry.recruiters?.email}`);
            
            if (shouldNotify && pipelineEntry.recruiters?.email) {
                await createNotification({ 
                    type: notificationType, 
                    message: notificationMessage, 
                    recipient: pipelineEntry.recruiters.email 
                });
            } else if (shouldNotify && !pipelineEntry.recruiters?.email) {
                console.warn(`Notification not sent for ${pipelineEntry.candidates.name}: Recruiter email missing.`);
                displayAlert(`Status updated, but could not notify recruiter (email missing).`, 'warning');
            }
        }
        
        // Success feedback and cleanup
        displayAlert(`${pipelineEntry.candidates.name} has been updated.`, 'success');
        setComments(prev => ({ ...prev, [pipelineEntry.id]: '' })); // Clear NEW comment input
        // await refreshData(); // Maybe not needed if fetchCandidatesForReview is sufficient
        await fetchCandidatesForReview(); // Re-fetch to update lists
        // setLoading(false);
        closeCommentsModal();
    };
    
    // Open modal function (ensures comments are sorted)
    const openCommentsModal = (p) => {
        const sortedCandidate = {
             ...p,
             // Ensure comments is always an array and sort it
             comments: (p.comments || []).sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
         };
        setSelectedCandidateForComments(sortedCandidate);
        setEditingComment(null); // Reset edit state
        setEditingText('');
        setShowCommentsModal(true);
    };
    // Close modal function
    const closeCommentsModal = () => {
        setSelectedCandidateForComments(null);
        setEditingComment(null); // Reset edit state
        setEditingText('');
        setShowCommentsModal(false);
    };

    // Calculate days helper
    const calculateDaysInStage = (dateString) => {
       // ... (unchanged) ...
        if (!dateString) return 0; 
        const stageDate = new Date(dateString);
        const now = new Date();
        const diffTime = Math.abs(now - stageDate);
        return Math.floor(diffTime / (1000 * 60 * 60 * 24));
    };

    // Calculate all candidate metrics
    const needsReviewQueue = candidatesForReview.filter(p => p.stage === 'Screening' && p.status !== 'Hold').sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    const onHoldQueue = candidatesForReview.filter(p => p.status === 'Hold').sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

    // Recent decisions (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [recentDecisions, setRecentDecisions] = useState([]);

    useEffect(() => {
        const fetchRecentDecisions = async () => {
            const { data, error } = await supabase
                .from('pipeline')
                .select(`id, candidates ( name ), positions ( title, clients ( company_name ) ), stage, status, updated_at`)
                .or('stage.eq.Submitted to Client,stage.eq.Reject')
                .gte('updated_at', thirtyDaysAgo.toISOString())
                .order('updated_at', { ascending: false })
                .limit(50);
            if (!error && data) setRecentDecisions(data);
        };
        if (activeTab === 'recent-decisions') fetchRecentDecisions();
    }, [activeTab]);

    const candidatesWithDays = candidatesForReview.map(p => ({
        ...p,
        daysInStage: calculateDaysInStage(p.created_at)
    }));

    const urgentCandidates = candidatesWithDays.filter(p => p.daysInStage > 3);
    const redWarningCandidates = candidatesWithDays.filter(p => p.daysInStage > 5);
    const yellowWarningCandidates = candidatesWithDays.filter(p => p.daysInStage > 3 && p.daysInStage <= 5);

    // Calculate stats
    const totalReviewed = recentDecisions.length;
    const approvedCount = recentDecisions.filter(p => p.stage === 'Submitted to Client').length;
    const rejectedCount = recentDecisions.filter(p => p.stage === 'Reject').length;
    const approvalRate = totalReviewed > 0 ? ((approvedCount / totalReviewed) * 100).toFixed(1) : 0;
    const avgReviewTime = candidatesWithDays.length > 0 ? (candidatesWithDays.reduce((sum, c) => sum + c.daysInStage, 0) / candidatesWithDays.length).toFixed(1) : 0;

    // Quick comment templates
    const commentTemplates = [
        "Needs more relevant experience in core technology stack",
        "Salary expectations exceed budget range",
        "Location requirements don't align with position",
        "Qualifications don't match minimum requirements",
        "Strong candidate - moving forward to client",
        "Need additional information before decision"
    ];

    // Loading and Error States
    if (loading) return <div className="loading-state">Loading reviews...</div>;
    if (error) return <div className="error-state">Error loading reviews: {error}</div>;

    // Helper to render the candidate list
    const renderCandidateList = (list, queueName) => {
       // ... (unchanged, using safe access) ...
         if (list.length === 0) {
            return <div className="no-candidates-message">No candidates currently in the {queueName}.</div>;
        }
        return (
            <div className="candidate-list">
                {list.map(p => {
                    const daysInStage = calculateDaysInStage(p.created_at);
                    const isAging = daysInStage > 3;
                    const candidateName = p.candidates?.name || 'Unknown Candidate';
                    const linkedinUrl = p.candidates?.linkedin_url;
                    const resumeUrl = p.candidates?.resume_url;
                    const positionTitle = p.positions?.title || 'Unknown Position';
                    const clientName = p.positions?.clients?.company_name || 'N/A';
                    const recruiterName = p.recruiters?.name || 'N/A';
                    const submittedDate = p.created_at ? new Date(p.created_at).toLocaleDateString() : 'N/A';

                    return (
                        <div key={p.id} className={`candidate-card ${isAging ? 'card-aging' : ''}`}>
                            <div className="card-info-item candidate-name-group">
                                <div className="info-value">{candidateName}</div>
                                <div className="name-icons">
                                    {linkedinUrl && ( <a href={linkedinUrl} target="_blank" rel="noopener noreferrer" className="icon-btn" title="LinkedIn Profile"><ExternalLink size={14} /></a> )}
                                    {resumeUrl && ( <a href={resumeUrl} target="_blank" rel="noopener noreferrer" className="icon-btn" title="View Resume"><FaFileAlt size={14} /></a> )}
                                </div>
                            </div>
                            <div className="card-info-item"> <span className="info-label">Position</span> <span className="info-value">{positionTitle}</span> </div>
                            <div className="card-info-item"> <span className="info-label">Client</span> <span className="info-value">{clientName}</span> </div>
                            <div className="card-info-item"> <span className="info-label">Recruiter</span> <span className="info-value">{recruiterName}</span> </div>
                            <div className="card-info-item"> <span className="info-label">Submitted</span> <span className="info-value">{submittedDate}</span> </div>
                            <div className="card-info-item"> <span className="info-label">Days in Stage</span> <span className="info-value">{daysInStage}</span> </div>
                            <div className="card-actions">
                                {isAging && <FaExclamationCircle className="aging-warning-icon" title={`In stage for ${daysInStage} days`} />}
                                <button className="btn btn-secondary" onClick={() => openCommentsModal(p)}> <Eye size={16} /> Review </button>
                            </div>
                        </div>
                    );
                })}
            </div>
        );
    };

    const renderTabContent = () => {
        switch(activeTab) {
            case 'needs-review':
                return (
                    <div className="tab-content">
                        {redWarningCandidates.length > 0 && <AgingWarningBox level="red" candidates={redWarningCandidates} />}
                        {yellowWarningCandidates.length > 0 && redWarningCandidates.length === 0 && <AgingWarningBox level="yellow" candidates={yellowWarningCandidates} />}
                        <div className="review-section">
                            <div className="section-header">
                                <h2><Check size={24} /> Awaiting Your Review</h2>
                                <p className="section-subtitle">Candidates sorted by oldest submission first</p>
                            </div>
                            {renderCandidateList(needsReviewQueue, "Needs Review")}
                        </div>
                    </div>
                );
            case 'on-hold':
                return (
                    <div className="tab-content">
                        <div className="review-section">
                            <div className="section-header">
                                <h2><Archive size={24} /> On Hold</h2>
                                <p className="section-subtitle">Candidates you've placed on hold with feedback</p>
                            </div>
                            {renderCandidateList(onHoldQueue, "On Hold")}
                        </div>
                    </div>
                );
            case 'recent-decisions':
                return (
                    <div className="tab-content">
                        <div className="review-section">
                            <div className="section-header">
                                <h2><Clock size={24} /> Recent Decisions</h2>
                                <p className="section-subtitle">Your decisions from the last 30 days</p>
                            </div>
                            {recentDecisions.length === 0 ? (
                                <div className="no-candidates-message">No recent decisions in the last 30 days.</div>
                            ) : (
                                <div className="decisions-list">
                                    {recentDecisions.map(p => (
                                        <div key={p.id} className={`decision-card ${p.stage === 'Submitted to Client' ? 'approved' : 'rejected'}`}>
                                            <div className="decision-info">
                                                <div className="decision-name">{p.candidates?.name || 'Unknown'}</div>
                                                <div className="decision-position">{p.positions?.title || 'Unknown Position'} • {p.positions?.clients?.company_name || 'N/A'}</div>
                                            </div>
                                            <div className="decision-status">
                                                <span className={`status-badge ${p.stage === 'Submitted to Client' ? 'approved' : 'rejected'}`}>
                                                    {p.stage === 'Submitted to Client' ? <Check size={14} /> : <X size={14} />}
                                                    {p.stage === 'Submitted to Client' ? 'Approved' : 'Rejected'}
                                                </span>
                                                <div className="decision-date">{new Date(p.updated_at).toLocaleDateString()}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                );
            case 'my-stats':
                return (
                    <div className="tab-content">
                        <div className="stats-dashboard">
                            <div className="stats-grid">
                                <div className="stat-card">
                                    <div className="stat-icon" style={{background: 'linear-gradient(135deg, #7aa2f7, #6a91e7)'}}>
                                        <BarChart3 size={24} />
                                    </div>
                                    <div className="stat-content">
                                        <div className="stat-label">Total Reviewed (30d)</div>
                                        <div className="stat-value">{totalReviewed}</div>
                                    </div>
                                </div>
                                <div className="stat-card">
                                    <div className="stat-icon" style={{background: 'linear-gradient(135deg, #9ece6a, #8ebe5a)'}}>
                                        <Check size={24} />
                                    </div>
                                    <div className="stat-content">
                                        <div className="stat-label">Approval Rate</div>
                                        <div className="stat-value">{approvalRate}%</div>
                                        <div className="stat-detail">{approvedCount} approved</div>
                                    </div>
                                </div>
                                <div className="stat-card">
                                    <div className="stat-icon" style={{background: 'linear-gradient(135deg, #f7768e, #e7667e)'}}>
                                        <X size={24} />
                                    </div>
                                    <div className="stat-content">
                                        <div className="stat-label">Rejection Rate</div>
                                        <div className="stat-value">{totalReviewed > 0 ? ((rejectedCount / totalReviewed) * 100).toFixed(1) : 0}%</div>
                                        <div className="stat-detail">{rejectedCount} rejected</div>
                                    </div>
                                </div>
                                <div className="stat-card">
                                    <div className="stat-icon" style={{background: 'linear-gradient(135deg, #ebbcba, #dba89a)'}}>
                                        <Clock size={24} />
                                    </div>
                                    <div className="stat-content">
                                        <div className="stat-label">Avg Review Time</div>
                                        <div className="stat-value">{avgReviewTime} days</div>
                                    </div>
                                </div>
                                <div className="stat-card">
                                    <div className="stat-icon" style={{background: 'linear-gradient(135deg, #ff9e64, #ef8e54)'}}>
                                        <AlertCircle size={24} />
                                    </div>
                                    <div className="stat-content">
                                        <div className="stat-label">Awaiting Review</div>
                                        <div className="stat-value">{needsReviewQueue.length}</div>
                                        <div className="stat-detail">{urgentCandidates.length} urgent (3+ days)</div>
                                    </div>
                                </div>
                                <div className="stat-card">
                                    <div className="stat-icon" style={{background: 'linear-gradient(135deg, #c0caf5, #b0bae5)'}}>
                                        <Archive size={24} />
                                    </div>
                                    <div className="stat-content">
                                        <div className="stat-label">On Hold</div>
                                        <div className="stat-value">{onHoldQueue.length}</div>
                                    </div>
                                </div>
                            </div>
                            {urgentCandidates.length > 0 && (
                                <div className="bottleneck-alert">
                                    <AlertCircle size={20} />
                                    <div>
                                        <strong>Bottleneck Alert:</strong> {urgentCandidates.length} candidate{urgentCandidates.length !== 1 ? 's have' : ' has'} been waiting 3+ days for your review.
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <div className="director-review-container">
            <AnimatePresence>
                {showAlert && (
                    <motion.div
                        className={`alert-message ${alertType}`}
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20, transition: { duration: 0.3 } }}
                        transition={{ duration: 0.5, ease: "easeInOut" }}
                    >
                        {alertMessage}
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="page-header">
                <div className="header-content">
                    <h1>Director Review</h1>
                    {urgentCandidates.length > 0 && (
                        <div className="header-alert">
                            <AlertCircle size={18} />
                            <span>{urgentCandidates.length} candidate{urgentCandidates.length !== 1 ? 's need' : ' needs'} attention</span>
                        </div>
                    )}
                </div>
            </div>

            <ReviewHeader />

            <div className="tabs-container">
                <div className="tabs-nav">
                    <button
                        className={`tab-button ${activeTab === 'needs-review' ? 'active' : ''}`}
                        onClick={() => setActiveTab('needs-review')}
                    >
                        <Check size={18} />
                        Needs Review
                        {needsReviewQueue.length > 0 && <span className="tab-badge">{needsReviewQueue.length}</span>}
                    </button>
                    <button
                        className={`tab-button ${activeTab === 'on-hold' ? 'active' : ''}`}
                        onClick={() => setActiveTab('on-hold')}
                    >
                        <Archive size={18} />
                        On Hold
                        {onHoldQueue.length > 0 && <span className="tab-badge">{onHoldQueue.length}</span>}
                    </button>
                    <button
                        className={`tab-button ${activeTab === 'recent-decisions' ? 'active' : ''}`}
                        onClick={() => setActiveTab('recent-decisions')}
                    >
                        <Clock size={18} />
                        Recent Decisions
                    </button>
                    <button
                        className={`tab-button ${activeTab === 'my-stats' ? 'active' : ''}`}
                        onClick={() => setActiveTab('my-stats')}
                    >
                        <TrendingUp size={18} />
                        My Stats
                    </button>
                </div>
            </div>

            {renderTabContent()}

            {/* Modal Rendering */}
            <AnimatePresence>
                {showCommentsModal && selectedCandidateForComments && (
                    <CommentsModal
                        pipelineEntry={selectedCandidateForComments}
                        comments={comments}
                        handleCommentChange={handleCommentChange}
                        handleFinalDecision={handleFinalDecision}
                        onClose={closeCommentsModal}
                        userProfile={userProfile}
                        editingComment={editingComment}
                        setEditingComment={setEditingComment}
                        editingText={editingText}
                        setEditingText={setEditingText}
                        handleUpdateComment={handleUpdateComment}
                        handleDeleteComment={handleDeleteComment}
                        fetchCandidatesForReview={fetchCandidatesForReview}
                        commentTemplates={commentTemplates}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}

export default DirectorReview;