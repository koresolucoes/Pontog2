import { createClient } from '@supabase/supabase-js';
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data } = await supabase.from('venues').select('is_verified').eq('city', 'São Paulo');
  console.log('SP verified count:', data?.filter(v => v.is_verified).length);
  console.log('SP total count:', data?.length);
}
run();
