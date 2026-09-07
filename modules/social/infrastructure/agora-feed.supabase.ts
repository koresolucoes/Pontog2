import type { AgoraFeedRepository } from '../application/agora-feed.js';
import type { AgoraFeedItem, AgoraFeedPage } from '../domain/agora-feed.js';

const MAX_SOURCE_ROWS = 200;

const calculateAge = (dob: string | null | undefined): number | null => {
  if (!dob) return null;
  const birthDate = new Date(dob);
  if (Number.isNaN(birthDate.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDelta = today.getMonth() - birthDate.getMonth();
  if (monthDelta < 0 || (monthDelta === 0 && today.getDate() < birthDate.getDate())) age -= 1;
  return age >= 0 && age <= 120 ? age : null;
};

const ageCompatibilityAnchor = (age: number | null): string | null => {
  if (age === null) return null;
  return `${new Date().getFullYear() - age}-01-01`;
};

const stringToHash = (value: string): number => {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(index);
    hash |= 0;
  }
  return Math.abs(hash);
};

const normalizeProfile = (profile: any) => Array.isArray(profile) ? profile[0] : profile;

export function createSupabaseAgoraFeedRepository(client: any): AgoraFeedRepository {
  return {
    async getPage(actorUserId: string, rawPage: number, rawLimit: number): Promise<AgoraFeedPage> {
      const page = Math.max(1, Number.isFinite(rawPage) ? Math.floor(rawPage) : 1);
      const limit = Math.max(1, Math.min(50, Number.isFinite(rawLimit) ? Math.floor(rawLimit) : 10));
      const offset = (page - 1) * limit;
      const nowIso = new Date().toISOString();

      const { data: actorProfile, error: actorError } = await client
        .from('profiles')
        .select('id, status')
        .eq('id', actorUserId)
        .single();

      if (actorError || !actorProfile || actorProfile.status !== 'active') {
        throw new Error('Active profile required.');
      }

      const { data: actorPrivate, error: actorPrivateError } = await client
        .from('profile_private')
        .select('visibility')
        .eq('profile_id', actorUserId)
        .maybeSingle();
      if (actorPrivateError) throw actorPrivateError;

      const [{ data: actorTribeRows, error: actorTribeError }, { data: blockRows, error: blockError }] = await Promise.all([
        client.from('profile_tribes').select('tribe_id').eq('profile_id', actorUserId),
        client.from('blocks').select('blocker_id, blocked_id').or(`blocker_id.eq.${actorUserId},blocked_id.eq.${actorUserId}`),
      ]);

      if (actorTribeError) throw actorTribeError;
      if (blockError) throw blockError;

      const actorTribes = new Set<string>((actorTribeRows || []).map((row: any) => String(row.tribe_id)));
      const blockedUserIds = new Set<string>();
      (blockRows || []).forEach((row: any) => {
        if (row.blocker_id === actorUserId) blockedUserIds.add(String(row.blocked_id));
        if (row.blocked_id === actorUserId) blockedUserIds.add(String(row.blocker_id));
      });

      const [userPostsResult, venuePostsResult] = await Promise.all([
        client
          .from('agora_posts')
          .select(`
            id,
            user_id,
            photo_url,
            status_text,
            created_at,
            expires_at,
            profiles:user_id (
              username,
              avatar_url,
              status,
              is_incognito
            )
          `)
          .gt('expires_at', nowIso)
          .order('created_at', { ascending: false })
          .limit(MAX_SOURCE_ROWS),
        client
          .from('venue_posts')
          .select(`
            id,
            venue_id,
            title,
            content,
            image_url,
            created_at,
            ends_at,
            is_active,
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
          .order('created_at', { ascending: false })
          .limit(MAX_SOURCE_ROWS),
      ]);

      if (userPostsResult.error) throw userPostsResult.error;
      if (venuePostsResult.error) throw venuePostsResult.error;

      const userPosts = userPostsResult.data || [];
      const targetProfileIds = Array.from(new Set<string>(userPosts.map((post: any) => String(post.user_id))));
      let targetTribeRows: any[] = [];
      let targetPrivateRows: any[] = [];
      if (targetProfileIds.length > 0) {
        const [tribeResult, privateResult] = await Promise.all([
          client.from('profile_tribes').select('profile_id, tribe_id').in('profile_id', targetProfileIds),
          client.from('profile_private').select('profile_id, date_of_birth, visibility').in('profile_id', targetProfileIds),
        ]);
        if (tribeResult.error) throw tribeResult.error;
        if (privateResult.error) throw privateResult.error;
        targetTribeRows = tribeResult.data || [];
        targetPrivateRows = privateResult.data || [];
      }

      const targetTribesByProfile = new Map<string, Set<string>>();
      targetTribeRows.forEach((row: any) => {
        const profileId = String(row.profile_id);
        const set = targetTribesByProfile.get(profileId) || new Set<string>();
        set.add(String(row.tribe_id));
        targetTribesByProfile.set(profileId, set);
      });
      const targetPrivateByProfile = new Map<string, any>(
        targetPrivateRows.map((row: any) => [String(row.profile_id), row]),
      );

      const actorVisibility = actorPrivate?.visibility || 'todos';
      const visibleUserPosts = userPosts.filter((post: any) => {
        const profile = normalizeProfile(post.profiles);
        const targetId = String(post.user_id);
        if (!profile || profile.status !== 'active' || profile.is_incognito === true) return false;
        if (blockedUserIds.has(targetId)) return false;

        const targetTribes = targetTribesByProfile.get(targetId) || new Set<string>();
        const sharesTribe = Array.from(targetTribes).some((tribeId) => actorTribes.has(tribeId));
        const targetVisibility = targetPrivateByProfile.get(targetId)?.visibility || 'todos';

        if (actorVisibility !== 'todos' && !sharesTribe) return false;
        if (targetVisibility !== 'todos' && !sharesTribe) return false;
        return true;
      });

      const visibleUserPostIds = visibleUserPosts.map((post: any) => post.id);
      const likesMap = new Map<string, number>();
      const commentsMap = new Map<string, number>();
      const actorLikedPostIds = new Set<string>();

      if (visibleUserPostIds.length > 0) {
        const [likesResult, commentsResult] = await Promise.all([
          client.from('agora_post_likes').select('post_id, user_id').in('post_id', visibleUserPostIds),
          client.from('agora_post_comments').select('post_id').in('post_id', visibleUserPostIds),
        ]);
        if (likesResult.error) throw likesResult.error;
        if (commentsResult.error) throw commentsResult.error;

        (likesResult.data || []).forEach((row: any) => {
          const postId = String(row.post_id);
          likesMap.set(postId, (likesMap.get(postId) || 0) + 1);
          if (row.user_id === actorUserId) actorLikedPostIds.add(postId);
        });
        (commentsResult.data || []).forEach((row: any) => {
          const postId = String(row.post_id);
          commentsMap.set(postId, (commentsMap.get(postId) || 0) + 1);
        });
      }

      const userFeedItems: AgoraFeedItem[] = visibleUserPosts.map((post: any) => {
        const profile = normalizeProfile(post.profiles) || {};
        const postId = String(post.id);
        const age = calculateAge(targetPrivateByProfile.get(String(post.user_id))?.date_of_birth);
        return {
          id: Number(post.id),
          user_id: String(post.user_id),
          photo_url: String(post.photo_url || ''),
          status_text: post.status_text ?? null,
          created_at: String(post.created_at),
          expires_at: String(post.expires_at),
          username: String(profile.username || 'Usuário'),
          avatar_url: profile.avatar_url ? String(profile.avatar_url) : null,
          age,
          date_of_birth: ageCompatibilityAnchor(age),
          is_venue: false,
          likes_count: likesMap.get(postId) || 0,
          comments_count: commentsMap.get(postId) || 0,
          user_has_liked: actorLikedPostIds.has(postId),
        };
      });

      const venueFeedItems: AgoraFeedItem[] = (venuePostsResult.data || []).map((post: any) => {
        const venue = normalizeProfile(post.venue) || null;
        const venueName = venue?.name || 'Espaço Parceiro';
        const statusText = post.content ? `📣 ${post.title}\n\n${post.content}` : `📣 ${post.title}`;
        return {
          id: stringToHash(String(post.id)),
          user_id: String(post.venue_id),
          photo_url: String(post.image_url || venue?.image_url || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&auto=format&fit=crop&q=80'),
          status_text: statusText,
          created_at: String(post.created_at),
          expires_at: String(post.ends_at || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()),
          username: String(venueName),
          avatar_url: venue?.image_url ? String(venue.image_url) : null,
          age: null,
          date_of_birth: null,
          is_venue: true,
          venue,
          likes_count: 0,
          comments_count: 0,
          user_has_liked: false,
        };
      });

      const merged = [...userFeedItems, ...venueFeedItems].sort(
        (left, right) => new Date(right.created_at).getTime() - new Date(left.created_at).getTime(),
      );
      const items = merged.slice(offset, offset + limit);

      return {
        items,
        hasMore: offset + items.length < merged.length,
      };
    },
  };
}
