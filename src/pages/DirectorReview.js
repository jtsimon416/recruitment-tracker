import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../services/supabaseClient';
import { useData } from '../contexts/DataContext';
import { Clock, CheckCircle, XCircle, PauseCircle, MessageSquare, AlertTriangle, Binoculars, FileText } from 'lucide-react'; 
import '../styles/DirectorReview.css';

// --- Configuration ---
const URGENT_THRESHOLD_DAYS = 5;
const SUPER_URGENT_THRESHOLD_DAYS = 7;
const DIRECTOR_EMAIL = 'brian.griffiths@brydongama.com'; 

// Specialized Quick Reply Templates (KEPT for reference, but quick replies removed from UI per user request)
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

// ====================================================================
// --- HELPER COMPONENTS (Defined FIRST to avoid react/jsx-no-undef) ---
// ====================================================================

// --- COMPONENT: Info Sidebar for Candidate Details ---
const InfoSidebar = ({ candidate, onClose }) => {
    if (!candidate) return null;
    
    const skillsArray = candidate.skills ? candidate.skills.split(',').map(s => s.trim()).filter(s => s) : [];

    return (
        <div className="info-sidebar-overlay" onClick={onClose}>
            <div className="info-sidebar" onClick={(e) => e.stopPropagation()}>
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
                </div>

                <div className="sidebar-section">
                    <h3>Resume Link</h3>
                    {candidate.resume_url ? (
                        <a href={candidate.resume_url} target="_blank" rel="noopener noreferrer" className="btn-primary" style={{display: 'block', textAlign: 'center', margin: '15px 0'}}>
                            View Original Document
                        </a>
                    ) : (
                        <p>No original resume file link available.</p>
                    )}
                </div>

                <div className="sidebar-section">
                    <h3>Skills & Keywords ({skillsArray.length})</h3>
                    <div className="skills-full-list">
                        {skillsArray.length > 0 ? skillsArray.map((skill, index) => (
                            <span key={index} className="skill-tag-full">{skill}</span>
                        )) : <p>No skills recorded.</p>}
                    </div>
                </div>

                <div className="sidebar-section">
                    <h3>Recruiter Notes</h3>
                    <p className="notes-text-large">{candidate.notes || 'No detailed notes provided.'}</p>
                </div>
            </div>
        </div>
    );
};
// --- END INFO SIDEBAR COMPONENT ---


