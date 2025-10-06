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
  
  // --- NEW AUTH STATE ---
  const [session, setSession] = useState(null);
  const [loadingSession, setLoadingSession] = useState(true);
  // -----------------------

  useEffect(() => {
    // 1. Handle Auth Session
    const getSession = async () => {
      // Get initial session state
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      setLoadingSession(false);
    };

    getSession();
    
    // Auth Listener: Update session state whenever auth status changes (login/logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (loadingSession) setLoadingSession(false);
    });

    // Cleanup subscription on component unmount
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Use a separate effect to load application data *only* after session is confirmed
  useEffect(() => {
    if (session) {
      loadAllData();
      
      // --- Supabase Real-time Subscription (Now inside session check) ---
      // This listener handles new comments to update the sidebar badge
      const commentsSubscription = supabase
        .channel('public:comments')
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'comments' },
          (payload) => {
            const newComment = payload.new;
            // Add the candidate ID to our notification list
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
        // Clear data when logged out
        setClients([]);
        setPositions([]);
        setCandidates([]);
        setRecruiters([]);
        setPipeline([]);
        setInterviews([]);
        setLoading(false);
    }
  }, [session]);
  
  // Existing loadAllData function
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
  
  // --- NEW LOGOUT FUNCTION ---
  const handleLogout = async () => {
    await supabase.auth.signOut();
  };
  // ---------------------------

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
    // --- NEW EXPOSED AUTH VALUES ---
    session,
    loadingSession,
    handleLogout,
    user: session?.user, // Expose the current user object
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