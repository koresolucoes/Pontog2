import { createClient } from '@supabase/supabase-js';
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const rjCoords = { lat: -22.9068, lng: -43.1729 };
  const { data: rjData } = await supabase.rpc('get_nearby_venues', {
      p_lat: rjCoords.lat,
      p_lng: rjCoords.lng
  });
  console.log('RJ Data count from RPC:', rjData?.length);
  
  const { data: globalData } = await supabase.from('venues').select('name, is_verified, lat, lng');
  const rjCount = globalData?.filter(v => v.lat < -22.0 && v.lat > -23.0).length;
  console.log('RJ Global count:', rjCount);
}
run();
