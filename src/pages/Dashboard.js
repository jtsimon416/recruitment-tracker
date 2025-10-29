import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useData } from '../contexts/DataContext';
import { supabase } from '../services/supabaseClient';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, RadarChart, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis, Radar
} from 'recharts';
import {
  Users, Clock, Calendar, Briefcase, ExternalLink, AlertTriangle, Target,
  CheckCircle, TrendingUp, TrendingDown, Zap, AlertCircle, Activity,
  ChevronDown, ChevronUp, BarChart3, Star, X, Award, Flame, Trophy,
  UserCheck, Phone, Mail, MessageCircle, TrendingUpIcon
} from 'lucide-react';
import AnimatedCounter from '../components/AnimatedCounter';
import PipelineFunnel from '../components/PipelineFunnel';
import '../styles/Dashboard.css';

const COLORS = ['#E8B4B8', '#B8D4D0', '#C5B9D6', '#F4C2A8', '#7AA2F7', '#F7A9BA'];

const calculateDaysDifference = (dateString) => {
    if (!dateString) return 0;
    const now = new Date();
    const then = new Date(dateString);
    if (isNaN(then.getTime())) return Infinity;
    const diffTime = Math.abs(now.getTime() - then.getTime());
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
};

// =========================================================================
// TAB NAVIGATION
// =========================================================================
const TabNavigation = ({ activeTab, setActiveTab }) => {
  const tabs = [
    { id: 'overview', label: 'Command Center', icon: Activity },
    { id: 'performance', label: 'Performance', icon: TrendingUp },
    { id: 'team', label: 'Team Metrics', icon: Users },
    { id: 'operations', label: 'Daily Operations', icon: Calendar },
    { id: 'pipeline', label: 'Pipeline Deep Dive', icon: Briefcase }
  ];

  return (
    <div className="dashboard-tabs">
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
          </motion.button>
        );
      })}
    </div>
  );
};

