import { createClient } from '@supabase/supabase-js';
const supabase = createClient("https://wwmiqdovqgysncmqnmvp.supabase.co", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind3bWlxZG92cWd5c25jbXFubXZwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAzODU2MzEsImV4cCI6MjA3NTk2MTYzMX0.fVUzmHHZORcdI5SSm1HwSjEcDw_VZKyApw-qEi-kRkU");
async function run() {
  const { data, error } = await supabase.from('profiles').select('*').limit(1);
  console.log('rpc error:', error);
  console.log('rpc data length:', data?.length);
  if (data?.length > 0) {
    console.log('keys:', Object.keys(data[0]));
    console.log('current_checkin_venue_name:', data[0].current_checkin_venue_name);
  }
}
run();
