import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../services/supabaseClient';
import { useConfirmation } from '../contexts/ConfirmationContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, User, Phone } from 'lucide-react';
import '../styles/Recruiters.css';

function Recruiters() {
  const { showConfirmation } = useConfirmation();
  const [recruiters, setRecruiters] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingRecruiter, setEditingRecruiter] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('team-management');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'Recruiter',
  });

  useEffect(() => {
    fetchRecruiters();
  }, []);

  async function fetchRecruiters() {
    setLoading(true);
    const { data, error } = await supabase.from('recruiters').select('*').order('name', { ascending: true });
    if (error) {
      console.error('Error fetching recruiters:', error);
    } else {
      setRecruiters(data || []);
    }
    setLoading(false);
  }

  function handleEdit(recruiter) {
    setEditingRecruiter(recruiter);
    setFormData({
      name: recruiter.name || '',
      email: recruiter.email || '',
      phone: recruiter.phone || '',
      role: recruiter.role || 'Recruiter',
    });
    setShowForm(true);
  }

  function resetForm() {
    setFormData({ name: '', email: '', phone: '', role: 'Recruiter' });
    setEditingRecruiter(null);
    setShowForm(false);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    let successMessage = '';
    
    const { error } = editingRecruiter
      ? await supabase.from('recruiters').update(formData).eq('id', editingRecruiter.id)
      : await supabase.from('recruiters').insert([formData]);

    if (error) {
      showConfirmation({
        type: 'error',
        title: 'Error',
        message: `Error: ${error.message}`
      });
    } else {
      successMessage = editingRecruiter ? 'Recruiter updated successfully!' : 'Recruiter added successfully!';
      showConfirmation({
        type: 'success',
        title: 'Success!',
        message: successMessage
      });
      resetForm();
      await fetchRecruiters();
    }
    setLoading(false);
  }

  async function handleDelete(id) {
    if (!window.confirm('Are you sure you want to delete this recruiter?')) return;
    setLoading(true);
    const { error } = await supabase.from('recruiters').delete().eq('id', id);
    if (error) {
      showConfirmation({
        type: 'error',
        title: 'Error',
        message: `Error deleting recruiter: ${error.message}`
      });
    } else {
      showConfirmation({
        type: 'success',
        title: 'Success!',
        message: 'Recruiter deleted successfully!'
      });
      await fetchRecruiters();
    }
    setLoading(false);
  }
  
  const { management, team } = useMemo(() => {
    const management = recruiters.filter(r => r.role === 'Director' || r.role === 'Manager' || r.role === 'Recruitment Manager');
    const team = recruiters.filter(r => r.role !== 'Director' && r.role !== 'Manager' && r.role !== 'Recruitment Manager');
    return { management, team };
  }, [recruiters]);

  return (
    <div className="page-container recruiters-page">
      <div className="page-header">
        <div className="header-content">
          <h1>Our Team</h1>
          <p style={{ color: 'yellow', fontSize: '1rem', marginTop: '5px' }}>Manage your recruitment team members</p>
        </div>
        <div className="header-actions">
          <button className="btn-primary" onClick={() => { showForm ? resetForm() : setShowForm(true) }}>
            {showForm ? 'Cancel' : '+ Add Team Member'}
          </button>
        </div>
      </div>

      <div className="tabs-container">
        <div className="tabs-nav">
          <button
            className={`tab-button ${activeTab === 'team-management' ? 'active' : ''}`}
            onClick={() => setActiveTab('team-management')}
          >
            Team Management
          </button>
          <button
            className={`tab-button ${activeTab === 'the-recruiters' ? 'active' : ''}`}
            onClick={() => setActiveTab('the-recruiters')}
          >
            The Recruiters
          </button>
        </div>
      </div>

      {activeTab === 'team-management' && (
        <>
          <AnimatePresence>
            {showForm && (
              <motion.div 
                className="form-card"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <h2>{editingRecruiter ? 'Edit Team Member' : 'Add New Team Member'}</h2>
                <form onSubmit={handleSubmit}>
                  <div className="form-group">
                    <label>Name *</label>
                    <input type="text" required value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} />
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Email</label>
                      <input type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} />
                    </div>
                    <div className="form-group">
                      <label>Phone</label>
                      <input type="tel" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} />
                    </div>
                  </div>
                  <div className="form-group">
                    <label>Role</label>
                    <select name="role" value={formData.role} onChange={(e) => setFormData({...formData, role: e.target.value})}>
                      <option value="Recruiter">Recruiter</option>
                      <option value="Recruitment Manager">Recruitment Manager</option>
                      <option value="Manager">Manager</option>
                      <option value="Director">Director</option>
                    </select>
                  </div>
                  <button type="submit" className="btn-primary" disabled={loading}>
                    {editingRecruiter ? 'Update Team Member' : 'Add Team Member'}
                  </button>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
          
          {management.length > 0 ? (
            <section className="recruiter-section">
              <h2>Management Team</h2>
              <div className="recruiters-grid">
                {management.map(recruiter => (
                  <div key={recruiter.id} className="recruiter-card">
                    <h3>{recruiter.name}</h3>
                    <div className="recruiter-info">
                      {recruiter.email && <p><Mail size={14} /> {recruiter.email}</p>}
                      {recruiter.phone && <p><Phone size={14} /> {recruiter.phone}</p>}
                      {recruiter.role && <p><User size={14} /> {recruiter.role}</p>}
                    </div>
                    <div className="recruiter-actions">
                      <button className="btn-edit" onClick={() => handleEdit(recruiter)}>Edit</button>
                      <button className="btn-delete" onClick={() => handleDelete(recruiter.id)}>Delete</button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ) : (
            <div className="empty-state">
              <h3>No management team members yet</h3>
              <p>Add your first management team member to get started.</p>
            </div>
          )}
        </>
      )}

      {activeTab === 'the-recruiters' && (
        <section className="recruiter-section">
          <h2>Recruiters</h2>
          {team.length === 0 ? (
            <div className="empty-state">
              <h3>No recruiters yet</h3>
              <p>Add your first recruiter to get started.</p>
            </div>
          ) : (
            <div className="recruiters-grid">
              {team.map(recruiter => (
                <div key={recruiter.id} className="recruiter-card">
                  <h3>{recruiter.name}</h3>
                  <div className="recruiter-info">
                    {recruiter.email && <p><Mail size={14} /> {recruiter.email}</p>}
                    {recruiter.phone && <p><Phone size={14} /> {recruiter.phone}</p>}
                    {recruiter.role && <p><User size={14} /> {recruiter.role}</p>}
                  </div>
                  <div className="recruiter-actions">
                    <button className="btn-edit" onClick={() => handleEdit(recruiter)}>Edit</button>
                    <button className="btn-delete" onClick={() => handleDelete(recruiter.id)}>Delete</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}

export default Recruiters;