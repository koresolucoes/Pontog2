import { createClient } from '@supabase/supabase-js';
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const spCoords = { lat: -23.5505, lng: -46.6333 };
  
  const { data: spData } = await supabase.rpc('get_nearby_venues', {
      p_lat: spCoords.lat,
      p_lng: spCoords.lng
  });
  console.log('RPC distances from center:', spData?.map(v => Math.sqrt(Math.pow(v.lat - spCoords.lat, 2) + Math.pow(v.lng - spCoords.lng, 2))));
  
  const { data: allSp } = await supabase.from('venues').select('name, lat, lng');
  const spFiltered = allSp?.filter(v => v.lat < -23.0 && v.lat > -24.0);
  const distances = spFiltered?.map(v => Math.sqrt(Math.pow(v.lat - spCoords.lat, 2) + Math.pow(v.lng - spCoords.lng, 2))).sort((a,b)=>a-b);
  console.log('All SP distances:', distances?.slice(0, 20));
}
run();
