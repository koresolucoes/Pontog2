import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://wwmiqdovqgysncmqnmvp.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind3bWlxZG92cWd5c25jbXFubXZwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAzODU2MzEsImV4cCI6MjA3NTk2MTYzMX0.fVUzmHHZORcdI5SSm1HwSjEcDw_VZKyApw-qEi-kRkU";
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function test() {
    const { data, error } = await supabase.from('videos').select('*').eq('id', 4).single();
    if (error) {
        console.error("Error fetching video 4:", error);
    } else {
        console.log("Video 4 row:", data);
    }
}
test();
