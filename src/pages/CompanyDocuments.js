import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabaseClient';
import { useData } from '../contexts/DataContext';
import { useConfirmation } from '../contexts/ConfirmationContext';
// Removed unused 'motion' import
import { AnimatePresence } from 'framer-motion';
import { Upload, FileText, Trash2, Eye, Download, AlertTriangle, Loader } from 'lucide-react';
import DocumentViewerModal from '../components/DocumentViewerModal';
import '../styles/CompanyDocuments.css';

// Helper function to format dates
const formatDateTime = (dateString) => {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit'
  });
};

// Helper function for filename validation
const isValidFilename = (filename) => {
  // Allow letters, numbers, spaces, dots, hyphens, underscores ONLY
  // Removed unnecessary escape '\' before hyphen
  const validPattern = /^[a-zA-Z0-9 ._-]+$/;
  return validPattern.test(filename);
};

function CompanyDocuments() {
  const { userProfile, recruiters } = useData();
  const { showConfirmation } = useConfirmation();
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [viewingDocument, setViewingDocument] = useState(null);

  // Define bucket name as a constant
  const BUCKET_NAME = 'company-documents';

  const recruiterNameMap = React.useMemo(() => {
    return recruiters.reduce((map, recruiter) => {
      map[recruiter.id] = recruiter.name;
      return map;
    }, {});
  }, [recruiters]);

  const fetchDocuments = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data, error } = await supabase
        .from('company_documents')
        .select('*')
        .order('uploaded_at', { ascending: false });

      if (error) throw error;
      setDocuments(data || []);
    } catch (err) {
      console.error('Error fetching documents:', err);
      setError('Failed to load documents. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (!isValidFilename(file.name)) {
      showConfirmation({
        type: 'error', title: 'Invalid Filename',
        message: `Filename "${file.name}" contains invalid characters.\nPlease use only letters, numbers, spaces, dots (.), hyphens (-), and underscores (_).`,
      });
      event.target.value = null;
      return;
    }

    if (!userProfile) {
      showConfirmation({ type: 'error', title: 'Error', message: 'User profile not found.' });
      return;
    }

    setUploading(true);
    setError('');

    try {
      const timestamp = Date.now();
      const safeFileNameForPath = file.name.replace(/\s+/g, '_');
      const filePath = `${userProfile.id}/${timestamp}_${safeFileNameForPath}`;

      const { error: uploadError } = await supabase.storage
        .from(BUCKET_NAME) // Use constant
        .upload(filePath, file, { cacheControl: '3600', upsert: false });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from(BUCKET_NAME) // Use constant
        .getPublicUrl(filePath);

       // Simplified URL construction for public buckets
       let publicUrl = urlData?.publicUrl;
       if (!publicUrl) {
          console.warn("Could not get public URL automatically, constructing manually.");
          const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
          if (!supabaseUrl) throw new Error("Supabase URL not found for manual URL construction.");
          // Construct the public URL directly for public buckets
          publicUrl = `${supabaseUrl}/storage/v1/object/public/${BUCKET_NAME}/${filePath}`;
       }


      const { error: insertError } = await supabase
        .from('company_documents')
        .insert({
          file_name: file.name,
          file_url: publicUrl, // Use the determined public URL
          file_type: file.type,
          uploaded_by_id: userProfile.id,
        });

      if (insertError) throw insertError;

      showConfirmation({ type: 'success', title: 'Success', message: 'Document uploaded successfully!' });
      fetchDocuments();
    } catch (err) {
      console.error('Error uploading document:', err);
      setError(`Upload failed: ${err.message}`);
      showConfirmation({ type: 'error', title: 'Upload Failed', message: err.message });
    } finally {
      setUploading(false);
      event.target.value = null;
    }
  };

  const handleDeleteDocument = async (doc) => {
    showConfirmation({
      type: 'delete',
      title: 'Delete Document?',
      message: `Are you sure you want to delete "${doc.file_name}"? This action cannot be undone.`,
      onConfirm: async () => {
        setLoading(true);
        setError('');
        try {
          let filePath = '';
          try {
            const urlString = doc.file_url;
            // Correctly parse path from public URL structure
            const pathPrefix = `/storage/v1/object/public/${BUCKET_NAME}/`; // Use constant
            const pathStartIndex = urlString.indexOf(pathPrefix);

            if (pathStartIndex !== -1) {
                filePath = decodeURIComponent(urlString.substring(pathStartIndex + pathPrefix.length));
            } else {
               console.warn("Standard public URL structure not found, attempting alternative parse for path:", urlString);
               const altPrefix = `/${BUCKET_NAME}/`; // Use constant
               const altIndex = urlString.indexOf(altPrefix);
               if (altIndex !== -1) {
                  filePath = decodeURIComponent(urlString.substring(altIndex + altPrefix.length));
               } else {
                  throw new Error("Could not parse file path from URL.");
               }
            }
             console.log("Attempting to delete storage path:", filePath);

          } catch(e) {
             console.error("Error parsing file path for deletion:", e);
             filePath = '';
          }

          const { error: deleteDbError } = await supabase
            .from('company_documents')
            .delete()
            .eq('id', doc.id);

          if (deleteDbError) throw deleteDbError;

          if (filePath) {
              // Check if file exists before trying to remove
              const { data: listData, error: listError} = await supabase.storage
                .from(BUCKET_NAME) // Use constant
                .list(filePath.substring(0, filePath.lastIndexOf('/')), {
                   search: filePath.substring(filePath.lastIndexOf('/') + 1)
                 });

              if (listError) {
                  console.error("Error checking if file exists:", listError);
              } else if (listData && listData.length > 0) {
                  const { error: deleteStorageError } = await supabase.storage
                      .from(BUCKET_NAME) // Use constant
                      .remove([filePath]);

                  if (deleteStorageError) {
                       console.warn(`Storage file deletion failed (path: ${filePath}): ${deleteStorageError.message}`);
                       // Set error state to inform user, but DB record is gone
                       setError(`DB record deleted, but failed to delete file from storage.`);
                  } else {
                       console.log(`Storage file deleted: ${filePath}`);
                  }
              } else {
                 console.warn(`Storage file not found at path: ${filePath}. Skipping storage deletion.`);
              }

          } else {
               console.warn(`Could not delete from storage: file path parsing failed for URL: ${doc.file_url}`);
               setError("DB record deleted, but could not parse file path to remove from storage.");
          }

          // Show success only if no error was set during storage deletion attempt
          if (!error) {
             showConfirmation({ type: 'success', title: 'Deleted', message: `"${doc.file_name}" was deleted.` });
          }
          fetchDocuments(); // Refresh list always
        } catch (err) {
          console.error('Error deleting document:', err);
          setError(`Deletion failed: ${err.message}`); // Overwrite previous errors if DB fails
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

  return (
    <div className="page-container company-documents-container">
      <div className="page-header">
        <h1>Company Documents</h1>
        <p className="subtitle">Manage shared company resources and templates.</p>
      </div>

      <div className="upload-section card">
        <h3><Upload size={20} /> Upload New Document</h3>
        <input
          type="file"
          id="company-doc-upload"
          onChange={handleFileUpload}
          disabled={uploading}
          accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.jpg,.jpeg,.png,.gif"
        />
        <label htmlFor="company-doc-upload" className={`btn btn-primary ${uploading ? 'disabled' : ''}`}>
          {uploading ? <><Loader size={16} className="spin" /> Uploading...</> : 'Choose File'}
        </label>
        <p className="upload-hint">Allowed characters: A-Z, a-z, 0-9, space, dot (.), hyphen (-), underscore (_)</p>
        {/* Display error state here */}
        {error && <p className="error-message"><AlertTriangle size={16} /> {error}</p>}
      </div>

      <div className="document-list-section card">
        <h3><FileText size={20} /> Uploaded Documents</h3>
        {loading && !uploading ? (
          <div className="loading-state">
            <Loader size={24} className="spin" /> Loading documents...
          </div>
        ) : documents.length === 0 ? (
          <p className="empty-state">No company documents have been uploaded yet.</p>
        ) : (
          <div className="table-responsive-wrapper">
            <table className="documents-table">
              <thead>
                <tr>
                  <th>File Name</th>
                  <th>Uploaded At</th>
                  <th>Uploaded By</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {documents.map((doc) => (
                  <tr key={doc.id}>
                    <td className="file-name-cell">
                      <FileText size={16} /> {doc.file_name}
                    </td>
                    <td>{formatDateTime(doc.uploaded_at)}</td>
                    <td>{recruiterNameMap[doc.uploaded_by_id] || 'Unknown User'}</td>
                    <td className="actions-cell">
                      <button className="btn-action view" onClick={() => handleViewDocument(doc)} title="View Document">
                        <Eye size={16} />
                      </button>
                      <a href={doc.file_url} download={doc.file_name} className="btn-action download" title="Download Document" target="_blank" rel="noopener noreferrer">
                        <Download size={16} />
                      </a>
                      <button className="btn-action delete" onClick={() => handleDeleteDocument(doc)} title="Delete Document">
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

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