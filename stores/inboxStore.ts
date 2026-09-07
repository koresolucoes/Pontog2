// stores/inboxStore.ts
import { create } from 'zustand';
import { supabase, getPublicImageUrl } from '../lib/supabase';
import { ConversationPreview, WinkWithProfile, User, AlbumAccessRequest, ProfileViewWithProfile } from '../types';
import toast from 'react-hot-toast';
import { useAuthStore } from './authStore';
import { profileQueries, type PublicProfileV1 } from '../modules/profiles/public';

const calculateAge = (dob: string | null): number => {
    if (!dob) return 0;
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
    return age;
};

const resolvePublicProfiles = async (ids: Array<string | null | undefined>): Promise<Map<string, PublicProfileV1>> => {
    const uniqueIds = Array.from(new Set(ids.filter((id): id is string => !!id)));
    const entries = await Promise.all(uniqueIds.map(async (id) => {
        try {
            return [id, await profileQueries.getPublicProfile(id)] as const;
        } catch (error) {
            console.warn(`Could not resolve public profile ${id}:`, error);
            return [id, null] as const;
        }
    }));

    return new Map(entries.filter((entry): entry is readonly [string, PublicProfileV1] => !!entry[1]));
};

interface InboxState {
  conversations: ConversationPreview[];
  winks: WinkWithProfile[];
  accessRequests: AlbumAccessRequest[];
  profileViews: ProfileViewWithProfile[];
  messageRequests: any[];
  totalUnreadCount: number;
  loadingConversations: boolean;
  loadingWinks: boolean;
  loadingRequests: boolean;
  loadingProfileViews: boolean;
  loadingMessageRequests: boolean;
  realtimeChannel: any | null;
  lastConversationUpdate: number;
  winksHaveBeenSeen: boolean;
  requestsHaveBeenSeen: boolean;
  lastConversationsFetch: number;
  lastWinksFetch: number;
  lastRequestsFetch: number;
  lastViewsFetch: number;
  lastMessageRequestsFetch: number;
  fetchConversations: (force?: boolean) => Promise<void>;
  fetchWinks: (force?: boolean) => Promise<void>;
  fetchAccessRequests: (force?: boolean) => Promise<void>;
  fetchProfileViews: (force?: boolean) => Promise<void>;
  fetchMessageRequests: (force?: boolean) => Promise<void>;
  acceptMessageRequest: (connectionId: string, followerId: string) => Promise<void>;
  rejectMessageRequest: (connectionId: string) => Promise<void>;
  respondToRequest: (requestId: number, status: 'granted' | 'denied') => Promise<void>;
  deleteConversation: (conversationId: number) => Promise<void>;
  clearWinks: () => void;
  clearAccessRequests: () => void;
  clearUnreadCountForConversation: (conversationId: number) => void;
  subscribeToInboxChanges: () => void;
  cleanupRealtime: () => void;
}

