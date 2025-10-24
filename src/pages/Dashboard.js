import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useData } from '../contexts/DataContext';
import { supabase } from '../services/supabaseClient';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Users, Clock, Calendar, Briefcase, ExternalLink, AlertTriangle, Target,
  CheckCircle, TrendingUp, TrendingDown, Zap, AlertCircle, Activity,
  ChevronDown, ChevronUp, BarChart3, Star, X
} from 'lucide-react';
import PipelineFunnel from '../components/PipelineFunnel';
import '../styles/Dashboard.css';

// Utility to calculate days difference
const calculateDaysDifference = (dateString) => {
    if (!dateString) return 0;
    const now = new Date();
    const then = new Date(dateString);
    // Ensure 'then' is a valid date before calculation
    if (isNaN(then.getTime())) return Infinity; // Return Infinity for invalid dates
    const diffTime = Math.abs(now.getTime() - then.getTime());
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
};

// =========================================================================
// HEALTH BADGE COMPONENT
// =========================================================================
const HealthBadge = ({ health, stats }) => {
  const colors = {
    healthy: '#E8B4B8', // Rose Gold
    warning: '#F4C2A8', // Peachy Rose
    critical: '#F7A9BA' // Dusty Pink
  };

  // Handle cases where stats might be incomplete or daysSinceActivity is 'N/A' or Infinity
  const daysAgoText = typeof stats?.daysSinceActivity === 'number' && Number.isFinite(stats.daysSinceActivity)
    ? `${stats.daysSinceActivity} days ago`
    : 'N/A';
  const titleText = `Outreach: ${stats?.outreach || 0} | Reply Rate: ${stats?.replyRate || 0}% | Last Activity: ${daysAgoText}`;


  return (
    <div className="health-badge-container" title={titleText}>
      <div
        className="health-badge"
        style={{
          // Use a default color if health is unknown/invalid
          backgroundColor: colors[health] || '#64748b', // Default to Slate-Gray
          boxShadow: `0 0 8px ${colors[health] || '#64748b'}`
        }}
      />
    </div>
  );
};


// =========================================================================
// EXECUTIVE SUMMARY CARDS COMPONENT
// =========================================================================
const ExecutiveSummaryCards = ({ stats, onCardClick }) => {
  const cards = [
    {
      id: 'attention',
      icon: AlertTriangle,
      value: stats.rolesNeedingAttention || 0,
      label: 'Roles Need Attention',
      color: '#F7A9BA',
      clickable: true
    },
    {
      id: 'closeToHiring',
      icon: Target,
      value: stats.closeToHiring || 0,
      label: 'Close to Hiring',
      color: '#B8D4D0',
      clickable: false,
    },
    {
      id: 'interviews',
      icon: Calendar,
      value: stats.interviewsThisWeek || 0,
      label: 'Interviews This Week',
      color: '#C5B9D6',
      clickable: true
    },
    {
      id: 'submissions',
      icon: CheckCircle,
      value: stats.submissionsThisWeek || 0,
      label: 'Submissions This Week',
      color: '#F4C2A8',
      clickable: false,
    },
    {
      id: 'activeCandidates',
      icon: Users,
      value: stats.activeCandidates || 0,
      label: 'Active Candidates',
      color: '#E8B4B8',
      clickable: false,
    },
    {
      id: 'outreach',
      icon: TrendingUp,
      value: stats.outreachThisWeek || 0,
      label: 'Team Outreach This Week',
      color: '#7AA2F7',
      subtitle: stats.replyRate ? `${stats.replyRate}% Reply Rate` : '',
      clickable: true
    }
  ];

  return (
    <div className="executive-summary-cards">
      {cards.map((card) => (
        <motion.div
          key={card.id}
          className={`executive-card ${card.clickable ? 'clickable' : ''}`}
          whileHover={card.clickable ? { scale: 1.02, y: -4 } : {}}
          onClick={card.clickable ? () => onCardClick(card.id) : undefined}
        >
          <div className="executive-card-icon" style={{ color: card.color }}>
            <card.icon size={32} />
          </div>
          <div className="executive-card-value" style={{ color: card.color }}>
            {/* Display 0 if value is missing */}
            {card.value || 0}
          </div>
          <div className="executive-card-label">{card.label}</div>
          {card.subtitle && (
            <div
              className="executive-card-subtitle"
              style={{
                color: card.id === 'outreach' ? getReplyRateColor(stats.replyRate) : card.color
              }}
            >
              {card.subtitle}
            </div>
          )}
        </motion.div>
      ))}
    </div>
  );
};

const getReplyRateColor = (rate) => {
  if (rate >= 35) return '#B8D4D0'; // Normal
  if (rate >= 20) return '#F4C2A8'; // Warning
  return '#F7A9BA'; // Critical
};

