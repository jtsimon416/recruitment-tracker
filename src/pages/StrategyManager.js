import React, { useState, useEffect, useCallback } from 'react';
import { useData } from '../contexts/DataContext';
import { useConfirmation } from '../contexts/ConfirmationContext';
import { supabase } from '../services/supabaseClient';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText, Trash2, Eye, Calendar, BarChart, Upload, Users, AlertTriangle,
  ChevronDown, ChevronUp // Import Chevrons for toggle
} from 'lucide-react';
import DocumentViewerModal from '../components/DocumentViewerModal';
import '../styles/Dashboard.css'; // Re-using styles for consistency
import '../styles/RecruiterOutreach.css'; // Re-using styles for cards

// ===================================
// UTILITY: Format Date/Time
// ===================================
const formatDateTime = (dateString) => {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  });
};

// ===================================
// UTILITY: Validate Filename
// ===================================
const isValidFilename = (filename) => {
  // Allow letters, numbers, spaces, dots, hyphens, underscores
  // Disallow anything else
  const validPattern = /^[a-zA-Z0-9 ._\-]+$/;
  return validPattern.test(filename);
};

// ===================================
// COMPONENT: Role Instruction Card
// ===================================
const RoleInstructionCard = ({
  position,
  instructions,
  recruiters,
  uploadingFile,
  onUpload,
  onRemove,
  onPreview,
  // NEW PROPS for collapsible state
  expandedCardId,
  setExpandedCardId,
  showConfirmation
}) => {
  const documents = instructions || [];
  // Check if THIS card is the one that should be expanded
  const isExpanded = expandedCardId === position.id;

  // NEW: Function to toggle this card
  const toggleExpand = () => {
    // If it's already expanded, set to null (close it)
    // Otherwise, set this card's ID as the expanded one
    setExpandedCardId(isExpanded ? null : position.id);
  };

  return (
    <motion.div
      key={position.id}
      className="active-role-card" // Re-using style from RecruiterOutreach.css
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      style={{ marginBottom: '1.5rem' }}
      layout // Add layout prop for smooth animation
    >
      {/* NEW: Make header clickable to toggle */}
      <div
        className="active-role-header"
        onClick={toggleExpand}
        style={{
          cursor: 'pointer',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          userSelect: 'none' // Prevent text selection on click
        }}
      >
        <div>
          <h3 className="active-role-title">
            {position.title}
          </h3>
          <p className="active-role-company">
            @ {position.clients?.company_name || 'N/A'}
          </p>
          <div style={{ marginTop: '0.5rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
            Status: {position.status}
          </div>
        </div>
        {/* NEW: Chevron Icon indicates state */}
        <div style={{ color: 'var(--rose-gold)' }}>
          {isExpanded ? <ChevronUp size={24} /> : <ChevronDown size={24} />}
        </div>
      </div>

      {/* NEW: Collapsible Content Area */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0, overflow: 'hidden' }}
            animate={{ height: 'auto', opacity: 1, overflow: 'visible' }}
            exit={{ height: 0, opacity: 0, overflow: 'hidden' }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
          >
            {/* This is the content that was previously always visible */}
            <div style={{ paddingTop: '1.5rem', borderTop: '1px solid var(--border-color)', marginTop: '1rem' }}>
              {/* Upload New Instructions */}
              <div style={{
                padding: '1rem',
                background: 'rgba(232, 180, 184, 0.1)',
                borderRadius: '8px',
                border: '1px solid var(--rose-gold)'
              }}>
                <h4 style={{
                  color: 'var(--rose-gold)',
                  marginBottom: '0.75rem',
                  fontSize: '1rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}>
                  <Upload size={18} />
                  Upload New Role Instructions:
                </h4>
                <input
                  type="file"
                  accept=".docx,.doc"
                  id={`instructions-new-${position.id}`}
                  style={{ marginBottom: '0.75rem', width: '100%', color: 'var(--text-secondary)' }}
                  onChange={(e) => {
                    const file = e.target.files[0];
                    if (file) {
                      if (!isValidFilename(file.name)) {
                        showConfirmation({
                          type: 'warning',
                          title: 'Invalid Filename',
                          message: 'Please rename the file before uploading.\n\nFilenames can only contain letters (A-Z, a-z), numbers (0-9), spaces, dots (.), hyphens (-), and underscores (_).\n\nRemove any special characters (like $, %, &, (, ), –, etc.).'
                        });
                        e.target.value = null;
                        return;
                      }

                      const notes = prompt('Optional notes for these instructions:');
                      if (notes !== null) {
                        onUpload(position.id, file, notes || '');
                      } else {
                        console.log('Upload cancelled by user at notes prompt.');
                      }
                    }
                    if (e.target) e.target.value = null;
                  }}
                  disabled={uploadingFile === position.id}
                />
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  Accepted formats: .docx, .doc
                </div>
                {uploadingFile === position.id && (
                  <div style={{ marginTop: '0.5rem', color: 'var(--accent-blue)' }}>
                    Uploading...
                  </div>
                )}
              </div>

              {/* Uploaded Documents List */}
              <div style={{ marginTop: '1.5rem' }}>
                <h3 style={{ color: 'var(--rose-gold)', marginBottom: '1rem' }}>
                  Uploaded Documents ({documents.length}):
                </h3>

                {documents.length === 0 ? (
                  <div style={{
                    color: 'var(--text-muted)',
                    fontSize: '0.9rem',
                    padding: '1rem',
                    background: 'var(--secondary-bg)',
                    borderRadius: '8px',
                    textAlign: 'center'
                  }}>
                    No instructions uploaded yet. Use the upload button above to add documents.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {documents.map((doc, index) => {
                      const viewedCount = Array.isArray(doc.viewed_by) ? doc.viewed_by.length : 0;
                      const uploader = recruiters.find(r => r.id === doc.uploaded_by);
                      const uploaderName = uploader ? uploader.name : 'Unknown User';

                      return (
                        <div key={doc.id} style={{
                          padding: '1rem',
                          background: 'var(--secondary-bg)',
                          borderRadius: '8px',
                          border: '1px solid var(--border-color)'
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                            <div style={{ flex: 1 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                                <FileText size={16} color="var(--rose-gold)" />
                                <strong style={{ color: 'var(--text-primary)' }}>
                                  {doc.file_name || `Document ${index + 1}`}
                                </strong>
                              </div>
                              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                  <Calendar size={14} color="var(--text-muted)" />
                                  <span>Uploaded: {formatDateTime(doc.uploaded_at)}</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                  <Users size={14} color="var(--text-muted)" />
                                  <span>By: {uploaderName}</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                  <Eye size={14} color="var(--text-muted)" />
                                  <span>Viewed by {viewedCount} recruiter{viewedCount !== 1 ? 's' : ''}</span>
                                </div>
                              </div>
                              {doc.notes && (
                                <div style={{
                                  marginTop: '0.75rem',
                                  paddingTop: '0.75rem',
                                  borderTop: '1px solid var(--border-color)',
                                  fontStyle: 'italic',
                                  color: 'var(--text-secondary)',
                                  fontSize: '0.9rem'
                                }}>
                                  <strong>Manager Notes:</strong> {doc.notes}
                                </div>
                              )}
                            </div>
                          </div>

                          <div style={{ display: 'flex', gap: '0.75rem' }}>
                            <button
                              className="btn-view-instructions" // Re-using style
                              onClick={() => onPreview(doc, `Role Instructions - ${doc.file_name}`)}
                              style={{ flex: 1 }}
                            >
                              <Eye size={16} style={{ verticalAlign: 'middle', marginRight: '0.5rem' }} />
                              Preview
                            </button>
                            <button
                              className="btn-secondary" // Using a generic button style
                              onClick={() => onRemove(doc.id, position.id, doc.file_name)}
                              style={{
                                flex: 1,
                                background: 'linear-gradient(135deg, #F7768E, #E74C3C)',
                                border: 'none',
                                borderRadius: '8px',
                                padding: '0.5rem 1rem',
                                color: 'white',
                                cursor: 'pointer'
                              }}
                            >
                              <Trash2 size={16} style={{ verticalAlign: 'middle', marginRight: '0.5rem' }} />
                              Remove
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
            {/* End of previously visible content */}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};


// ===================================
// MAIN COMPONENT: StrategyManager
// ===================================
function StrategyManager() {
  const { userProfile, isDirectorOrManager } = useData();
  const { showConfirmation } = useConfirmation();
  const [positions, setPositions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('role_instructions');
  const [uploadingFile, setUploadingFile] = useState(null);

  // Document viewer state
  const [viewingDocument, setViewingDocument] = useState(null);

  // Role instructions state
  const [roleInstructions, setRoleInstructions] = useState({});
  
  // Store the list of all recruiters
  const [recruiters, setRecruiters] = useState([]);
  
  // NEW: State to track the expanded card. Starts collapsed (null).
  const [expandedCardId, setExpandedCardId] = useState(null);

  // Fetches all recruiters so we can map IDs to names
  const fetchAllRecruiters = useCallback(async () => {
    console.log('🔍 Fetching all recruiters for name mapping...');
    const { data, error } = await supabase
      .from('recruiters')
      .select('id, name');

    if (error) {
      console.error('❌ Error fetching recruiters:', error);
    } else {
      console.log('✅ Fetched recruiters:', data);
      setRecruiters(data || []);
    }
  }, []);

  const fetchAllPositions = useCallback(async () => {
    console.log('🔍 Fetching all open positions for Role Instructions tab...');
    setLoading(true);
    setPositions([]);
    setRoleInstructions({});

    try {
      const { data, error } = await supabase
        .from('positions')
        .select('*, clients(company_name)')
        .eq('status', 'Open')
        .order('created_at', { ascending: false });

      if (error) throw error;

      console.log('✅ Open positions response:', { data, count: data?.length || 0 });
      if (data) {
        console.log(`📊 Found ${data.length} open positions:`, data.map(p => ({ id: p.id, title: p.title, status: p.status })));
        setPositions(data);

        if (data.length > 0) {
          await fetchRoleInstructionsForPositions(data.map(p => p.id));
        }
      }
    } catch (error) {
        console.error('❌ Error fetching open positions:', error);
    } finally {
        setLoading(false);
    }
  }, []);

  const fetchRoleInstructionsForPositions = async (positionIds) => {
    console.log('🔍 Fetching role instructions for positions:', positionIds);

    try {
      const { data, error } = await supabase
        .from('role_instructions')
        .select('*')
        .in('position_id', positionIds)
        .order('uploaded_at', { ascending: false });

      if (error) throw error;

      console.log('✅ Fetched role instructions:', data);

      const grouped = {};
      if (data) {
        data.forEach(doc => {
          if (!grouped[doc.position_id]) {
            grouped[doc.position_id] = [];
          }
          grouped[doc.position_id].push(doc);
        });
      }
      setRoleInstructions(grouped);
    } catch (error)
    {
      console.error('❌ Error fetching role instructions:', error);
    }
  };

  useEffect(() => {
    if (!isDirectorOrManager) {
      return;
    }
    if (activeTab === 'role_instructions') {
      fetchAllRecruiters(); 
      fetchAllPositions();
    } else {
      setLoading(false);
    }
  }, [isDirectorOrManager, activeTab, fetchAllPositions, fetchAllRecruiters]);


  // Check access on component mount
  useEffect(() => {
    if (!isDirectorOrManager) {
      showConfirmation({
        type: 'error',
        title: 'Access Denied',
        message: 'This page is for managers only.'
      });
      window.location.href = '/';
    }
  }, [isDirectorOrManager, showConfirmation]);


  const uploadRoleInstructions = async (positionId, file, notes) => {
    if (!userProfile) {
      showConfirmation({
        type: 'error',
        title: 'Error',
        message: 'User profile not found.'
      });
      return;
    }
    
    setUploadingFile(positionId);

    try {
      console.log('📤 Uploading role instructions for position:', positionId);

      const safeFileNameForPath = file.name.replace(/\s/g, '_');
      const storagePath = `${userProfile.id}/${positionId}_instructions_${Date.now()}_${safeFileNameForPath}`;


      console.log(`Attempting to upload to path: ${storagePath}`);

      // 1. Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('role-instructions')
        .upload(storagePath, file);

      if (uploadError) {
        console.error('Supabase Storage Upload Error:', uploadError);
        let errorMessage = `Storage Error: ${uploadError.message || 'Unknown storage error.'}`;
         if (uploadError.message.includes('Bucket not found')) {
            errorMessage = 'Storage Error: The storage bucket "role-instructions" was not found.';
        }
        throw new Error(errorMessage);
      }

      // 2. Get the public URL
      const { data: urlData } = supabase.storage
        .from('role-instructions')
        .getPublicUrl(storagePath);

      if (!urlData || !urlData.publicUrl) {
        throw new Error("Could not get public URL for the uploaded file.");
      }
      
      console.log('✅ File uploaded to storage:', urlData.publicUrl);

      // 3. Insert metadata into table
      const { error: insertError } = await supabase
        .from('role_instructions')
        .insert({
          position_id: positionId,
          file_url: urlData.publicUrl,
          file_name: file.name,
          notes: notes,
          uploaded_by: userProfile.id,
          uploaded_at: new Date().toISOString(),
          viewed_by: []
        });

      if (insertError) {
        console.error('❌ Error inserting role instructions record:', insertError);
        let dbErrorMessage = `Database Error: ${insertError.message || 'Failed to save instruction details.'}`;
        if (insertError.code === '22P02') {
             dbErrorMessage = `Database Error: There was an issue saving the instruction details, possibly related to data format. ${insertError.details || ''}`;
        } else if (insertError.code === '42501') {
             dbErrorMessage = `Database Error: Permission denied. Please check your Row Level Security policies or disable RLS for 'role_instructions'. ${insertError.message}`;
        }
        throw new Error(dbErrorMessage);
      }

      console.log('✅ Role instructions record created');

      // 4. Create audit log
      await supabase
        .from('pipeline_audit_log')
        .insert({
          position_id: positionId,
          event_type: 'role_instructions_uploaded',
          performed_by: userProfile.id,
          notes: `Role instructions uploaded: ${file.name}`,
          metadata: { filename: file.name, notes },
          created_at: new Date().toISOString()
        });

      showConfirmation({
        type: 'success',
        title: 'Success!',
        message: 'Role instructions uploaded! Recruiters will see it on their active roles.'
      });
      fetchAllPositions();
    } catch (error) {
      console.error('❌ Overall Error uploading role instructions:', error);
      showConfirmation({
        type: 'error',
        title: 'Upload Failed',
        message: `Upload Failed: ${error.message}`
      });
    } finally {
      setUploadingFile(null);
    }
  };


  const removeRoleInstructionsDocument = async (documentId, positionId, fileName) => {
    if (!window.confirm(`Are you sure you want to remove "${fileName}"? Recruiters will no longer see this document.`)) {
      return;
    }
    if (!userProfile) {
      showConfirmation({
        type: 'error',
        title: 'Error',
        message: 'User profile not found.'
      });
      return;
    }

    try {
      console.log('🗑️ Removing role instructions document:', documentId);

      // 1. Find the document
      const { data: docData, error: fetchError } = await supabase
        .from('role_instructions')
        .select('file_url')
        .eq('id', documentId)
        .single();
      
      if (fetchError || !docData) {
        throw new Error(`Could not find document record: ${fetchError?.message || 'Not found'}`);
      }

      // 2. Delete from table
      const { error: deleteError } = await supabase
        .from('role_instructions')
        .delete()
        .eq('id', documentId);

      if (deleteError) {
         console.error('❌ Error deleting role instructions record:', deleteError);
         let delErrorMessage = `Database Error: ${deleteError.message || 'Failed to delete instruction details.'}`;
         if (deleteError.code === '42501') {
             delErrorMessage = `Database Error: Permission denied. Please check your Row Level Security policies for deleting from role_instructions. ${deleteError.message}`;
         }
         throw new Error(delErrorMessage);
      }


      // 3. Delete from Storage
      let filePath = '';
      try {
        const urlString = docData.file_url;
        const pathStartIndex = urlString.indexOf('/role-instructions/') + '/role-instructions/'.length;
        if (pathStartIndex > '/role-instructions/'.length - 1) {
            filePath = decodeURIComponent(urlString.substring(pathStartIndex));
        } else {
             throw new Error("Path structure not recognized.");
        }
        console.log(`Attempting to delete storage file at path: ${filePath}`);
      } catch (e) {
         console.error("Error parsing or decoding file path:", e, `URL: ${docData.file_url}`);
         filePath = '';
      }

      if (filePath) {
        const { error: storageError } = await supabase.storage
          .from('role-instructions')
          .remove([filePath]);
        
        if (storageError) {
          console.warn(`Storage file deletion failed (path: ${filePath}), but DB record was removed: ${storageError.message}`);
          showConfirmation({
            type: 'warning',
            title: 'Partial Success',
            message: `Document record removed, but there was an issue deleting the file from storage. Path: ${filePath}. Error: ${storageError.message}`
          });
        } else {
           console.log(`✅ Storage file deleted: ${filePath}`);
        }
      } else {
        console.warn(`Could not parse file path from URL for deletion: ${docData.file_url}`);
        showConfirmation({
          type: 'warning',
          title: 'Partial Success',
          message: `Document record removed, but could not determine the file path to delete from storage. URL: ${docData.file_url}`
        });
      }

      // 4. Create audit log
      await supabase
        .from('pipeline_audit_log')
        .insert({
          position_id: positionId,
          event_type: 'role_instructions_removed',
          performed_by: userProfile.id,
          notes: `Role instructions removed: ${fileName}`,
          metadata: { filename: fileName, document_id: documentId },
          created_at: new Date().toISOString()
        });

      console.log('✅ Role instructions document removed from database.');
      if (!filePath || (filePath && !supabase.storage.from('role-instructions').remove([filePath]).error) ) {
        showConfirmation({
          type: 'success',
          title: 'Success!',
          message: 'Role instructions removed successfully.'
        });
      }
      fetchAllPositions();
    } catch (error) {
      console.error('❌ Overall Error removing role instructions:', error);
      showConfirmation({
        type: 'error',
        title: 'Error',
        message: `Error: ${error.message}`
      });
    }
  };


  const handlePreviewDocument = (document, title) => {
    console.log('👁️ Opening document preview:', document);
    setViewingDocument({
      url: document.file_url,
      title: title || 'Document Preview'
    });
  };

  if (!isDirectorOrManager) {
    return (
        <div className="dashboard-container">
          <div className="overview-header">
            <h1 className="main-title" style={{ color: 'var(--accent-red)' }}>
                <AlertTriangle size={32} /> Access Denied
            </h1>
            <p className="welcome-message">
              This page is only accessible to users with Director or Manager roles.
            </p>
          </div>
        </div>
    );
  }

  return (
    <div className="dashboard-container">
      <div className="overview-header">
        <div>
          <h1 className="main-title">Strategy Manager</h1>
          <p className="welcome-message">
            Upload role instructions for recruiters.
          </p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="strategy-tabs" style={{
        display: 'flex',
        gap: '1rem',
        marginBottom: '2rem',
        borderBottom: '2px solid var(--border-color)'
      }}>
        <button
          className={`tab-button ${activeTab === 'role_instructions' ? 'active' : ''}`}
          onClick={() => setActiveTab('role_instructions')}
          style={{
            padding: '0.75rem 1.5rem',
            background: activeTab === 'role_instructions' ? 'linear-gradient(135deg, var(--rose-gold), #F39C9C)' : 'transparent',
            border: 'none',
            borderBottom: activeTab === 'role_instructions' ? '3px solid var(--rose-gold)' : '3px solid transparent',
            color: activeTab === 'role_instructions' ? 'var(--main-bg)' : 'var(--text-secondary)',
            cursor: 'pointer',
            fontWeight: 600,
            transition: 'all 0.3s'
          }}
        >
          <FileText size={18} style={{ verticalAlign: 'middle', marginRight: '0.5rem' }} />
          Role Instructions
        </button>
        
        {/* Placeholder for other tabs */}
        <button
          className={`tab-button ${activeTab === 'strategies' ? 'active' : ''}`}
          onClick={() => setActiveTab('strategies')}
          style={{
            padding: '0.75rem 1.5rem',
            background: 'transparent',
            border: 'none',
            borderBottom: '3px solid transparent',
            color: 'var(--text-muted)',
            cursor: 'not-allowed',
            fontWeight: 600,
            transition: 'all 0.3s',
            opacity: 0.5
          }}
          disabled
          title="This feature has been removed."
        >
          <FileText size={18} style={{ verticalAlign: 'middle', marginRight: '0.5rem' }} />
          Strategy Documents (Removed)
        </button>
        <button
          className={`tab-button ${activeTab === 'audit' ? 'active' : ''}`}
          onClick={() => setActiveTab('audit')}
           style={{
            padding: '0.75rem 1.5rem',
            background: 'transparent',
            border: 'none',
            borderBottom: '3px solid transparent',
            color: 'var(--text-muted)',
            cursor: 'not-allowed',
            fontWeight: 600,
            transition: 'all 0.3s',
            opacity: 0.5
          }}
          disabled
          title="This feature has been removed."
        >
          <BarChart size={18} style={{ verticalAlign: 'middle', marginRight: '0.5rem' }} />
          Audit Trail (Removed)
        </button>
      </div>

      {/* Role Instructions Tab */}
      {activeTab === 'role_instructions' && (
        <div>
          {loading ? (
             <div className="first-slate-sprint-card">
              <p style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
                Loading open positions...
              </p>
            </div>
          ) : positions.length === 0 ? (
            <div className="first-slate-sprint-card">
              <p style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
                No open positions found.
              </p>
            </div>
          ) : (
            // NEW: Pass the state and setter to the card component
            positions.map((position) => (
                <RoleInstructionCard
                    key={position.id}
                    position={position}
                    instructions={roleInstructions[position.id] || []}
                    recruiters={recruiters}
                    uploadingFile={uploadingFile}
                    onUpload={uploadRoleInstructions}
                    onRemove={removeRoleInstructionsDocument}
                    onPreview={handlePreviewDocument}
                    expandedCardId={expandedCardId}
                    setExpandedCardId={setExpandedCardId}
                    showConfirmation={showConfirmation}
                />
            ))
          )}
        </div>
      )}

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

export default StrategyManager;