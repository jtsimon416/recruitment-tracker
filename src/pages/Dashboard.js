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
    const diffTime = Math.abs(now.getTime() - then.getTime());
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
};

// =========================================================================
// HEALTH BADGE COMPONENT (Utility - Retained from original file for reference)
// NOTE: This component MUST be defined only once in your full file.
// =========================================================================
const HealthBadge = ({ health, stats }) => {
  const colors = {
    healthy: '#E8B4B8', // Rose Gold
    warning: '#F4C2A8', // Peachy Rose
    critical: '#F7A9BA' // Dusty Pink
  };

  return (
    <div className="health-badge-container" title={`Outreach: ${stats.outreach} | Reply Rate: ${stats.replyRate}% | Last Activity: ${stats.daysSinceActivity} days ago`}>
      <div
        className="health-badge"
        style={{
          backgroundColor: colors[health],
          boxShadow: `0 0 8px ${colors[health]}`
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
            {card.value}
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
  // NEW AGGRESSIVE THRESHOLDS
  if (rate >= 35) return '#B8D4D0'; // Normal (Healthy)
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


  const sortedAlerts = [...alerts].sort((a, b) => {
    const priorityOrder = { '#F7A9BA': 0, '#F4C2A8': 1, '#7AA2F7': 2, '#B8D4D0': 3 };
    const colorA = ALERT_TYPE_COLORS[a.type] || '#F7A9BA';
    const colorB = ALERT_TYPE_COLORS[b.type] || '#F7A9BA';

    return priorityOrder[colorA] - priorityOrder[colorB];
  }).slice(0, 5); 

  return (
    <div className="intelligent-alerts-section">
      <div className="alerts-header" onClick={() => setExpanded(!expanded)}>
        <h2 className="section-title">
          <AlertCircle size={20} /> Intelligent Alerts
          {sortedAlerts.length > 0 && (
            <span className="alert-badge">{sortedAlerts.length}</span>
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
            {sortedAlerts.length === 0 ? (
              <div className="alert-card" style={{ borderLeftColor: ALERT_TYPE_COLORS.success }}>
                <div className="alert-content">
                  <CheckCircle size={20} color={ALERT_TYPE_COLORS.success} />
                  <div>
                    <div className="alert-message">All systems running smoothly!</div>
                    <div className="alert-suggestion">💡 Great work team. Keep the momentum going.</div>
                  </div>
                </div>
              </div>
            ) : (
              sortedAlerts.map((alert, index) => {
                const Icon = alertIcons[alert.type] || AlertCircle;
                const displayColor = ALERT_TYPE_COLORS[alert.type] || '#F7A9BA'; 

                return (
                  <motion.div
                    key={index}
                    className="alert-card"
                    style={{ borderLeftColor: displayColor }}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    onClick={() => setExpandedAlert(expandedAlert === index ? null : index)}
                  >
                    <div className="alert-content">
                      <Icon size={20} color={displayColor} />
                      <div className="alert-text-content">
                        <div className="alert-message">{alert.message}</div>
                        <AnimatePresence>
                          {expandedAlert === index && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              className="alert-suggestion"
                            >
                              {alert.suggestion}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                      <ChevronDown
                        size={16}
                        style={{
                          transform: expandedAlert === index ? 'rotate(180deg)' : 'rotate(0deg)',
                          transition: 'transform 0.3s ease'
                        }}
                      />
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
  const [expanded, setExpanded] = useState(false);

  const getActivityIcon = (type) => {
    const icons = {
      candidate_added: Users,
      stage_change: TrendingUp,
      interview_scheduled: Calendar,
      submission: CheckCircle,
      reply_received: Activity
    };
    return icons[type] || Activity;
  };

  const formatTimeAgo = (date) => {
    const now = new Date();
    const diff = now - date;
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (hours < 1) return 'Just now';
    if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    if (days === 1) return '1 day ago';
    return `${days} days ago`;
  };

  return (
    <div className="activity-timeline-section">
      <div className="timeline-header" onClick={() => setExpanded(!expanded)}>
        <h2 className="section-title">
          <Activity size={20} /> Recent Activity
        </h2>
        {expanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
      </div>
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="timeline-container"
          >
            {/* FIX: Increased display limit to 20 events for better visibility */}
            {activities.slice(0, 20).map((activity, index) => {
              const Icon = getActivityIcon(activity.type);
              return (
                <motion.div
                  key={index}
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
                    <div className="timeline-message">{activity.message}</div>
                  </div>
                </motion.div>
              );
            })}
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
    const problemRoles = Object.entries(roles)
        .filter(([, health]) => health.health === 'critical' || health.health === 'warning')
        .sort(([, a], [, b]) => {
            const healthOrder = { critical: 0, warning: 1, healthy: 2 };
            return healthOrder[a.health] - healthOrder[b.health];
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
        // Pass positionId to ActiveTracker to filter the view
        navigate('/active-tracker', { state: { positionId: posId, stage: 'all' } });
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content modal-large" onClick={(e) => e.stopPropagation()}>
                {/* Custom Modal Header for better spacing/theming */}
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
                                {problemRoles.map(([posId, health]) => (
                                    <li key={posId} className="attention-item" >
                                        <div className="attention-info">
                                            <div className="attention-title-group">
                                                <span className="health-dot" style={{backgroundColor: getHealthColor(health.health)}}></span>
                                                <span className="attention-title">{health.title}</span>
                                            </div>
                                            <div className="attention-stats">
                                                <span>Activity: {health.daysSinceActivity}d ago</span>
                                                <span>Outreach: {health.outreach}</span>
                                                <span>Reply Rate: {health.replyRate}%</span>
                                            </div>
                                        </div>
                                        {/* Updated Button: Themed and uses handleDrillDown */}
                                        <button 
                                            className="btn-drill-down-themed" 
                                            onClick={() => handleDrillDown(posId)}
                                        >
                                            <ExternalLink size={16} /> View Pipeline
                                        </button>
                                    </li>
                                ))}
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
        switch (status.toLowerCase()) {
            case 'critical': return { color: 'var(--accent-red)', bg: 'rgba(247, 118, 142, 0.15)' };
            case 'warning': return { color: 'var(--accent-orange)', bg: 'rgba(255, 158, 100, 0.15)' };
            default: return { color: 'var(--accent-green)', bg: 'rgba(158, 206, 106, 0.15)' };
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content modal-large" onClick={(e) => e.stopPropagation()}>
                {/* Custom Modal Header for better spacing/theming */}
                <div className="modal-header">
                    <h2>Team Outreach Breakdown (Last 7 Days)</h2>
                    <button className="btn-close-modal" onClick={onClose}><X size={24} /></button>
                </div>
                <div className="modal-body">
                    <div className="outreach-breakdown-table-container">
                        <table className="outreach-breakdown-table">
                            <thead>
                                <tr>
                                    {/* FIX: Adjusted column widths for better spacing in a 1200px modal */}
                                    <th style={{ width: '30%' }}>Recruiter</th>
                                    <th style={{ width: '15%' }}>Sent</th>
                                    <th style={{ width: '15%' }}>Replied</th>
                                    <th style={{ width: '25%' }}>Reply Rate</th>
                                    <th style={{ width: '15%' }}>Health</th>
                                </tr>
                            </thead>
                            <tbody>
                                {breakdownData.map((rec) => {
                                    const statusColors = getStatusPillColor(rec.status);
                                    const replyRateColor = getReplyRateColor(rec.replyRate); // Use the existing color logic for the number
                                    return (
                                        <tr key={rec.name}>
                                            <td style={{ color: 'var(--rose-gold)', fontWeight: 600 }}>{rec.name}</td>
                                            <td>{rec.totalOutreach}</td>
                                            {/* FIX: Ensure the calculated number shows up, even if 0 */}
                                            <td>{rec.replies || 0}</td> 
                                            <td style={{ color: replyRateColor, fontWeight: 700 }}>{rec.replyRate}%</td>
                                            <td>
                                                <span className="status-pill" style={{ backgroundColor: statusColors.bg, color: statusColors.color, borderColor: statusColors.color }}>
                                                    {rec.status}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
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
// MAIN DASHBOARD COMPONENT
// =========================================================================
function Dashboard() {
  const navigate = useNavigate();
  // FIX: Added 'pipeline' to destructuring to resolve 'no-undef' error
  const { outreachActivities, userProfile, positions: openPositions, pipeline } = useData(); 
  const [pipelineMetrics, setPipelineMetrics] = useState({});
  const [loadingPipeline, setLoadingPipeline] = useState(true);
  const [executiveStats, setExecutiveStats] = useState({});
  const [alerts, setAlerts] = useState([]);
  const [roleHealth, setRoleHealth] = useState({});
  const [activityTimeline, setActivityTimeline] = useState([]);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [expandedPosition, setExpandedPosition] = useState(null);
  const [expandedCard, setExpandedCard] = useState(null);
  
  // State for new modals
  const [showFunnelModal, setShowFunnelModal] = useState(false);
  const [showAttentionModal, setShowAttentionModal] = useState(false);
  const [showOutreachModal, setShowOutreachModal] = useState(false);


  // Hardcoded stages based on ActiveTracker.js
  const stages = ['Screening', 'Submit to Client', 'Interview 1', 'Interview 2', 'Interview 3', 'Offer', 'Hired'];

  // Fetch all data
  const fetchAllDashboardData = useCallback(async () => {
    setLoadingPipeline(true);
    await Promise.all([
      fetchPipelineMetrics(),
      fetchExecutiveStats(),
      fetchActivityTimeline()
    ]);
    setLastUpdated(new Date());
    setLoadingPipeline(false);
  }, []);

  useEffect(() => {
    fetchAllDashboardData();

    // Auto-refresh every 5 minutes
    const refreshInterval = setInterval(fetchAllDashboardData, 5 * 60 * 1000);
    return () => clearInterval(refreshInterval);
  }, [fetchAllDashboardData]);

  // Recalculate alerts when data changes
  useEffect(() => {
    if (!loadingPipeline) {
      // FIX: Passing the 'pipeline' state to the calculation function
      calculateIntelligentAlerts(pipeline); 
    }
  }, [pipelineMetrics, executiveStats, roleHealth, loadingPipeline, openPositions, pipeline]); 

  async function fetchPipelineMetrics() {
    const { data, error } = await supabase
      .from('pipeline')
      .select('*, positions(*, clients(company_name))')
      .neq('stage', 'Archived')
      .eq('positions.status', 'Open');

    if (!error && data) {
      const grouped = data.reduce((acc, item) => {
        const posId = item.position_id;
        if (!acc[posId]) {
          acc[posId] = {
            title: item.positions?.title || 'Unknown',
            company: item.positions?.clients?.company_name || 'N/A',
            count: 0,
            stages: {
              'Screening': 0,
              'Submit to Client': 0,
              'Interview 1': 0,
              'Interview 2': 0,
              'Interview 3': 0,
              'Offer': 0,
              'Hired': 0,
              'Rejected': 0
            },
            pipelineItems: [], 
          };
        }
        const stage = item.stage;
        if (stage in acc[posId].stages) {
          acc[posId].stages[stage]++;
        }
        acc[posId].count++;
        acc[posId].pipelineItems.push(item); 
        return acc;
      }, {});

      setPipelineMetrics(grouped);
      await calculateRoleHealth(grouped, data);
    }
  }

  async function calculateRoleHealth(metrics, pipelineData) {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

    // Fetch outreach data
    const { data: outreachData } = await supabase
      .from('recruiter_outreach')
      .select('position_id, activity_status, created_at')
      .gte('created_at', fourteenDaysAgo.toISOString());

    const healthMap = {};

    for (const [posId, data] of Object.entries(metrics)) {
      const positionOutreach = outreachData?.filter(o => o.position_id === posId) || [];
      const recentOutreach = positionOutreach.filter(o => new Date(o.created_at) >= sevenDaysAgo);
      // FIX: Count all post-sent statuses as replies
      const replyStatuses = ['reply_received', 'accepted', 'call_scheduled', 'declined', 'ready_for_submission'];
      const replies = positionOutreach.filter(o => replyStatuses.includes(o.activity_status)).length || 0;

      const replyRate = positionOutreach.length > 0 ? (replies / positionOutreach.length * 100).toFixed(1) : 0;

      // Get last activity
      const positionPipeline = pipelineData?.filter(p => p.position_id === posId) || [];
      const lastActivity = positionPipeline.reduce((latest, p) => {
        const date = new Date(p.updated_at || p.created_at);
        return date > latest ? date : latest;
      }, new Date(0));

      const daysSinceActivity = calculateDaysDifference(lastActivity.toISOString());

      // Calculate health
      let health = 'healthy';
      if (recentOutreach.length === 0 || replyRate < 10 || daysSinceActivity > 14) {
        health = 'critical';
      } else if (recentOutreach.length < 5 || replyRate < 20 || daysSinceActivity > 7) {
        health = 'warning';
      }

      healthMap[posId] = {
        title: data.title, // ADDED title for Attention Modal
        health,
        outreach: recentOutreach.length,
        replyRate: parseFloat(replyRate),
        daysSinceActivity
      };
    }

    setRoleHealth(healthMap);
  }

  async function fetchExecutiveStats() {
    const today = new Date();
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(today.getDate() - 7);
    const fourteenDaysAgo = new Date(today);
    fourteenDaysAgo.setDate(today.getDate() - 14);

    // Close to Hiring
    const { data: closeToHiring } = await supabase
      .from('pipeline')
      .select('*')
      .in('stage', ['Offer', 'Interview 3'])
      .eq('status', 'Active');

    // Interviews This Week
    const { data: interviews } = await supabase
      .from('interviews')
      .select('*')
      .gte('interview_date', today.toISOString())
      .lte('interview_date', new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString());

    // Submissions This Week
    const { data: submissions } = await supabase
      .from('pipeline')
      .select('*')
      .eq('stage', 'Submit to Client')
      .gte('created_at', sevenDaysAgo.toISOString());

    // Active Candidates
    const { data: activeCandidates } = await supabase
      .from('pipeline')
      .select('*, positions!inner(*)')
      .eq('status', 'Active')
      .eq('positions.status', 'Open');

    // Team Outreach This Week
    const { data: outreach } = await supabase
      .from('recruiter_outreach')
      .select('*')
      .gte('created_at', sevenDaysAgo.toISOString());

    // FIX: Count all post-sent statuses as replies
    const replyStatuses = ['reply_received', 'accepted', 'call_scheduled', 'declined', 'ready_for_submission'];
    const replies = outreach?.filter(o => replyStatuses.includes(o.activity_status)).length || 0;

    const replyRate = outreach?.length > 0 ? ((replies / outreach.length) * 100).toFixed(1) : 0;

    // Roles Needing Attention
    const { data: allOutreach } = await supabase
      .from('recruiter_outreach')
      .select('position_id, activity_status, created_at')
      .gte('created_at', fourteenDaysAgo.toISOString());

    const positionOutreachMap = {};
    allOutreach?.forEach(o => {
      if (!positionOutreachMap[o.position_id]) {
        positionOutreachMap[o.position_id] = { total: 0, replies: 0, recent: 0 };
      }
      positionOutreachMap[o.position_id].total++;
      if (new Date(o.created_at) >= sevenDaysAgo) positionOutreachMap[o.position_id].recent++;
    });

    let rolesNeedingAttention = 0;
    Object.values(positionOutreachMap).forEach(stats => {
      const replyRate = stats.total > 0 ? (stats.replies / stats.total * 100) : 0;
      if (stats.recent < 5 || replyRate < 15 || stats.total === 0) {
        rolesNeedingAttention++;
      }
    });

    setExecutiveStats({
      rolesNeedingAttention,
      closeToHiring: closeToHiring?.length || 0,
      interviewsThisWeek: interviews?.length || 0,
      submissionsThisWeek: submissions?.length || 0,
      activeCandidates: activeCandidates?.length || 0,
      outreachThisWeek: outreach?.length || 0,
      replyRate: parseFloat(replyRate)
    });
  }

  async function fetchActivityTimeline() {
    const today = new Date();
    // FIX: Widened the lookback window from 3 days to 7 days
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(today.getDate() - 7);

    // Get recent pipeline additions
    const { data: recentPipeline } = await supabase
      .from('pipeline')
      .select('*, candidates(name), positions(title)')
      .gte('created_at', sevenDaysAgo.toISOString()) // Use 7 days ago
      .order('created_at', { ascending: false })
      .limit(10); // INCREASED LIMIT

    // Get recent interviews
    const { data: recentInterviews } = await supabase
      .from('interviews')
      .select('*, candidates(name), positions(title)')
      .gte('created_at', sevenDaysAgo.toISOString()) // Use 7 days ago
      .order('created_at', { ascending: false })
      .limit(10); // INCREASED LIMIT

    const timeline = [];

    recentPipeline?.forEach(p => {
      if (p.stage === 'Submit to Client') {
        timeline.push({
          type: 'submission',
          message: `${p.candidates?.name} submitted for ${p.positions?.title}`,
          timestamp: p.created_at
        });
      } else if (['Interview 1', 'Interview 2', 'Interview 3', 'Offer', 'Hired'].includes(p.stage)) {
        timeline.push({
          type: 'stage_change',
          message: `${p.candidates?.name} moved to ${p.stage} for ${p.positions?.title}`,
          timestamp: p.updated_at || p.created_at
        });
      } else {
        timeline.push({
          type: 'candidate_added',
          message: `${p.candidates?.name} added to pipeline for ${p.positions?.title}`,
          timestamp: p.created_at
        });
      }
    });

    recentInterviews?.forEach(i => {
      timeline.push({
        type: 'interview_scheduled',
        message: `Interview scheduled with ${i.candidates?.name} for ${i.positions?.title}`,
        timestamp: i.created_at
      });
    });

    timeline.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    setActivityTimeline(timeline);
  }

  // --- NEW: AGGRESSIVE INTELLIGENT ALERT LOGIC (FIXED) ---
  function calculateIntelligentAlerts(pipeline) { 
    const newAlerts = [];
    const now = new Date();
    const daysToMs = (days) => days * 24 * 60 * 60 * 1000;
    
    // Thresholds (in days) based on your requirements
    const THRESHOLDS = {
        SCREENING_STALL: 3,         // > 2 days
        CLIENT_FEEDBACK_OVERDUE: 6, // > 5 days
        INTERVIEW_STALL: 8,         // > 7 days
        HOLD_REVIEW_OVERDUE: 4,     // > 3 days
        GENERAL_STALE: 7,
        NEW_ROLE_NO_ACTIVITY: 2,
        LOW_REPLY_RATE: 20,         // New aggressive rate
        MIN_OUTREACH_FOR_RATE: 5
    };
    
    // --- 1. Aggressive STAGE STALL Checks (Candidate Level) ---
    const stallAlertsMap = {}; 

    (Array.isArray(pipeline) ? pipeline : []).forEach(item => {
        const posId = item.position_id;
        const lastUpdateDate = item.updated_at || item.created_at;
        const daysStuck = calculateDaysDifference(lastUpdateDate);
        let alertMessage = null;
        let priority = 0; 

        // Check 1: HOLD Review Overdue (> 3 days) - Highest priority
        if (item.status === 'Hold' && daysStuck >= THRESHOLDS.HOLD_REVIEW_OVERDUE) {
            alertMessage = `${item.positions?.title || 'Role'} - Candidate on Hold for ${daysStuck} days.`;
            priority = 4; 
        } 
        
        // Check 2: Submission Bottleneck (> 2 days)
        else if (item.stage === 'Screening' && daysStuck >= THRESHOLDS.SCREENING_STALL) {
            alertMessage = `${item.positions?.title || 'Role'} - Screening stuck for ${daysStuck} days.`;
            priority = 3;
        }

        // Check 3: Client Feedback Overdue (> 5 days)
        else if (item.stage === 'Submit to Client' && daysStuck >= THRESHOLDS.CLIENT_FEEDBACK_OVERDUE) {
            alertMessage = `${item.positions?.title || 'Role'} - Client Feedback Overdue (${daysStuck} days).`;
            priority = 2; 
        }

        // Check 4: Interview Loop Stalled (> 7 days)
        else if (item.stage.startsWith('Interview') && daysStuck >= THRESHOLDS.INTERVIEW_STALL) {
            alertMessage = `${item.positions?.title || 'Role'} - ${item.stage} stuck for ${daysStuck} days.`;
            priority = 1;
        }

        // If an alert is triggered, only add the candidate to the map based on priority
        if (alertMessage) {
            if (!stallAlertsMap[posId] || stallAlertsMap[posId].priority < priority) {
                stallAlertsMap[posId] = {
                    message: alertMessage,
                    suggestion: `Review status for ${item.candidates?.name || 'candidate'} in ${item.stage}.`,
                    type: 'stalledCandidates',
                    color: '#F4C2A8', // Warning Yellow/Rose
                    priority: priority
                };
            }
        }
    });

    Object.values(stallAlertsMap).forEach(alert => newAlerts.push(alert));

    // --- 2. Aggressive GENERAL ROLE HEALTH Checks ---
    
    // Check 2a: New Roles with NO Activity
    const twoDaysAgo = new Date(now.getTime() - daysToMs(THRESHOLDS.NEW_ROLE_NO_ACTIVITY));
    (Array.isArray(openPositions) ? openPositions : []).filter(p => p.status === 'Open' && new Date(p.created_at) >= twoDaysAgo)
      .forEach(pos => {
        const hasPipelineCandidates = pipelineMetrics[pos.id] && pipelineMetrics[pos.id].count > 0;
        const healthStats = roleHealth[pos.id];

        if (!hasPipelineCandidates && (!healthStats || healthStats.outreach === 0) && !stallAlertsMap[pos.id]) {
           newAlerts.push({
            type: 'newRoleOpen',
            message: `${pos.title} has been open > 48hrs with NO activity.`,
            suggestion: '💡 Assign a recruiter immediately. Ensure initial outreach has begun.',
            color: '#F7A9BA' // Critical Red (Dusty Pink)
          });
        }
    });


    // Check 2b & 2c: General STALE and LOW QUALITY Check
    Object.entries(pipelineMetrics).forEach(([posId, data]) => {
      const health = roleHealth[posId];

      if (health && !stallAlertsMap[posId]) { // Only run if no high-priority stall alert exists
        
        // General Role STALE (> 7 days inactivity)
        if (health.daysSinceActivity >= THRESHOLDS.GENERAL_STALE) {
          newAlerts.push({
            type: 'noActivity',
            message: `${data.title} - No pipeline activity in ${health.daysSinceActivity} days.`,
            suggestion: '💡 Re-prioritize this role. Stale pipelines lose good candidates.',
            color: '#F7A9BA' // Critical Red
          });
        }
        
        // Low Reply Rate Alert
        else if (health.outreach >= THRESHOLDS.MIN_OUTREACH_FOR_RATE && health.replyRate < THRESHOLDS.LOW_REPLY_RATE) {
          newAlerts.push({
            type: 'lowReplyRate',
            message: `${data.title} - Reply rate at ${health.replyRate}% (Target: 20%+).`,
            suggestion: '💡 Review outreach messaging. Try personalizing LinkedIn messages.',
            color: '#F4C2A8' // Warning Yellow (Peachy Rose)
          });
        }
      }
    });

    // 3. Success Alert (Final Fallback)
    if (newAlerts.length === 0) {
        newAlerts.push({
            type: 'success',
            message: 'All systems running smoothly! Great work team.',
            suggestion: '💡 No major issues detected. Keep the momentum going.',
            color: '#B8D4D0'
        });
    } else {
        // If critical alerts exist, add a general success message only if submissions/interviews are high
         if (executiveStats.submissionsThisWeek >= 3 || executiveStats.interviewsThisWeek >= 2) {
            newAlerts.push({
                type: 'success',
                message: `Great momentum! ${executiveStats.submissionsThisWeek} new submissions this week`,
                suggestion: '💡 Keep it up! Strong pipeline activity.',
                color: '#B8D4D0' 
            });
        }
    }


    setAlerts(newAlerts);
  }


  // --- FUNNEL DATA MEMO ---
  const funnelData = useMemo(() => {
    const stageCounts = stages.reduce((acc, stage) => {
      let count = 0;
      Object.values(pipelineMetrics).forEach(posData => {
        count += posData.stages[stage] || 0;
      });
      acc[stage] = count;
      return acc;
    }, {});
    
    return stages.map(stage => ({
        stage: stage,
        count: stageCounts[stage] || 0,
    }));
  }, [pipelineMetrics, stages]);


  const callMetrics = useMemo(() => {
    if (!outreachActivities) return { today: [], week: [] };
    const scheduledCalls = outreachActivities.filter(a => a.activity_status === 'call_scheduled' && a.scheduled_call_date);
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfToday = new Date(startOfToday);
    endOfToday.setDate(endOfToday.getDate() + 1);
    const startOfWeek = new Date(startOfToday);
    startOfWeek.setDate(startOfWeek.getDate() - (now.getDay() === 0 ? 6 : now.getDay() - 1));
    startOfWeek.setHours(0, 0, 0, 0);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(endOfWeek.getDate() + 7);
    const callsToday = scheduledCalls.filter(c => new Date(c.scheduled_call_date) >= startOfToday && new Date(c.scheduled_call_date) < endOfToday); 
    const callsThisWeek = scheduledCalls.filter(c => new Date(c.scheduled_call_date) >= startOfWeek && new Date(c.scheduled_call_date) < endOfWeek);
    return { today: callsToday, week: callsThisWeek };
  }, [outreachActivities]);

  const formatCallTime = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  };

  const formatLastUpdated = (date) => {
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'Just now';
    if (minutes === 1) return '1 minute ago';
    if (minutes < 60) return `${minutes} minutes ago`;
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  };

  // --- NEW: handleCardClick function for drill-down/navigation ---
  const handleCardClick = (cardId) => {
    switch (cardId) {
      case 'attention':
        // 1. ROLES NEED ATTENTION: Open the modal list of problem roles
        setShowAttentionModal(true);
        break;
      case 'interviews':
        // 2. INTERVIEWS THIS WEEK: Link to the Interview Hub page
        navigate('/interview-hub');
        break;
      case 'outreach':
        // 3. TEAM OUTREACH THIS WEEK: Open the modal for the outreach breakdown
        setShowOutreachModal(true);
        break;
      default:
        // No action for other cards
        break;
    }
  };

  const sortedPositions = useMemo(() => {
    return Object.entries(pipelineMetrics).sort((a, b) => {
      const healthOrder = { critical: 0, warning: 1, healthy: 2 };
      const healthA = roleHealth[a[0]]?.health || 'healthy';
      const healthB = roleHealth[b[0]]?.health || 'healthy';
      return healthOrder[healthA] - healthOrder[b[0]]?.health; // Sorting by health priority
    });
  }, [pipelineMetrics, roleHealth]);

  // Generate Outreach Breakdown Data for the modal
  const outreachBreakdownData = useMemo(() => {
    const breakdown = {};
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // Define all statuses that count as a "reply" or successful contact
    const replyStatuses = ['reply_received', 'accepted', 'call_scheduled', 'declined', 'ready_for_submission'];

    (outreachActivities || []).forEach(o => {
      // Filter only activities from the last 7 days
      if (new Date(o.created_at) < sevenDaysAgo) return; 

      const recruiterName = o.recruiters?.name || 'Unknown Recruiter';
      const recruiterId = o.recruiter_id || 'unknown';

      if (!breakdown[recruiterId]) {
        breakdown[recruiterId] = {
          name: recruiterName,
          totalOutreach: 0,
          replies: 0,
          replyRate: 0,
          status: 'Normal'
        };
      }
      breakdown[recruiterId].totalOutreach++;
      
      // FIX: Count any post-sent status as a reply/successful contact
      if (replyStatuses.includes(o.activity_status)) {
        breakdown[recruiterId].replies++;
      }
    });

    return Object.values(breakdown).map(rec => {
      rec.replyRate = rec.totalOutreach > 0 ? ((rec.replies / rec.totalOutreach) * 100).toFixed(1) : 0;
      
      // FIX: New Aggressive Thresholds (35% Normal, 20-35% Warning, <20% Critical)
      if (rec.replyRate >= 35) { // >= 35% is Normal/Healthy
        rec.status = 'Normal';
      } else if (rec.replyRate >= 20) { // 20% to 35% is Warning
        rec.status = 'Warning';
      } else { // < 20% is Critical
        rec.status = 'Critical';
      }
      
      return rec;
    }).sort((a, b) => b.totalOutreach - a.totalOutreach); // Sort by highest outreach
  }, [outreachActivities]);


  return (
    <div className="dashboard-container">
      <div className="overview-header">
        <div>
          <h1 className="main-title">Command Center Dashboard</h1>
          <p className="welcome-message">Welcome back, {userProfile?.name || 'Recruiter'}! Here's your intelligent recruitment overview.</p>
        </div>
        <div className="last-updated">
          Last updated: {formatLastUpdated(lastUpdated)}
        </div>
      </div>

      {/* Executive Summary Cards */}
      <ExecutiveSummaryCards stats={executiveStats} onCardClick={handleCardClick} />

      {/* Intelligent Alerts */}
      <IntelligentAlerts alerts={alerts} />

      {/* Enhanced Pipeline with Health */}
      <div className="hiring-pipeline-section">
        <h2 className="section-title">
          <Briefcase size={20} /> HIRING PIPELINE
          {/* === CONNECTED VIEW CHART BUTTON === */}
          <button className="btn-premium btn-small" onClick={() => setShowFunnelModal(true)}> 
            <BarChart3 size={16} /> View Chart
          </button>
          {/* ======================================= */}
        </h2>
        <div className="pipeline-table-container">
          <table className="pipeline-table">
            <thead>
              <tr>
                <th>HEALTH</th>
                <th>POSITION</th>
                <th>SCREENING</th>
                <th>SUBMIT</th>
                <th>INT 1</th>
                <th>INT 2</th>
                <th>INT 3</th>
                <th>OFFER</th>
                <th>HIRED</th>
                <th>REJECT</th>
              </tr>
            </thead>
            <tbody>
              {loadingPipeline ? (
                <tr><td colSpan="10" className="empty-pipeline">Loading pipeline data...</td></tr>
              ) : sortedPositions.length === 0 ? (
                <tr><td colSpan="10" className="empty-pipeline">No open positions with active candidates in the pipeline.</td></tr>
              ) : (
                sortedPositions.map(([posId, data]) => (
                  <React.Fragment key={posId}>
                    <tr
                      className="pipeline-row-enhanced"
                      onClick={() => setExpandedPosition(expandedPosition === posId ? null : posId)}
                    >
                      <td>
                        <HealthBadge
                          health={roleHealth[posId]?.health || 'healthy'}
                          stats={roleHealth[posId] || { outreach: 0, replyRate: 0, daysSinceActivity: 0 }}
                        />
                      </td>
                      <td>
                        <div className="position-title-group">
                          <strong>{data.title} ({data.count})</strong>
                          <span>{data.company}</span>
                        </div>
                      </td>
                      <td>{data.stages['Screening'] > 0 ? <div className="stage-count">{data.stages['Screening']} <motion.div className="arrow" initial={{ x: -5 }} animate={{ x: 5 }} transition={{ repeat: Infinity, duration: 1, ease: "easeInOut" }}>&gt;</motion.div></div> : '—'}</td>
                      <td>{data.stages['Submit to Client'] > 0 ? <div className="stage-count">{data.stages['Submit to Client']} <motion.div className="arrow" initial={{ x: -5 }} animate={{ x: 5 }} transition={{ repeat: Infinity, duration: 1, ease: "easeInOut" }}>&gt;</motion.div></div> : '—'}</td>
                      <td>{data.stages['Interview 1'] > 0 ? <div className="stage-count">{data.stages['Interview 1']}</div> : '—'}</td>
                      <td>{data.stages['Interview 2'] > 0 ? <div className="stage-count">{data.stages['Interview 2']}</div> : '—'}</td>
                      <td>{data.stages['Interview 3'] > 0 ? <div className="stage-count">{data.stages['Interview 3']}</div> : '—'}</td>
                      <td>{data.stages['Offer'] > 0 ? <div className="stage-count">{data.stages['Offer']}</div> : '—'}</td>
                      <td>{data.stages['Hired'] > 0 ? <div className="stage-count">{data.stages['Hired']}</div> : '—'}</td>
                      <td className="reject-stage">{data.stages['Rejected'] > 0 ? <div className="stage-count">{data.stages['Rejected']}</div> : '—'}</td>
                    </tr>
                    <AnimatePresence>
                      {expandedPosition === posId && roleHealth[posId] && (
                        <motion.tr
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                        >
                          <td colSpan="10" className="expanded-stats-row">
                            <div className="expanded-stats-content">
                              <div className="stat-item">
                                <strong>Total Outreach:</strong> {roleHealth[posId].outreach} messages sent
                              </div>
                              <div className="stat-item">
                                <strong>Reply Rate:</strong> {roleHealth[posId].replyRate}%
                              </div>
                              <div className="stat-item">
                                <strong>Last Activity:</strong> {roleHealth[posId].daysSinceActivity} days ago
                              </div>
                            </div>
                          </td>
                        </motion.tr>
                      )}
                    </AnimatePresence>
                  </React.Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Activity Timeline */}
      <ActivityTimeline activities={activityTimeline} />

      {/* Calls Section (Preserved) */}
      <div className="calls-section-container">
        <div className="calls-column">
          <h2 className="section-title"><Clock size={20} /> Calls Scheduled Today</h2>
          <div className="calls-list">
            {callMetrics.today.length === 0 ? (
              <p className="no-calls-message">No calls scheduled for today.</p>
            ) : (
              <ul>
                {callMetrics.today.map(call => (
                  <li key={call.id}>
                    <div className="call-info-main">
                      <span className="call-time">{formatCallTime(call.scheduled_call_date)}</span>
                      <div className="call-details">
                        <strong>{call.candidate_name}</strong>
                        <span>{call.positions?.title} (with {call.recruiters?.name})</span>
                      </div>
                    </div>
                    <a href={call.linkedin_url} target="_blank" rel="noopener noreferrer" className="btn-call-linkedin" title="View LinkedIn Profile">
                      <ExternalLink size={16} />
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
        <div className="calls-column">
          <h2 className="section-title"><Calendar size={20} /> Calls Scheduled This Week</h2>
          <div className="calls-list">
            {callMetrics.week.length === 0 ? (
              <p className="no-calls-message">No other calls scheduled this week.</p>
            ) : (
              <ul>
                {callMetrics.week.map(call => (
                  <li key={call.id}>
                    <div className="call-info-main">
                      <span className="call-time">{new Date(call.scheduled_call_date).toLocaleDateString('en-US', { weekday: 'short' })}</span>
                      <div className="call-details">
                        <strong>{call.candidate_name}</strong>
                        <span>{call.positions?.title} (with {call.recruiters?.name})</span>
                      </div>
                    </div>
                    <a href={call.linkedin_url} target="_blank" rel="noopener noreferrer" className="btn-call-linkedin" title="View LinkedIn Profile">
                      <ExternalLink size={16} />
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      {/* === MODALS FOR CLICKABLE CARDS === */}

      {/* 1. ROLES NEED ATTENTION MODAL */}
      <AttentionListModal 
        isOpen={showAttentionModal}
        onClose={() => setShowAttentionModal(false)}
        roles={roleHealth}
        navigate={navigate}
      />

      {/* 2. PIPELINE FUNNEL MODAL */}
      {showFunnelModal && (
        <div className="modal-overlay" onClick={() => setShowFunnelModal(false)}>
          <div className="modal-content modal-large" onClick={(e) => e.stopPropagation()}>
            <h2>Team Pipeline Conversion Funnel</h2>
            <PipelineFunnel data={funnelData} stages={stages} />
            <div className="modal-actions">
              <button onClick={() => setShowFunnelModal(false)} className="btn-secondary modal-close-btn">Close</button>
            </div>
          </div>
        </div>
      )}
      
      {/* 3. OUTREACH BREAKDOWN MODAL */}
      {showOutreachModal && (
        <OutreachBreakdownModal 
          isOpen={showOutreachModal}
          onClose={() => setShowOutreachModal(false)}
          breakdownData={outreachBreakdownData}
        />
      )}
    </div>
  );
}

export default Dashboard;