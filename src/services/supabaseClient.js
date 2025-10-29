import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://mdpkfhconvhaikfwpggl.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1kcGtmaGNvbnZoYWlrZndwZ2dsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUyMjE4NjcsImV4cCI6MjA3MDc5Nzg2N30.wE52QzhHadKB2lDJhTh4xdliF2rOOnhYOHGwVxi4yYQ';

console.log('🔧 Supabase Client Initialized with URL:', supabaseUrl);

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const SUPABASE_URL_BASE = supabaseUrl;