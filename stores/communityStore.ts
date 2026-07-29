import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';
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
    deleteCommunity: (communityId: string) => Promise<void>;
    requestConnection: (targetUserId: string) => Promise<void>;
    acceptConnection: (connectionId: string) => Promise<void>;
    rejectConnection: (connectionId: string) => Promise<void>;
    applyBatchedPostUpdates: (postUpdates: any[]) => void;
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
            
            let posts = (data as any[]).filter(p => !p.tags || (!p.tags.includes('join_request') && !p.tags.includes('comment_like')));
            
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
                const { error } = await supabase.from('community_post_likes').delete().eq('post_id', postId).eq('user_id', userId);
                if (error) throw error;
            } else {
                const { error } = await supabase.from('community_post_likes').insert({ post_id: postId, user_id: userId });
                if (error) throw error;

                // Send push notification to post author if liker is not the author
                if (post.author_id && post.author_id !== userId) {
                    supabase.auth.getSession().then(({ data: { session } }) => {
                        if (session) {
                            supabase.from('profiles').select('username, display_name').eq('id', userId).single().then(({ data: profile }) => {
                                const likerName = profile?.display_name || profile?.username || 'Alguém';
                                fetch('/api/send-generic-push', {
                                    method: 'POST',
                                    headers: {
                                        'Content-Type': 'application/json',
                                        'Authorization': `Bearer ${session.access_token}`
                                    },
                                    body: JSON.stringify({
                                        receiver_id: post.author_id,
                                        title: 'Sua publicação recebeu uma curtida! ❤️',
                                        body: `${likerName} curtiu o seu post.`
                                    })
                                }).catch(err => console.error("Error sending like push:", err));
                            });
                        }
                    });
                }
            }
        } catch (error: any) {
            console.error('Error toggling like:', error);
            // Revert on error
            set({ currentCommunityPosts: posts });
            if (error?.code === '42501' || error?.message?.includes('row-level security') || error?.message?.includes('RLS')) {
                toast.error('Você precisa fazer parte da comunidade para curtir.');
            } else {
                toast.error('Erro ao curtir publicação.');
            }
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
            throw error;
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
            throw error;
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
            if (error?.code === '42501' || error?.message?.includes('row-level security') || error?.message?.includes('RLS')) {
                toast.error('Você precisa fazer parte da comunidade para repostar.');
            } else {
                toast.error('Erro ao repostar publicação.');
            }
            throw error;
        }
    },

    createPost: async (communityId: string, content: string, imageUrl?: string, tags?: string[]) => {
        const { data: userData } = await supabase.auth.getUser();
        if (!userData.user) throw new Error('Usuário não autenticado.');
        
        try {
            const { error } = await supabase
                .from('community_posts')
                .insert({ community_id: communityId, author_id: userData.user.id, content, image_url: imageUrl, tags: tags || [] });
            if (error) throw error;
            await get().fetchCommunityPosts(communityId);
        } catch (error: any) {
            console.error('Error creating post in communityStore:', error);
            if (error?.code === '42501' || error?.message?.includes('row-level security') || error?.message?.includes('RLS')) {
                toast.error('Você precisa fazer parte da comunidade para publicar.');
            } else {
                toast.error('Erro ao criar publicação.');
            }
            throw error;
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
    },

    deleteCommunity: async (communityId: string) => {
        set({ loading: true, error: null });
        try {
            // First let's get all post IDs for this community to clean up related data safely
            const { data: posts } = await supabase
                .from('community_posts')
                .select('id')
                .eq('community_id', communityId);

            if (posts && posts.length > 0) {
                const postIds = posts.map(p => p.id);
                
                // Delete likes associated with these posts
                await supabase
                    .from('community_post_likes')
                    .delete()
                    .in('post_id', postIds);
                    
                // Delete comments associated with these posts
                await supabase
                    .from('community_comments')
                    .delete()
                    .in('post_id', postIds);

                // Delete posts
                await supabase
                    .from('community_posts')
                    .delete()
                    .eq('community_id', communityId);
            }

            // Delete members
            await supabase
                .from('community_members')
                .delete()
                .eq('community_id', communityId);

            // Finally delete the community itself
            const { error } = await supabase
                .from('communities')
                .delete()
                .eq('id', communityId);
                
            if (error) throw error;

            set(state => ({
                communities: state.communities.filter(c => c.id !== communityId),
                myCommunities: state.myCommunities.filter(c => c.id !== communityId)
            }));
        } catch (error: any) {
            console.error('Error deleting community:', error);
            set({ error: error.message });
            throw error;
        } finally {
            set({ loading: false });
        }
    },

    requestConnection: async (targetUserId: string) => {
        const { data: userData } = await supabase.auth.getUser();
        if (!userData.user) return;
        
        const { error } = await supabase
            .from('user_connections')
            .insert({
                follower_id: userData.user.id,
                following_id: targetUserId,
                status: 'pending'
            });
            
        if (error) throw error;
        await get().fetchConnections();

        // Send push notification to target user
        const { session } = (await supabase.auth.getSession()).data;
        if (session) {
            supabase.from('profiles').select('username, display_name').eq('id', userData.user.id).single().then(({ data: profile }) => {
                const senderName = profile?.display_name || profile?.username || 'Alguém';
                fetch('/api/send-generic-push', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${session.access_token}`
                    },
                    body: JSON.stringify({
                        receiver_id: targetUserId,
                        title: 'Nova solicitação de conexão! ✨',
                        body: `${senderName} quer se conectar com você para conversar.`
                    })
                }).catch(err => console.error("Error sending connection request push:", err));
            });
        }
    },
    
    acceptConnection: async (connectionId: string) => {
        const { error } = await supabase
            .from('user_connections')
            .update({ status: 'accepted' })
            .eq('id', connectionId);
            
        if (error) throw error;
        await get().fetchConnections();
    },
    
    applyBatchedPostUpdates: (postUpdates) => {
        set(state => {
            const newPosts = [...state.currentCommunityPosts];
            let changed = false;
            
            if (postUpdates && postUpdates.length > 0) {
                const updateMap = new Map();
                postUpdates.forEach(u => updateMap.set(u.id, u));
                for (let i = 0; i < newPosts.length; i++) {
                    const update = updateMap.get(newPosts[i].id);
                    if (update) {
                        newPosts[i] = { ...newPosts[i], ...update };
                        changed = true;
                    }
                }
            }
            
            return changed ? { currentCommunityPosts: newPosts } : {};
        });
    },
    rejectConnection: async (connectionId: string) => {
        const { error } = await supabase
            .from('user_connections')
            .delete()
            .eq('id', connectionId);
            
        if (error) throw error;
        await get().fetchConnections();
    }
}));

let postUpdateBatch: any[] = [];
let isPostBatchScheduled = false;

export const subscribeToCommunityEvents = () => {
   const processBatch = () => {
        if (postUpdateBatch.length > 0) {
            useCommunityStore.getState().applyBatchedPostUpdates(postUpdateBatch);
            postUpdateBatch = [];
        }
        isPostBatchScheduled = false;
   };

   supabase.channel('community_realtime')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'community_posts' }, payload => {
          postUpdateBatch.push(payload.new);
          if (!isPostBatchScheduled) {
              isPostBatchScheduled = true;
              setTimeout(processBatch, 2000); // 2 second throttle batch
          }
      })
      .subscribe();
};
