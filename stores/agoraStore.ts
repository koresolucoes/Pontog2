import { create } from 'zustand';
import { supabase, getPublicImageUrl } from '../lib/supabase';
import { AgoraPost, AgoraComment } from '../types';
import { useAuthStore } from './authStore';
import toast from 'react-hot-toast';

const calculateAge = (dob: string | null): number => {
    if (!dob) return 0;
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    return age;
};

interface AgoraState {
  posts: AgoraPost[];
  agoraUserIds: string[];
  isLoading: boolean;
  isActivating: boolean;
  page: number;
  hasMore: boolean;
  fetchAgoraPosts: (reset?: boolean) => Promise<void>;
  loadMorePosts: () => Promise<void>;
  activateAgoraMode: (photoFile: File, statusText: string) => Promise<void>;
  deactivateAgoraMode: () => Promise<void>;
  toggleLikePost: (postId: number) => Promise<void>;
  addComment: (postId: number, content: string) => Promise<void>;
  fetchCommentsForPost: (postId: number) => Promise<AgoraComment[]>;
  toggleLikeComment: (commentId: number, hasLiked: boolean) => Promise<void>;
  publishAgoraCheckin: (venueName: string, venueImageUrl: string) => Promise<void>;
}

let isPaginatedRpcSupported = true;
let isWithDetailsRpcSupported = true;

