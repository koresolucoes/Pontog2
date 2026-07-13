import { createClient } from '@supabase/supabase-js';
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data } = await supabase.from('venues').select('name, is_verified, lat, lng, image_url');
  const spData = data?.filter(v => v.lat < -23.0 && v.lat > -24.0);
  console.log('SP data count:', spData?.length);
  console.log('SP with image:', spData?.filter(v => v.image_url != null && v.image_url !== '').length);
}
run();
