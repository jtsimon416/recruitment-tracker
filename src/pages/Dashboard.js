import React, { useState, useEffect } from 'react';
import { useData } from '../contexts/DataContext';
import { motion, AnimatePresence } from 'framer-motion';
import '../styles/Dashboard.css';

// --- SVG Icons (replaces emojis for a cleaner look) ---
const IconOpenPositions = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="icon" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
);
const IconActiveCandidates = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="icon" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.653-.124-1.282-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.653.124-1.282.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
);
const IconInterviews = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="icon" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
);
const IconPlacements = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="icon" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.085a2 2 0 00-1.736.97l-2.7 5.4M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" /></svg>
);
const IconTrophy = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="trophy-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 11l3-3m0 0l3 3m-3-3v8m0-13a9 9 0 110 18 9 9 0 010-18z" /></svg>
);


// --- Animated Counter Component ---
function AnimatedCounter({ value }) {
  // This is a simplified counter. For production, you might use a library like react-spring.
  // Or, framer-motion's useSpring hook for a smoother effect.
  // For simplicity, we'll just display the value with an animation wrapper.
  return (
    <motion.div
      key={value}
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="stat-number"
    >
      {value}
    </motion.div>
  );
}

function Dashboard() {
  const { positions, candidates, pipeline, interviews, recruiters, loading } = useData();
  const [stats, setStats] = useState({
    openPositions: 0,
    activeCandidates: 0,
    interviewsThisWeek: 0,
    placementsThisMonth: 0,
    yesterdayActivity: {
      newCandidates: [],
      stageChanges: [],
      interviewsHeld: []
    }
  });

  // --- ALL ORIGINAL LOGIC REMAINS UNCHANGED ---
  useEffect(() => {
    if (!loading) {
      calculateStats();
    }
  }, [positions, candidates, pipeline, interviews, loading]);

  function calculateStats() {
    const today = new Date();
    const openPositions = positions.filter(p => p.status === 'Open' || p.status === 'open').length;
    const activeCandidates = candidates.filter(c => c.status === 'active').length;

    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay());
    weekStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 7);
    const interviewsThisWeek = interviews ? interviews.filter(i => {
      const interviewDate = new Date(i.interview_date);
      return interviewDate >= weekStart && interviewDate < weekEnd;
    }).length : 0;
    
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const placementsThisMonth = candidates.filter(c => {
        if (!c.placed_date) return false;
        const placedDate = new Date(c.placed_date);
        return placedDate >= monthStart && placedDate <= today;
    }).length;

    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const newCandidates = candidates.filter(c => {
        const createdDate = new Date(c.created_at);
        return createdDate >= yesterday && createdDate < todayStart;
    });

    const stageChanges = pipeline.filter(p => {
        const updatedDate = new Date(p.updated_at);
        return updatedDate >= yesterday && updatedDate < todayStart;
    });
    
    const interviewsHeld = interviews ? interviews.filter(i => {
        const interviewDate = new Date(i.interview_date);
        return interviewDate >= yesterday && interviewDate < todayStart;
    }) : [];

    setStats({
      openPositions, activeCandidates, interviewsThisWeek, placementsThisMonth,
      yesterdayActivity: { newCandidates, stageChanges, interviewsHeld }
    });
  }

  function getRecruiterStats() {
    if (!recruiters || !pipeline || !candidates) return [];
    const recruiterMap = {};
    recruiters.forEach(recruiter => {
      recruiterMap[recruiter.id] = { name: recruiter.name, activeCandidates: 0, placements: 0 };
    });
    pipeline.forEach(p => {
      if (p.recruiter_id && recruiterMap[p.recruiter_id] && p.status === 'Active') {
        recruiterMap[p.recruiter_id].activeCandidates++;
      }
    });
    candidates.forEach(c => {
      if (c.placed_date) {
        const placement = pipeline.find(p => p.candidate_id === c.id);
        if (placement && placement.recruiter_id && recruiterMap[placement.recruiter_id]) {
          recruiterMap[placement.recruiter_id].placements++;
        }
      }
    });
    return Object.values(recruiterMap).sort((a, b) => b.placements - a.placements).slice(0, 5);
  }

  function getRecentActivity() {
    if (!candidates || !positions || !pipeline) return [];
    const activities = [];
    candidates.forEach(c => {
      if (c.placed_date) activities.push({ type: 'placement', date: new Date(c.placed_date), text: `${c.name} was placed` });
    });
    if (interviews) {
      interviews.slice(0, 5).forEach(i => {
        const candidate = candidates.find(c => c.id === i.candidate_id);
        const position = positions.find(p => p.id === i.position_id);
        if (candidate && position) activities.push({ type: 'interview', date: new Date(i.interview_date), text: `${candidate.name} interviewed for ${position.title}` });
      });
    }
    pipeline.slice(0, 10).forEach(p => {
      const candidate = candidates.find(c => c.id === p.candidate_id);
      const position = positions.find(pos => pos.id === p.position_id);
      if (candidate && position) activities.push({ type: 'pipeline', date: new Date(p.created_at), text: `${candidate.name} added to ${position.title}` });
    });
    return activities.sort((a, b) => b.date - a.date).slice(0, 10);
  }
  // --- END OF ORIGINAL LOGIC ---

  const recruiterStats = getRecruiterStats();
  const recentActivity = getRecentActivity();
  
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1 }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <motion.div className="loading-spinner">
            <motion.div className="spinner-dot" animate={{ y: [0, -20, 0] }} transition={{ duration: 0.8, repeat: Infinity, ease: "easeInOut" }}/>
            <motion.div className="spinner-dot" animate={{ y: [0, -20, 0] }} transition={{ duration: 0.8, delay: 0.2, repeat: Infinity, ease: "easeInOut" }}/>
            <motion.div className="spinner-dot" animate={{ y: [0, -20, 0] }} transition={{ duration: 0.8, delay: 0.4, repeat: Infinity, ease: "easeInOut" }}/>
        </motion.div>
        <p>Finding top talent...</p>
      </div>
    );
  }

  return (
    <motion.div 
      className="dashboard-container"
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      {/* Hero Header */}
      <motion.div className="dashboard-hero" variants={itemVariants}>
        <div className="hero-content">
          <h1 className="hero-title">Good Morning!</h1>
          <p className="hero-subtitle">Here's a look at yesterday's progress.</p>
        </div>
        <motion.div className="yesterday-stats" variants={containerVariants}>
            <motion.div className="yesterday-stat" variants={itemVariants}>
              <AnimatedCounter value={stats.yesterdayActivity.newCandidates.length} />
              <span className="stat-label">New Candidates</span>
            </motion.div>
            <motion.div className="yesterday-stat" variants={itemVariants}>
              <AnimatedCounter value={stats.yesterdayActivity.interviewsHeld.length} />
              <span className="stat-label">Interviews</span>
            </motion.div>
            <motion.div className="yesterday-stat" variants={itemVariants}>
              <AnimatedCounter value={stats.yesterdayActivity.stageChanges.length} />
              <span className="stat-label">Stage Changes</span>
            </motion.div>
        </motion.div>
      </motion.div>

      {/* Main Stats Cards */}
      <motion.div className="stats-grid" variants={containerVariants}>
        <motion.div className="stat-card" variants={itemVariants} whileHover={{ y: -5, boxShadow: "0px 10px 20px rgba(0,0,0,0.2)" }}>
            <div className="stat-icon-wrapper primary"><IconOpenPositions/></div>
            <div className="stat-content">
                <AnimatedCounter value={stats.openPositions} />
                <div className="stat-label">Open Positions</div>
            </div>
        </motion.div>
        <motion.div className="stat-card" variants={itemVariants} whileHover={{ y: -5, boxShadow: "0px 10px 20px rgba(0,0,0,0.2)" }}>
            <div className="stat-icon-wrapper success"><IconActiveCandidates/></div>
            <div className="stat-content">
                <AnimatedCounter value={stats.activeCandidates} />
                <div className="stat-label">Active Candidates</div>
            </div>
        </motion.div>
        <motion.div className="stat-card" variants={itemVariants} whileHover={{ y: -5, boxShadow: "0px 10px 20px rgba(0,0,0,0.2)" }}>
            <div className="stat-icon-wrapper info"><IconInterviews/></div>
            <div className="stat-content">
                <AnimatedCounter value={stats.interviewsThisWeek} />
                <div className="stat-label">Interviews This Week</div>
            </div>
        </motion.div>
        <motion.div className="stat-card" variants={itemVariants} whileHover={{ y: -5, boxShadow: "0px 10px 20px rgba(0,0,0,0.2)" }}>
            <div className="stat-icon-wrapper warning"><IconPlacements/></div>
            <div className="stat-content">
                <AnimatedCounter value={stats.placementsThisMonth} />
                <div className="stat-label">Placements This Month</div>
            </div>
        </motion.div>
      </motion.div>

      {/* Two Column Layout */}
      <div className="dashboard-columns">
        <motion.div className="dashboard-card" variants={itemVariants}>
          <h2 className="card-title">Recruiter Leaderboard</h2>
          <motion.div className="leaderboard" variants={containerVariants}>
            {recruiterStats.length > 0 ? (
              recruiterStats.map((recruiter, index) => (
                <motion.div key={index} className={`leaderboard-item rank-${index + 1}`} variants={itemVariants} whileHover={{scale: 1.03}}>
                  <div className="leaderboard-rank">{index + 1}</div>
                  <div className="leaderboard-name">{recruiter.name}</div>
                  <div className="leaderboard-stats">
                    {recruiter.placements} Placed • {recruiter.activeCandidates} Active
                  </div>
                   {index < 3 && <div className="leaderboard-trophy"><IconTrophy /></div>}
                </motion.div>
              ))
            ) : (
              <div className="empty-state">No recruiter data yet</div>
            )}
          </motion.div>
        </motion.div>

        <motion.div className="dashboard-card" variants={itemVariants}>
          <h2 className="card-title">Recent Activity</h2>
          <motion.div className="activity-feed" variants={containerVariants}>
            {recentActivity.length > 0 ? (
              recentActivity.map((activity, index) => (
                <motion.div key={index} className="activity-item" variants={itemVariants}>
                  <div className={`activity-icon-wrapper type-${activity.type}`}>
                    {activity.type === 'placement' ? '🎉' : activity.type === 'interview' ? '📅' : '➕'}
                  </div>
                  <div className="activity-content">
                    <div className="activity-text">{activity.text}</div>
                    <div className="activity-time">{activity.date.toLocaleDateString()}</div>
                  </div>
                </motion.div>
              ))
            ) : (
              <div className="empty-state">No recent activity</div>
            )}
          </motion.div>
        </motion.div>
      </div>
    </motion.div>
  );
}

export default Dashboard;