import { create } from 'zustand';
import { supabase, getPublicImageUrl } from '../lib/supabase';
import { useAuthStore } from './authStore';
import toast from 'react-hot-toast';

export interface VideoPost {
    id: number;
    user_id: string;
    title: string;
    description?: string;
    video_url: string;
    thumbnail_url: string;
    views_count: number;
    created_at: string;
    rating: number;
    ratings_count: number;
    likes_count?: number;
    user_profile?: {
        username: string;
        avatar_url: string;
        age: number;
        location?: string;
        display_name?: string;
        subscription_tier?: string;
        oral_preference?: string;
        site_preference?: string;
    };
}

export interface VideoComment {
    id: number;
    video_id: number;
    user_id: string;
    comment_text: string;
    rating: number;
    created_at: string;
    likes_count?: number;
    liked_by_me?: boolean;
    user_profile?: {
        username: string;
        avatar_url: string;
        age: number;
    };
}

interface VideoState {
    videos: VideoPost[];
    comments: Record<number, VideoComment[]>;
    likedVideos: Record<number, boolean>;
    userRatings: Record<number, number>; // Maps videoId -> rating
    loadingVideos: boolean;
    loadingComments: Record<number, boolean>;
    fetchVideos: () => Promise<void>;
    fetchComments: (videoId: number) => Promise<void>;
    addVideo: (title: string, description: string, videoFile: File) => Promise<void>;
    addComment: (videoId: number, commentText: string) => Promise<void>;
    addRating: (videoId: number, rating: number) => Promise<void>;
    incrementViews: (videoId: number) => Promise<void>;
    toggleLike: (videoId: number) => Promise<void>;
    toggleCommentLike: (videoId: number, commentId: number) => Promise<void>;
    deleteVideo: (videoId: number) => Promise<void>;
    applyBatchedUpdates: (videos: any[], comments: any[]) => void;
    editVideo: (videoId: number, newTitle: string, newDescription: string) => Promise<void>;
}

