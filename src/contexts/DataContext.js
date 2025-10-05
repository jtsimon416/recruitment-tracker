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

  useEffect(() => {
    loadAllData();
  }, []);

  async function loadAllData() {
    setLoading(true);
    
    // Fetch all data in parallel
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
    setInterviews
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