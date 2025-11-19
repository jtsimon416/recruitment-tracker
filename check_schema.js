
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ksfxucazcyiitaoytese.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtzZnh1Y2F6Y3lpaXRhb3l0ZXNlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk0ODE0NDEsImV4cCI6MjA3NTA1NzQ0MX0.pSB24GtIi_fWK7nEQXOmgpZU-zwUM1Q0y5GkE0piOE8';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkSchema() {
    console.log('Checking pipeline table schema...');

    // Try to select the columns. If they don't exist, Supabase will return an error.
    const { data, error } = await supabase
        .from('pipeline')
        .select('is_video_screened, video_screen_reason')
        .limit(1);

    if (error) {
        console.error('Error accessing columns:', error.message);
        console.log('Columns likely do NOT exist.');
    } else {
        console.log('Successfully selected columns. They exist.');
    }
}

checkSchema();
