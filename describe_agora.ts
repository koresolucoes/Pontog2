import { createClient } from '@supabase/supabase-js';
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await supabase.from('agora_posts').select('*').limit(1);
  if (data) {
    console.log(data[0] ? Object.keys(data[0]) : "No records");
  } else {
    console.log("No data or error", error);
  }
}
run();
