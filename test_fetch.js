import { createClient } from '@supabase/supabase-js';
const supabaseUrl = "https://wwmiqdovqgysncmqnmvp.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind3bWlxZG92cWd5c25jbXFubXZwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAzODU2MzEsImV4cCI6MjA3NTk2MTYzMX0.fVUzmHHZORcdI5SSm1HwSjEcDw_VZKyApw-qEi-kRkU";
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  const { data, error } = await supabase
      .from('videos')
      .select(`
          *,
          profiles (
              username,
              display_name,
              avatar_url,
              date_of_birth,
              lat,
              lng,
              subscription_tier,
              oral_preference,
              accommodation_preference
          )
      `)
      .order('created_at', { ascending: false });
  console.log("Fetch videos error?", error);
}
run();
