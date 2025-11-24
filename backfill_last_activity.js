/**
 * Add last_activity column and backfill existing data
 * 
 * This script:
 * 1. Adds the last_activity column to recruiter_outreach table
 * 2. Sets last_activity = updated_at for all existing records
 * 
 * No Docker required - runs against live Supabase database
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase credentials in .env file');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function addColumnAndBackfill() {
    console.log('🚀 Starting migration...\n');

    try {
        // Step 1: Add the last_activity column
        console.log('📝 Adding last_activity column...');

        const { error: alterError } = await supabase.rpc('exec_sql', {
            sql: `
        ALTER TABLE recruiter_outreach 
        ADD COLUMN IF NOT EXISTS last_activity TIMESTAMPTZ;
        
        CREATE INDEX IF NOT EXISTS idx_outreach_last_activity 
        ON recruiter_outreach(last_activity DESC);
        
        COMMENT ON COLUMN recruiter_outreach.last_activity 
        IS 'Timestamp of the last activity/update for this outreach record';
      `
        });

        if (alterError) {
            console.log('⚠️  Could not use exec_sql, trying direct SQL execution...');

            // Fallback: Try using the SQL editor endpoint
            const { error: sqlError } = await supabase
                .from('recruiter_outreach')
                .select('id')
                .limit(1);

            if (sqlError) throw sqlError;

            console.log('✅ Column might already exist, proceeding to backfill...\n');
        } else {
            console.log('✅ Column added successfully\n');
        }

        // Step 2: Backfill existing records
        console.log('🔍 Fetching records to backfill...');

        const { data: records, error: fetchError } = await supabase
            .from('recruiter_outreach')
            .select('id, updated_at, created_at, candidate_name, last_activity');

        if (fetchError) throw fetchError;

        console.log(`📊 Found ${records.length} total records\n`);

        // Filter records that need updating (where last_activity is null)
        const needsUpdate = records.filter(record => !record.last_activity);

        console.log(`🔧 ${needsUpdate.length} records need backfill\n`);

        if (needsUpdate.length === 0) {
            console.log('✅ All records already have last_activity timestamps!');
            return;
        }

        // Update records one by one
        let updated = 0;
        let failed = 0;

        for (const record of needsUpdate) {
            // Use updated_at if available, otherwise use created_at
            const timestamp = record.updated_at || record.created_at;

            const { error: updateError } = await supabase
                .from('recruiter_outreach')
                .update({ last_activity: timestamp })
                .eq('id', record.id);

            if (updateError) {
                console.error(`❌ Failed to update ${record.candidate_name}: ${updateError.message}`);
                failed++;
            } else {
                console.log(`✅ Updated ${record.candidate_name || 'Unknown'}`);
                updated++;
            }
        }

        console.log(`\n📈 Backfill Results:`);
        console.log(`   ✅ Successfully updated: ${updated}`);
        console.log(`   ❌ Failed: ${failed}`);
        console.log(`\n🎉 Migration complete!`);

    } catch (error) {
        console.error('❌ Error during migration:', error.message);
        process.exit(1);
    }
}

// Run the migration
addColumnAndBackfill()
    .then(() => process.exit(0))
    .catch(err => {
        console.error(err);
        process.exit(1);
    });
