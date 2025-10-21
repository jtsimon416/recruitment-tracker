import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabaseClient';
import { useData } from '../contexts/DataContext';
import { FaFileAlt, FaUserTie, FaExclamationCircle, FaLightbulb } from 'react-icons/fa';
// Import new themed icons
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, Check, X, Archive, Send, MessageSquare, ExternalLink, ChevronDown, ChevronUp } from 'lucide-react';
import '../styles/DirectorReview.css';

// Modal component for comments
const CommentsModal = ({ pipelineEntry, comments, handleCommentChange, handleFinalDecision, onClose }) => {
    return (
        <div className="modal-overlay">
            <motion.div 
              className="modal-content"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
            >
                <div className="modal-header">
                  <h2>Feedback for {pipelineEntry.candidates.name}</h2>
                  <button className="modal-close-btn" onClick={onClose}><X size={24} /></button>
                </div>
                
                <div className="modal-body">
                  <div className="modal-comments-history">
                      {pipelineEntry.comments && pipelineEntry.comments.length > 0 ? (
                          pipelineEntry.comments.map(comment => (
                              <div key={comment.id} className="comment">
                                  <p><strong>{comment.author_name}:</strong> {comment.comment_text}</p>
                                  <small>{new Date(comment.created_at).toLocaleString()}</small>
                              </div>
                          ))
                      ) : <p className="no-comments-message">No comment history for this candidate.</p>}
                  </div>
                  
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

                <div className="modal-footer">
                    {/* Using new, standard button classes */}
                    <button onClick={() => handleFinalDecision(pipelineEntry, 'Hold', comments[pipelineEntry.id] || '')} className="btn btn-warning">
                      <Archive size={16} /> Hold & Notify
                    </button>
                    <button onClick={() => handleFinalDecision(pipelineEntry, 'Reject', comments[pipelineEntry.id] || '')} className="btn btn-danger">
                      <X size={16} /> Reject & Notify
                    </button>
                    <button onClick={() => handleFinalDecision(pipelineEntry, 'Submit to Client', comments[pipelineEntry.id] || '')} className="btn btn-primary">
                      <Send size={16} /> Submit to Client
                    </button>
                    <button onClick={() => handleFinalDecision(pipelineEntry, 'Comment Only', comments[pipelineEntry.id] || '')} className="btn btn-secondary">
                      <MessageSquare size={16} /> Save Comment Only
                    </button>
                </div>
            </motion.div>
        </div>
    );
};

