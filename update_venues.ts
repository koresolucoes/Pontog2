import { createClient } from '@supabase/supabase-js';
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const imageUrl = "https://wwmiqdovqgysncmqnmvp.supabase.co/storage/v1/object/public/user_uploads/venues/admin_1783156694224.png";
  
  console.log("Updating unverified venues...");
  // update unverified to verified
  const { data: updated1, error: err1 } = await supabase
    .from('venues')
    .update({ is_verified: true })
    .eq('is_verified', false)
    .select('id');
    
  console.log(`Verified ${updated1?.length || 0} venues.`, err1 || '');
  
  console.log("Updating venues with missing images...");
  // update null images
  const { data: updated2, error: err2 } = await supabase
    .from('venues')
    .update({ image_url: imageUrl })
    .is('image_url', null)
    .select('id');
    
  console.log(`Updated ${updated2?.length || 0} missing images.`, err2 || '');

  // update empty string images
  const { data: updated3, error: err3 } = await supabase
    .from('venues')
    .update({ image_url: imageUrl })
    .eq('image_url', '')
    .select('id');
    
  console.log(`Updated ${updated3?.length || 0} empty images.`, err3 || '');
}
run();
