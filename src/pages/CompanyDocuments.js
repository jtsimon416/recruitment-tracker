import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../services/supabaseClient';
import { useData } from '../contexts/DataContext';
import { useConfirmation } from '../contexts/ConfirmationContext';
import { AnimatePresence } from 'framer-motion';
import { Upload, FileText, Trash2, Eye, Download, Loader, Filter, XCircle, Edit } from 'lucide-react'; 
import DocumentViewerModal from '../components/DocumentViewerModal';
import DocumentUploadModal from '../components/DocumentUploadModal'; 
import DocumentEditModal from '../components/DocumentEditModal'; // NEW IMPORT
import '../styles/CompanyDocuments.css';

// --- Replicating CATEGORIES structure for filtering UI ---
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
const ALL_CATEGORIES = Object.keys(CATEGORIES);

// Helper function to format dates 
const formatDateTime = (dateString) => {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit'
  });
};


function CompanyDocuments() {
  const { userProfile, recruiters } = useData();
  const { showConfirmation } = useConfirmation();
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewingDocument, setViewingDocument] = useState(null);
  
  const [showUploadModal, setShowUploadModal] = useState(false); 
  
  const [editingDocument, setEditingDocument] = useState(null); // NEW STATE for editing modal
  
  // States for Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [subCategoryFilter, setSubCategoryFilter] = useState('all');
  
  // Define bucket name as a constant
  const BUCKET_NAME = 'company-documents';

  // Memoized map of recruiter IDs to names
  const recruiterNameMap = useMemo(() => {
    return recruiters.reduce((map, recruiter) => {
      map[recruiter.id] = recruiter.name;
      return map;
    }, {});
  }, [recruiters]);

  // Fetch documents function
  const fetchDocuments = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('company_documents')
        .select('*')
        .order('uploaded_at', { ascending: false });

      if (error) throw error;
      setDocuments(data || []);
    } catch (err) {
      console.error('Error fetching documents:', err);
      showConfirmation({ type: 'error', title: 'Error', message: 'Failed to load documents. Please try again.' });
    } finally {
      setLoading(false);
    }
  }, [showConfirmation]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);


  const handleClearFilters = () => {
    setSearchTerm('');
    setCategoryFilter('all');
    setSubCategoryFilter('all');
  };

  // Filtering Logic
  const filteredDocuments = useMemo(() => {
    let result = documents;

    if (categoryFilter !== 'all') {
      result = result.filter(doc => doc.category === categoryFilter);
    }

    if (subCategoryFilter !== 'all') {
      result = result.filter(doc => doc.sub_category === subCategoryFilter);
    }

    if (searchTerm) {
      const query = searchTerm.toLowerCase();
      result = result.filter(doc =>
        (doc.file_name || '').toLowerCase().includes(query) ||
        (doc.category || '').toLowerCase().includes(query) ||
        (doc.sub_category || '').toLowerCase().includes(query) ||
        (doc.uploaded_by_id && recruiterNameMap[doc.uploaded_by_id] || '').toLowerCase().includes(query)
      );
    }
    return result;
  }, [documents, categoryFilter, subCategoryFilter, searchTerm, recruiterNameMap]);


  const handleDeleteDocument = async (doc) => {
    showConfirmation({
      type: 'delete',
      title: 'Delete Document?',
      message: `Are you sure you want to delete "${doc.file_name}"? This action cannot be undone.`,
      contextInfo: `Category: ${doc.category || 'N/A'} / ${doc.sub_category || 'N/A'}`,
      confirmText: 'Delete',
      cancelText: 'Keep',
      onConfirm: async () => {
        setLoading(true);
        try {
          const { error: deleteDbError } = await supabase
            .from('company_documents')
            .delete()
            .eq('id', doc.id);
          
          if (deleteDbError) throw deleteDbError;
          
          showConfirmation({ type: 'success', title: 'Deleted', message: `"${doc.file_name}" was deleted.` });
          fetchDocuments(); 
        } catch (err) {
          console.error('Error deleting document:', err);
          showConfirmation({ type: 'error', title: 'Deletion Failed', message: err.message });
        } finally {
          setLoading(false);
        }
      },
    });
  };

  const handleViewDocument = (doc) => {
    if (doc.file_name.toLowerCase().endsWith('.docx')) {
      setViewingDocument({ url: doc.file_url, title: doc.file_name });
    } else {
      window.open(doc.file_url, '_blank', 'noopener,noreferrer');
    }
  };
  
  const handleEditDocument = (doc) => { // NEW function to open edit modal
    setEditingDocument(doc);
  };
  
  const handleCategoryChange = (e) => {
    setCategoryFilter(e.target.value);
    setSubCategoryFilter('all'); 
  };

  const isFilterActive = searchTerm || categoryFilter !== 'all' || subCategoryFilter !== 'all';
  
  return (
    <div className="page-container company-documents-container">
      <div className="page-header">
        <h1>Company Documents</h1>
        <button className="btn-primary" onClick={() => setShowUploadModal(true)}>
          <Upload size={16} style={{marginRight: '8px'}} />
          Upload Document
        </button>
      </div>

      {/* --- FILTER BAR --- */}
      <div className="card" style={{padding: '1.5rem', marginBottom: '2rem'}}>
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem'}}>
            <h3><Filter size={20} /> Filter Documents</h3>
            <button 
                className="btn-secondary" 
                onClick={handleClearFilters}
                disabled={!isFilterActive}
                style={{
                    padding: '8px 16px', 
                    fontSize: '14px',
                    opacity: isFilterActive ? 1 : 0.5,
                }}
            >
                <XCircle size={16} style={{marginRight: '6px'}} /> Reset Filters
            </button>
        </div>

        <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr 2fr', gap: '20px'}}>
          
          {/* Main Category Filter */}
          <div className="form-group" style={{marginBottom: '0'}}>
            <label>Category</label>
            <select className="filter-select" value={categoryFilter} onChange={handleCategoryChange}>
              <option value="all">All Categories</option>
              {ALL_CATEGORIES.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
          
          {/* Sub Category Filter */}
          <div className="form-group" style={{marginBottom: '0'}}>
            <label>Sub-Category</label>
            <select className="filter-select" 
                    value={subCategoryFilter} 
                    onChange={(e) => setSubCategoryFilter(e.target.value)}
                    disabled={categoryFilter === 'all'}
            >
              <option value="all">All Sub-Categories</option>
              {categoryFilter !== 'all' && CATEGORIES[categoryFilter] && CATEGORIES[categoryFilter].map(subCat => (
                <option key={subCat} value={subCat}>{subCat}</option>
              ))}
            </select>
          </div>
          
          {/* Search Bar */}
          <div className="form-group" style={{marginBottom: '0'}}>
            <label>Search by Name/Category/Uploader</label>
             <input
              type="text"
              className="filter-search-input"
              placeholder="Type to search all fields..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>
      {/* --- END: FILTER BAR --- */}
      
      <div className="document-list-section card">
        <h3><FileText size={20} /> Uploaded Documents ({filteredDocuments.length})</h3>
        {loading ? (
          <div className="loading-state">
            <Loader size={24} className="spin" /> Loading documents...
          </div>
        ) : filteredDocuments.length === 0 ? (
          <p className="empty-state">No company documents match the current filters.</p>
        ) : (
          <div className="table-responsive-wrapper">
            <table className="documents-table">
              <thead>
                <tr>
                  <th style={{width: '30%'}}>File Name</th>
                  <th style={{width: '20%'}}>Category</th>
                  <th style={{width: '20%'}}>Sub-Category</th>
                  <th style={{width: '15%'}}>Uploaded At</th>
                  <th style={{width: '15%'}}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredDocuments.map((doc) => (
                  <tr key={doc.id}>
                    <td className="file-name-cell">
                      <FileText size={16} /> {doc.file_name}
                    </td>
                    <td>{doc.category || 'N/A'}</td>
                    <td>{doc.sub_category || 'N/A'}</td>
                    
                    <td>{formatDateTime(doc.uploaded_at)}</td>
                    <td className="actions-cell">
                        {/* NEW: Edit/Move Button */}
                        <button className="btn-action edit" onClick={() => handleEditDocument(doc)} title="Change Folder/Category">
                            <Edit size={16} />
                        </button>
                        
                        <button className="btn-action view" onClick={() => handleViewDocument(doc)} title="View Document">
                            <Eye size={16} />
                        </button>
                        <a href={doc.file_url} download={doc.file_name} className="btn-action download" title="Download Document" target="_blank" rel="noopener noreferrer">
                            <Download size={16} />
                        </a>
                        {userProfile?.id === doc.uploaded_by_id && (
                            <button className="btn-action delete" onClick={() => handleDeleteDocument(doc)} title="Delete Document">
                                <Trash2 size={16} />
                            </button>
                        )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Document Upload Modal */}
      <AnimatePresence>
        {showUploadModal && (
          <DocumentUploadModal
            isOpen={showUploadModal}
            onClose={() => setShowUploadModal(false)}
            userProfile={userProfile}
            onUploadSuccess={fetchDocuments} 
          />
        )}
      </AnimatePresence>
      
      {/* NEW: Document Edit/Move Modal */}
      <AnimatePresence>
        {editingDocument && (
          <DocumentEditModal
            isOpen={!!editingDocument}
            onClose={() => setEditingDocument(null)}
            document={editingDocument}
            onEditSuccess={fetchDocuments} // Refresh list after edit
          />
        )}
      </AnimatePresence>

      {/* Document Viewer Modal */}
      <AnimatePresence>
        {viewingDocument && (
          <DocumentViewerModal
            documentUrl={viewingDocument.url}
            documentTitle={viewingDocument.title}
            onClose={() => setViewingDocument(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

export default CompanyDocuments;