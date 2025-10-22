import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
// FIX: Corrected the CSS import path from '../styles/PipelineFunnel.css' to './PipelineFunnel.css'
import { Zap, ChevronDown, BarChart3, TrendingUp, TrendingDown } from 'lucide-react'; 
import './PipelineFunnel.css'; 

// Chevron Arrow Component (Used to show flow between stages)
const ChevronArrow = ({ color }) => (
  <svg 
    width="24" 
    height="36" 
    viewBox="0 0 24 36" 
    className="chevron-arrow"
    style={{ margin: '0 2px' }}
  >
    <path
      d="M 0,0 L 18,18 L 0,36 L 6,36 L 24,18 L 6,0 Z"
      fill={color}
      opacity="0.4"
    />
  </svg>
);

// --- STAGE COLORS (Matching Rose Gold Theme for contrast) ---
const STAGE_COLORS = {
    // These colors are defined as CSS variables in PipelineFunnel.css
    'Screening': 'var(--soft-lavender)',     
    'Submit to Client': 'var(--peachy-rose)', 
    'Interview 1': 'var(--dusty-pink)',    
    'Interview 2': 'var(--rose-gold)',     
    'Interview 3': 'var(--mint-cream)',    
    'Offer': 'var(--accent-green)',        
    'Hired': 'var(--accent-blue)',
    'Rejected': 'var(--dusty-pink)' // Use Dusty Pink for rejected
};

// --- VISUAL FUNNEL COMPONENT (Table View) ---
function PipelineFunnel({ data, stages }) {
  const navigate = useNavigate();
  
  // The stages array should include all stages except Rejected for the main visualization path in the table header
  const mainPathStages = stages.filter(stageKey => stageKey !== 'Rejected');
  
  // Memoize the data conversion for table view
  const pipelineTableData = useMemo(() => {
    // Aggregate all stage counts from the 'data' prop
    const aggregatedStages = data.reduce((acc, metric) => {
        acc[metric.stage] = metric.count;
        return acc;
    }, {});

    // Create a single row of aggregated data for the table layout.
    return [{
        positionId: 'all', // Use 'all' to indicate global filter
        title: 'GLOBAL AGGREGATE',
        client: 'Across All Positions',
        stages: aggregatedStages,
        total: aggregatedStages['Screening'] || 0
    }];

  }, [data]);
  
  const handleNumberClick = (positionId, stage) => {
    // Navigate to the Active Tracker filtered by the stage/position
    navigate('/active-tracker', { 
      state: { positionId, stage } 
    });
  };

  const handlePositionClick = (positionId) => {
    // Navigate to the Active Tracker unfiltered by stage
    navigate('/active-tracker', { 
      state: { positionId } 
    });
  };
  
  const finalPipelineData = pipelineTableData.filter(d => d.total > 0);

  if (finalPipelineData.length === 0) {
    return (
      <div className="pipeline-funnel-wrapper">
        <div className="pipeline-empty">No active candidates in the pipeline.</div>
      </div>
    );
  }

  return (
    <div className="pipeline-funnel-wrapper">
      <h2 className="pipeline-funnel-title">GLOBAL PIPELINE STAGE COUNT</h2>
      
      <div className="pipeline-table-container">
        <table className="pipeline-funnel-table">
          <thead>
            <tr>
              <th className="pos-header">SUMMARY</th>
              {mainPathStages.map(stage => (
                <th 
                  key={stage} 
                  className="stage-header"
                  style={{ color: STAGE_COLORS[stage] }}
                >
                  {stage.replace(/\s/g, '\u00a0')} {/* Non-breaking space for layout */}
                </th>
              ))}
              {/* Rejected column is now separate and at the end */}
              <th 
                  key="Reject" 
                  className="stage-header"
                  style={{ color: STAGE_COLORS['Rejected'] }}
                >
                  REJECT
                </th>
            </tr>
          </thead>
          <tbody>
            {finalPipelineData.map((position, idx) => (
              // This is the single aggregate row
              <motion.tr
                key={position.positionId}
                className="pipeline-funnel-row"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05, duration: 0.3 }}
              >
                {/* Summary Column */}
                <td className="pos-cell">
                  <div 
                    className="pos-info"
                    onClick={() => handlePositionClick(position.positionId)}
                    style={{cursor: 'pointer'}}
                  >
                    <div className="pos-title">
                      {position.title}
                      <span className="pos-count">({position.total} Total)</span>
                    </div>
                    <div className="pos-client">{position.client}</div>
                  </div>
                </td>
                
                {/* Main Path Stage Columns */}
                {mainPathStages.map((stage, stageIdx) => {
                  const count = position.stages[stage] || 0;
                  const nextStage = mainPathStages[stageIdx + 1];
                  const nextCount = position.stages[nextStage] || 0;
                  const showArrow = count > 0 && nextStage && nextCount > 0;

                  return (
                    <td key={stage} className="stage-cell">
                      <div className="stage-content">
                        <motion.div
                            className="stage-num"
                            style={{ color: STAGE_COLORS[stage] }}
                            onClick={() => handleNumberClick('all', stage)} 
                            whileHover={{ scale: 1.15 }}
                            whileTap={{ scale: 0.95 }}
                        >
                            {count > 0 ? count : '—'}
                        </motion.div>
                        
                        {showArrow && (
                          <motion.div
                            className="arrow-wrapper"
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.3 }}
                          >
                            <ChevronArrow color={STAGE_COLORS[nextStage]} />
                          </motion.div>
                        )}
                      </div>
                    </td>
                  );
                })}
                
                {/* Rejected Column */}
                <td className="stage-cell">
                    <div className="stage-content">
                        <motion.div
                            className="stage-num"
                            style={{ color: STAGE_COLORS['Rejected'] }}
                            onClick={() => handleNumberClick('all', 'Rejected')}
                            whileHover={{ scale: 1.15 }}
                            whileTap={{ scale: 0.95 }}
                        >
                            {position.stages['Rejected'] || '—'}
                        </motion.div>
                    </div>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
        
        {/* Simple Overall Conversion Rate Display (Below table) */}
        {finalPipelineData.length > 0 && (
            <div className="overall-conversion-summary">
                <span className="summary-label">
                  Conversion Rate (Screening to Hired):
                </span>
                <span className="summary-value" style={{color: STAGE_COLORS['Hired']}}>
                    {((finalPipelineData[0].stages['Hired'] || 0) / finalPipelineData[0].total * 100).toFixed(1)}%
                </span>
            </div>
        )}
      </div>
    </div>
  );
}

export default PipelineFunnel;