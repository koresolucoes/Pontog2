import { createClient } from '@supabase/supabase-js';
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const spCoords = { lat: -23.5505, lng: -46.6333 };
  const { data: spData, error } = await supabase.rpc('get_nearby_venues', {
      p_lat: spCoords.lat,
      p_lng: spCoords.lng,
      radius_km: 50
  });
  console.log('SP Data count:', spData?.length, error);
}
run();
