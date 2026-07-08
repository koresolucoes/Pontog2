import { createClient } from '@supabase/supabase-js';

const supabase = createClient("https://wwmiqdovqgysncmqnmvp.supabase.co", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind3bWlxZG92cWd5c25jbXFubXZwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAzODU2MzEsImV4cCI6MjA3NTk2MTYzMX0.fVUzmHHZORcdI5SSm1HwSjEcDw_VZKyApw-qEi-kRkU");
async function run() {
  const { data, error } = await supabase.from('profiles').select('*').limit(1);
  console.log('profiles keys:', data?.[0] ? Object.keys(data[0]) : 'no data');
  if (error) console.error('profiles error:', error);
}
run();
