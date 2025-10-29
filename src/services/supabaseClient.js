import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || 'https://ksfxucazcyiitaoytese.supabase.co';
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtzZnh1Y2F6Y3lpaXRhb3l0ZXNlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk0ODE0NDEsImV4cCI6MjA3NTA1NzQ0MX0.pSB24GtIi_fWK7nEQXOmgpZU-zwUM1Q0y5GkE0piOE8';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const SUPABASE_URL_BASE = supabaseUrl;