// =========================================================================
// INTELLIGENT ALERTS COMPONENT
// =========================================================================
const IntelligentAlerts = ({ alerts }) => {
  const [expanded, setExpanded] = useState(true);
  const [expandedAlert, setExpandedAlert] = useState(null);

  const alertIcons = {
    zeroSubmissions: AlertTriangle,
    stalledCandidates: Clock,
    lowReplyRate: TrendingDown,
    readyToAdvance: Zap,
    noActivity: AlertCircle,
    success: CheckCircle,
    highActivity: Activity,
    newRoleOpen: Briefcase
  };

  const ALERT_TYPE_COLORS = {
    newRoleOpen: '#F7A9BA',
    zeroSubmissions: '#F7A9BA',
    noActivity: '#F7A9BA',
    lowReplyRate: '#F4C2A8',
    stalledCandidates: '#F4C2A8',
    success: '#B8D4D0',
    highActivity: '#7AA2F7',
    readyToAdvance: '#E8B4B8'
  };

  // Ensure alerts is always an array
  const validAlerts = Array.isArray(alerts) ? alerts : [];

  const sortedAlerts = [...validAlerts].sort((a, b) => {
    const priorityOrder = { '#F7A9BA': 0, '#F4C2A8': 1, '#7AA2F7': 2, '#B8D4D0': 3 };
    const colorA = ALERT_TYPE_COLORS[a.type] || '#F7A9BA';
    const colorB = ALERT_TYPE_COLORS[b.type] || '#F7A9BA';
    return priorityOrder[colorA] - priorityOrder[colorB];
  }).slice(0, 5); // Limit to top 5 alerts

  // Calculate count excluding success messages
  const actualAlertCount = sortedAlerts.filter(a => a.type !== 'success').length;


  return (
    <div className="intelligent-alerts-section">
      <div className="alerts-header" onClick={() => setExpanded(!expanded)}>
        <h2 className="section-title">
          <AlertCircle size={20} /> Intelligent Alerts
          {/* Show count only if > 0 actual alerts */}
           {actualAlertCount > 0 && (
            <span className="alert-badge">{actualAlertCount}</span>
          )}
        </h2>
        {expanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
      </div>
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="alerts-container"
          >
             {/* Display placeholder if loading (alerts empty initially) */}
             {validAlerts.length === 0 ? (
               <div className="alert-card placeholder-card">
                 <div className="alert-content">
                   <Activity size={20} color="#64748b" />
                   <div>
                     <div className="alert-message">Analyzing recruitment data...</div>
                     <div className="alert-suggestion">Alerts will appear here if action is needed.</div>
                   </div>
                 </div>
               </div>
              ) : ( // Render actual alerts or success message
                  sortedAlerts.map((alert, index) => {
                    // Default Icon if type is unknown
                    const Icon = alertIcons[alert.type] || AlertCircle;
                    const displayColor = ALERT_TYPE_COLORS[alert.type] || '#F7A9BA';

                    return (
                      <motion.div
                        // Use a more unique key if possible, e.g., alert.id if available
                        key={alert.message || index}
                        className="alert-card"
                        style={{ borderLeftColor: displayColor }}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        // Only make non-success alerts with suggestions expandable
                        onClick={alert.type !== 'success' && alert.suggestion ? () => setExpandedAlert(expandedAlert === index ? null : index) : undefined}
                        style={{ cursor: (alert.type !== 'success' && alert.suggestion) ? 'pointer' : 'default' }} // Add cursor pointer
                      >
                        <div className="alert-content">
                          <Icon size={20} color={displayColor} />
                          <div className="alert-text-content">
                            <div className="alert-message">{alert.message || 'No message'}</div>
                             {/* Show suggestion immediately for success, expand for others */}
                             {(alert.type === 'success' || expandedAlert === index) && alert.suggestion && (
                                <motion.div
                                  initial={{ opacity: 0, height: 0, marginTop: 0 }}
                                  animate={{ opacity: 1, height: 'auto', marginTop: '0.3rem' }}
                                  exit={{ opacity: 0, height: 0, marginTop: 0 }}
                                  className="alert-suggestion"
                                >
                                  {alert.suggestion}
                                </motion.div>
                            )}
                          </div>
                           {/* Show chevron only for expandable, non-success alerts */}
                          {alert.type !== 'success' && alert.suggestion && (
                              <ChevronDown
                                size={16}
                                style={{
                                  transform: expandedAlert === index ? 'rotate(180deg)' : 'rotate(0deg)',
                                  transition: 'transform 0.3s ease',
                                  marginLeft: 'auto', // Push chevron to the right
                                  flexShrink: 0 // Prevent chevron from shrinking
                                }}
                              />
                          )}
                        </div>
                      </motion.div>
                    );
                  })
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// =========================================================================
// ACTIVITY TIMELINE COMPONENT
// =========================================================================
const ActivityTimeline = ({ activities }) => {
  const [expanded, setExpanded] = useState(false); // Default to collapsed

  const getActivityIcon = (type) => {
    const icons = {
      candidate_added: Users,
      stage_change: TrendingUp,
      interview_scheduled: Calendar,
      submission: CheckCircle,
      reply_received: Activity // Added icon for replies
    };
    return icons[type] || Activity; // Default icon
  };

   const formatTimeAgo = (timestamp) => {
    if (!timestamp) return '';
    try {
        const date = new Date(timestamp);
        if (isNaN(date.getTime())) { // Check if date is invalid
            console.warn("Invalid timestamp for formatting:", timestamp);
            return 'Invalid date';
        }
        const now = new Date();
        const diff = now.getTime() - date.getTime(); // Use getTime() for consistency

        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (minutes < 1) return 'Just now';
        if (minutes < 60) return `${minutes} min ago`; // Use 'min'
        if (hours < 24) return `${hours} hr ago`; // Use 'hr'
        if (days === 1) return '1 day ago';
        return `${days} days ago`;
    } catch (e) {
        console.error("Error formatting time ago:", timestamp, e);
        return 'Error'; // Return error string if formatting fails
    }
  };


  // Ensure activities is always an array
  const validActivities = Array.isArray(activities) ? activities : [];

  return (
    <div className="activity-timeline-section">
      <div className="timeline-header" onClick={() => setExpanded(!expanded)}>
        <h2 className="section-title">
          <Activity size={20} /> Recent Activity (Last 7 Days)
        </h2>
        {/* Show count only if there are activities */}
        {validActivities.length > 0 && <span className="timeline-count-badge">{validActivities.length}</span>}
        {expanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
      </div>
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            // Add max height and scroll for long lists
            animate={{ opacity: 1, height: 'auto', maxHeight: '400px', overflowY: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            // Add padding to the scrollable container
            className="timeline-container scrollable-container"
          >
             {validActivities.length === 0 ? (
               <div className="timeline-item placeholder-item">
                 <div className="timeline-icon"><Clock size={16} /></div>
                 <div className="timeline-content" style={{ color: 'var(--text-secondary)' }}>No activity recorded in the last 7 days.</div>
               </div>
            ) : (
                // Limit display but keep data? Slice might not be needed if scrolling is added.
                // Let's render all items within the scrollable area.
                validActivities.map((activity, index) => {
                  const Icon = getActivityIcon(activity?.type);
                   // Skip rendering if activity or icon is invalid
                  if (!activity || !Icon || !activity.timestamp) return null;

                  return (
                    <motion.div
                      // Use a more reliable key if activity has a unique ID
                      key={activity.id || `activity-${index}`}
                      className="timeline-item"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <div className="timeline-icon">
                        <Icon size={16} />
                      </div>
                      <div className="timeline-content">
                        <div className="timeline-time">{formatTimeAgo(activity.timestamp)}</div>
                        <div className="timeline-message">{activity.message || 'No message'}</div>
                      </div>
                    </motion.div>
                  );
                })
             )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};


// =========================================================================
// MODAL: Roles Needing Attention List
// =========================================================================
const AttentionListModal = ({ isOpen, onClose, roles, navigate }) => {
    if (!isOpen) return null;

    // Filter roles down to those with critical or warning health status
    const problemRoles = Object.entries(roles || {}) // Ensure roles is an object
        .filter(([, health]) => health && (health.health === 'critical' || health.health === 'warning')) // Added check for health existence
        .sort(([, a], [, b]) => {
            const healthOrder = { critical: 0, warning: 1, healthy: 2 };
            // Handle cases where health might be missing
            const healthA = a?.health || 'healthy';
            const healthB = b?.health || 'healthy';
            return healthOrder[healthA] - healthOrder[healthB];
        });


    const getHealthColor = (health) => {
        switch (health) {
            case 'critical': return 'var(--accent-red)';
            case 'warning': return 'var(--accent-orange)';
            default: return 'var(--accent-green)';
        }
    };

    const handleDrillDown = (posId) => {
        onClose();
        navigate('/active-tracker', { state: { positionId: posId, stage: 'all' } });
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content modal-large" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>Roles Needing Attention ({problemRoles.length})</h2>
                    <button className="btn-close-modal" onClick={onClose}><X size={24} /></button>
                </div>
                <div className="modal-body">
                    <div className="attention-list-container">
                        {problemRoles.length === 0 ? (
                            <p style={{textAlign: 'center', color: 'var(--text-secondary)'}}>No critical roles detected. Excellent work!</p>
                        ) : (
                            <ul className="attention-list">
                                {problemRoles.map(([posId, health]) => {
                                     // Handle missing health data gracefully
                                    const displayHealth = health?.health || 'unknown';
                                     // Adjust display for 'N/A' days
                                     const daysAgoText = health?.daysSinceActivity === 'N/A' ? 'N/A' : `${health?.daysSinceActivity || 0}d ago`;


                                    return (
                                        <li key={posId} className="attention-item" >
                                            <div className="attention-info">
                                                <div className="attention-title-group">
                                                    <span className="health-dot" style={{backgroundColor: getHealthColor(displayHealth)}}></span>
                                                    <span className="attention-title">{health?.title || 'Unknown Title'}</span>
                                                </div>
                                                <div className="attention-stats">
                                                    <span>Activity: {daysAgoText}</span>
                                                    <span>Outreach: {health?.outreach || 0}</span>
                                                    <span>Reply Rate: {health?.replyRate || 0}%</span>
                                                </div>
                                            </div>
                                            <button
                                                className="btn-drill-down-themed"
                                                onClick={() => handleDrillDown(posId)}
                                            >
                                                <ExternalLink size={16} /> View Pipeline
                                            </button>
                                        </li>
                                    );
                                })}
                            </ul>
                        )}
                    </div>
                </div>
                <div className="modal-footer">
                    <button onClick={onClose} className="btn-secondary modal-close-btn">Close</button>
                </div>
            </div>
        </div>
    );
};

// =========================================================================
// MODAL: Team Outreach Breakdown List
// =========================================================================
const OutreachBreakdownModal = ({ isOpen, onClose, breakdownData }) => {
    if (!isOpen) return null;

    const getStatusPillColor = (status) => {
        switch (status?.toLowerCase()) { // Added safety check for status
            case 'critical': return { color: 'var(--accent-red)', bg: 'rgba(247, 118, 142, 0.15)' };
            case 'warning': return { color: 'var(--accent-orange)', bg: 'rgba(255, 158, 100, 0.15)' };
            default: return { color: 'var(--accent-green)', bg: 'rgba(158, 206, 106, 0.15)' };
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content modal-large" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>Team Outreach Breakdown (Last 7 Days)</h2>
                    <button className="btn-close-modal" onClick={onClose}><X size={24} /></button>
                </div>
                <div className="modal-body">
                    {/* Check if breakdownData is valid and has items */}
                     {Array.isArray(breakdownData) && breakdownData.length > 0 ? (
                        <div className="outreach-breakdown-table-container">
                            <table className="outreach-breakdown-table">
                                <thead>
                                    <tr>
                                        <th style={{ width: '30%' }}>Recruiter</th>
                                        <th style={{ width: '15%' }}>Sent</th>
                                        <th style={{ width: '15%' }}>Replied</th>
                                        <th style={{ width: '25%' }}>Reply Rate</th>
                                        <th style={{ width: '15%' }}>Health</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {breakdownData.map((rec, index) => {
                                        // Provide default values
                                        const name = rec?.name || 'Unknown Recruiter';
                                        const totalOutreach = rec?.totalOutreach || 0;
                                        const replies = rec?.replies || 0;
                                        const replyRate = rec?.replyRate || 0;
                                        const status = rec?.status || 'Unknown';

                                        const statusColors = getStatusPillColor(status);
                                        const replyRateColor = getReplyRateColor(replyRate);

                                        return (
                                            // Use recruiter ID if available and unique, otherwise fallback
                                            <tr key={rec?.id || name + index}>
                                                <td style={{ color: 'var(--rose-gold)', fontWeight: 600 }}>{name}</td>
                                                <td>{totalOutreach}</td>
                                                <td>{replies}</td>
                                                <td style={{ color: replyRateColor, fontWeight: 700 }}>{replyRate}%</td>
                                                <td>
                                                    <span className="status-pill" style={{ backgroundColor: statusColors.bg, color: statusColors.color, borderColor: statusColors.color }}>
                                                        {status}
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                     ) : (
                         <p style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>No outreach data available for the last 7 days.</p>
                     )}
                </div>
                <div className="modal-footer">
                    <button onClick={onClose} className="btn-secondary modal-close-btn">Close</button>
                </div>
            </div>
        </div>
    );
};


// =========================================================================
// MAIN DASHBOARD COMPONENT
// =========================================================================
function Dashboard() {
  const navigate = useNavigate();
  // *** THIS IS THE FIX: Added 'recruiters' back to destructuring ***
  const { outreachActivities, userProfile, positions: openPositions = [], pipeline = [], recruiters } = useData();
  const [pipelineMetrics, setPipelineMetrics] = useState({});
  const [loadingPipeline, setLoadingPipeline] = useState(true);
  const [executiveStats, setExecutiveStats] = useState({});
  const [alerts, setAlerts] = useState([]);
  const [roleHealth, setRoleHealth] = useState({});
  const [activityTimeline, setActivityTimeline] = useState([]);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [expandedPosition, setExpandedPosition] = useState(null);

  // State for modals
  const [showFunnelModal, setShowFunnelModal] = useState(false);
  const [showAttentionModal, setShowAttentionModal] = useState(false);
  const [showOutreachModal, setShowOutreachModal] = useState(false);


  // Hardcoded stages
  const stages = ['Screening', 'Submit to Client', 'Interview 1', 'Interview 2', 'Interview 3', 'Offer', 'Hired'];

  // --- Data Fetching ---
  // Memoize fetchAllDashboardData to prevent re-creation on every render
  const fetchAllDashboardData = useCallback(async () => {
    console.log("Dashboard: Fetching all data...");
    setLoadingPipeline(true); // Set loading true at the start
    try {
        // Run fetches in parallel for efficiency
        await Promise.all([
          fetchPipelineMetrics(),
          fetchExecutiveStats(),
          fetchActivityTimeline()
        ]);
        setLastUpdated(new Date()); // Update timestamp only on success
        console.log("Dashboard: Data fetch complete.");
    } catch (error) {
        console.error("Dashboard: Error fetching data:", error);
        // Optionally set an error state here
    } finally {
        setLoadingPipeline(false); // Set loading false regardless of success/error
    }
     // Dependencies should include external variables/functions if they change
     // fetchPipelineMetrics, fetchExecutiveStats, fetchActivityTimeline are defined below
     // supabase client is assumed stable
     // openPositions is needed for role health calc triggered by pipelineMetrics update
  }, [openPositions]); // Include openPositions


  // --- Auto-Refresh Logic (Changed to Daily @ 6 AM) ---
  useEffect(() => {
    let refreshTimeoutId = null;

    const scheduleNextRefresh = () => {
      try {
          const now = new Date();
          const nextRefresh = new Date();
          const targetHour = 6;
          const targetMinute = 0;

          nextRefresh.setHours(targetHour, targetMinute, 0, 0);

          if (now.getTime() >= nextRefresh.getTime()) {
            nextRefresh.setDate(nextRefresh.getDate() + 1);
            console.log("Dashboard: Scheduling next refresh for tomorrow at", nextRefresh.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
          } else {
            console.log("Dashboard: Scheduling next refresh for today at", nextRefresh.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
          }

          let delay = nextRefresh.getTime() - now.getTime();

          // Basic validation for delay
          if (delay < 0 || isNaN(delay)) {
              console.error(`Dashboard: Invalid delay calculated (${delay}ms). Scheduling for 24 hours.`);
              delay = 24 * 60 * 60 * 1000; // Fallback to 24 hours
          }

          if (refreshTimeoutId) { clearTimeout(refreshTimeoutId); }

          refreshTimeoutId = setTimeout(() => {
            console.log("Dashboard: Triggering scheduled daily refresh...");
            fetchAllDashboardData();
            scheduleNextRefresh(); // Reschedule after running
          }, delay);

           console.log(`Dashboard: Next refresh scheduled in approx ${Math.round(delay / 1000 / 60)} minutes.`);
        } catch (error) {
            console.error("Dashboard: Error scheduling next refresh:", error);
             // Optionally, try rescheduling after a fixed interval on error
             if (refreshTimeoutId) { clearTimeout(refreshTimeoutId); }
             refreshTimeoutId = setTimeout(scheduleNextRefresh, 60 * 60 * 1000); // Retry in 1 hour
        }
    };

    // --- Initial Fetch ---
    console.log("Dashboard: Performing initial data fetch.");
    fetchAllDashboardData(); // Fetch data on component mount
    scheduleNextRefresh();   // Schedule the first daily refresh

    // --- Cleanup ---
    return () => {
      if (refreshTimeoutId) {
        console.log("Dashboard: Clearing scheduled refresh timeout.");
        clearTimeout(refreshTimeoutId);
      }
    };
  }, [fetchAllDashboardData]); // Dependency on the memoized fetch function


  // --- Alert Calculation ---
   useEffect(() => {
    // Check that pipeline is an array and other dependencies are ready
    if (!loadingPipeline && Array.isArray(pipeline) && openPositions && Object.keys(pipelineMetrics).length > 0 && Object.keys(roleHealth).length > 0) {
      console.log("Dashboard: Calculating alerts..."); // Log alert calculation start
      calculateIntelligentAlerts(pipeline);
    }
    // Dependencies now accurately reflect what triggers alert recalculation
  }, [pipelineMetrics, executiveStats, roleHealth, loadingPipeline, openPositions, pipeline]);


  // --- Helper Functions ---
  async function fetchPipelineMetrics() {
    console.log("fetchPipelineMetrics: Fetching..."); // Log start
    const { data, error } = await supabase
      .from('pipeline')
      .select('*, positions(*, clients(company_name)), candidates(name)')
      .neq('stage', 'Archived')
      .eq('positions.status', 'Open');

    if (error) {
        console.error("fetchPipelineMetrics: Error fetching:", error);
        setPipelineMetrics({});
        setRoleHealth({}); // Reset role health too
        // Consider throwing error or returning status? For now, just reset state.
        return;
    }

    if (data) {
       console.log(`fetchPipelineMetrics: Received ${data.length} pipeline items.`); // Log count
      const grouped = data.reduce((acc, item) => {
        // Add safety checks for item properties
        const posId = item?.position_id;
        const positionTitle = item?.positions?.title || 'Unknown Position';
        const companyName = item?.positions?.clients?.company_name || 'N/A';
        const candidateName = item?.candidates?.name || 'Unknown Candidate';

        // Skip if essential data is missing
        if (!posId) {
            console.warn("fetchPipelineMetrics: Skipping pipeline item with missing position_id:", item);
            return acc;
        }


        if (!acc[posId]) {
          acc[posId] = {
            title: positionTitle, company: companyName, count: 0,
            stages: { 'Screening': 0, 'Submit to Client': 0, 'Interview 1': 0, 'Interview 2': 0, 'Interview 3': 0, 'Offer': 0, 'Hired': 0, 'Rejected': 0 },
            pipelineItems: [],
          };
        }
        const stage = item.stage;
        if (stage && stage in acc[posId].stages) {
          acc[posId].stages[stage]++;
        } else if (stage) {
            // Log unknown stages but don't crash
            console.warn(`fetchPipelineMetrics: Unknown stage '${stage}' for position ${posId}`);
        }
        acc[posId].count++;
        // Include candidate_name directly in the item
        acc[posId].pipelineItems.push({ ...item, candidate_name: candidateName });
        return acc;
      }, {});

      setPipelineMetrics(grouped);
       console.log(`fetchPipelineMetrics: Grouped into ${Object.keys(grouped).length} positions.`); // Log grouped count
      // Pass the fetched pipeline data ('data') to calculateRoleHealth
      await calculateRoleHealth(grouped, data);
    } else {
        console.log("fetchPipelineMetrics: No pipeline data received."); // Log no data
        setPipelineMetrics({});
        setRoleHealth({});
    }
  }

  async function calculateRoleHealth(metrics, pipelineData) {
     console.log("calculateRoleHealth: Calculating..."); // Log start
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

    const positionIds = Object.keys(metrics);
    if (positionIds.length === 0) {
        console.log("calculateRoleHealth: No positions with metrics, skipping."); // Log skip
        setRoleHealth({});
        return;
    }

     console.log(`calculateRoleHealth: Fetching outreach for ${positionIds.length} positions...`); // Log fetch start
    const { data: outreachData, error: outreachError } = await supabase
      .from('recruiter_outreach')
      .select('position_id, activity_status, created_at')
      .in('position_id', positionIds)
      .gte('created_at', fourteenDaysAgo.toISOString());

     if (outreachError) {
        console.error("calculateRoleHealth: Error fetching outreach:", outreachError);
        // Set all to unknown on error
        const errorHealthMap = {};
        positionIds.forEach(posId => {
            errorHealthMap[posId] = { title: metrics[posId]?.title || 'Unknown', health: 'unknown', outreach: 'N/A', replyRate: 'N/A', daysSinceActivity: 'N/A' };
        });
        setRoleHealth(errorHealthMap);
        return;
    }
     console.log(`calculateRoleHealth: Fetched ${outreachData?.length || 0} outreach records.`); // Log fetch count


    const healthMap = {};
    const replyStatuses = ['reply_received', 'accepted', 'call_scheduled', 'declined', 'ready_for_submission'];
    // Ensure openPositions is available for finding creation date
    const openPositionsMap = openPositions.reduce((map, pos) => {
        map[pos.id] = pos.created_at;
        return map;
    }, {});


    for (const [posId, data] of Object.entries(metrics)) {
      const positionOutreach = outreachData?.filter(o => o.position_id === posId) || [];
      const recentOutreach = positionOutreach.filter(o => new Date(o.created_at) >= sevenDaysAgo);
      const replies = positionOutreach.filter(o => replyStatuses.includes(o.activity_status)).length;
      const replyRate = positionOutreach.length > 0 ? parseFloat(((replies / positionOutreach.length) * 100).toFixed(1)) : 0;

      const positionPipeline = pipelineData?.filter(p => p.position_id === posId) || [];
      // Use pre-fetched creation date
      const positionCreationDate = openPositionsMap[posId];
      let lastActivityDate = positionCreationDate ? new Date(positionCreationDate) : new Date(0);


      lastActivityDate = positionPipeline.reduce((latest, p) => {
        const itemTimestamp = p.updated_at || p.created_at;
        if (!itemTimestamp) return latest;
        const itemDate = new Date(itemTimestamp);
        return !isNaN(itemDate) && itemDate > latest ? itemDate : latest;
      }, lastActivityDate);

      // Handle epoch date before calculating difference
      const daysSinceActivity = lastActivityDate.getTime() > 0 ? calculateDaysDifference(lastActivityDate.toISOString()) : Infinity;


      let health = 'healthy';
       // More nuanced health logic
      const hasOutreach = positionOutreach.length > 0;
      if (daysSinceActivity > 14 || (hasOutreach && recentOutreach.length === 0) || (hasOutreach && replyRate < 10)) {
          health = 'critical';
      } else if (daysSinceActivity > 7 || (hasOutreach && recentOutreach.length < 5) || (hasOutreach && replyRate < 20)) {
          health = 'warning';
      } else if (daysSinceActivity === Infinity && !hasOutreach) {
          // If no activity AND no outreach EVER, maybe less critical than just stale?
          // Let's keep it warning. Could also be based on position age.
          health = 'warning';
      }


      healthMap[posId] = {
        title: data?.title || 'Unknown Title', // Safety check
        health,
        outreach: recentOutreach.length,
        replyRate: replyRate,
        daysSinceActivity: daysSinceActivity === Infinity ? 'N/A' : daysSinceActivity
      };
    }
     console.log("calculateRoleHealth: Calculation complete."); // Log complete
    setRoleHealth(healthMap);
  }

  async function fetchExecutiveStats() {
    console.log("fetchExecutiveStats: Fetching..."); // Log start
    const today = new Date();
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(today.getDate() - 7);
    const sevenDaysAgoISO = sevenDaysAgo.toISOString();
    const fourteenDaysAgo = new Date(today);
    fourteenDaysAgo.setDate(today.getDate() - 14);
    const fourteenDaysAgoISO = fourteenDaysAgo.toISOString();

    const endOfWeek = new Date(today);
    // Adjust to ensure endOfWeek is always in the future relative to 'today' for comparisons
    endOfWeek.setDate(today.getDate() + (7 - today.getDay()) % 7); // Go to Sunday of the current week
    endOfWeek.setHours(23, 59, 59, 999);
    const endOfWeekISO = endOfWeek.toISOString();


    // Use Promise.allSettled for resilience
    const results = await Promise.allSettled([
        supabase.from('pipeline').select('id', { count: 'exact', head: true }).in('stage', ['Offer', 'Interview 3']).eq('status', 'Active'),
        supabase.from('interviews').select('id', { count: 'exact', head: true }).gte('interview_date', today.toISOString()).lte('interview_date', endOfWeekISO),
        supabase.from('pipeline').select('id', { count: 'exact', head: true }).eq('stage', 'Submit to Client').gte('created_at', sevenDaysAgoISO),
         // Fetch actual IDs for active candidates to ensure position status check works if RLS applies
        supabase.from('pipeline').select('id, positions!inner(status)', { count: 'exact'}).eq('status', 'Active').eq('positions.status', 'Open'),
        supabase.from('recruiter_outreach').select('activity_status', { count: 'exact' }).gte('created_at', sevenDaysAgoISO), // Fetch count directly
        supabase.from('recruiter_outreach').select('position_id, activity_status, created_at').gte('created_at', fourteenDaysAgoISO) // For attention roles
    ]);

    // Helper to safely get results from Promise.allSettled
    const getSettledResult = (index, type = 'count') => {
        const response = results[index];
        if (response.status === 'rejected') {
            console.error(`fetchExecutiveStats: Error fetching stat at index ${index}:`, response.reason);
            return type === 'count' ? 0 : [];
        }
        if (type === 'count') {
             // Handle potential null count even on success
            return response.value.error ? 0 : (response.value.count ?? 0);
        }
        return response.value.data || [];
    };


    const outreachData = getSettledResult(4, 'data'); // Assuming outreach count is needed for rate calc
    const outreachThisWeekCount = getSettledResult(4, 'count'); // Get count from query
    const replyStatuses = ['reply_received', 'accepted', 'call_scheduled', 'declined', 'ready_for_submission'];
    // Filter the fetched data (if needed) or refetch with filter? Let's filter for now.
    const replies = outreachData.filter(o => replyStatuses.includes(o.activity_status)).length;
    const replyRate = outreachThisWeekCount > 0 ? parseFloat(((replies / outreachThisWeekCount) * 100).toFixed(1)) : 0; // Use count for rate


    // Roles Needing Attention calculation
    const allOutreachData = getSettledResult(5, 'data');
    const positionStatsMap = {};
    allOutreachData.forEach(o => {
      // Ensure position_id exists
      if (!o.position_id) return;

      if (!positionStatsMap[o.position_id]) {
        positionStatsMap[o.position_id] = { total: 0, replies: 0, recent: 0 };
      }
      positionStatsMap[o.position_id].total++;
       if (replyStatuses.includes(o.activity_status)) {
           positionStatsMap[o.position_id].replies++;
       }
      if (new Date(o.created_at) >= sevenDaysAgo) {
          positionStatsMap[o.position_id].recent++;
      }
    });

    let rolesNeedingAttention = 0;
     // Ensure openPositions is an array
    const openPositionIds = new Set(Array.isArray(openPositions) ? openPositions.map(p => p.id) : []);


    Object.entries(positionStatsMap).forEach(([posId, stats]) => {
        if (openPositionIds.has(posId)) {
            const posReplyRate = stats.total > 0 ? (stats.replies / stats.total * 100) : 0;
            if (stats.recent < 5 || (stats.total > 0 && posReplyRate < 15)) {
                rolesNeedingAttention++;
            }
        }
    });


    setExecutiveStats({
      rolesNeedingAttention,
      closeToHiring: getSettledResult(0, 'count'),
      interviewsThisWeek: getSettledResult(1, 'count'),
      submissionsThisWeek: getSettledResult(2, 'count'),
      activeCandidates: getSettledResult(3, 'count'), // Count from query
      outreachThisWeek: outreachThisWeekCount, // Use count from query
      replyRate: replyRate
    });
     console.log("fetchExecutiveStats: Calculation complete."); // Log complete
  }

  async function fetchActivityTimeline() {
     console.log("fetchActivityTimeline: Fetching..."); // Log start
    const today = new Date();
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(today.getDate() - 7);
    const sevenDaysAgoISO = sevenDaysAgo.toISOString();

    try {
         // Use allSettled for resilience
        const results = await Promise.allSettled([
            supabase.from('pipeline').select('id, created_at, updated_at, stage, candidates(name), positions(title)')
                .gte('created_at', sevenDaysAgoISO).order('created_at', { ascending: false }).limit(20),
            supabase.from('interviews').select('id, created_at, candidates(name), positions(title)')
                .gte('created_at', sevenDaysAgoISO).order('created_at', { ascending: false }).limit(10),
            supabase.from('recruiter_outreach').select('id, created_at, candidate_name, positions(title)')
                .eq('activity_status', 'reply_received').gte('created_at', sevenDaysAgoISO).order('created_at', { ascending: false }).limit(10)
        ]);

         // Helper to safely get data
        const getData = (response) => (response.status === 'fulfilled' ? response.value.data || [] : []); // Default to empty array


        const timeline = [];
        const processedIds = new Set();


        // Process Pipeline Events
        getData(results[0]).forEach(p => {
             const uniqueId = `p-${p.id}`;
             if (!p.id || processedIds.has(uniqueId)) return;

            const candidateName = p.candidates?.name || 'Candidate'; // Simpler default
            const positionTitle = p.positions?.title || 'Role'; // Simpler default
            const timestamp = p.updated_at || p.created_at;

            if (!timestamp) return;
             processedIds.add(uniqueId);


            if (p.stage === 'Submit to Client') {
                timeline.push({ id: uniqueId, type: 'submission', message: `${candidateName} submitted for ${positionTitle}`, timestamp });
            } else if (['Interview 1', 'Interview 2', 'Interview 3', 'Offer', 'Hired'].includes(p.stage)) {
                timeline.push({ id: uniqueId, type: 'stage_change', message: `${candidateName} moved to ${p.stage} for ${positionTitle}`, timestamp });
            } else if (timestamp === p.created_at) {
                timeline.push({ id: uniqueId, type: 'candidate_added', message: `${candidateName} added to pipeline for ${positionTitle}`, timestamp });
            }
        });

        // Process Interview Events
        getData(results[1]).forEach(i => {
             const uniqueId = `i-${i.id}`;
             if (!i.id || processedIds.has(uniqueId) || !i.created_at) return;
             processedIds.add(uniqueId);
            const candidateName = i.candidates?.name || 'Candidate';
            const positionTitle = i.positions?.title || 'Role';
            timeline.push({ id: uniqueId, type: 'interview_scheduled', message: `Interview scheduled with ${candidateName} for ${positionTitle}`, timestamp: i.created_at });
        });

         // Process Outreach Reply Events
        getData(results[2]).forEach(o => {
            const uniqueId = `o-${o.id}`;
             if (!o.id || processedIds.has(uniqueId) || !o.created_at) return;
             processedIds.add(uniqueId);
            const candidateName = o.candidate_name || 'Candidate';
            const positionTitle = o.positions?.title || 'Role';
            timeline.push({ id: uniqueId, type: 'reply_received', message: `Reply received from ${candidateName} for ${positionTitle}`, timestamp: o.created_at });
        });


        timeline.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
         console.log(`fetchActivityTimeline: Processed ${timeline.length} events.`); // Log count

        // Conditional state update to prevent unnecessary re-renders
        setActivityTimeline(prev => JSON.stringify(prev) === JSON.stringify(timeline) ? prev : timeline);

    } catch (error) {
        console.error("fetchActivityTimeline: Error processing results:", error);
        setActivityTimeline([]);
    }
  }

  function calculateIntelligentAlerts(pipelineData) {
     console.log("calculateIntelligentAlerts: Calculating..."); // Log start
     // Ensure pipelineData is an array
     const safePipelineData = Array.isArray(pipelineData) ? pipelineData : [];

    const newAlerts = [];
    const now = new Date();
    const daysToMs = (days) => days * 24 * 60 * 60 * 1000;

    const THRESHOLDS = { /* ... thresholds ... */
        SCREENING_STALL: 3, CLIENT_FEEDBACK_OVERDUE: 6, INTERVIEW_STALL: 8, HOLD_REVIEW_OVERDUE: 4,
        GENERAL_STALE: 7, NEW_ROLE_NO_ACTIVITY_MS: daysToMs(2), LOW_REPLY_RATE: 20, MIN_OUTREACH_FOR_RATE: 5
    };

    const stallAlertsMap = {};

    safePipelineData.forEach(item => {
        const posId = item?.position_id;
        // Need access to position title, ensure pipelineMetrics is used or fetched relation is reliable
        const positionTitle = pipelineMetrics[posId]?.title || item?.positions?.title || 'Unknown Role';
        const candidateName = item?.candidate_name || item?.candidates?.name || 'Unknown Candidate';
        const lastUpdateDate = item?.updated_at || item?.created_at;

        // Skip if essential info missing or date invalid
        if (!posId || !lastUpdateDate || isNaN(new Date(lastUpdateDate).getTime())) return;


        const daysStuck = calculateDaysDifference(lastUpdateDate);
        let alertMessage = null;
        let priority = 0;
        let suggestion = '';

        // Determine alert based on stage and daysStuck
         if (item.status === 'Hold' && daysStuck >= THRESHOLDS.HOLD_REVIEW_OVERDUE) {
             alertMessage = `${positionTitle} - Candidate on Hold for ${daysStuck} days.`;
             suggestion = `💡 Follow up required for ${candidateName}. Decide next steps.`;
             priority = 4;
         } else if (item.stage === 'Screening' && daysStuck >= THRESHOLDS.SCREENING_STALL) {
             alertMessage = `${positionTitle} - Screening stuck for ${daysStuck} days.`;
             suggestion = `💡 Review ${candidateName}. Advance or disposition candidate.`;
             priority = 3;
         } else if (item.stage === 'Submit to Client' && daysStuck >= THRESHOLDS.CLIENT_FEEDBACK_OVERDUE) {
             alertMessage = `${positionTitle} - Client Feedback Overdue (${daysStuck} days).`;
             suggestion = `💡 Request feedback from client for ${candidateName}.`;
             priority = 2;
         } else if (item.stage?.startsWith('Interview') && daysStuck >= THRESHOLDS.INTERVIEW_STALL) {
             alertMessage = `${positionTitle} - ${item.stage} stuck for ${daysStuck} days.`;
             suggestion = `💡 Check interview status/feedback for ${candidateName}.`;
             priority = 1;
         }


        if (alertMessage) {
            // Update map only if this alert has higher priority
            if (!stallAlertsMap[posId] || priority > stallAlertsMap[posId].priority) {
                stallAlertsMap[posId] = { message: alertMessage, suggestion, type: 'stalledCandidates', color: '#F4C2A8', priority };
            }
        }
    });

    Object.values(stallAlertsMap).forEach(alert => newAlerts.push(alert));

    // Check 2a: New Roles with NO Activity
     // Ensure openPositions is an array
    (Array.isArray(openPositions) ? openPositions : []).forEach(pos => {
        if (pos?.status === 'Open' && pos?.created_at) { // Safety checks
            const posAgeMs = now.getTime() - new Date(pos.created_at).getTime();
            if (posAgeMs >= THRESHOLDS.NEW_ROLE_NO_ACTIVITY_MS) {
                 // Check pipelineMetrics and roleHealth safely
                const hasPipelineCandidates = pipelineMetrics[pos.id]?.count > 0;
                const healthStats = roleHealth[pos.id];
                if (!hasPipelineCandidates && (!healthStats || healthStats.outreach === 0) && !stallAlertsMap[pos.id]) {
                   newAlerts.push({
                    type: 'newRoleOpen', message: `${pos.title || 'Role'} open > 48hrs, NO activity.`, // Use safe title
                    suggestion: '💡 Assign recruiter. Start outreach.', color: '#F7A9BA' // Shorter suggestion
                  });
                }
            }
        }
    });


    // Check 2b & 2c: General STALE and LOW QUALITY Check
    Object.entries(pipelineMetrics).forEach(([posId, data]) => {
      const health = roleHealth[posId];
       // Check health and data safely
      if (health && data?.title && !stallAlertsMap[posId]) {
         const daysInactive = typeof health.daysSinceActivity === 'number' ? health.daysSinceActivity : Infinity;

        if (daysInactive >= THRESHOLDS.GENERAL_STALE) {
           newAlerts.push({
            type: 'noActivity', message: `${data.title} - No activity in ${daysInactive} days.`,
            suggestion: '💡 Re-prioritize. Stale pipelines lose candidates.', color: '#F7A9BA'
          });
        }
        else if (health.outreach >= THRESHOLDS.MIN_OUTREACH_FOR_RATE && health.replyRate < THRESHOLDS.LOW_REPLY_RATE) {
          newAlerts.push({
            type: 'lowReplyRate', message: `${data.title} - Reply rate ${health.replyRate}% (Target: 20%+).`,
            suggestion: '💡 Review outreach messaging. Personalize more.', color: '#F4C2A8'
          });
        }
      }
    });

     // Add Success/Momentum messages
    if (newAlerts.length === 0) {
        newAlerts.push({ type: 'success', message: 'All systems running smoothly!', suggestion: '💡 Great work team.', color: '#B8D4D0' });
    } else if (executiveStats?.submissionsThisWeek >= 3 || executiveStats?.interviewsThisWeek >= 5) {
         const subs = executiveStats.submissionsThisWeek || 0;
         const ints = executiveStats.interviewsThisWeek || 0;
         const momentumMessage = subs >= 3 && ints >= 5 ? `Momentum! ${subs} subs & ${ints} interviews this week.`
             : subs >= 3 ? `Submission momentum! ${subs} new subs this week.`
             : `Interview momentum! ${ints} interviews scheduled.`;
        newAlerts.push({ type: 'highActivity', message: momentumMessage, suggestion: '💡 Keep it up!', color: '#7AA2F7' });
    }

    // Update state only if alerts actually changed
    setAlerts(prevAlerts => {
        const prevString = JSON.stringify(prevAlerts.map(a => a.message)); // Compare messages
        const newString = JSON.stringify(newAlerts.map(a => a.message));
        if (prevString !== newString) {
            console.log("calculateIntelligentAlerts: Alerts updated."); // Log update
            return newAlerts;
        }
         console.log("calculateIntelligentAlerts: No change in alerts."); // Log no change
        return prevAlerts;
    });
  }


  // --- Memos ---
  const funnelData = useMemo(() => {
    if (Object.keys(pipelineMetrics).length === 0) return [];
    const stageCounts = stages.reduce((acc, stage) => ({ ...acc, [stage]: 0 }), {});

    Object.values(pipelineMetrics).forEach(posData => {
        stages.forEach(stage => {
            // Safety check for posData.stages and stage existence
            if (posData?.stages && stage in posData.stages) {
               stageCounts[stage] += posData.stages[stage] || 0;
            }
        });
    });

    return stages.map(stage => ({ stage, count: stageCounts[stage] }));
  }, [pipelineMetrics, stages]); // stages dependency is fine as it's constant


  const callMetrics = useMemo(() => {
     // Ensure outreachActivities is an array
    const safeOutreach = Array.isArray(outreachActivities) ? outreachActivities : [];
    if (safeOutreach.length === 0) return { today: [], week: [] };

    const scheduledCalls = safeOutreach.filter(a => a.activity_status === 'call_scheduled' && a.scheduled_call_date);

    // Date calculations remain the same
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfToday = new Date(startOfToday); endOfToday.setDate(endOfToday.getDate() + 1);
    const dayOfWeek = now.getDay(); const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const startOfWeek = new Date(startOfToday); startOfWeek.setDate(startOfWeek.getDate() + diffToMonday);
    const endOfWeek = new Date(startOfWeek); endOfWeek.setDate(endOfWeek.getDate() + 7);

    // Filter calls safely
    const callsToday = scheduledCalls.filter(c => {
        try { const d = new Date(c.scheduled_call_date); return !isNaN(d) && d >= startOfToday && d < endOfToday; } catch { return false; }
    });
    const callsThisWeek = scheduledCalls.filter(c => {
        try { const d = new Date(c.scheduled_call_date); return !isNaN(d) && d >= startOfWeek && d < endOfWeek; } catch { return false; }
    });


    return { today: callsToday, week: callsThisWeek };
  }, [outreachActivities]);

  // Formatters (Keep formatters simple)
  const formatCallTime = (dateString) => {
    try { return new Date(dateString).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }); } catch { return 'Invalid'; }
  };

  const formatLastUpdated = (date) => {
    try {
        if (!date || isNaN(date.getTime())) return 'Never';
        const minutes = Math.floor((new Date().getTime() - date.getTime()) / 60000);
        if (minutes < 1) return 'Just now';
        if (minutes < 60) return `${minutes} min ago`;
        return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    } catch { return 'Error'; }
  };


  // --- Event Handlers ---
  const handleCardClick = (cardId) => {
    // Logic remains the same
    switch (cardId) {
      case 'attention': setShowAttentionModal(true); break;
      case 'interviews': navigate('/interview-hub'); break;
      case 'outreach': setShowOutreachModal(true); break;
      default: break;
    }
  };

   const sortedPositions = useMemo(() => {
     // Ensure dependencies are valid
    if (!pipelineMetrics || Object.keys(pipelineMetrics).length === 0 || !roleHealth || Object.keys(roleHealth).length === 0) return [];


    return Object.entries(pipelineMetrics)
        .filter(([posId]) => roleHealth[posId]) // Ensure health data exists for the position
        .sort(([posIdA, dataA], [posIdB, dataB]) => { // Use IDs from entries for health lookup
            const healthOrder = { critical: 0, warning: 1, healthy: 2, unknown: 3 };
            const healthA = roleHealth[posIdA]?.health || 'unknown';
            const healthB = roleHealth[posIdB]?.health || 'unknown';

            const healthDiff = healthOrder[healthA] - healthOrder[healthB];
            if (healthDiff !== 0) return healthDiff;

             // Secondary sort: Use optional chaining and default value
            return (dataB?.count || 0) - (dataA?.count || 0);
        });
  }, [pipelineMetrics, roleHealth]);


  const outreachBreakdownData = useMemo(() => {
     // Ensure recruiters is an array
    const safeRecruiters = Array.isArray(recruiters) ? recruiters : [];
    if (!outreachActivities || safeRecruiters.length === 0) return [];

    const breakdownMap = {};
    safeRecruiters.forEach(r => {
        const role = r?.role?.toLowerCase() || ''; // Safe access
         if (r?.id && role !== 'director' && !role.includes('manager')) { // Check id exists
            breakdownMap[r.id] = { id: r.id, name: r.name, totalOutreach: 0, replies: 0, status: 'Normal' };
        }
    });

    const sevenDaysAgo = new Date(); sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const replyStatuses = ['reply_received', 'accepted', 'call_scheduled', 'declined', 'ready_for_submission'];

    // Ensure outreachActivities is an array
    (Array.isArray(outreachActivities) ? outreachActivities : []).forEach(o => {
      // Check if o and created_at exist, and if recruiter is in map
      if (o?.created_at && new Date(o.created_at) >= sevenDaysAgo && breakdownMap[o.recruiter_id]) {
        const recData = breakdownMap[o.recruiter_id];
        recData.totalOutreach++;
        if (replyStatuses.includes(o.activity_status)) {
          recData.replies++;
        }
      }
    });

    return Object.values(breakdownMap).map(rec => {
      const rate = rec.totalOutreach > 0 ? parseFloat(((rec.replies / rec.totalOutreach) * 100).toFixed(1)) : 0;
      rec.replyRate = rate;
      if (rate >= 35) rec.status = 'Normal';
      else if (rate >= 20) rec.status = 'Warning';
      else rec.status = 'Critical';
      return rec;
    }).sort((a, b) => b.totalOutreach - a.totalOutreach);

  }, [outreachActivities, recruiters]);


  // --- Render ---
  return (
    <div className="dashboard-container">
      {/* Header */}
      <div className="overview-header">
        <div>
          <h1 className="main-title">Command Center Dashboard</h1>
          <p className="welcome-message">Welcome back, {userProfile?.name || 'Recruiter'}!</p>
        </div>
        <div className="last-updated">
          Last updated: {formatLastUpdated(lastUpdated)}
        </div>
      </div>

      {/* Cards & Alerts */}
      <ExecutiveSummaryCards stats={executiveStats} onCardClick={handleCardClick} />
      <IntelligentAlerts alerts={alerts} />

      {/* Pipeline Section */}
      <div className="hiring-pipeline-section">
        <div className="section-header-flex">
            <h2 className="section-title no-margin-bottom">
                <Briefcase size={20} /> HIRING PIPELINE
            </h2>
             {loadingPipeline && <span className="pipeline-loading-indicator">Updating...</span>}
            <button className="btn-premium btn-small btn-view-chart" onClick={() => setShowFunnelModal(true)}>
                <BarChart3 size={16} /> View Chart
            </button>
        </div>
        <div className="pipeline-table-container">
          <table className="pipeline-table">
            <thead>
              <tr>
                <th>HEALTH</th><th>POSITION</th><th>SCREEN</th><th>SUBMIT</th>
                <th>INT 1</th><th>INT 2</th><th>INT 3</th>
                <th>OFFER</th><th>HIRED</th><th>REJECT</th>
              </tr>
            </thead>
            <tbody>
              {loadingPipeline ? (
                <tr><td colSpan="10" className="empty-pipeline">Loading pipeline data...</td></tr>
              ) : sortedPositions.length === 0 ? (
                <tr><td colSpan="10" className="empty-pipeline">No open positions with active candidates.</td></tr>
              ) : (
                sortedPositions.map(([posId, data]) => {
                    const stagesData = data?.stages || {};
                    const healthData = roleHealth[posId];
                    if (!healthData) return null; // Skip if no health data

                    return (
                      <React.Fragment key={posId}>
                        <tr className="pipeline-row-enhanced" onClick={() => setExpandedPosition(expandedPosition === posId ? null : posId)} style={{ cursor: 'pointer' }}>
                          <td><HealthBadge health={healthData.health} stats={healthData} /></td>
                          <td>
                            <div className="position-title-group">
                              <strong>{data?.title || 'N/A'} ({data?.count || 0})</strong>
                              <span>{data?.company || 'N/A'}</span>
                            </div>
                          </td>
                           {/* Render stage counts safely */}
                          <td>{stagesData['Screening'] > 0 ? <div className="stage-count">{stagesData['Screening']}</div> : '—'}</td>
                          <td>{stagesData['Submit to Client'] > 0 ? <div className="stage-count">{stagesData['Submit to Client']}</div> : '—'}</td>
                          <td>{stagesData['Interview 1'] > 0 ? <div className="stage-count">{stagesData['Interview 1']}</div> : '—'}</td>
                          <td>{stagesData['Interview 2'] > 0 ? <div className="stage-count">{stagesData['Interview 2']}</div> : '—'}</td>
                          <td>{stagesData['Interview 3'] > 0 ? <div className="stage-count">{stagesData['Interview 3']}</div> : '—'}</td>
                          <td>{stagesData['Offer'] > 0 ? <div className="stage-count">{stagesData['Offer']}</div> : '—'}</td>
                          <td>{stagesData['Hired'] > 0 ? <div className="stage-count">{stagesData['Hired']}</div> : '—'}</td>
                          <td className="reject-stage">{stagesData['Rejected'] > 0 ? <div className="stage-count">{stagesData['Rejected']}</div> : '—'}</td>
                        </tr>
                        <AnimatePresence>
                          {expandedPosition === posId && (
                            <motion.tr className="expanded-stats-row-wrapper" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                              <td colSpan="10" className="expanded-stats-row">
                                <div className="expanded-stats-content">
                                  <div className="stat-item"><strong>Outreach (7d):</strong> {healthData.outreach || 0}</div>
                                  <div className="stat-item"><strong>Reply Rate (14d):</strong> {healthData.replyRate || 0}%</div>
                                  <div className="stat-item"><strong>Last Activity:</strong> {healthData.daysSinceActivity === 'N/A' ? 'N/A' : `${healthData.daysSinceActivity} days ago`}</div>
                                </div>
                              </td>
                            </motion.tr>
                          )}
                        </AnimatePresence>
                      </React.Fragment>
                    );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>


      {/* Activity Timeline */}
      <ActivityTimeline activities={activityTimeline} />

      {/* Calls Section */}
       <div className="calls-section-container">
            <div className="calls-column">
                <h2 className="section-title"><Clock size={20} /> Calls Scheduled Today</h2>
                <div className="calls-list scrollable-container"> {/* Added scrollable */}
                    {callMetrics.today.length === 0 ? (
                        <p className="no-calls-message">No calls scheduled for today.</p>
                    ) : (
                        <ul> {callMetrics.today.map(call => <CallListItem key={`today-${call.id}`} call={call} formatTime={formatCallTime} />)} </ul>
                    )}
                </div>
            </div>
            <div className="calls-column">
                <h2 className="section-title"><Calendar size={20} /> Calls Scheduled This Week</h2>
                 <div className="calls-list scrollable-container"> {/* Added scrollable */}
                    {callMetrics.week.length === 0 ? (
                        <p className="no-calls-message">No other calls scheduled this week.</p>
                    ) : (
                         <ul> {callMetrics.week.map(call => <CallListItem key={`week-${call.id}`} call={call} formatTime={formatCallTime} showDate={true} />)} </ul>
                    )}
                </div>
            </div>
        </div>


      {/* Modals */}
      <AttentionListModal isOpen={showAttentionModal} onClose={() => setShowAttentionModal(false)} roles={roleHealth} navigate={navigate} />
      {showFunnelModal && ( /* Funnel Modal */
        <ModalWrapper isOpen={showFunnelModal} onClose={() => setShowFunnelModal(false)} title="Team Pipeline Conversion Funnel">
           <PipelineFunnel data={funnelData} stages={stages} />
        </ModalWrapper>
       )}
      <OutreachBreakdownModal isOpen={showOutreachModal} onClose={() => setShowOutreachModal(false)} breakdownData={outreachBreakdownData} />

    </div>
  );
}

// Helper component for Call List Item to reduce repetition
const CallListItem = ({ call, formatTime, showDate = false }) => {
    let timeDisplay = 'Invalid Time';
    let dateDisplay = '';
    if (call.scheduled_call_date) {
        try {
            const callDate = new Date(call.scheduled_call_date);
            if (!isNaN(callDate)) {
                timeDisplay = formatTime(call.scheduled_call_date);
                 if (showDate) {
                    dateDisplay = callDate.toLocaleDateString('en-US', { weekday: 'short', month: 'numeric', day: 'numeric' });
                }
            }
        } catch { /* Use default 'Invalid Time' */ }
    }

    return (
        <li>
            <div className="call-info-main">
                 {/* Display date if needed, otherwise just time */}
                <span className="call-time">{showDate ? dateDisplay : timeDisplay}</span>
                 {showDate && <span className="call-time-secondary">{timeDisplay}</span>} {/* Show time secondary if date shown */}
                <div className="call-details">
                    <strong>{call.candidate_name || 'N/A'}</strong>
                    <span>{call.positions?.title || 'N/A'} (with {call.recruiters?.name || 'N/A'})</span>
                </div>
            </div>
            {call.linkedin_url && (
              <a href={call.linkedin_url} target="_blank" rel="noopener noreferrer" className="btn-call-linkedin" title="View LinkedIn Profile"><ExternalLink size={16} /></a>
            )}
        </li>
    );
};

// Helper component for Modal Wrapper
const ModalWrapper = ({ isOpen, onClose, title, children }) => {
    if (!isOpen) return null;
    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content modal-large" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>{title}</h2>
                    <button className="btn-close-modal" onClick={onClose}><X size={24} /></button>
                </div>
                <div className="modal-body">{children}</div>
                <div className="modal-footer">
                    <button onClick={onClose} className="btn-secondary modal-close-btn">Close</button>
                </div>
            </div>
        </div>
    );
};


export default Dashboard;