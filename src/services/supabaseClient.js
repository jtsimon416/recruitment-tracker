import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || 'https://bdbjbgxwwxbawpsefpam.supabase.co';
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJkYmpiZ3h3d3hiYXdwc2VmcGFtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE2Nzg4ODIsImV4cCI6MjA3NzI1NDg4Mn0.x8WxAVeSeeOs3yJ5Qg7Xb25PfDy9M1QdocRnp58Nh3E';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const SUPABASE_URL_BASE = supabaseUrl;