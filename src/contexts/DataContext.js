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
      supabase.from('recruiter_outreach').select('*, positions(*, clients(*)), recruiters(name)').order('created_at', { ascending: false })
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
      .neq('activity_status', 'cold')
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
    const { data, error } = await supabase.from('positions').select('*').order('title');
    if (error) console.error('Error fetching positions:', error);
    else setPositions(data || []);
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