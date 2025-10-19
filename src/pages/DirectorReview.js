import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabaseClient';
import { useData } from '../contexts/DataContext';
// CHANGED: Added FaLightbulb to imports
import { FaFileAlt, FaUserTie, FaExclamationCircle, FaLightbulb } from 'react-icons/fa';
import '../styles/DirectorReview.css';

// Modal component for comments (No change)
const CommentsModal = ({ pipelineEntry, comments, handleCommentChange, handleFinalDecision, onClose }) => {
    return (
        <div className="modal-overlay">
            <div className="modal-content">
                <button className="modal-close-btn" onClick={onClose}>&times;</button>
                <h2>Feedback & History for {pipelineEntry.candidates.name}</h2>
                <div className="modal-comments-history">
                    {pipelineEntry.comments && pipelineEntry.comments.length > 0 ? (
                        pipelineEntry.comments.map(comment => (
                            <div key={comment.id} className="comment">
                                <p><strong>{comment.author_name}:</strong> {comment.comment_text}</p>
                                <small>{new Date(comment.created_at).toLocaleString()}</small>
                            </div>
                        ))
                    ) : <p>No comments yet.</p>}
                </div>
                <h3>Your Decision & Comment</h3>
                <textarea
                    value={comments[pipelineEntry.id] || ''}
                    onChange={e => handleCommentChange(pipelineEntry.id, e.target.value)}
                    placeholder="Provide your feedback here... (Required for Hold/Reject)"
                    rows="5"
                />
                <div className="modal-decision-buttons">
                    {/* Applying Talent Pool button styling */}
                    <button onClick={() => handleFinalDecision(pipelineEntry, 'Hold', comments[pipelineEntry.id] || '')} className="btn talent-pool-btn-edit">Hold & Notify</button>
                    <button onClick={() => handleFinalDecision(pipelineEntry, 'Reject', comments[pipelineEntry.id] || '')} className="btn talent-pool-btn-delete">Reject & Notify</button>
                    <button onClick={() => handleFinalDecision(pipelineEntry, 'Submit to Client', comments[pipelineEntry.id] || '')} className="btn talent-pool-btn-pipeline">Submit to Client</button>
                    <button onClick={() => handleFinalDecision(pipelineEntry, 'Comment Only', comments[pipelineEntry.id] || '')} className="btn talent-pool-btn-comments">Save Comment Only</button>
                </div>
            </div>
        </div>
    );
};

// --- UPDATED: Collapsible Header Component ---
const ReviewHeader = () => {
    // State to manage the dropdown's expanded/collapsed status
    const [isExpanded, setIsExpanded] = useState(false);
    const toggleExpand = () => setIsExpanded(!isExpanded);

    return (
        <div className="review-header-container">
            {/* Clickable Title Bar */}
            <div className="review-header-title" onClick={toggleExpand}>
                <FaLightbulb className="lightbulb-icon" />
                <h3>Director Review Workflow</h3>
            </div>
            
            {/* Collapsible Content */}
            <div className={`review-header-content ${isExpanded ? 'expanded' : 'collapsed'}`}>
                <p>This dashboard is your <strong>action center</strong> for all candidates entering or needing a decision before client submission.</p>
                <ul>
                    <li><strong>Screening Queue:</strong> Candidates submitted by Recruiters and awaiting your initial <strong>Go/No-Go</strong> decision.</li>
                    <li><strong>Hold Queue:</strong> Candidates previously marked <strong>Hold</strong> that require re-review or further action.</li>
                    <li><strong>Key Actions:</strong> Use <strong>Submit</strong> to move a candidate to the client pipeline. Use <strong>Hold/Reject</strong> <em>with a comment</em> to notify the Recruiter with feedback.</li>
                </ul>
            </div>
        </div>
    );
};
// --- END UPDATED HEADER COMPONENT ---


