import { createClient } from '@supabase/supabase-js';
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const spCoords = { lat: -23.5505, lng: -46.6333 };
  const rjCoords = { lat: -22.9068, lng: -43.1729 };
  
  const { data: spData, error: spError } = await supabase.rpc('get_nearby_venues', {
      p_lat: spCoords.lat,
      p_lng: spCoords.lng
  });
  console.log('SP Data:', spData?.length, spError);
  
  const { data: globalData } = await supabase.from('venues').select('id, city, lat, lng');
  console.log('Global Venues count:', globalData?.length);
  const spCount = globalData?.filter(v => v.lat < -23.0 && v.lat > -24.0).length;
  console.log('SP Global count:', spCount);
}
run();
