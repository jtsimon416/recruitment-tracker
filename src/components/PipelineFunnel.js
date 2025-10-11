import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabaseClient';
import { motion } from 'framer-motion';
import './PipelineFunnel.css';

// Chevron Arrow Component
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

function PipelineFunnel() {
  const [pipelineData, setPipelineData] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const stages = [
    { key: 'Screening', label: 'SCREENING', color: '#7AA2F7' },
    { key: 'Submit to Client', label: 'SUBMIT', color: '#7dcfff' },
    { key: 'Interview 1', label: 'INT 1', color: '#BB9AF7' },
    { key: 'Interview 2', label: 'INT 2', color: '#9d7cd8' },
    { key: 'Interview 3', label: 'INT 3', color: '#7e5dc1' },
    { key: 'Offer', label: 'OFFER', color: '#9ECE6A' },
    { key: 'Hired', label: 'HIRED', color: '#73daca' },
    { key: 'Reject', label: 'REJECT', color: '#f7768e' }
  ];

  useEffect(() => {
    fetchPipelineData();
  }, []);

  async function fetchPipelineData() {
    setLoading(true);
    const { data, error } = await supabase
      .from('pipeline')
      .select('*, positions(id, title, status, clients(company_name))')
      .neq('stage', 'Archived')
      .eq('positions.status', 'Open');

    if (!error && data) {
      // Group by position
      const grouped = data.reduce((acc, item) => {
        const posId = item.position_id;
        if (!acc[posId]) {
          acc[posId] = {
            positionId: posId,
            title: item.positions?.title || 'Unknown',
            client: item.positions?.clients?.company_name || 'Unknown Client',
            stages: {},
            total: 0
          };
        }
        const stage = item.stage;
        acc[posId].stages[stage] = (acc[posId].stages[stage] || 0) + 1;
        acc[posId].total += 1;
        return acc;
      }, {});

      // Convert to array and sort by total (descending)
      const sorted = Object.values(grouped).sort((a, b) => b.total - a.total);
      setPipelineData(sorted);
    }
    setLoading(false);
  }

  const handleNumberClick = (positionId, stage) => {
    navigate('/active-tracker', { 
      state: { positionId, stage } 
    });
  };

  const handlePositionClick = (positionId) => {
    navigate('/active-tracker', { 
      state: { positionId } 
    });
  };

  if (loading) {
    return (
      <div className="pipeline-funnel-wrapper">
        <div className="pipeline-loading">Loading pipeline data...</div>
      </div>
    );
  }

  if (pipelineData.length === 0) {
    return (
      <div className="pipeline-funnel-wrapper">
        <div className="pipeline-empty">No active positions with candidates</div>
      </div>
    );
  }

  return (
    <div className="pipeline-funnel-wrapper">
      <h2 className="pipeline-funnel-title">HIRING PIPELINE</h2>
      
      <div className="pipeline-table-container">
        <table className="pipeline-funnel-table">
          <thead>
            <tr>
              <th className="pos-header">POSITION</th>
              {stages.map(stage => (
                <th 
                  key={stage.key} 
                  className="stage-header"
                  style={{ color: stage.color }}
                >
                  {stage.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pipelineData.map((position, idx) => (
              <motion.tr
                key={position.positionId}
                className="pipeline-funnel-row"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05, duration: 0.3 }}
              >
                {/* Position Column */}
                <td className="pos-cell">
                  <div 
                    className="pos-info"
                    onClick={() => handlePositionClick(position.positionId)}
                  >
                    <div className="pos-title">
                      {position.title}
                      <span className="pos-count">({position.total})</span>
                    </div>
                    <div className="pos-client">{position.client}</div>
                  </div>
                </td>
                
                {/* Stage Columns */}
                {stages.map((stage, stageIdx) => {
                  const count = position.stages[stage.key] || 0;
                  const nextStage = stages[stageIdx + 1];
                  const nextCount = nextStage ? (position.stages[nextStage.key] || 0) : 0;
                  const showArrow = count > 0 && nextCount > 0 && stageIdx < stages.length - 1;

                  return (
                    <td key={stage.key} className="stage-cell">
                      <div className="stage-content">
                        {count > 0 ? (
                          <motion.div
                            className="stage-num"
                            style={{ color: stage.color }}
                            onClick={() => handleNumberClick(position.positionId, stage.key)}
                            whileHover={{ scale: 1.15 }}
                            whileTap={{ scale: 0.95 }}
                          >
                            {count}
                          </motion.div>
                        ) : (
                          <span className="stage-empty">—</span>
                        )}
                        
                        {showArrow && (
                          <motion.div
                            className="arrow-wrapper"
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: idx * 0.05 + 0.2, duration: 0.3 }}
                          >
                            <ChevronArrow color={nextStage.color} />
                          </motion.div>
                        )}
                      </div>
                    </td>
                  );
                })}
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default PipelineFunnel;