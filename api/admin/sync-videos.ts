import { createClient } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const supabaseAdmin = createClient(
      process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    
    // Get all videos
    const { data: videos, error: videosError } = await supabaseAdmin.from('videos').select('id');
    if (videosError) throw videosError;

    let updated = 0;
    for (const video of videos) {
      const { count: likesCount } = await supabaseAdmin
        .from('video_likes')
        .select('*', { count: 'exact', head: true })
        .eq('video_id', video.id);

      const { data: ratingsData } = await supabaseAdmin
        .from('video_ratings')
        .select('rating')
        .eq('video_id', video.id);

      let ratingsCount = 0;
      let averageRating = 5;
      if (ratingsData && ratingsData.length > 0) {
        ratingsCount = ratingsData.length;
        averageRating = ratingsData.reduce((acc, curr) => acc + curr.rating, 0) / ratingsCount;
      }

      const { error: updateError } = await supabaseAdmin
        .from('videos')
        .update({
          likes_count: likesCount || 0,
          ratings_count: ratingsCount || 0,
          rating: averageRating
        })
        .eq('id', video.id);

      if (!updateError) updated++;
    }

    return res.status(200).json({ success: true, updated });
  } catch (error: any) {
    console.error(error);
    return res.status(500).json({ error: error.message });
  }
}
