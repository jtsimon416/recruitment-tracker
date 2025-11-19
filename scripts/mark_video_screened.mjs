import { supabase } from '../src/services/supabaseClient.js';

// Update all pipeline entries that are not marked as video screened
const { data, error } = await supabase
    .from('pipeline')
    .update({ is_video_screened: true, video_screen_reason: null })
    .neq('is_video_screened', true);

if (error) {
    console.error('Error updating pipeline rows:', error);
    process.exit(1);
} else {
    console.log('Successfully updated pipeline rows:', data);
    process.exit(0);
}
