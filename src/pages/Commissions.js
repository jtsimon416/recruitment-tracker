import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';
import '../styles/Commissions.css';

function Commissions() {
  const [commissions, setCommissions] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [recruiters, setRecruiters] = useState([]);
  const [positions, setPositions] = useState([]);
  const [candidates, setCandidates] = useState([]);
  const [stats, setStats] = useState({
    pending: 0,
    readyToInvoice: 0,
    invoiced: 0,
    paid: 0,
    ytdTotal: 0,
    totalRevenue: 0
  });

  const [formData, setFormData] = useState({
    recruiter_id: '',
    position_id: '',
    candidate_id: '',
    amount: '',
    status: 'Pending',
    placement_date: '',
    notes: ''
  });

  useEffect(() => {
    fetchCommissions();
    fetchRecruiters();
    fetchPositions();
    fetchCandidates();
  }, []);

  async function fetchCommissions() {
    const { data, error } = await supabase
      .from('commissions')
      .select('*, recruiters(name), positions(title), candidates(name)')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching commissions:', error);
    } else {
      setCommissions(data || []);
      calculateStats(data || []);
    }
  }

  async function fetchRecruiters() {
    const { data, error } = await supabase
      .from('recruiters')
      .select('*')
      .order('name');
    
    if (error) {
      console.error('Error fetching recruiters:', error);
    } else {
      setRecruiters(data || []);
    }
  }

  async function fetchPositions() {
    const { data, error } = await supabase
      .from('positions')
      .select('*')
      .order('title');
    
    if (error) {
      console.error('Error fetching positions:', error);
    } else {
      setPositions(data || []);
    }
  }

  async function fetchCandidates() {
    const { data, error } = await supabase
      .from('candidates')
      .select('*')
      .order('name');
    
    if (error) {
      console.error('Error fetching candidates:', error);
    } else {
      setCandidates(data || []);
    }
  }

  function calculateStats(commissionsData) {
    const pending = commissionsData
      .filter(c => c.status === 'Pending')
      .reduce((sum, c) => sum + parseFloat(c.amount || 0), 0);
    
    const readyToInvoice = commissionsData
      .filter(c => c.status === 'Ready to Invoice')
      .reduce((sum, c) => sum + parseFloat(c.amount || 0), 0);
    
    const invoiced = commissionsData
      .filter(c => c.status === 'Invoiced')
      .reduce((sum, c) => sum + parseFloat(c.amount || 0), 0);
    
    const paid = commissionsData
      .filter(c => c.status === 'Paid')
      .reduce((sum, c) => sum + parseFloat(c.amount || 0), 0);
    
    const currentYear = new Date().getFullYear();
    const ytdTotal = commissionsData
      .filter(c => {
        const year = new Date(c.placement_date).getFullYear();
        return year === currentYear && c.status === 'Paid';
      })
      .reduce((sum, c) => sum + parseFloat(c.amount || 0), 0);
    
    const totalRevenue = commissionsData
      .filter(c => c.status === 'Paid')
      .reduce((sum, c) => sum + parseFloat(c.amount || 0), 0);

    setStats({
      pending,
      readyToInvoice,
      invoiced,
      paid,
      ytdTotal,
      totalRevenue
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const { error } = await supabase
      .from('commissions')
      .insert([formData]);
    
    if (error) {
      alert('Error adding commission: ' + error.message);
    } else {
      alert('Commission added successfully!');
      setFormData({
        recruiter_id: '',
        position_id: '',
        candidate_id: '',
        amount: '',
        status: 'Pending',
        placement_date: '',
        notes: ''
      });
      setShowForm(false);
      fetchCommissions();
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('Are you sure you want to delete this commission?')) return;
    
    const { error } = await supabase
      .from('commissions')
      .delete()
      .eq('id', id);
    
    if (error) {
      alert('Error deleting commission: ' + error.message);
    } else {
      alert('Commission deleted successfully!');
      fetchCommissions();
    }
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Director Commission</h1>
        <button className="btn-primary" onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancel' : '+ Add Commission'}
        </button>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <p className="stat-value">${stats.pending.toFixed(2)}</p>
          <p className="stat-label">Pending</p>
        </div>
        <div className="stat-card">
          <p className="stat-value">${stats.readyToInvoice.toFixed(2)}</p>
          <p className="stat-label">Ready to Invoice</p>
        </div>
        <div className="stat-card">
          <p className="stat-value">${stats.invoiced.toFixed(2)}</p>
          <p className="stat-label">Invoiced</p>
        </div>
        <div className="stat-card">
          <p className="stat-value">${stats.paid.toFixed(2)}</p>
          <p className="stat-label">Paid</p>
        </div>
        <div className="stat-card">
          <p className="stat-value">${stats.ytdTotal.toFixed(2)}</p>
          <p className="stat-label">YTD Total</p>
        </div>
      </div>

      <div className="total-revenue-card">
        <p className="stat-value">${stats.totalRevenue.toFixed(2)}</p>
        <p className="stat-label">Total Commission Revenue</p>
        <p className="stat-sublabel">Lifetime Earnings</p>
      </div>

      {showForm && (
        <div className="form-card">
          <h2>Add New Commission</h2>
          <form onSubmit={handleSubmit}>
            <div className="form-row">
              <div className="form-group">
                <label>Recruiter *</label>
                <select
                  required
                  value={formData.recruiter_id}
                  onChange={(e) => setFormData({...formData, recruiter_id: e.target.value})}
                >
                  <option value="">Select recruiter...</option>
                  {recruiters.map(rec => (
                    <option key={rec.id} value={rec.id}>{rec.name}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Position *</label>
                <select
                  required
                  value={formData.position_id}
                  onChange={(e) => setFormData({...formData, position_id: e.target.value})}
                >
                  <option value="">Select position...</option>
                  {positions.map(pos => (
                    <option key={pos.id} value={pos.id}>{pos.title}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Candidate *</label>
                <select
                  required
                  value={formData.candidate_id}
                  onChange={(e) => setFormData({...formData, candidate_id: e.target.value})}
                >
                  <option value="">Select candidate...</option>
                  {candidates.map(cand => (
                    <option key={cand.id} value={cand.id}>{cand.name}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Amount *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={formData.amount}
                  onChange={(e) => setFormData({...formData, amount: e.target.value})}
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
                  <option>Pending</option>
                  <option>Ready to Invoice</option>
                  <option>Invoiced</option>
                  <option>Paid</option>
                </select>
              </div>
              <div className="form-group">
                <label>Placement Date</label>
                <input
                  type="date"
                  value={formData.placement_date}
                  onChange={(e) => setFormData({...formData, placement_date: e.target.value})}
                />
              </div>
            </div>

            <div className="form-group">
              <label>Notes</label>
              <textarea
                rows="3"
                value={formData.notes}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
              />
            </div>

            <button type="submit" className="btn-primary">Add Commission</button>
          </form>
        </div>
      )}

      <div className="commissions-list">
        <div className="commissions-header">
          <div>Recruiter</div>
          <div>Position</div>
          <div>Candidate</div>
          <div>Amount</div>
          <div>Status</div>
          <div>Placement Date</div>
          <div>Actions</div>
        </div>
        
        {commissions.length === 0 ? (
          <div className="empty-state">
            <h3>No commissions recorded yet</h3>
            <p>Add your first commission to get started.</p>
          </div>
        ) : (
          commissions.map(commission => (
            <div key={commission.id} className="commission-row">
              <div>{commission.recruiters?.name || 'N/A'}</div>
              <div>{commission.positions?.title || 'N/A'}</div>
              <div>{commission.candidates?.name || 'N/A'}</div>
              <div className="commission-amount">${parseFloat(commission.amount || 0).toFixed(2)}</div>
              <div>
                <span className={`status-badge ${commission.status.toLowerCase().replace(' ', '-')}`}>
                  {commission.status}
                </span>
              </div>
              <div>{commission.placement_date || 'N/A'}</div>
              <div className="commission-actions">
                <button className="btn-delete" onClick={() => handleDelete(commission.id)}>
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default Commissions;