// =========================================================================
// ANIMATED METRIC CARD
// =========================================================================
const AnimatedMetricCard = ({ icon: Icon, value, label, color, trend, trendValue, onClick }) => {
  return (
    <motion.div
      className={`metric-card ${onClick ? 'clickable' : ''}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={onClick ? { scale: 1.05, y: -5 } : {}}
      onClick={onClick}
      style={{ borderTop: `4px solid ${color}` }}
    >
      <div className="metric-icon" style={{ color }}>
        <Icon size={32} />
      </div>
      <div className="metric-value">
        <AnimatedCounter end={value} duration={1500} />
      </div>
      <div className="metric-label">{label}</div>
      {trend && (
        <div className={`metric-trend ${trend === 'up' ? 'positive' : 'negative'}`}>
          {trend === 'up' ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
          <span>{trendValue}</span>
        </div>
      )}
    </motion.div>
  );
};

// =========================================================================
// PERFORMANCE TAB
// =========================================================================
const PerformanceTab = ({ stats, historicalData, roleHealth }) => {
  const conversionData = useMemo(() => {
    if (!stats.activeCandidates) return [];

    const total = stats.activeCandidates || 1;
    return [
      { stage: 'Outreach', value: stats.outreachThisWeek || 0, percentage: ((stats.outreachThisWeek / total) * 100).toFixed(1) },
      { stage: 'Replied', value: Math.floor((stats.outreachThisWeek * (stats.replyRate / 100)) || 0), percentage: (stats.replyRate || 0).toFixed(1) },
      { stage: 'Submitted', value: stats.submissionsThisWeek || 0, percentage: ((stats.submissionsThisWeek / total) * 100).toFixed(1) },
      { stage: 'Interview', value: stats.interviewsThisWeek || 0, percentage: ((stats.interviewsThisWeek / total) * 100).toFixed(1) },
      { stage: 'Near Hire', value: stats.closeToHiring || 0, percentage: ((stats.closeToHiring / total) * 100).toFixed(1) }
    ];
  }, [stats]);

  const healthDistribution = useMemo(() => {
    const distribution = { healthy: 0, warning: 0, critical: 0 };
    Object.values(roleHealth || {}).forEach(role => {
      if (role.health in distribution) distribution[role.health]++;
    });
    return [
      { name: 'Healthy', value: distribution.healthy, color: '#B8D4D0' },
      { name: 'Warning', value: distribution.warning, color: '#F4C2A8' },
      { name: 'Critical', value: distribution.critical, color: '#F7A9BA' }
    ];
  }, [roleHealth]);

  return (
    <div className="performance-tab">
      <div className="charts-grid">
        {/* Conversion Funnel Chart */}
        <motion.div
          className="chart-card"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
        >
          <h3><Target size={20} /> Conversion Funnel (This Week)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={conversionData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
              <XAxis dataKey="stage" stroke="#a0a0a0" />
              <YAxis stroke="#a0a0a0" />
              <Tooltip
                contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333', color: '#ffffff' }}
                labelStyle={{ color: '#ffffff' }}
                itemStyle={{ color: '#ffffff' }}
                formatter={(value, name, props) => [`${value} (${props.payload.percentage}%)`, 'Count']}
              />
              <Bar dataKey="value" fill="#E8B4B8" radius={[8, 8, 0, 0]}>
                {conversionData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Role Health Distribution */}
        <motion.div
          className="chart-card"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
        >
          <h3><Activity size={20} /> Role Health Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={healthDistribution}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                fill="#8884d8"
                paddingAngle={5}
                dataKey="value"
                label={(entry) => entry.value > 0 ? `${entry.name}: ${entry.value}` : ''}
              >
                {healthDistribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333', color: '#ffffff' }}
                itemStyle={{ color: '#ffffff' }}
                labelStyle={{ color: '#ffffff' }}
              />
            </PieChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Weekly Trend */}
        <motion.div
          className="chart-card full-width"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h3><TrendingUp size={20} /> Activity Trend (Last 7 Days)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={historicalData}>
              <defs>
                <linearGradient id="colorOutreach" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#E8B4B8" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#E8B4B8" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorSubmissions" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#7AA2F7" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#7AA2F7" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
              <XAxis dataKey="day" stroke="#a0a0a0" />
              <YAxis stroke="#a0a0a0" />
              <Tooltip
                contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333', color: '#ffffff' }}
                itemStyle={{ color: '#ffffff' }}
                labelStyle={{ color: '#ffffff' }}
              />
              <Legend />
              <Area type="monotone" dataKey="outreach" stroke="#E8B4B8" fillOpacity={1} fill="url(#colorOutreach)" />
              <Area type="monotone" dataKey="submissions" stroke="#7AA2F7" fillOpacity={1} fill="url(#colorSubmissions)" />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>
      </div>
    </div>
  );
};

// =========================================================================
// TEAM METRICS TAB
// =========================================================================
const TeamMetricsTab = ({ recruiterStats }) => {
  const [sortBy, setSortBy] = useState('totalOutreach');

  const sortedRecruiters = useMemo(() => {
    return [...recruiterStats].sort((a, b) => b[sortBy] - a[sortBy]);
  }, [recruiterStats, sortBy]);

  const topPerformers = sortedRecruiters.slice(0, 3);

  const performanceData = useMemo(() => {
    return recruiterStats.map(rec => ({
      name: rec.name.split(' ')[0],
      outreach: rec.totalOutreach,
      replies: rec.replies,
      submissions: rec.internalSubmissions || 0,
      replyRate: rec.replyRate
    }));
  }, [recruiterStats]);

  return (
    <div className="team-metrics-tab">
      {/* Top Performers */}
      <div className="top-performers-section">
        <h2><Trophy size={24} /> Top Performers This Week</h2>
        <div className="podium-container">
          {topPerformers.map((recruiter, index) => (
            <motion.div
              key={recruiter.id}
              className={`podium-card rank-${index + 1}`}
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <div className="podium-rank">
                {index === 0 && <Trophy size={32} color="#FFD700" />}
                {index === 1 && <Award size={28} color="#C0C0C0" />}
                {index === 2 && <Award size={24} color="#CD7F32" />}
              </div>
              <div className="podium-name">{recruiter.name}</div>
              <div className="podium-stats">
                <div className="stat-item">
                  <Mail size={16} />
                  <span>{recruiter.totalOutreach} sent</span>
                </div>
                <div className="stat-item">
                  <MessageCircle size={16} />
                  <span>{recruiter.replies} replies</span>
                </div>
                <div className="stat-item">
                  <CheckCircle size={16} />
                  <span>{recruiter.internalSubmissions || 0} screened</span>
                </div>
                <div className="stat-item">
                  <Flame size={16} />
                  <span>{recruiter.replyRate}% rate</span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Team Performance Chart */}
      <motion.div
        className="chart-card full-width"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h3><BarChart3 size={20} /> Team Performance Comparison</h3>
        <ResponsiveContainer width="100%" height={350}>
          <BarChart data={performanceData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
            <XAxis dataKey="name" stroke="#a0a0a0" />
            <YAxis stroke="#a0a0a0" />
            <Tooltip
              contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333', color: '#ffffff' }}
              itemStyle={{ color: '#ffffff' }}
              labelStyle={{ color: '#ffffff' }}
            />
            <Legend />
            <Bar dataKey="outreach" fill="#E8B4B8" name="Outreach Sent" radius={[8, 8, 0, 0]} />
            <Bar dataKey="replies" fill="#B8D4D0" name="Replies" radius={[8, 8, 0, 0]} />
            <Bar dataKey="submissions" fill="#7AA2F7" name="Internal Submissions" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </motion.div>

      {/* Leaderboard */}
      <div className="leaderboard-section">
        <div className="leaderboard-header">
          <h3><Users size={20} /> Full Team Leaderboard</h3>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="sort-select">
            <option value="totalOutreach">Most Outreach</option>
            <option value="replies">Most Replies</option>
            <option value="internalSubmissions">Most Submissions</option>
            <option value="replyRate">Best Reply Rate</option>
          </select>
        </div>
        <div className="leaderboard-list">
          {sortedRecruiters.map((recruiter, index) => (
            <motion.div
              key={recruiter.id}
              className="leaderboard-item"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <div className="leaderboard-rank">#{index + 1}</div>
              <div className="leaderboard-name">{recruiter.name}</div>
              <div className="leaderboard-stats">
                <span className="stat-badge">{recruiter.totalOutreach} sent</span>
                <span className="stat-badge">{recruiter.replies} replied</span>
                <span className="stat-badge">{recruiter.internalSubmissions || 0} screened</span>
                <span className={`stat-badge ${recruiter.replyRate >= 35 ? 'success' : recruiter.replyRate >= 20 ? 'warning' : 'critical'}`}>
                  {recruiter.replyRate}% rate
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};

// =========================================================================
// DAILY OPERATIONS TAB
// =========================================================================
const DailyOperationsTab = ({ callsData, interviewsData }) => {
  const formatTime = (dateString) => {
    try {
      return new Date(dateString).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    } catch {
      return 'Invalid Time';
    }
  };

  const formatDate = (dateString) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    } catch {
      return 'Invalid Date';
    }
  };

  return (
    <div className="daily-operations-tab">
      <h2><Calendar size={24} /> Today's Schedule & This Week's Activities</h2>

      <div className="operations-grid">
        {/* Calls Today */}
        <motion.div
          className="operations-card"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
        >
          <div className="operations-card-header">
            <Phone size={20} color="#E8B4B8" />
            <h3>Calls Scheduled Today</h3>
            <span className="count-badge">{callsData.today.length}</span>
          </div>
          <div className="operations-list">
            {callsData.today.length === 0 ? (
              <p className="empty-message">No calls scheduled for today</p>
            ) : (
              callsData.today.map(call => (
                <div key={call.id} className="operation-item">
                  <div className="operation-time">{formatTime(call.scheduled_call_date)}</div>
                  <div className="operation-details">
                    <strong>{call.candidate_name}</strong>
                    <span>{call.positions?.title || 'N/A'}</span>
                    <span className="recruiter-name">with {call.recruiters?.name || 'N/A'}</span>
                  </div>
                  {call.linkedin_url && (
                    <a href={call.linkedin_url} target="_blank" rel="noopener noreferrer" className="btn-link">
                      <ExternalLink size={16} />
                    </a>
                  )}
                </div>
              ))
            )}
          </div>
        </motion.div>

        {/* Calls This Week */}
        <motion.div
          className="operations-card"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="operations-card-header">
            <Phone size={20} color="#B8D4D0" />
            <h3>Calls This Week</h3>
            <span className="count-badge">{callsData.week.length}</span>
          </div>
          <div className="operations-list">
            {callsData.week.length === 0 ? (
              <p className="empty-message">No upcoming calls this week</p>
            ) : (
              callsData.week.map(call => (
                <div key={call.id} className="operation-item">
                  <div className="operation-date">{formatDate(call.scheduled_call_date)}</div>
                  <div className="operation-details">
                    <strong>{call.candidate_name}</strong>
                    <span>{call.positions?.title || 'N/A'}</span>
                    <span className="recruiter-name">with {call.recruiters?.name || 'N/A'}</span>
                  </div>
                  {call.linkedin_url && (
                    <a href={call.linkedin_url} target="_blank" rel="noopener noreferrer" className="btn-link">
                      <ExternalLink size={16} />
                    </a>
                  )}
                </div>
              ))
            )}
          </div>
        </motion.div>

        {/* Interviews Today */}
        <motion.div
          className="operations-card"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="operations-card-header">
            <Calendar size={20} color="#C5B9D6" />
            <h3>Interviews Today</h3>
            <span className="count-badge">{interviewsData.today.length}</span>
          </div>
          <div className="operations-list">
            {interviewsData.today.length === 0 ? (
              <p className="empty-message">No interviews scheduled for today</p>
            ) : (
              interviewsData.today.map(interview => (
                <div key={interview.id} className="operation-item">
                  <div className="operation-time">{formatTime(interview.interview_date)}</div>
                  <div className="operation-details">
                    <strong>{interview.candidates?.name || 'N/A'}</strong>
                    <span>{interview.positions?.title || 'N/A'}</span>
                    <span className="recruiter-name">with {interview.recruiters?.name || 'N/A'}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </motion.div>

        {/* Interviews This Week */}
        <motion.div
          className="operations-card"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="operations-card-header">
            <Calendar size={20} color="#F4C2A8" />
            <h3>Interviews This Week</h3>
            <span className="count-badge">{interviewsData.week.length}</span>
          </div>
          <div className="operations-list">
            {interviewsData.week.length === 0 ? (
              <p className="empty-message">No upcoming interviews this week</p>
            ) : (
              interviewsData.week.map(interview => (
                <div key={interview.id} className="operation-item">
                  <div className="operation-date">{formatDate(interview.interview_date)}</div>
                  <div className="operation-details">
                    <strong>{interview.candidates?.name || 'N/A'}</strong>
                    <span>{interview.positions?.title || 'N/A'}</span>
                    <span className="recruiter-name">with {interview.recruiters?.name || 'N/A'}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

// =========================================================================
// PIPELINE DEEP DIVE TAB
// =========================================================================
const PipelineDeepDiveTab = ({ pipelineMetrics, roleHealth, navigate }) => {
  const [expandedPosition, setExpandedPosition] = useState(null);

  const sortedPositions = useMemo(() => {
    if (!pipelineMetrics || !roleHealth) return [];

    return Object.entries(pipelineMetrics)
      .filter(([posId]) => roleHealth[posId])
      .sort(([posIdA], [posIdB]) => {
        const healthOrder = { critical: 0, warning: 1, healthy: 2 };
        const healthA = roleHealth[posIdA]?.health || 'healthy';
        const healthB = roleHealth[posIdB]?.health || 'healthy';
        return healthOrder[healthA] - healthOrder[healthB];
      });
  }, [pipelineMetrics, roleHealth]);

  const getHealthColor = (health) => {
    switch(health) {
      case 'critical': return '#F7A9BA';
      case 'warning': return '#F4C2A8';
      default: return '#B8D4D0';
    }
  };

  return (
    <div className="pipeline-deep-dive-tab">
      <h2><Briefcase size={24} /> Role-by-Role Breakdown</h2>
      <div className="roles-list">
        {sortedPositions.map(([posId, data]) => {
          const health = roleHealth[posId];
          const isExpanded = expandedPosition === posId;

          return (
            <motion.div
              key={posId}
              className="role-detail-card"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              style={{ borderLeft: `4px solid ${getHealthColor(health.health)}` }}
            >
              <div className="role-header" onClick={() => setExpandedPosition(isExpanded ? null : posId)}>
                <div className="role-title-section">
                  <h3>{data.title}</h3>
                  <p>{data.company}</p>
                </div>
                <div className="role-quick-stats">
                  <div className="quick-stat">
                    <Users size={16} />
                    <span>{data.count} candidates</span>
                  </div>
                  <div className="quick-stat">
                    <Activity size={16} />
                    <span>{health.outreach} outreach</span>
                  </div>
                  <div className="quick-stat">
                    <MessageCircle size={16} />
                    <span>{health.replyRate}% reply rate</span>
                  </div>
                  <div className={`health-indicator ${health.health}`}>
                    {health.health}
                  </div>
                </div>
                {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
              </div>

              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    className="role-expanded-content"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                  >
                    <div className="stage-breakdown">
                      {Object.entries(data.stages).map(([stage, count]) => (
                        count > 0 && (
                          <div key={stage} className="stage-stat">
                            <span className="stage-name">{stage}</span>
                            <div className="stage-bar">
                              <motion.div
                                className="stage-fill"
                                initial={{ width: 0 }}
                                animate={{ width: `${(count / data.count) * 100}%` }}
                                transition={{ duration: 0.5 }}
                                style={{ backgroundColor: COLORS[Object.keys(data.stages).indexOf(stage) % COLORS.length] }}
                              />
                              <span className="stage-count">{count}</span>
                            </div>
                          </div>
                        )
                      ))}
                    </div>
                    <div className="role-actions">
                      <button
                        className="btn-primary"
                        onClick={() => navigate('/active-tracker', { state: { positionId: posId } })}
                      >
                        <ExternalLink size={16} />
                        View Full Pipeline
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

// =========================================================================
// MAIN DASHBOARD COMPONENT
// =========================================================================
function Dashboard() {
  const navigate = useNavigate();
  const { outreachActivities = [], userProfile, positions = [], pipeline = [], recruiters = [] } = useData();
  const [activeTab, setActiveTab] = useState('overview');
  const [pipelineMetrics, setPipelineMetrics] = useState({});
  const [executiveStats, setExecutiveStats] = useState({});
  const [roleHealth, setRoleHealth] = useState({});
  const [historicalData, setHistoricalData] = useState([]);
  const [recruiterStats, setRecruiterStats] = useState([]);
  const [callsData, setCallsData] = useState({ today: [], week: [] });
  const [interviewsData, setInterviewsData] = useState({ today: [], week: [] });
  const [loading, setLoading] = useState(true);

  const fetchAllData = useCallback(async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchPipelineMetrics(),
        fetchExecutiveStats(),
        fetchHistoricalData(),
        fetchRecruiterStats(),
        fetchCallsAndInterviews()
      ]);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }, [positions]);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  async function fetchPipelineMetrics() {
    const { data, error } = await supabase
      .from('pipeline')
      .select('*, positions(*, clients(company_name)), candidates(name)')
      .neq('stage', 'Archived')
      .eq('positions.status', 'Open');

    if (error || !data) {
      setPipelineMetrics({});
      return;
    }

    const grouped = data.reduce((acc, item) => {
      const posId = item?.position_id;
      if (!posId) return acc;

      if (!acc[posId]) {
        acc[posId] = {
          title: item?.positions?.title || 'Unknown Position',
          company: item?.positions?.clients?.company_name || 'N/A',
          count: 0,
          stages: { 'Screening': 0, 'Submit to Client': 0, 'Interview 1': 0, 'Interview 2': 0, 'Interview 3': 0, 'Offer': 0, 'Hired': 0 }
        };
      }

      const stage = item.stage;
      if (stage && stage in acc[posId].stages) {
        acc[posId].stages[stage]++;
      }
      acc[posId].count++;
      return acc;
    }, {});

    setPipelineMetrics(grouped);
    await calculateRoleHealth(grouped, data);
  }

  async function calculateRoleHealth(metrics, pipelineData) {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

    const positionIds = Object.keys(metrics);
    if (positionIds.length === 0) {
      setRoleHealth({});
      return;
    }

    const { data: outreachData } = await supabase
      .from('recruiter_outreach')
      .select('position_id, activity_status, created_at')
      .in('position_id', positionIds)
      .gte('created_at', fourteenDaysAgo.toISOString());

    const healthMap = {};
    const replyStatuses = ['reply_received', 'accepted', 'call_scheduled', 'declined', 'ready_for_submission'];

    for (const [posId, data] of Object.entries(metrics)) {
      const positionOutreach = outreachData?.filter(o => o.position_id === posId) || [];
      const recentOutreach = positionOutreach.filter(o => new Date(o.created_at) >= sevenDaysAgo);
      const replies = positionOutreach.filter(o => replyStatuses.includes(o.activity_status)).length;
      const replyRate = positionOutreach.length > 0 ? parseFloat(((replies / positionOutreach.length) * 100).toFixed(1)) : 0;

      const positionPipeline = pipelineData?.filter(p => p.position_id === posId) || [];
      let lastActivityDate = new Date(0);

      lastActivityDate = positionPipeline.reduce((latest, p) => {
        const itemTimestamp = p.updated_at || p.created_at;
        if (!itemTimestamp) return latest;
        const itemDate = new Date(itemTimestamp);
        return !isNaN(itemDate) && itemDate > latest ? itemDate : latest;
      }, lastActivityDate);

      const daysSinceActivity = lastActivityDate.getTime() > 0 ? calculateDaysDifference(lastActivityDate.toISOString()) : Infinity;

      let health = 'healthy';
      const hasOutreach = positionOutreach.length > 0;
      if (daysSinceActivity > 14 || (hasOutreach && recentOutreach.length === 0) || (hasOutreach && replyRate < 10)) {
        health = 'critical';
      } else if (daysSinceActivity > 7 || (hasOutreach && recentOutreach.length < 5) || (hasOutreach && replyRate < 20)) {
        health = 'warning';
      }

      healthMap[posId] = {
        title: data?.title || 'Unknown Title',
        health,
        outreach: recentOutreach.length,
        replyRate: replyRate,
        daysSinceActivity: daysSinceActivity === Infinity ? 'N/A' : daysSinceActivity
      };
    }

    setRoleHealth(healthMap);
  }

  async function fetchExecutiveStats() {
    const today = new Date();
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(today.getDate() - 7);
    const endOfWeek = new Date(today);
    endOfWeek.setDate(today.getDate() + 7);

    const results = await Promise.allSettled([
      supabase.from('pipeline').select('id', { count: 'exact', head: true }).in('stage', ['Offer', 'Interview 3']).eq('status', 'Active'),
      supabase.from('interviews').select('id', { count: 'exact', head: true }).gte('interview_date', today.toISOString()).lte('interview_date', endOfWeek.toISOString()),
      supabase.from('pipeline').select('id', { count: 'exact', head: true }).eq('stage', 'Submit to Client').gte('created_at', sevenDaysAgo.toISOString()),
      supabase.from('pipeline').select('id, positions!inner(status)', { count: 'exact'}).eq('status', 'Active').eq('positions.status', 'Open'),
      supabase.from('recruiter_outreach').select('activity_status', { count: 'exact' }).gte('created_at', sevenDaysAgo.toISOString())
    ]);

    const getCount = (index) => {
      const response = results[index];
      if (response.status === 'rejected') return 0;
      return response.value.count ?? 0;
    };

    const outreachCount = getCount(4);
    const replyStatuses = ['reply_received', 'accepted', 'call_scheduled', 'declined', 'ready_for_submission'];

    const { data: outreachData } = await supabase
      .from('recruiter_outreach')
      .select('activity_status')
      .gte('created_at', sevenDaysAgo.toISOString());

    const replies = outreachData?.filter(o => replyStatuses.includes(o.activity_status)).length || 0;
    const replyRate = outreachCount > 0 ? parseFloat(((replies / outreachCount) * 100).toFixed(1)) : 0;

    setExecutiveStats({
      rolesNeedingAttention: Object.values(roleHealth).filter(r => r.health === 'critical' || r.health === 'warning').length,
      closeToHiring: getCount(0),
      interviewsThisWeek: getCount(1),
      submissionsThisWeek: getCount(2),
      activeCandidates: getCount(3),
      outreachThisWeek: outreachCount,
      replyRate: replyRate
    });
  }

  async function fetchHistoricalData() {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dayStart = new Date(date.setHours(0, 0, 0, 0)).toISOString();
      const dayEnd = new Date(date.setHours(23, 59, 59, 999)).toISOString();

      const { data: outreach } = await supabase
        .from('recruiter_outreach')
        .select('id')
        .gte('created_at', dayStart)
        .lte('created_at', dayEnd);

      const { data: submissions } = await supabase
        .from('pipeline')
        .select('id')
        .eq('stage', 'Submit to Client')
        .gte('created_at', dayStart)
        .lte('created_at', dayEnd);

      days.push({
        day: date.toLocaleDateString('en-US', { weekday: 'short' }),
        outreach: outreach?.length || 0,
        submissions: submissions?.length || 0
      });
    }

    setHistoricalData(days);
  }

  async function fetchRecruiterStats() {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data: outreachData } = await supabase
      .from('recruiter_outreach')
      .select('recruiter_id, activity_status, recruiters(name, role)')
      .gte('created_at', sevenDaysAgo.toISOString());

    const { data: pipelineData } = await supabase
      .from('pipeline')
      .select('recruiter_id, stage, created_at')
      .eq('stage', 'Screening')
      .gte('created_at', sevenDaysAgo.toISOString());

    const breakdownMap = {};
    const replyStatuses = ['reply_received', 'accepted', 'call_scheduled', 'declined', 'ready_for_submission'];

    recruiters.forEach(r => {
      const role = r?.role?.toLowerCase() || '';
      if (r?.id && role !== 'director' && !role.includes('manager')) {
        breakdownMap[r.id] = { id: r.id, name: r.name, totalOutreach: 0, replies: 0, internalSubmissions: 0, replyRate: 0 };
      }
    });

    outreachData?.forEach(o => {
      if (breakdownMap[o.recruiter_id]) {
        breakdownMap[o.recruiter_id].totalOutreach++;
        if (replyStatuses.includes(o.activity_status)) {
          breakdownMap[o.recruiter_id].replies++;
        }
      }
    });

    pipelineData?.forEach(p => {
      if (breakdownMap[p.recruiter_id]) {
        breakdownMap[p.recruiter_id].internalSubmissions++;
      }
    });

    const stats = Object.values(breakdownMap).map(rec => {
      rec.replyRate = rec.totalOutreach > 0 ? parseFloat(((rec.replies / rec.totalOutreach) * 100).toFixed(1)) : 0;
      return rec;
    });

    setRecruiterStats(stats);
  }

  async function fetchCallsAndInterviews() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const endOfToday = new Date(today);
    endOfToday.setHours(23, 59, 59, 999);
    const endOfWeek = new Date(today);
    endOfWeek.setDate(today.getDate() + 7);

    // Fetch calls
    const { data: allCalls } = await supabase
      .from('recruiter_outreach')
      .select('*, positions(title), recruiters(name)')
      .eq('activity_status', 'call_scheduled')
      .not('scheduled_call_date', 'is', null)
      .gte('scheduled_call_date', today.toISOString())
      .lte('scheduled_call_date', endOfWeek.toISOString())
      .order('scheduled_call_date', { ascending: true });

    const callsToday = allCalls?.filter(c => {
      const callDate = new Date(c.scheduled_call_date);
      return callDate >= today && callDate <= endOfToday;
    }) || [];

    const callsWeek = allCalls?.filter(c => {
      const callDate = new Date(c.scheduled_call_date);
      return callDate > endOfToday && callDate <= endOfWeek;
    }) || [];

    // Fetch interviews
    const { data: allInterviews } = await supabase
      .from('interviews')
      .select('*, candidates(name), positions(title), recruiters(name)')
      .gte('interview_date', today.toISOString())
      .lte('interview_date', endOfWeek.toISOString())
      .order('interview_date', { ascending: true });

    const interviewsToday = allInterviews?.filter(i => {
      const intDate = new Date(i.interview_date);
      return intDate >= today && intDate <= endOfToday;
    }) || [];

    const interviewsWeek = allInterviews?.filter(i => {
      const intDate = new Date(i.interview_date);
      return intDate > endOfToday && intDate <= endOfWeek;
    }) || [];

    setCallsData({ today: callsToday, week: callsWeek });
    setInterviewsData({ today: interviewsToday, week: interviewsWeek });
  }

  if (loading) {
    return (
      <div className="dashboard-container">
        <div className="loading-state">
          <Activity size={48} className="spinning" />
          <p>Loading your command center...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      {/* Header */}
      <motion.div
        className="dashboard-header"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div>
          <h1>🚀 Command Center</h1>
          <p>Welcome back, {userProfile?.name || 'Manager'}! Here's your recruitment empire.</p>
        </div>
        <div className="header-stats">
          <div className="mini-stat">
            <Clock size={16} />
            <span>Live Data</span>
          </div>
        </div>
      </motion.div>

      {/* Tab Navigation */}
      <TabNavigation activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        {activeTab === 'overview' && (
          <motion.div
            key="overview"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            {/* Metrics Grid */}
            <div className="metrics-grid">
              <AnimatedMetricCard
                icon={AlertTriangle}
                value={executiveStats.rolesNeedingAttention || 0}
                label="Roles Need Attention"
                color="#F7A9BA"
              />
              <AnimatedMetricCard
                icon={Target}
                value={executiveStats.closeToHiring || 0}
                label="Close to Hiring"
                color="#B8D4D0"
              />
              <AnimatedMetricCard
                icon={Calendar}
                value={executiveStats.interviewsThisWeek || 0}
                label="Interviews This Week"
                color="#C5B9D6"
                onClick={() => navigate('/interview-hub')}
              />
              <AnimatedMetricCard
                icon={CheckCircle}
                value={executiveStats.submissionsThisWeek || 0}
                label="Submissions This Week"
                color="#F4C2A8"
              />
              <AnimatedMetricCard
                icon={Users}
                value={executiveStats.activeCandidates || 0}
                label="Active Candidates"
                color="#E8B4B8"
              />
              <AnimatedMetricCard
                icon={TrendingUp}
                value={executiveStats.outreachThisWeek || 0}
                label="Team Outreach"
                color="#7AA2F7"
                trend={executiveStats.replyRate >= 35 ? 'up' : 'down'}
                trendValue={`${executiveStats.replyRate || 0}% reply`}
              />
            </div>

            {/* Quick Pipeline Funnel */}
            <motion.div
              className="chart-card"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <h2><Briefcase size={24} /> Team Pipeline Overview</h2>
              <PipelineFunnel
                data={Object.values(pipelineMetrics).reduce((acc, pos) => {
                  Object.entries(pos.stages).forEach(([stage, count]) => {
                    const existing = acc.find(s => s.stage === stage);
                    if (existing) existing.count += count;
                    else acc.push({ stage, count });
                  });
                  return acc;
                }, [])}
                stages={['Screening', 'Submit to Client', 'Interview 1', 'Interview 2', 'Interview 3', 'Offer', 'Hired']}
              />
            </motion.div>
          </motion.div>
        )}

        {activeTab === 'performance' && (
          <motion.div
            key="performance"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <PerformanceTab
              stats={executiveStats}
              historicalData={historicalData}
              roleHealth={roleHealth}
            />
          </motion.div>
        )}

        {activeTab === 'team' && (
          <motion.div
            key="team"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <TeamMetricsTab recruiterStats={recruiterStats} />
          </motion.div>
        )}

        {activeTab === 'operations' && (
          <motion.div
            key="operations"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <DailyOperationsTab callsData={callsData} interviewsData={interviewsData} />
          </motion.div>
        )}

        {activeTab === 'pipeline' && (
          <motion.div
            key="pipeline"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <PipelineDeepDiveTab
              pipelineMetrics={pipelineMetrics}
              roleHealth={roleHealth}
              navigate={navigate}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default Dashboard;
