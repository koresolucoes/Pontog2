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

    try {
        const { data: { session } } = await supabase.auth.getSession();
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
        };
        if (session?.access_token) {
            headers['Authorization'] = `Bearer ${session.access_token}`;
        }

        const response = await fetch(`/api/agora-posts?page=${currentPage}&limit=10`, {
            method: 'GET',
            headers
        });

        if (!response.ok) {
            throw new Error(`API error: ${response.statusText}`);
        }

        const result = await response.json();
        const data = result.data || [];

        const formattedPosts = data.map((p: any) => {
            return {
                ...p,
                username: p.username || p.profiles?.username,
                photo_url: getPublicImageUrl(p.photo_url),
                avatar_url: getPublicImageUrl(p.avatar_url || p.profiles?.avatar_url),
                age: calculateAge(p.date_of_birth || p.profiles?.date_of_birth),
                likes_count: Number(p.likes_count) || 0,
                comments_count: Number(p.comments_count) || 0,
                user_has_liked: !!p.user_has_liked,
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
    } catch (error) {
        console.error('Error fetching Agora posts from backend API:', error);
        set({ isLoading: false });
    }
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