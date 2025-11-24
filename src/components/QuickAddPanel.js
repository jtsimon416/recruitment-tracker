import React, { useState, useEffect, useRef } from 'react';
import { useData } from '../contexts/DataContext';
import { useConfirmation } from '../contexts/ConfirmationContext';
import { X, Plus, Zap, Calendar } from 'lucide-react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import './QuickAddPanel.css';

// Utility: Extract name from LinkedIn URL (same as RecruiterOutreach)
function extractNameFromLinkedInURL(url) {
    try {
        const match = url.match(/linkedin\.com\/in\/([^\/\?]+)/i);
        if (!match) return null;

        const slug = match[1];
        const cleanSlug = slug.replace(/\/$/, '');
        const parts = cleanSlug.split('-');

        const lastPart = parts[parts.length - 1];
        if (/^\d+$/.test(lastPart)) {
            parts.pop();
        }

        const name = parts
            .map(word => {
                if (['mba', 'phd', 'md', 'cpa', 'cfa'].includes(word.toLowerCase())) {
                    return word.toUpperCase();
                }
                return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
            })
            .join(' ');

        return name || null;
    } catch (error) {
        console.error('Error extracting name from URL:', error);
        return null;
    }
}

const QuickAddPanel = ({ isOpen, onClose }) => {
    const [activeTab, setActiveTab] = useState('add'); // 'add' or 'actions'
    const [linkedInUrl, setLinkedInUrl] = useState('');
    const [selectedPosition, setSelectedPosition] = useState('');
    const [notes, setNotes] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCandidate, setSelectedCandidate] = useState(null);
    const [actionType, setActionType] = useState(''); // 'note', 'status', 'call'
    const [newNote, setNewNote] = useState('');
    const [newStatus, setNewStatus] = useState('');
    const [callDate, setCallDate] = useState(new Date());
    const [callPhone, setCallPhone] = useState('');
    const [processing, setProcessing] = useState(false);

    const inputRef = useRef(null);
    const { positions, outreachActivities, addOutreachActivity, updateOutreachActivity, userProfile } = useData();
    const { showConfirmation } = useConfirmation();

    // Focus input when opened
    useEffect(() => {
        if (isOpen) {
            setTimeout(() => {
                inputRef.current?.focus();
            }, 100);
        }
    }, [isOpen]);

    // Close on Escape
    useEffect(() => {
        const handleEscape = (e) => {
            if (e.key === 'Escape' && isOpen) {
                onClose();
            }
        };

        window.addEventListener('keydown', handleEscape);
        return () => window.removeEventListener('keydown', handleEscape);
    }, [isOpen, onClose]);

    // Reset form when closed
    useEffect(() => {
        if (!isOpen) {
            setLinkedInUrl('');
            setSelectedPosition('');
            setNotes('');
            setSearchQuery('');
            setSelectedCandidate(null);
            setActionType('');
            setNewNote('');
            setNewStatus('');
            setCallDate(new Date());
            setCallPhone('');
        }
    }, [isOpen]);

    // Search candidates from outreach activities
    const searchResults = outreachActivities
        ?.filter(activity =>
            activity.candidate_name?.toLowerCase().includes(searchQuery.toLowerCase())
        )
        .slice(0, 5) || [];

    // Handle Add LinkedIn Profile
    const handleAddProfile = async () => {
        if (!linkedInUrl.trim()) {
            showConfirmation({
                type: 'warning',
                title: 'Missing URL',
                message: 'Please paste a LinkedIn URL'
            });
            return;
        }

        if (!selectedPosition) {
            showConfirmation({
                type: 'warning',
                title: 'Missing Position',
                message: 'Please select a position'
            });
            return;
        }

        setProcessing(true);

        try {
            const extractedName = extractNameFromLinkedInURL(linkedInUrl);

            const activityData = {
                recruiter_id: userProfile.id,
                position_id: selectedPosition,
                linkedin_url: linkedInUrl,
                candidate_name: extractedName || 'Unknown Name',
                activity_status: 'outreach_sent',
                notes: notes ? [{ speaker: 'recruiter', message: notes, timestamp: new Date().toISOString() }] : [],
                rating: null
            };

            const { success, error } = await addOutreachActivity(activityData);

            if (success) {
                showConfirmation({
                    type: 'success',
                    title: 'Success!',
                    message: `Added ${extractedName || 'profile'} to outreach`
                });
                onClose();
            } else {
                throw error;
            }
        } catch (error) {
            showConfirmation({
                type: 'error',
                title: 'Error',
                message: `Failed to add profile: ${error?.message || 'Unknown error'}`
            });
        } finally {
            setProcessing(false);
        }
    };

    // Handle Quick Actions
    const handleQuickAction = async () => {
        if (!selectedCandidate) {
            showConfirmation({
                type: 'warning',
                title: 'No Candidate Selected',
                message: 'Please search and select a candidate first'
            });
            return;
        }

        if (!actionType) {
            showConfirmation({
                type: 'warning',
                title: 'No Action Selected',
                message: 'Please select an action (Note, Status, or Call)'
            });
            return;
        }

        setProcessing(true);

        try {
            let updates = { updated_at: new Date().toISOString() };

            if (actionType === 'note') {
                if (!newNote.trim()) {
                    showConfirmation({ type: 'warning', title: 'Empty Note', message: 'Please enter a note' });
                    setProcessing(false);
                    return;
                }
                const existingNotes = Array.isArray(selectedCandidate.notes) ? selectedCandidate.notes : [];
                updates.notes = [...existingNotes, {
                    speaker: 'recruiter',
                    message: newNote,
                    timestamp: new Date().toISOString()
                }];
            } else if (actionType === 'status') {
                if (!newStatus) {
                    showConfirmation({ type: 'warning', title: 'No Status', message: 'Please select a status' });
                    setProcessing(false);
                    return;
                }
                updates.activity_status = newStatus;
            } else if (actionType === 'call') {
                updates.activity_status = 'call_scheduled';
                updates.scheduled_call_date = callDate.toISOString();
                if (callPhone.trim()) {
                    updates.candidate_phone = callPhone;
                }
            }

            const { success, error } = await updateOutreachActivity(selectedCandidate.id, updates);

            if (success) {
                showConfirmation({
                    type: 'success',
                    title: 'Success!',
                    message: `Updated ${selectedCandidate.candidate_name}`
                });
                onClose();
            } else {
                throw error;
            }
        } catch (error) {
            showConfirmation({
                type: 'error',
                title: 'Error',
                message: `Failed to update: ${error?.message || 'Unknown error'}`
            });
        } finally {
            setProcessing(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="quick-add-overlay" onClick={onClose}>
            <div className="quick-add-container" onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="quick-add-header">
                    <h2>Quick Add</h2>
                    <button className="btn-close-quick" onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>

                {/* Tabs */}
                <div className="quick-add-tabs">
                    <button
                        className={`quick-tab ${activeTab === 'add' ? 'active' : ''}`}
                        onClick={() => setActiveTab('add')}
                    >
                        <Plus size={16} />
                        Add Profile
                    </button>
                    <button
                        className={`quick-tab ${activeTab === 'actions' ? 'active' : ''}`}
                        onClick={() => setActiveTab('actions')}
                    >
                        <Zap size={16} />
                        Quick Actions
                    </button>
                </div>

                {/* Tab Content */}
                <div className="quick-add-content">
                    {activeTab === 'add' && (
                        <div className="tab-panel">
                            <div className="form-group">
                                <label>LinkedIn URL *</label>
                                <input
                                    ref={inputRef}
                                    type="text"
                                    placeholder="https://linkedin.com/in/..."
                                    value={linkedInUrl}
                                    onChange={(e) => setLinkedInUrl(e.target.value)}
                                    className="quick-input"
                                />
                            </div>

                            <div className="form-group">
                                <label>Position *</label>
                                <select
                                    value={selectedPosition}
                                    onChange={(e) => setSelectedPosition(e.target.value)}
                                    className="quick-select"
                                >
                                    <option value="">Select Position</option>
                                    {positions?.filter(p => p.status === 'Open').map(pos => (
                                        <option key={pos.id} value={pos.id}>
                                            {pos.title} - {pos.clients?.company_name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="form-group">
                                <label>Quick Notes (Optional)</label>
                                <textarea
                                    placeholder="Add any initial notes..."
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    className="quick-textarea"
                                    rows={3}
                                />
                            </div>

                            <button
                                onClick={handleAddProfile}
                                disabled={processing}
                                className="btn-quick-submit"
                            >
                                {processing ? 'Adding...' : 'Add to Outreach'}
                            </button>
                        </div>
                    )}

                    {activeTab === 'actions' && (
                        <div className="tab-panel">
                            {/* Search Candidates */}
                            <div className="form-group">
                                <label>Search Candidate</label>
                                <input
                                    ref={inputRef}
                                    type="text"
                                    placeholder="Type candidate name..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="quick-input"
                                />
                            </div>

                            {/* Search Results */}
                            {searchQuery && searchResults.length > 0 && (
                                <div className="search-results">
                                    {searchResults.map(candidate => (
                                        <div
                                            key={candidate.id}
                                            className={`search-result-item ${selectedCandidate?.id === candidate.id ? 'selected' : ''}`}
                                            onClick={() => setSelectedCandidate(candidate)}
                                        >
                                            <div className="result-name">{candidate.candidate_name}</div>
                                            <div className="result-position">{candidate.positions?.title || 'No position'}</div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Action Selector */}
                            {selectedCandidate && (
                                <>
                                    <div className="form-group">
                                        <label>Select Action</label>
                                        <div className="action-buttons">
                                            <button
                                                className={`action-btn ${actionType === 'note' ? 'active' : ''}`}
                                                onClick={() => setActionType('note')}
                                            >
                                                📝 Add Note
                                            </button>
                                            <button
                                                className={`action-btn ${actionType === 'status' ? 'active' : ''}`}
                                                onClick={() => setActionType('status')}
                                            >
                                                🔄 Change Status
                                            </button>
                                            <button
                                                className={`action-btn ${actionType === 'call' ? 'active' : ''}`}
                                                onClick={() => setActionType('call')}
                                            >
                                                📞 Schedule Call
                                            </button>
                                        </div>
                                    </div>

                                    {/* Action Forms */}
                                    {actionType === 'note' && (
                                        <div className="form-group">
                                            <label>Note</label>
                                            <textarea
                                                placeholder="Enter your note..."
                                                value={newNote}
                                                onChange={(e) => setNewNote(e.target.value)}
                                                className="quick-textarea"
                                                rows={3}
                                            />
                                        </div>
                                    )}

                                    {actionType === 'status' && (
                                        <div className="form-group">
                                            <label>New Status</label>
                                            <select
                                                value={newStatus}
                                                onChange={(e) => setNewStatus(e.target.value)}
                                                className="quick-select"
                                            >
                                                <option value="">Select Status</option>
                                                <option value="outreach_sent">🟡 Outreach Sent</option>
                                                <option value="reply_received">🟢 Reply Received</option>
                                                <option value="accepted">✅ Accepted</option>
                                                <option value="call_scheduled">🔵 Call Scheduled</option>
                                                <option value="declined">❌ Declined</option>
                                                <option value="ready_for_submission">🚀 Ready for Submission</option>
                                                <option value="gone_cold">❄️ Gone Cold</option>
                                            </select>
                                        </div>
                                    )}

                                    {actionType === 'call' && (
                                        <>
                                            <div className="form-group">
                                                <label>Call Date & Time</label>
                                                <DatePicker
                                                    selected={callDate}
                                                    onChange={(date) => setCallDate(date)}
                                                    showTimeSelect
                                                    timeFormat="HH:mm"
                                                    timeIntervals={15}
                                                    dateFormat="MMMM d, yyyy h:mm aa"
                                                    className="quick-input"
                                                    minDate={new Date()}
                                                />
                                            </div>
                                            <div className="form-group">
                                                <label>Phone Number (Optional)</label>
                                                <input
                                                    type="tel"
                                                    placeholder="e.g., 416-555-1234"
                                                    value={callPhone}
                                                    onChange={(e) => setCallPhone(e.target.value)}
                                                    className="quick-input"
                                                />
                                            </div>
                                        </>
                                    )}

                                    <button
                                        onClick={handleQuickAction}
                                        disabled={processing}
                                        className="btn-quick-submit"
                                    >
                                        {processing ? 'Updating...' : 'Save'}
                                    </button>
                                </>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default QuickAddPanel;
