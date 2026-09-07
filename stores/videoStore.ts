import { useVideoStore as legacyVideoStore } from './videoStoreLegacy';
import { supabase, getPublicImageUrl } from '../lib/supabase';

export type { VideoPost, VideoComment } from './videoStoreLegacy';

const fetchVideosSecurely = async () => {
  legacyVideoStore.setState({ loadingVideos: true } as any);
  try {
    const { data, error } = await supabase.rpc('get_video_feed_v2', {
      p_limit: 50,
      p_offset: 0,
      p_category: 'all',
      p_sort: 'relevant',
    });
    if (error) throw error;

    const likedVideos: Record<number, boolean> = {};
    const userRatings: Record<number, number> = {};
    const videos = (data || []).map((row: any) => {
      likedVideos[row.id] = !!row.liked_by_me;
      if (row.rated_by_me) userRatings[row.id] = Number(row.rated_by_me);
      return {
        id: row.id,
        user_id: row.user_id,
        title: row.title,
        description: row.description || '',
        video_url: getPublicImageUrl(row.video_url),
        thumbnail_url: row.thumbnail_url ? getPublicImageUrl(row.thumbnail_url) : '',
        views_count: Number(row.views_count || 0),
        likes_count: Number(row.likes_count || 0),
        rating: Number(row.ratings_count || 0) > 0 && row.rating !== null ? Number(row.rating) : 0,
        ratings_count: Number(row.ratings_count || 0),
        created_at: row.created_at,
        category: row.category || 'outros',
        is_nsfw: !!row.is_nsfw,
        comments_count: Number(row.comments_count || 0),
        user_profile: {
          username: row.author_username || 'Usuário',
          display_name: row.author_display_name || null,
          avatar_url: row.author_avatar_url ? getPublicImageUrl(row.author_avatar_url) : '',
          age: 0,
          subscription_tier: row.author_subscription_tier || 'free',
          is_verified: !!row.author_is_verified,
        },
      };
    });

    legacyVideoStore.setState({ videos, likedVideos, userRatings, loadingVideos: false } as any);
  } catch (error) {
    console.error('Error fetching video feed v2:', error);
    legacyVideoStore.setState({ loadingVideos: false } as any);
  }
};

const fetchCommentsSecurely = async (videoId: number) => {
  const current = legacyVideoStore.getState() as any;
  legacyVideoStore.setState({ loadingComments: { ...current.loadingComments, [videoId]: true } } as any);
  try {
    const { data, error } = await supabase.rpc('get_video_comments_v2', { p_video_id: videoId });
    if (error) throw error;
    const comments = (data || []).map((row: any) => ({
      id: Number(row.id),
      video_id: Number(row.video_id),
      user_id: row.user_id,
      comment_text: row.comment_text,
      rating: 0,
      created_at: row.created_at,
      likes_count: Number(row.likes_count || 0),
      liked_by_me: !!row.liked_by_me,
      user_profile: {
        username: row.author_username || 'Usuário',
        avatar_url: row.author_avatar_url ? getPublicImageUrl(row.author_avatar_url) : '',
        age: 0,
        display_name: row.author_display_name || null,
        is_verified: !!row.author_is_verified,
      },
    }));
    const state = legacyVideoStore.getState() as any;
    legacyVideoStore.setState({
      comments: { ...state.comments, [videoId]: comments },
      loadingComments: { ...state.loadingComments, [videoId]: false },
    } as any);
  } catch (error) {
    console.error('Error fetching video comments v2:', error);
    const state = legacyVideoStore.getState() as any;
    legacyVideoStore.setState({ loadingComments: { ...state.loadingComments, [videoId]: false } } as any);
  }
};

legacyVideoStore.setState({
  fetchVideos: fetchVideosSecurely,
  fetchComments: fetchCommentsSecurely,
} as any);

export const useVideoStore = legacyVideoStore;
