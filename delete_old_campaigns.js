const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await supabase.from('b2b_campaigns')
    .delete()
    .in('title', ['Destaque: Pino Dourado', 'Destaque: Banner no Feed']);
  console.log("Deleted old campaigns:", error || data);
}
run();
