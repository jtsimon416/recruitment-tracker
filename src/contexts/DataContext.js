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
  
  // --- New state to track candidate IDs with new comments ---
  const [newCommentCandidateIds, setNewCommentCandidateIds] = useState([]);

  useEffect(() => {
    loadAllData();

    // --- Supabase Real-time Subscription ---
    // Listen for new rows being inserted into the 'comments' table
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

    // Cleanup subscription on component unmount
    return () => {
      supabase.removeChannel(commentsSubscription);
    };
  }, []);

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
  
  // Function to clear notifications for a specific candidate
  const clearCommentNotifications = (candidateId) => {
    setNewCommentCandidateIds(prevIds => prevIds.filter(id => id !== candidateId));
  };

  async function refreshData() {
    await loadAllData();
  }

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
    newCommentCandidateIds,    // <-- Expose the array of IDs
    clearCommentNotifications  // <-- Expose the clearing function
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