export const useAgoraStore = create<AgoraState>((set, get) => ({
  posts: [],
  agoraUserIds: [],
  isLoading: false,
  isActivating: false,
  page: 1,
  hasMore: true,

  fetchAgoraPosts: async (reset = false) => {
    const currentPage = reset ? 1 : get().page;
    if (reset) {
        set({ isLoading: true, page: 1, hasMore: true, posts: [] });
    } else {
        set({ isLoading: true });
    }

    const user = useAuthStore.getState().user;
    let response: any = null;

    // Try using paginated RPC first if supported
    if (isPaginatedRpcSupported) {
        response = await supabase.rpc('get_active_agora_posts_paginated', { p_page: currentPage, p_limit: 10 });
        if (response?.error) {
            if (response.error.code === 'PGRST202') {
                isPaginatedRpcSupported = false;
            }
        }
    }

    // Fallback to older RPC if paginated doesn't exist yet or fails, and if the older RPC is supported
    if (!response || response.error) {
        if (isWithDetailsRpcSupported) {
            response = await supabase.rpc('get_active_agora_posts_with_details');
            if (response?.error) {
                if (response.error.code === 'PGRST202') {
                    isWithDetailsRpcSupported = false;
                }
            }
        }
    }

    let data = response?.data;
    let error = response?.error;
    
    let fallbackLikes: Record<number, number> = {};
    let fallbackComments: Record<number, number> = {};
    let fallbackUserLikes: Set<number> = new Set();

    // Fallback to direct query if neither RPC works/exists
    if (error || !response) {
        const offset = (currentPage - 1) * 10;
        const res = await supabase
            .from('agora_posts')
            .select(`
                *,
                profiles:user_id ( username, avatar_url, date_of_birth )
            `)
            .gt('expires_at', new Date().toISOString())
            .order('created_at', { ascending: false })
            .range(offset, offset + 9);
        data = res.data;
        error = res.error;

        if (data && data.length > 0) {
            const postIds = data.map((p: any) => p.id);
            
            // Fetch likes
            const { data: likesData } = await supabase
                .from('agora_post_likes')
                .select('post_id, user_id')
                .in('post_id', postIds);
            
            if (likesData) {
                likesData.forEach((l: any) => {
                    fallbackLikes[l.post_id] = (fallbackLikes[l.post_id] || 0) + 1;
                    if (user && l.user_id === user.id) {
                        fallbackUserLikes.add(l.post_id);
                    }
                });
            }

            // Fetch comments count (Note: table is actually named 'agora_post_comments' or 'agora_comments' - let's be careful. From line 259 we see it inserts into 'agora_post_comments')
            const { data: commentsData } = await supabase
                .from('agora_post_comments')
                .select('post_id')
                .in('post_id', postIds);
            
            if (commentsData) {
                commentsData.forEach((c: any) => {
                    fallbackComments[c.post_id] = (fallbackComments[c.post_id] || 0) + 1;
                });
            }
        }
    }

    if (error) {
      console.error('Error fetching Agora posts:', error);
      set({ isLoading: false });
      return;
    }
    
    const formattedPosts = (data || []).map((p: any) => {
        const likesCount = p.likes_count !== undefined && p.likes_count !== null 
            ? Number(p.likes_count) 
            : (fallbackLikes[p.id] || 0);
        const commentsCount = p.comments_count !== undefined && p.comments_count !== null 
            ? Number(p.comments_count) 
            : (fallbackComments[p.id] || 0);
        const userHasLiked = p.user_has_liked !== undefined && p.user_has_liked !== null 
            ? !!p.user_has_liked 
            : fallbackUserLikes.has(p.id);

        return {
            ...p,
            username: p.username || p.profiles?.username,
            photo_url: getPublicImageUrl(p.photo_url),
            avatar_url: getPublicImageUrl(p.avatar_url || p.profiles?.avatar_url),
            age: calculateAge(p.date_of_birth || p.profiles?.date_of_birth),
            likes_count: likesCount,
            comments_count: commentsCount,
            user_has_liked: userHasLiked,
        };
    });

    set(state => {
        const newPosts = reset ? formattedPosts : [...state.posts, ...formattedPosts];
        
        // Remove duplicates just in case
        const uniquePosts = Array.from(new Map(newPosts.map((p: AgoraPost) => [p.id, p])).values());

        return { 
            posts: uniquePosts as AgoraPost[], 
            agoraUserIds: uniquePosts.map((p: AgoraPost) => p.user_id),
            hasMore: formattedPosts.length === 10,
            isLoading: false 
        };
    });
  },

  loadMorePosts: async () => {
    const { hasMore, isLoading, page } = get();
    if (!hasMore || isLoading) return;
    
    set({ page: page + 1 });
    await get().fetchAgoraPosts(false);
  },

  activateAgoraMode: async (photoFile: File, statusText: string) => {
    set({ isActivating: true });
    const user = useAuthStore.getState().user;
    if (!user) {
      toast.error('Você precisa estar logado.');
      set({ isActivating: false });
      return;
    }

    const toastId = toast.loading('Ativando modo Agora...');

    const fileExt = photoFile.name.split('.').pop();
    const fileName = `agora_${Date.now()}.${fileExt}`;
    const filePath = `${user.id}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('user_uploads')
      .upload(filePath, photoFile);

    if (uploadError) {
      toast.error('Falha ao enviar a foto.', { id: toastId });
      set({ isActivating: false });
      return;
    }

    const expires_at = new Date(Date.now() + 60 * 60 * 1000).toISOString();

    // FIX: Handle 409 Conflict (Unique Violation) robustly.
    // Instead of Delete+Insert (which can fail if delete is blocked) or Upsert (which can fail permissions),
    // we try INSERT first. If it fails with code 23505 (Unique Violation), we explicitly UPDATE.
    
    const payload = {
        user_id: user.id,
        photo_url: filePath,
        status_text: statusText,
        expires_at: expires_at,
    };

    const { error: insertError } = await supabase
      .from('agora_posts')
      .insert(payload);

    if (insertError) {
        if (insertError.code === '23505') {
            // Conflict detected: The user already has a post. Update it instead.
            console.log("Agora post exists, updating...");
            const { error: updateError } = await supabase
                .from('agora_posts')
                .update({
                    photo_url: filePath,
                    status_text: statusText,
                    expires_at: expires_at
                })
                .eq('user_id', user.id);
            
            if (updateError) {
                console.error("Error updating Agora post:", updateError);
                toast.error('Erro ao atualizar seu post.', { id: toastId });
                set({ isActivating: false });
                return;
            }
        } else {
            console.error("Error inserting Agora post:", insertError);
            toast.error('Erro ao ativar o modo Agora.', { id: toastId });
            set({ isActivating: false });
            return;
        }
    }

    toast.success('Modo Agora ativado por 1 hora!', { id: toastId });
    await get().fetchAgoraPosts();
    set({ isActivating: false });
  },

  deactivateAgoraMode: async () => {
    const user = useAuthStore.getState().user;
    if (!user) return;
    
    const { error } = await supabase
      .from('agora_posts')
      .delete()
      .eq('user_id', user.id);
      
    if (error) {
      toast.error('Erro ao desativar.');
    } else {
      toast.success('Modo Agora desativado.');
      await get().fetchAgoraPosts();
    }
  },

  toggleLikePost: async (postId: number) => {
    const user = useAuthStore.getState().user;
    if (!user) return;

    const post = get().posts.find(p => p.id === postId);
    if (!post) return;

    // Optimistic update
    const hasLiked = post.user_has_liked;
    set(state => ({
      posts: state.posts.map(p => 
        p.id === postId 
        ? { ...p, user_has_liked: !hasLiked, likes_count: hasLiked ? Math.max(0, (Number(p.likes_count) || 0) - 1) : (Number(p.likes_count) || 0) + 1 } 
        : p
      )
    }));

    if (hasLiked) {
      const { error } = await supabase.from('agora_post_likes').delete().match({ post_id: postId, user_id: user.id });
      if (error) {
        console.error('Error deleting like:', error);
        // Revert optimistic update
        set(state => ({
          posts: state.posts.map(p => 
            p.id === postId 
            ? { ...p, user_has_liked: true, likes_count: (Number(p.likes_count) || 0) + 1 } 
            : p
          )
        }));
      }
    } else {
      const { error } = await supabase.from('agora_post_likes').insert({ post_id: postId, user_id: user.id });
      if (error) {
        if (error.code === '23505') {
          // Unique violation: it was already liked in database, keeping liked state in UI
          console.log('Post already liked in DB, keeping liked state.');
        } else {
          console.error('Error inserting like:', error);
          // Revert optimistic update
          set(state => ({
            posts: state.posts.map(p => 
              p.id === postId 
              ? { ...p, user_has_liked: false, likes_count: Math.max(0, (Number(p.likes_count) || 0) - 1) } 
              : p
            )
          }));
        }
      }
    }
  },

  addComment: async (postId: number, content: string) => {
    const user = useAuthStore.getState().user;
    if (!user) {
      toast.error('Você precisa estar logado para comentar.');
      return;
    }
    const { error } = await supabase.from('agora_post_comments').insert({ post_id: postId, user_id: user.id, content });

    if (error) {
        toast.error('Erro ao enviar comentário.');
    } else {
        set(state => ({
            posts: state.posts.map(p =>
                p.id === postId ? { ...p, comments_count: (Number(p.comments_count) || 0) + 1 } : p
            )
        }));
    }
  },

  fetchCommentsForPost: async (postId: number): Promise<AgoraComment[]> => {
    const { data, error } = await supabase.rpc('get_comments_for_post_with_details', { p_post_id: postId });

    if (error) {
        console.error("Error fetching comments:", error);
        toast.error("Não foi possível carregar os comentários.");
        return [];
    }
    
    return data.map((comment: any) => ({
        ...comment,
        profiles: {
            ...comment.profiles,
            avatar_url: getPublicImageUrl(comment.profiles.avatar_url),
        }
    }));
  },

  toggleLikeComment: async (commentId: number, hasLiked: boolean) => {
    const user = useAuthStore.getState().user;
    if (!user) return;

    if (hasLiked) {
      // User has liked, so we need to delete the like
      await supabase.from('agora_comment_likes').delete().match({ comment_id: commentId, user_id: user.id });
    } else {
      // User has not liked, so we insert a like
      await supabase.from('agora_comment_likes').insert({ comment_id: commentId, user_id: user.id });
    }
    // The component handles the optimistic update, so no need to refetch here.
  },

  publishAgoraCheckin: async (venueName: string, venueImageUrl: string) => {
    const user = useAuthStore.getState().user;
    if (!user) return;
    
    // We create a post directly with the venue image url
    const payload = {
        user_id: user.id,
        photo_url: venueImageUrl,
        status_text: `Acabou de chegar em ${venueName} 📍`,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    };
    
    const { error: insertError } = await supabase
      .from('agora_posts')
      .insert(payload);

    if (insertError) {
        if (insertError.code === '23505') {
            // Update existing post
            const { error: updateError } = await supabase
                .from('agora_posts')
                .update({
                    photo_url: venueImageUrl,
                    status_text: payload.status_text,
                    expires_at: payload.expires_at
                })
                .eq('user_id', user.id);
            if (updateError) {
                console.error("Error updating Agora post:", updateError);
            }
        } else {
            console.error("Error inserting Agora post:", insertError);
        }
    }
    
    // Refresh posts
    await get().fetchAgoraPosts(true);
  },

}));

useAgoraStore.getState().fetchAgoraPosts();