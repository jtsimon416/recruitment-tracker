// Complete code for src/contexts/DataContext.js with FINAL FIX for Schema Mismatch
import React, { createContext, useState, useEffect, useContext } from 'react';
import { supabase } from '../services/supabaseClient';

const DataContext = createContext();

export function DataProvider({ children }) {
  const [clients, setClients] = useState([]);
  const [positions, setPositions] = useState([]);
  const [candidates, setCandidates] = useState([]);
  const [recruiters, setRecruiters] = useState([]);
  const [pipeline, setPipeline] = useState([]);
  const [interviews, setInterviews] = useState([]);
  const [outreachActivities, setOutreachActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newCommentCandidateIds, setNewCommentCandidateIds] = useState([]);
  
  const [session, setSession] = useState(null);
  const [loadingSession, setLoadingSession] = useState(true);
  const [userProfile, setUserProfile] = useState(null);

  useEffect(() => {
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      setLoadingSession(false);
    };

    getSession();
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (loadingSession) setLoadingSession(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (session) {
      loadAllData();
      
      const commentsSubscription = supabase
        .channel('public:comments')
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'comments' },
          (payload) => {
            const newComment = payload.new;
            setNewCommentCandidateIds(prevIds => {
              if (prevIds.includes(newComment.candidate_id)) {
                return prevIds;
              }
              return [...prevIds, newComment.candidate_id];
            });
          }
        )
        .subscribe();
        
      return () => {
        supabase.removeChannel(commentsSubscription);
      };
    } else {
        setClients([]);
        setPositions([]);
        setCandidates([]);
        setRecruiters([]);
        setPipeline([]);
        setInterviews([]);
        setOutreachActivities([]);
        setLoading(false);
    }
  }, [session]);

  useEffect(() => {
    if (session?.user && recruiters.length > 0) {
      const profile = recruiters.find(r => r.email.toLowerCase() === session.user.email.toLowerCase());
      setUserProfile(profile);
    } else if (!session?.user) {
      setUserProfile(null);
    }
  }, [session, recruiters]);
  
  async function loadAllData() {
    setLoading(true);

    const [clientsRes, positionsRes, candidatesRes, recruitersRes, pipelineRes, interviewsRes, outreachRes] = await Promise.all([
      supabase.from('clients').select('*').order('company_name'),
      supabase.from('positions').select('*, clients(company_name)').order('created_at', { ascending: false }),
      supabase.from('candidates').select('*').order('name'),
      supabase.from('recruiters').select('*').order('name'),
      supabase.from('pipeline').select('*, candidates(name), recruiters(name), positions(title)'),
      supabase.from('interviews').select('*, candidates(name), positions(title)').order('interview_date', { ascending: true }),
      supabase.from('recruiter_outreach').select('*, positions(*, clients(*)), recruiters(name)').eq('is_archived', false).order('created_at', { ascending: false })
    ]);

    setClients(clientsRes.data || []);
    setPositions(positionsRes.data || []);
    setCandidates(candidatesRes.data || []);
    setRecruiters(recruitersRes.data || []);
    setPipeline(pipelineRes.data || []);
    setInterviews(interviewsRes.data || []);
    setOutreachActivities(outreachRes.data || []);
    setLoading(false);
  }
  
  const clearCommentNotifications = (candidateId) => {
    setNewCommentCandidateIds(prevIds => prevIds.filter(id => id !== candidateId));
  };

  async function refreshData() {
    await loadAllData();
  }
  
  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  // -------------------------------------------------------------------
  // 🟢 FINAL FIX: Inserting a single JSON object into the 'payload' column.
  const createNotification = async (payload) => {
    // --- DEBUG STEP 1: Check if the function was called ---
    console.log('--- DEBUG: createNotification called. Payload received: ', payload);

    // 1. Validate the payload required by DirectorReview.js
    if (!payload.recipient || !payload.message || !payload.type) {
      console.error('--- DEBUG ERROR: Notification payload is incomplete (missing recipient, message, or type).', payload);
      return false;
    }
    
    // 2. Format the data for the database's 'payload' column
    const notificationPayload = {
        recipient_email: payload.recipient,
        message: payload.message,
        type: payload.type,
    };

    // --- DEBUG STEP 2: Confirm payload passed validation ---
    console.log('--- DEBUG: Payload VALID. Attempting DB insert into payload column...');

    // 3. Perform the database insert into the correct 'payload' column.
    const { error } = await supabase
      .from('notification_outbox')
      .insert({
        // THIS IS THE FIX: Insert the whole object into the 'payload' column
        payload: notificationPayload,
      });

    if (error) {
      // If you see this error, the problem is RLS or the table structure is STILL different.
      console.error('--- DEBUG ERROR: Supabase Error creating notification record (RLS/Schema issue?):', error);
      return false;
    }

    // --- DEBUG STEP 3: Confirm DB success ---
    console.log('--- DEBUG: DB Insert SUCCESSFUL. Check Supabase Table Editor now. N8N should be triggered!');
    return true;
  };
  // -------------------------------------------------------------------


  // This function can remain for individual refresh actions if needed
  async function fetchAllOutreachActivities() {
    const { data, error } = await supabase
      .from('recruiter_outreach')
      .select('*, positions(*, clients(*)), recruiters(name)')
      .eq('is_archived', false)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching all outreach activities:', error);
      setOutreachActivities([]);
    } else {
      setOutreachActivities(data || []);
    }
  }

  async function fetchMyOutreachActivities(recruiterId) {
    if (!recruiterId) return null;
    const { data, error } = await supabase
      .from('recruiter_outreach')
      .select('*, positions(title, clients(company_name))')
      .eq('recruiter_id', recruiterId)
      .eq('is_archived', false)
      .not('activity_status', 'in', '(cold,gone_cold)')
      .order('created_at', { ascending: false });

    if (!error) return data;
    console.error('Error fetching my outreach activities:', error);
    return null;
  }

  async function addOutreachActivity(activityData) {
    if (!userProfile) return { success: false, error: { message: 'User profile not loaded' } };
    const dataToInsert = { ...activityData, recruiter_id: userProfile.id };
    const { error } = await supabase.from('recruiter_outreach').insert([dataToInsert]);
    if (error) {
      console.error('Error creating outreach activity:', error);
      return { success: false, error };
    }
    await refreshData(); // This ensures all data is up-to-date after the change
    return { success: true };
  }

  async function updateOutreachActivity(id, updates) {
    const { error } = await supabase
      .from('recruiter_outreach')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      console.error('Error updating outreach activity:', error);
      return { success: false, error };
    }
    await refreshData(); // This ensures all data is up-to-date after the change
    return { success: true };
  }

  async function deleteOutreachActivity(id) {
    const { error } = await supabase
      .from('recruiter_outreach')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting outreach activity:', error);
      return { success: false, error };
    }
    await refreshData(); // This ensures all data is up-to-date after the change
    return { success: true };
  }

  async function fetchPositions() {
    const { data, error } = await supabase.from('positions').select('*, clients(company_name)').order('title');
    if (error) console.error('Error fetching positions:', error);
    else setPositions(data || []);
  }

  // -------------------------------------------------------------------
  // UTILITY FUNCTIONS FOR SOURCING HISTORY & TALENT POOL INTEGRATION
  // -------------------------------------------------------------------

  // Normalize LinkedIn URLs for consistent comparison
  // IMPORTANT: This must match the normalization in RecruiterOutreach.js
  function normalizeLinkedInUrl(url) {
    if (!url) return '';

    // Convert to lowercase
    let normalized = url.toLowerCase().trim();

    // Remove protocol (http://, https://)
    normalized = normalized.replace(/^https?:\/\//, '');

    // Remove www.
    normalized = normalized.replace(/^www\./, '');

    // Remove trailing slash
    normalized = normalized.replace(/\/$/, '');

    // Remove query parameters and fragments
    normalized = normalized.split('?')[0].split('#')[0];

    return normalized;
  }

  // Fetch all outreach records (for Smart Filters in Talent Pool)
  async function fetchAllOutreachRecords() {
    const { data, error } = await supabase
      .from('recruiter_outreach')
      .select('*, positions(title), recruiters(name)');

    if (error) {
      console.error('Error fetching outreach records:', error);
      return [];
    }

    return data || [];
  }

  // Archive outreach for a closed position (creates shell profiles)
  async function archiveOutreachForPosition(positionId) {
    try {
      console.log(`🗄️ Starting archive process for position: ${positionId}`);

      // 1. Get all outreach for this position
      const { data: outreachRecords, error: fetchError } = await supabase
        .from('recruiter_outreach')
        .select('*')
        .eq('position_id', positionId);

      if (fetchError) throw fetchError;

      console.log(`📋 Found ${outreachRecords.length} outreach records for this position`);

      // 2. Fetch all existing candidates for comparison
      const { data: allCandidates, error: candidatesError } = await supabase
        .from('candidates')
        .select('id, linkedin_url');

      if (candidatesError) throw candidatesError;

      // 3. Build Set of existing normalized URLs for fast lookup
      const existingCandidateUrls = new Set(
        allCandidates?.map(c => normalizeLinkedInUrl(c.linkedin_url)).filter(Boolean) || []
      );

      console.log(`👥 Found ${existingCandidateUrls.size} existing candidates in database`);

      // 4. Process records
      const newCandidatesToInsert = [];
      const recordIdsToUpdate = [];
      let skippedCount = 0;

      for (const record of outreachRecords) {
        // Skip "Ready for Submission" records - they should stay active
        if (record.activity_status === 'ready_for_submission') {
          console.log(`⏭️ Skipping record ID ${record.id} (Ready for Submission)`);
          skippedCount++;
          continue;
        }

        const normalizedUrl = normalizeLinkedInUrl(record.linkedin_url);

        if (!normalizedUrl) {
          console.warn(`⚠️ Skipping outreach record ID ${record.id} (Invalid URL)`);
          skippedCount++;
          continue;
        }

        // Track this record for archiving flag
        recordIdsToUpdate.push(record.id);

        // Check if candidate already exists
        if (existingCandidateUrls.has(normalizedUrl)) {
          console.log(`✅ Candidate already exists: ${record.candidate_name}`);
          skippedCount++;
        } else {
          // Add to existing URLs set to prevent duplicates in this batch
          existingCandidateUrls.add(normalizedUrl);

          // Prepare shell profile for insertion
          const shellProfile = {
            name: record.candidate_name || 'Archived Candidate',
            linkedin_url: record.linkedin_url,
            phone: record.activity_status === 'call_scheduled' ? record.candidate_phone : null,
            profile_type: 'shell',
            created_by_recruiter: 'System Archive',
            status: 'Archived',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };

          newCandidatesToInsert.push(shellProfile);
        }
      }

      console.log(`📊 Prepared ${newCandidatesToInsert.length} new profiles. Skipped ${skippedCount} (Existing, Invalid URL, or Ready for Submission)`);

      // 5. Insert new candidates if any
      if (newCandidatesToInsert.length > 0) {
        const { error: insertError } = await supabase
          .from('candidates')
          .insert(newCandidatesToInsert);

        if (insertError) {
          console.error('❌ Error inserting new shell profiles:', insertError);
          return {
            success: false,
            error: `Failed to insert shell profiles: ${insertError.message}`
          };
        }
        console.log(`✅ Successfully inserted ${newCandidatesToInsert.length} new shell profiles`);
      } else {
        console.log('ℹ️ No new candidates to insert');
      }

      // 6. Flag original outreach records as archived
      if (recordIdsToUpdate.length > 0) {
        console.log(`🏷️ Flagging ${recordIdsToUpdate.length} original outreach records as archived...`);
        const { error: updateError } = await supabase
          .from('recruiter_outreach')
          .update({
            is_archived: true,
            updated_at: new Date().toISOString()
          })
          .in('id', recordIdsToUpdate);

        if (updateError) {
          console.error('❌ Error flagging original outreach records:', updateError);
          // Don't fail the whole process, but log it
        } else {
          console.log('✅ Successfully flagged original records as archived');
        }
      }

      // 7. Refresh data
      await refreshData();

      console.log(`🎉 Archive complete! Created: ${newCandidatesToInsert.length}, Skipped: ${skippedCount}`);

      return {
        success: true,
        newProfilesCreated: newCandidatesToInsert.length,
        existingProfilesSkipped: skippedCount
      };

    } catch (error) {
      console.error('❌ Error archiving outreach:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  const isDirectorOrManager = userProfile?.role?.toLowerCase().includes('director') || userProfile?.role?.toLowerCase().includes('manager');

  const value = {
    clients,
    positions,
    candidates,
    recruiters,
    pipeline,
    interviews,
    outreachActivities,
    loading,
    refreshData,
    setClients,
    setPositions,
    setCandidates,
    setRecruiters,
    setPipeline,
    setInterviews,
    setOutreachActivities,
    newCommentCandidateIds,
    clearCommentNotifications,
    session,
    loadingSession,
    handleLogout,
    user: session?.user,
    userProfile,
    isDirectorOrManager,
    createNotification,
    fetchAllOutreachActivities,
    fetchMyOutreachActivities,
    addOutreachActivity,
    updateOutreachActivity,
    deleteOutreachActivity,
    fetchPositions,
    // New functions for sourcing history integration
    normalizeLinkedInUrl,
    fetchAllOutreachRecords,
    archiveOutreachForPosition,
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData() {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within DataProvider');
  }
  return context;
}