// --- COMPONENT: Urgency Badge ---
const UrgencyBadge = ({ dateString }) => {
    const diffTime = Math.abs(new Date() - new Date(dateString));
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    let style = "urgent-standard"; 
    let text = `Updated: ${diffDays} days ago`;

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

// --- COMPONENT: Decision Modal ---
const DecisionModal = ({ pipelineEntry, comments, onClose, onFinalDecision, onEdit, onDelete }) => {
    const { user } = useData();
    const [comment, setComment] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [editingComment, setEditingComment] = useState(null);
    const [editingText, setEditingText] = useState('');

    const handleDecision = async (action, commentText) => {
        const isHoldOrReject = action === "Hold" || action === "Reject";
        if (isHoldOrReject && !commentText.trim()) return alert(`Feedback is required to ${action} the candidate.`);
        if (action === "Comment Only" && !commentText.trim()) {
             onClose();
             return;
        }

        setIsSubmitting(true);
        await onFinalDecision(pipelineEntry, action, commentText);
        setIsSubmitting(false);
        onClose(); 
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
        if (window.confirm('Are you sure you want to delete this comment?')) {
            onDelete(commentId, pipelineEntry.candidates.id);
        }
    };

    const currentRecruiterName = pipelineEntry.recruiters?.name || 'Recruiter';
    
    const filteredComments = pipelineEntry.status === 'Hold' 
        ? comments.filter(c => c.comment_text.toLowerCase().includes('hold') || c.comment_text.toLowerCase().includes('reject')) 
        : comments;
    
    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content modal-wide-decision" onClick={(e) => e.stopPropagation()}> 
                <h2>Review & Decide for {pipelineEntry.candidates?.name}</h2>
                <p className="modal-candidate-info">Role: <strong>{pipelineEntry.positions.title}</strong>, Recruiter: <strong>{currentRecruiterName}</strong></p>

                <div className="comments-section">
                    
                    <div className="form-card" style={{borderLeft: '4px solid var(--accent-purple)'}}>
                        {/* Quick Replies removed as requested */}

                        <div className="form-group">
                            <label>Director's Feedback/Decision Notes *</label>
                            <textarea
                                rows="8" // Increased rows for more space
                                value={comment}
                                onChange={(e) => setComment(e.target.value)}
                                placeholder="Enter your decision feedback here. This will be sent to the recruiter."
                                required
                                disabled={isSubmitting}
                                id="decision-notes-textarea"
                            />
                        </div>

                        <div className="decision-buttons-grid">
                            <button
                                type="button"
                                onClick={() => handleDecision("Hold", comment)}
                                className="decision-btn btn-hold"
                                disabled={isSubmitting || !comment.trim()}
                            >
                                <PauseCircle size={18} /> Hold & Notify
                            </button>
                            <button
                                type="button"
                                onClick={() => handleDecision("Reject", comment)}
                                className="decision-btn btn-reject"
                                disabled={isSubmitting || !comment.trim()}
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


// --- COMPONENT: Candidate Review Row (New Condensed View) ---
const CandidateReviewRow = ({ candidate, onAction, onDecisionModal, onOpenSidebar }) => { 
    
    const diffTime = Math.abs(new Date() - new Date(candidate.updated_at));
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    let urgencyClass = '';
    
    if (candidate.status === 'Hold') {
        if (diffDays >= SUPER_URGENT_THRESHOLD_DAYS) {
            urgencyClass = 'critical-aging';
        } else if (diffDays >= URGENT_THRESHOLD_DAYS) {
            urgencyClass = 'warning-aging';
        }
    }

    return (
        <div className={`review-list-row status-${candidate.status.toLowerCase()} ${urgencyClass}`}>
            
            {/* 1. Candidate Name / Icons */}
            <div className="candidate-name-cell-review">
                <strong>{candidate.candidates?.name || 'N/A'}</strong>
                {candidate.candidates?.resume_url && (
                    <a href={candidate.candidates.resume_url} target="_blank" rel="noopener noreferrer" className="icon-resume-link" onClick={(e) => e.stopPropagation()} title="View Resume File">
                        <FileText size={18} />
                    </a>
                )}
                <Binoculars size={18} className="icon-view-details" onClick={(e) => { e.stopPropagation(); onOpenSidebar(candidate.candidates); }} title="View Parsed Details" />
            </div>
            
            {/* 2. Role / Client */}
            <div className="role-cell-review">
                {candidate.positions?.title || 'N/A'}
                <span className="client-name-sub">({candidate.positions?.clients?.company_name || 'N/A'})</span>
            </div>
            
            {/* 3. Recruiter */}
            <div className="recruiter-cell-review">
                {candidate.recruiters?.name || 'N/A'}
            </div>
            
            {/* 4. Status */}
            <div className="status-cell-review">
                 <span className={`status-name status-${candidate.status.toLowerCase()}`}>{candidate.status}</span>
            </div>
            
            {/* 5. Stage */}
            <div className="stage-cell-review">
                 {candidate.stage}
            </div>
            
            {/* 6. Quick Actions */}
            <div className="actions-cell-review">
                 {/* Quick Approve Button (Submit to Client) */}
                 {candidate.stage === 'Screening' && (
                     <button
                         onClick={(e) => { e.stopPropagation(); onAction(candidate, "Submit to Client"); }}
                         className="btn-submit-quick"
                         title="Approve & Submit to Client"
                     >
                         <CheckCircle size={18} />
                     </button>
                 )}
                 {/* Feedback/Decision Button */}
                 <button
                     onClick={(e) => { e.stopPropagation(); onDecisionModal(candidate); }}
                     className="btn-comment-quick"
                     title="Provide Feedback & Decide"
                 >
                     <MessageSquare size={18} />
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
    const [decisionModalOpen, setDecisionModalOpen] = useState(false); 
    const [selectedCandidate, setSelectedCandidate] = useState(null);
    const [alertMessage, setAlertMessage] = useState(null);
    const [comments, setComments] = useState([]);
    
    const [showInfoSidebar, setShowInfoSidebar] = useState(false);
    const [sidebarCandidate, setSidebarCandidate] = useState(null); 

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
        const { data, error } = await supabase
            .from('pipeline')
            .select('*, candidates(id, name, email, phone, location, linkedin_url, skills, notes, resume_url), positions(id, title, clients(company_name)), recruiters(id, name, email)')
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
        const onHold = pipelineData.filter(p => p.status === 'Hold');
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
    
    const handleOpenInfoSidebar = (candidate) => {
        setSidebarCandidate(candidate);
        setShowInfoSidebar(true);
    };

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
            if (pipelineEntry.stage === 'Screening') {
                newStage = 'Screening'; 
            }
            notificationType = 'status_change';
            notificationMessage = `Director put **${pipelineEntry.candidates.name}** on **Hold** for ${pipelineEntry.positions.title}. Feedback: "${comment.substring(0, 50)}..."`;
        } else if (isReject) {
            newStatus = "Reject";
            if (pipelineEntry.stage === 'Screening') newStage = 'Reject';
            notificationType = 'status_change';
            notificationMessage = `Director **Rejected** **${pipelineEntry.candidates.name}** for ${pipelineEntry.positions.title}. Feedback: "${comment.substring(0, 50)}..."`;
        } else if (isCommentOnly && !comment.trim()) {
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
                    <div className="review-list-view">
                        {candidatesForReview.screening.map(candidate => (
                            <CandidateReviewRow
                                key={candidate.id}
                                candidate={candidate}
                                onAction={handleOpenActionModal}
                                onDecisionModal={handleOpenDecisionModal}
                                onOpenSidebar={handleOpenInfoSidebar} 
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
                    <div className="review-list-view">
                        {candidatesForReview.onHold.map(candidate => (
                            <CandidateReviewRow
                                key={candidate.id}
                                candidate={candidate}
                                onAction={handleOpenActionModal}
                                onDecisionModal={handleOpenDecisionModal}
                                onOpenSidebar={handleOpenInfoSidebar} 
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
            
            {/* RENDER INFO SIDEBAR */}
            {showInfoSidebar && <InfoSidebar candidate={sidebarCandidate} onClose={() => setShowInfoSidebar(false)} />}
        </div>
    );
}

export default DirectorReview;