import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { Community, CommunityPost, CommunityComment, UserConnection } from '../types';

interface CommunityState {
    communities: Community[];
    myCommunities: Community[];
    connections: UserConnection[];
    currentCommunityPosts: CommunityPost[];
    loading: boolean;
    error: string | null;
    
    // Actions
    fetchCommunities: () => Promise<void>;
    fetchMyCommunities: () => Promise<void>;
    fetchConnections: () => Promise<void>;
    fetchCommunityPosts: (communityId: string) => Promise<void>;
    fetchCommunityMembers: (communityId: string) => Promise<any[]>;
    updateMemberRole: (communityId: string, userId: string, role: string) => Promise<void>;
    removeMember: (communityId: string, userId: string) => Promise<void>;
    updateCommunity: (communityId: string, data: Partial<Community>) => Promise<void>;
    submitJoinRequest: (communityId: string, answers: any) => Promise<void>;
    fetchJoinRequests: (communityId: string) => Promise<any[]>;
    handleJoinRequest: (communityId: string, postId: string, userId: string, approve: boolean) => Promise<void>;
    fetchMyRole: (communityId: string) => Promise<string | null>;
    createCommunity: (data: Partial<Community>) => Promise<Community | null>;
    joinCommunity: (communityId: string) => Promise<void>;
    leaveCommunity: (communityId: string) => Promise<void>;
    createPost: (communityId: string, content: string, imageUrl?: string, tags?: string[]) => Promise<void>;
    toggleLikePost: (postId: string) => Promise<void>;
    repostPost: (postId: string, communityId: string) => Promise<void>;
    deletePost: (postId: string, communityId: string) => Promise<void>;
    editPost: (postId: string, communityId: string, content: string) => Promise<void>;
}

