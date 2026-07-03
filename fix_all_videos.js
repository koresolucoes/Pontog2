import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://wwmiqdovqgysncmqnmvp.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind3bWlxZG92cWd5c25jbXFubXZwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAzODU2MzEsImV4cCI6MjA3NTk2MTYzMX0.fVUzmHHZORcdI5SSm1HwSjEcDw_VZKyApw-qEi-kRkU";
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function check() {
    const { data: videos, error: videosError } = await supabase.from('videos').select('id');
    if (videosError) throw videosError;

    let updated = 0;
    for (const video of videos) {
      const { count: likesCount } = await supabase
        .from('video_likes')
        .select('*', { count: 'exact', head: true })
        .eq('video_id', video.id);

      const { data: ratingsData } = await supabase
        .from('video_ratings')
        .select('rating')
        .eq('video_id', video.id);

      let ratingsCount = 0;
      let averageRating = 5;
      if (ratingsData && ratingsData.length > 0) {
        ratingsCount = ratingsData.length;
        averageRating = ratingsData.reduce((acc, curr) => acc + curr.rating, 0) / ratingsCount;
      }

      console.log(`Video ${video.id}: likes=${likesCount}, ratings=${ratingsCount}`);

      const { error: updateError } = await supabase
        .from('videos')
        .update({
          likes_count: likesCount || 0,
          ratings_count: ratingsCount || 0,
          rating: averageRating
        })
        .eq('id', video.id);

      if (!updateError) updated++;
      else console.error(updateError);
    }
    console.log("Updated", updated, "videos");
}
check();
