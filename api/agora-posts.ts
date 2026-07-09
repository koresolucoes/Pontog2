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

  // Prevent browser and proxy caching of dynamic feeds
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');

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

    // Helper function to generate unique integer hashes from UUID strings to prevent breaking types
    const stringToHash = (str: string): number => {
      let hash = 0;
      for (let i = 0; i < str.length; i++) {
        hash = (hash << 5) - hash + str.charCodeAt(i);
        hash |= 0;
      }
      return Math.abs(hash);
    };

    const nowIso = new Date().toISOString();

    // Fetch active user agora posts and active venue posts in parallel
    const [userPostsRes, venuePostsRes] = await Promise.all([
      supabaseAdmin
        .from('agora_posts')
        .select(`
          *,
          profiles:user_id (
            username,
            avatar_url,
            date_of_birth
          )
        `)
        .gt('expires_at', nowIso),
      supabaseAdmin
        .from('venue_posts')
        .select(`
          *,
          venue:venue_id (
            id,
            name,
            type,
            description,
            address,
            lat,
            lng,
            image_url,
            is_partner,
            is_verified,
            tags
          )
        `)
        .eq('is_active', true)
        .or(`ends_at.gt.${nowIso},ends_at.is.null`)
    ]);

    const { data: posts, error: postsError } = userPostsRes;
    const { data: venuePosts, error: venuePostsError } = venuePostsRes;

    if (postsError) {
      console.error('Error fetching user agora posts:', postsError);
    }
    if (venuePostsError) {
      console.error('Error fetching venue posts:', venuePostsError);
    }

    // Format user posts
    const formattedUserPosts = (posts || []).map((p: any) => ({
      id: p.id,
      user_id: p.user_id,
      photo_url: p.photo_url,
      status_text: p.status_text,
      created_at: p.created_at,
      expires_at: p.expires_at,
      username: p.profiles?.username || 'Usuário',
      avatar_url: p.profiles?.avatar_url || '',
      date_of_birth: p.profiles?.date_of_birth || null,
      is_venue: false,
      likes_count: 0,
      comments_count: 0,
      user_has_liked: false
    }));

    // Format venue posts to mimic AgoraPost with stable numeric hash ID
    const formattedVenuePosts = (venuePosts || []).map((vp: any) => ({
      id: stringToHash(vp.id),
      user_id: vp.venue_id,
      photo_url: vp.image_url || vp.venue?.image_url || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&auto=format&fit=crop&q=80',
      status_text: vp.content ? `📢 ${vp.title}: ${vp.content}` : `📢 ${vp.title}`,
      created_at: vp.created_at,
      expires_at: vp.ends_at || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      username: vp.venue?.name || 'Espaço Parceiro',
      avatar_url: vp.venue?.image_url || '',
      date_of_birth: null,
      is_venue: true,
      venue: vp.venue,
      likes_count: 0,
      comments_count: 0,
      user_has_liked: false
    }));

    // Merge and sort by created_at DESC
    const allPosts = [...formattedUserPosts, ...formattedVenuePosts];
    allPosts.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    // Slice for current page pagination
    const paginatedPosts = allPosts.slice(offset, offset + limit);

    if (paginatedPosts.length === 0) {
      return res.status(200).json({ data: [] });
    }

    const userPostIds = paginatedPosts.filter((p: any) => !p.is_venue).map((p: any) => p.id);

    // Fetch likes and comments for user posts only
    const likesMap: Record<number, number> = {};
    const commentsMap: Record<number, number> = {};
    const userLikesSet = new Set<number>();

    if (userPostIds.length > 0) {
      const [likesRes, commentsRes] = await Promise.all([
        supabaseAdmin
          .from('agora_post_likes')
          .select('post_id, user_id')
          .in('post_id', userPostIds),
        supabaseAdmin
          .from('agora_post_comments')
          .select('post_id')
          .in('post_id', userPostIds)
      ]);

      if (!likesRes.error && likesRes.data) {
        likesRes.data.forEach((l: any) => {
          likesMap[l.post_id] = (likesMap[l.post_id] || 0) + 1;
          if (currentUserId && l.user_id === currentUserId) {
            userLikesSet.add(l.post_id);
          }
        });
      }

      if (!commentsRes.error && commentsRes.data) {
        commentsRes.data.forEach((c: any) => {
          commentsMap[c.post_id] = (commentsMap[c.post_id] || 0) + 1;
        });
      }
    }

    const formattedPosts = paginatedPosts.map((p: any) => {
      if (p.is_venue) return p;
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
