import { createClient } from '@supabase/supabase-js';
const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_ANON_KEY!);

async function run() {
  const { data, error } = await supabase.from('b2b_campaigns')
    .delete()
    .in('title', ['Destaque: Pino Dourado', 'Destaque: Banner no Feed']);
  console.log("Deleted old campaigns:", error || data);
}
run();
