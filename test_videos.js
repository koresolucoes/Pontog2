import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

let env = {};
if(fs.existsSync('.env.local')) {
  env = Object.fromEntries(fs.readFileSync('.env.local', 'utf-8').split('\n').filter(l=>l.includes('=')).map(l=>l.split('=')));
}
const supabase = createClient(env.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY);

async function check() {
    const { data, error } = await supabase.from('videos').select('*').limit(1);
    console.log("Videos Data:", data);
}
check();
