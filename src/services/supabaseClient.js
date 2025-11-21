import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

console.log('🔧 Supabase Client Initialized with URL:', supabaseUrl);

const supabase = createClient(supabaseUrl, supabaseAnonKey);
const SUPABASE_URL_BASE = supabaseUrl;

export { supabase, SUPABASE_URL_BASE };