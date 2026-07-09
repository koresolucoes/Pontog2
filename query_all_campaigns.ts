import { createClient } from '@supabase/supabase-js';
const supabase = createClient(process.env.VITE_SUPABASE_URL || '', process.env.VITE_SUPABASE_ANON_KEY || '');
async function run() {
    const { data, error } = await supabase.from('b2b_campaigns').select('*');
    console.log(data);
}
run();
