import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function clean() {
    const { data, error } = await supabase.from('venue_posts').select('*');
    if (error) {
        console.error("Error", error);
        return;
    }
    for (const post of data) {
        if (post.content && post.content.includes('[Push Raio de')) {
            const newContent = post.content.replace(/\[Push Raio de .*\] /, '').trim();
            await supabase.from('venue_posts').update({ content: newContent }).eq('id', post.id);
            console.log("Updated", post.id, "to", newContent);
        }
    }
}
clean();
