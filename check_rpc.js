import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
async function check() {
    const { data, error } = await supabase.rpc('increment_video_views', { p_video_id: 1 });
    console.log("RPC Error:", error);
}
check();
