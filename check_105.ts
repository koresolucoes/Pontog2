import { createClient } from '@supabase/supabase-js';
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data } = await supabase.from('venues').select('name, is_verified, lat, lng');
  const spData = data?.filter(v => v.lat < -23.0 && v.lat > -24.0);
  console.log('SP data count:', spData?.length);
  console.log('SP verified:', spData?.filter(v => v.is_verified).length);
  console.log('Sample unverified:', spData?.filter(v => !v.is_verified).slice(0, 5));
}
run();
