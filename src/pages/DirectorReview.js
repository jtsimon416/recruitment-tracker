import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../services/supabaseClient';
import { useData } from '../contexts/DataContext';
import { Clock, CheckCircle, XCircle, PauseCircle, MessageSquare, AlertTriangle } from 'lucide-react'; // Added AlertTriangle
import '../styles/DirectorReview.css';

// --- Configuration ---
// Thresholds for the urgency tracker (in days)
const URGENT_THRESHOLD_DAYS = 5;
const SUPER_URGENT_THRESHOLD_DAYS = 7;
// Email of the Director (used for access control and comment author)
const DIRECTOR_EMAIL = 'brian.griffiths@brydongama.com'; 

// Specialized Quick Reply Templates
const quickReplySets = {
    HOLD: [
        "Need clarification on salary expectations; please check in with the candidate.",
        "Put on hold. Pending feedback from key stakeholders (HR/Hiring Manager).",
        "Market check required; candidate profile is excellent but compensation is a concern.",
        "Candidate is strong, but another priority search requires our full attention for now.",
        "Pause the process. I need to sync with the recruiter before advancing."
    ],
    REJECT: [
        "Not a fit for this role, but excellent for our Talent Pool/future roles.",
        "Experience gap is too wide; candidate does not meet minimum technical requirements.",
        "Feedback from the initial screening was a clear pass, moving to reject status.",
        "Candidate is a poor cultural fit for the client's team. Hard pass.",
        "Lack of clarity on career trajectory and commitment; moving to reject."
    ]
};

// --- Component: Urgency Badge ---
const UrgencyBadge = ({ dateString }) => {
    const diffTime = Math.abs(new Date() - new Date(dateString));
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    let style = "urgent-standard"; // Default style for non-urgent active review
    let text = `Updated: ${diffDays} days ago`;

    // Highlight Hold candidates based on aging logic
    if (diffDays >= SUPER_URGENT_THRESHOLD_DAYS) {
        style = "urgent-critical";
        text = `CRITICAL: ${diffDays} Days!`;
    } else if (diffDays >= URGENT_THRESHOLD_DAYS) {
        style = "urgent-warning";
        text = `Urgent: ${diffDays} days`;
    }

    return (
        <div className={`urgency-badge ${style}`}>
            <Clock size={16} className="nav-icon" />
            {text}
        </div>
    );
};

