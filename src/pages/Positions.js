import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';
import '../styles/Positions.css';

function Positions() {
  const [positions, setPositions] = useState([]);
  const [positionsWithStats, setPositionsWithStats] = useState([]);
  const [clients, setClients] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingPosition, setEditingPosition] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [expandedDescriptions, setExpandedDescriptions] = useState({});
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [closingPosition, setClosingPosition] = useState(null);
  const [loading, setLoading] = useState(true);
  const [closeFormData, setCloseFormData] = useState({
    close_reason: '',
    notes: ''
  });
  
  const [formData, setFormData] = useState({
    client_id: '',
    title: '',
    status: 'Open',
    description: '',
    salary_range: ''
  });

  useEffect(() => {
    const loadData = async () => {
      await Promise.all([fetchPositions(), fetchClients()]);
      setLoading(false);
    };
    loadData();
  }, []);

  useEffect(() => {
    if (!loading) {
      calculatePositionStats();
    }
  }, [positions, loading]);

  async function fetchPositions() {
    const { data, error } = await supabase
      .from('positions')
      .select('*, clients(company_name)')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching positions:', error);
    } else {
      setPositions(data || []);
    }
  }

  async function fetchClients() {
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .order('company_name');
    
    if (error) {
      console.error('Error fetching clients:', error);
    } else {
      setClients(data || []);
    }
  }

  async function calculatePositionStats() {
    const enrichedPositions = await Promise.all(
      positions.map(async (position) => {
        const { data: pipelineData } = await supabase
          .from('pipeline')
          .select('*')
          .eq('position_id', position.id);

        const totalCandidates = pipelineData?.length || 0;
        const activeCandidates = pipelineData?.filter(p => p.stage !== 'Archived').length || 0;
        
        const interviewCounts = {
          interview1: pipelineData?.filter(p => p.stage === 'Interview 1').length || 0,
          interview2: pipelineData?.filter(p => p.stage === 'Interview 2').length || 0,
          interview3: pipelineData?.filter(p => p.stage === 'Interview 3').length || 0,
          offer: pipelineData?.filter(p => p.stage === 'Offer').length || 0,
          hired: pipelineData?.filter(p => p.stage === 'Hired').length || 0
        };

        let coachingMessage = 'Pipeline healthy';
        let priorityClass = 'priority-green';

        if (activeCandidates <= 1 && position.status === 'Open') {
          coachingMessage = 'Needs sourcing';
          priorityClass = 'priority-red';
        } else if (interviewCounts.interview1 + interviewCounts.interview2 + interviewCounts.interview3 >= 3) {
          coachingMessage = 'Interview bottleneck';
          priorityClass = 'priority-orange';
        } else if (interviewCounts.offer > 0) {
          coachingMessage = 'Offer pending';
          priorityClass = 'priority-blue';
        } else if (interviewCounts.hired > 0) {
          coachingMessage = 'Position filled';
          priorityClass = 'priority-green';
        }

        return {
          ...position,
          totalCandidates,
          activeCandidates,
          interviewCounts,
          coachingMessage,
          priorityClass
        };
      })
    );

    setPositionsWithStats(enrichedPositions);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    if (editingPosition) {
      const { error } = await supabase
        .from('positions')
        .update(formData)
        .eq('id', editingPosition.id);
      
      if (error) {
        alert('Error updating position: ' + error.message);
      } else {
        alert('Position updated successfully!');
        resetForm();
        await fetchPositions();
      }
    } else {
      const { error } = await supabase
        .from('positions')
        .insert([formData]);
      
      if (error) {
        alert('Error adding position: ' + error.message);
      } else {
        alert('Position added successfully!');
        resetForm();
        await fetchPositions();
      }
    }
    setLoading(false);
  }

  async function handleDelete(id) {
    if (!window.confirm('Are you sure you want to delete this position?')) return;
    setLoading(true);
    const { error } = await supabase
      .from('positions')
      .delete()
      .eq('id', id);
    
    if (error) {
      alert('Error deleting position: ' + error.message);
    } else {
      alert('Position deleted successfully!');
      await fetchPositions();
    }
    setLoading(false);
  }

  function handleEdit(position) {
    setEditingPosition(position);
    setFormData({
      client_id: position.client_id,
      title: position.title,
      status: position.status,
      description: position.description || '',
      salary_range: position.salary_range || ''
    });
    setShowForm(true);
  }

  function resetForm() {
    setFormData({
      client_id: '',
      title: '',
      status: 'Open',
      description: '',
      salary_range: ''
    });
    setEditingPosition(null);
    setShowForm(false);
  }

  function toggleDescription(positionId) {
    setExpandedDescriptions(prev => ({
      ...prev,
      [positionId]: !prev[positionId]
    }));
  }

  function openCloseModal(position) {
    setClosingPosition(position);
    setCloseFormData({
      close_reason: '',
      notes: ''
    });
    setShowCloseModal(true);
  }

  async function handleCloseRole(e) {
    e.preventDefault();
    
    if (!closeFormData.close_reason) {
      alert('Please provide a reason for closing this role');
      return;
    }
    setLoading(true);
    const { error: updateError } = await supabase
      .from('positions')
      .update({
        status: 'Closed'
      })
      .eq('id', closingPosition.id);

    if (updateError) {
      alert('Error closing position: ' + updateError.message);
      setLoading(false);
      return;
    }

    const positionId = closingPosition.id;

    const { error: pipelineError } = await supabase
      .from('pipeline')
      .delete()
      .eq('position_id', positionId);

    if (pipelineError) {
      console.error('Error removing candidates from pipeline:', pipelineError);
    }

    const { error: interviewsError } = await supabase
      .from('interviews')
      .delete()
      .eq('position_id', positionId);

    if (interviewsError) {
      console.error('Error removing candidates from interviews:', interviewsError);
    }

    alert('Position closed successfully! All associated candidates have been returned to the Talent Pool.');
    setShowCloseModal(false);
    setClosingPosition(null);
    await fetchPositions();
    setLoading(false);
  }

  const filteredPositions = statusFilter === 'all' 
    ? positionsWithStats 
    : positionsWithStats.filter(p => p.status === statusFilter);

  if (loading) {
    return <div className="loading-state">Loading Positions...</div>;
  }

  return (
    <div className="page-container page-transition">
      <div className="page-header">
        <h1>Position Management</h1>
        <button className="btn-primary" onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancel' : '+ Add Position'}
        </button>
      </div>

      <div className={`content-wrapper ${loading ? 'loading-fade' : 'loaded-fade'}`}>
        {showForm && (
          <div className="form-card">
            <h2>{editingPosition ? 'Edit Position' : 'Add New Position'}</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-row">
                <div className="form-group">
                  <label>Client *</label>
                  <select
                    required
                    value={formData.client_id}
                    onChange={(e) => setFormData({...formData, client_id: e.target.value})}
                  >
                    <option value="">Select client...</option>
                    {clients.map(client => (
                      <option key={client.id} value={client.id}>{client.company_name}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Position Title *</label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({...formData, status: e.target.value})}
                  >
                    <option>Open</option>
                    <option>Closed</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Salary Range</label>
                  <input
                    type="text"
                    placeholder="e.g., $80,000 - $100,000"
                    value={formData.salary_range}
                    onChange={(e) => setFormData({...formData, salary_range: e.target.value})}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Description</label>
                <textarea
                  rows="4"
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                />
              </div>

              <button type="submit" className="btn-primary">
                {editingPosition ? 'Update Position' : 'Add Position'}
              </button>
            </form>
          </div>
        )}

        <div className="filter-bar">
          <select 
            className="filter-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All Statuses</option>
            <option value="Open">Open</option>
            <option value="Closed">Closed</option>
          </select>
        </div>

        <div className="positions-grid">
          {filteredPositions.length === 0 ? (
            <div className="empty-state">
              <h3>No positions yet</h3>
              <p>Add your first position to get started.</p>
            </div>
          ) : (
            filteredPositions.map(position => (
              <div key={position.id} className={`position-card status-${position.status.toLowerCase()}`}>
                <div className="position-header">
                  <h3>{position.title}</h3>
                  <span className={`status-badge ${position.status.toLowerCase()}`}>
                    {position.status}
                  </span>
                </div>

                <div className="position-info">
                  <p><strong>Client:</strong> {position.clients?.company_name || 'N/A'}</p>
                  {position.salary_range && <p><strong>Salary:</strong> {position.salary_range}</p>}
                </div>

                {position.description && (
                  <div className="position-description">
                    <strong>Description</strong>
                    <p className={expandedDescriptions[position.id] ? 'expanded' : 'collapsed'}>
                      {position.description}
                    </p>
                    {position.description.length > 150 && (
                      <button 
                        className="view-more-btn"
                        onClick={() => toggleDescription(position.id)}
                      >
                        {expandedDescriptions[position.id] ? 'View Less' : 'View More'}
                      </button>
                    )}
                  </div>
                )}

                <div className={`position-analytics ${position.priorityClass}`}>
                  <div className="analytics-header">
                    <strong>Pipeline Analytics</strong>
                    <span className="coaching-message">{position.coachingMessage}</span>
                  </div>
                  
                  <div className="analytics-stats">
                    <div className="stat-item">
                      <span className="stat-label">Total</span>
                      <span className="stat-value">{position.totalCandidates}</span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-label">Active</span>
                      <span className="stat-value">{position.activeCandidates}</span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-label">Interviews</span>
                      <span className="stat-value">
                        {position.interviewCounts.interview1 + 
                         position.interviewCounts.interview2 + 
                         position.interviewCounts.interview3}
                      </span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-label">Offers</span>
                      <span className="stat-value">{position.interviewCounts.offer}</span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-label">Hired</span>
                      <span className="stat-value">{position.interviewCounts.hired}</span>
                    </div>
                  </div>
                </div>

                <div className="position-actions">
                  <button className="btn-edit" onClick={() => handleEdit(position)}>
                    Edit
                  </button>
                  {position.status === 'Open' && (
                    <button className="btn-close-role" onClick={() => openCloseModal(position)}>
                      Close Role
                    </button>
                  )}
                  <button className="btn-delete" onClick={() => handleDelete(position.id)}>
                    Delete
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Close Role Modal */}
      {showCloseModal && closingPosition && (
        <div className="modal-overlay" onClick={() => setShowCloseModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Close Role: {closingPosition.title}</h2>
            
            <form onSubmit={handleCloseRole}>
              <div className="form-group">
                <label>Reason for Closing *</label>
                <select
                  required
                  value={closeFormData.close_reason}
                  onChange={(e) => setCloseFormData({...closeFormData, close_reason: e.target.value})}
                >
                  <option value="">Select reason...</option>
                  <option value="Filled">Position Filled</option>
                  <option value="Cancelled">Position Cancelled</option>
                  <option value="On Hold">Put On Hold</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="form-group">
                <label>Notes</label>
                <textarea
                  rows="3"
                  value={closeFormData.notes}
                  onChange={(e) => setCloseFormData({...closeFormData, notes: e.target.value})}
                  placeholder="Add any additional notes about closing this role..."
                />
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowCloseModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Close Role
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Positions;