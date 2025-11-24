
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase URL or Key in .env file');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function resetStageTimers() {
    console.log('🔄 Resetting stage timers for candidates in advanced stages...');

    // 1. Get all pipeline items that are NOT in 'Screening'
    const { data: items, error: fetchError } = await supabase
        .from('pipeline')
        .select('id, stage, candidates(name)')
        .neq('stage', 'Screening');

    if (fetchError) {
        console.error('Error fetching pipeline items:', fetchError);
        return;
    }

    console.log(`Found ${items.length} candidates in advanced stages.`);

    // 2. Update them to have updated_at = NOW()
    const now = new Date().toISOString();

    // We'll do this in batches or just one by one for safety/logging
    let updatedCount = 0;

    for (const item of items) {
        const { error: updateError } = await supabase
            .from('pipeline')
            .update({ updated_at: now })
            .eq('id', item.id);

        if (updateError) {
            console.error(`Failed to update ${item.candidates?.name}:`, updateError);
        } else {
            updatedCount++;
        }
    }

    console.log(`✅ Successfully reset timers for ${updatedCount} candidates.`);
    console.log('They will now show "Today" or "0 days" in the Time in Stage view.');
}

resetStageTimers();
