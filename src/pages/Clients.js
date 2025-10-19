import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';
import { useConfirmation } from '../contexts/ConfirmationContext';
import '../styles/Clients.css';

function Clients() {
  const { showConfirmation } = useConfirmation();
  const [clients, setClients] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [formData, setFormData] = useState({
    company_name: '',
    contact_name: '',
    email: '',
    phone: ''
  });

  useEffect(() => {
    fetchClients();
  }, []);

  async function fetchClients() {
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching clients:', error);
    } else {
      setClients(data || []);
    }
  }

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
        fetchClients();
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
        fetchClients();
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
          fetchClients();
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
          clients.map(client => (
            <div key={client.id} className="client-card">
              <h3>{client.company_name}</h3>
              <div className="client-info">
                <p><strong>Contact:</strong> {client.contact_name}</p>
                {client.email && <p><strong>Email:</strong> {client.email}</p>}
                {client.phone && <p><strong>Phone:</strong> {client.phone}</p>}
              </div>
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