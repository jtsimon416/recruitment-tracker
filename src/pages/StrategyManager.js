import React, { useState, useEffect, useCallback } from 'react';
import { useData } from '../contexts/DataContext';
import { useConfirmation } from '../contexts/ConfirmationContext';
import { supabase } from '../services/supabaseClient';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText, Trash2, Eye, Calendar, BarChart, Upload, Users, AlertTriangle,
  ChevronDown, ChevronUp, TrendingUp, Clock, CheckCircle, User
} from 'lucide-react';
import { BarChart as RechartsBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import AnimatedCounter from '../components/AnimatedCounter';
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
// AUDIT TRAIL CONFIG
// ===================================
const AUDIT_START_DATE = '2025-10-27T00:00:00.000Z';

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

  // Audit Trail state
  const [allPositionsForAudit, setAllPositionsForAudit] = useState([]);
  const [selectedAuditPositionId, setSelectedAuditPositionId] = useState(null);
  const [auditData, setAuditData] = useState({ logs: [], kpis: {}, chartData: [] });
  const [loadingAuditData, setLoadingAuditData] = useState(false);

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
    } else if (activeTab === 'audit') {
      fetchAllRecruiters();
      fetchAllPositionsForAudit();
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

  // ===================================
  // AUDIT TRAIL FUNCTIONS
  // ===================================

  const fetchAllPositionsForAudit = useCallback(async () => {
    console.log('🔍 Fetching all positions for Audit Trail...');
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from('positions')
        .select('*, clients(company_name)')
        .order('created_at', { ascending: false });

      if (error) throw error;

      console.log('✅ Positions for audit:', data);
      setAllPositionsForAudit(data || []);
    } catch (error) {
      console.error('❌ Error fetching positions for audit:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchAuditTrailData = async (positionId) => {
    if (!positionId) return;

    setLoadingAuditData(true);
    console.log('🔍 Fetching audit data for position:', positionId);

    try {
      const { data: logs, error } = await supabase
        .from('pipeline_audit_log')
        .select('*')
        .gte('created_at', AUDIT_START_DATE) // <-- ADD THIS LINE
        .eq('position_id', positionId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      console.log('✅ Audit logs fetched:', logs);

      const selectedPosition = allPositionsForAudit.find(p => p.id === positionId);

      const kpis = calculateAuditKPIs(logs, selectedPosition);
      const chartData = calculateBottleneckData(logs, selectedPosition);

      setAuditData({
        logs: logs || [],
        kpis,
        chartData
      });
    } catch (error) {
      console.error('❌ Error fetching audit trail data:', error);
      setAuditData({ logs: [], kpis: {}, chartData: [] });
    } finally {
      setLoadingAuditData(false);
    }
  };

  const calculateAuditKPIs = (logs, position) => {
    if (!position) return {};

    const now = new Date();
    const positionCreated = new Date(position.created_at);

    let roleLifespan = 0;
    if (position.status === 'Closed' && position.date_closed) {
      const closedDate = new Date(position.date_closed);
      roleLifespan = Math.floor((closedDate - positionCreated) / (1000 * 60 * 60 * 24));
    } else {
      roleLifespan = Math.floor((now - positionCreated) / (1000 * 60 * 60 * 24));
    }

    const firstInstructionEvent = logs.find(log => log.event_type === 'role_instructions_uploaded');
    let timeToFirstInstruction = 'N/A';
    if (firstInstructionEvent) {
      const instructionDate = new Date(firstInstructionEvent.created_at);
      const days = Math.floor((instructionDate - positionCreated) / (1000 * 60 * 60 * 24));
      timeToFirstInstruction = days >= 0 ? `${days} days` : 'N/A';
    }

    const firstCandidateEvent = logs.find(log => log.event_type === 'candidate_added');
    let timeToFirstCandidate = 'N/A';
    if (firstCandidateEvent) {
      const candidateDate = new Date(firstCandidateEvent.created_at);
      const days = Math.floor((candidateDate - positionCreated) / (1000 * 60 * 60 * 24));
      timeToFirstCandidate = days >= 0 ? `${days} days` : 'N/A';
    }

    return {
      roleLifespan,
      timeToFirstInstruction,
      timeToFirstCandidate,
      totalEvents: logs.length
    };
  };

  const calculateBottleneckData = (logs, position) => {
    if (!position) return [];

    const positionCreated = new Date(position.created_at);
    const data = [];

    const firstInstruction = logs.find(log => log.event_type === 'role_instructions_uploaded');
    if (firstInstruction) {
      const days = Math.max(0, Math.floor((new Date(firstInstruction.created_at) - positionCreated) / (1000 * 60 * 60 * 24)));
      data.push({ stage: 'Role Created → First Instruction', days });
    }

    const firstCandidate = logs.find(log => log.event_type === 'candidate_added');
    if (firstInstruction && firstCandidate) {
      const days = Math.max(0, Math.floor((new Date(firstCandidate.created_at) - new Date(firstInstruction.created_at)) / (1000 * 60 * 60 * 24)));
      data.push({ stage: 'First Instruction → First Candidate', days });
    }

    const firstInterview = logs.find(log => log.event_type === 'interview_scheduled');
    if (firstCandidate && firstInterview) {
      const days = Math.max(0, Math.floor((new Date(firstInterview.created_at) - new Date(firstCandidate.created_at)) / (1000 * 60 * 60 * 24)));
      data.push({ stage: 'First Candidate → First Interview', days });
    }

    return data;
  };

  const handleAuditPositionChange = (positionId) => {
    setSelectedAuditPositionId(positionId);
    if (positionId) {
      fetchAuditTrailData(positionId);
    } else {
      setAuditData({ logs: [], kpis: {}, chartData: [] });
    }
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
            background: activeTab === 'audit' ? 'linear-gradient(135deg, var(--rose-gold), #F39C9C)' : 'transparent',
            border: 'none',
            borderBottom: activeTab === 'audit' ? '3px solid var(--rose-gold)' : '3px solid transparent',
            color: activeTab === 'audit' ? 'var(--main-bg)' : 'var(--text-secondary)',
            cursor: 'pointer',
            fontWeight: 600,
            transition: 'all 0.3s'
          }}
        >
          <BarChart size={18} style={{ verticalAlign: 'middle', marginRight: '0.5rem' }} />
          Audit Trail
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

      {/* Audit Trail Tab */}
      {activeTab === 'audit' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {/* Position Selector */}
          <div style={{
            background: 'var(--card-bg)',
            padding: '1.5rem',
            borderRadius: '12px',
            marginBottom: '2rem',
            border: '1px solid var(--border-color)'
          }}>
            <label style={{
              display: 'block',
              marginBottom: '0.75rem',
              color: 'var(--rose-gold)',
              fontWeight: 600,
              fontSize: '1rem'
            }}>
              Select Position to Analyze:
            </label>
            <select
              value={selectedAuditPositionId || ''}
              onChange={(e) => handleAuditPositionChange(e.target.value)}
              style={{
                width: '100%',
                padding: '0.75rem',
                background: 'var(--secondary-bg)',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                color: 'var(--text-primary)',
                fontSize: '1rem',
                cursor: 'pointer'
              }}
            >
              <option value="">-- Select a Position --</option>
              {allPositionsForAudit.map(position => (
                <option key={position.id} value={position.id}>
                  {position.title} @ {position.clients?.company_name || 'Unknown'} ({position.status})
                </option>
              ))}
            </select>
          </div>

          {/* Dashboard Content */}
          {selectedAuditPositionId && (
            <>
              {loadingAuditData ? (
                <div style={{
                  textAlign: 'center',
                  padding: '3rem',
                  color: 'var(--text-secondary)'
                }}>
                  Loading audit data...
                </div>
              ) : (
                <>
                  {/* KPI Cards */}
                  <motion.div
                    className="executive-summary-cards"
                    style={{ marginBottom: '2rem' }}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                  >
                    <div className="executive-card">
                      <div className="executive-card-icon" style={{ color: '#B8D4D0' }}>
                        <Calendar size={28} />
                      </div>
                      <div className="executive-card-value">
                        <AnimatedCounter value={auditData.kpis.roleLifespan || 0} />
                      </div>
                      <div className="executive-card-label">Days Total Role Lifespan</div>
                    </div>

                    <div className="executive-card">
                      <div className="executive-card-icon" style={{ color: '#C5B9D6' }}>
                        <FileText size={28} />
                      </div>
                      <div className="executive-card-value" style={{ fontSize: '1.5rem' }}>
                        {auditData.kpis.timeToFirstInstruction || 'N/A'}
                      </div>
                      <div className="executive-card-label">Time to First Instruction</div>
                    </div>

                    <div className="executive-card">
                      <div className="executive-card-icon" style={{ color: '#9ECE6A' }}>
                        <Users size={28} />
                      </div>
                      <div className="executive-card-value" style={{ fontSize: '1.5rem' }}>
                        {auditData.kpis.timeToFirstCandidate || 'N/A'}
                      </div>
                      <div className="executive-card-label">Time to First Candidate</div>
                    </div>

                    <div className="executive-card">
                      <div className="executive-card-icon" style={{ color: '#E8B4B8' }}>
                        <TrendingUp size={28} />
                      </div>
                      <div className="executive-card-value">
                        <AnimatedCounter value={auditData.kpis.totalEvents || 0} />
                      </div>
                      <div className="executive-card-label">Total Audit Events</div>
                    </div>
                  </motion.div>

                  {/* Bottleneck Analysis Chart */}
                  {auditData.chartData.length > 0 && (
                    <motion.div
                      style={{
                        background: 'var(--card-bg)',
                        padding: '1.5rem',
                        borderRadius: '12px',
                        marginBottom: '2rem',
                        border: '1px solid var(--border-color)'
                      }}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 }}
                    >
                      <h3 style={{
                        color: 'var(--rose-gold)',
                        marginBottom: '1.5rem',
                        fontSize: '1.25rem',
                        fontWeight: 600
                      }}>
                        Bottleneck Analysis
                      </h3>
                      <ResponsiveContainer width="100%" height={300}>
                        <RechartsBarChart data={auditData.chartData} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" stroke="#2a2a40" />
                          <XAxis type="number" stroke="#a0a0c0" label={{ value: 'Days', position: 'insideBottom', offset: -5 }} />
                          <YAxis dataKey="stage" type="category" stroke="#a0a0c0" width={200} />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: '#1a1a2e',
                              border: '1px solid #2a2a40',
                              borderRadius: '8px',
                              color: '#e0e0f0'
                            }}
                          />
                          <Legend />
                          <Bar dataKey="days" fill="#E8B4B8" name="Days" radius={[0, 8, 8, 0]} />
                        </RechartsBarChart>
                      </ResponsiveContainer>
                    </motion.div>
                  )}

                  {/* NEW: Audit Trail Warning Box */}
                  <motion.div
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '1rem',
                      background: 'rgba(235, 188, 186, 0.1)', // Light rose-gold background
                      border: '1px solid var(--rose-gold)',
                      padding: '1rem',
                      borderRadius: '12px',
                      marginBottom: '2rem',
                      color: 'var(--text-secondary)'
                    }}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                  >
                    <AlertTriangle size={24} color="var(--rose-gold)" style={{ flexShrink: 0, marginTop: '2px' }} />
                    <div>
                      <h4 style={{ color: 'var(--rose-gold)', margin: 0, padding: 0, marginBottom: '0.5rem', fontSize: '1rem' }}>
                        Please Note:
                      </h4>
                      <p style={{ margin: 0, padding: 0, fontSize: '0.9rem', lineHeight: '1.5' }}>
                        To provide a clean and relevant history, this audit timeline only displays events logged on or after **October 27, 2025**.
                        <br />
                        Older, historical data is hidden to prevent confusion.
                      </p>
                    </div>
                  </motion.div>

                  {/* Role Lifecycle Timeline */}
                  <motion.div
                    style={{
                      background: 'var(--card-bg)',
                      padding: '1.5rem',
                      borderRadius: '12px',
                      border: '1px solid var(--border-color)'
                    }}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                  >
                    <h3 style={{
                      color: 'var(--rose-gold)',
                      marginBottom: '1.5rem',
                      fontSize: '1.25rem',
                      fontWeight: 600
                    }}>
                      Role Lifecycle Timeline
                    </h3>

                    {auditData.logs.length === 0 ? (
                      <div style={{
                        textAlign: 'center',
                        padding: '2rem',
                        color: 'var(--text-secondary)',
                        fontStyle: 'italic'
                      }}>
                        No audit events found for this position.
                      </div>
                    ) : (
                      <div style={{
                        maxHeight: '500px',
                        overflowY: 'auto',
                        paddingRight: '0.5rem'
                      }}>
                        {auditData.logs.map((log, index) => {
                          const performer = recruiters.find(r => r.id === log.performed_by);
                          const performerName = performer ? performer.name : 'System';

                          let icon = <Clock size={16} />;
                          let iconColor = '#B8D4D0';

                          if (log.event_type === 'role_instructions_uploaded') {
                            icon = <FileText size={16} />;
                            iconColor = '#C5B9D6';
                          } else if (log.event_type === 'candidate_added') {
                            icon = <Users size={16} />;
                            iconColor = '#9ECE6A';
                          } else if (log.event_type === 'interview_scheduled') {
                            icon = <Calendar size={16} />;
                            iconColor = '#E8B4B8';
                          }

                          return (
                            <motion.div
                              key={log.id}
                              className="timeline-item"
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: index * 0.05 }}
                              style={{
                                display: 'flex',
                                gap: '1rem',
                                padding: '1rem',
                                background: 'var(--secondary-bg)',
                                borderRadius: '8px',
                                marginBottom: '0.75rem',
                                borderLeft: `3px solid ${iconColor}`
                              }}
                            >
                              <div style={{
                                width: '32px',
                                height: '32px',
                                borderRadius: '50%',
                                background: iconColor,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: 'var(--main-bg)',
                                flexShrink: 0
                              }}>
                                {icon}
                              </div>
                              <div style={{ flex: 1 }}>
                                <div style={{
                                  fontSize: '0.75rem',
                                  color: 'var(--text-muted)',
                                  marginBottom: '0.25rem',
                                  textTransform: 'uppercase',
                                  letterSpacing: '0.5px'
                                }}>
                                  {formatDateTime(log.created_at)}
                                </div>
                                <div style={{
                                  fontSize: '0.95rem',
                                  color: 'var(--text-primary)',
                                  marginBottom: '0.25rem',
                                  fontWeight: 600
                                }}>
                                  {log.event_type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                </div>
                                <div style={{
                                  fontSize: '0.85rem',
                                  color: 'var(--text-secondary)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '0.5rem'
                                }}>
                                  <User size={14} />
                                  <span>By: {performerName}</span>
                                </div>
                                {log.notes && (
                                  <div style={{
                                    marginTop: '0.5rem',
                                    paddingTop: '0.5rem',
                                    borderTop: '1px solid var(--border-color)',
                                    fontSize: '0.85rem',
                                    color: 'var(--text-secondary)',
                                    fontStyle: 'italic'
                                  }}>
                                    {log.notes}
                                  </div>
                                )}
                              </div>
                            </motion.div>
                          );
                        })}
                      </div>
                    )}
                  </motion.div>
                </>
              )}
            </>
          )}

          {!selectedAuditPositionId && !loading && (
            <div style={{
              textAlign: 'center',
              padding: '3rem',
              color: 'var(--text-secondary)',
              background: 'var(--card-bg)',
              borderRadius: '12px',
              border: '1px dashed var(--border-color)'
            }}>
              <BarChart size={48} style={{ marginBottom: '1rem', opacity: 0.5 }} />
              <p>Select a position above to view its audit trail and performance metrics.</p>
            </div>
          )}
        </motion.div>
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