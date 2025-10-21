import React, { useState, useEffect, useCallback } from 'react';
import { useData } from '../contexts/DataContext';
import { supabase } from '../services/supabaseClient';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText, Trash2, Eye, Calendar, BarChart, Upload, Users, AlertTriangle
} from 'lucide-react'; // Removed unused icons
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
  recruiters, // <-- We now pass in the list of recruiters
  uploadingFile,
  onUpload,
  onRemove,
  onPreview
}) => {
  const documents = instructions || [];

  return (
    <motion.div
      key={position.id}
      className="active-role-card" // Re-using style from RecruiterOutreach.css
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      style={{ marginBottom: '1.5rem' }}
    >
      <div className="active-role-header">
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
      </div>

      {/* Upload New Instructions - Always show at top */}
      <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border-color)' }}>
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
                // *** NEW: Validate filename before proceeding ***
                if (!isValidFilename(file.name)) {
                  alert(
                    "Invalid Filename:\n\nPlease rename the file before uploading.\n\nFilenames can only contain letters (A-Z, a-z), numbers (0-9), spaces, dots (.), hyphens (-), and underscores (_).\n\nRemove any special characters (like $, %, &, (, ), –, etc.)."
                  );
                  // Clear the input so the user has to re-select
                  e.target.value = null;
                  return; // Stop the function here
                }

                // Filename is valid, proceed with notes prompt and upload
                const notes = prompt('Optional notes for these instructions:');
                // Pass notes, allowing null if prompt is cancelled
                if (notes !== null) { // Only upload if user didn't cancel prompt
                    onUpload(position.id, file, notes || '');
                } else {
                    console.log('Upload cancelled by user at notes prompt.');
                }
              }
              // Clear the input value *after* processing (or cancelling)
              // to allow re-selection of the same file if needed after renaming.
              // Note: This might still clear even if upload starts, depending on browser timing.
              // A more robust solution might involve resetting state, but this is simpler.
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
              
              // We manually find the uploader's name from the recruiters list
              // by matching the doc.uploaded_by ID
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
                        
                        {/* We use the uploaderName we found above */}
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
    </motion.div>
  );
};


