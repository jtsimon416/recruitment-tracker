import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';
import '../styles/RoleHistory.css';

function RoleHistory() {
  const [closedPositions, setClosedPositions] = useState([]);
  const [selectedPosition, setSelectedPosition] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchClosedPositions();
  }, []);

  async function fetchClosedPositions() {
    const { data: positions, error } = await supabase
      .from('positions')
      .select('*, clients(company_name)')
      .eq('status', 'Closed')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching closed positions:', error);
      setLoading(false);
      return;
    }

    const enrichedPositions = await Promise.all(
      (positions || []).map(async (position) => {
        const { data: pipelineData } = await supabase
          .from('pipeline')
          .select('*, candidates(name), recruiters(name)')
          .eq('position_id', position.id);

        const totalCandidates = pipelineData?.length || 0;
        const hiredCandidate = pipelineData?.find(p => p.stage === 'Hired');
        const hiringRecruiterId = hiredCandidate ? hiredCandidate.recruiter_id : null;

        const recruiterBreakdown = {};

        // Initialize all recruiters who worked on this role
        pipelineData?.forEach(entry => {
          if (entry.recruiter_id && !recruiterBreakdown[entry.recruiter_id]) {
            recruiterBreakdown[entry.recruiter_id] = {
              recruiterName: entry.recruiters?.name || 'Unknown Recruiter',
              totalCandidates: 0,
              candidates: [],
              highestStage: 'None',
              commission: 0,
              commissionReason: 'Not Eligible',
              // Keep interview counts for stats
              interview1Count: 0,
              interview2Count: 0,
              interview3Count: 0,
            };
          }
        });

        // If a candidate was hired, calculate commissions
        if (hiredCandidate && hiringRecruiterId && recruiterBreakdown[hiringRecruiterId]) {
          recruiterBreakdown[hiringRecruiterId].commission = 15;
          recruiterBreakdown[hiringRecruiterId].commissionReason = `Hired Candidate (${hiredCandidate.candidates?.name})`;
        }

        // Process all pipeline entries to gather stats and find highest interview stage
        pipelineData?.forEach(entry => {
          if (!entry.recruiter_id) return;

          const stats = recruiterBreakdown[entry.recruiter_id];
          stats.totalCandidates++;
          stats.candidates.push({ name: entry.candidates?.name || 'Unknown', stage: entry.stage });
          
          const stageMap = { 'Interview 1': 1, 'Interview 2': 2, 'Interview 3': 3, 'Offer': 3, 'Hired': 3 };
          const highestStageValue = stageMap[stats.highestStage] || 0;
          const currentStageValue = stageMap[entry.stage] || 0;

          if (currentStageValue > highestStageValue) {
            stats.highestStage = entry.stage;
          }

          // Aggregate interview counts
          if (['Interview 1', 'Interview 2', 'Interview 3', 'Offer', 'Hired'].includes(entry.stage)) {
            stats.interview1Count++;
          }
          if (['Interview 2', 'Interview 3', 'Offer', 'Hired'].includes(entry.stage)) {
            stats.interview2Count++;
          }
          if (['Interview 3', 'Offer', 'Hired'].includes(entry.stage)) {
            stats.interview3Count++;
          }
        });

        // Assign commission percentages to other recruiters if a hire was made
        if (hiredCandidate) {
          for (const recruiterId in recruiterBreakdown) {
            if (recruiterId !== hiringRecruiterId) {
              const stats = recruiterBreakdown[recruiterId];
              switch (stats.highestStage) {
                case 'Interview 1':
                  stats.commission = 1;
                  stats.commissionReason = 'Candidate reached Interview 1';
                  break;
                case 'Interview 2':
                  stats.commission = 2;
                  stats.commissionReason = 'Candidate reached Interview 2';
                  break;
                case 'Interview 3':
                case 'Offer':
                case 'Hired': // This case handles if another candidate was also hired, but the logic takes the highest stage.
                  stats.commission = 3;
                  stats.commissionReason = 'Candidate reached Interview 3+';
                  break;
                default:
                  break;
              }
            }
          }
        }
        
        return {
          ...position,
          totalCandidates,
          hiredCandidate,
          recruiterBreakdown,
          pipelineData: pipelineData || [],
        };
      })
    );

    setClosedPositions(enrichedPositions);
    setLoading(false);
  }

  function viewDetails(position) {
    setSelectedPosition(position);
    setShowDetailModal(true);
  }

  function closeDetailModal() {
    setShowDetailModal(false);
    setSelectedPosition(null);
  }

  if (loading) {
    return <div className="loading-state">Loading Role History...</div>;
  }

  const totalClosedRoles = closedPositions.length;
  const totalHired = closedPositions.filter(p => p.hiredCandidate).length;
  const totalCandidatesProcessed = closedPositions.reduce((sum, p) => sum + p.totalCandidates, 0);
  const successRate = totalClosedRoles > 0 ? Math.round((totalHired / totalClosedRoles) * 100) : 0;

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Role History</h1>
      </div>

      <div className="stats-cards">
        <div className="stat-card">
          <h3>Total Closed Roles</h3>
          <p className="stat-number">{totalClosedRoles}</p>
        </div>
        <div className="stat-card">
          <h3>Successfully Filled</h3>
          <p className="stat-number">{totalHired}</p>
        </div>
        <div className="stat-card">
          <h3>Total Candidates</h3>
          <p className="stat-number">{totalCandidatesProcessed}</p>
        </div>
        <div className="stat-card">
          <h3>Success Rate</h3>
          <p className="stat-number">{successRate}%</p>
        </div>
      </div>

      <div className="positions-grid">
        {closedPositions.length === 0 ? (
          <div className="empty-state">
            <h3>No closed roles yet</h3>
            <p>Closed positions will appear here.</p>
          </div>
        ) : (
          closedPositions.map(position => (
            <div key={position.id} className="position-card">
              <div className="position-header">
                <h3>{position.title}</h3>
                <span className="closed-badge">Closed</span>
              </div>
              
              <div className="position-info">
                <p><strong>Client:</strong> {position.clients?.company_name || 'N/A'}</p>
                <p><strong>Closed:</strong> {new Date(position.created_at).toLocaleDateString()}</p>
                <p><strong>Total Candidates:</strong> {position.totalCandidates}</p>
                {position.hiredCandidate && (
                  <p className="hired-info">
                    <strong>Hired:</strong> {position.hiredCandidate.candidates?.name}
                  </p>
                )}
              </div>

              <button className="btn-view-report" onClick={() => viewDetails(position)}>
                View Full Report
              </button>
            </div>
          ))
        )}
      </div>

      {showDetailModal && selectedPosition && (
        <div className="modal-overlay" onClick={closeDetailModal}>
          <div className="modal-content modal-large" onClick={(e) => e.stopPropagation()}>
            <h2>Role Closure Report: {selectedPosition.title}</h2>
            
            <div className="report-section">
              <h3>Outcome Summary</h3>
              {selectedPosition.hiredCandidate ? (
                <div className="outcome-success">
                  <p><strong>Hired Candidate:</strong> {selectedPosition.hiredCandidate.candidates?.name}</p>
                   <p>This role was successfully filled. Commissions are now eligible.</p>
                </div>
              ) : (
                <p>This role was closed without a hire. No commissions are eligible.</p>
              )}
            </div>

            <div className="report-section">
              <h3>Recruiter Breakdown & Commission</h3>
              {Object.values(selectedPosition.recruiterBreakdown).length > 0 ? (
                Object.values(selectedPosition.recruiterBreakdown).map(data => (
                  <div key={data.recruiterName} className="recruiter-breakdown-card">
                    <h4>{data.recruiterName}</h4>
                    <div className="recruiter-stats">
                      <div className="stat-item-small">
                        <span className="stat-label-small">Total Candidates</span>
                        <span className="stat-value-small">{data.totalCandidates}</span>
                      </div>
                      <div className="stat-item-small">
                        <span className="stat-label-small">Interview 1+</span>
                        <span className="stat-value-small">{data.interview1Count}</span>
                      </div>
                      <div className="stat-item-small">
                        <span className="stat-label-small">Interview 2+</span>
                        <span className="stat-value-small">{data.interview2Count}</span>
                      </div>
                      <div className="stat-item-small">
                        <span className="stat-label-small">Interview 3+</span>
                        <span className="stat-value-small">{data.interview3Count}</span>
                      </div>
                      <div className="stat-item-small">
                        <span className="stat-label-small">Commission</span>
                        <span className="stat-value-small">{data.commission}%</span>
                      </div>
                    </div>
                     {data.commission > 0 && (
                        <p className="commission-reason">
                            <strong>Reason:</strong> {data.commissionReason}
                        </p>
                    )}
                  </div>
                ))
              ) : (
                 <p>No recruiter activity recorded for this role.</p>
              )}
            </div>

            <div className="modal-actions">
              <button className="btn-secondary" onClick={closeDetailModal}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default RoleHistory;