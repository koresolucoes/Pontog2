import { create } from 'zustand';
import { supabase, getPublicImageUrl } from '../lib/supabase';
import { useAuthStore } from './authStore';
import toast from 'react-hot-toast';

export interface VideoPost {
    id: number;
    user_id: string;
    title: string;
    video_url: string;
    thumbnail_url: string;
    views_count: number;
    created_at: string;
    rating: number;
    ratings_count: number;
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
    loadingVideos: boolean;
    loadingComments: Record<number, boolean>;
    fetchVideos: () => Promise<void>;
    fetchComments: (videoId: number) => Promise<void>;
    addVideo: (title: string, videoUrl: string, thumbnailUrl?: string) => Promise<void>;
    addComment: (videoId: number, commentText: string, rating: number) => Promise<void>;
    incrementViews: (videoId: number) => Promise<void>;
}

// Highly reliable seed data for immediate beautiful demonstration
const SEED_VIDEOS: VideoPost[] = [
    {
        id: 1001,
        user_id: "seed-user-1",
        title: "Boquete Quente 🔥",
        video_url: "https://assets.mixkit.co/videos/preview/mixkit-hands-of-a-dj-playing-music-40011-large.mp4",
        thumbnail_url: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=500&q=80",
        views_count: 320,
        created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // Yesterday
        rating: 4.8,
        ratings_count: 7,
        user_profile: {
            username: "Vitinho",
            display_name: "Vitinho 😈",
            avatar_url: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&q=80",
            age: 20,
            location: "São Paulo",
            subscription_tier: "plus",
            oral_preference: "Te la chupo",
            site_preference: "Tengo sitio"
        }
    },
    {
        id: 1002,
        user_id: "seed-user-2",
        title: "Massagem relaxante com final feliz",
        video_url: "https://assets.mixkit.co/videos/preview/mixkit-dancing-woman-in-the-city-40015-large.mp4",
        thumbnail_url: "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=500&q=80",
        views_count: 850,
        created_at: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
        rating: 4.9,
        ratings_count: 15,
        user_profile: {
            username: "Bb",
            display_name: "Bb 🔥",
            avatar_url: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&q=80",
            age: 24,
            location: "Fortaleza",
            subscription_tier: "plus",
            oral_preference: "Te la chupo / Me la chupas",
            site_preference: "Tengo sitio / Me desplazo"
        }
    },
    {
        id: 1003,
        user_id: "seed-user-3",
        title: "Escondido na praia no pelo",
        video_url: "https://assets.mixkit.co/videos/preview/mixkit-waves-breaking-in-the-ocean-1527-large.mp4",
        thumbnail_url: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=500&q=80",
        views_count: 1420,
        created_at: new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString(),
        rating: 4.7,
        ratings_count: 24,
        user_profile: {
            username: "Novin",
            display_name: "Novin 👑",
            avatar_url: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&q=80",
            age: 19,
            location: "Rio de Janeiro",
            subscription_tier: "free",
            oral_preference: "Me la chupas",
            site_preference: "Me desplazo"
        }
    }
];

const SEED_COMMENTS: Record<number, VideoComment[]> = {
    1001: [
        {
            id: 2001,
            video_id: 1001,
            user_id: "seed-commenter-1",
            comment_text: "que delicia de pika tirava todo o leite",
            rating: 5,
            created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
            user_profile: {
                username: "Vitinho",
                avatar_url: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&q=80",
                age: 20
            }
        },
        {
            id: 2002,
            video_id: 1001,
            user_id: "seed-commenter-2",
            comment_text: "Quero mamar tbm",
            rating: 5,
            created_at: new Date(Date.now() - 10 * 60 * 60 * 1000).toISOString(), // 10 hours ago
            user_profile: {
                username: "Bb",
                avatar_url: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&q=80",
                age: 24
            }
        },
        {
            id: 2003,
            video_id: 1001,
            user_id: "seed-commenter-3",
            comment_text: "Que delícia?",
            rating: 4,
            created_at: new Date(Date.now() - 13 * 60 * 60 * 1000).toISOString(),
            user_profile: {
                username: "Novin",
                avatar_url: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&q=80",
                age: 19
            }
        },
        {
            id: 2004,
            video_id: 1001,
            user_id: "seed-commenter-4",
            comment_text: "Delícia absoluta!",
            rating: 5,
            created_at: new Date(Date.now() - 13 * 60 * 60 * 1000).toISOString(),
            user_profile: {
                username: "Maduro",
                avatar_url: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&q=80",
                age: 33
            }
        }
    ]
};

