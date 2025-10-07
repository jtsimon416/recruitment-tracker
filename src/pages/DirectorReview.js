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

// Quick Reply Templates for the Director
const quickReplies = [
    "Good fit, move to submission. Follow up on references.",
    "Place on hold, need to discuss compensation expectations.",
    "Not a fit for this role, excellent for Talent Pool."
];

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
const CommentModal = ({ pipelineEntry, onClose, onCommentSubmit }) => {
    const [comment, setComment] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { user } = useData();

    const handleSubmit = async () => {
        if (!comment.trim()) return;
        setIsSubmitting(true);
        
        await onCommentSubmit(pipelineEntry, comment);
        
        setIsSubmitting(false);
        onClose();
    };

    const applyQuickReply = (reply) => {
        setComment(reply);
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content modal-large" onClick={(e) => e.stopPropagation()}>
                <h2>Add Feedback for {pipelineEntry.candidates?.name}</h2>
                
                <div className="form-card mb-4" style={{borderLeft: '4px solid var(--accent-purple)'}}>
                    <label className="block text-gray-400 mb-2">Quick Replies:</label>
                    <div className="quick-replies-container">
                        {quickReplies.map((reply, index) => (
                            <button
                                key={index}
                                type="button"
                                onClick={() => applyQuickReply(reply)}
                                className="btn-quick-reply"
                            >
                                {reply.substring(0, 30)}...
                            </button>
                        ))}
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
                    <button
                        type="button"
                        onClick={onClose}
                        className="btn-secondary"
                        disabled={isSubmitting}
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={handleSubmit}
                        className="btn-primary"
                        disabled={isSubmitting || !comment.trim()}
                    >
                        {isSubmitting ? 'Sending...' : 'Send Comment & Notify'}
                    </button>
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
    const [modalOpen, setModalOpen] = useState(false);
    const [selectedCandidate, setSelectedCandidate] = useState(null);
    const [alertMessage, setAlertMessage] = useState(null);
    
    // Robust Email Check for component logic
    const directorEmailClean = DIRECTOR_EMAIL.toLowerCase().trim();
    const userEmailClean = user?.email ? user.email.toLowerCase().trim() : null;
    const isDirector = userEmailClean === directorEmailClean; 

    useEffect(() => {
        if (isDirector) { // Only fetch if user is correctly identified as Director
            fetchCandidatesForReview();
        } else {
            setLoading(false); // Stop loading if not director to prevent infinite spinner
        }
    }, [isDirector]);

    // Fetch pipeline entries that require Director action
    async function fetchCandidatesForReview() {
        setLoading(true);
        // Filter: Fetch candidates in 'Screening' stage OR on 'Hold' status.
        // Sort: Oldest first for urgency
        const { data, error } = await supabase
            .from('pipeline')
            .select('*, candidates(id, name, notes), positions(id, title, clients(company_name)), recruiters(id, name, email)')
            .or('stage.eq.Screening,status.eq.Hold')
            .order('updated_at', { ascending: true }); 

        if (error) {
            console.error('Error fetching director review data:', error);
            // Show a user-friendly error message if data retrieval fails
            showAlert(`Error loading candidates: ${error.message}`);
        } else {
            setPipelineData(data || []);
        }
        setLoading(false);
    }
    
    const candidatesForReview = useMemo(() => {
        return pipelineData;
    }, [pipelineData]);

    const showAlert = (message) => {
        setAlertMessage(message);
        setTimeout(() => setAlertMessage(null), 4000);
    };

    // Handler for the main action buttons (Submit, Hold, Reject)
    const handleMainAction = async (candidate, action) => {
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
            // Also move out of Screening stage upon rejection
            if (candidate.stage === 'Screening') newStage = 'Reject';
            notificationMessage = `Director **Rejected** **${candidate.candidates.name}** for ${candidate.positions.title}. Candidate status updated to Reject.`;
        }

        // IMPORTANT: Using window.confirm as per established project practice
        const confirmation = window.confirm(`Are you sure you want to change ${candidate.candidates.name}'s status to: ${action}? This will notify the Recruiter.`);
        
        if (!confirmation) return;

        setLoading(true);
        
        // 1. Update pipeline in DB
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
            // 2. Send notification email
            await createNotification({ 
                type: notificationType, 
                message: notificationMessage, 
                recipient: candidate.recruiters.email 
            });

            showAlert(`${candidate.candidates.name} updated to ${action}. Recruiter notified.`);
            refreshData(); 
            fetchCandidatesForReview(); 
        }
        setLoading(false);
    };

    // Handler for the comment submission
    const handleCommentSubmit = async (pipelineEntry, comment) => {
        const authorName = user?.email || 'Director';
        
        // 1. Insert comment
        const { error: commentError } = await supabase.from('comments').insert([{
            candidate_id: pipelineEntry.candidates.id,
            author_name: authorName,
            comment_text: comment
        }]);

        if (commentError) {
            showAlert(`Error adding comment: ${commentError.message}`);
            return;
        }

        // 2. Send notification
        const notificationMessage = `${authorName} left a comment for ${pipelineEntry.candidates.name} (Role: ${pipelineEntry.positions.title}): "${comment.substring(0, 50)}..."`;
        await createNotification({ 
            type: 'new_comment', 
            message: notificationMessage, 
            recipient: pipelineEntry.recruiters.email 
        });

        showAlert(`Comment added for ${pipelineEntry.candidates.name}. Recruiter notified.`);
        refreshData(); 
        fetchCandidatesForReview(); 
    };

    // Handler to open the comment modal
    const handleOpenCommentModal = (candidate) => {
        setSelectedCandidate(candidate);
        setModalOpen(true);
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

            {/* This is the descriptive paragraph, now correctly structured in JSX, NOT extraneous text */}
            <p className="sub-header-text">
                
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
                            onAction={handleMainAction}
                            onComment={handleOpenCommentModal}
                        />
                    ))}
                </div>
            )}

            {modalOpen && selectedCandidate && (
                <CommentModal
                    pipelineEntry={selectedCandidate}
                    onClose={() => setModalOpen(false)}
                    onCommentSubmit={handleCommentSubmit}
                />
            )}
        </div>
    );
}

export default DirectorReview;
