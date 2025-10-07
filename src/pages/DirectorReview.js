import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../services/supabaseClient';
import { useData } from '../contexts/DataContext';
import { Clock, CheckCircle, XCircle, PauseCircle, MessageSquare } from 'lucide-react';
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

    let style = "bg-gray-700 text-gray-400"; // Default, not urgent
    let text = `Inactive: ${diffDays} days`;

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

// --- Component: Comment Modal ---
const CommentModal = ({ pipelineEntry, comments, onClose, onCommentSubmit, onEdit, onDelete }) => {
    const { user } = useData();
    const [comment, setComment] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [editingComment, setEditingComment] = useState(null);
    const [editingText, setEditingText] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!comment.trim()) return;
        setIsSubmitting(true);
        
        await onCommentSubmit(pipelineEntry, comment);
        
        setIsSubmitting(false);
        setComment(''); // Clear the main comment box after submission
        // onClose(); // Do not close after comment, allowing for rapid feedback
    };

    const applyQuickReply = (reply) => {
        setComment(reply);
    };
    
    const handleSelectQuickReply = (e, replySet) => {
        const value = e.target.value;
        if (value) {
            applyQuickReply(value);
            e.target.value = ""; // Reset dropdown
        }
    };
    
    // Handlers for editing
    const handleEditComment = (comment) => { setEditingComment(comment); setEditingText(comment.comment_text); };
    
    const handleUpdateComment = async (e) => {
        e.preventDefault();
        if (!editingText.trim()) return;
        await onEdit(editingComment.id, editingText, pipelineEntry.candidate_id);
        setEditingComment(null); 
        setEditingText('');
    };
    
    const handleDeleteComment = (commentId) => {
        if (window.confirm('Are you sure you want to delete this comment?')) {
            onDelete(commentId, pipelineEntry.candidate_id);
        }
    };

    const currentRecruiterName = pipelineEntry.recruiters?.name || 'Recruiter';
    
    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content modal-large" onClick={(e) => e.stopPropagation()}>
                <h2>Add Feedback for {pipelineEntry.candidates?.name}</h2>
                <p className="modal-candidate-info">Recruiter: <strong>{currentRecruiterName}</strong></p>

                <div className="comments-section">
                    
                    <div className="form-card" style={{borderLeft: '4px solid var(--accent-purple)'}}>
                        <form onSubmit={handleSubmit}>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Quick Reply: Hold</label>
                                    <select onChange={(e) => handleSelectQuickReply(e, 'HOLD')} defaultValue="">
                                        <option value="" disabled>Select a Hold reason...</option>
                                        {quickReplySets.HOLD.map((reply, index) => (
                                            <option key={index} value={reply}>{reply.substring(0, 50)}...</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>Quick Reply: Reject</label>
                                    <select onChange={(e) => handleSelectQuickReply(e, 'REJECT')} defaultValue="">
                                        <option value="" disabled>Select a Reject reason...</option>
                                        {quickReplySets.REJECT.map((reply, index) => (
                                            <option key={index} value={reply}>{reply.substring(0, 50)}...</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="form-group">
                                <label>Comment *</label>
                                <textarea
                                    rows="5"
                                    value={comment}
                                    onChange={(e) => setComment(e.target.value)}
                                    placeholder="Enter your specific feedback here..."
                                    required
                                    disabled={isSubmitting}
                                />
                            </div>

                            <div className="modal-actions">
                                <button type="button" className="btn-secondary" onClick={onClose} disabled={isSubmitting}>
                                    Close
                                </button>
                                <button type="submit" className="btn-primary" disabled={isSubmitting || !comment.trim()}>
                                    {isSubmitting ? 'Sending...' : 'Send Comment & Notify'}
                                </button>
                            </div>
                        </form>
                    </div>

                    <div className="comments-list">
                        <h3>Comment History ({comments.length})</h3>
                        {comments.length === 0 ? (<p className="empty-comments">No comments yet.</p>) : (
                            comments.map(comment => (
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
                                            
                                            {/* Only show edit/delete if the current user is the Director (for simplicity) */}
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
const CandidateReviewCard = ({ candidate, onAction, onComment }) => {
    return (
        <div className="candidate-card">
            <div>
                <div className="card-header">
                    <h3 className="card-title">{candidate.candidates?.name || 'N/A'}</h3>
                    <UrgencyBadge dateString={candidate.updated_at} />
                </div>
                
                <div className="card-info">
                    <p><strong>Role:</strong> {candidate.positions?.title || 'N/A'}</p>
                    <p><strong>Client:</strong> {candidate.positions?.clients?.company_name || 'N/A'}</p>
                    <p><strong>Recruiter:</strong> {candidate.recruiters?.name || 'N/A'}</p>
                    <p><strong>Current Stage:</strong> <span className="stage-name">{candidate.stage}</span></p>
                </div>

                <div className="notes-box">
                    <p className="notes-title">Candidate Notes</p>
                    <p className="notes-text">{candidate.candidates?.notes || 'No detailed notes provided by recruiter.'}</p>
                </div>
            </div>

            <div className="card-actions">
                <h4 className="actions-title">Director Actions:</h4>
                <div className="decision-grid">
                    {/* Primary Action: Submit to Client (Moves to next stage) */}
                    <button
                        onClick={() => onAction(candidate, "Submit to Client")}
                        className="btn-submit"
                    >
                        <CheckCircle size={18} className="nav-icon" /> Submit to Client
                    </button>
                    
                    {/* Secondary Actions: Hold & Reject (Changes status) */}
                    <button
                        onClick={() => onAction(candidate, "Hold")}
                        className="btn-hold"
                    >
                        <PauseCircle size={18} className="nav-icon" /> On Hold
                    </button>
                    <button
                        onClick={() => onAction(candidate, "Reject")}
                        className="btn-reject"
                    >
                        <XCircle size={18} className="nav-icon" /> Reject
                    </button>
                </div>

                {/* Comment Action */}
                <button
                    onClick={() => onComment(candidate)}
                    className="btn-comment"
                >
                    <MessageSquare size={18} className="nav-icon" /> Add Feedback
                </button>
            </div>
        </div>
    );
};

// --- Main Page Component ---
function DirectorReview() {
    const { user, refreshData, createNotification } = useData();
    const [pipelineData, setPipelineData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [commentModalOpen, setCommentModalOpen] = useState(false); 
    const [selectedCandidate, setSelectedCandidate] = useState(null);
    const [alertMessage, setAlertMessage] = useState(null);
    const [comments, setComments] = useState([]); // New state for fetching comments
    
    // New state for Main Action confirmation
    const [actionModal, setActionModal] = useState({ isOpen: false, candidate: null, action: null });

    // Robust Email Check for component logic
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
        const { data, error } = await supabase
            .from('pipeline')
            .select('*, candidates(id, name, notes), positions(id, title, clients(company_name)), recruiters(id, name, email)')
            .or('stage.eq.Screening,status.eq.Hold')
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
        return pipelineData;
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

    // Handler for the main action buttons (Submit, Hold, Reject)
    const handleOpenActionModal = (candidate, action) => {
        setSelectedCandidate(candidate); 
        setActionModal({ isOpen: true, candidate, action });
    };

    // Handler to process the DB update and conditionally send email
    const processAction = async (candidate, action, sendNotification) => {
        setActionModal({ isOpen: false, candidate: null, action: null }); 
        let newStage = candidate.stage;
        let newStatus = candidate.status;
        let notificationType;
        let notificationMessage;

        const isRejection = action === "Reject";
        const isHold = action === "Hold";

        if (action === "Submit to Client") {
            newStage = "Submit to Client";
            newStatus = "Active";
            notificationType = 'stage_change';
            notificationMessage = `Director moved **${candidate.candidates.name}** to **Submit to Client** for ${candidate.positions.title}. Proceed with client submission.`;
        } else if (isHold) {
            newStatus = "Hold";
            notificationType = 'status_change';
            notificationMessage = `Director put **${candidate.candidates.name}** on **Hold** for ${candidate.positions.title}. Check Director Review notes.`;
        } else if (isRejection) {
            newStatus = "Reject";
            notificationType = 'status_change';
            if (candidate.stage === 'Screening') newStage = 'Reject';
            notificationMessage = `Director **Rejected** **${candidate.candidates.name}** for ${candidate.positions.title}. Candidate status updated to Reject.`;
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


    // Handler for the comment submission
    const handleAddComment = async (pipelineEntry, comment) => {
        const authorName = user?.email || 'Director';
        
        const { error: commentError } = await supabase.from('comments').insert([{
            candidate_id: pipelineEntry.candidates.id,
            author_name: authorName,
            comment_text: comment
        }]);

        if (commentError) {
            showAlert(`Error adding comment: ${commentError.message}`);
            return;
        }

        await fetchComments(pipelineEntry.candidate_id);

        const notificationMessage = `${authorName} left a comment for ${pipelineEntry.candidates.name} (Role: ${pipelineEntry.positions.title}): "${comment.substring(0, 50)}..."`;
        await createNotification({ 
            type: 'new_comment', 
            message: notificationMessage, 
            recipient: pipelineEntry.recruiters.email 
        });

        showAlert(`Comment added for ${pipelineEntry.candidates.name}. Recruiter notified.`);
    };
    
    // Handler for comment editing
    const handleUpdateComment = async (commentId, newText, candidateId) => {
        const { error } = await supabase.from('comments').update({ comment_text: newText }).eq('id', commentId);
        if (error) {
            showAlert('Error updating comment: ' + error.message);
        } else {
            await fetchComments(candidateId);
            showAlert('Comment updated successfully.');
        }
    };
    
    // Handler for comment deletion
    const handleDeleteComment = async (commentId, candidateId) => {
        const { error } = await supabase.from('comments').delete().eq('id', commentId);
        if (error) {
            showAlert('Error deleting comment: ' + error.message);
        } else {
            await fetchComments(candidateId);
            showAlert('Comment deleted successfully.');
        }
    };


    // Handler to open the comment modal
    const handleOpenCommentModal = async (candidate) => {
        setSelectedCandidate(candidate);
        await fetchComments(candidate.candidates.id); // Fetch comments specific to this candidate
        setCommentModalOpen(true);
    };

    // --- Nested Component: Action Confirmation Modal (UNCHANGED) ---
    const ActionModal = ({ isOpen, candidate, action }) => {
        if (!isOpen || !candidate) return null;
        
        const candidateName = candidate.candidates?.name;
        const recruiterName = candidate.recruiters?.name || 'N/A';
        const positionTitle = candidate.positions?.title || 'N/A';
        
        let messageHTML = '';
        
        if (action === "Submit to Client") {
            messageHTML = `You are about to move <strong>${candidateName}</strong> to the <strong>Submit to Client</strong> stage for the ${positionTitle} role.`;
        } else if (action === "Hold") {
            messageHTML = `You are about to put <strong>${candidateName}</strong> <strong>On Hold</strong> for the ${positionTitle} role.`;
        } else if (action === "Reject") {
            messageHTML = `You are about to <strong>Reject</strong> <strong>${candidateName}</strong> for the ${positionTitle} role.`;
        }

        return (
            <div className="modal-overlay" onClick={() => setActionModal({ isOpen: false, candidate: null, action: null })}>
                <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                    <h2>Confirm Action</h2>
                    <p className="modal-candidate-info" dangerouslySetInnerHTML={{ __html: messageHTML }} />
                    <p className="modal-candidate-info">Would you like to send an email notification to the Recruiter: <strong>{recruiterName}</strong>?</p>
                    
                    <div className="modal-actions decision-buttons-grid" style={{ justifyContent: 'center' }}>
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

    // Safety check for page access
    if (!isDirector) {
        return <div className="page-container"><div className="empty-state"><h3>Access Denied</h3><p>This portal is restricted to the Director account.</p></div></div>;
    }

    return (
        <div className="page-container">
            <div className="page-header">
                <h1>Director Review Portal</h1>
            </div>

            <p className="sub-header-text">
                This portal surfaces candidates in the <strong>Screening</strong> stage or on <strong>Hold</strong> status for your review. Please use the actions below to move candidates forward or provide feedback.
                <span className="font-semibold text-yellow-500 block sm:inline-block sm:ml-2">
                    
                </span>
            </p>

            {alertMessage && (
                <div className="notification-alert">
                    {alertMessage}
                </div>
            )}

            {candidatesForReview.length === 0 ? (
                <div className="empty-state">
                    <h3>All clear!</h3>
                    <p>No candidates are currently awaiting your review or action.</p>
                </div>
            ) : (
                <div className="review-grid">
                    {candidatesForReview.map(candidate => (
                        <CandidateReviewCard
                            key={candidate.id}
                            candidate={candidate}
                            onAction={handleOpenActionModal}
                            onComment={handleOpenCommentModal}
                        />
                    ))}
                </div>
            )}

            {/* ACTION CONFIRMATION MODAL */}
            {actionModal.isOpen && (
                <ActionModal
                    isOpen={actionModal.isOpen}
                    candidate={actionModal.candidate}
                    action={actionModal.action}
                />
            )}

            {/* Comment Modal - Updated to pass comments and new handlers */}
            {commentModalOpen && selectedCandidate && (
                <CommentModal
                    pipelineEntry={selectedCandidate}
                    comments={comments}
                    onClose={() => setCommentModalOpen(false)}
                    onCommentSubmit={handleAddComment}
                    onEdit={handleUpdateComment}
                    onDelete={handleDeleteComment}
                />
            )}
        </div>
    );
}

export default DirectorReview;