function DirectorReview() {
    const { user, userProfile, refreshData, createNotification } = useData();
    const [candidatesForReview, setCandidatesForReview] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [comments, setComments] = useState({});
    const [showAlert, setShowAlert] = useState(false);
    const [alertMessage, setAlertMessage] = useState("");
    const [showCommentsModal, setShowCommentsModal] = useState(false);
    const [selectedCandidateForComments, setSelectedCandidateForComments] = useState(null);

    const fetchCandidatesForReview = useCallback(async () => {
        setLoading(true);
        try {
            const { data: pipelineData, error: pipelineError } = await supabase
                .from('pipeline')
                .select(`id, candidates ( id, name, email, phone, resume_url, comments ( id, comment_text, author_name, created_at, user_id ) ), positions ( id, title, client_id ), recruiters ( id, name, email ), stage, status, created_at`)
                .or('stage.eq.Screening,status.eq.Hold')
                .order('created_at', { ascending: false });

            if (pipelineError) throw pipelineError;
            const clientIds = [...new Set(pipelineData.map(p => p.positions.client_id).filter(id => id))];
            let clientsMap = {};
            if (clientIds.length > 0) {
                const { data: clientsData, error: clientsError } = await supabase.from('clients').select('id, company_name').in('id', clientIds);
                if (clientsError) throw clientsError;
                clientsData.forEach(client => { clientsMap[client.id] = client.company_name; });
            }
            const finalData = pipelineData.map(p => ({ ...p, comments: p.candidates.comments || [], positions: { ...p.positions, clients: { name: clientsMap[p.positions.client_id] || 'N/A' } } }));
            setCandidatesForReview(finalData);
        } catch (err) { setError(err.message); } finally { setLoading(false); }
    }, []);

    useEffect(() => { fetchCandidatesForReview(); }, [fetchCandidatesForReview]);
    
    const handleCommentChange = (id, text) => setComments(prev => ({ ...prev, [id]: text }));
    const displayAlert = (message) => { setAlertMessage(message); setShowAlert(true); setTimeout(() => setShowAlert(false), 3000); };
    
    // -------------------------------------------------------------------
    // 🟢 FINAL FIX: Role check updated to use userProfile?.role
    const handleFinalDecision = async (pipelineEntry, action, comment) => {
        // --- NEW DEBUG LOG AT THE VERY START ---
        // Note: user.role is still 'authenticated'. We need to check userProfile.role.
        console.log(`--- DR DEBUG START: user exists=${!!user}, user profile role=${userProfile?.role}, action=${action}`);
        
        if (!user) { displayAlert("User data not available."); return; }
        const authorName = userProfile?.name || 'Director';
        let newStage = pipelineEntry.stage;
        let newStatus = pipelineEntry.status;
        const isHold = action === "Hold", isReject = action === "Reject", isSubmit = action === "Submit to Client", isCommentOnly = action === "Comment Only";
        if (isHold) newStatus = "Hold";
        else if (isReject) { newStatus = "Reject"; if (pipelineEntry.stage === 'Screening') newStage = 'Reject'; }
        else if (isSubmit) { newStage = "Submitted to Client"; newStatus = "Active"; }
        else if (isCommentOnly && !comment.trim()) {
            displayAlert(`Comment was empty, no action taken.`);
            return;
        }

        setLoading(true);
        const { data: { user: authUser } } = await supabase.auth.getUser();
    
        if (comment.trim()) {
            const { error } = await supabase.from('comments').insert([{ candidate_id: pipelineEntry.candidates.id, author_name: authorName, comment_text: comment, user_id: authUser?.id }]);
            if (error) { displayAlert(`Error adding comment: ${error.message}`); setLoading(false); return; }
        } else if (!comment.trim() && (isHold || isReject)) {
             displayAlert(`A comment is required for ${action}.`);
             setLoading(false);
             return;
        }

        if (isHold || isReject || isSubmit) {
            const { error } = await supabase.from('pipeline').update({ stage: newStage, status: newStatus, updated_at: new Date().toISOString() }).eq('id', pipelineEntry.id);
            if (error) { displayAlert(`Error updating status: ${error.message}`); setLoading(false); return; }
        }
        
        // Notification logic (remains similar)
        // CHANGED: Use optional chaining and .toLowerCase() for safer, case-insensitive role check
        if (userProfile?.role?.toLowerCase() === 'director') {
            let shouldNotify = false, notificationMessage = '', notificationType = 'status_change';
            
            // Check for Hold/Reject with Comment, OR Submit to Client
            if ((isHold || isReject) && comment.trim()) {
                shouldNotify = true;
                notificationMessage = `Director action on **${pipelineEntry.candidates.name}**: ${action}. Feedback: "${comment.substring(0, 50)}..."`;
            } else if (isSubmit) {
                shouldNotify = true;
                notificationMessage = `Director moved **${pipelineEntry.candidates.name}** to **Submit to Client** for ${pipelineEntry.positions.title}.`;
            }
            
            // --- PREVIOUS DEBUG LOG ---
            console.log(`--- DR DEBUG: shouldNotify=${shouldNotify}, action=${action}, comment.trim()=${comment.trim() !== ''}, message length=${notificationMessage.length}, recipient=${pipelineEntry.recruiters.email}`);
            
            if (shouldNotify) {
                // IMPORTANT: createNotification function in DataContext must also be fixed.
                await createNotification({ type: notificationType, message: notificationMessage, recipient: pipelineEntry.recruiters.email });
            }
        }
        
        displayAlert(`${pipelineEntry.candidates.name} has been updated.`);
        refreshData();
        fetchCandidatesForReview();
        setLoading(false);
        closeCommentsModal();
    };
    // -------------------------------------------------------------------
    const openCommentsModal = (p) => { setSelectedCandidateForComments(p); setShowCommentsModal(true); };
    const closeCommentsModal = () => { setSelectedCandidateForComments(null); setShowCommentsModal(false); };

    // Filtering candidates into separate lists
    const screeningCandidates = candidatesForReview.filter(p => p.stage === 'Screening' && p.status !== 'Hold');
    const holdCandidates = candidatesForReview.filter(p => p.status === 'Hold');

    // Helper to calculate days old for warnings
    const calculateDaysOld = (dateString) => {
        const date = new Date(dateString);
        const today = new Date();
        const diffTime = Math.abs(today - date);
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    };

    const CandidateCard = ({ p }) => {
        const daysOld = calculateDaysOld(p.created_at);
        const isAging = daysOld > 7; // Warning threshold: 7 days

        return (
            <div className={`candidate-card ${isAging ? 'card-aging' : ''}`}>
                <div className="card-info-item candidate-name-group">
                    <span className="info-value">{p.candidates.name}</span>
                    <div className="name-icons">
                        <a href={p.candidates.resume_url} target="_blank" rel="noopener noreferrer" className="icon-btn" title="View Resume"><FaFileAlt /></a>
                        <button className="icon-btn" title="View Candidate Profile"><FaUserTie /></button>
                    </div>
                </div>
                <div className="card-info-item"><span className="info-label">Position</span><span className="info-value">{p.positions.title}</span></div>
                <div className="card-info-item"><span className="info-label">Client</span><span className="info-value">{p.positions.clients.name}</span></div>
                <div className="card-info-item"><span className="info-label">Recruiter</span><span className="info-value">{p.recruiters.name}</span></div>
                <div className="card-info-item"><span className="info-label">Submitted</span><span className="info-value">{new Date(p.created_at).toLocaleDateString()}</span></div>
                {/* Status will now just be plain text as per feedback */}
                <div className="card-info-item"><span className="info-label">Status</span><span className="info-value">{p.status}</span></div>
                <div className="card-actions">
                    {/* Applying Talent Pool button styling */}
                    <button onClick={() => handleFinalDecision(p, 'Submit to Client', '')} className="btn talent-pool-btn-pipeline">Submit</button>
                    <button className="btn talent-pool-btn-comments" onClick={() => openCommentsModal(p)}>Comments</button>
                    {isAging && <FaExclamationCircle className="aging-warning-icon" title={`This candidate has been in queue for ${daysOld} days.`} />}
                </div>
            </div>
        );
    };

    if (error) return <div className="error-container">Error: {error}</div>;

    return (
        <div className="director-review-container">
            {showAlert && <div className="alert-popup">{alertMessage}</div>}
            
            <div className="review-section">
                <h1>Director Review: Action Center</h1> 
                <ReviewHeader /> {/* INSERTED NEW HEADER COMPONENT HERE */}
                <div className="review-sub-section">
                    <h2>Screening Queue</h2>
                    <div className="candidate-list">
                        {screeningCandidates.length > 0 ? screeningCandidates.map(p => <CandidateCard key={p.id} p={p} />) : <p className="no-candidates-message">No candidates are currently in screening.</p>}
                    </div>
                </div>
            </div>

            <div className="review-section">
                <div className="review-sub-section">
                    <h2>Hold Queue</h2>
                    <div className="candidate-list">
                        {holdCandidates.length > 0 ? holdCandidates.map(p => <CandidateCard key={p.id} p={p} />) : <p className="no-candidates-message">No candidates are currently on hold.</p>}
                    </div>
                </div>
            </div>

            {showCommentsModal && selectedCandidateForComments && (
                <CommentsModal
                    pipelineEntry={selectedCandidateForComments}
                    comments={comments}
                    handleCommentChange={handleCommentChange}
                    handleFinalDecision={handleFinalDecision}
                    onClose={closeCommentsModal}
                />
            )}
        </div>
    );
}

export default DirectorReview;