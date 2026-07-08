import { createClient } from '@supabase/supabase-js';

const supabase = createClient("https://wwmiqdovqgysncmqnmvp.supabase.co", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind3bWlxZG92cWd5c25jbXFubXZwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAzODU2MzEsImV4cCI6MjA3NTk2MTYzMX0.fVUzmHHZORcdI5SSm1HwSjEcDw_VZKyApw-qEi-kRkU");
async function run() {
  const { data, error } = await supabase.rpc('get_nearby_profiles', { p_lat: 0, p_lng: 0, p_radius_km: 100000 });
  console.log('rpc error:', error);
  console.log('rpc data length:', data?.length);
  if (data?.length > 0) {
    console.log('keys:', Object.keys(data[0]));
  }
}
run();
