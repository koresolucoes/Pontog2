// api/agora-posts.ts
import { createClient } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).end('Method Not Allowed');
  }

  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = (page - 1) * limit;

    // Initialize Supabase Admin client
    const supabaseAdmin = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } }
    ) as any;

    // Get current authenticated user if Authorization header is provided
    let currentUserId: string | null = null;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.replace('Bearer ', '');
      try {
        const { data: { user } } = await supabaseAdmin.auth.getUser(token);
        if (user) {
          currentUserId = user.id;
        }
      } catch (e) {
        console.warn('Failed to resolve authenticated user from token:', e);
      }
    }

    // Fetch active agora posts (expires_at > now)
    const { data: posts, error: postsError } = await supabaseAdmin
      .from('agora_posts')
      .select(`
        *,
        profiles:user_id (
          username,
          avatar_url,
          date_of_birth
        )
      `)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (postsError) {
      console.error('Error fetching agora posts via Admin client:', postsError);
      return res.status(500).json({ error: postsError.message });
    }

    if (!posts || posts.length === 0) {
      return res.status(200).json({ data: [] });
    }

    const postIds = posts.map((p: any) => p.id);

    // Fetch likes count and if current user liked
    const { data: likesData, error: likesError } = await supabaseAdmin
      .from('agora_post_likes')
      .select('post_id, user_id')
      .in('post_id', postIds);

    // Fetch comments count
    const { data: commentsData, error: commentsError } = await supabaseAdmin
      .from('agora_post_comments')
      .select('post_id')
      .in('post_id', postIds);

    // Map likes and comments counts
    const likesMap: Record<number, number> = {};
    const commentsMap: Record<number, number> = {};
    const userLikesSet = new Set<number>();

    if (!likesError && likesData) {
      likesData.forEach((l: any) => {
        likesMap[l.post_id] = (likesMap[l.post_id] || 0) + 1;
        if (currentUserId && l.user_id === currentUserId) {
          userLikesSet.add(l.post_id);
        }
      });
    }

    if (!commentsError && commentsData) {
      commentsData.forEach((c: any) => {
        commentsMap[c.post_id] = (commentsMap[c.post_id] || 0) + 1;
      });
    }

    const formattedPosts = posts.map((p: any) => {
      return {
        ...p,
        likes_count: likesMap[p.id] || 0,
        comments_count: commentsMap[p.id] || 0,
        user_has_liked: userLikesSet.has(p.id)
      };
    });

    return res.status(200).json({ data: formattedPosts });
  } catch (error: any) {
    console.error('Unhandled server error in /api/agora-posts:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
