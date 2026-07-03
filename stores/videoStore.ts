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
    loadingVideos: boolean;
    loadingComments: Record<number, boolean>;
    fetchVideos: () => Promise<void>;
    fetchComments: (videoId: number) => Promise<void>;
    addVideo: (title: string, description: string, videoFile: File) => Promise<void>;
    addComment: (videoId: number, commentText: string, rating: number) => Promise<void>;
    incrementViews: (videoId: number) => Promise<void>;
    toggleLike: (videoId: number) => Promise<void>;
}

export const useVideoStore = create<VideoState>((set, get) => ({
    videos: [],
    comments: {},
    likedVideos: {},
    loadingVideos: false,
    loadingComments: {},

    fetchVideos: async () => {
        set({ loadingVideos: true });
        try {
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
                .order('created_at', { ascending: false });

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

                const mappedVideos: VideoPost[] = data.map((v: any) => ({
                    id: v.id,
                    user_id: v.user_id,
                    title: v.title,
                    description: v.description,
                    video_url: getPublicImageUrl(v.video_url),
                    thumbnail_url: v.thumbnail_url ? getPublicImageUrl(v.thumbnail_url) : 'https://placehold.co/600x400/1e293b/ffffff/png?text=Play',
                    views_count: v.views_count || 0,
                    likes_count: v.likes_count || 0,
                    created_at: v.created_at,
                    rating: v.rating || 5.0,
                    ratings_count: v.ratings_count || 0,
                    user_profile: {
                        username: v.profiles?.username || 'Usuário',
                        display_name: v.profiles?.display_name || v.profiles?.username || 'Usuário',
                        avatar_url: getPublicImageUrl(v.profiles?.avatar_url),
                        age: calculateAge(v.profiles?.date_of_birth),
                        subscription_tier: v.profiles?.subscription_tier || 'free',
                        oral_preference: v.profiles?.oral_preference,
                        site_preference: v.profiles?.accommodation_preference
                    }
                }));

                set({ videos: mappedVideos, loadingVideos: false });
                
                // Fetch user likes
                const currentUser = useAuthStore.getState().user;
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
            const { data, error } = await supabase
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
                .order('created_at', { ascending: false });

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

                const mappedComments: VideoComment[] = data.map((c: any) => ({
                    id: c.id,
                    video_id: c.video_id,
                    user_id: c.user_id,
                    comment_text: c.comment,
                    rating: c.rating,
                    created_at: c.created_at,
                    user_profile: {
                        username: c.profiles?.display_name || c.profiles?.username || 'Usuário',
                        avatar_url: getPublicImageUrl(c.profiles?.avatar_url),
                        age: calculateAge(c.profiles?.date_of_birth)
                    }
                }));

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

    addComment: async (videoId: number, commentText: string, rating: number) => {
        const currentUser = useAuthStore.getState().user;
        if (!currentUser) return;

        try {
            const { data, error } = await supabase
                .from('video_ratings')
                .insert({
                    video_id: videoId,
                    user_id: currentUser.id,
                    comment: commentText,
                    rating: rating
                })
                .select()
                .single();

            if (error) throw error;

            toast.success('Comentário e qualificação enviados!');
            get().fetchComments(videoId);
        } catch (e) {
            console.error(e);
            toast.error('Erro ao enviar avaliação.');
        }
    },

    incrementViews: async (videoId: number) => {
        try {
            // Update on Supabase
            const { error } = await supabase.rpc('increment_video_views', { p_video_id: videoId });
            if (error) throw error;
        } catch (e) {
            // Memory update fallback
            set(state => ({
                videos: state.videos.map(v => {
                    if (v.id === videoId) {
                        return { ...v, views_count: (v.views_count || 0) + 1 };
                    }
                    return v;
                })
            }));
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
        set(state => ({
            likedVideos: { ...state.likedVideos, [videoId]: newIsLiked },
            videos: state.videos.map(v => {
                if (v.id === videoId) {
                    return { ...v, likes_count: Math.max(0, (v.likes_count || 0) + (newIsLiked ? 1 : -1)) };
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
        } catch (e) {
            // Local fallback logic already handled optimistically
        }
    }
}));
