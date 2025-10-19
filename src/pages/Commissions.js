import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';
import { useConfirmation } from '../contexts/ConfirmationContext';
import '../styles/Commissions.css';

function Commissions() {
  const { showConfirmation } = useConfirmation();
  const [commissions, setCommissions] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [recruiters, setRecruiters] = useState([]);
  const [positions, setPositions] = useState([]);
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filter State: Includes Status, Type, Recruiter, and Date Range
  const [filters, setFilters] = useState({
    status: '',
    commissionType: '',
    recruiterId: '',
    dateFrom: '', 
    dateTo: '',   
  });

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prevFilters => ({
      ...prevFilters,
      // Treats "All" or empty input as an empty string for the Supabase query
      [name]: value === 'All' ? '' : value, 
    }));
  };
  
  // Effect to re-fetch commissions whenever filters change
  useEffect(() => {
      if (!loading) { 
          fetchCommissions();
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);
  
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
    calculated_amount: 0, 
    status: 'Pending',
    placement_date: '',
    notes: '',
    
    // Commission Calculation Fields
    commission_type: '',
    placement_fee: 0,
    commission_rate: 0, 
    client_rate: 0,
    contractor_rate: 0,
    source_fee: 0,
    stage_percentage: 0,
  });

  const calculateCommission = (currentData) => {
    let calculatedAmount = 0;
    const { commission_type, placement_fee, commission_rate, client_rate, contractor_rate, source_fee, stage_percentage } = currentData;
    
    if (commission_type === 'Placement') {
        const fee = parseFloat(placement_fee) || 0;
        const rate = parseFloat(commission_rate) || 0;
        calculatedAmount = fee * (rate / 100);
    } else if (commission_type === 'Contract') {
        const cRate = parseFloat(client_rate) || 0;
        const conRate = parseFloat(contractor_rate) || 0;
        const rate = parseFloat(commission_rate) || 0;
        calculatedAmount = (cRate - conRate) * (rate / 100);
    } else if (commission_type === 'Team Interview') {
        const fee = parseFloat(source_fee) || 0;
        const percent = parseFloat(stage_percentage) || 0;
        calculatedAmount = fee * (percent / 100);
    }
    
    return Math.max(0, calculatedAmount);
  };

  const handleFormChange = (e) => {
    const { name, value, type } = e.target;
    let newValue = value;
    
    // Custom handling for 'text' inputs that should be treated as numbers (to avoid scrollbar)
    if ((name === 'commission_rate' || name === 'stage_percentage' || name === 'placement_fee' || name === 'client_rate' || name === 'contractor_rate' || name === 'source_fee')) {
        newValue = parseFloat(value) || 0;
    } else if (type === 'number') {
        newValue = parseFloat(value) || 0;
    }
    
    const updatedData = {
        ...formData,
        [name]: newValue,
    };
    
    const calculatedAmount = calculateCommission(updatedData);
    
    setFormData({
        ...updatedData,
        calculated_amount: calculatedAmount,
    });
  };

  useEffect(() => {
    const loadData = async () => {
      await Promise.all([
        fetchCommissions(true), 
        fetchRecruiters(),
        fetchPositions(),
        fetchCandidates()
      ]);
      setLoading(false);
    };
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Updated function to apply all filters using Supabase query methods
  async function fetchCommissions(ignoreFilters = false) {
    let query = supabase
      .from('commissions')
      .select('*, recruiters(name), positions(title), candidates(name)')
      .order('created_at', { ascending: false });

    if (!ignoreFilters) {
        if (filters.status) {
            query = query.eq('status', filters.status);
        }
        if (filters.commissionType) {
            query = query.eq('commission_type', filters.commissionType);
        }
        if (filters.recruiterId) {
            query = query.eq('recruiter_id', filters.recruiterId);
        }
        
        // Date Range Filters: use gte (Greater Than or Equal) and lte (Less Than or Equal)
        if (filters.dateFrom) {
            query = query.gte('placement_date', filters.dateFrom);
        }
        if (filters.dateTo) {
            query = query.lte('placement_date', filters.dateTo);
        }
    }

    const { data, error } = await query;
    
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
    const getAmount = (c) => parseFloat(c.amount || c.calculated_amount || 0);

    const pending = commissionsData
      .filter(c => c.status === 'Pending')
      .reduce((sum, c) => sum + getAmount(c), 0);
    
    const readyToInvoice = commissionsData
      .filter(c => c.status === 'Ready to Invoice')
      .reduce((sum, c) => sum + getAmount(c), 0);
    
    const invoiced = commissionsData
      .filter(c => c.status === 'Invoiced')
      .reduce((sum, c) => sum + getAmount(c), 0);
    
    const paid = commissionsData
      .filter(c => c.status === 'Paid')
      .reduce((sum, c) => sum + getAmount(c), 0);
    
    setStats({
      pending,
      readyToInvoice,
      invoiced,
      paid,
      ytdTotal: 0, 
      totalRevenue: 0 
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);

    const finalData = {
        recruiter_id: formData.recruiter_id,
        position_id: formData.position_id,
        candidate_id: formData.candidate_id,
        amount: formData.calculated_amount, 
        status: formData.status,
        placement_date: formData.placement_date,
        notes: formData.notes,
        
        commission_type: formData.commission_type,
        placement_fee: formData.placement_fee,
        commission_rate: formData.commission_rate,
        client_rate: formData.client_rate,
        contractor_rate: formData.contractor_rate,
        source_fee: formData.source_fee,
        stage_percentage: formData.stage_percentage,
    };
    
    if (formData.calculated_amount <= 0 || !formData.commission_type || !formData.recruiter_id || !formData.position_id || !formData.candidate_id) {
        showConfirmation({
          type: 'error',
          title: 'Error',
          message: 'Please ensure all required fields are selected and a positive commission is calculated.',
          confirmText: 'OK',
          cancelText: null,
          onConfirm: () => {}
        });
        setLoading(false);
        return;
    }

    const { error } = await supabase
      .from('commissions')
      .insert([finalData]);

    if (error) {
      showConfirmation({
        type: 'error',
        title: 'Error',
        message: `Error adding commission: ${error.message}`,
        confirmText: 'OK',
        cancelText: null,
        onConfirm: () => {}
      });
    } else {
      showConfirmation({
        type: 'success',
        title: 'Success!',
        message: 'Commission added successfully!',
        confirmText: 'OK',
        cancelText: null,
        onConfirm: () => {}
      });
      setFormData({
        recruiter_id: '',
        position_id: '',
        candidate_id: '',
        calculated_amount: 0,
        status: 'Pending',
        placement_date: '',
        notes: '',
        commission_type: '',
        placement_fee: 0,
        commission_rate: 0,
        client_rate: 0,
        contractor_rate: 0,
        source_fee: 0,
        stage_percentage: 0,
      });
      setShowForm(false);
      fetchCommissions(); 
    }
    setLoading(false);
  }

  async function handleDelete(id) {
    const commission = commissions.find(c => c.id === id);
    const commissionInfo = commission ? `${commission.recruiters?.name || 'Unknown'} - ${commission.positions?.title || 'Unknown Position'}` : 'this commission';

    showConfirmation({
      type: 'delete',
      title: 'Delete Commission?',
      message: 'This action cannot be undone. The commission record will be permanently removed.',
      contextInfo: `Deleting: ${commissionInfo}`,
      confirmText: 'Delete',
      cancelText: 'Keep',
      onConfirm: async () => {
        setLoading(true);
        const { error } = await supabase
          .from('commissions')
          .delete()
          .eq('id', id);

        if (error) {
          showConfirmation({
            type: 'error',
            title: 'Error',
            message: `Error deleting commission: ${error.message}`,
            confirmText: 'OK',
            cancelText: null,
            onConfirm: () => {}
          });
        } else {
          showConfirmation({
            type: 'success',
            title: 'Success!',
            message: 'Commission deleted successfully!',
            confirmText: 'OK',
            cancelText: null,
            onConfirm: () => {}
          });
          fetchCommissions();
        }
        setLoading(false);
      }
    });
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
      
      {/* FILTER BAR: Now includes date range */}
      <div className="filter-bar">
        <div className="form-group filter-group">
            <label>Filter by Status</label>
            <select
                name="status"
                value={filters.status}
                onChange={handleFilterChange}
            >
                <option value="">All Statuses</option>
                <option value="Pending">Pending</option>
                <option value="Ready to Invoice">Ready to Invoice</option>
                <option value="Invoiced">Invoiced</option>
                <option value="Paid">Paid</option>
            </select>
        </div>
        
        <div className="form-group filter-group">
            <label>Filter by Type</label>
            <select
                name="commissionType"
                value={filters.commissionType}
                onChange={handleFilterChange}
            >
                <option value="">All Types</option>
                <option value="Placement">Permanent Placement</option>
                <option value="Contract">Contract Placement</option>
                <option value="Team Interview">Team Interview</option>
            </select>
        </div>
        
        <div className="form-group filter-group">
            <label>Filter by Recruiter</label>
            <select
                name="recruiterId"
                value={filters.recruiterId}
                onChange={handleFilterChange}
            >
                <option value="">All Recruiters</option>
                {recruiters.map(rec => (
                    <option key={rec.id} value={rec.id}>{rec.name}</option>
                ))}
            </select>
        </div>

        {/* Date Filter: From Date */}
        <div className="form-group filter-group">
            <label>Date From (Placement)</label>
            <input
                type="date"
                name="dateFrom"
                value={filters.dateFrom}
                onChange={handleFilterChange}
            />
        </div>

        {/* Date Filter: To Date */}
        <div className="form-group filter-group">
            <label>Date To (Placement)</label>
            <input
                type="date"
                name="dateTo"
                value={filters.dateTo}
                onChange={handleFilterChange}
            />
        </div>

      </div>


      {showForm && (
        <div className="form-card">
          <h2>Add New Commission</h2>
          <form onSubmit={handleSubmit}>
            {/* Base Fields */}
            <div className="form-row">
              {/* Recruiter */}
              <div className="form-group">
                <label>Recruiter *</label>
                <select
                  required
                  name="recruiter_id"
                  value={formData.recruiter_id}
                  onChange={handleFormChange}
                >
                  <option value="">Select recruiter...</option>
                  {recruiters.map(rec => (
                    <option key={rec.id} value={rec.id}>{rec.name}</option>
                  ))}
                </select>
              </div>
              {/* Position */}
              <div className="form-group">
                <label>Position *</label>
                <select
                  required
                  name="position_id"
                  value={formData.position_id}
                  onChange={handleFormChange}
                >
                  <option value="">Select position...</option>
                  {positions.map(pos => (
                    <option key={pos.id} value={pos.id}>{pos.title}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-row">
              {/* Candidate */}
              <div className="form-group">
                <label>Candidate *</label>
                <select
                  required
                  name="candidate_id"
                  value={formData.candidate_id}
                  onChange={handleFormChange}
                >
                  <option value="">Select candidate...</option>
                  {candidates.map(cand => (
                    <option key={cand.id} value={cand.id}>{cand.name}</option>
                  ))}
                </select>
              </div>
              
              {/* Commission Type DROPDOWN */}
              <div className="form-group">
                <label>Commission Type *</label>
                <select
                    required
                    name="commission_type"
                    value={formData.commission_type}
                    onChange={handleFormChange}
                >
                    <option value="">Select Type...</option>
                    <option value="Placement">Permanent Placement</option>
                    <option value="Contract">Contract Placement</option>
                    <option value="Team Interview">Team Interview</option>
                </select>
              </div>
            </div>

            {/* 2. Conditional Fields */}
            {/* Permanent Placement Fields */}
            {formData.commission_type === 'Placement' && (
                <div className="commission-type-fields">
                    <div className="form-row">
                        <div className="form-group">
                            <label>Placement Fee ($) *</label>
                            <input
                                type="text"
                                pattern="[0-9]*[.]?[0-9]+"
                                name="placement_fee"
                                value={formData.placement_fee}
                                onChange={handleFormChange}
                                placeholder="0.00"
                            />
                            <small className="form-help">Total placement fee from client</small>
                        </div>
                        <div className="form-group">
                            <label>Commission Rate (%) *</label>
                            <input
                                type="text"
                                pattern="[0-9]*[.]?[0-9]+"
                                name="commission_rate"
                                value={formData.commission_rate}
                                onChange={handleFormChange}
                                placeholder="0.00"
                            />
                            <small className="form-help">Recruiter's commission percentage</small>
                        </div>
                    </div>
                    <div className="calculation-display">
                        **Calculation:** Placement Fee ($) × Commission Rate (%) / 100 = **${formData.calculated_amount.toFixed(2)}**
                    </div>
                </div>
            )}
            
            {/* Contract Placement Fields */}
            {formData.commission_type === 'Contract' && (
                <div className="commission-type-fields">
                    <div className="form-row" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
                        <div className="form-group">
                            <label>Client Rate ($/hr) *</label>
                            <input
                                type="text"
                                pattern="[0-9]*[.]?[0-9]+"
                                name="client_rate"
                                value={formData.client_rate}
                                onChange={handleFormChange}
                                placeholder="0.00"
                            />
                            <small className="form-help">Hourly rate charged to client</small>
                        </div>
                        <div className="form-group">
                            <label>Contractor Rate ($/hr) *</label>
                            <input
                                type="text"
                                pattern="[0-9]*[.]?[0-9]+"
                                name="contractor_rate"
                                value={formData.contractor_rate}
                                onChange={handleFormChange}
                                placeholder="0.00"
                            />
                            <small className="form-help">Hourly rate paid to contractor</small>
                        </div>
                         <div className="form-group">
                            <label>Commission Rate (%) *</label>
                            <input
                                type="text"
                                pattern="[0-9]*[.]?[0-9]+"
                                name="commission_rate"
                                value={formData.commission_rate}
                                onChange={handleFormChange}
                                placeholder="0.00"
                            />
                            <small className="form-help">Recruiter's commission percentage (of margin)</small>
                        </div>
                    </div>
                     <div className="calculation-display">
                        **Calculation:** (Client Rate - Contractor Rate) × Commission Rate (%) / 100 = **${formData.calculated_amount.toFixed(2)}**
                    </div>
                </div>
            )}
            
            {/* Team Interview Fields */}
            {formData.commission_type === 'Team Interview' && (
                <div className="commission-type-fields">
                    <div className="form-row">
                        <div className="form-group">
                            <label>Source Fee ($) *</label>
                            <input
                                type="text"
                                pattern="[0-9]*[.]?[0-9]+"
                                name="source_fee"
                                value={formData.source_fee}
                                onChange={handleFormChange}
                                placeholder="0.00"
                            />
                            <small className="form-help">Base source fee for interview</small>
                        </div>
                        <div className="form-group">
                            <label>Stage Percentage (%) *</label>
                            <input
                                type="text"
                                pattern="[0-9]*[.]?[0-9]+"
                                name="stage_percentage"
                                value={formData.stage_percentage}
                                onChange={handleFormChange}
                                placeholder="0.00"
                            />
                            <small className="form-help">Percentage based on interview stage reached</small>
                        </div>
                    </div>
                    <div className="calculation-display">
                        **Calculation:** Source Fee ($) × Stage Percentage (%) / 100 = **${formData.calculated_amount.toFixed(2)}**
                    </div>
                </div>
            )}

            {/* Calculated Amount Field (Always Visible) */}
            <div className="form-row">
              <div className="form-group">
                <label>Commission Amount</label>
                <input
                  type="text"
                  readOnly
                  value={`$${formData.calculated_amount.toFixed(2)}`}
                  style={{ fontWeight: 'bold', color: 'var(--accent-green)' }}
                />
              </div>
              
              {/* Status and Date */}
              <div className="form-group">
                <label>Status</label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleFormChange}
                >
                  <option>Pending</option>
                  <option>Ready to Invoice</option>
                  <option>Invoiced</option>
                  <option>Paid</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label>Placement Date</label>
              <input
                type="date"
                name="placement_date"
                value={formData.placement_date}
                onChange={handleFormChange}
              />
            </div>
            
            <div className="form-group">
              <label>Notes</label>
              <textarea
                rows="3"
                name="notes"
                value={formData.notes}
                onChange={handleFormChange}
              />
            </div>

            <button type="submit" className="btn-primary" disabled={loading}>Add Commission</button>
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
            <h3>No commissions match the current filters.</h3>
            <p>Try resetting the filters or add a new commission.</p>
          </div>
        ) : (
          commissions.map(commission => (
            <div key={commission.id} className="commission-row">
              <div>{commission.recruiters?.name || 'N/A'}</div>
              <div>{commission.positions?.title || 'N/A'}</div>
              <div>{commission.candidates?.name || 'N/A'}</div>
              <div className="commission-amount">${parseFloat(commission.amount || commission.calculated_amount || 0).toFixed(2)}</div>
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