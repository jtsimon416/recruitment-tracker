import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ksfxucazcyiitaoytese.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtzZnh1Y2F6Y3lpaXRhb3l0ZXNlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk0ODE0NDEsImV4cCI6MjA3NTA1NzQ0MX0.pSB24GtIi_fWK7nEQXOmgpZU-zwUM1Q0y5GkE0piOE8';

console.log('🔧 Supabase Client Initialized with URL:', supabaseUrl);

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const SUPABASE_URL_BASE = supabaseUrl;