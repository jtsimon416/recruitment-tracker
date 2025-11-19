import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Sparkles } from 'lucide-react';
import ReactMarkdown from 'react-markdown'; // ADDED
import '../styles/AiAnalysisSidebar.css';

const loadingSayings = [
  "Polishing the resume for maximum sparkle...",
  "Matching skills like a pro matchmaker...",
  "Calculating fit-score, no pressure...",
  "Ensuring this candidate isn't a unicorn in disguise...",
  "Brewing the perfect summary, one word at a time...",
  "Just checking if they can 'hit the ground running'...",
  "Consulting the crystal ball of career compatibility...",
  "Making sure their 'synergy' is up to par...",
  "Uncovering hidden talents, or at least a good LinkedIn profile...",
  "Almost ready to reveal their hiring destiny...",
];

const getGradeClass = (score) => {
  if (score >= 90) return 'grade-a';
  if (score >= 80) return 'grade-b';
  if (score >= 70) return 'grade-c';
  if (score >= 60) return 'grade-d';
  return 'grade-f';
};

const AiAnalysisSidebar = ({ isOpen, onClose, data, loading }) => {
  const [currentSaying, setCurrentSaying] = useState('');

  useEffect(() => {
    if (loading) {
      const randomIndex = Math.floor(Math.random() * loadingSayings.length);
      setCurrentSaying(loadingSayings[randomIndex]);
    }
  }, [loading]); // Only run when loading state changes

  if (!isOpen) return null;

  return (
    <motion.div
      className="ai-analysis-sidebar-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="ai-analysis-sidebar"
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside
      >
        <div className="sidebar-header">
          <h2><Sparkles size={24} /> Hire Logic AI Analysis</h2>
          <button onClick={onClose} className="btn-close-sidebar" type="button">
            <X size={24} />
          </button>
        </div>

        <div className="sidebar-content">
          {loading ? (
            <div className="ai-loading-state">
              <Sparkles size={48} className="spinning" />
              <p>{currentSaying || "Analyzing candidate fit with Hire Logic AI..."}</p>
            </div>
          ) : data ? (
            <>
              <div className="ai-grade-section">
                <h3>Fit Score: <span className={`ai-grade ${getGradeClass(data.score)}`}>{data.score} / 100</span></h3>
              </div>
              <div className="ai-summary-section">
                <h3>Strengths</h3>
                <ReactMarkdown>{String(data.strengths)}</ReactMarkdown>
              </div>
              <div className="ai-summary-section">
                <h3>Weaknesses</h3>
                <ReactMarkdown>{String(data.weaknesses)}</ReactMarkdown>
              </div>
              <div className="ai-summary-section">
                <h3>Overall Assessment</h3>
                <ReactMarkdown>{String(data.assessment)}</ReactMarkdown>
              </div>
            </>
          ) : ( 
            <div className="ai-error-state">
              <p>No analysis data available or an error occurred.</p>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};

export default AiAnalysisSidebar;