// ===================================
// MAIN COMPONENT: StrategyManager
// ===================================
function StrategyManager() {
  const { userProfile, isDirectorOrManager } = useData();
  const [positions, setPositions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('role_instructions'); // Default to new tab
  const [uploadingFile, setUploadingFile] = useState(null);

  // Document viewer state
  const [viewingDocument, setViewingDocument] = useState(null);

  // Role instructions state (for multiple documents)
  const [roleInstructions, setRoleInstructions] = useState({});
  
  // Store the list of all recruiters
  const [recruiters, setRecruiters] = useState([]);

  // Fetches all recruiters so we can map IDs to names
  const fetchAllRecruiters = useCallback(async () => {
    console.log('🔍 Fetching all recruiters for name mapping...');
    const { data, error } = await supabase
      .from('recruiters')
      .select('id, name'); // We only need id and name

    if (error) {
      console.error('❌ Error fetching recruiters:', error);
    } else {
      console.log('✅ Fetched recruiters:', data);
      setRecruiters(data || []);
    }
  }, []);

  const fetchAllPositions = useCallback(async () => {
    console.log('🔍 Fetching all open positions for Role Instructions tab...');
    setLoading(true); // Ensure loading is true at the start
    setPositions([]); // Clear previous positions
    setRoleInstructions({}); // Clear previous instructions

    try {
      const { data, error } = await supabase
        .from('positions')
        .select('*, clients(company_name)')
        .eq('status', 'Open')
        .order('created_at', { ascending: false });

      if (error) throw error; // Throw error to be caught below

      console.log('✅ Open positions response:', { data, count: data?.length || 0 });
      if (data) {
        console.log(`📊 Found ${data.length} open positions:`, data.map(p => ({ id: p.id, title: p.title, status: p.status })));
        setPositions(data);

        // Fetch role instructions for these positions
        if (data.length > 0) {
          await fetchRoleInstructionsForPositions(data.map(p => p.id));
        }
      }
    } catch (error) {
        console.error('❌ Error fetching open positions:', error);
        // Optionally set an error state here to display to the user
    } finally {
        setLoading(false); // Ensure loading is false at the end
    }
  }, []); // Removed fetchRoleInstructionsForPositions from deps as it's called internally

  const fetchRoleInstructionsForPositions = async (positionIds) => {
    console.log('🔍 Fetching role instructions for positions:', positionIds);

    try {
      // We only select '*', not the broken link
      const { data, error } = await supabase
        .from('role_instructions')
        .select('*') // <-- SIMPLIFIED QUERY
        .in('position_id', positionIds)
        .order('uploaded_at', { ascending: false });

      if (error) throw error; // Throw error to be caught below

      console.log('✅ Fetched role instructions:', data);

      // Group by position_id
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
       // Optionally set an error state here
    }
  };

  useEffect(() => {
    if (!isDirectorOrManager) {
      return;
    }
    // Only load data for the 'role_instructions' tab for now
    if (activeTab === 'role_instructions') {
      // We fetch both recruiters AND positions now
      fetchAllRecruiters(); 
      fetchAllPositions(); // fetchAllPositions now also calls fetchRoleInstructionsForPositions
    } else {
      // Set loading to false if other tabs are selected but not implemented
      setLoading(false);
    }
  }, [isDirectorOrManager, activeTab, fetchAllPositions, fetchAllRecruiters]);


  // Check access on component mount
  useEffect(() => {
    if (!isDirectorOrManager) {
      alert('Access Denied: This page is for managers only.');
      // A simple redirect; in a real app, you might use navigate() from react-router
      window.location.href = '/';
    }
  }, [isDirectorOrManager]);


  const uploadRoleInstructions = async (positionId, file, notes) => {
    // Handle case where user cancels the notes prompt - already handled in onChange now

    if (!userProfile) {
      alert('Error: User profile not found.');
      return;
    }
    
    setUploadingFile(positionId);

    try {
      console.log('📤 Uploading role instructions for position:', positionId);

      // ** Use the already validated filename for storage path construction **
      // We still need to create a unique path, so combine user ID, position ID, timestamp, and the *original* file name (as it's now validated)
      // Replace spaces with underscores just for the storage path for robustness, though spaces might be allowed by Supabase now.
      const safeFileNameForPath = file.name.replace(/\s/g, '_');
      const storagePath = `${userProfile.id}/${positionId}_instructions_${Date.now()}_${safeFileNameForPath}`;


      console.log(`Attempting to upload to path: ${storagePath}`);

      // 1. Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('role-instructions') // Bucket name
        .upload(storagePath, file); // Use the validated name derivative path

      if (uploadError) {
        console.error('Supabase Storage Upload Error:', uploadError);
        let errorMessage = `Storage Error: ${uploadError.message || 'Unknown storage error.'}`;
         if (uploadError.message.includes('Bucket not found')) {
            errorMessage = 'Storage Error: The storage bucket "role-instructions" was not found.';
        }
        // No need to check for 'Invalid key' here as validation prevents it
        throw new Error(errorMessage);
      }

      // 2. Get the public URL using the same path
      const { data: urlData } = supabase.storage
        .from('role-instructions')
        .getPublicUrl(storagePath);

      if (!urlData || !urlData.publicUrl) {
        throw new Error("Could not get public URL for the uploaded file.");
      }
      
      console.log('✅ File uploaded to storage:', urlData.publicUrl);

      // 3. Insert metadata into role_instructions table
      const { error: insertError } = await supabase
        .from('role_instructions')
        .insert({
          position_id: positionId,
          file_url: urlData.publicUrl,
          file_name: file.name, // Keep original file name for display in UI
          notes: notes, // Use the potentially empty string notes
          uploaded_by: userProfile.id,
          uploaded_at: new Date().toISOString(),
          viewed_by: [] // Initialize as empty array JSONB
        });

      if (insertError) {
        console.error('❌ Error inserting role instructions record:', insertError);
        let dbErrorMessage = `Database Error: ${insertError.message || 'Failed to save instruction details.'}`;
        if (insertError.code === '22P02') { // Invalid text representation (often JSON)
             dbErrorMessage = `Database Error: There was an issue saving the instruction details, possibly related to data format. ${insertError.details || ''}`;
        } else if (insertError.code === '42501') { // RLS violation
             dbErrorMessage = `Database Error: Permission denied. Please check your Row Level Security policies or disable RLS for 'role_instructions'. ${insertError.message}`;
        }
        throw new Error(dbErrorMessage);
      }

      console.log('✅ Role instructions record created');

      // 4. Create audit log (optional, keep if needed)
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

      alert('✅ Role instructions uploaded! Recruiters will see it on their active roles.');
      fetchAllPositions(); // Refresh data to show the new document
    } catch (error) {
      console.error('❌ Overall Error uploading role instructions:', error);
      alert('Upload Failed: ' + error.message);
    } finally {
      setUploadingFile(null); // Ensure this always runs
    }
  };


  const removeRoleInstructionsDocument = async (documentId, positionId, fileName) => {
    if (!window.confirm(`Are you sure you want to remove "${fileName}"? Recruiters will no longer see this document.`)) {
      return;
    }
    if (!userProfile) {
      alert('Error: User profile not found.');
      return;
    }

    try {
      console.log('🗑️ Removing role instructions document:', documentId);

      // 1. Find the document to get the file_url for storage deletion
      const { data: docData, error: fetchError } = await supabase
        .from('role_instructions')
        .select('file_url')
        .eq('id', documentId)
        .single();
      
      if (fetchError || !docData) {
        throw new Error(`Could not find document record: ${fetchError?.message || 'Not found'}`);
      }

      // 2. Delete from role_instructions table
      const { error: deleteError } = await supabase
        .from('role_instructions')
        .delete()
        .eq('id', documentId);

      // IMPORTANT: Check for RLS errors on delete
      if (deleteError) {
         console.error('❌ Error deleting role instructions record:', deleteError);
         let delErrorMessage = `Database Error: ${deleteError.message || 'Failed to delete instruction details.'}`;
         if (deleteError.code === '42501') { // RLS violation
             delErrorMessage = `Database Error: Permission denied. Please check your Row Level Security policies for deleting from role_instructions. ${deleteError.message}`;
         }
         throw new Error(delErrorMessage);
      }


      // 3. Delete from Supabase Storage (Only attempt if DB delete was successful)
      let filePath = '';
      try {
        const urlString = docData.file_url;
        // Find the start of the path after the bucket name
        const pathStartIndex = urlString.indexOf('/role-instructions/') + '/role-instructions/'.length;
        if (pathStartIndex > '/role-instructions/'.length - 1) {
            // Decode the path component AFTER isolating it
            filePath = decodeURIComponent(urlString.substring(pathStartIndex));
        } else {
             throw new Error("Path structure not recognized.");
        }
        console.log(`Attempting to delete storage file at path: ${filePath}`);
      } catch (e) {
         console.error("Error parsing or decoding file path:", e, `URL: ${docData.file_url}`);
         filePath = ''; // Ensure filePath is empty if parsing fails
      }

      if (filePath) {
        const { error: storageError } = await supabase.storage
          .from('role-instructions')
          .remove([filePath]); // Pass filePath as an array element
        
        if (storageError) {
          // Log the error but don't block overall success, as the DB record is more important
          console.warn(`Storage file deletion failed (path: ${filePath}), but DB record was removed: ${storageError.message}`);
          // Consider notifying the user that the file might still exist in storage
          alert(`Document record removed, but there was an issue deleting the file from storage. Path: ${filePath}. Error: ${storageError.message}`);
        } else {
           console.log(`✅ Storage file deleted: ${filePath}`);
        }
      } else {
        console.warn(`Could not parse file path from URL for deletion: ${docData.file_url}`);
         alert(`Document record removed, but could not determine the file path to delete from storage. URL: ${docData.file_url}`);
      }

      // 4. Create audit log (optional)
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
      // Don't show success alert until after storage attempt finishes or fails with warning
      // The warnings above serve as notifications in case of partial success.
      if (!filePath || (filePath && !supabase.storage.from('role-instructions').remove([filePath]).error) ) {
         alert('Role instructions removed successfully.'); // Show success if storage delete worked or wasn't needed
      }
      fetchAllPositions(); // Refresh data
    } catch (error) {
      console.error('❌ Overall Error removing role instructions:', error);
      // Show the specific error from DB delete or finding record
      alert('Error: ' + error.message);
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
        
        {/* Placeholder for other tabs if we re-add them later */}
        <button
          className={`tab-button ${activeTab === 'strategies' ? 'active' : ''}`}
          onClick={() => setActiveTab('strategies')}
          style={{
            padding: '0.75rem 1.5rem',
            background: 'transparent',
            border: 'none',
            borderBottom: '3px solid transparent',
            color: 'var(--text-muted)', // Muted color
            cursor: 'not-allowed', // Not allowed cursor
            fontWeight: 600,
            transition: 'all 0.3s',
            opacity: 0.5
          }}
          disabled // Disable the button
          title="This feature has been removed." // Correctly placed title attribute
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
            color: 'var(--text-muted)', // Muted color
            cursor: 'not-allowed', // Not allowed cursor
            fontWeight: 600,
            transition: 'all 0.3s',
            opacity: 0.5
          }}
          disabled // Disable the button
          title="This feature has been removed." // Correctly placed title attribute
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
                />
            ))
          )}
        </div>
      )}

      {/* Other tabs are hidden as they are not the active one */}

      {/* Document Viewer Modal */}
      <AnimatePresence>
        {viewingDocument && (
          <DocumentViewerModal
            documentUrl={viewingDocument.url}
            documentTitle={viewingDocument.title}
            onClose={() => setViewingDocument(null)}
            // No onViewed prop here, as managers don't need to track their own views
          />
        )}
      </AnimatePresence>
    </div>
  );
}

export default StrategyManager;