export const useInboxStore = create<InboxState>((set, get) => {
    const updateTotalUnreadCount = () => {
        const { conversations, winks, accessRequests, winksHaveBeenSeen, requestsHaveBeenSeen, messageRequests } = get();
        const unreadMessages = conversations.reduce((sum, convo) => sum + (convo.unread_count || 0), 0);
        const newWinksCount = winksHaveBeenSeen ? 0 : winks.length;
        const newRequestsCount = requestsHaveBeenSeen ? 0 : accessRequests.length;
        const pendingMessageRequestsCount = messageRequests?.length || 0;
        set({ totalUnreadCount: unreadMessages + newWinksCount + newRequestsCount + pendingMessageRequestsCount });
    };

    return {
        conversations: [],
        winks: [],
        accessRequests: [],
        profileViews: [],
        messageRequests: [],
        totalUnreadCount: 0,
        loadingConversations: false,
        loadingWinks: false,
        loadingRequests: false,
        loadingProfileViews: false,
        loadingMessageRequests: false,
        realtimeChannel: null,
        lastConversationUpdate: 0,
        winksHaveBeenSeen: true,
        requestsHaveBeenSeen: true,
        lastConversationsFetch: 0,
        lastWinksFetch: 0,
        lastRequestsFetch: 0,
        lastViewsFetch: 0,
        lastMessageRequestsFetch: 0,

        fetchConversations: async (force = false) => {
            const now = Date.now();
            if (!force && now - get().lastConversationsFetch < 60000 && get().conversations.length > 0) return;
            if (get().conversations.length === 0) set({ loadingConversations: true });

            try {
                const { data, error } = await supabase.rpc('get_my_conversations');
                if (error) throw error;

                const processedConversations = (data || []).map((convo: any) => ({
                    ...convo,
                    other_participant_avatar_url: getPublicImageUrl(convo.other_participant_avatar_url),
                }));

                set({ conversations: processedConversations, loadingConversations: false, lastConversationsFetch: now });
                get().fetchMessageRequests();
                updateTotalUnreadCount();
            } catch (err: any) {
                console.warn('Fallback: get_my_conversations RPC failed, using safe manual fetch:', err.message || err);
                try {
                    const currentUser = useAuthStore.getState().user;
                    if (!currentUser) throw new Error('Sem usuário autenticado');

                    const { data: myParts, error: myPartsError } = await supabase
                        .from('conversation_participants')
                        .select('conversation_id')
                        .eq('user_id', currentUser.id);
                    if (myPartsError) throw myPartsError;

                    const convIds = (myParts || []).map((p: any) => p.conversation_id);
                    if (convIds.length === 0) {
                        set({ conversations: [], loadingConversations: false, lastConversationsFetch: now });
                        updateTotalUnreadCount();
                        return;
                    }

                    const [{ data: otherParts, error: otherPartsError }, { data: msgs, error: msgsError }] = await Promise.all([
                        supabase.from('conversation_participants').select('conversation_id, user_id').in('conversation_id', convIds).neq('user_id', currentUser.id),
                        supabase.from('messages').select('*').in('conversation_id', convIds).order('created_at', { ascending: false }).limit(300),
                    ]);
                    if (otherPartsError) throw otherPartsError;
                    if (msgsError) throw msgsError;

                    const publicProfiles = await resolvePublicProfiles((otherParts || []).map((part: any) => part.user_id));
                    const conversationsResult: any[] = [];

                    for (const convId of convIds) {
                        const otherPart = (otherParts || []).find((p: any) => p.conversation_id === convId);
                        const profile = otherPart ? publicProfiles.get(otherPart.user_id) : null;
                        const convMsgs = (msgs || []).filter((m: any) => m.conversation_id === convId);
                        const lastMsg = convMsgs[0];

                        if (otherPart && profile && lastMsg) {
                            const unreadCount = convMsgs.filter((m: any) => m.sender_id !== currentUser.id && !m.viewed_at).length;
                            conversationsResult.push({
                                conversation_id: convId,
                                other_participant_id: profile.id,
                                other_participant_username: profile.username || 'Usuário',
                                other_participant_avatar_url: getPublicImageUrl(profile.avatar_url),
                                other_participant_last_seen: null,
                                last_message_content: lastMsg.content || (lastMsg.image_url ? '📷 Foto' : ''),
                                last_message_created_at: lastMsg.created_at,
                                last_message_sender_id: lastMsg.sender_id,
                                unread_count: unreadCount,
                                other_participant_subscription_tier: profile.subscription_tier || 'free',
                            });
                        }
                    }

                    conversationsResult.sort((a, b) => new Date(b.last_message_created_at).getTime() - new Date(a.last_message_created_at).getTime());
                    set({ conversations: conversationsResult, loadingConversations: false, lastConversationsFetch: now });
                    updateTotalUnreadCount();
                } catch (fallbackErr) {
                    console.error('Fallback fetchConversations failed:', fallbackErr);
                    set({ loadingConversations: false });
                }
            }
        },

        fetchWinks: async (force = false) => {
            const now = Date.now();
            if (!force && now - get().lastWinksFetch < 60000 && get().winks.length > 0) return;
            if (get().winks.length === 0) set({ loadingWinks: true });

            let winksWithAgeAndUrls: any[] = [];
            try {
                const { data, error } = await supabase.rpc('get_my_winks');
                if (error) throw error;
                winksWithAgeAndUrls = (data || []).map((wink: any) => ({
                    ...(wink as User),
                    wink_created_at: wink.wink_created_at,
                    age: calculateAge(wink.date_of_birth),
                    avatar_url: getPublicImageUrl(wink.avatar_url),
                    public_photos: Array.isArray(wink.public_photos) ? wink.public_photos.map((photo: string) => getPublicImageUrl(photo)) : [],
                }));
            } catch (err: any) {
                console.warn('Fallback: get_my_winks RPC failed, using safe public profiles:', err.message || err);
                try {
                    const currentUser = useAuthStore.getState().user;
                    if (!currentUser) throw new Error('Sem usuário autenticado');
                    const { data: winksData, error: winksError } = await supabase
                        .from('winks')
                        .select('created_at, sender_id')
                        .eq('receiver_id', currentUser.id)
                        .order('created_at', { ascending: false });
                    if (winksError) throw winksError;

                    const publicProfiles = await resolvePublicProfiles((winksData || []).map((w: any) => w.sender_id));
                    winksWithAgeAndUrls = (winksData || []).flatMap((w: any) => {
                        const sender = publicProfiles.get(w.sender_id);
                        if (!sender) return [];
                        return [{
                            ...sender,
                            wink_created_at: w.created_at,
                            age: sender.age || 0,
                            avatar_url: getPublicImageUrl(sender.avatar_url),
                            public_photos: Array.isArray(sender.public_photos) ? sender.public_photos.map((photo: string) => getPublicImageUrl(photo)) : [],
                        }];
                    });
                } catch (fallbackErr) {
                    console.error('Fallback fetchWinks failed:', fallbackErr);
                    set({ loadingWinks: false });
                    return;
                }
            }

            const lastViewedTime = localStorage.getItem('ponto_g_last_viewed_winks');
            let hasNewItems = false;
            if (winksWithAgeAndUrls.length > 0) {
                const newestWinkDate = new Date(winksWithAgeAndUrls[0].wink_created_at);
                if (!lastViewedTime || newestWinkDate > new Date(lastViewedTime)) hasNewItems = true;
            }

            set({
                winks: winksWithAgeAndUrls,
                loadingWinks: false,
                winksHaveBeenSeen: !hasNewItems,
                lastWinksFetch: now,
            });
            updateTotalUnreadCount();
        },

        fetchAccessRequests: async (force = false) => {
            const now = Date.now();
            if (!force && now - get().lastRequestsFetch < 60000 && get().accessRequests.length > 0) return;
            if (get().accessRequests.length === 0) set({ loadingRequests: true });

            let { data, error } = await supabase.rpc('get_my_album_access_requests');
            if (error || !data) {
                const { data: userData } = await supabase.auth.getUser();
                if (userData?.user) {
                    const res = await supabase
                        .from('private_album_access')
                        .select('id, requester_id, created_at')
                        .eq('owner_id', userData.user.id)
                        .eq('status', 'pending');

                    if (!res.error && res.data) {
                        const publicProfiles = await resolvePublicProfiles(res.data.map((req: any) => req.requester_id));
                        data = res.data.flatMap((req: any) => {
                            const profile = publicProfiles.get(req.requester_id);
                            if (!profile) return [];
                            return [{
                                id: req.id,
                                requester_id: req.requester_id,
                                username: profile.username,
                                avatar_url: profile.avatar_url,
                                created_at: req.created_at,
                            }];
                        });
                        error = null;
                    }
                }
            }

            if (error) {
                console.error('Error fetching access requests:', error);
                set({ loadingRequests: false });
                return;
            }

            const processedRequests = (data || []).map((req: any) => ({ ...req, avatar_url: getPublicImageUrl(req.avatar_url) }));
            const lastViewedTime = localStorage.getItem('ponto_g_last_viewed_requests');
            let hasNewItems = false;
            if (processedRequests.length > 0) {
                const newestRequestDate = new Date(processedRequests[0].created_at);
                if (!lastViewedTime || newestRequestDate > new Date(lastViewedTime)) hasNewItems = true;
            }

            set({
                accessRequests: processedRequests,
                loadingRequests: false,
                requestsHaveBeenSeen: !hasNewItems,
                lastRequestsFetch: now,
            });
            updateTotalUnreadCount();
        },

        fetchProfileViews: async (force = false) => {
            const now = Date.now();
            if (!force && now - get().lastViewsFetch < 60000 && get().profileViews.length > 0) return;
            if (get().profileViews.length === 0) set({ loadingProfileViews: true });

            const { data, error } = await supabase.rpc('get_my_profile_viewers');
            if (error) {
                console.error('Error fetching profile views:', error);
                set({ loadingProfileViews: false });
                return;
            }

            const viewsWithAgeAndUrls = (data || []).map((view: any) => ({
                ...(view as User),
                viewed_at: view.viewed_at,
                age: calculateAge(view.date_of_birth),
                avatar_url: getPublicImageUrl(view.avatar_url),
                public_photos: (view.public_photos || []).map((photo: string) => getPublicImageUrl(photo)),
            }));

            set({ profileViews: viewsWithAgeAndUrls, loadingProfileViews: false, lastViewsFetch: now });
        },

        respondToRequest: async (requestId: number, status: 'granted' | 'denied') => {
            const { error } = await supabase.from('private_album_access').update({ status, updated_at: new Date().toISOString() }).eq('id', requestId);
            if (error) {
                toast.error('Erro ao responder à solicitação.');
                console.error('Error responding to request:', error);
            } else {
                toast.success(`Solicitação ${status === 'granted' ? 'aceita' : 'recusada'}.`);
                set(state => ({ accessRequests: state.accessRequests.filter(req => req.id !== requestId) }));
                updateTotalUnreadCount();
            }
        },

        deleteConversation: async (conversationId: number) => {
            set(state => ({ conversations: state.conversations.filter(c => c.conversation_id !== conversationId) }));
            updateTotalUnreadCount();
            const { error } = await supabase.rpc('delete_conversation', { p_conversation_id: conversationId });
            if (error) {
                toast.error('Erro ao apagar a conversa.');
                console.error('Error deleting conversation:', error);
                get().fetchConversations(true);
            } else toast.success('Conversa apagada.');
        },

        clearWinks: () => {
            if (get().winksHaveBeenSeen) return;
            const { winks } = get();
            if (winks.length > 0) {
                const newestWinkDate = new Date(winks[0].wink_created_at).getTime() + 1000;
                localStorage.setItem('ponto_g_last_viewed_winks', new Date(newestWinkDate).toISOString());
            } else localStorage.setItem('ponto_g_last_viewed_winks', new Date().toISOString());
            set({ winksHaveBeenSeen: true });
            updateTotalUnreadCount();
        },

        clearAccessRequests: () => {
            if (get().requestsHaveBeenSeen) return;
            const { accessRequests } = get();
            if (accessRequests.length > 0) {
                const newestRequestDate = new Date(accessRequests[0].created_at).getTime() + 1000;
                localStorage.setItem('ponto_g_last_viewed_requests', new Date(newestRequestDate).toISOString());
            } else localStorage.setItem('ponto_g_last_viewed_requests', new Date().toISOString());
            set({ requestsHaveBeenSeen: true });
            updateTotalUnreadCount();
        },

        clearUnreadCountForConversation: (conversationId: number) => {
            set(state => ({ conversations: state.conversations.map(c => c.conversation_id === conversationId ? { ...c, unread_count: 0 } : c) }));
            updateTotalUnreadCount();
        },

        subscribeToInboxChanges: () => {
            if (get().realtimeChannel) return;
            const user = useAuthStore.getState().user;
            if (!user) return;

            const channel = supabase
                .channel(`inbox:${user.id}`)
                .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, () => {
                    const now = Date.now();
                    if (now - get().lastConversationUpdate > 2000) {
                        get().fetchConversations();
                        set({ lastConversationUpdate: now });
                    }
                })
                .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'winks', filter: `receiver_id=eq.${user.id}` }, () => get().fetchWinks())
                .on('postgres_changes', { event: '*', schema: 'public', table: 'private_album_access', filter: `owner_id=eq.${user.id}` }, () => get().fetchAccessRequests())
                .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'profile_views', filter: `viewed_id=eq.${user.id}` }, () => get().fetchProfileViews())
                .on('postgres_changes', { event: '*', schema: 'public', table: 'user_connections', filter: `following_id=eq.${user.id}` }, () => get().fetchMessageRequests())
                .subscribe();

            set({ realtimeChannel: channel });
        },

        cleanupRealtime: () => {
            const { realtimeChannel } = get();
            if (realtimeChannel) {
                supabase.removeChannel(realtimeChannel);
                set({ realtimeChannel: null });
            }
        },

        fetchMessageRequests: async (force = false) => {
            const now = Date.now();
            if (!force && now - get().lastMessageRequestsFetch < 30000 && get().messageRequests.length > 0) return;

            const currentUser = useAuthStore.getState().user;
            if (!currentUser) return;
            if (get().messageRequests.length === 0) set({ loadingMessageRequests: true });

            try {
                const { data, error } = await supabase
                    .from('user_connections')
                    .select('id, follower_id, following_id, status, created_at')
                    .eq('following_id', currentUser.id)
                    .eq('status', 'pending');
                if (error) throw error;

                const publicProfiles = await resolvePublicProfiles((data || []).map((req: any) => req.follower_id));
                const processedRequests = (data || []).flatMap((req: any) => {
                    const follower = publicProfiles.get(req.follower_id);
                    if (!follower) return [];
                    return [{
                        ...req,
                        avatar_url: getPublicImageUrl(follower.avatar_url),
                        username: follower.username || 'Usuário',
                        age: follower.age || 0,
                    }];
                });

                set({ messageRequests: processedRequests, loadingMessageRequests: false, lastMessageRequestsFetch: now });
                updateTotalUnreadCount();
            } catch (err) {
                console.error('Error fetching message requests:', err);
                set({ loadingMessageRequests: false });
            }
        },

        acceptMessageRequest: async (connectionId: string, followerId: string) => {
            try {
                const { error } = await supabase.from('user_connections').update({ status: 'accepted' }).eq('id', connectionId);
                if (error) throw error;

                set(state => ({ messageRequests: state.messageRequests.filter(req => req.id !== connectionId) }));
                const { session } = (await supabase.auth.getSession()).data;
                const currentUser = useAuthStore.getState().user;
                if (session && currentUser) {
                    const senderName = currentUser.display_name || currentUser.username || 'Alguém';
                    fetch('/api/send-generic-push', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
                        body: JSON.stringify({ receiver_id: followerId, title: 'Solicitação de conexão aceita! 🎉', body: `${senderName} aceitou sua solicitação de conexão.` }),
                    }).catch(err => console.error('Error sending connection accept push:', err));
                }

                toast.success('Solicitação aceita!');
                updateTotalUnreadCount();
                try {
                    const { useCommunityStore } = await import('./communityStore');
                    useCommunityStore.getState().fetchConnections();
                } catch (e) {
                    console.error('Error updating communityStore:', e);
                }
            } catch (e) {
                console.error('Error accepting connection:', e);
                toast.error('Erro ao aceitar solicitação.');
            }
        },

        rejectMessageRequest: async (connectionId: string) => {
            try {
                const { error } = await supabase.from('user_connections').delete().eq('id', connectionId);
                if (error) throw error;
                set(state => ({ messageRequests: state.messageRequests.filter(req => req.id !== connectionId) }));
                toast.success('Solicitação recusada.');
                updateTotalUnreadCount();
                try {
                    const { useCommunityStore } = await import('./communityStore');
                    useCommunityStore.getState().fetchConnections();
                } catch (e) {
                    console.error('Error updating communityStore:', e);
                }
            } catch (e) {
                console.error('Error rejecting connection:', e);
                toast.error('Erro ao recusar solicitação.');
            }
        },
    };
});
