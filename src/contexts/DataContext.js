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
  
  async function loadAllData() {
    setLoading(true);
    
    const [clientsRes, positionsRes, candidatesRes, recruitersRes, pipelineRes, interviewsRes] = await Promise.all([
      supabase.from('clients').select('*').order('company_name'),
      supabase.from('positions').select('*, clients(company_name)').order('created_at', { ascending: false }),
      supabase.from('candidates').select('*').order('name'),
      supabase.from('recruiters').select('*').order('name'),
      supabase.from('pipeline').select('*, candidates(name), recruiters(name), positions(title)'),
      supabase.from('interviews').select('*, candidates(name), positions(title)').order('interview_date', { ascending: true })
    ]);

    setClients(clientsRes.data || []);
    setPositions(positionsRes.data || []);
    setCandidates(candidatesRes.data || []);
    setRecruiters(recruitersRes.data || []);
    setPipeline(pipelineRes.data || []);
    setInterviews(interviewsRes.data || []);
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

  // --- UPDATED NOTIFICATION FUNCTION (WEBHOOK VERSION) ---
  const DIRECTOR_EMAIL = 'brian.griffiths@brydongama.com';

  const createNotification = async (payload) => {
    // Validate payload has required fields
    if (!payload.recipient || !payload.message) {
      console.error('Invalid notification payload:', payload);
      return;
    }

    // NEW: Add this Director check here
    const { data: { user } } = await supabase.auth.getUser();
    const userEmailClean = user?.email?.toLowerCase().trim();
    const directorEmailClean = DIRECTOR_EMAIL.toLowerCase().trim();
    const isDirector = userEmailClean === directorEmailClean;

    if (!isDirector) {
      console.log('🚫 Email notification blocked: User is not Director');
      return;
    }

    console.log('✅ Director action detected - sending notification');

    try {
      // Call N8N webhook directly instead of writing to database
      const response = await fetch('https://jtsimon416.app.n8n.cloud/webhook/hire-logic-notifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        console.log('✅ Notification sent via webhook:', payload.type);
      } else {
        console.error('❌ Webhook failed:', response.status);
        // Fallback: write to database if webhook fails
        await supabase.from('notification_outbox').insert([{
          payload,
          status: 'pending'
        }]);
        console.log('📝 Fallback: Notification saved to database');
      }
    } catch (error) {
      console.error('Error sending notification:', error);
      // Fallback: write to database if webhook fails
      try {
        await supabase.from('notification_outbox').insert([{
          payload,
          status: 'pending'
        }]);
        console.log('📝 Fallback: Notification saved to database');
      } catch (dbError) {
        console.error('❌ Both webhook and database failed:', dbError);
      }
    }
  };
  // ------------------------------------

  // --- OUTREACH ACTIVITY FUNCTIONS ---
  async function fetchAllOutreachActivities() {
    const { data, error } = await supabase
      .from('recruiter_outreach')
      .select('*, recruiters(name, email), positions(title, clients(company_name))')
      .neq('activity_status', 'cold')
      .order('created_at', { ascending: false });

    if (!error) {
      // Calculate followup_needed
      const now = new Date();
      const updated = data.map(activity => {
        if (activity.activity_status === 'outreach_sent') {
          const daysSinceOutreach = Math.floor((now - new Date(activity.created_at)) / (1000 * 60 * 60 * 24));
          const daysSinceFollowup = activity.last_followup_date
            ? Math.floor((now - new Date(activity.last_followup_date)) / (1000 * 60 * 60 * 24))
            : daysSinceOutreach;

          activity.followup_needed = daysSinceFollowup >= 3;
          activity.days_since_last_contact = daysSinceFollowup;
        }
        return activity;
      });
      setOutreachActivities(updated);
    } else {
      console.error('Error fetching outreach activities:', error);
    }
  }

  async function fetchMyOutreachActivities(userEmail) {
    // Look up recruiter_id from recruiters table using email
    const { data: recruiterData, error: recruiterError } = await supabase
      .from('recruiters')
      .select('id')
      .eq('email', userEmail)
      .single();

    if (recruiterError || !recruiterData) {
      console.error('Error finding recruiter by email:', recruiterError);
      return null;
    }

    const { data, error } = await supabase
      .from('recruiter_outreach')
      .select('*, positions(title, clients(company_name))')
      .eq('recruiter_id', recruiterData.id)
      .neq('activity_status', 'cold')
      .order('created_at', { ascending: false });

    if (!error) {
      // Calculate followup_needed
      const now = new Date();
      const updated = data.map(activity => {
        if (activity.activity_status === 'outreach_sent') {
          const daysSinceOutreach = Math.floor((now - new Date(activity.created_at)) / (1000 * 60 * 60 * 24));
          const daysSinceFollowup = activity.last_followup_date
            ? Math.floor((now - new Date(activity.last_followup_date)) / (1000 * 60 * 60 * 24))
            : daysSinceOutreach;

          activity.followup_needed = daysSinceFollowup >= 3;
          activity.days_since_last_contact = daysSinceFollowup;
        }
        return activity;
      });
      return updated;
    } else {
      console.error('Error fetching my outreach activities:', error);
      return null;
    }
  }

  async function createOutreachActivity(activityData) {
    // Get the current user's email
    const userEmail = session?.user?.email;

    if (!userEmail) {
      console.error('No user email found');
      return { success: false, error: { message: 'User not authenticated' } };
    }

    // Look up recruiter_id from recruiters table using email
    const { data: recruiterData, error: recruiterError } = await supabase
      .from('recruiters')
      .select('id')
      .eq('email', userEmail)
      .single();

    if (recruiterError || !recruiterData) {
      console.error('Error finding recruiter by email:', recruiterError);
      return { success: false, error: { message: 'Recruiter not found for this email' } };
    }

    // Add the correct recruiter_id to the activity data
    const dataWithRecruiterId = {
      ...activityData,
      recruiter_id: recruiterData.id
    };

    const { error } = await supabase
      .from('recruiter_outreach')
      .insert([dataWithRecruiterId]);

    if (error) {
      console.error('Error creating outreach activity:', error);
      return { success: false, error };
    }

    await fetchAllOutreachActivities();
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

    await fetchAllOutreachActivities();
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

    await fetchAllOutreachActivities();
    return { success: true };
  }

  async function fetchPositions() {
    const { data, error } = await supabase
      .from('positions')
      .select('*')
      .order('title');

    if (error) {
      console.error('Error fetching positions:', error);
    } else {
      setPositions(data || []);
    }
  }
  // ------------------------------------

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
    newCommentCandidateIds,
    clearCommentNotifications,
    session,
    loadingSession,
    handleLogout,
    user: session?.user,
    createNotification,
    fetchAllOutreachActivities,
    fetchMyOutreachActivities,
    createOutreachActivity,
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