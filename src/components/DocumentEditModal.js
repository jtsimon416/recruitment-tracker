import React, { useState, useEffect } from 'react';
import { X, Save, Edit, Loader } from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { useConfirmation } from '../contexts/ConfirmationContext';

// Define the hierarchy of categories and sub-categories (Must match the upload modal)
const CATEGORIES = {
  'Internal HR / Policy Documents': [
    'Company Handbooks',
    'Onboarding Checklists (for new recruiters)',
    'Internal Communications / Memos',
    'Employee Benefits Information',
  ],
  'Training & Development Materials': [
    'Recruitment Training Manuals',
    'Software / ATS Guides',
    'Interviewing Best Practices (internal)',
  ],
  'Process & Procedure Guides': [
    'Sourcing Strategies',
    'Candidate Screening Workflows',
    'Client Intake Forms (internal templates)',
    'Offer Letter Templates (internal blank versions)',
    'Background Check Procedures',
    'Reference Check Procedures',
  ],
  'Financial & Billing Documents': [
    'Invoice Templates',
  ],
};

export default function DocumentEditModal({ isOpen, onClose, document, onEditSuccess }) {
  const { showConfirmation } = useConfirmation();
  const [category, setCategory] = useState('');
  const [subCategory, setSubCategory] = useState('');
  const [saving, setSaving] = useState(false);

  // Initialize state with current document values when the modal opens
  useEffect(() => {
    if (document) {
      setCategory(document.category || '');
      setSubCategory(document.sub_category || '');
    }
  }, [document]);

  if (!isOpen || !document) return null;

  const handleSave = async (e) => {
    e.preventDefault();

    if (!category || !subCategory) {
      showConfirmation({ type: 'error', title: 'Missing Information', message: 'Please select both a category and a sub-category.' });
      return;
    }

    setSaving(true);
    
    try {
      // 1. Update the metadata in the company_documents table
      const { error: updateError } = await supabase
        .from('company_documents')
        .update({
          category: category,      
          sub_category: subCategory 
        })
        .eq('id', document.id); // IMPORTANT: Only update the specific document

      if (updateError) throw updateError;

      showConfirmation({ 
          type: 'success', 
          title: 'Success', 
          message: `Category for "${document.file_name}" updated to ${category} / ${subCategory}.` 
      });
      
      onEditSuccess(); 
      onClose();

    } catch (err) {
      console.error('Error updating document category:', err);
      showConfirmation({ type: 'error', title: 'Update Failed', message: err.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{maxWidth: '550px'}}>
        <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2><Edit size={20} style={{marginRight: '8px'}} /> Edit Document Category</h2>
          <button className="btn-close-modal" onClick={onClose}><X size={24} /></button>
        </div>
        
        <form onSubmit={handleSave} style={{padding: '20px'}}>
          
          <p style={{marginBottom: '20px', color: 'var(--text-secondary)'}}>
            File: <strong>{document.file_name}</strong>
          </p>

          <div className="form-group">
            <label>New Main Category *</label>
            <select
              value={category}
              onChange={(e) => {
                setCategory(e.target.value);
                setSubCategory(''); // Reset sub-category on main change
              }}
              required
              disabled={saving}
            >
              <option value="">-- Select a Category --</option>
              {Object.keys(CATEGORIES).map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>New Sub Category *</label>
            <select
              value={subCategory}
              onChange={(e) => setSubCategory(e.target.value)}
              disabled={!category || saving}
              required
            >
              <option value="">-- Select a Sub-Category --</option>
              {category && CATEGORIES[category] && CATEGORIES[category].map(subCat => (
                <option key={subCat} value={subCat}>{subCat}</option>
              ))}
            </select>
          </div>
          
          <div className="modal-footer" style={{padding: '0', borderTop: 'none', justifyContent: 'flex-start'}}>
            <button 
                type="submit" 
                className="btn-primary" 
                disabled={saving || !category || !subCategory}
            >
              {saving ? <><Loader size={16} className="spin" /> Saving...</> : <><Save size={16} /> Save Changes</>}
            </button>
            <button type="button" className="btn-secondary" onClick={onClose} disabled={saving}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}