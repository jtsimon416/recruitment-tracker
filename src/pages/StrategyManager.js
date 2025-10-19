import React, { useState, useEffect } from 'react';
import { useData } from '../contexts/DataContext';
import { supabase } from '../services/supabaseClient';
import { motion } from 'framer-motion';
import {
  FileText, Trash2, Eye, Download, Calendar, Clock,
  CheckCircle, TrendingUp, BarChart
} from 'lucide-react';
import '../styles/Dashboard.css';

function StrategyManager() {
  const { userProfile, isDirectorOrManager } = useData();
  const [positions, setPositions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('strategies');
  const [selectedPosition, setSelectedPosition] = useState(null);
  const [uploadingFile, setUploadingFile] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);

  useEffect(() => {
    if (!isDirectorOrManager) {
      alert('Access Denied: This page is for managers only.');
      window.location.href = '/';
      return;
    }
    fetchCompletedPositions();
  }, [isDirectorOrManager]);

  const fetchCompletedPositions = async () => {
    const { data, error } = await supabase
      .from('positions')
      .select('*, clients(company_name), recruiters(name)')
      .not('first_slate_completed_at', 'is', null)
      .order('first_slate_completed_at', { ascending: false });

    if (!error && data) {
      setPositions(data);
    }
    setLoading(false);
  };

  const fetchAuditLogs = async (positionId) => {
    const { data, error } = await supabase
      .from('pipeline_audit_log')
      .select(`
        *,
        candidates(name),
        recruiters(name)
      `)
      .eq('position_id', positionId)
      .order('created_at', { ascending: false })
      .limit(1000);

    if (!error && data) {
      setAuditLogs(data);
    }
  };

  const uploadStrategyDocument = async (positionId, file, notes) => {
    setUploadingFile(positionId);

    try {
      const fileName = `${positionId}_strategy_${Date.now()}.docx`;

      const { error: uploadError } = await supabase.storage
        .from('strategy-documents')
        .upload(fileName, file);

      if (uploadError) {
        alert('Error uploading file: ' + uploadError.message);
        setUploadingFile(null);
        return;
      }

      const { data: urlData } = supabase.storage
        .from('strategy-documents')
        .getPublicUrl(fileName);

      await supabase
        .from('positions')
        .update({
          phase_2_strategy_url: urlData.publicUrl,
          phase_2_uploaded_at: new Date().toISOString(),
          strategy_viewed_by: [],
          strategy_notes: notes
        })
        .eq('id', positionId);

      await supabase
        .from('pipeline_audit_log')
        .insert({
          position_id: positionId,
          event_type: 'strategy_uploaded',
          performed_by: userProfile.id,
          notes: `New strategy uploaded: ${file.name}`,
          metadata: { filename: file.name, notes },
          created_at: new Date().toISOString()
        });

      alert('✅ Strategy uploaded! Recruiters will be notified.');
      fetchCompletedPositions();
    } catch (error) {
      alert('Error: ' + error.message);
    } finally {
      setUploadingFile(null);
    }
  };

  const removeStrategyDocument = async (positionId, filename) => {
    if (!window.confirm('Are you sure you want to remove this strategy document?')) {
      return;
    }

    try {
      await supabase
        .from('positions')
        .update({
          phase_2_strategy_url: null,
          phase_2_uploaded_at: null,
          strategy_viewed_by: [],
          strategy_notes: null
        })
        .eq('id', positionId);

      await supabase
        .from('pipeline_audit_log')
        .insert({
          position_id: positionId,
          event_type: 'strategy_removed',
          performed_by: userProfile.id,
          notes: `Strategy document removed`,
          created_at: new Date().toISOString()
        });

      alert('Strategy document removed.');
      fetchCompletedPositions();
    } catch (error) {
      alert('Error: ' + error.message);
    }
  };

  const exportAuditReport = async (position) => {
    await fetchAuditLogs(position.id);

    const headers = ['Date', 'Time', 'Event', 'Candidate', 'Performed By', 'Notes'];
    const rows = auditLogs.map(row => [
      new Date(row.created_at).toLocaleDateString(),
      new Date(row.created_at).toLocaleTimeString(),
      row.event_type || 'N/A',
      row.candidates?.name || 'N/A',
      row.recruiters?.name || 'System',
      (row.notes || '').replace(/,/g, ';')
    ]);

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit_${position.title.replace(/\s/g, '_')}_${Date.now()}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  const calculateTimeDifference = (completed, deadline) => {
    const completedDate = new Date(completed);
    const deadlineDate = new Date(deadline);
    const diff = deadlineDate - completedDate;
    const hours = Math.floor(Math.abs(diff) / 3600000);
    const minutes = Math.floor((Math.abs(diff) % 3600000) / 60000);

    if (diff > 0) {
      return { early: true, display: `${hours}h ${minutes}m early` };
    } else {
      return { early: false, display: `${hours}h ${minutes}m late` };
    }
  };

  if (!isDirectorOrManager) {
    return null;
  }

  if (loading) {
    return <div className="dashboard-container">Loading...</div>;
  }

  return (
    <div className="dashboard-container">
      <div className="overview-header">
        <div>
          <h1 className="main-title">Strategy Manager</h1>
          <p className="welcome-message">
            Manage Phase 2 strategies and view comprehensive audit trails for completed First Slate sprints.
          </p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="strategy-tabs" style={{
        display: 'flex',
        gap: '1rem',
        marginBottom: '2rem',
        borderBottom: '2px solid var(--border-color)'
      }}>
        <button
          className={`tab-button ${activeTab === 'strategies' ? 'active' : ''}`}
          onClick={() => setActiveTab('strategies')}
          style={{
            padding: '0.75rem 1.5rem',
            background: activeTab === 'strategies' ? 'linear-gradient(135deg, var(--rose-gold), #F39C9C)' : 'transparent',
            border: 'none',
            borderBottom: activeTab === 'strategies' ? '3px solid var(--rose-gold)' : '3px solid transparent',
            color: activeTab === 'strategies' ? 'var(--main-bg)' : 'var(--text-secondary)',
            cursor: 'pointer',
            fontWeight: 600,
            transition: 'all 0.3s'
          }}
        >
          <FileText size={18} style={{ verticalAlign: 'middle', marginRight: '0.5rem' }} />
          Strategy Documents
        </button>
        <button
          className={`tab-button ${activeTab === 'audit' ? 'active' : ''}`}
          onClick={() => setActiveTab('audit')}
          style={{
            padding: '0.75rem 1.5rem',
            background: activeTab === 'audit' ? 'linear-gradient(135deg, var(--rose-gold), #F39C9C)' : 'transparent',
            border: 'none',
            borderBottom: activeTab === 'audit' ? '3px solid var(--rose-gold)' : '3px solid transparent',
            color: activeTab === 'audit' ? 'var(--main-bg)' : 'var(--text-secondary)',
            cursor: 'pointer',
            fontWeight: 600,
            transition: 'all 0.3s'
          }}
        >
          <BarChart size={18} style={{ verticalAlign: 'middle', marginRight: '0.5rem' }} />
          Audit Trail
        </button>
      </div>

      {/* Strategy Documents Tab */}
      {activeTab === 'strategies' && (
        <div>
          {positions.length === 0 ? (
            <div className="first-slate-sprint-card">
              <p style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
                No completed First Slate sprints yet.
              </p>
            </div>
          ) : (
            positions.map((position) => {
              const timeDiff = calculateTimeDifference(
                position.first_slate_completed_at,
                position.first_slate_deadline
              );
              const isOnTime = position.first_slate_status === 'completed_on_time';

              return (
                <motion.div
                  key={position.id}
                  className="first-slate-sprint-card"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <div className="first-slate-header">
                    <div>
                      <div className="first-slate-position-title">
                        {position.title}
                      </div>
                      <div className="first-slate-company">
                        @ {position.clients?.company_name || 'N/A'}
                      </div>
                    </div>
                  </div>

                  {/* First Slate Performance */}
                  <div style={{ marginTop: '1rem' }}>
                    <h3 style={{ color: 'var(--rose-gold)', marginBottom: '0.5rem' }}>
                      First Slate Performance:
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.9rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Calendar size={16} color="var(--text-muted)" />
                        <span>Completed: {formatDateTime(position.first_slate_completed_at)}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        {isOnTime ? <CheckCircle size={16} color="var(--mint-cream)" /> : <Clock size={16} color="var(--dusty-pink)" />}
                        <span style={{ color: isOnTime ? 'var(--mint-cream)' : 'var(--dusty-pink)' }}>
                          Status: {isOnTime ? '✅' : '⚠️'} Delivered {timeDiff.display}
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <TrendingUp size={16} color="var(--text-muted)" />
                        <span>Final Count: {position.first_slate_final_count || 8} candidates</span>
                      </div>
                    </div>
                  </div>

                  {/* Current Strategy */}
                  <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border-color)' }}>
                    <h3 style={{ color: 'var(--rose-gold)', marginBottom: '0.5rem' }}>
                      Current Strategy:
                    </h3>
                    {position.phase_2_strategy_url ? (
                      <div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.9rem', marginBottom: '1rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <FileText size={16} color="var(--accent-blue)" />
                            <span>Document uploaded</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Calendar size={16} color="var(--text-muted)" />
                            <span>Uploaded: {formatDateTime(position.phase_2_uploaded_at)}</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Eye size={16} color="var(--text-muted)" />
                            <span>Viewed by: {position.strategy_viewed_by?.length || 0} recruiters</span>
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                          <a
                            href={position.phase_2_strategy_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="view-strategy-btn"
                          >
                            <Download size={16} style={{ verticalAlign: 'middle', marginRight: '0.5rem' }} />
                            Preview
                          </a>
                          <button
                            className="btn-secondary"
                            onClick={() => removeStrategyDocument(position.id, position.phase_2_strategy_url)}
                            style={{
                              background: 'linear-gradient(135deg, #F7768E, #E74C3C)',
                              border: 'none',
                              borderRadius: '6px',
                              padding: '0.5rem 1rem',
                              color: 'white',
                              cursor: 'pointer'
                            }}
                          >
                            <Trash2 size={16} style={{ verticalAlign: 'middle', marginRight: '0.5rem' }} />
                            Remove
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                        No strategy document uploaded yet.
                      </div>
                    )}
                  </div>

                  {/* Upload New Strategy */}
                  <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border-color)' }}>
                    <h3 style={{ color: 'var(--rose-gold)', marginBottom: '0.5rem' }}>
                      Upload New Strategy:
                    </h3>
                    <input
                      type="file"
                      accept=".docx,.doc"
                      id={`file-${position.id}`}
                      style={{ marginBottom: '0.5rem' }}
                      onChange={(e) => {
                        const file = e.target.files[0];
                        if (file) {
                          const notes = prompt('Optional notes for this strategy:');
                          uploadStrategyDocument(position.id, file, notes || '');
                        }
                      }}
                    />
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                      Accepted formats: .docx, .doc
                    </div>
                    {uploadingFile === position.id && (
                      <div style={{ marginTop: '0.5rem', color: 'var(--accent-blue)' }}>
                        Uploading...
                      </div>
                    )}
                  </div>

                  {/* View Audit Report */}
                  <div style={{ marginTop: '1.5rem' }}>
                    <button
                      className="btn-premium"
                      onClick={() => exportAuditReport(position)}
                    >
                      <Download size={16} style={{ verticalAlign: 'middle', marginRight: '0.5rem' }} />
                      Export Audit Report (CSV)
                    </button>
                  </div>
                </motion.div>
              );
            })
          )}
        </div>
      )}

      {/* Audit Trail Tab */}
      {activeTab === 'audit' && (
        <div>
          {positions.length === 0 ? (
            <div className="first-slate-sprint-card">
              <p style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
                No completed First Slate sprints yet.
              </p>
            </div>
          ) : (
            <div className="first-slate-sprint-card">
              <h3 style={{ color: 'var(--rose-gold)', marginBottom: '1rem' }}>
                Select a position to view audit trail:
              </h3>
              <select
                value={selectedPosition || ''}
                onChange={(e) => {
                  setSelectedPosition(e.target.value);
                  if (e.target.value) {
                    fetchAuditLogs(e.target.value);
                  }
                }}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  background: 'var(--secondary-bg)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '6px',
                  color: 'var(--text-primary)',
                  fontSize: '1rem'
                }}
              >
                <option value="">-- Select Position --</option>
                {positions.map(pos => (
                  <option key={pos.id} value={pos.id}>
                    {pos.title} @ {pos.clients?.company_name}
                  </option>
                ))}
              </select>

              {selectedPosition && auditLogs.length > 0 && (
                <div style={{ marginTop: '2rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h3 style={{ color: 'var(--rose-gold)' }}>
                      Activity Log ({auditLogs.length} events)
                    </h3>
                    <button
                      className="btn-premium"
                      onClick={() => {
                        const pos = positions.find(p => p.id === selectedPosition);
                        if (pos) exportAuditReport(pos);
                      }}
                    >
                      <Download size={16} style={{ verticalAlign: 'middle', marginRight: '0.5rem' }} />
                      Export CSV
                    </button>
                  </div>

                  <div style={{
                    maxHeight: '600px',
                    overflowY: 'auto',
                    background: 'var(--secondary-bg)',
                    borderRadius: '8px',
                    padding: '1rem'
                  }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ borderBottom: '2px solid var(--border-color)' }}>
                          <th style={{ textAlign: 'left', padding: '0.5rem', color: 'var(--rose-gold)' }}>Date/Time</th>
                          <th style={{ textAlign: 'left', padding: '0.5rem', color: 'var(--rose-gold)' }}>Event</th>
                          <th style={{ textAlign: 'left', padding: '0.5rem', color: 'var(--rose-gold)' }}>Candidate</th>
                          <th style={{ textAlign: 'left', padding: '0.5rem', color: 'var(--rose-gold)' }}>Performed By</th>
                          <th style={{ textAlign: 'left', padding: '0.5rem', color: 'var(--rose-gold)' }}>Notes</th>
                        </tr>
                      </thead>
                      <tbody>
                        {auditLogs.map((log, index) => (
                          <tr key={index} style={{
                            borderBottom: '1px solid var(--border-color)',
                            transition: 'background 0.2s'
                          }}>
                            <td style={{ padding: '0.75rem', fontSize: '0.85rem' }}>
                              {formatDateTime(log.created_at)}
                            </td>
                            <td style={{ padding: '0.75rem', fontSize: '0.85rem' }}>
                              {log.event_type || 'N/A'}
                            </td>
                            <td style={{ padding: '0.75rem', fontSize: '0.85rem' }}>
                              {log.candidates?.name || 'N/A'}
                            </td>
                            <td style={{ padding: '0.75rem', fontSize: '0.85rem' }}>
                              {log.recruiters?.name || 'System'}
                            </td>
                            <td style={{ padding: '0.75rem', fontSize: '0.85rem', maxWidth: '300px' }}>
                              {log.notes || 'N/A'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default StrategyManager;
