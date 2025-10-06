import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';
import '../styles/Recruiters.css';

function Recruiters() {
  const [recruiters, setRecruiters] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingRecruiter, setEditingRecruiter] = useState(null);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: ''
  });

  useEffect(() => {
    fetchRecruiters();
  }, []);

  async function fetchRecruiters() {
    const { data, error } = await supabase
      .from('recruiters')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching recruiters:', error);
    } else {
      setRecruiters(data || []);
    }
    setLoading(false);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    if (editingRecruiter) {
      const { error } = await supabase
        .from('recruiters')
        .update(formData)
        .eq('id', editingRecruiter.id);
      
      if (error) {
        alert('Error updating recruiter: ' + error.message);
      } else {
        alert('Recruiter updated successfully!');
        resetForm();
        await fetchRecruiters();
      }
    } else {
      const { error } = await supabase
        .from('recruiters')
        .insert([formData]);
      
      if (error) {
        alert('Error adding recruiter: ' + error.message);
      } else {
        alert('Recruiter added successfully!');
        resetForm();
        await fetchRecruiters();
      }
    }
    setLoading(false);
  }

  async function handleDelete(id) {
    if (!window.confirm('Are you sure you want to delete this recruiter?')) return;
    setLoading(true);
    const { error } = await supabase
      .from('recruiters')
      .delete()
      .eq('id', id);
    
    if (error) {
      alert('Error deleting recruiter: ' + error.message);
    } else {
      alert('Recruiter deleted successfully!');
      await fetchRecruiters();
    }
    setLoading(false);
  }

  function handleEdit(recruiter) {
    setEditingRecruiter(recruiter);
    setFormData({
      name: recruiter.name,
      email: recruiter.email,
      phone: recruiter.phone
    });
    setShowForm(true);
  }

  function resetForm() {
    setFormData({
      name: '',
      email: '',
      phone: ''
    });
    setEditingRecruiter(null);
    setShowForm(false);
  }

  if (loading) {
    return <div className="loading-state">Loading Recruiters...</div>;
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Recruiter Management</h1>
        <button className="btn-primary" onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancel' : '+ Add Recruiter'}
        </button>
      </div>

      {showForm && (
        <div className="form-card">
          <h2>{editingRecruiter ? 'Edit Recruiter' : 'Add New Recruiter'}</h2>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Name *</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                />
              </div>
              <div className="form-group">
                <label>Phone</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                />
              </div>
            </div>

            <button type="submit" className="btn-primary">
              {editingRecruiter ? 'Update Recruiter' : 'Add Recruiter'}
            </button>
          </form>
        </div>
      )}

      <div className="recruiters-grid">
        {recruiters.length === 0 ? (
          <div className="empty-state">
            <h3>No recruiters yet</h3>
            <p>Add your first recruiter to get started.</p>
          </div>
        ) : (
          recruiters.map(recruiter => (
            <div key={recruiter.id} className="recruiter-card">
              <h3>{recruiter.name}</h3>
              <div className="recruiter-info">
                {recruiter.email && <p><strong>Email:</strong> {recruiter.email}</p>}
                {recruiter.phone && <p><strong>Phone:</strong> {recruiter.phone}</p>}
              </div>
              <div className="recruiter-actions">
                <button className="btn-edit" onClick={() => handleEdit(recruiter)}>
                  Edit
                </button>
                <button className="btn-delete" onClick={() => handleDelete(recruiter.id)}>
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

export default Recruiters;