// --- Component: Decision Modal (Refactored to enforce feedback) ---
const DecisionModal = ({ pipelineEntry, comments, onClose, onFinalDecision, onEdit, onDelete }) => {
    const { user } = useData();
    const [comment, setComment] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [editingComment, setEditingComment] = useState(null);
    const [editingText, setEditingText] = useState('');

    const handleDecision = async (action, commentText) => {
        // Enforce comment for Hold and Reject, but allow empty comment for "Comment Only" on a Hold candidate
        const isHoldOrReject = action === "Hold" || action === "Reject";
        if (isHoldOrReject && !commentText.trim()) return alert(`Feedback is required to ${action} the candidate.`);
        if (action === "Comment Only" && !commentText.trim()) {
             // If they hit comment only with no text, we just close the modal and do nothing.
             onClose();
             return;
        }

        setIsSubmitting(true);
        // Call the unified handler with the action and comment
        await onFinalDecision(pipelineEntry, action, commentText);
        setIsSubmitting(false);
        onClose(); // Close after submission
    };

    const handleQuickReply = (e) => {
        const value = e.target.value;
        if (value) {
            setComment(value);
            e.target.value = ""; // Reset dropdown
        }
    };
    
    const handleEditComment = (comment) => { setEditingComment(comment); setEditingText(comment.comment_text); };
    
    const handleUpdateComment = async (e) => {
        e.preventDefault();
        if (!editingText.trim()) return;
        await onEdit(editingComment.id, editingText, pipelineEntry.candidates.id);
        setEditingComment(null); 
        setEditingText('');
    };
    
    const handleDeleteComment = (commentId) => {
        // IMPORTANT: window.confirm() must be replaced with a custom modal in production React apps.
        // Keeping it here for simplicity given the existing use of alert().
        if (window.confirm('Are you sure you want to delete this comment?')) {
            onDelete(commentId, pipelineEntry.candidates.id);
        }
    };

    const currentRecruiterName = pipelineEntry.recruiters?.name || 'Recruiter';
    
    // Filter comments: Only show comments relevant to the current decision (Hold status)
    // We filter by checking if the comment text contains "Hold" or "hold". 
    const filteredComments = pipelineEntry.status === 'Hold' 
        ? comments.filter(c => c.comment_text.toLowerCase().includes('hold') || c.comment_text.toLowerCase().includes('reject')) 
        : comments;
    
    // Feedback is MANDATORY only if the current status is not Hold (i.e., it's a new decision being made from Screening)
    const decisionFeedbackRequired = pipelineEntry.status !== 'Hold'; 
    
    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content modal-large" onClick={(e) => e.stopPropagation()}>
                <h2>Review & Decide for {pipelineEntry.candidates?.name}</h2>
                <p className="modal-candidate-info">Role: <strong>{pipelineEntry.positions.title}</strong>, Recruiter: <strong>{currentRecruiterName}</strong></p>

                <div className="comments-section">
                    
                    <div className="form-card" style={{borderLeft: '4px solid var(--accent-purple)'}}>
                        <div className="form-row">
                            <div className="form-group">
                                <label>Quick Reply: Hold Reasons</label>
                                <select onChange={handleQuickReply} defaultValue="">
                                    <option value="" disabled>Select a Hold reason...</option>
                                    {quickReplySets.HOLD.map((reply, index) => (
                                        <option key={`hold-${index}`} value={reply}>{reply.substring(0, 50)}...</option>
                                    ))}
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Quick Reply: Reject Reasons</label>
                                <select onChange={handleQuickReply} defaultValue="">
                                    <option value="" disabled>Select a Reject reason...</option>
                                    {quickReplySets.REJECT.map((reply, index) => (
                                        <option key={`reject-${index}`} value={reply}>{reply.substring(0, 50)}...</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="form-group">
                            <label>Director's Feedback/Decision Notes {decisionFeedbackRequired ? '*' : '(Optional for Hold status)'}</label>
                            <textarea
                                rows="5"
                                value={comment}
                                onChange={(e) => setComment(e.target.value)}
                                placeholder="Enter your decision feedback here. This will be sent to the recruiter."
                                required={decisionFeedbackRequired}
                                disabled={isSubmitting}
                                id="decision-notes-textarea"
                            />
                        </div>

                        <div className="decision-buttons-grid">
                            <button
                                type="button"
                                onClick={() => handleDecision("Hold", comment)}
                                className="decision-btn btn-hold"
                                disabled={isSubmitting || (decisionFeedbackRequired && !comment.trim())}
                            >
                                <PauseCircle size={18} /> Hold & Notify
                            </button>
                            <button
                                type="button"
                                onClick={() => handleDecision("Reject", comment)}
                                className="decision-btn btn-reject"
                                disabled={isSubmitting || (decisionFeedbackRequired && !comment.trim())}
                            >
                                <XCircle size={18} /> Reject & Notify
                            </button>
                            <button
                                type="button"
                                onClick={() => handleDecision("Comment Only", comment)}
                                className="decision-btn btn-comment-only"
                                disabled={isSubmitting || !comment.trim()}
                            >
                                <MessageSquare size={18} /> Just Save Comment
                            </button>
                        </div>
                        <div className="modal-actions" style={{justifyContent: 'flex-start', marginTop: '15px'}}>
                            <button type="button" className="btn-secondary" onClick={onClose} disabled={isSubmitting}>
                                Close Window
                            </button>
                        </div>
                    </div>

                    <div className="comments-list">
                        <h3>Comment History ({filteredComments.length})</h3>
                        {filteredComments.length === 0 ? (<p className="empty-comments">No relevant comments yet.</p>) : (
                            filteredComments.map(comment => (
                                <div key={comment.id} className="comment-item">
                                    {editingComment?.id === comment.id ? (
                                        <form onSubmit={handleUpdateComment} className="comment-edit-form">
                                            <textarea value={editingText} onChange={(e) => setEditingText(e.target.value)} rows="3" />
                                            <div className="comment-edit-actions">
                                                <button type="submit" className="btn-save">Save</button>
                                                <button type="button" className="btn-cancel" onClick={() => setEditingComment(null)}>Cancel</button>
                                            </div>
                                        </form>
                                    ) : (
                                        <>
                                            <div className="comment-header">
                                                <strong>{comment.author_name}</strong>
                                                <span className="comment-date">{new Date(comment.created_at).toLocaleString()}</span>
                                            </div>
                                            <p className="comment-text">{comment.comment_text}</p>
                                            
                                            {user?.email.toLowerCase().trim() === DIRECTOR_EMAIL.toLowerCase().trim() && (
                                                <div className="comment-actions">
                                                    <button className="btn-edit" onClick={() => handleEditComment(comment)}>Edit</button>
                                                    <button className="btn-delete" onClick={() => handleDeleteComment(comment.id)}>Delete</button>
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
    );
};

// --- Component: Candidate Review Card ---
const CandidateReviewCard = ({ candidate, onAction, onDecisionModal }) => {
    
    const isHold = candidate.status === 'Hold';
    
    return (
        <div className={`candidate-card ${isHold ? 'card-on-hold' : ''}`}>
            <div>
                <div className="card-header">
                    <h3 className="card-title">{candidate.candidates?.name || 'N/A'}</h3>
                    {/* The urgency badge is now more useful for Hold candidates */}
                    <UrgencyBadge dateString={candidate.updated_at} /> 
                </div>
                
                <div className="card-info">
                    <p><strong>Role:</strong> {candidate.positions?.title || 'N/A'}</p>
                    <p><strong>Client:</strong> {candidate.positions?.clients?.company_name || 'N/A'}</p>
                    <p><strong>Recruiter:</strong> {candidate.recruiters?.name || 'N/A'}</p>
                    {/* Display status and stage */}
                    <p><strong>Current Status:</strong> <span className={`status-name status-${candidate.status.toLowerCase()}`}>{candidate.status}</span></p>
                    <p><strong>Current Stage:</strong> <span className={`stage-name status-${candidate.stage.toLowerCase().replace(/\s/g, '-')}`}>{candidate.stage}</span></p>
                </div>

                <div className="notes-box">
                    <p className="notes-title">Candidate Notes</p>
                    <p className="notes-text">{candidate.candidates?.notes || 'No detailed notes provided by recruiter.'}</p>
                </div>
            </div>

            <div className="card-actions">
                <h4 className="actions-title">Director Actions:</h4>
                <div className="decision-grid" style={{gridTemplateColumns: '1fr'}}>
                    {/* Primary Action: Approve & Submit - Only visible for Screening candidates */}
                    {candidate.stage === 'Screening' && (
                        <button
                            onClick={() => onAction(candidate, "Submit to Client")}
                            className="btn-submit"
                        >
                            <CheckCircle size={18} className="nav-icon" /> Approve & Submit
                        </button>
                    )}
                    {/* The main decision/feedback button */}
                    <button
                        onClick={() => onDecisionModal(candidate)}
                        className="btn-comment"
                    >
                        <MessageSquare size={18} className="nav-icon" /> Provide Feedback & Decide
                    </button>
                </div>
            </div>
        </div>
    );
};

// --- Main Page Component ---
function DirectorReview() {
    const { user, refreshData, createNotification } = useData();
    const [pipelineData, setPipelineData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [decisionModalOpen, setDecisionModalOpen] = useState(false); 
    const [selectedCandidate, setSelectedCandidate] = useState(null);
    const [alertMessage, setAlertMessage] = useState(null);
    const [comments, setComments] = useState([]);
    
    const [actionModal, setActionModal] = useState({ isOpen: false, candidate: null, action: null });

    const directorEmailClean = DIRECTOR_EMAIL.toLowerCase().trim();
    const userEmailClean = user?.email ? user.email.toLowerCase().trim() : null;
    const isDirector = userEmailClean === directorEmailClean; 

    useEffect(() => {
        if (isDirector) { 
            fetchCandidatesForReview();
        } else {
            setLoading(false); 
        }
    }, [isDirector]);

    async function fetchCandidatesForReview() {
        setLoading(true);
        // Fetch candidates that are in 'Screening' stage OR have 'Hold' status.
        // We ensure that anyone marked 'Reject' or 'Submit to Client' is excluded from this list.
        const { data, error } = await supabase
            .from('pipeline')
            .select('*, candidates(id, name, notes), positions(id, title, clients(company_name)), recruiters(id, name, email)')
            .or('stage.eq.Screening,status.eq.Hold')
            .not('status', 'eq', 'Reject') 
            .not('stage', 'eq', 'Submit to Client') 
            .order('updated_at', { ascending: true }); 

        if (error) {
            console.error('Error fetching director review data:', error);
            showAlert(`Error loading candidates: ${error.message}`);
        } else {
            setPipelineData(data || []);
        }
        setLoading(false);
    }
    
    const candidatesForReview = useMemo(() => {
        // Core filtering logic to ensure no duplication:
        
        // 1. Get all candidates explicitly placed on Hold.
        const onHold = pipelineData.filter(p => p.status === 'Hold');
        
        // 2. Get all Screening candidates who are NOT already On Hold.
        const screening = pipelineData.filter(p => 
            p.stage === 'Screening' && p.status !== 'Hold'
        );
        
        return {
            screening: screening,
            onHold: onHold,
        };
    }, [pipelineData]);
    
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

    const showAlert = (message) => {
        setAlertMessage(message);
        setTimeout(() => setAlertMessage(null), 4000);
    };

    const handleOpenActionModal = (candidate, action) => {
        setSelectedCandidate(candidate); 
        setActionModal({ isOpen: true, candidate, action });
    };

    const processAction = async (candidate, action, sendNotification) => {
        setActionModal({ isOpen: false, candidate: null, action: null }); 
        let newStage = candidate.stage;
        let newStatus = candidate.status;
        let notificationType;
        let notificationMessage;

        if (action === "Submit to Client") {
            newStage = "Submit to Client";
            newStatus = "Active";
            notificationType = 'stage_change';
            notificationMessage = `Director moved **${candidate.candidates.name}** to **Submit to Client** for ${candidate.positions.title}. Proceed with client submission.`;
        } else {
            return;
        }

        setLoading(true);
        
        const { error: updateError } = await supabase
            .from('pipeline')
            .update({ 
                stage: newStage, 
                status: newStatus,
                updated_at: new Date().toISOString()
            })
            .eq('id', candidate.id);

        if (updateError) {
            showAlert(`Error updating status: ${updateError.message}`);
        } else {
            if (sendNotification) {
                await createNotification({ 
                    type: notificationType, 
                    message: notificationMessage, 
                    recipient: candidate.recruiters.email 
                });
                showAlert(`${candidate.candidates.name} updated to ${action}. Recruiter notified.`);
            } else {
                showAlert(`${candidate.candidates.name} updated to ${action} without email notification.`);
            }

            refreshData(); 
            fetchCandidatesForReview(); 
        }
        setLoading(false);
    };

    const handleFinalDecision = async (pipelineEntry, action, comment) => {
        const authorName = user?.email || 'Director';
        let newStage = pipelineEntry.stage;
        let newStatus = pipelineEntry.status;
        let notificationType = 'new_comment';
        let notificationMessage = `${authorName} left a comment for ${pipelineEntry.candidates.name} (Role: ${pipelineEntry.positions.title}): "${comment.substring(0, 50)}..."`;
        
        const isHold = action === "Hold";
        const isReject = action === "Reject";
        const isCommentOnly = action === "Comment Only";

        if (isHold) {
            newStatus = "Hold";
            // If currently not on hold and is in Screening, move to Hold status.
            if (pipelineEntry.stage === 'Screening') {
                newStage = 'Screening'; // Keep stage at screening
            }
            notificationType = 'status_change';
            notificationMessage = `Director put **${pipelineEntry.candidates.name}** on **Hold** for ${pipelineEntry.positions.title}. Feedback: "${comment.substring(0, 50)}..."`;
        } else if (isReject) {
            newStatus = "Reject";
            if (pipelineEntry.stage === 'Screening') newStage = 'Reject';
            notificationType = 'status_change';
            notificationMessage = `Director **Rejected** **${pipelineEntry.candidates.name}** for ${pipelineEntry.positions.title}. Feedback: "${comment.substring(0, 50)}..."`;
        } else if (isCommentOnly && !comment.trim()) {
             // Already handled in the modal, but good for safety
             showAlert(`Comment was empty, no action taken.`);
             return;
        }

        setLoading(true);
        
        // 1. Save the comment first, mandatory for Hold/Reject/Comment-Only
        const { error: commentError } = await supabase.from('comments').insert([{
            candidate_id: pipelineEntry.candidates.id,
            author_name: authorName,
            comment_text: comment
        }]);

        if (commentError) {
            showAlert(`Error adding comment: ${commentError.message}`);
            setLoading(false);
            return;
        }
        
        // 2. If it's Hold or Reject, update the pipeline status/stage
        if (isHold || isReject) {
            const { error: updateError } = await supabase
                .from('pipeline')
                .update({ 
                    stage: newStage, 
                    status: newStatus,
                    updated_at: new Date().toISOString()
                })
                .eq('id', pipelineEntry.id);

            if (updateError) {
                showAlert(`Error updating status: ${updateError.message}`);
                setLoading(false);
                return;
            }
        }
        
        // 3. Send notification (only if a real action was taken, or if it was a comment-only with content)
        if (comment.trim()) {
            await createNotification({ 
                type: notificationType, 
                message: notificationMessage, 
                recipient: pipelineEntry.recruiters.email 
            });
        }
        
        const statusText = isHold ? 'On Hold' : isReject ? 'Rejected' : isCommentOnly ? 'Comment Saved' : 'Action Complete';
        showAlert(`${pipelineEntry.candidates.name} is now ${statusText}. Recruiter notified.`);
        
        refreshData(); 
        fetchCandidatesForReview(); 
        setLoading(false);
    };


    const handleOpenDecisionModal = async (candidate) => {
        setSelectedCandidate(candidate);
        await fetchComments(candidate.candidates.id); 
        setDecisionModalOpen(true);
    };
    
    const handleUpdateComment = async (commentId, newText, candidateId) => {
        const { error } = await supabase.from('comments').update({ comment_text: newText }).eq('id', commentId);
        if (error) {
            showAlert('Error updating comment: ' + error.message);
        } else {
            await fetchComments(candidateId);
            showAlert('Comment updated successfully.');
        }
    };
    
    const handleDeleteComment = async (commentId, candidateId) => {
        // IMPORTANT: window.confirm() must be replaced with a custom modal in production React apps.
        // Keeping it here for simplicity given the existing use of alert().
        if (window.confirm('Are you sure you want to delete this comment?')) {
            const { error } = await supabase.from('comments').delete().eq('id', commentId);
            if (error) {
                showAlert('Error deleting comment: ' + error.message);
            } else {
                await fetchComments(candidateId);
                showAlert('Comment deleted successfully.');
            }
        }
    };


    // --- Nested Component: Action Confirmation Modal (for Submit only) ---
    const ActionModal = ({ isOpen, candidate, action }) => {
        if (!isOpen || !candidate || action !== 'Submit to Client') return null;
        
        const candidateName = candidate.candidates?.name;
        const recruiterName = candidate.recruiters?.name || 'N/A';
        const positionTitle = candidate.positions?.title || 'N/A';
        
        const messageHTML = `You are about to move <strong>${candidateName}</strong> to the <strong>Submit to Client</strong> stage for the ${positionTitle} role.`;
        
        return (
            <div className="modal-overlay" onClick={() => setActionModal({ isOpen: false, candidate: null, action: null })}>
                <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                    <h2>Confirm Action</h2>
                    <p className="modal-candidate-info" dangerouslySetInnerHTML={{ __html: messageHTML }} />
                    <p className="modal-candidate-info">Would you like to send an email notification to the Recruiter: <strong>{recruiterName}</strong>?</p>
                    
                    <div className="modal-actions decision-buttons-grid" style={{ justifyContent: 'center', gridTemplateColumns: '1fr 1fr', padding: '0 0 20px 0', borderTop: 'none' }}>
                        <button 
                            className="btn-secondary" 
                            onClick={() => processAction(candidate, action, false)}
                        >
                            No Email, Just Update
                        </button>
                        <button 
                            className="btn-primary" 
                            onClick={() => processAction(candidate, action, true)}
                        >
                            Yes, Send Email & Update
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    
    if (loading) {
        return <div className="loading-state">Loading Director Review...</div>;
    }

    if (!isDirector) {
        return <div className="page-container"><div className="empty-state"><h3>Access Denied</h3><p>This portal is restricted to the Director account.</p></div></div>;
    }

    return (
        <div className="page-container director-review-page">
            <div className="page-header">
                <h1>Director Review Portal</h1>
            </div>

            <p className="sub-header-text">
                This portal surfaces candidates for your review, organized by status to help you prioritize actions.
            </p>

            {alertMessage && (
                <div className="notification-alert">
                    {alertMessage}
                </div>
            )}
            
            {/* 2. SCREENING Section (Requires immediate review - MOVED TO TOP) */}
            <div className="review-section">
                <div className="section-header">
                    <h2><AlertTriangle size={24} className="icon-screening" /> Candidates Awaiting Screening Review</h2>
                    <span className="candidate-count count-screening">{candidatesForReview.screening.length}</span>
                </div>
                {candidatesForReview.screening.length === 0 ? (
                    <div className="empty-section-state">
                        <p>No new candidates awaiting screening approval.</p>
                    </div>
                ) : (
                    <div className="review-grid">
                        {candidatesForReview.screening.map(candidate => (
                            <CandidateReviewCard
                                key={candidate.id}
                                candidate={candidate}
                                onAction={handleOpenActionModal}
                                onDecisionModal={handleOpenDecisionModal}
                            />
                        ))}
                    </div>
                )}
            </div>
            
            {/* 1. ON HOLD Section (MOVED BELOW SCREENING) */}
            <div className="review-section">
                <div className="section-header">
                    <h2><PauseCircle size={24} className="icon-hold" /> Candidates On Hold</h2>
                    <span className="candidate-count count-hold">{candidatesForReview.onHold.length}</span>
                </div>
                {candidatesForReview.onHold.length === 0 ? (
                    <div className="empty-section-state">
                        <p>No candidates are currently on hold.</p>
                    </div>
                ) : (
                    <div className="review-grid">
                        {candidatesForReview.onHold.map(candidate => (
                            <CandidateReviewCard
                                key={candidate.id}
                                candidate={candidate}
                                onAction={handleOpenActionModal}
                                onDecisionModal={handleOpenDecisionModal}
                            />
                        ))}
                    </div>
                )}
            </div>

            
            {/* ACTION CONFIRMATION MODAL (for Submit only) */}
            {actionModal.isOpen && (
                <ActionModal
                    isOpen={actionModal.isOpen}
                    candidate={actionModal.candidate}
                    action={actionModal.action}
                />
            )}

            {/* Decision Modal (for Hold, Reject, and Comment) */}
            {decisionModalOpen && selectedCandidate && (
                <DecisionModal
                    pipelineEntry={selectedCandidate}
                    comments={comments}
                    onClose={() => setDecisionModalOpen(false)}
                    onFinalDecision={handleFinalDecision}
                    onEdit={handleUpdateComment}
                    onDelete={handleDeleteComment}
                />
            )}
        </div>
    );
}

export default DirectorReview;
