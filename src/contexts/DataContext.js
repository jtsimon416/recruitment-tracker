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

  // --- NEW NOTIFICATION FUNCTION ---
  // This function will be called by other components to create a notification
  const createNotification = async (payload) => {
    const { error } = await supabase.from('notification_outbox').insert([{ payload }]);
    if (error) {
      console.error('Error creating notification:', error);
      // Optionally, you could add more robust error handling here
      // For now, we'll just log it.
    }
  };
  // ------------------------------------

  const value = {
    clients,
    positions,
    candidates,
    recruiters,
    pipeline,
    interviews,
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
    // --- EXPOSE THE NEW FUNCTION ---
    createNotification,
    // -------------------------------
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