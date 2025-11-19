import React, { useState } from 'react';
import { X, Upload, Loader } from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { useConfirmation } from '../contexts/ConfirmationContext';

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

const BUCKET_NAME = 'company-documents';

const isValidFilename = (filename) => {
  const validPattern = /^[a-zA-Z0-9 ._-]+$/;
  return validPattern.test(filename);
};

export default function DocumentUploadModal({ isOpen, onClose, userProfile, onUploadSuccess }) {
  const { showConfirmation } = useConfirmation();
  const [file, setFile] = useState(null);
  const [category, setCategory] = useState('');
  const [subCategory, setSubCategory] = useState('');
  const [uploading, setUploading] = useState(false);

  if (!isOpen) return null;

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile && !isValidFilename(selectedFile.name)) {
      showConfirmation({
        type: 'error',
        title: 'Invalid Filename',
        message: `Filename "${selectedFile.name}" contains invalid characters.`,
      });
      e.target.value = null; // Clear the file input
      setFile(null);
      return;
    }
    setFile(selectedFile);
  };

  const handleUpload = async (e) => {
    e.preventDefault();

    if (!file || !category || !subCategory) {
      showConfirmation({ type: 'error', title: 'Missing Information', message: 'Please select a file, a category, and a sub-category.' });
      return;
    }

    if (!userProfile?.id) {
      showConfirmation({ type: 'error', title: 'Error', message: 'User profile not found. Cannot proceed with upload.' });
      return;
    }

    setUploading(true);
    
    try {
      const timestamp = Date.now();
      const safeFileNameForPath = file.name.replace(/\s+/g, '_');
      const filePath = `${userProfile.id}/${timestamp}_${safeFileNameForPath}`;

      // 1. Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(filePath, file, { cacheControl: '3600', upsert: false });

      if (uploadError) throw uploadError;

      // 2. Get the public URL (Simplified since it's a public bucket)
      const supabaseUrl = 'https://ksfxucazcyiitaoytese.supabase.co'; // Replace with your actual Supabase URL base from .env if needed
      const publicUrl = `${supabaseUrl}/storage/v1/object/public/${BUCKET_NAME}/${filePath}`;
      
      // 3. Insert metadata into company_documents table
      const { error: insertError } = await supabase
        .from('company_documents')
        .insert({
          file_name: file.name,
          file_url: publicUrl,
          file_type: file.type,
          uploaded_by_id: userProfile.id,
          category: category,      // NEW FIELD
          sub_category: subCategory // NEW FIELD
        });

      if (insertError) throw insertError;

      showConfirmation({ type: 'success', title: 'Success', message: `"${file.name}" uploaded to ${category} / ${subCategory}.` });
      
      // Reset state and call success callback
      setFile(null);
      setCategory('');
      setSubCategory('');
      onUploadSuccess(); 
      onClose();

    } catch (err) {
      console.error('Error uploading document:', err);
      showConfirmation({ type: 'error', title: 'Upload Failed', message: err.message });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{maxWidth: '550px'}}>
        <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2><Upload size={20} style={{marginRight: '8px'}} /> Upload Company Document</h2>
          <button className="btn-close-modal" onClick={onClose}><X size={24} /></button>
        </div>
        
        <form onSubmit={handleUpload} style={{padding: '20px'}}>
          
          <div className="form-group">
            <label>1. Select Main Category *</label>
            <select
              value={category}
              onChange={(e) => {
                setCategory(e.target.value);
                setSubCategory(''); // Reset sub-category on main change
              }}
              required
            >
              <option value="">-- Select a Category --</option>
              {Object.keys(CATEGORIES).map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>2. Select Sub Category *</label>
            <select
              value={subCategory}
              onChange={(e) => setSubCategory(e.target.value)}
              disabled={!category}
              required
            >
              <option value="">-- Select a Sub-Category --</option>
              {category && CATEGORIES[category].map(subCat => (
                <option key={subCat} value={subCat}>{subCat}</option>
              ))}
            </select>
          </div>
          
          <div className="form-group">
            <label>3. Choose File *</label>
            <input type="file" onChange={handleFileChange} required disabled={uploading} />
            <small style={{color: 'var(--text-muted)'}}>Accepted formats: PDF, DOCX, XLSX, etc.</small>
          </div>
          
          <div className="modal-footer" style={{padding: '0', borderTop: 'none', justifyContent: 'flex-start'}}>
            <button type="submit" className="btn-primary" disabled={uploading || !file || !category || !subCategory}>
              {uploading ? <><Loader size={16} className="spin" /> Uploading...</> : 'Upload Document'}
            </button>
            <button type="button" className="btn-secondary" onClick={onClose} disabled={uploading}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Minimal styles to make the modal look good (reuse classes where possible)
const modalStyles = `
.modal-overlay {
  position: fixed; top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0, 0, 0, 0.75); display: flex; align-items: center;
  justify-content: center; z-index: 1000; backdrop-filter: blur(4px);
}
.modal-content {
  background: var(--card-bg); padding: 30px; border-radius: 12px;
  width: 90%; max-width: 600px; box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
  border: 1px solid var(--border-color); max-height: 90vh; overflow-y: auto;
}
.modal-header h2 { margin: 0; color: var(--rose-gold); font-size: 1.5rem; font-weight: 600;}
.btn-close-modal {
  background: transparent; border: none; color: var(--text-secondary);
  cursor: pointer; padding: 0.5rem; border-radius: 6px; transition: all 0.2s;
}
.btn-close-modal:hover { background: var(--hover-bg); color: var(--rose-gold); }
.form-group label {
  display: block; margin-bottom: 8px; color: var(--text-secondary);
  font-weight: 600; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;
}
.form-group input[type="file"], .form-group select {
  width: 100%; padding: 12px; background: var(--secondary-bg);
  border: 1px solid var(--border-color); border-radius: 8px;
  color: var(--text-primary); font-size: 14px; transition: all 0.2s;
}
.form-group select:focus {
  outline: none; border-color: var(--rose-gold);
  box-shadow: 0 0 0 3px rgba(232, 180, 184, 0.1);
}
.modal-footer button {
  padding: 10px 20px; border-radius: 8px; cursor: pointer; font-weight: 600;
  transition: all 0.3s ease;
}
.btn-primary { 
  background: linear-gradient(135deg, var(--rose-gold), #F39C9C);
  color: var(--main-bg); border: none; box-shadow: 0 4px 12px rgba(232, 180, 184, 0.3);
}
.btn-primary:hover { transform: translateY(-2px); box-shadow: 0 6px 16px rgba(232, 180, 184, 0.5); }
.btn-secondary { background: transparent; color: var(--text-secondary); border: 1px solid var(--border-color); }
.btn-secondary:hover { border-color: var(--rose-gold); color: var(--rose-gold); }
.spin { animation: spin 1s linear infinite; }
@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
`;
// We won't add the style block here as it's cleaner to use existing CSS classes.
// Assuming your existing CSS in src/styles/CompanyDocuments.css or src/styles/App.css
// has styles for .modal-overlay, .modal-content, .btn-primary, .btn-secondary, etc.