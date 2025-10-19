import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../services/supabaseClient';
import { motion } from 'framer-motion';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { useData } from '../contexts/DataContext';
import { useConfirmation } from '../contexts/ConfirmationContext';
import '../styles/Positions.css';

// TipTap Editor Component (unchanged)
const RichTextEditor = ({ value, onChange }) => {
  const editor = useEditor({
    extensions: [StarterKit],
    content: value || '',
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  return (
    <div className="tiptap-editor-wrapper">
      <div className="tiptap-toolbar">
        <button type="button" onClick={() => editor.chain().focus().toggleBold().run()} className={editor?.isActive('bold') ? 'is-active' : ''}><strong>B</strong></button>
        <button type="button" onClick={() => editor.chain().focus().toggleItalic().run()} className={editor?.isActive('italic') ? 'is-active' : ''}><em>I</em></button>
        <button type="button" onClick={() => editor.chain().focus().toggleBulletList().run()} className={editor?.isActive('bulletList') ? 'is-active' : ''}>• List</button>
        <button type="button" onClick={() => editor.chain().focus().toggleOrderedList().run()} className={editor?.isActive('orderedList') ? 'is-active' : ''}>1. List</button>
        <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} className={editor?.isActive('heading', { level: 2 }) ? 'is-active' : ''}>H2</button>
        <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} className={editor?.isActive('heading', { level: 3 }) ? 'is-active' : ''}>H3</button>
      </div>
      <EditorContent editor={editor} className="tiptap-editor-content" />
    </div>
  );
};

