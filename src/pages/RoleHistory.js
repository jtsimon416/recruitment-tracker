import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';
import '../styles/RoleHistory.css';

function RoleHistory() {
  const [closedPositions, setClosedPositions] = useState([]);
  const [selectedPosition, setSelectedPosition] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  useEffect(() => {
    fetchClosedPositions();
  }, []);

  async function fetchClosedPositions() {
    // Fetch closed positions with related data
    const { data: positions, error } = await supabase
      .from('positions')
      .select('*, clients(company_name)')
      .eq('status', 'Closed')
      .order('updated_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching closed positions:', error);
      return;
    }

    // Enrich each position with pipeline stats
    const enrichedPositions = await Promise.all(
      (positions || []).map(async (position) => {
        // Get all pipeline entries for this position
        const { data: pipelineData } = await supabase
          .from('pipeline')
          .select('*, candidates(name), recruiters(name)')
          .eq('position_id', position.id);

        const totalCandidates = pipelineData?.length || 0;
        const hiredCandidate = pipelineData?.find(p => p.stage === 'Hired');
        
        // Build recruiter breakdown
        const recruiterBreakdown = {};
        pipelineData?.forEach(entry => {
          const recruiterName = entry.recruiters?.name || 'Unknown Recruiter';
          const candidateName = entry.candidates?.name || 'Unknown Candidate';
          
          if (!recruiterBreakdown[recruiterName]) {
            recruiterBreakdown[recruiterName] = {
              totalCandidates: 0,
              candidates: [],
              interview1Count: 0,
              interview2Count: 0,
              interview3Count: 0,
              commissionEligible: 0
            };
          }
          
          recruiterBreakdown[recruiterName].totalCandidates++;
          recruiterBreakdown[recruiterName].candidates.push({
            name: candidateName,
            stage: entry.stage,
            isCommissionEligible: ['Interview 1', 'Interview 2', 'Interview 3', 'Offer', 'Hired'].includes(entry.stage)
          });
          
          // Count interview stages
          if (entry.stage === 'Interview 1' || entry.stage === 'Interview 2' || entry.stage === 'Interview 3' || entry.stage === 'Offer' || entry.stage === 'Hired') {
            recruiterBreakdown[recruiterName].interview1Count++;
          }
          if (entry.stage === 'Interview 2' || entry.stage === 'Interview 3' || entry.stage === 'Offer' || entry.stage === 'Hired') {
            recruiterBreakdown[recruiterName].interview2Count++;
          }
          if (entry.stage === 'Interview 3' || entry.stage === 'Offer' || entry.stage === 'Hired') {
            recruiterBreakdown[recruiterName].interview3Count++;
          }
          if (['Interview 1', 'Interview 2', 'Interview 3', 'Offer', 'Hired'].includes(entry.stage)) {
            recruiterBreakdown[recruiterName].commissionEligible++;
          }
        });

        return {
          ...position,
          totalCandidates,
          hiredCandidate,
          recruiterBreakdown,
          pipelineData: pipelineData || []
        };
      })
    );

    setClosedPositions(enrichedPositions);
  }

  function viewDetails(position) {
    setSelectedPosition(position);
    setShowDetailModal(true);
  }

  function closeDetailModal() {
    setShowDetailModal(false);
    setSelectedPosition(null);
  }

  // Calculate summary stats
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
                <p><strong>Closed:</strong> {new Date(position.updated_at).toLocaleDateString()}</p>
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

      {/* Detail Modal */}
      {showDetailModal && selectedPosition && (
        <div className="modal-overlay" onClick={closeDetailModal}>
          <div className="modal-content modal-large" onClick={(e) => e.stopPropagation()}>
            <h2>Role Closure Report: {selectedPosition.title}</h2>
            
            <div className="report-section">
              <h3>Outcome Summary</h3>
              {selectedPosition.hiredCandidate ? (
                <div className="outcome-success">
                  <p><strong>Commission Earned By:</strong> <span className="success-text">{selectedPosition.hiredCandidate.recruiters?.name}</span></p>
                  <p><strong>Hired Candidate:</strong> {selectedPosition.hiredCandidate.candidates?.name}</p>
                  <p><strong>Final Stage:</strong> {selectedPosition.hiredCandidate.stage}</p>
                </div>
              ) : (
                <p><strong>Commission Earned By:</strong> None (Role was not filled)</p>
              )}
            </div>

            <div className="report-section">
              <h3>Recruiter Breakdown</h3>
              {Object.entries(selectedPosition.recruiterBreakdown).map(([recruiterName, data]) => (
                <div key={recruiterName} className="recruiter-breakdown-card">
                  <h4>{recruiterName}</h4>
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
                      <span className="stat-label-small">Commission Eligible</span>
                      <span className="stat-value-small">{data.commissionEligible}</span>
                    </div>
                  </div>
                  
                  <div className="candidates-list-small">
                    <strong>Candidates:</strong>
                    {data.candidates.map((candidate, idx) => (
                      <div key={idx} className="candidate-item-small">
                        <span>{candidate.name}</span>
                        <span className={`stage-badge-small ${candidate.isCommissionEligible ? 'eligible' : ''}`}>
                          {candidate.stage}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="report-section">
              <h3>Full Candidate Activity</h3>
              {selectedPosition.pipelineData.map((entry, idx) => (
                <div key={idx} className="activity-item">
                  <p><strong>Candidate:</strong> {entry.candidates?.name || 'Unknown'}</p>
                  <p><strong>Recruiter:</strong> {entry.recruiters?.name || 'Unknown'}</p>
                  <p><strong>Final Stage:</strong> {entry.stage}</p>
                </div>
              ))}
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