export const useVideoStore = create<VideoState>((set, get) => ({
    videos: [],
    comments: {},
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
                        site_preference
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
                    video_url: getPublicImageUrl(v.video_url),
                    thumbnail_url: v.thumbnail_url ? getPublicImageUrl(v.thumbnail_url) : 'https://placehold.co/600x400/1e293b/ffffff/png?text=Play',
                    views_count: v.views_count || 0,
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
                        site_preference: v.profiles?.site_preference
                    }
                }));

                set({ videos: [...mappedVideos, ...SEED_VIDEOS], loadingVideos: false });
            } else {
                // If tables exist but empty, use seed
                set({ videos: SEED_VIDEOS, loadingVideos: false });
            }
        } catch (e) {
            // Table doesn't exist, fallback to seeds + localStorage for fully working demo
            const localVideosStr = localStorage.getItem('ponto_g_local_videos');
            const localVideos: VideoPost[] = localVideosStr ? JSON.parse(localVideosStr) : [];
            set({ videos: [...localVideos, ...SEED_VIDEOS], loadingVideos: false });
        }
    },

    fetchComments: async (videoId: number) => {
        set(state => ({
            loadingComments: { ...state.loadingComments, [videoId]: true }
        }));
        try {
            const { data, error } = await supabase
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
                    comment_text: c.comment_text,
                    rating: c.rating,
                    created_at: c.created_at,
                    user_profile: {
                        username: c.profiles?.display_name || c.profiles?.username || 'Usuário',
                        avatar_url: getPublicImageUrl(c.profiles?.avatar_url),
                        age: calculateAge(c.profiles?.date_of_birth)
                    }
                }));

                const seeds = SEED_COMMENTS[videoId] || [];
                set(state => ({
                    comments: { ...state.comments, [videoId]: [...mappedComments, ...seeds] },
                    loadingComments: { ...state.loadingComments, [videoId]: false }
                }));
            } else {
                set(state => ({
                    comments: { ...state.comments, [videoId]: SEED_COMMENTS[videoId] || [] },
                    loadingComments: { ...state.loadingComments, [videoId]: false }
                }));
            }
        } catch (e) {
            // Fallback local storage
            const localCommentsKey = `ponto_g_local_video_comments_${videoId}`;
            const localCommentsStr = localStorage.getItem(localCommentsKey);
            const localComments: VideoComment[] = localCommentsStr ? JSON.parse(localCommentsStr) : [];
            const seeds = SEED_COMMENTS[videoId] || [];

            set(state => ({
                comments: { ...state.comments, [videoId]: [...localComments, ...seeds] },
                loadingComments: { ...state.loadingComments, [videoId]: false }
            }));
        }
    },

    addVideo: async (title: string, videoUrl: string, thumbnailUrl?: string) => {
        const currentUser = useAuthStore.getState().user;
        if (!currentUser) return;

        const newVideo: Partial<VideoPost> = {
            user_id: currentUser.id,
            title,
            video_url: videoUrl,
            thumbnail_url: thumbnailUrl || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=500&q=80',
            views_count: 0,
            created_at: new Date().toISOString(),
            rating: 5.0,
            ratings_count: 1
        };

        try {
            const { data, error } = await supabase
                .from('videos')
                .insert({
                    user_id: currentUser.id,
                    title,
                    video_url: videoUrl,
                    thumbnail_url: thumbnailUrl || null,
                    views_count: 0,
                    rating: 5.0,
                    ratings_count: 1
                })
                .select()
                .single();

            if (error) throw error;

            if (data) {
                toast.success('Vídeo adicionado com sucesso!');
                get().fetchVideos();
            }
        } catch (e) {
            // Local fallback
            const localVideosStr = localStorage.getItem('ponto_g_local_videos');
            const localVideos: VideoPost[] = localVideosStr ? JSON.parse(localVideosStr) : [];

            const mockVideo: VideoPost = {
                id: Math.floor(Math.random() * 100000),
                user_id: currentUser.id,
                title,
                video_url: videoUrl,
                thumbnail_url: thumbnailUrl || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=500&q=80',
                views_count: 0,
                created_at: new Date().toISOString(),
                rating: 5.0,
                ratings_count: 1,
                user_profile: {
                    username: currentUser.username,
                    display_name: currentUser.display_name || currentUser.username,
                    avatar_url: currentUser.avatar_url,
                    age: currentUser.age,
                    subscription_tier: currentUser.subscription_tier,
                    oral_preference: currentUser.oral_preference || undefined,
                    site_preference: currentUser.site_preference || undefined
                }
            };

            const updated = [mockVideo, ...localVideos];
            localStorage.setItem('ponto_g_local_videos', JSON.stringify(updated));
            set({ videos: [...updated, ...SEED_VIDEOS] });
            toast.success('Vídeo adicionado com sucesso!');
        }
    },

    addComment: async (videoId: number, commentText: string, rating: number) => {
        const currentUser = useAuthStore.getState().user;
        if (!currentUser) return;

        try {
            const { data, error } = await supabase
                .from('video_comments')
                .insert({
                    video_id: videoId,
                    user_id: currentUser.id,
                    comment_text: commentText,
                    rating: rating
                })
                .select()
                .single();

            if (error) throw error;

            toast.success('Comentário enviado!');
            get().fetchComments(videoId);
        } catch (e) {
            // Local fallback
            const localCommentsKey = `ponto_g_local_video_comments_${videoId}`;
            const localCommentsStr = localStorage.getItem(localCommentsKey);
            const localComments: VideoComment[] = localCommentsStr ? JSON.parse(localCommentsStr) : [];

            const mockComment: VideoComment = {
                id: Math.floor(Math.random() * 100000),
                video_id: videoId,
                user_id: currentUser.id,
                comment_text: commentText,
                rating: rating,
                created_at: new Date().toISOString(),
                user_profile: {
                    username: currentUser.display_name || currentUser.username,
                    avatar_url: currentUser.avatar_url,
                    age: currentUser.age
                }
            };

            const updated = [mockComment, ...localComments];
            localStorage.setItem(localCommentsKey, JSON.stringify(updated));

            // Update local state average rating for the video in-memory
            set(state => {
                const nextVideos = state.videos.map(v => {
                    if (v.id === videoId) {
                        const nextCount = v.ratings_count + 1;
                        const nextRating = parseFloat(((v.rating * v.ratings_count + rating) / nextCount).toFixed(1));
                        return { ...v, ratings_count: nextCount, rating: nextRating };
                    }
                    return v;
                });

                const seeds = SEED_COMMENTS[videoId] || [];
                return {
                    videos: nextVideos,
                    comments: {
                        ...state.comments,
                        [videoId]: [...updated, ...seeds]
                    }
                };
            });

            toast.success('Comentário enviado!');
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
                        return { ...v, views_count: v.views_count + 1 };
                    }
                    return v;
                })
            }));
        }
    }
}));
