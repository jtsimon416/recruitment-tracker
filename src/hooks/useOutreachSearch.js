import { useState } from 'react';
import { supabase } from '../services/supabaseClient';


export const useOutreachSearch = () => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [results, setResults] = useState(null);

    // Load saved results when roleId changes
    const loadSavedResults = (roleId) => {
        if (!roleId) {
            setResults(null);
            return;
        }
        const saved = localStorage.getItem(`outreach_results_${roleId}`);
        if (saved) {
            try {
                setResults(JSON.parse(saved));
            } catch (e) {
                console.error('Failed to parse saved search results', e);
            }
        } else {
            setResults(null);
        }
    };

    const generateSearch = async (role, location, skills, roleId) => {
        setLoading(true);
        setError(null);
        setResults(null);

        // 1. Check Daily Limit
        const today = new Date().toISOString().split('T')[0];
        const storageKey = `outreachSearchCount_${roleId}`;
        const storedData = JSON.parse(localStorage.getItem(storageKey) || '{}');

        if (storedData.date === today && storedData.count >= 2) {
            setLoading(false);
            setError('Daily limit reached for this role (2 searches per day).');
            return;
        }

        try {
            const { data, error } = await supabase.functions.invoke('hire-logic-ai', {
                body: {
                    action: 'generate_boolean_search',
                    role,
                    location,
                    skills
                }
            });

            if (error) throw error;

            setResults(data);

            // Save results for persistence
            localStorage.setItem(`outreach_results_${roleId}`, JSON.stringify(data));

            // Update Daily Limit
            const newCount = (storedData.date === today ? storedData.count : 0) + 1;
            localStorage.setItem(storageKey, JSON.stringify({ date: today, count: newCount }));

        } catch (err) {
            console.error('Error generating search:', err);

            let errorMessage = err.message || 'Failed to generate search strings.';

            // Try to extract more details if it's a FunctionsHttpError
            if (err && typeof err === 'object' && 'context' in err) {
                // Supabase client errors often hide the real response body deep down
                console.error('Full error context:', err.context);
            }

            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    return { generateSearch, loading, error, results, loadSavedResults };
};
