import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../contexts/DataContext';
import { motion } from 'framer-motion';
import PipelineFunnel from '../components/PipelineFunnel';
import '../styles/Dashboard.css';

function Dashboard() {
  const navigate = useNavigate();
  const { positions, pipeline, interviews, candidates } = useData();

  // ========== DATA CALCULATIONS ==========
  const SLATE_TARGET = 8;
  const AGING_THRESHOLD_DAYS = 14;
  const STALLED_THRESHOLD_DAYS = 7;

  // FIXED: Count all candidates who have REACHED "Submit to Client" or beyond
  const positionsNeedingCandidates = useMemo(() => {
    return positions
      .filter(pos => pos.status === 'Open')
      .map(pos => {
        const positionPipeline = pipeline.filter(p => p.position_id === pos.id);
        
        // Count candidates who have reached "Submit to Client" OR any stage beyond it
        const submissionCount = positionPipeline.filter(p => 
          p.stage === 'Submit to Client' || 
          p.stage === 'Interview 1' || 
          p.stage === 'Interview 2' || 
          p.stage === 'Interview 3' || 
          p.stage === 'Offer' || 
          p.stage === 'Hired'
        ).length;
        
        return { ...pos, submissionCount };
      })
      .filter(pos => pos.submissionCount < SLATE_TARGET)
      .sort((a, b) => a.submissionCount - b.submissionCount);
  }, [positions, pipeline]);

  const agingRoles = useMemo(() => {
    const now = new Date();
    return positions
      .filter(pos => pos.status === 'Open')
      .map(pos => {
        const createdDate = new Date(pos.created_at);
        const diffTime = Math.abs(now - createdDate);
        const daysOpen = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return { ...pos, daysOpen };
      })
      .filter(pos => pos.daysOpen > AGING_THRESHOLD_DAYS)
      .sort((a, b) => b.daysOpen - a.daysOpen);
  }, [positions]);

  const stalledCandidates = useMemo(() => {
    const now = new Date();
    return pipeline
      .filter(p => p.stage !== 'Rejected' && p.stage !== 'Hired')
      .map(item => {
        const updatedDate = new Date(item.updated_at);
        const diffTime = Math.abs(now - updatedDate);
        const daysSinceUpdate = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return { ...item, daysSinceUpdate };
      })
      .filter(item => item.daysSinceUpdate > STALLED_THRESHOLD_DAYS)
      .sort((a, b) => b.daysSinceUpdate - a.daysSinceUpdate);
  }, [pipeline]);

  const upcomingInterviews = useMemo(() => {
    const now = new Date();
    return interviews
      .filter(interview => new Date(interview.interview_date) > now)
      .sort((a, b) => new Date(a.interview_date) - new Date(b.interview_date))
      .slice(0, 5);
  }, [interviews]);


  // ========== FRAMER MOTION VARIANTS ==========
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.05
      }
    }
  };

  const cardVariants = {
    hidden: { 
      y: 30, 
      opacity: 0,
      scale: 0.95
    },
    visible: { 
      y: 0, 
      opacity: 1,
      scale: 1,
      transition: {
        type: "spring",
        stiffness: 100,
        damping: 15
      }
    }
  };

  // ========== EVENT HANDLERS ==========
  const handleViewCandidate = (candidateId, positionId) => {
    navigate('/active-tracker', { state: { candidateId, positionId } });
  };

  return (
    <div className="page-container dashboard-container">
      <motion.div
        className="page-header"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1>Dashboard</h1>
      </motion.div>

      {/* ========== PIPELINE FUNNEL SECTION ========== */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.5 }}
      >
        <PipelineFunnel />
      </motion.div>

      {/* ========== MAIN DASHBOARD GRID ========== */}
      <motion.div 
        className="dashboard-grid"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Positions Needing Candidates */}
        <motion.div variants={cardVariants}>
          <DashboardCard 
            title="Positions Needing Candidates" 
            onClick={() => navigate('/positions')}
            isClickable={true}
          >
            <div className="health-check-list">
              {positionsNeedingCandidates.length === 0 ? 
                <p className="empty-state">All open positions have sufficient candidate slates!</p> :
                positionsNeedingCandidates.map(pos => (
                  <motion.div 
                    key={pos.id} 
                    className="position-item priority-red"
                    whileHover={{ x: 5, transition: { duration: 0.2 } }}
                  >
                    <h4>{pos.title}</h4>
                    <p>Only {pos.submissionCount} of {SLATE_TARGET} candidates submitted.</p>
                    <div className="slate-progress">
                      <div className="progress-bar">
                        <motion.div 
                          className="progress-bar-inner" 
                          initial={{ width: 0 }}
                          animate={{ width: `${(pos.submissionCount / SLATE_TARGET) * 100}%` }}
                          transition={{ duration: 0.8, ease: "easeOut" }}
                        />
                      </div>
                    </div>
                  </motion.div>
                ))
              }
            </div>
          </DashboardCard>
        </motion.div>

        {/* Upcoming Interviews */}
        <motion.div variants={cardVariants}>
          <DashboardCard title="Upcoming Interviews">
            {upcomingInterviews.length === 0 ? 
              <p className="empty-state">No upcoming interviews scheduled.</p> :
              <ActivityList items={upcomingInterviews} onAction={handleViewCandidate} />
            }
          </DashboardCard>
        </motion.div>

        {/* Aging Roles */}
        <motion.div variants={cardVariants}>
          <DashboardCard title={`Aging Roles (>${AGING_THRESHOLD_DAYS} Days)`}>
            <div className="health-check-list">
              {agingRoles.length === 0 ? 
                <p className="empty-state">No roles are currently aging.</p> :
                agingRoles.map(pos => (
                  <motion.div 
                    key={pos.id} 
                    className="position-item priority-orange"
                    whileHover={{ x: 5, transition: { duration: 0.2 } }}
                  >
                    <h4>{pos.title}</h4>
                    <p>Open for {pos.daysOpen} days.</p>
                  </motion.div>
                ))
              }
            </div>
          </DashboardCard>
        </motion.div>

        {/* Stalled Candidates */}
        <motion.div variants={cardVariants}>
          <DashboardCard title={`Stalled Candidates (>${STALLED_THRESHOLD_DAYS} Days)`}>
            <div className="health-check-list">
              {stalledCandidates.length === 0 ? 
                <p className="empty-state">No candidates appear to be stalled.</p> :
                stalledCandidates.map(item => (
                  <motion.div 
                    key={item.id} 
                    className="position-item priority-orange"
                    whileHover={{ x: 5, transition: { duration: 0.2 } }}
                  >
                    <h4>{item.candidates.name}</h4>
                    <p>In "{item.stage}" for {item.positions.title}</p>
                  </motion.div>
                ))
              }
            </div>
          </DashboardCard>
        </motion.div>
      </motion.div>
    </div>
  );
}

// ========== HELPER COMPONENTS ==========
const DashboardCard = ({ title, children, onClick, isClickable }) => (
  <div 
    className={`dashboard-card ${isClickable ? 'is-clickable' : ''}`}
    onClick={onClick}
  >
    <h2>{title}</h2>
    {children}
  </div>
);

const ActivityList = ({ items, onAction }) => (
  <ul className="activity-list">
    {items.map(item => (
      <motion.li 
        key={item.id} 
        className="activity-item"
        whileHover={{ backgroundColor: 'var(--hover-bg)' }}
        transition={{ duration: 0.2 }}
      >
        <div className="activity-item-main">
          <p>{item.candidates?.name}</p>
          <span>{item.stage} for {item.positions?.title}</span>
        </div>
        <div className="activity-item-action">
          <motion.button 
            onClick={() => onAction(item.candidate_id, item.position_id)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            View Details
          </motion.button>
        </div>
      </motion.li>
    ))}
  </ul>
);

export default Dashboard;