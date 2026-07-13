import { createClient } from '@supabase/supabase-js';
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await supabase.rpc('execute_sql', { sql_query: `
    SELECT prosrc FROM pg_proc WHERE proname = 'get_nearby_venues';
  `});
  if (error) console.log("Error:", error);
  else console.log(data);
}
run();