// Collapsible Header Component (Themed)
const ReviewHeader = () => {
    const [isExpanded, setIsExpanded] = useState(false); // Start collapsed
    const toggleExpand = () => setIsExpanded(!isExpanded);

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
            // Restore original query to get all fields needed for the row layout
            const { data: pipelineData, error: pipelineError } = await supabase
                .from('pipeline')
                .select(`id, candidates ( id, name, email, phone, resume_url, linkedin_url, document_type, comments ( id, comment_text, author_name, created_at, user_id ) ), positions ( id, title, client_id ), recruiters ( id, name, email ), stage, status, created_at`)
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
    
    const handleFinalDecision = async (pipelineEntry, action, comment) => {
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
        
        if (userProfile?.role?.toLowerCase() === 'director') {
            let shouldNotify = false, notificationMessage = '', notificationType = 'status_change';
            
            if ((isHold || isReject) && comment.trim()) {
                shouldNotify = true;
                notificationMessage = `Director action on **${pipelineEntry.candidates.name}**: ${action}. Feedback: "${comment.substring(0, 50)}..."`;
            } else if (isSubmit) {
                shouldNotify = true;
                notificationMessage = `Director moved **${pipelineEntry.candidates.name}** to **Submit to Client** for ${pipelineEntry.positions.title}.`;
            }
            
            console.log(`--- DR DEBUG: shouldNotify=${shouldNotify}, action=${action}, comment.trim()=${comment.trim() !== ''}, message length=${notificationMessage.length}, recipient=${pipelineEntry.recruiters.email}`);
            
            if (shouldNotify) {
                await createNotification({ type: notificationType, message: notificationMessage, recipient: pipelineEntry.recruiters.email });
            }
        }
        
        displayAlert(`${pipelineEntry.candidates.name} has been updated.`);
        refreshData();
        fetchCandidatesForReview();
        setLoading(false);
        closeCommentsModal();
    };
    const openCommentsModal = (p) => { setSelectedCandidateForComments(p); setShowCommentsModal(true); };
    const closeCommentsModal = () => { setSelectedCandidateForComments(null); setShowCommentsModal(false); };

    const screeningCandidates = candidatesForReview.filter(p => p.stage === 'Screening' && p.status !== 'Hold');
    const holdCandidates = candidatesForReview.filter(p => p.status === 'Hold');

    const calculateDaysOld = (dateString) => {
        const date = new Date(dateString);
        const today = new Date();
        const diffTime = Math.abs(today - date);
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    };

    // RESTORED: Original CandidateCard component from your file
    const CandidateCard = ({ p }) => {
        const daysOld = calculateDaysOld(p.created_at);
        const isAging = daysOld > 7; // Warning threshold: 7 days
        const candidate = p.candidates; // Get candidate object
        const documentType = candidate.document_type || 'Resume'; // Get doc type

        return (
            // Use the 'candidate-card' class from the new CSS
            <div className={`candidate-card ${isAging ? 'card-aging' : ''}`}>
                {/* Column 1: Name and Icons */}
                <div className="card-info-item candidate-name-group">
                    <span className="info-value">{candidate.name}</span>
                    <div className="name-icons">
                        {candidate.resume_url && (
                            <a href={candidate.resume_url} target="_blank" rel="noopener noreferrer" className="icon-btn" title={`View ${documentType}`}>
                                <FaFileAlt />
                            </a>
                        )}
                        {candidate.linkedin_url && (
                            <a href={candidate.linkedin_url} target="_blank" rel="noopener noreferrer" className="icon-btn" title="View LinkedIn">
                                <ExternalLink size={14} />
                            </a>
                        )}
                    </div>
                </div>
                {/* Column 2: Position */}
                <div className="card-info-item"><span className="info-label">Position</span><span className="info-value">{p.positions.title}</span></div>
                {/* Column 3: Client */}
                <div className="card-info-item"><span className="info-label">Client</span><span className="info-value">{p.positions.clients.name}</span></div>
                {/* Column 4: Recruiter */}
                <div className="card-info-item"><span className="info-label">Recruiter</span><span className="info-value">{p.recruiters.name}</span></div>
                {/* Column 5: Submitted Date */}
                <div className="card-info-item"><span className="info-label">Submitted</span><span className="info-value">{new Date(p.created_at).toLocaleDateString()}</span></div>
                {/* Column 6: Status */}
                <div className="card-info-item"><span className="info-label">Status</span><span className="info-value">{p.status}</span></div>
                {/* Column 7: Actions */}
                <div className="card-actions">
                    {/* UPDATED: Using new, standard button classes */}
                    <button onClick={() => handleFinalDecision(p, 'Submit to Client', '')} className="btn btn-primary">
                      <Send size={16} /> Submit
                    </button>
                    <button className="btn btn-secondary" onClick={() => openCommentsModal(p)}>
                      <MessageSquare size={16} /> Comments
                    </button>
                    {isAging && <FaExclamationCircle className="aging-warning-icon" title={`In queue for ${daysOld} days`} />}
                </div>
            </div>
        );
    };

    if (error) return <div className="error-container">Error: {error}</div>;

    return (
        <div className="director-review-container">
            {showAlert && <div className="alert-popup">{alertMessage}</div>}
            
            <div className="page-header">
              <h1>Director Review: Action Center</h1>
            </div>
            
            <ReviewHeader />

            <div className="review-section">
                <h2><Check size={24} /> Screening Queue ({screeningCandidates.length})</h2>
                <div className="candidate-list">
                    {screeningCandidates.length > 0 ? screeningCandidates.map(p => <CandidateCard key={p.id} p={p} />) : <p className="no-candidates-message">No candidates are currently in screening.</p>}
                </div>
            </div>

            <div className="review-section">
                <h2><Archive size={24} /> Hold Queue ({holdCandidates.length})</h2>
                <div className="candidate-list">
                    {holdCandidates.length > 0 ? holdCandidates.map(p => <CandidateCard key={p.id} p={p} />) : <p className="no-candidates-message">No candidates are currently on hold.</p>}
                </div>
            </div>

            <AnimatePresence>
            {showCommentsModal && selectedCandidateForComments && (
                <CommentsModal
                    pipelineEntry={selectedCandidateForComments}
                    comments={comments}
                    handleCommentChange={handleCommentChange}
                    handleFinalDecision={handleFinalDecision}
                    onClose={closeCommentsModal}
                />
            )}
            </AnimatePresence>
        </div>
    );
}

export default DirectorReview;