import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useData } from '../contexts/DataContext';
import { supabase } from '../services/supabaseClient';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, Clock, Calendar, Briefcase, ExternalLink, AlertTriangle, Target,
  CheckCircle, TrendingUp, TrendingDown, Zap, AlertCircle, Activity,
  ChevronDown, ChevronUp, BarChart3
} from 'lucide-react';
import '../styles/Dashboard.css';

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
      color: '#B8D4D0'
    },
    {
      id: 'interviews',
      icon: Calendar,
      value: stats.interviewsThisWeek || 0,
      label: 'Interviews This Week',
      color: '#C5B9D6'
    },
    {
      id: 'submissions',
      icon: CheckCircle,
      value: stats.submissionsThisWeek || 0,
      label: 'Submissions This Week',
      color: '#F4C2A8'
    },
    {
      id: 'activeCandidates',
      icon: Users,
      value: stats.activeCandidates || 0,
      label: 'Active Candidates',
      color: '#E8B4B8'
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
  if (rate > 25) return '#B8D4D0'; // Green
  if (rate >= 15) return '#F4C2A8'; // Yellow
  return '#F7A9BA'; // Red
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
    highActivity: Activity
  };

  const sortedAlerts = [...alerts].sort((a, b) => {
    const priorityOrder = { red: 0, yellow: 1, green: 2, blue: 3 };
    return priorityOrder[a.color] - priorityOrder[b.color];
  }).slice(0, 5); // Show top 5

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
              <div className="alert-card" style={{ borderLeftColor: '#B8D4D0' }}>
                <div className="alert-content">
                  <CheckCircle size={20} color="#B8D4D0" />
                  <div>
                    <div className="alert-message">All systems running smoothly!</div>
                    <div className="alert-suggestion">💡 Great work team. Keep the momentum going.</div>
                  </div>
                </div>
              </div>
            ) : (
              sortedAlerts.map((alert, index) => {
                const Icon = alertIcons[alert.type];
                return (
                  <motion.div
                    key={index}
                    className="alert-card"
                    style={{ borderLeftColor: alert.color }}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    onClick={() => setExpandedAlert(expandedAlert === index ? null : index)}
                  >
                    <div className="alert-content">
                      <Icon size={20} color={alert.color} />
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
    const diff = now - new Date(date);
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
            {activities.slice(0, 10).map((activity, index) => {
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
// HEALTH BADGE COMPONENT
// =========================================================================
const HealthBadge = ({ health, stats }) => {
  const colors = {
    healthy: '#E8B4B8',
    warning: '#F4C2A8',
    critical: '#F7A9BA'
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
// MAIN DASHBOARD COMPONENT
// =========================================================================
function Dashboard() {
  const { outreachActivities, userProfile, isDirectorOrManager } = useData();
  const [pipelineMetrics, setPipelineMetrics] = useState({});
  const [loadingPipeline, setLoadingPipeline] = useState(true);
  const [executiveStats, setExecutiveStats] = useState({});
  const [alerts, setAlerts] = useState([]);
  const [roleHealth, setRoleHealth] = useState({});
  const [activityTimeline, setActivityTimeline] = useState([]);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [expandedPosition, setExpandedPosition] = useState(null);
  const [expandedCard, setExpandedCard] = useState(null);

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
      calculateIntelligentAlerts();
    }
  }, [pipelineMetrics, executiveStats, roleHealth, loadingPipeline]);

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
            }
          };
        }
        const stage = item.stage;
        if (stage in acc[posId].stages) {
          acc[posId].stages[stage]++;
        }
        acc[posId].count++;
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
      const replies = positionOutreach.filter(o => o.activity_status === 'reply_received').length;
      const replyRate = positionOutreach.length > 0 ? (replies / positionOutreach.length * 100).toFixed(1) : 0;

      // Get last activity
      const positionPipeline = pipelineData?.filter(p => p.position_id === posId) || [];
      const lastActivity = positionPipeline.reduce((latest, p) => {
        const date = new Date(p.updated_at || p.created_at);
        return date > latest ? date : latest;
      }, new Date(0));

      const daysSinceActivity = Math.floor((new Date() - lastActivity) / 86400000);

      // Calculate health
      let health = 'healthy';
      if (recentOutreach.length === 0 || replyRate < 10 || daysSinceActivity > 14) {
        health = 'critical';
      } else if (recentOutreach.length < 5 || replyRate < 20 || daysSinceActivity > 7) {
        health = 'warning';
      }

      healthMap[posId] = {
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

    const replies = outreach?.filter(o => o.activity_status === 'reply_received').length || 0;
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
      if (o.activity_status === 'reply_received') positionOutreachMap[o.position_id].replies++;
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
    const threeDaysAgo = new Date(today);
    threeDaysAgo.setDate(today.getDate() - 3);

    // Get recent pipeline additions
    const { data: recentPipeline } = await supabase
      .from('pipeline')
      .select('*, candidates(name), positions(title)')
      .gte('created_at', threeDaysAgo.toISOString())
      .order('created_at', { ascending: false })
      .limit(5);

    // Get recent interviews
    const { data: recentInterviews } = await supabase
      .from('interviews')
      .select('*, candidates(name), positions(title)')
      .gte('created_at', threeDaysAgo.toISOString())
      .order('created_at', { ascending: false })
      .limit(5);

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

  function calculateIntelligentAlerts() {
    const newAlerts = [];
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

    // Check each position for alerts
    Object.entries(pipelineMetrics).forEach(([posId, data]) => {
      const health = roleHealth[posId];

      if (health) {
        // Zero Submissions Alert
        if (data.stages['Submit to Client'] === 0) {
          newAlerts.push({
            type: 'zeroSubmissions',
            message: `${data.title} - No submissions in 14 days`,
            suggestion: '💡 Increase sourcing outreach. Consider expanding search criteria or tapping into passive candidates.',
            color: '#F7A9BA'
          });
        }

        // Low Reply Rate Alert
        if (health.outreach >= 10 && health.replyRate < 15) {
          newAlerts.push({
            type: 'lowReplyRate',
            message: `${data.title} - Reply rate at ${health.replyRate}% (Target: 20%+)`,
            suggestion: '💡 Review outreach messaging. Try personalizing LinkedIn messages or A/B testing different approaches.',
            color: '#F7A9BA'
          });
        }

        // No Activity Alert
        if (health.daysSinceActivity >= 14) {
          newAlerts.push({
            type: 'noActivity',
            message: `${data.title} - No activity in ${health.daysSinceActivity} days`,
            suggestion: '💡 Re-prioritize this role or consider if it\'s still active. Stale roles hurt team morale.',
            color: '#F7A9BA'
          });
        }

        // High Activity Alert
        if (health.outreach >= 10) {
          newAlerts.push({
            type: 'highActivity',
            message: `${data.title} - ${health.outreach} outreach activities this week`,
            suggestion: '💡 High activity! Monitor reply rates and conversion to ensure quality over quantity.',
            color: '#7AA2F7'
          });
        }
      }
    });

    // Success Alert
    if (executiveStats.submissionsThisWeek >= 3 || executiveStats.interviewsThisWeek >= 2) {
      newAlerts.push({
        type: 'success',
        message: `Great momentum! ${executiveStats.submissionsThisWeek} new submissions this week`,
        suggestion: '💡 Keep it up! Strong pipeline activity.',
        color: '#B8D4D0'
      });
    }

    setAlerts(newAlerts);
  }

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

  const handleCardClick = (cardId) => {
    setExpandedCard(expandedCard === cardId ? null : cardId);
  };

  const sortedPositions = useMemo(() => {
    return Object.entries(pipelineMetrics).sort((a, b) => {
      const healthOrder = { critical: 0, warning: 1, healthy: 2 };
      const healthA = roleHealth[a[0]]?.health || 'healthy';
      const healthB = roleHealth[b[0]]?.health || 'healthy';
      return healthOrder[healthA] - healthOrder[healthB];
    });
  }, [pipelineMetrics, roleHealth]);

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
          <button className="btn-premium btn-small" onClick={() => setExpandedCard(expandedCard === 'chart' ? null : 'chart')}>
            <BarChart3 size={16} /> View Chart
          </button>
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
    </div>
  );
}

export default Dashboard;