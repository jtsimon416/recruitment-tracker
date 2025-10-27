import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabaseClient';
import { useData } from '../contexts/DataContext';
import { useConfirmation } from '../contexts/ConfirmationContext';
import { FaFileAlt, FaExclamationCircle, FaLightbulb } from 'react-icons/fa'; // Removed FaUserTie
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, Check, X, Archive, Send, MessageSquare, ExternalLink, ChevronDown, ChevronUp, Edit, Trash2 } from 'lucide-react';
import '../styles/DirectorReview.css';

// --- CommentsModal Component ---
// Receives state and handlers from DirectorReview
const CommentsModal = ({
    pipelineEntry,
    comments, // New comment text state { [pipelineEntry.id]: "text" }
    handleCommentChange, // Function to update ^
    handleFinalDecision,
    onClose,
    userProfile,
    // Edit/Delete state and handlers passed down
    editingComment,
    setEditingComment,
    editingText,
    setEditingText,
    handleUpdateComment, // Function defined in parent
    handleDeleteComment, // Function defined in parent
    fetchCandidatesForReview // Pass this down for refresh
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

                    {/* New Comment Input */}
                    <div className="form-group">
                      <label htmlFor="decision-comments">Your Decision & Comment</label>
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
// Holds the state and logic for edit/delete/alerts
function DirectorReview() {
    const { user, userProfile, refreshData, createNotification } = useData();
    // --- State definitions moved here ---
    const [candidatesForReview, setCandidatesForReview] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [comments, setComments] = useState({}); // State for NEW comments
    const [showAlert, setShowAlert] = useState(false); // For simple alerts
    const [alertMessage, setAlertMessage] = useState(""); // Alert text
    const [alertType, setAlertType] = useState("success"); // Alert type (success, error, warning, info)
    const [showCommentsModal, setShowCommentsModal] = useState(false);
    const [selectedCandidateForComments, setSelectedCandidateForComments] = useState(null);
    const [editingComment, setEditingComment] = useState(null); // State for the comment being edited
    const [editingText, setEditingText] = useState(''); // State for the text during edit
    // --- End state definitions ---

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
        const candidateIdForUpdate = editingComment.candidate_id; // Need this for refresh
        const originalText = editingComment.comment_text; // Store original text

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

    // Separate lists based on fetched data
    const screeningQueue = candidatesForReview.filter(p => p.stage === 'Screening' && p.status !== 'Hold');
    const holdQueue = candidatesForReview.filter(p => p.status === 'Hold');

    // --- NEW: Calculate candidates for aging warnings ---
    const candidatesWithDays = candidatesForReview.map(p => ({
        ...p,
        daysInStage: calculateDaysInStage(p.created_at)
    }));

    const redWarningCandidates = candidatesWithDays.filter(p => p.daysInStage > 5);
    const yellowWarningCandidates = candidatesWithDays.filter(p => p.daysInStage > 3 && p.daysInStage <= 5);

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

    // Main component render
    return (
        <div className="director-review-container">
            {/* Alert message display */}
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

            <div className="page-header"> <h1>Director Review Queue</h1> </div>
            
            {/* --- NEW: Conditional Rendering for Aging Warning Boxes --- */}
            {redWarningCandidates.length > 0 ? (
                <AgingWarningBox level="red" candidates={redWarningCandidates} />
            ) : yellowWarningCandidates.length > 0 ? (
                <AgingWarningBox level="yellow" candidates={yellowWarningCandidates} />
            ) : null}

            <ReviewHeader />
            <div className="review-section"> <h2><Check size={28} /> Screening Queue ({screeningQueue.length})</h2> {renderCandidateList(screeningQueue, "Screening Queue")} </div>
            <div className="review-section"> <h2><Archive size={28} /> Hold Queue ({holdQueue.length})</h2> {renderCandidateList(holdQueue, "Hold Queue")} </div>

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
                        // Pass ALL edit/delete state and handlers
                        editingComment={editingComment}
                        setEditingComment={setEditingComment}
                        editingText={editingText}
                        setEditingText={setEditingText}
                        handleUpdateComment={handleUpdateComment} 
                        handleDeleteComment={handleDeleteComment} 
                        fetchCandidatesForReview={fetchCandidatesForReview}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}

export default DirectorReview;