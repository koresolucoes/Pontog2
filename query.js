import { createClient } from '@supabase/supabase-js';
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
async function run() {
  const { data, error } = await supabase.rpc('get_nearby_profiles', { p_lat: -23.55, p_lng: -46.63 });
  console.log('rpc result', data?.[0] ? Object.keys(data[0]) : 'no data', error);
}
run();
