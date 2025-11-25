import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { Calendar, MessageSquare, Mail, Phone, MapPin, ExternalLink, User, Clock } from 'lucide-react';
import './CandidatePreviewCard.css';

const CandidatePreviewCard = ({ children, candidate, source = 'pipeline', pipelineData = null }) => {
    const [isHovered, setIsHovered] = useState(false);
    const [showPreview, setShowPreview] = useState(false);
    const hoverTimer = useRef(null);
    const triggerRef = useRef(null);
    const previewRef = useRef(null);
    const closeTimer = useRef(null);

    // Calculate submission date for Active Tracker
    const getSubmissionDate = () => {
        if (source === 'pipeline' && pipelineData?.created_at) {
            const date = new Date(pipelineData.created_at);
            const now = new Date();
            const diffTime = Math.abs(now - date);
            const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

            const formattedDate = date.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
            });

            let timeAgo = '';
            if (diffDays === 0) timeAgo = 'Today';
            else if (diffDays === 1) timeAgo = 'Yesterday';
            else if (diffDays < 7) timeAgo = `${diffDays} days ago`;
            else if (diffDays < 30) timeAgo = `${Math.floor(diffDays / 7)} weeks ago`;
            else timeAgo = `${Math.floor(diffDays / 30)} months ago`;

            return { formattedDate, timeAgo };
        }
        return null;
    };

    // Handle hover with delay
    const handleMouseEnter = () => {
        console.log('🖱️ Mouse Enter Trigger');
        clearTimeout(closeTimer.current);
        setIsHovered(true);
        if (!showPreview) {
            hoverTimer.current = setTimeout(() => {
                console.log('⏰ Timer fired: Showing Preview');
                setShowPreview(true);
            }, 300); // 300ms delay to prevent accidental popups
        }
    };

    const handleMouseLeave = () => {
        console.log('👋 Mouse Leave Trigger');
        setIsHovered(false);
        clearTimeout(hoverTimer.current);
        // Add delay before closing to allow moving to the card
        closeTimer.current = setTimeout(() => {
            console.log('🔒 Close Timer fired: Hiding Preview');
            setShowPreview(false);
        }, 800);
    };

    const handleCardMouseEnter = () => {
        console.log('🃏 Card Mouse Enter');
        clearTimeout(closeTimer.current);
        setIsHovered(true);
    };

    const handleCardMouseLeave = () => {
        console.log('🃏 Card Mouse Leave');
        setIsHovered(false);
        closeTimer.current = setTimeout(() => {
            console.log('🔒 Close Timer fired (from card): Hiding Preview');
            setShowPreview(false);
        }, 800);
    };

    useEffect(() => {
        console.log('👀 showPreview changed:', showPreview);
        if (showPreview) {
            console.log('📦 Props:', { candidate, source, pipelineData });
        }
    }, [showPreview, candidate, source, pipelineData]);

    // Get comments/notes
    const getComments = () => {
        if (source === 'pipeline' && pipelineData?.comments) {
            return Array.isArray(pipelineData.comments) ? pipelineData.comments : [];
        }
        if (source === 'outreach' && candidate?.notes) {
            return Array.isArray(candidate.notes) ? candidate.notes : [];
        }
        return [];
    };

    const submissionDate = getSubmissionDate();
    const comments = getComments();

    return (
        <>
            <div
                className="candidate-preview-trigger"
                ref={triggerRef}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
            >
                {children}
            </div>

            {showPreview && ReactDOM.createPortal(
                <>
                    <div className="candidate-preview-backdrop" />
                    <div
                        className="candidate-preview-card"
                        ref={previewRef}
                        onMouseEnter={handleCardMouseEnter}
                        onMouseLeave={handleCardMouseLeave}
                    >
                        {/* Header */}
                        <div className="preview-header">
                            <div className="preview-title">
                                <User size={18} />
                                <span>{candidate?.name || candidate?.candidate_name || 'Unknown'}</span>
                            </div>
                        </div>

                        {/* Submission Date - BOLD AND PROMINENT */}
                        {submissionDate && (
                            <div className="preview-submission-date">
                                <Calendar size={20} />
                                <div className="submission-info">
                                    <div className="submission-label">ORIGINAL SUBMISSION</div>
                                    <div className="submission-value">{submissionDate.formattedDate}</div>
                                    <div className="submission-ago">({submissionDate.timeAgo})</div>
                                </div>
                            </div>
                        )}

                        {/* Pipeline Info */}
                        {source === 'pipeline' && pipelineData && (
                            <div className="preview-section">
                                <div className="preview-row">
                                    <strong>Position:</strong> {pipelineData.positions?.title || 'Unknown'}
                                </div>

                                <div className="preview-stage-info">
                                    <Clock size={20} />
                                    <div className="stage-info-content">
                                        <div className="stage-label">CURRENT STATUS</div>
                                        <div className="stage-value">{pipelineData.stage || 'Unknown'}</div>
                                        {pipelineData.updated_at && (
                                            <div className="stage-time">
                                                In stage for: <span className="time-highlight">
                                                    {(() => {
                                                        const date = new Date(pipelineData.updated_at);
                                                        const now = new Date();
                                                        const diffTime = Math.abs(now - date);
                                                        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
                                                        const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
                                                        const diffMinutes = Math.floor(diffTime / (1000 * 60));

                                                        if (diffDays === 0) {
                                                            if (diffHours === 0) {
                                                                if (diffMinutes < 1) return 'Just now';
                                                                return `${diffMinutes} mins`;
                                                            }
                                                            return `${diffHours} hours`;
                                                        }
                                                        if (diffDays === 1) return '1 day';
                                                        return `${diffDays} days`;
                                                    })()}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {pipelineData.recruiters?.name && (
                                    <div className="preview-row" style={{ marginTop: '8px' }}>
                                        <strong>Recruiter:</strong> {pipelineData.recruiters.name}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Outreach Info */}
                        {source === 'outreach' && (
                            <div className="preview-section">
                                {candidate?.linkedin_url && (
                                    <div className="preview-row">
                                        <ExternalLink size={14} />
                                        <a
                                            href={candidate.linkedin_url.startsWith('http') ? candidate.linkedin_url : `https://${candidate.linkedin_url}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="linkedin-link"
                                        >
                                            LinkedIn Profile
                                        </a>
                                    </div>
                                )}
                                {candidate?.positions?.title && (
                                    <div className="preview-row">
                                        <strong>Position:</strong> {candidate.positions.title}
                                    </div>
                                )}
                                {candidate?.activity_status && (
                                    <div className="preview-row">
                                        <strong>Status:</strong> {candidate.activity_status.replace(/_/g, ' ')}
                                    </div>
                                )}
                                {candidate?.rating && (
                                    <div className="preview-row">
                                        <strong>Rating:</strong> {'⭐'.repeat(candidate.rating)}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Comments / Notes */}
                        {comments.length > 0 && (
                            <div className="preview-section">
                                <div className="section-title">
                                    <MessageSquare size={16} />
                                    Comments ({comments.length})
                                </div>
                                <div className="comments-list">
                                    {comments.slice(0, 3).map((comment, index) => (
                                        <div key={index} className="comment-item">
                                            {typeof comment === 'string' ? comment : comment.message || comment.text}
                                        </div>
                                    ))}
                                    {comments.length > 3 && (
                                        <div className="comment-more">
                                            +{comments.length - 3} more comments
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Contact Info */}
                        <div className="preview-section">
                            {candidate?.email && (
                                <div className="preview-row contact-row">
                                    <Mail size={14} />
                                    {candidate.email}
                                </div>
                            )}
                            {(candidate?.phone || candidate?.candidate_phone) && (
                                <div className="preview-row contact-row">
                                    <Phone size={14} />
                                    {candidate.phone || candidate.candidate_phone}
                                </div>
                            )}
                            {candidate?.location && (
                                <div className="preview-row contact-row">
                                    <MapPin size={14} />
                                    {candidate.location}
                                </div>
                            )}
                        </div>
                    </div>
                </>,
                document.body
            )}
        </>
    );
};

export default CandidatePreviewCard;
