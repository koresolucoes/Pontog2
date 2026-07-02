

import { create } from 'zustand';
import { supabase, getPublicImageUrl } from '../lib/supabase';
import { NewsArticle, NewsComment } from '../types';
import { useAuthStore } from './authStore';
import toast from 'react-hot-toast';

interface NewsState {
    articles: NewsArticle[];
    loading: boolean;
    fetchArticles: () => Promise<void>;
    
    // Lógica de Comentários
    activeComments: NewsComment[];
    loadingComments: boolean;
    fetchComments: (articleId: string) => Promise<void>;
    addComment: (articleId: string, content: string) => Promise<void>;
    toggleLikeComment: (commentId: number, hasLiked: boolean) => Promise<void>;
}

export const useNewsStore = create<NewsState>((set, get) => ({
    articles: [],
    loading: false,
    activeComments: [],
    loadingComments: false,

    fetchArticles: async () => {
        set({ loading: true });
        
        const { data, error } = await supabase
            .from('news_articles')
            .select('*')
            .order('published_at', { ascending: false });
            
        if (error) {
            console.error('Error fetching news:', error);
        } else {
            set({ articles: data as NewsArticle[] });
        }
        set({ loading: false });
    },

    fetchComments: async (articleId: string) => {
        set({ loadingComments: true, activeComments: [] });
        
        const { data, error } = await supabase.rpc('get_news_comments', { p_article_id: articleId });

        if (error) {
            console.error('Error fetching comments:', error);
            set({ loadingComments: false });
            return;
        }

        const formattedComments = data.map((c: any) => ({
            ...c,
            avatar_url: getPublicImageUrl(c.avatar_url)
        }));

        set({ activeComments: formattedComments, loadingComments: false });
    },

    addComment: async (articleId: string, content: string) => {
        const user = useAuthStore.getState().user;
        if (!user) {
            toast.error('Você precisa estar logado para comentar.');
            return;
        }

        const { error } = await supabase
            .from('news_comments')
            .insert({ article_id: articleId, user_id: user.id, content });

        if (error) {
            toast.error('Erro ao enviar comentário.');
            console.error(error);
        } else {
            // Recarrega os comentários para garantir a ordem correta
            get().fetchComments(articleId);
        }
    },

    toggleLikeComment: async (commentId: number, hasLiked: boolean) => {
        const user = useAuthStore.getState().user;
        if (!user) {
            toast.error('Faça login para curtir.');
            return;
        }

        // Optimistic Update
        set(state => ({
            activeComments: state.activeComments.map(c => 
                c.id === commentId 
                ? { ...c, user_has_liked: !hasLiked, likes_count: hasLiked ? c.likes_count - 1 : c.likes_count + 1 }
                : c
            )
        }));

        if (hasLiked) {
            await supabase.from('news_comment_likes').delete().match({ comment_id: commentId, user_id: user.id });
        } else {
            await supabase.from('news_comment_likes').insert({ comment_id: commentId, user_id: user.id });
        }
    }
}));