export const useCommunityStore = create<CommunityState>((set, get) => ({
    communities: [],
    myCommunities: [],
    connections: [],
    currentCommunityPosts: [],
    loading: false,
    error: null,

    fetchCommunities: async () => {
        set({ loading: true, error: null });
        try {
            const { data, error } = await supabase
                .from('communities')
                .select('*')
                .order('created_at', { ascending: false });
                
            if (error) throw error;
            set({ communities: data as Community[] });
        } catch (error: any) {
            console.error('Error fetching communities:', error);
            set({ error: error.message });
        } finally {
            set({ loading: false });
        }
    },

    fetchMyCommunities: async () => {
        set({ loading: true, error: null });
        const { data: userData } = await supabase.auth.getUser();
        if (!userData.user) {
            set({ loading: false });
            return;
        }
        try {
            const { data, error } = await supabase
                .from('community_members')
                .select('community_id, communities(*)')
                .eq('user_id', userData.user.id);
                
            if (error) throw error;
            const myComms = data.map((d: any) => d.communities) as Community[];
            set({ myCommunities: myComms });
        } catch (error: any) {
            console.error('Error fetching my communities:', error);
            set({ error: error.message });
        } finally {
            set({ loading: false });
        }
    },

    fetchConnections: async () => {
        set({ loading: true, error: null });
        const { data: userData } = await supabase.auth.getUser();
        if (!userData.user) return set({ loading: false });
        
        try {
            const { data, error } = await supabase
                .from('user_connections')
                .select(`
                    *,
                    following:profiles!user_connections_following_id_fkey(*),
                    follower:profiles!user_connections_follower_id_fkey(*)
                `)
                .or(`follower_id.eq.${userData.user.id},following_id.eq.${userData.user.id}`);
                
            if (error) throw error;
            set({ connections: data as any[] });
        } catch (error: any) {
            console.error('Error fetching connections:', error);
            set({ error: error.message });
        } finally {
            set({ loading: false });
        }
    },

    fetchCommunityPosts: async (communityId: string) => {
        set({ loading: true, error: null });
        try {
            const { data: userData } = await supabase.auth.getUser();
            const { data, error } = await supabase
                .from('community_posts')
                .select('*, author:profiles!community_posts_author_id_fkey(*), repost:repost_id(*, author:profiles!community_posts_author_id_fkey(*))')
                .eq('community_id', communityId)
                .order('created_at', { ascending: false });
                
            if (error) throw error;
            
            let posts = (data as any[]).filter(p => !p.tags || !p.tags.includes('join_request'));
            
            if (userData.user && posts.length > 0) {
                const postIds = posts.map(p => p.id);
                const { data: likes } = await supabase
                    .from('community_post_likes')
                    .select('post_id')
                    .eq('user_id', userData.user.id)
                    .in('post_id', postIds);
                    
                const likedPostIds = new Set(likes?.map(l => l.post_id) || []);
                posts = posts.map(p => ({ ...p, user_has_liked: likedPostIds.has(p.id) }));
            }
            
            set({ currentCommunityPosts: posts });
        } catch (error: any) {
            console.error('Error fetching community posts:', error);
            set({ error: error.message });
        } finally {
            set({ loading: false });
        }
    },

    
    fetchMyRole: async (communityId: string) => {
        const { data: userData } = await supabase.auth.getUser();
        if (!userData.user) return null;
        try {
            const { data, error } = await supabase.from('community_members').select('role').eq('community_id', communityId).eq('user_id', userData.user.id).maybeSingle();
            if (error) throw error;
            return data?.role || null;
        } catch (e) {
            console.error(e);
            return null;
        }
    },
    fetchCommunityMembers: async (communityId: string) => {
        try {
            const { data, error } = await supabase.from('community_members').select('*, profile:profiles!community_members_user_id_fkey(*)').eq('community_id', communityId);
            if (error) throw error;
            return data;
        } catch (e) {
            console.error(e);
            return [];
        }
    },
    updateMemberRole: async (communityId: string, userId: string, role: string) => {
        try {
            const { error } = await supabase.from('community_members').update({ role }).eq('community_id', communityId).eq('user_id', userId);
            if (error) throw error;
        } catch (e) {
            console.error(e);
        }
    },
    removeMember: async (communityId: string, userId: string) => {
        try {
            const { error } = await supabase.from('community_members').delete().eq('community_id', communityId).eq('user_id', userId);
            if (error) throw error;
            get().fetchMyCommunities();
        } catch (e) {
            console.error(e);
        }
    },
    updateCommunity: async (communityId: string, data: Partial<Community>) => {
        try {
            const { error } = await supabase.from('communities').update(data).eq('id', communityId);
            if (error) throw error;
            get().fetchCommunities();
            get().fetchMyCommunities();
        } catch (e) {
            console.error(e);
        }
    },
    submitJoinRequest: async (communityId: string, answers: any) => {
        const { data: userData } = await supabase.auth.getUser();
        if (!userData.user) return;
        try {
            const { error } = await supabase.from('community_posts').insert({
                community_id: communityId,
                author_id: userData.user.id,
                content: JSON.stringify(answers),
                tags: ['join_request']
            });
            if (error) throw error;
        } catch (e) {
            console.error(e);
        }
    },
    fetchJoinRequests: async (communityId: string) => {
        try {
            const { data, error } = await supabase.from('community_posts')
                .select('*, author:profiles!community_posts_author_id_fkey(*)')
                .eq('community_id', communityId)
                .contains('tags', ['join_request']);
            if (error) throw error;
            return data;
        } catch (e) {
            console.error(e);
            return [];
        }
    },
    handleJoinRequest: async (communityId: string, postId: string, userId: string, approve: boolean) => {
        try {
            if (approve) {
                await supabase.from('community_members').insert({
                    community_id: communityId,
                    user_id: userId,
                    role: 'member'
                });
            }
            await supabase.from('community_posts').delete().eq('id', postId);
        } catch (e) {
            console.error(e);
        }
    },
    toggleLikePost: async (postId: string) => {
        const { data: userData } = await supabase.auth.getUser();
        if (!userData.user) return;
        
        const userId = userData.user.id;
        const posts = get().currentCommunityPosts;
        const post = posts.find(p => p.id === postId);
        
        if (!post) return;
        
        const isLiked = post.user_has_liked;
        
        // Optimistic update
        set({
            currentCommunityPosts: posts.map(p => 
                p.id === postId 
                    ? { ...p, user_has_liked: !isLiked, likes_count: (p.likes_count || 0) + (isLiked ? -1 : 1) }
                    : p
            )
        });
        
        try {
            if (isLiked) {
                await supabase.from('community_post_likes').delete().eq('post_id', postId).eq('user_id', userId);
            } else {
                await supabase.from('community_post_likes').insert({ post_id: postId, user_id: userId });
            }
        } catch (error) {
            console.error('Error toggling like:', error);
            // Revert on error
            set({ currentCommunityPosts: posts });
        }
    },

    createCommunity: async (data: Partial<Community>) => {
        set({ loading: true, error: null });
        const { data: userData } = await supabase.auth.getUser();
        if (!userData.user) return null;
        
        try {
            const { data: newCommunity, error } = await supabase
                .from('communities')
                .insert({ ...data, creator_id: userData.user.id })
                .select()
                .single();
                
            if (error) throw error;
            
            // Auto join creator as admin
            await supabase.from('community_members').insert({
                community_id: newCommunity.id,
                user_id: userData.user.id,
                role: 'admin'
            });
            
            set(state => ({ communities: [newCommunity, ...state.communities] }));
            return newCommunity as Community;
        } catch (error: any) {
            console.error('Error creating community:', error);
            set({ error: error.message });
            return null;
        } finally {
            set({ loading: false });
        }
    },

    joinCommunity: async (communityId: string) => {
        const { data: userData } = await supabase.auth.getUser();
        if (!userData.user) return;
        try {
            const { error } = await supabase
                .from('community_members')
                .insert({ community_id: communityId, user_id: userData.user.id });
            if (error) throw error;
            get().fetchMyCommunities();
        } catch (error: any) {
            console.error('Error joining community:', error);
        }
    },

    leaveCommunity: async (communityId: string) => {
        const { data: userData } = await supabase.auth.getUser();
        if (!userData.user) return;
        try {
            const { error } = await supabase
                .from('community_members')
                .delete()
                .eq('community_id', communityId)
                .eq('user_id', userData.user.id);
            if (error) throw error;
            get().fetchMyCommunities();
        } catch (error: any) {
            console.error('Error leaving community:', error);
        }
    },

    
    repostPost: async (postId: string, communityId: string) => {
        const { data: userData } = await supabase.auth.getUser();
        if (!userData.user) return;
        
        try {
            const { error } = await supabase
                .from('community_posts')
                .insert({ community_id: communityId, author_id: userData.user.id, content: '', repost_id: postId });
                
            if (error) throw error;
            get().fetchCommunityPosts(communityId);
        } catch (error: any) {
            console.error('Error reposting:', error);
            throw error;
        }
    },

    createPost: async (communityId: string, content: string, imageUrl?: string, tags?: string[]) => {
        const { data: userData } = await supabase.auth.getUser();
        if (!userData.user) return;
        
        try {
            const { error } = await supabase
                .from('community_posts')
                .insert({ community_id: communityId, author_id: userData.user.id, content, image_url: imageUrl, tags: tags || [] });
            if (error) throw error;
            get().fetchCommunityPosts(communityId);
        } catch (error: any) {
            console.error('Error creating post:', error);
        }
    },

    deletePost: async (postId: string, communityId: string) => {
        try {
            const { error } = await supabase
                .from('community_posts')
                .delete()
                .eq('id', postId);
            if (error) throw error;
            get().fetchCommunityPosts(communityId);
        } catch (error: any) {
            console.error('Error deleting post:', error);
            throw error;
        }
    },

    editPost: async (postId: string, communityId: string, content: string) => {
        try {
            const { error } = await supabase
                .from('community_posts')
                .update({ content })
                .eq('id', postId);
            if (error) throw error;
            get().fetchCommunityPosts(communityId);
        } catch (error: any) {
            console.error('Error editing post:', error);
            throw error;
        }
    }
}));
