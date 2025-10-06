import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';
import { useNavigate } from 'react-router-dom';
import '../styles/Dashboard.css';

const YESTERDAY_STAGES = ['Submit to Client', 'Hold', 'Reject'];
const STALLED_THRESHOLD_DAYS = 7; // Days a candidate can be in a stage before being flagged
const AGING_ROLE_THRESHOLD_DAYS = 30; // Days a role can be open before being flagged
const SLATE_TARGET = 8; // Target number of submissions for a new role

function Dashboard() {
  const [yesterdayActivity, setYesterdayActivity] = useState([]);
  const [pipelineHealth, setPipelineHealth] = useState([]);
  const [upcomingInterviews, setUpcomingInterviews] = useState([]);
  const [stalledCandidates, setStalledCandidates] = useState([]);
  const [agingRoles, setAgingRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchAllData = async () => {
      setLoading(true);
      await Promise.all([
        fetchYesterdayActivity(),
        fetchPipelineHealthAndAgingRoles(),
        fetchUpcomingInterviews(),
        fetchStalledCandidates()
      ]);
      setLoading(false);
    };
    fetchAllData();
  }, []);

  const getYesterdayDateRange = () => {
    const end = new Date();
    end.setHours(0, 0, 0, 0);
    const start = new Date(end);
    start.setDate(start.getDate() - 1);
    return { start: start.toISOString(), end: end.toISOString() };
  };

  async function fetchYesterdayActivity() {
    const { start, end } = getYesterdayDateRange();
    const { data, error } = await supabase
      .from('pipeline')
      .select('*, candidates(name), recruiters(name), positions(title)')
      .gte('updated_at', start)
      .lt('updated_at', end)
      .in('stage', YESTERDAY_STAGES);

    if (error) console.error("Error fetching yesterday's activity:", error);
    else setYesterdayActivity(data || []);
  }

  async function fetchPipelineHealthAndAgingRoles() {
    const { data: openPositions, error } = await supabase
      .from('positions')
      .select('id, title, created_at')
      .eq('status', 'Open');

    if (error) {
      console.error('Error fetching open positions:', error);
      return;
    }

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const healthChecks = await Promise.all(
      openPositions.map(async (pos) => {
        const { count, error: countError } = await supabase
          .from('pipeline')
          .select('*', { count: 'exact' })
          .eq('position_id', pos.id);

        if (countError) return null;

        const submissionCount = count || 0;
        const isNewRole = new Date(pos.created_at) > sevenDaysAgo;
        const daysOpen = Math.floor((new Date() - new Date(pos.created_at)) / (1000 * 60 * 60 * 24));

        let healthStatus, priorityClass, reason;

        if (isNewRole) {
          healthStatus = 'Building Slate';
          priorityClass = 'priority-blue';
          reason = `${submissionCount} of ${SLATE_TARGET} candidates submitted.`;
        } else if (submissionCount < 2) {
          healthStatus = 'Needs Sourcing';
          priorityClass = 'priority-red';
          reason = `Only ${submissionCount} submission(s). Needs more candidates.`;
        } else {
          healthStatus = 'Healthy';
          priorityClass = 'priority-green';
          reason = `Coverage is good with ${submissionCount} submission(s).`;
        }
        
        return { ...pos, healthStatus, reason, priorityClass, submissionCount, daysOpen };
      })
    );
    
    const validChecks = healthChecks.filter(Boolean);
    setPipelineHealth(validChecks);
    setAgingRoles(validChecks.filter(p => p.daysOpen > AGING_ROLE_THRESHOLD_DAYS));
  }
  
  async function fetchUpcomingInterviews() {
    const today = new Date().toISOString();
    const { data, error } = await supabase
      .from('interviews')
      .select('*, candidates(name), positions(title)')
      .gte('interview_date', today)
      .order('interview_date', { ascending: true })
      .limit(5);

    if (error) console.error('Error fetching upcoming interviews:', error);
    else setUpcomingInterviews(data || []);
  }

  async function fetchStalledCandidates() {
    const thresholdDate = new Date();
    thresholdDate.setDate(thresholdDate.getDate() - STALLED_THRESHOLD_DAYS);

    const { data, error } = await supabase
      .from('pipeline')
      .select('*, candidates(name), positions(title)')
      .eq('status', 'Active')
      .lt('updated_at', thresholdDate.toISOString());
    
    if (error) console.error('Error fetching stalled candidates:', error);
    else setStalledCandidates(data || []);
  }
  
  const navigateToCandidate = (candidateId, positionId) => {
    navigate('/active-tracker', { state: { openCommentsForCandidate: candidateId, positionId: positionId } });
  };
  
  if (loading) {
    return <div className="loading-state">Building your daily briefing...</div>;
  }

  return (
    <div className="dashboard-container">
      <div className="page-header"><h1>Manager's Morning Briefing</h1></div>
      <div className="dashboard-grid">
        <DashboardCard title="Yesterday's Recap">
          {yesterdayActivity.length === 0 ? <p className="empty-state">No key activities recorded yesterday.</p> :
            <ActivityList items={yesterdayActivity} onAction={navigateToCandidate} />
          }
        </DashboardCard>
        
        <div onClick={() => navigate('/interview-hub')} className="dashboard-card is-clickable">
          <h2>Upcoming Interviews</h2>
          {upcomingInterviews.length === 0 ? <p className="empty-state">No upcoming interviews scheduled.</p> :
            <ul className="info-list">
              {upcomingInterviews.map(interview => (
                <li key={interview.id} className="info-item">
                  <p>{interview.candidates.name}</p>
                  <span>for {interview.positions.title}</span>
                  <p className="meta">{new Date(interview.interview_date).toLocaleString()}</p>
                </li>
              ))}
            </ul>
          }
        </div>

        <div onClick={() => navigate('/active-tracker', { state: { view: 'pipeline' } })} className="dashboard-card is-clickable">
          <h2>Pipeline Health & Focus</h2>
          <div className="health-check-list">
            {pipelineHealth.length === 0 ? <p className="empty-state">No open positions to analyze.</p> :
              pipelineHealth.map(pos => <PositionHealthItem key={pos.id} pos={pos} />)
            }
          </div>
        </div>

        <DashboardCard title="Aging Roles (>30 Days)">
          <div className="health-check-list">
            {agingRoles.length === 0 ? <p className="empty-state">No roles are currently aging.</p> :
              agingRoles.map(pos => (
                <div key={pos.id} className="position-item priority-orange">
                  <h4>{pos.title}</h4>
                  <p>Open for {pos.daysOpen} days.</p>
                </div>
              ))
            }
          </div>
        </DashboardCard>

        <DashboardCard title="Stalled Candidates (>7 Days)">
          <div className="health-check-list">
            {stalledCandidates.length === 0 ? <p className="empty-state">No candidates appear to be stalled.</p> :
              stalledCandidates.map(item => (
                <div key={item.id} className="position-item priority-orange">
                  <h4>{item.candidates.name}</h4>
                  <p>In "{item.stage}" for {item.positions.title}</p>
                </div>
              ))
            }
          </div>
        </DashboardCard>

      </div>
    </div>
  );
}

const DashboardCard = ({ title, children }) => (
  <div className="dashboard-card">
    <h2>{title}</h2>
    {children}
  </div>
);

const ActivityList = ({ items, onAction }) => (
  <ul className="activity-list">
    {items.map(item => (
      <li key={item.id} className="activity-item">
        <div className="activity-item-main">
          <p>{item.candidates?.name}</p>
          <span>{item.stage} for {item.positions?.title}</span>
        </div>
        <div className="activity-item-action">
          <button onClick={() => onAction(item.candidate_id, item.position_id)}>
            View Details
          </button>
        </div>
      </li>
    ))}
  </ul>
);

const PositionHealthItem = ({ pos }) => (
  <div className={`position-item ${pos.priorityClass}`}>
    <h4>{pos.title}</h4>
    <p>{pos.reason}</p>
    {pos.healthStatus === 'Building Slate' && (
      <div className="slate-progress">
        <div className="progress-bar">
          <div className="progress-bar-inner" style={{ width: `${(pos.submissionCount / SLATE_TARGET) * 100}%` }}></div>
        </div>
      </div>
    )}
  </div>
);

export default Dashboard;