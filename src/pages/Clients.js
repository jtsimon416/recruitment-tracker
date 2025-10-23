import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../services/supabaseClient';
import { useConfirmation } from '../contexts/ConfirmationContext';
import '../styles/Clients.css';
import { Activity, Briefcase, Target } from 'lucide-react'; // Add this line

function Clients() {
  const { showConfirmation } = useConfirmation();
  const [clients, setClients] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  // --- ADD THESE NEW STATE VARIABLES ---
  const [loading, setLoading] = useState(true);
  const [positions, setPositions] = useState([]);
  const [pipeline, setPipeline] = useState([]);
  // --- END NEW STATE ---
  const [formData, setFormData] = useState({
    company_name: '',
    contact_name: '',
    email: '',
    phone: ''
  });

  useEffect(() => {
    fetchAllClientData();
  }, []);

  async function fetchAllClientData() {
    setLoading(true);
    try {
      // Fetch all data in parallel
      const [clientRes, positionRes, pipelineRes] = await Promise.all([
        supabase.from('clients').select('*').order('company_name', { ascending: true }),
        supabase.from('positions').select('client_id, status'),
        supabase.from('pipeline').select('positions(client_id), stage, status')
      ]);

      if (clientRes.error) throw clientRes.error;
      if (positionRes.error) throw positionRes.error;
      if (pipelineRes.error) throw pipelineRes.error;

      setClients(clientRes.data || []);
      setPositions(positionRes.data || []);
      setPipeline(pipelineRes.data || []);

    } catch (error) {
      console.error('Error fetching client data:', error);
      showConfirmation({
        type: 'error',
        title: 'Error',
        message: `Failed to load client data: ${error.message}`,
        confirmText: 'OK'
      });
    } finally {
      setLoading(false);
    }
  }

  const clientsWithStats = useMemo(() => {
    return clients.map(client => {
      // 1. Calculate Open Positions
      const openPositions = positions.filter(p => 
        p.client_id === client.id && p.status === 'Open'
      ).length;

      // 2. Calculate Total Hires
      const totalHires = pipeline.filter(p => 
        p.positions?.client_id === client.id && p.stage === 'Hired'
      ).length;

      // 3. Calculate Active Candidates
      const activeCandidates = pipeline.filter(p => 
        p.positions?.client_id === client.id && p.status === 'Active'
      ).length;

      return {
        ...client,
        stats: {
          openPositions,
          totalHires,
          activeCandidates
        }
      };
    });
  }, [clients, positions, pipeline]);
  async function handleSubmit(e) {
    e.preventDefault();

    if (editingClient) {
      const { error } = await supabase
        .from('clients')
        .update(formData)
        .eq('id', editingClient.id);

      if (error) {
        showConfirmation({
          type: 'error',
          title: 'Error',
          message: `Error updating client: ${error.message}`,
          confirmText: 'OK',
          cancelText: null,
          onConfirm: () => {}
        });
      } else {
        showConfirmation({
          type: 'success',
          title: 'Success!',
          message: 'Client updated successfully!',
          confirmText: 'OK',
          cancelText: null,
          onConfirm: () => {}
        });
        resetForm();
        fetchAllClientData();
      }
    } else {
      const { error } = await supabase
        .from('clients')
        .insert([formData]);

      if (error) {
        showConfirmation({
          type: 'error',
          title: 'Error',
          message: `Error adding client: ${error.message}`,
          confirmText: 'OK',
          cancelText: null,
          onConfirm: () => {}
        });
      } else {
        showConfirmation({
          type: 'success',
          title: 'Success!',
          message: 'Client added successfully!',
          confirmText: 'OK',
          cancelText: null,
          onConfirm: () => {}
        });
        resetForm();
        fetchAllClientData();
      }
    }
  }

  async function handleDelete(id) {
    const client = clients.find(c => c.id === id);
    const clientName = client?.company_name || 'this client';

    showConfirmation({
      type: 'delete',
      title: 'Delete Client?',
      message: 'This action cannot be undone. The client will be permanently removed.',
      contextInfo: `Deleting: ${clientName}`,
      confirmText: 'Delete',
      cancelText: 'Keep',
      onConfirm: async () => {
        const { error } = await supabase
          .from('clients')
          .delete()
          .eq('id', id);

        if (error) {
          showConfirmation({
            type: 'error',
            title: 'Error',
            message: `Error deleting client: ${error.message}`,
            confirmText: 'OK',
            cancelText: null,
            onConfirm: () => {}
          });
        } else {
          showConfirmation({
            type: 'success',
            title: 'Success!',
            message: 'Client deleted successfully!',
            confirmText: 'OK',
            cancelText: null,
            onConfirm: () => {}
          });
          fetchAllClientData();
        }
      }
    });
  }

  function handleEdit(client) {
    setEditingClient(client);
    setFormData({
      company_name: client.company_name,
      contact_name: client.contact_name,
      email: client.email,
      phone: client.phone
    });
    setShowForm(true);
  }

  function resetForm() {
    setFormData({
      company_name: '',
      contact_name: '',
      email: '',
      phone: ''
    });
    setEditingClient(null);
    setShowForm(false);
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Client Management</h1>
        <button className="btn-primary" onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancel' : '+ Add Client'}
        </button>
      </div>

      {showForm && (
        <div className="form-card">
          <h2>{editingClient ? 'Edit Client' : 'Add New Client'}</h2>
          <form onSubmit={handleSubmit}>
            <div className="form-row">
              <div className="form-group">
                <label>Company Name *</label>
                <input
                  type="text"
                  required
                  value={formData.company_name}
                  onChange={(e) => setFormData({...formData, company_name: e.target.value})}
                />
              </div>
              <div className="form-group">
                <label>Contact Name *</label>
                <input
                  type="text"
                  required
                  value={formData.contact_name}
                  onChange={(e) => setFormData({...formData, contact_name: e.target.value})}
                />
              </div>
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
              {editingClient ? 'Update Client' : 'Add Client'}
            </button>
          </form>
        </div>
      )}

      <div className="clients-grid">
        {clients.length === 0 ? (
          <div className="empty-state">
            <h3>No clients yet</h3>
            <p>Add your first client to get started.</p>
          </div>
        ) : (
          clientsWithStats.map(client => (
            <div key={client.id} className="client-card">
              <h3>{client.company_name}</h3>
              <div className="client-info">
                <p><strong>Contact:</strong> {client.contact_name}</p>
                {client.email && <p><strong>Email:</strong> {client.email}</p>}
                {client.phone && <p><strong>Phone:</strong> {client.phone}</p>}
              </div>
              
              {/* --- NEW STATS BLOCK --- */}
              <div className="client-stats">
                <div className="stat-item">
                  <Briefcase size={18} />
                  <span className="stat-value">{client.stats.openPositions}</span>
                  <span className="stat-label">Open Role{client.stats.openPositions !== 1 ? 's' : ''}</span>
                </div>
                <div className="stat-item">
                  <Activity size={18} />
                  <span className="stat-value">{client.stats.activeCandidates}</span>
                  <span className="stat-label">Active</span>
                </div>
                <div className="stat-item">
                  <Target size={18} />
                  <span className="stat-value">{client.stats.totalHires}</span>
                  <span className="stat-label">Hire{client.stats.totalHires !== 1 ? 's' : ''}</span>
                </div>
              </div>
              {/* --- END STATS BLOCK --- */}

              <div className="client-actions">
                <button className="btn-edit" onClick={() => handleEdit(client)}>
                  Edit
                </button>
                <button className="btn-delete" onClick={() => handleDelete(client.id)}>
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

export default Clients;