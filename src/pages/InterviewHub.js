import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../services/supabaseClient';
import { useConfirmation } from '../contexts/ConfirmationContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar as CalendarIcon,
  Calendar,
  Clock,
  Users,
  Plus,
  ChevronDown,
  ChevronUp,
  Star,
  History,
  CheckCircle,
  X,
  AlertCircle,
  Search,
  Edit,
  Trash2
} from 'lucide-react';
import { Calendar as BigCalendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import '../styles/InterviewHub.css';

const localizer = momentLocalizer(moment);

// =========================================================================
// STATISTICS TAB
// =========================================================================
const StatisticsTab = ({ interviews }) => {
  const stats = useMemo(() => {
    const total = interviews.length;
    const withOutcome = interviews.filter(i => i.outcome);
    const passed = interviews.filter(i => i.outcome?.toLowerCase() === 'passed').length;
    const failed = interviews.filter(i => i.outcome?.toLowerCase() === 'failed').length;
    const hold = interviews.filter(i => i.outcome?.toLowerCase() === 'hold').length;
    const pending = total - withOutcome.length;

    const passRate = withOutcome.length > 0 ? ((passed / withOutcome.length) * 100).toFixed(1) : 0;

    // Unique positions
    const uniquePositions = new Set(interviews.map(i => i.position_id)).size;
    const avgPerPosition = uniquePositions > 0 ? (total / uniquePositions).toFixed(1) : 0;

    // This month's interviews
    const thisMonth = interviews.filter(i => {
      const date = new Date(i.interview_date);
      const now = new Date();
      return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
    }).length;

    // Upcoming vs past
    const now = new Date();
    const upcoming = interviews.filter(i => new Date(i.interview_date) > now).length;
    const completed = total - upcoming;

    return {
      total,
      passed,
      failed,
      hold,
      pending,
      passRate,
      avgPerPosition,
      thisMonth,
      upcoming,
      completed,
      uniquePositions
    };
  }, [interviews]);

  const cards = [
    {
      title: 'Total Interviews',
      value: stats.total,
      subtitle: `${stats.upcoming} upcoming`,
      icon: CalendarIcon,
      color: 'blue',
      trend: stats.thisMonth > 0 ? `${stats.thisMonth} this month` : null
    },
    {
      title: 'Pass Rate',
      value: `${stats.passRate}%`,
      subtitle: `${stats.passed} passed`,
      icon: CheckCircle,
      color: 'green',
      trend: stats.passed > 0 ? `${stats.passed}/${stats.completed} completed` : null
    },
    {
      title: 'On Hold',
      value: stats.hold,
      subtitle: 'Awaiting decision',
      icon: Clock,
      color: 'orange',
      trend: stats.pending > 0 ? `${stats.pending} pending feedback` : null
    },
    {
      title: 'Avg per Position',
      value: stats.avgPerPosition,
      subtitle: `${stats.uniquePositions} positions`,
      icon: Star,
      color: 'purple',
      trend: stats.uniquePositions > 0 ? 'Active roles' : null
    }
  ];

  return (
    <motion.div
      className="statistics-tab-container"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3 }}
    >
      <div className="stats-grid">
        {cards.map((card, index) => {
          const Icon = card.icon;
          return (
            <motion.div
              key={card.title}
              className={`stat-card stat-card-${card.color}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ y: -4, boxShadow: '0 12px 40px rgba(232, 180, 184, 0.25)' }}
            >
              <div className="stat-card-header">
                <div className={`stat-icon stat-icon-${card.color}`}>
                  <Icon size={24} />
                </div>
                <span className="stat-title">{card.title}</span>
              </div>
              <div className="stat-value">{card.value}</div>
              <div className="stat-subtitle">{card.subtitle}</div>
              {card.trend && <div className="stat-trend">{card.trend}</div>}
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
};

// =========================================================================
// TAB NAVIGATION
// =========================================================================
const TabNavigation = ({ activeTab, setActiveTab, upcomingCount }) => {
  const tabs = [
    { id: 'upcoming', label: 'Upcoming Interviews', icon: Clock, badge: upcomingCount },
    { id: 'history', label: 'Interview History', icon: History },
    { id: 'calendar', label: 'Calendar View', icon: CalendarIcon },
    { id: 'statistics', label: 'Statistics', icon: Star },
    { id: 'schedule', label: 'Schedule New', icon: Plus }
  ];

  return (
    <div className="interview-hub-tabs">
      {tabs.map(tab => {
        const Icon = tab.icon;
        return (
          <motion.button
            key={tab.id}
            className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Icon size={18} />
            <span>{tab.label}</span>
            {tab.badge > 0 && <span className="tab-badge">{tab.badge}</span>}
          </motion.button>
        );
      })}
    </div>
  );
};

// =========================================================================
// UPCOMING INTERVIEWS TAB
// =========================================================================
const UpcomingInterviewsTab = ({ interviews, onAddFeedback, onViewHistory, onEdit, onDelete }) => {
  if (interviews.length === 0) {
    return (
      <motion.div
        className="empty-state"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <CalendarIcon size={64} className="empty-icon" />
        <h3>No Upcoming Interviews</h3>
        <p>Schedule your first interview to get started!</p>
      </motion.div>
    );
  }

  return (
    <div className="upcoming-interviews-grid">
      {interviews.map((interview, index) => (
        <motion.div
          key={interview.id}
          className="interview-card upcoming"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.05 }}
        >
          <div className="interview-card-header">
            <div className="candidate-section">
              <div className="candidate-avatar">
                {interview.candidates?.name?.charAt(0) || '?'}
              </div>
              <div className="candidate-info">
                <h3 className="candidate-name">{interview.candidates?.name || 'Unknown'}</h3>
                <p className="position-title">{interview.positions?.title || 'N/A'}</p>
                <p className="company-name">{interview.positions?.clients?.company_name || 'N/A'}</p>
              </div>
            </div>
          </div>

          <div className="interview-card-body">
            <div className="interview-detail">
              <CalendarIcon size={16} />
              <span>{new Date(interview.interview_date).toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'short',
                day: 'numeric',
                year: 'numeric'
              })}</span>
            </div>
            <div className="interview-detail">
              <Clock size={16} />
              <span>{new Date(interview.interview_date).toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
                hour12: true
              })}</span>
            </div>
            {interview.interview_type && (
              <div className="interview-detail">
                <Star size={16} />
                <span>{interview.interview_type}</span>
              </div>
            )}
            {interview.interviewer_name && (
              <div className="interview-detail">
                <Users size={16} />
                <span>{interview.interviewer_name}</span>
              </div>
            )}
          </div>

          <div className="interview-card-actions">
            <button
              className="btn-action btn-primary"
              onClick={() => onAddFeedback(interview)}
            >
              <CheckCircle size={16} />
              Add Feedback
            </button>
            <button
              className="btn-action btn-secondary"
              onClick={() => onViewHistory(interview.candidate_id, interview.position_id, interview.candidates, interview.positions)}
            >
              <History size={16} />
              View History
            </button>
            <button
              className="btn-action btn-secondary"
              onClick={() => onEdit(interview)}
              title="Edit Interview"
            >
              <Edit size={16} />
            </button>
            <button
              className="btn-action btn-danger"
              onClick={() => onDelete(interview)}
              title="Delete Interview"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </motion.div>
      ))}
    </div>
  );
};

// =========================================================================
// INTERVIEW HISTORY TAB
// =========================================================================
const InterviewHistoryTab = ({ interviews, onViewDetails }) => {
  const [expandedCandidate, setExpandedCandidate] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPosition, setFilterPosition] = useState('');

  // Group interviews by candidate
  const groupedInterviews = useMemo(() => {
    const groups = {};

    interviews.forEach(interview => {
      const key = `${interview.candidate_id}_${interview.position_id}`;
      if (!groups[key]) {
        groups[key] = {
          candidate_id: interview.candidate_id,
          position_id: interview.position_id,
          candidate_name: interview.candidates?.name || 'Unknown',
          position_title: interview.positions?.title || 'N/A',
          company_name: interview.positions?.clients?.company_name || 'N/A',
          interviews: [],
          latest_date: interview.interview_date,
          overall_outcome: null
        };
      }
      groups[key].interviews.push(interview);

      // Determine overall outcome (last interview's outcome)
      if (interview.outcome) {
        groups[key].overall_outcome = interview.outcome;
      }
    });

    // Sort interviews within each group by date
    Object.values(groups).forEach(group => {
      group.interviews.sort((a, b) => new Date(a.interview_date) - new Date(b.interview_date));
      group.latest_date = group.interviews[group.interviews.length - 1].interview_date;
    });

    return Object.values(groups).sort((a, b) => new Date(b.latest_date) - new Date(a.latest_date));
  }, [interviews]);

  // Filter grouped interviews
  const filteredGroups = useMemo(() => {
    return groupedInterviews.filter(group => {
      const matchesSearch = group.candidate_name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesPosition = !filterPosition || group.position_id === filterPosition;
      return matchesSearch && matchesPosition;
    });
  }, [groupedInterviews, searchQuery, filterPosition]);

  // Get unique positions for filter
  const positions = useMemo(() => {
    const posMap = {};
    interviews.forEach(i => {
      if (i.position_id && !posMap[i.position_id]) {
        posMap[i.position_id] = {
          id: i.position_id,
          title: i.positions?.title || 'N/A'
        };
      }
    });
    return Object.values(posMap);
  }, [interviews]);

  if (interviews.length === 0) {
    return (
      <motion.div
        className="empty-state"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <History size={64} className="empty-icon" />
        <h3>No Interview History</h3>
        <p>Past interviews will appear here once completed.</p>
      </motion.div>
    );
  }

  return (
    <div className="history-tab-container">
      <div className="history-controls">
        <div className="search-box">
          <Search size={18} className="icon" />
          <input
            type="text"
            placeholder="Search candidates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <select
          value={filterPosition}
          onChange={(e) => setFilterPosition(e.target.value)}
          className="filter-button"
        >
          <option value="">All Positions</option>
          {positions.map(pos => (
            <option key={pos.id} value={pos.id}>{pos.title}</option>
          ))}
        </select>
      </div>

      <div className="candidate-history-list">
        {filteredGroups.map((group, index) => {
          const isExpanded = expandedCandidate === `${group.candidate_id}_${group.position_id}`;

          return (
            <motion.div
              key={`${group.candidate_id}_${group.position_id}`}
              className="candidate-history-card"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <div
                className="history-card-header"
                onClick={() => setExpandedCandidate(isExpanded ? null : `${group.candidate_id}_${group.position_id}`)}
              >
                <div className="history-candidate-info">
                  <div className="candidate-avatar">
                    {group.candidate_name.charAt(0)}
                  </div>
                  <div className="candidate-info">
                    <h3 className="candidate-name">{group.candidate_name}</h3>
                    <p className="position-title">{group.position_title}</p>
                    <p className="company-name">{group.company_name}</p>
                  </div>
                </div>
                <div className="history-meta">
                  <div className="interview-count-badge">
                    <Calendar size={16} />
                    {group.interviews.length} interview{group.interviews.length !== 1 ? 's' : ''}
                  </div>
                  {group.overall_outcome && (
                    <span className={`outcome-badge ${group.overall_outcome.toLowerCase()}`}>
                      {group.overall_outcome}
                    </span>
                  )}
                  <ChevronDown size={20} className={`expand-icon ${isExpanded ? 'expanded' : ''}`} />
                </div>
              </div>

              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    className="history-card-body"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <div className="interview-timeline">
                      {group.interviews.map((interview, idx) => (
                        <div key={interview.id} className="timeline-item">
                          <div className="timeline-dot"></div>
                          <div className="timeline-content">
                            <div className="timeline-header">
                              <span className="timeline-round">
                                Round {idx + 1}{interview.interview_type && ` - ${interview.interview_type}`}
                              </span>
                              <span className="timeline-date">
                                {new Date(interview.interview_date).toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric'
                                })}
                              </span>
                            </div>
                            <div className="timeline-details">
                              <div className="timeline-detail">
                                <Clock size={14} className="icon" />
                                {new Date(interview.interview_date).toLocaleTimeString('en-US', {
                                  hour: 'numeric',
                                  minute: '2-digit'
                                })}
                              </div>
                              {interview.interviewer_name && (
                                <div className="timeline-detail">
                                  <Users size={14} className="icon" />
                                  {interview.interviewer_name}
                                </div>
                              )}
                              {interview.outcome && (
                                <div className="timeline-detail">
                                  <span className={`outcome-badge ${interview.outcome.toLowerCase()}`}>
                                    {interview.outcome}
                                  </span>
                                </div>
                              )}
                            </div>
                            {interview.feedback && (
                              <div className="timeline-feedback">
                                {interview.feedback}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>

      {filteredGroups.length === 0 && (
        <div className="no-results">
          <AlertCircle size={48} />
          <p>No interviews match your filters</p>
        </div>
      )}
    </div>
  );
};

// =========================================================================
// CALENDAR VIEW TAB
// =========================================================================
const CalendarViewTab = ({ interviews, onSelectInterview }) => {
  const [view, setView] = useState('month');
  const [date, setDate] = useState(new Date());

  // Transform interviews into calendar events
  const events = useMemo(() => {
    return interviews.map(interview => {
      const start = new Date(interview.interview_date);
      const end = new Date(start.getTime() + 60 * 60 * 1000); // 1 hour default

      return {
        id: interview.id,
        title: `${interview.candidates?.name || 'Unknown'} - ${interview.positions?.title || 'N/A'}`,
        start,
        end,
        resource: interview,
        outcome: interview.outcome || 'pending'
      };
    });
  }, [interviews]);

  // Custom event styling based on outcome - improved contrast
  const eventStyleGetter = (event) => {
    let backgroundColor = '#4a5578'; // pending/default - darker muted blue
    let borderColor = '#6b7aa1';
    let textColor = '#e8eaf6';

    switch (event.outcome?.toLowerCase()) {
      case 'passed':
        backgroundColor = '#86b6ac'; // darker green pastel
        borderColor = '#6a9a8f';
        textColor = '#1a2f2a';
        break;
      case 'failed':
        backgroundColor = '#d66b82'; // darker red pastel
        borderColor = '#c24860';
        textColor = '#2a1419';
        break;
      case 'hold':
        backgroundColor = '#e0884e'; // darker orange pastel
        borderColor = '#c97233';
        textColor = '#2a1e10';
        break;
      default:
        backgroundColor = '#6891e0'; // darker blue for upcoming
        borderColor = '#4a73c7';
        textColor = '#1a2635';
    }

    return {
      style: {
        backgroundColor,
        borderColor,
        borderLeft: `4px solid ${borderColor}`,
        borderRadius: '6px',
        color: textColor,
        fontWeight: '600',
        fontSize: '0.9rem',
        padding: '4px 8px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
        border: `1px solid ${borderColor}`
      }
    };
  };

  const handleSelectEvent = (event) => {
    onSelectInterview(event.resource);
  };

  const handleNavigate = (newDate) => {
    setDate(newDate);
  };

  const handleViewChange = (newView) => {
    setView(newView);
  };

  return (
    <motion.div
      className="calendar-tab-container"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3 }}
    >
      <div className="calendar-header">
        <div className="calendar-legend">
          <div className="legend-item">
            <span className="legend-dot upcoming"></span>
            <span>Upcoming</span>
          </div>
          <div className="legend-item">
            <span className="legend-dot passed"></span>
            <span>Passed</span>
          </div>
          <div className="legend-item">
            <span className="legend-dot failed"></span>
            <span>Failed</span>
          </div>
          <div className="legend-item">
            <span className="legend-dot hold"></span>
            <span>On Hold</span>
          </div>
          <div className="legend-item">
            <span className="legend-dot pending"></span>
            <span>Pending</span>
          </div>
        </div>
      </div>

      <div className="calendar-wrapper">
        <BigCalendar
          localizer={localizer}
          events={events}
          startAccessor="start"
          endAccessor="end"
          style={{ height: 700 }}
          view={view}
          date={date}
          onNavigate={handleNavigate}
          onView={handleViewChange}
          onSelectEvent={handleSelectEvent}
          eventPropGetter={eventStyleGetter}
          views={['month', 'week', 'day', 'agenda']}
          popup
          selectable
          tooltipAccessor={(event) => `${event.title}\n${moment(event.start).format('h:mm A')}`}
        />
      </div>
    </motion.div>
  );
};

// =========================================================================
// SCHEDULE NEW INTERVIEW TAB
// =========================================================================
const ScheduleNewTab = ({
  positions,
  candidates,
  pipeline,
  formData,
  setFormData,
  onSubmit,
  editingInterview
}) => {
  const [filteredCandidates, setFilteredCandidates] = useState([]);

  useEffect(() => {
    if (formData.position_id) {
      const pipelineForPosition = pipeline.filter(p => p.position_id === formData.position_id);
      const candidateIds = pipelineForPosition.map(p => p.candidate_id);
      const candidatesInPipeline = candidates.filter(c => candidateIds.includes(c.id));
      setFilteredCandidates(candidatesInPipeline);
    } else {
      setFilteredCandidates([]);
    }
  }, [formData.position_id, pipeline, candidates]);

  return (
    <motion.div
      className="schedule-tab-container"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="schedule-form-header">
        <h2>{editingInterview ? 'Edit Interview' : 'Schedule New Interview'}</h2>
        <p>{editingInterview ? 'Update the interview details below' : 'Select a position and candidate to schedule an interview'}</p>
      </div>

      <form className="schedule-form" onSubmit={onSubmit}>
        <div className="form-section">
          <h3>Step 1: Position & Candidate</h3>
          <div className="form-row">
            <div className="form-group">
              <label>Position *</label>
              <select
                required
                value={formData.position_id}
                onChange={(e) => setFormData({ ...formData, position_id: e.target.value, candidate_id: '' })}
              >
                <option value="">Select position...</option>
                {positions.map(pos => (
                  <option key={pos.id} value={pos.id}>
                    {pos.title} - {pos.clients?.company_name}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Candidate *</label>
              <select
                required
                disabled={!formData.position_id}
                value={formData.candidate_id}
                onChange={(e) => setFormData({ ...formData, candidate_id: e.target.value })}
              >
                <option value="">
                  {formData.position_id ? 'Select candidate...' : 'Select a position first'}
                </option>
                {filteredCandidates.map(candidate => (
                  <option key={candidate.id} value={candidate.id}>
                    {candidate.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="form-section">
          <h3>Step 2: Interview Details</h3>
          <div className="form-row">
            <div className="form-group">
              <label>Interview Date & Time *</label>
              <input
                type="datetime-local"
                required
                value={formData.interview_date}
                onChange={(e) => setFormData({ ...formData, interview_date: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>Interview Type</label>
              <input
                type="text"
                placeholder="e.g., Technical Screen, Final Round"
                value={formData.interview_type}
                onChange={(e) => setFormData({ ...formData, interview_type: e.target.value })}
              />
            </div>
          </div>
        </div>

        <div className="form-section">
          <h3>Step 3: Optional Details</h3>
          <div className="form-group">
            <label>Interviewer Name</label>
            <input
              type="text"
              placeholder="Who will conduct this interview?"
              value={formData.interviewer_name}
              onChange={(e) => setFormData({ ...formData, interviewer_name: e.target.value })}
            />
          </div>
        </div>

        <div className="form-actions">
          <button type="submit" className="btn-submit">
            {editingInterview ? (
              <>
                <CheckCircle size={20} />
                Update Interview
              </>
            ) : (
              <>
                <Plus size={20} />
                Schedule Interview
              </>
            )}
          </button>
        </div>
      </form>
    </motion.div>
  );
};

// =========================================================================
// MAIN INTERVIEW HUB COMPONENT
// =========================================================================
function InterviewHub() {
  const { showConfirmation } = useConfirmation();

  // Core Data
  const [interviews, setInterviews] = useState([]);
  const [positions, setPositions] = useState([]);
  const [candidates, setCandidates] = useState([]);
  const [pipeline, setPipeline] = useState([]);
  const [loading, setLoading] = useState(true);

  // UI State
  const [activeTab, setActiveTab] = useState('upcoming');

  // Modal State
  const [modalState, setModalState] = useState({
    mode: 'closed', // 'closed', 'feedback', 'scheduleNext', 'history'
    data: null
  });

  // Form Data States
  const [scheduleFormData, setScheduleFormData] = useState({
    candidate_id: '',
    position_id: '',
    interview_date: '',
    interview_type: '',
    interviewer_name: '',
  });

  const [feedbackFormData, setFeedbackFormData] = useState({
    feedback: '',
  });

  const [interviewHistory, setInterviewHistory] = useState([]);

  const stages = ['Screening', 'Submit to Client', 'Interview 1', 'Interview 2', 'Interview 3', 'Offer', 'Hired'];

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [interviewsRes, positionsRes, candidatesRes, pipelineRes] = await Promise.all([
        supabase.from('interviews').select(`*, candidates(name, email), positions(title, clients(company_name))`).order('interview_date', { ascending: false }),
        supabase.from('positions').select('*, clients(company_name)').eq('status', 'Open'),
        supabase.from('candidates').select('*').order('name'),
        supabase.from('pipeline').select('*')
      ]);

      if (interviewsRes.error) throw interviewsRes.error;
      if (positionsRes.error) throw positionsRes.error;
      if (candidatesRes.error) throw candidatesRes.error;
      if (pipelineRes.error) throw pipelineRes.error;

      setInterviews(interviewsRes.data || []);
      setPositions(positionsRes.data || []);
      setCandidates(candidatesRes.data || []);
      setPipeline(pipelineRes.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      showConfirmation({
        type: 'error',
        title: 'Error',
        message: 'Failed to load interview data. Please refresh the page.'
      });
    } finally {
      setLoading(false);
    }
  };

  const resetScheduleForm = () => {
    setScheduleFormData({
      candidate_id: '',
      position_id: '',
      interview_date: '',
      interview_type: '',
      interviewer_name: '',
    });
    // Clear editing state
    if (modalState.data?.editingInterview) {
      setModalState({ mode: 'closed', data: {} });
    }
  };

  const closeModal = () => {
    setModalState({ mode: 'closed', data: null });
    setFeedbackFormData({ feedback: '' });
    setInterviewHistory([]);
  };

  const handleScheduleSubmit = async (e) => {
    e.preventDefault();
    const editingInterview = modalState.data?.editingInterview;

    try {
      // The datetime-local input gives us "YYYY-MM-DDTHH:mm" which represents LOCAL time
      // We need to convert this to ISO format so Supabase stores it correctly
      const interviewData = { ...scheduleFormData };

      if (interviewData.interview_date) {
        // Parse the datetime-local string as a local date
        // datetime-local format: "YYYY-MM-DDTHH:mm"
        const localDateStr = interviewData.interview_date;

        // Create a Date object from the local datetime string
        // This interprets the string as local time
        const localDate = new Date(localDateStr);

        // Convert to ISO string (which will be in UTC)
        // This is what we store in the database
        interviewData.interview_date = localDate.toISOString();
      }

      if (editingInterview) {
        // Update existing interview
        const { error } = await supabase
          .from('interviews')
          .update(interviewData)
          .eq('id', editingInterview.id);

        if (error) throw error;

        showConfirmation({
          type: 'success',
          title: 'Success!',
          message: 'Interview updated successfully!'
        });
      } else {
        // Insert new interview
        const { error } = await supabase.from('interviews').insert([interviewData]);
        if (error) throw error;

        showConfirmation({
          type: 'success',
          title: 'Success!',
          message: 'Interview scheduled successfully!'
        });
      }

      resetScheduleForm();
      closeModal();
      fetchData();
      setActiveTab('upcoming'); // Switch to upcoming tab to see the interview
    } catch (error) {
      console.error('Error scheduling interview:', error);
      showConfirmation({
        type: 'error',
        title: 'Error',
        message: editingInterview ? 'Error updating interview. Please try again.' : 'Error scheduling interview. Please try again.'
      });
    }
  };

  const handleFeedbackSubmit = async (decision) => {
    const { interview } = modalState.data;

    try {
      // Save feedback and outcome
      const { error: interviewError } = await supabase.from('interviews').update({
        feedback: feedbackFormData.feedback,
        outcome: decision === 'advance' ? 'Passed' : decision === 'hold' ? 'Hold' : decision === 'reject' ? 'Failed' : null,
      }).eq('id', interview.id);

      if (interviewError) throw interviewError;

      // Find pipeline entry
      const { data: pipelineEntries, error: pipelineError } = await supabase
        .from('pipeline')
        .select('*')
        .eq('candidate_id', interview.candidate_id)
        .eq('position_id', interview.position_id);

      if (pipelineError || !pipelineEntries || pipelineEntries.length === 0) {
        showConfirmation({
          type: 'info',
          title: 'Feedback Saved',
          message: 'Feedback saved! (Candidate not found in active pipeline for this role).'
        });
        closeModal();
        fetchData();
        return;
      }

      const pipelineEntry = pipelineEntries[0];

      // Handle decision
      if (decision === 'advance') {
        const currentStageIndex = stages.indexOf(pipelineEntry.stage);
        const nextStage = stages[currentStageIndex + 1] || 'Offer';

        await supabase.from('pipeline').update({ stage: nextStage, status: 'Active' }).eq('id', pipelineEntry.id);

        // Show schedule next interview option
        setModalState({
          mode: 'scheduleNext',
          data: {
            candidate: interview.candidates,
            position: interview.positions,
            nextStage: nextStage
          }
        });

        setScheduleFormData({
          ...scheduleFormData,
          candidate_id: interview.candidate_id,
          position_id: interview.position_id,
          interview_type: nextStage,
        });

      } else if (decision === 'hold') {
        await supabase.from('pipeline').update({ status: 'Hold' }).eq('id', pipelineEntry.id);
        showConfirmation({
          type: 'success',
          title: 'Success!',
          message: 'Feedback saved and candidate is now On Hold.'
        });
        closeModal();
        fetchData();

      } else if (decision === 'reject') {
        await supabase.from('pipeline').update({ status: 'Reject' }).eq('id', pipelineEntry.id);
        showConfirmation({
          type: 'success',
          title: 'Success!',
          message: 'Feedback saved and candidate has been rejected.'
        });
        closeModal();
        fetchData();

      } else { // 'save'
        showConfirmation({
          type: 'success',
          title: 'Success!',
          message: 'Feedback saved!'
        });
        closeModal();
        fetchData();
      }

    } catch (error) {
      console.error('Error processing decision:', error);
      showConfirmation({
        type: 'error',
        title: 'Error',
        message: 'An error occurred. Please try again.'
      });
    }
  };

  const openFeedbackModal = (interview) => {
    setModalState({ mode: 'feedback', data: { interview } });
    setFeedbackFormData({ feedback: interview.feedback || '' });
  };

  const openHistoryModal = async (candidateId, positionId, candidateInfo, positionInfo) => {
    if (!candidateId || !positionId) {
      showConfirmation({
        type: 'error',
        title: 'Error',
        message: 'Unable to load interview history. Missing candidate or position information.'
      });
      return;
    }

    setModalState({ mode: 'history', data: { candidate: candidateInfo, position: positionInfo } });

    const { data, error } = await supabase
      .from('interviews')
      .select('*')
      .eq('candidate_id', candidateId)
      .eq('position_id', positionId)
      .order('interview_date', { ascending: true });

    if (error) {
      console.error('Error fetching history:', error);
      showConfirmation({
        type: 'error',
        title: 'Error',
        message: `Error loading interview history: ${error.message}`
      });
    } else {
      setInterviewHistory(data || []);
    }
  };

  const handleEditInterview = (interview) => {
    // Format the interview_date for datetime-local input (YYYY-MM-DDTHH:mm)
    let formattedDateTime = '';
    if (interview.interview_date) {
      const date = new Date(interview.interview_date);
      // Format as YYYY-MM-DDTHH:mm for datetime-local input
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      formattedDateTime = `${year}-${month}-${day}T${hours}:${minutes}`;
    }

    // Populate the schedule form with existing interview data
    setScheduleFormData({
      candidate_id: interview.candidate_id || '',
      position_id: interview.position_id || '',
      interview_date: formattedDateTime,
      interviewer_name: interview.interviewer_name || '',
      interview_type: interview.interview_type || '',
    });

    // Store the interview being edited in modal state (for submit handler to know)
    // but close any open modal and switch to schedule tab
    setModalState({
      mode: 'closed',
      data: { editingInterview: interview }
    });
    setActiveTab('schedule');
  };

  const handleDeleteInterview = async (interview) => {
    const confirmed = await showConfirmation({
      type: 'warning',
      title: 'Delete Interview',
      message: `Are you sure you want to delete the interview with ${interview.candidates?.name || 'this candidate'} for ${interview.positions?.title || 'this position'}? This action cannot be undone.`,
      confirmText: 'Delete',
      cancelText: 'Cancel'
    });

    if (!confirmed) return;

    try {
      const { error } = await supabase
        .from('interviews')
        .delete()
        .eq('id', interview.id);

      if (error) throw error;

      showConfirmation({
        type: 'success',
        title: 'Interview Deleted',
        message: 'The interview has been successfully deleted.'
      });

      fetchData();
    } catch (error) {
      console.error('Error deleting interview:', error);
      showConfirmation({
        type: 'error',
        title: 'Error',
        message: 'Failed to delete interview. Please try again.'
      });
    }
  };

  // Split interviews
  const now = new Date();
  const upcomingInterviews = interviews
    .filter(i => new Date(i.interview_date) >= now)
    .sort((a, b) => new Date(a.interview_date) - new Date(b.interview_date));

  const pastInterviews = interviews
    .filter(i => new Date(i.interview_date) < now)
    .sort((a, b) => new Date(b.interview_date) - new Date(a.interview_date));

  if (loading) {
    return (
      <div className="interview-hub-page">
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading interviews...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="interview-hub-page">
      {/* Header */}
      <motion.div
        className="page-header"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div>
          <h1>Interview Hub</h1>
          <p>Manage and track all candidate interviews</p>
        </div>
      </motion.div>

      {/* Tab Navigation */}
      <TabNavigation
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        upcomingCount={upcomingInterviews.length}
      />

      {/* Tab Content */}
      <div className="tab-content">
        {activeTab === 'upcoming' && (
          <UpcomingInterviewsTab
            interviews={upcomingInterviews}
            onAddFeedback={openFeedbackModal}
            onViewHistory={openHistoryModal}
            onEdit={handleEditInterview}
            onDelete={handleDeleteInterview}
          />
        )}

        {activeTab === 'history' && (
          <InterviewHistoryTab
            interviews={pastInterviews}
            onViewDetails={openFeedbackModal}
          />
        )}

        {activeTab === 'calendar' && (
          <CalendarViewTab
            interviews={interviews}
            onSelectInterview={openFeedbackModal}
          />
        )}

        {activeTab === 'statistics' && (
          <StatisticsTab interviews={interviews} />
        )}

        {activeTab === 'schedule' && (
          <ScheduleNewTab
            positions={positions}
            candidates={candidates}
            pipeline={pipeline}
            formData={scheduleFormData}
            setFormData={setScheduleFormData}
            onSubmit={handleScheduleSubmit}
            editingInterview={modalState.data?.editingInterview}
          />
        )}
      </div>

      {/* Modals */}
      <AnimatePresence>
        {modalState.mode !== 'closed' && (
          <motion.div
            className="modal-overlay"
            onClick={closeModal}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className={`modal-content ${modalState.mode === 'history' ? 'history-modal' : ''}`}
              onClick={(e) => e.stopPropagation()}
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ type: 'spring', duration: 0.3 }}
            >
              <button className="modal-close-btn" onClick={closeModal}>
                <X size={20} />
              </button>

              {modalState.mode === 'feedback' && (
                <>
                  <h2>Add Feedback & Decide</h2>
                  <p className="modal-subtitle">
                    {modalState.data.interview.candidates?.name} for {modalState.data.interview.positions?.title}
                  </p>
                  <div className="form-group">
                    <label>Interview Feedback & Notes</label>
                    <textarea
                      rows="6"
                      placeholder="Record observations, strengths, concerns, and recommendation..."
                      value={feedbackFormData.feedback}
                      onChange={(e) => setFeedbackFormData({ ...feedbackFormData, feedback: e.target.value })}
                    />
                  </div>
                  <div className="decision-buttons">
                    <button className="decision-btn advance" onClick={() => handleFeedbackSubmit('advance')}>
                      <CheckCircle size={18} />
                      Advance to Next Stage
                    </button>
                    <button className="decision-btn hold" onClick={() => handleFeedbackSubmit('hold')}>
                      <Clock size={18} />
                      Hold / Pending
                    </button>
                    <button className="decision-btn reject" onClick={() => handleFeedbackSubmit('reject')}>
                      <X size={18} />
                      Reject Candidate
                    </button>
                    <button className="decision-btn save" onClick={() => handleFeedbackSubmit('save')}>
                      Save Feedback Only
                    </button>
                  </div>
                </>
              )}

              {modalState.mode === 'scheduleNext' && (
                <form onSubmit={handleScheduleSubmit}>
                  <h2>Schedule Next Interview: {modalState.data.nextStage}</h2>
                  <p className="modal-subtitle">
                    {modalState.data.candidate.name} for {modalState.data.position.title}
                  </p>
                  <div className="form-group">
                    <label>Interview Date & Time *</label>
                    <input
                      type="datetime-local"
                      required
                      value={scheduleFormData.interview_date}
                      onChange={(e) => setScheduleFormData({ ...scheduleFormData, interview_date: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label>Interview Type</label>
                    <input
                      type="text"
                      value={scheduleFormData.interview_type}
                      onChange={(e) => setScheduleFormData({ ...scheduleFormData, interview_type: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label>Interviewer Name</label>
                    <input
                      type="text"
                      value={scheduleFormData.interviewer_name}
                      onChange={(e) => setScheduleFormData({ ...scheduleFormData, interviewer_name: e.target.value })}
                    />
                  </div>
                  <div className="modal-actions">
                    <button type="button" className="btn-secondary" onClick={closeModal}>
                      Cancel
                    </button>
                    <button type="submit" className="btn-primary">
                      Schedule Interview
                    </button>
                  </div>
                </form>
              )}

              {modalState.mode === 'history' && (
                <>
                  <h2>Interview History</h2>
                  <p className="modal-subtitle">
                    {modalState.data.candidate.name} for {modalState.data.position.title}
                  </p>
                  {interviewHistory.length > 0 ? (
                    <div className="history-timeline-modal">
                      {interviewHistory.map((interview, idx) => (
                        <div key={interview.id} className="history-item-modal">
                          <div className="history-marker">{idx + 1}</div>
                          <div className="history-content-modal">
                            <h4>{interview.interview_type || 'Interview'}</h4>
                            {interview.outcome && (
                              <span className={`outcome-badge ${interview.outcome.toLowerCase()}`}>
                                {interview.outcome}
                              </span>
                            )}
                            <p className="history-date">
                              {new Date(interview.interview_date).toLocaleString()}
                            </p>
                            {interview.interviewer_name && (
                              <p className="history-interviewer">
                                Interviewer: {interview.interviewer_name}
                              </p>
                            )}
                            {interview.feedback && (
                              <div className="history-feedback-box">
                                <strong>Feedback:</strong>
                                <p>{interview.feedback}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="no-history">No interview history found for this candidate on this role.</p>
                  )}
                  <div className="modal-actions centered">
                    <button className="btn-secondary" onClick={closeModal}>
                      Close
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default InterviewHub;