function Positions() {
  const { showConfirmation } = useConfirmation();
  const [positions, setPositions] = useState([]);
  const [positionsWithStats, setPositionsWithStats] = useState([]);
  const [clients, setClients] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingPosition, setEditingPosition] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [expandedRow, setExpandedRow] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sortConfig, setSortConfig] = useState({ key: 'title', direction: 'ascending' });

  const { refreshData } = useData();

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
    const { data, error } = await supabase.from('positions').select('*, clients(company_name)').order('created_at', { ascending: false });
    if (error) console.error('Error fetching positions:', error);
    else setPositions(data || []);
  }

  async function fetchClients() {
    const { data, error } = await supabase.from('clients').select('*').order('company_name');
    if (error) console.error('Error fetching clients:', error);
    else setClients(data || []);
  }

  async function calculatePositionStats() {
    const enrichedPositions = await Promise.all(
      positions.map(async (position) => {
        const { data: pipelineData } = await supabase.from('pipeline').select('*').eq('position_id', position.id);
        const totalCandidates = pipelineData?.length || 0;
        const activeCandidates = pipelineData?.filter(p => p.status === 'Active').length || 0;
        const submittedCount = pipelineData?.filter(p => p.stage === 'Submit to Client').length || 0;
        const interviewCounts = {
          interview1: pipelineData?.filter(p => p.stage === 'Interview 1').length || 0,
          interview2: pipelineData?.filter(p => p.stage === 'Interview 2').length || 0,
          interview3: pipelineData?.filter(p => p.stage === 'Interview 3').length || 0,
          offer: pipelineData?.filter(p => p.stage === 'Offer').length || 0,
          hired: pipelineData?.filter(p => p.stage === 'Hired').length || 0
        };
        const totalInterviews = interviewCounts.interview1 + interviewCounts.interview2 + interviewCounts.interview3;
        let healthStatus = 'Healthy', priorityClass = 'priority-green';
        if (submittedCount === 0 && position.status === 'Open') { healthStatus = 'NEEDS SOURCING'; priorityClass = 'priority-red'; }
        else if (submittedCount < 8 && position.status === 'Open') { healthStatus = 'NEEDS SOURCING'; priorityClass = 'priority-orange'; }
        else if (interviewCounts.offer > 0 || interviewCounts.hired > 0) { healthStatus = 'PIPELINE HEALTHY'; priorityClass = 'priority-green'; }
        return { ...position, totalCandidates, activeCandidates, submittedCount, interviewCounts, totalInterviews, healthStatus, priorityClass };
      })
    );
    setPositionsWithStats(enrichedPositions);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    if (editingPosition) {
      const { error } = await supabase.from('positions').update(formData).eq('id', editingPosition.id);
      if (error) {
        showConfirmation({
          type: 'error',
          title: 'Error',
          message: `Error updating position: ${error.message}`,
          confirmText: 'OK',
          cancelText: null,
          onConfirm: () => {}
        });
      } else {
        showConfirmation({
          type: 'success',
          title: 'Success!',
          message: 'Position updated successfully!',
          confirmText: 'OK',
          cancelText: null,
          onConfirm: () => {}
        });
        resetForm();
        await fetchPositions();
        await refreshData();
      }
    } else {
      const { error } = await supabase.from('positions').insert([formData]);
      if (error) {
        showConfirmation({
          type: 'error',
          title: 'Error',
          message: `Error adding position: ${error.message}`,
          confirmText: 'OK',
          cancelText: null,
          onConfirm: () => {}
        });
      } else {
        showConfirmation({
          type: 'success',
          title: 'Success!',
          message: 'Position added successfully!',
          confirmText: 'OK',
          cancelText: null,
          onConfirm: () => {}
        });
        resetForm();
        await fetchPositions();
        await refreshData();
      }
    }
    setLoading(false);
  }

  async function handleDelete(id) {
    const position = positions.find(p => p.id === id);
    const positionTitle = position?.title || 'this position';

    showConfirmation({
      type: 'delete',
      title: 'Delete Position?',
      message: 'This action cannot be undone. This will also remove all associated pipeline entries and interviews.',
      contextInfo: `Deleting: ${positionTitle}`,
      confirmText: 'Delete',
      cancelText: 'Keep',
      onConfirm: async () => {
        setLoading(true);
        await supabase.from('pipeline').delete().eq('position_id', id);
        await supabase.from('interviews').delete().eq('position_id', id);
        const { error } = await supabase.from('positions').delete().eq('id', id);
        if (error) {
          showConfirmation({
            type: 'error',
            title: 'Error',
            message: `Error deleting position: ${error.message}`,
            confirmText: 'OK',
            cancelText: null,
            onConfirm: () => {}
          });
        } else {
          showConfirmation({
            type: 'success',
            title: 'Success!',
            message: 'Position deleted successfully!',
            confirmText: 'OK',
            cancelText: null,
            onConfirm: () => {}
          });
          await fetchPositions();
          await refreshData();
        }
        setLoading(false);
      }
    });
  }

  function handleEdit(position) {
    setEditingPosition(position);
    setFormData({ client_id: position.client_id, title: position.title, status: position.status, description: position.description || '', salary_range: position.salary_range || '' });
    setShowForm(true);
  }

  function resetForm() {
    setFormData({ client_id: '', title: '', status: 'Open', description: '', salary_range: '' });
    setEditingPosition(null);
    setShowForm(false);
  }

  const sortedPositions = useMemo(() => {
    let filtered = statusFilter === 'all' ? positionsWithStats : positionsWithStats.filter(p => p.status === statusFilter);
    if (sortConfig.key) {
      filtered.sort((a, b) => {
        let aValue = a[sortConfig.key], bValue = b[sortConfig.key];
        if (sortConfig.key === 'clients.company_name') { aValue = a.clients?.company_name || ''; bValue = b.clients?.company_name || ''; }
        if (aValue < bValue) return sortConfig.direction === 'ascending' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'ascending' ? 1 : -1;
        return 0;
      });
    }
    return filtered;
  }, [positionsWithStats, statusFilter, sortConfig]);

  const requestSort = (key) => {
    let direction = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') direction = 'descending';
    setSortConfig({ key, direction });
  };

  const getSortIndicator = (key) => {
    if (sortConfig.key !== key) return null;
    return sortConfig.direction === 'ascending' ? <ChevronUp size={16} /> : <ChevronDown size={16} />;
  };

  return (
    <div className="page-container">
      <motion.div className="page-header" initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <h1>Position Management</h1>
        <button className="btn-primary" onClick={() => setShowForm(!showForm)}>{showForm ? 'Cancel' : '+ Add Position'}</button>
      </motion.div>
      {showForm && (
        <motion.div className="form-card" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
          <h2>{editingPosition ? 'Edit Position' : 'Add New Position'}</h2>
          <form onSubmit={handleSubmit}>
            <div className="form-row">
              <div className="form-group"><label>Client *</label><select required value={formData.client_id} onChange={(e) => setFormData({...formData, client_id: e.target.value})}><option value="">Select client...</option>{clients.map(client => (<option key={client.id} value={client.id}>{client.company_name}</option>))}</select></div>
              <div className="form-group"><label>Position Title *</label><input type="text" required value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})} /></div>
            </div>
            <div className="form-row">
              <div className="form-group"><label>Status</label><select value={formData.status} onChange={(e) => setFormData({...formData, status: e.target.value})}><option>Open</option><option>Closed</option></select></div>
              <div className="form-group"><label>Salary Range</label><input type="text" placeholder="e.g., $80,000 - $100,000" value={formData.salary_range} onChange={(e) => setFormData({...formData, salary_range: e.target.value})} /></div>
            </div>
            <div className="form-group"><label>Job Description</label><RichTextEditor value={formData.description} onChange={(value) => setFormData({...formData, description: value})} /></div>
            <button type="submit" className="btn-primary">{editingPosition ? 'Update Position' : 'Add Position'}</button>
          </form>
        </motion.div>
      )}
      <div className="filter-bar"><select className="filter-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}><option value="all">All Statuses</option><option value="Open">Open</option><option value="Closed">Closed</option></select></div>
      {sortedPositions.length === 0 ? (<div className="empty-state"><h3>No positions yet</h3><p>Add your first position to get started.</p></div>) : (
        <div className="positions-table-container">
          <div className="positions-table-header">
            <div className="col-title" onClick={() => requestSort('title')}>Position {getSortIndicator('title')}</div>
            <div className="col-client" onClick={() => requestSort('clients.company_name')}>Client {getSortIndicator('clients.company_name')}</div>
            <div className="col-status" onClick={() => requestSort('status')}>Status {getSortIndicator('status')}</div>
            <div className="col-health" onClick={() => requestSort('healthStatus')}>Health {getSortIndicator('healthStatus')}</div>
            <div className="col-total">Total</div>
            <div className="col-active">Active</div>
            <div className="col-submitted">Submitted</div>
            <div className="col-interviews">Interviews</div>
            <div className="col-offers">Offers</div>
            <div className="col-hired">Hired</div>
            <div className="col-actions">Actions</div>
          </div>
          <div className="positions-table-body">
            {sortedPositions.map((position) => (
              <React.Fragment key={position.id}>
                <motion.div className={`position-row ${expandedRow === position.id ? 'expanded' : ''} ${position.priorityClass}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
                  <div className="col-title"><strong>{position.title}</strong>{position.salary_range && <span className="salary-range">{position.salary_range}</span>}</div>
                  <div className="col-client">{position.clients?.company_name || 'N/A'}</div>
                  <div className="col-status"><span className={`status-badge ${position.status.toLowerCase()}`}>{position.status}</span></div>
                  <div className="col-health"><span className={`health-badge ${position.priorityClass}`}>{position.healthStatus}</span></div>
                  <div className="col-total metric-value">{position.totalCandidates}</div>
                  <div className="col-active metric-value">{position.activeCandidates}</div>
                  <div className="col-submitted metric-value">{position.submittedCount}</div>
                  <div className="col-interviews metric-value">{position.totalInterviews}</div>
                  <div className="col-offers metric-value">{position.interviewCounts.offer}</div>
                  <div className="col-hired metric-value">{position.interviewCounts.hired}</div>
                  <div className="col-actions">
                    <button className="btn-expand" onClick={() => setExpandedRow(expandedRow === position.id ? null : position.id)}>{expandedRow === position.id ? <ChevronUp size={18} /> : <ChevronDown size={18} />}</button>
                    <button className="btn-edit" onClick={() => handleEdit(position)}>Edit</button>
                    <button className="btn-delete" onClick={() => handleDelete(position.id)}>Delete</button>
                  </div>
                </motion.div>
                {expandedRow === position.id && (
                  <motion.div className="position-expanded-content" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}>
                    <div className="expanded-section"><h4>Job Description</h4><div className="job-description-content" dangerouslySetInnerHTML={{ __html: position.description || 'No description provided.' }} /></div>
                    <div className="expanded-section"><h4>Detailed Breakdown</h4><div className="breakdown-grid"><div className="breakdown-item"><span className="breakdown-label">Interview 1:</span><span className="breakdown-value">{position.interviewCounts.interview1}</span></div><div className="breakdown-item"><span className="breakdown-label">Interview 2:</span><span className="breakdown-value">{position.interviewCounts.interview2}</span></div><div className="breakdown-item"><span className="breakdown-label">Interview 3:</span><span className="breakdown-value">{position.interviewCounts.interview3}</span></div></div></div>
                  </motion.div>
                )}
              </React.Fragment>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default Positions;