export const useVideoStore = create<VideoState>((set, get) => ({
    videos: [],
    comments: {},
    likedVideos: {},
    userRatings: {},
    loadingVideos: false,
    loadingComments: {},

    fetchVideos: async () => {
        set({ loadingVideos: true });
        try {
            // Fetch all ratings to compute dynamic ratings
            const { data: ratingsData } = await supabase
                .from('video_ratings')
                .select('video_id, rating')
                .gt('rating', 0);

            const ratingsMap: Record<number, { sum: number, count: number }> = {};
            if (ratingsData) {
                ratingsData.forEach((r: any) => {
                    if (!ratingsMap[r.video_id]) {
                        ratingsMap[r.video_id] = { sum: 0, count: 0 };
                    }
                    ratingsMap[r.video_id].sum += r.rating;
                    ratingsMap[r.video_id].count += 1;
                });
            }

            // Fetch user's own ratings
            const currentUser = useAuthStore.getState().user;
            const userRatingsMap: Record<number, number> = {};
            if (currentUser) {
                const { data: userRatingsData } = await supabase
                    .from('video_ratings')
                    .select('video_id, rating')
                    .eq('user_id', currentUser.id)
                    .gt('rating', 0);
                
                if (userRatingsData) {
                    userRatingsData.forEach((r: any) => {
                        userRatingsMap[r.video_id] = r.rating;
                    });
                }
            }
            set({ userRatings: userRatingsMap });

            // Attempt Supabase fetch
            const { data, error } = await supabase
                .from('videos')
                .select(`
                    *,
                    profiles (
                        username,
                        display_name,
                        avatar_url,
                        date_of_birth,
                        lat,
                        lng,
                        subscription_tier,
                        oral_preference,
                        accommodation_preference
                    )
                `)
                .order('created_at', { ascending: false })
                .limit(200);

            if (error) throw error;

            if (data && data.length > 0) {
                const calculateAge = (dob: string | null): number => {
                    if (!dob) return 20;
                    const birthDate = new Date(dob);
                    const today = new Date();
                    let age = today.getFullYear() - birthDate.getFullYear();
                    const m = today.getMonth() - birthDate.getMonth();
                    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
                        age--;
                    }
                    return age;
                };

                const mappedVideos: VideoPost[] = data.map((v: any) => {
                    const stats = ratingsMap[v.id] || { sum: 5.0, count: 0 };
                    const computedRating = stats.count > 0 ? (stats.sum / stats.count) : 5.0;
                    return {
                        id: v.id,
                        user_id: v.user_id,
                        title: v.title,
                        description: v.description,
                        video_url: getPublicImageUrl(v.video_url),
                        thumbnail_url: v.thumbnail_url ? getPublicImageUrl(v.thumbnail_url) : 'https://placehold.co/600x400/1e293b/ffffff/png?text=Play',
                        views_count: v.views_count || 0,
                        likes_count: v.likes_count || 0,
                        created_at: v.created_at,
                        rating: computedRating,
                        ratings_count: stats.count,
                        user_profile: {
                            username: v.profiles?.username || 'Usuário',
                            display_name: v.profiles?.display_name || v.profiles?.username || 'Usuário',
                            avatar_url: getPublicImageUrl(v.profiles?.avatar_url),
                            age: calculateAge(v.profiles?.date_of_birth),
                            subscription_tier: v.profiles?.subscription_tier || 'free',
                            oral_preference: v.profiles?.oral_preference,
                            site_preference: v.profiles?.accommodation_preference
                        }
                    };
                });

                set({ videos: mappedVideos, loadingVideos: false });
                
                // Fetch user likes
                if (currentUser) {
                    const { data: likesData } = await supabase
                        .from('video_likes')
                        .select('video_id')
                        .eq('user_id', currentUser.id);
                        
                    if (likesData) {
                        const likedMap: Record<number, boolean> = {};
                        likesData.forEach(like => {
                            likedMap[like.video_id] = true;
                        });
                        set({ likedVideos: likedMap });
                    }
                }
            } else {
                set({ videos: [], loadingVideos: false });
            }
        } catch (e) {
            console.error(e);
            set({ videos: [], loadingVideos: false });
        }
    },

    fetchComments: async (videoId: number) => {
        set(state => ({
            loadingComments: { ...state.loadingComments, [videoId]: true }
        }));
        try {
            // Try fetching from the new video_comments table first
            let { data, error } = await supabase
                .from('video_comments')
                .select(`
                    *,
                    profiles (
                        username,
                        display_name,
                        avatar_url,
                        date_of_birth
                    )
                `)
                .eq('video_id', videoId)
                .order('created_at', { ascending: false });

            // If relation doesn't exist, fallback to the old video_ratings table structure
            if (error && (error.code === 'PGRST116' || error.message?.includes('does not exist'))) {
                console.warn("video_comments table not found. Falling back to video_ratings...");
                const fallback = await supabase
                    .from('video_ratings')
                    .select(`
                        *,
                        profiles (
                            username,
                            display_name,
                            avatar_url,
                            date_of_birth
                        )
                    `)
                    .eq('video_id', videoId)
                    .not('comment', 'is', null)
                    .neq('comment', '')
                    .order('created_at', { ascending: false });
                
                data = fallback.data;
                error = fallback.error;
            }

            if (error) throw error;

            if (data && data.length > 0) {
                const calculateAge = (dob: string | null): number => {
                    if (!dob) return 20;
                    const birthDate = new Date(dob);
                    const today = new Date();
                    let age = today.getFullYear() - birthDate.getFullYear();
                    const m = today.getMonth() - birthDate.getMonth();
                    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
                        age--;
                    }
                    return age;
                };

                const currentUser = useAuthStore.getState().user;
                let commentLikes: any[] = [];
                const commentIds = data.map((c: any) => c.id);
                try {
                    const { data: likesData, error: likesError } = await supabase
                        .from('video_comment_likes')
                        .select('comment_id, user_id')
                        .in('comment_id', commentIds);
                    
                    if (!likesError && likesData) {
                        commentLikes = likesData;
                    }
                } catch (likeErr) {
                    console.warn("Could not fetch comment likes. Table 'video_comment_likes' may not exist yet:", likeErr);
                }

                const mappedComments: VideoComment[] = data.map((c: any) => {
                    const likesForThisComment = commentLikes.filter((l: any) => l.comment_id === c.id);
                    return {
                        id: c.id,
                        video_id: c.video_id,
                        user_id: c.user_id,
                        comment_text: c.comment,
                        rating: c.rating || 0,
                        created_at: c.created_at,
                        likes_count: likesForThisComment.length,
                        liked_by_me: currentUser ? likesForThisComment.some((l: any) => l.user_id === currentUser.id) : false,
                        user_profile: {
                            username: c.profiles?.display_name || c.profiles?.username || 'Usuário',
                            avatar_url: getPublicImageUrl(c.profiles?.avatar_url),
                            age: calculateAge(c.profiles?.date_of_birth)
                        }
                    };
                });

                set(state => ({
                    comments: { ...state.comments, [videoId]: mappedComments },
                    loadingComments: { ...state.loadingComments, [videoId]: false }
                }));
            } else {
                set(state => ({
                    comments: { ...state.comments, [videoId]: [] },
                    loadingComments: { ...state.loadingComments, [videoId]: false }
                }));
            }
        } catch (e) {
            console.error(e);
            set(state => ({
                comments: { ...state.comments, [videoId]: [] },
                loadingComments: { ...state.loadingComments, [videoId]: false }
            }));
        }
    },

    addVideo: async (title: string, description: string, videoFile: File) => {
        const currentUser = useAuthStore.getState().user;
        if (!currentUser) {
            toast.error('Você precisa estar logado para enviar um vídeo.');
            return;
        }

        const toastId = toast.loading('Fazendo upload do vídeo...');

        try {
            const fileExt = videoFile.name.split('.').pop();
            const fileName = `${currentUser.id}_${Date.now()}.${fileExt}`;
            const filePath = `videos/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('user_uploads')
                .upload(filePath, videoFile);

            if (uploadError) throw uploadError;

            // Attempt to insert with description
            let insertData = {
                user_id: currentUser.id,
                title,
                description,
                video_url: filePath
            };

            const { data, error } = await supabase
                .from('videos')
                .insert(insertData)
                .select()
                .single();

            // If schema error (e.g., description column missing), fallback to basic insert
            if (error && error.code === 'PGRST204') {
                const { data: fallbackData, error: fallbackError } = await supabase
                    .from('videos')
                    .insert({
                        user_id: currentUser.id,
                        title,
                        video_url: filePath
                    })
                    .select()
                    .single();
                    
                if (fallbackError) throw fallbackError;
                if (fallbackData) {
                    toast.success('Vídeo adicionado! (Nota: a descrição não foi salva pois a coluna ainda não existe no banco de dados)', { id: toastId });
                    get().fetchVideos();
                    return;
                }
            } else if (error) {
                throw error;
            }

            if (data) {
                toast.success('Vídeo adicionado com sucesso!', { id: toastId });
                get().fetchVideos();
            }
        } catch (e) {
            console.error(e);
            toast.error('Erro ao adicionar o vídeo. Tente novamente.', { id: toastId });
        }
    },

    addComment: async (videoId: number, commentText: string) => {
        const currentUser = useAuthStore.getState().user;
        if (!currentUser) return;

        try {
            // First, try to insert directly into the new video_comments table
            const { error: insertError } = await supabase
                .from('video_comments')
                .insert({
                    video_id: videoId,
                    user_id: currentUser.id,
                    comment: commentText
                });

            // If table doesn't exist, fallback to the old video_ratings table structure
            if (insertError && (insertError.code === 'PGRST116' || insertError.message?.includes('does not exist'))) {
                console.warn("video_comments table not found. Saving comment in video_ratings...");
                const { data: existing, error: fetchError } = await supabase
                    .from('video_ratings')
                    .select('id')
                    .eq('video_id', videoId)
                    .eq('user_id', currentUser.id)
                    .limit(1);

                if (fetchError) throw fetchError;

                if (existing && existing.length > 0) {
                    const { error: updateError } = await supabase
                        .from('video_ratings')
                        .update({ comment: commentText })
                        .eq('id', existing[0].id);

                    if (updateError) throw updateError;
                } else {
                    const { error: fallbackInsertError } = await supabase
                        .from('video_ratings')
                        .insert({
                            video_id: videoId,
                            user_id: currentUser.id,
                            comment: commentText,
                            rating: 0 // pure comment
                        });

                    if (fallbackInsertError) throw fallbackInsertError;
                }
            } else if (insertError) {
                throw insertError;
            }

            toast.success('Comentário enviado!');
            get().fetchComments(videoId);
        } catch (e) {
            console.error(e);
            toast.error('Erro ao enviar comentário.');
        }
    },

    addRating: async (videoId: number, rating: number) => {
        const currentUser = useAuthStore.getState().user;
        if (!currentUser) {
            toast.error('Você precisa estar logado para avaliar.');
            return;
        }

        try {
            // Check if rating already exists for this video and user (regardless of rating value)
            const { data: existingRating, error: fetchError } = await supabase
                .from('video_ratings')
                .select('id')
                .eq('video_id', videoId)
                .eq('user_id', currentUser.id)
                .limit(1);

            if (fetchError) throw fetchError;

            if (existingRating && existingRating.length > 0) {
                // Update existing rating
                const { error: updateError } = await supabase
                    .from('video_ratings')
                    .update({ rating: rating })
                    .eq('id', existingRating[0].id);

                if (updateError) throw updateError;
            } else {
                // Insert new rating without specifying comment column to support both schemas
                const { error: insertError } = await supabase
                    .from('video_ratings')
                    .insert({
                        video_id: videoId,
                        user_id: currentUser.id,
                        rating: rating
                    });

                if (insertError) throw insertError;
            }

            toast.success('Avaliação registrada com sucesso!');
            
            // Update local userRatings mapping
            set(state => ({
                userRatings: {
                    ...state.userRatings,
                    [videoId]: rating
                }
            }));

            // Refresh video list to compute correct rating averages instantly
            get().fetchVideos();
        } catch (e) {
            console.error(e);
            toast.error('Erro ao registrar avaliação.');
        }
    },

    incrementViews: async (videoId: number) => {
        // Optimistic update
        set(state => ({
            videos: state.videos.map(v => {
                if (v.id === videoId) {
                    return { ...v, views_count: (v.views_count || 0) + 1 };
                }
                return v;
            })
        }));

        try {
            // Update on Supabase
            let res = await supabase.rpc('increment_video_views', { video_id: videoId });
            if (res.error) {
                // Fallback to p_video_id if video_id is not found
                res = await supabase.rpc('increment_video_views', { p_video_id: videoId });
            }
            if (res.error) {
                console.error('RPC Error:', res.error);
            }
        } catch (e) {
            console.error('Failed to increment views:', e);
        }
    },

    toggleLike: async (videoId: number) => {
        const currentUser = useAuthStore.getState().user;
        if (!currentUser) {
            toast.error('Você precisa estar logado para curtir.');
            return;
        }

        const isLiked = get().likedVideos[videoId] || false;
        const newIsLiked = !isLiked;

        // Optimistic update
        let newLikesCount = 0;
        set(state => ({
            likedVideos: { ...state.likedVideos, [videoId]: newIsLiked },
            videos: state.videos.map(v => {
                if (v.id === videoId) {
                    newLikesCount = Math.max(0, (v.likes_count || 0) + (newIsLiked ? 1 : -1));
                    return { ...v, likes_count: newLikesCount };
                }
                return v;
            })
        }));

        try {
            if (newIsLiked) {
                const { error } = await supabase.from('video_likes').insert({ video_id: videoId, user_id: currentUser.id });
                if (error && error.code !== '23505') throw error; // ignore duplicate
            } else {
                const { error } = await supabase.from('video_likes').delete().match({ video_id: videoId, user_id: currentUser.id });
                if (error) throw error;
            }

            // Sync with Supabase videos table directly
            await supabase.from('videos').update({
                likes_count: newLikesCount
            }).eq('id', videoId);

        } catch (e) {
            // Local fallback logic already handled optimistically
        }
    },

    toggleCommentLike: async (videoId: number, commentId: number) => {
        const currentUser = useAuthStore.getState().user;
        if (!currentUser) {
            toast.error('Você precisa estar logado para curtir.');
            return;
        }

        const commentsForVideo = get().comments[videoId] || [];
        const comment = commentsForVideo.find(c => c.id === commentId);
        if (!comment) return;

        const isLiked = comment.liked_by_me || false;
        const newIsLiked = !isLiked;
        const newLikesCount = Math.max(0, (comment.likes_count || 0) + (newIsLiked ? 1 : -1));

        // Optimistic update
        set(state => ({
            comments: {
                ...state.comments,
                [videoId]: (state.comments[videoId] || []).map(c => {
                    if (c.id === commentId) {
                        return { ...c, liked_by_me: newIsLiked, likes_count: newLikesCount };
                    }
                    return c;
                })
            }
        }));

        try {
            if (newIsLiked) {
                const { error } = await supabase
                    .from('video_comment_likes')
                    .insert({ comment_id: commentId, user_id: currentUser.id });
                if (error && error.code !== '23505') throw error;
            } else {
                const { error } = await supabase
                    .from('video_comment_likes')
                    .delete()
                    .match({ comment_id: commentId, user_id: currentUser.id });
                if (error) throw error;
            }
        } catch (e) {
            console.error('Error toggling comment like:', e);
        }
    },

    applyBatchedUpdates: (videoUpdates, commentUpdates) => {
        set(state => {
            const newVideos = [...state.videos];
            let changed = false;
            
            // Process video updates (e.g. likes_count, views_count)
            if (videoUpdates && videoUpdates.length > 0) {
                const updateMap = new Map();
                videoUpdates.forEach(u => updateMap.set(u.id, u));
                for (let i = 0; i < newVideos.length; i++) {
                    const update = updateMap.get(newVideos[i].id);
                    if (update) {
                        newVideos[i] = { ...newVideos[i], ...update };
                        changed = true;
                    }
                }
            }
            
            // Note: we can't easily resolve comment profiles without a fetch, 
            // but we could just trigger fetchComments for modified video_ids if there are new comments.
            // For now, we will just update the video array.
            
            return changed ? { videos: newVideos } : {};
        });
        
        // If there are new comments, we can debounce a fetch for those specific videos
        if (commentUpdates && commentUpdates.length > 0) {
            const videoIdsToFetch = new Set<number>();
            commentUpdates.forEach(c => videoIdsToFetch.add(c.video_id));
            videoIdsToFetch.forEach(vid => {
                get().fetchComments(vid);
            });
        }
    },
    deleteVideo: async (videoId: number) => {
        const currentUser = useAuthStore.getState().user;
        if (!currentUser) return;
        try {
            const { error } = await supabase
                .from('videos')
                .delete()
                .match({ id: videoId, user_id: currentUser.id });
            if (error) throw error;
            set(state => ({
                videos: state.videos.filter(v => v.id !== videoId)
            }));
            toast.success('Vídeo eliminado con éxito.');
        } catch (e) {
            console.error(e);
            toast.error('Error al eliminar el video.');
        }
    },

    editVideo: async (videoId: number, newTitle: string, newDescription: string) => {
        const currentUser = useAuthStore.getState().user;
        if (!currentUser) return;
        try {
            const { error } = await supabase
                .from('videos')
                .update({ title: newTitle, description: newDescription })
                .match({ id: videoId, user_id: currentUser.id });
            if (error) throw error;
            set(state => ({
                videos: state.videos.map(v => v.id === videoId ? { ...v, title: newTitle, description: newDescription } : v)
            }));
            toast.success('Vídeo actualizado con éxito.');
        } catch (e) {
            console.error(e);
            toast.error('Error al actualizar el video.');
        }
    }
}));

let videoUpdateBatch: any[] = [];
let commentUpdateBatch: any[] = [];
let isVideoBatchScheduled = false;

let isVideoSubscribed = false;

export const subscribeToVideoEvents = () => {
   if (isVideoSubscribed) return;
   isVideoSubscribed = true;

   const processBatch = () => {
        if (videoUpdateBatch.length > 0 || commentUpdateBatch.length > 0) {
            useVideoStore.getState().applyBatchedUpdates(videoUpdateBatch, commentUpdateBatch);
            videoUpdateBatch = [];
            commentUpdateBatch = [];
        }
        isVideoBatchScheduled = false;
   };

   supabase.channel('videos_realtime')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'videos' }, payload => {
          videoUpdateBatch.push(payload.new);
          if (!isVideoBatchScheduled) {
              isVideoBatchScheduled = true;
              setTimeout(processBatch, 2000); // 2 second throttle batch
          }
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'video_comments' }, payload => {
          commentUpdateBatch.push(payload.new);
          if (!isVideoBatchScheduled) {
              isVideoBatchScheduled = true;
              setTimeout(processBatch, 2000);
          }
      })
      .subscribe();
};
