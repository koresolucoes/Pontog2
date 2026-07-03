
// stores/inboxStore.ts
import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { ConversationPreview, WinkWithProfile, User, AlbumAccessRequest, ProfileViewWithProfile } from '../types';
import { getPublicImageUrl } from '../lib/supabase';
import toast from 'react-hot-toast';
import { useAuthStore } from './authStore';

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

interface InboxState {
  conversations: ConversationPreview[];
  winks: WinkWithProfile[];
  accessRequests: AlbumAccessRequest[];
  profileViews: ProfileViewWithProfile[];
  totalUnreadCount: number;
  loadingConversations: boolean;
  loadingWinks: boolean;
  loadingRequests: boolean;
  loadingProfileViews: boolean;
  realtimeChannel: any | null;
  lastConversationUpdate: number;
  
  winksHaveBeenSeen: boolean;
  requestsHaveBeenSeen: boolean;
  
  lastConversationsFetch: number;
  lastWinksFetch: number;
  lastRequestsFetch: number;
  lastViewsFetch: number;
  
  fetchConversations: (force?: boolean) => Promise<void>;
  fetchWinks: (force?: boolean) => Promise<void>;
  fetchAccessRequests: (force?: boolean) => Promise<void>;
  fetchProfileViews: (force?: boolean) => Promise<void>;
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
        const { conversations, winks, accessRequests, winksHaveBeenSeen, requestsHaveBeenSeen } = get();
        const unreadMessages = conversations.reduce((sum, convo) => sum + (convo.unread_count || 0), 0);
        
        // A contagem depende da flag 'seen'
        const newWinksCount = winksHaveBeenSeen ? 0 : winks.length;
        const newRequestsCount = requestsHaveBeenSeen ? 0 : accessRequests.length;

        set({ totalUnreadCount: unreadMessages + newWinksCount + newRequestsCount });
    };

    return {
        conversations: [],
        winks: [],
        accessRequests: [],
        profileViews: [],
        totalUnreadCount: 0,
        loadingConversations: false,
        loadingWinks: false,
        loadingRequests: false,
        loadingProfileViews: false,
        realtimeChannel: null,
        lastConversationUpdate: 0, // Timeout tracker
        winksHaveBeenSeen: true,
        requestsHaveBeenSeen: true,
        
        lastConversationsFetch: 0,
        lastWinksFetch: 0,
        lastRequestsFetch: 0,
        lastViewsFetch: 0,

        fetchConversations: async (force = false) => {
            const now = Date.now();
            if (!force && now - get().lastConversationsFetch < 60000 && get().conversations.length > 0) return;

            set({ loadingConversations: true });
            
            try {
                const { data, error } = await supabase.rpc('get_my_conversations');
                
                if (error) throw error;
                
                const processedConversations = (data || []).map((convo: any) => ({
                    ...convo,
                    other_participant_avatar_url: getPublicImageUrl(convo.other_participant_avatar_url)
                }));
                
                set({ conversations: processedConversations, loadingConversations: false, lastConversationsFetch: now });
                updateTotalUnreadCount();
            } catch (err: any) {
                console.error('Error fetching conversations:', err);
                
                // Fallback manual JS fetch para contornar falhas de RPC devido a alterações de esquema
                try {
                    const currentUser = useAuthStore.getState().user;
                    if (!currentUser) throw new Error("Sem usuário autenticado");
                    
                    const { data: myParts } = await supabase.from('conversation_participants').select('conversation_id').eq('user_id', currentUser.id);
                    const convIds = (myParts || []).map(p => p.conversation_id);
                    
                    if (convIds.length === 0) {
                        set({ conversations: [], loadingConversations: false, lastConversationsFetch: now });
                        updateTotalUnreadCount();
                        return;
                    }
                    
                    const { data: otherParts } = await supabase.from('conversation_participants').select('conversation_id, user_id, profiles!inner(*)').in('conversation_id', convIds).neq('user_id', currentUser.id);
                    const { data: msgs } = await supabase.from('messages').select('*').in('conversation_id', convIds).order('created_at', { ascending: false }).limit(300);
                        
                    const conversationsResult: any[] = [];
                    
                    for (const convId of convIds) {
                        const otherPart = (otherParts || []).find(p => p.conversation_id === convId);
                        const convMsgs = (msgs || []).filter(m => m.conversation_id === convId);
                        const lastMsg = convMsgs.length > 0 ? convMsgs[0] : null;
                        
                        if (otherPart && otherPart.profiles && lastMsg) {
                            const profile: any = Array.isArray(otherPart.profiles) ? otherPart.profiles[0] : otherPart.profiles;
                            const unreadCount = convMsgs.filter(m => m.sender_id !== currentUser.id && !m.viewed_at).length;
                            
                            conversationsResult.push({
                                conversation_id: convId,
                                other_participant_id: profile.id,
                                other_participant_username: profile.username || 'Usuário',
                                other_participant_avatar_url: getPublicImageUrl(profile.avatar_url),
                                other_participant_last_seen: profile.last_seen,
                                last_message_content: lastMsg.content || (lastMsg.image_url ? '📷 Foto' : ''),
                                last_message_created_at: lastMsg.created_at,
                                last_message_sender_id: lastMsg.sender_id,
                                unread_count: unreadCount,
                                other_participant_subscription_tier: profile.subscription_tier || 'free'
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

            set({ loadingWinks: true });
            
            let winksWithAgeAndUrls: any[] = [];
            
            try {
                const { data, error } = await supabase.rpc('get_my_winks');
                if (error) throw error;
                
                winksWithAgeAndUrls = (data || []).map((wink: any) => ({
                    ...(wink as User),
                    wink_created_at: wink.wink_created_at,
                    age: calculateAge(wink.date_of_birth),
                    avatar_url: getPublicImageUrl(wink.avatar_url),
                    public_photos: Array.isArray(wink.public_photos) ? wink.public_photos.map(getPublicImageUrl) : [],
                }));
            } catch (err) {
                console.error('Error fetching winks:', err);
                
                try {
                    const currentUser = useAuthStore.getState().user;
                    if (!currentUser) throw new Error("Sem usuário autenticado");
                    
                    const { data: winksData } = await supabase.from('winks').select('created_at, sender:sender_id(*)').eq('receiver_id', currentUser.id).order('created_at', { ascending: false });
                    
                    winksWithAgeAndUrls = (winksData || []).map((w: any) => {
                        const sender = Array.isArray(w.sender) ? w.sender[0] : w.sender;
                        return {
                            ...(sender as User),
                            wink_created_at: w.created_at,
                            age: calculateAge(sender?.date_of_birth),
                            avatar_url: getPublicImageUrl(sender?.avatar_url),
                            public_photos: sender?.public_photos && Array.isArray(sender.public_photos) ? sender.public_photos.map(getPublicImageUrl) : [],
                        };
                    });
                } catch (fallbackErr) {
                    console.error('Fallback fetchWinks failed:', fallbackErr);
                    set({ loadingWinks: false });
                    return;
                }
            }

            // LÓGICA DE PERSISTÊNCIA
            // Verifica o localStorage para ver a última vez que o usuário abriu a aba de winks
            const lastViewedTime = localStorage.getItem('ponto_g_last_viewed_winks');
            let hasNewItems = false;

            if (winksWithAgeAndUrls.length > 0) {
                // Se nunca viu ou se o wink mais recente é mais novo que o último visto
                const newestWinkDate = new Date(winksWithAgeAndUrls[0].wink_created_at); // Assumindo que vem ordenado por data desc
                if (!lastViewedTime || newestWinkDate > new Date(lastViewedTime)) {
                    hasNewItems = true;
                }
            }

            set({ 
                winks: winksWithAgeAndUrls, 
                loadingWinks: false, 
                winksHaveBeenSeen: !hasNewItems, // Se tem novos itens, não foi visto. Se não tem, foi visto.
                lastWinksFetch: now
            });
            updateTotalUnreadCount();
        },

        fetchAccessRequests: async (force = false) => {
            const now = Date.now();
            if (!force && now - get().lastRequestsFetch < 60000 && get().accessRequests.length > 0) return;

            set({ loadingRequests: true });
            let { data, error } = await supabase.rpc('get_my_album_access_requests');

            // Fallback to direct query if RPC fails or returns unexpectedly
            if (error || !data) {
                const { data: userData } = await supabase.auth.getUser();
                if (userData?.user) {
                    const res = await supabase
                        .from('private_album_access')
                        .select('*, profiles!private_album_access_requester_id_fkey(username, avatar_url)')
                        .eq('owner_id', userData.user.id)
                        .eq('status', 'pending');
                    
                    if (!res.error && res.data) {
                        data = res.data.map((req: any) => ({
                            id: req.id,
                            requester_id: req.requester_id,
                            username: req.profiles?.username,
                            avatar_url: req.profiles?.avatar_url,
                            created_at: req.created_at
                        }));
                        error = null;
                    }
                }
            }

            if (error) {
                console.error('Error fetching access requests:', error);
                set({ loadingRequests: false });
                return;
            }

            if (!data) {
                set({ accessRequests: [], loadingRequests: false, lastRequestsFetch: now });
                updateTotalUnreadCount();
                return;
            }

            const processedRequests = data.map((req: any) => ({
                ...req,
                avatar_url: getPublicImageUrl(req.avatar_url)
            }));

            // Lógica de persistência para pedidos também
            const lastViewedTime = localStorage.getItem('ponto_g_last_viewed_requests');
            let hasNewItems = false;

            if (processedRequests.length > 0) {
                // Assumindo que a query retorna ordenado por created_at DESC
                const newestRequestDate = new Date(processedRequests[0].created_at); 
                if (!lastViewedTime || newestRequestDate > new Date(lastViewedTime)) {
                    hasNewItems = true;
                }
            }

            set({ 
                accessRequests: processedRequests, 
                loadingRequests: false, 
                requestsHaveBeenSeen: !hasNewItems,
                lastRequestsFetch: now
            });
            updateTotalUnreadCount();
        },

        fetchProfileViews: async (force = false) => {
            const now = Date.now();
            if (!force && now - get().lastViewsFetch < 60000 && get().profileViews.length > 0) return;

            set({ loadingProfileViews: true });
            const { data, error } = await supabase.rpc('get_my_profile_viewers');

            if (error) {
                console.error('Error fetching profile views:', error);
                set({ loadingProfileViews: false });
                return;
            }
            
            if (!data) {
                set({ profileViews: [], loadingProfileViews: false, lastViewsFetch: now });
                return;
            }

            const viewsWithAgeAndUrls = data.map((view: any) => ({
                ...(view as User),
                viewed_at: view.viewed_at,
                age: calculateAge(view.date_of_birth),
                avatar_url: getPublicImageUrl(view.avatar_url),
                public_photos: (view.public_photos || []).map(getPublicImageUrl),
            }));

            set({ 
                profileViews: viewsWithAgeAndUrls, 
                loadingProfileViews: false,
                lastViewsFetch: now
            });
        },
        
        respondToRequest: async (requestId: number, status: 'granted' | 'denied') => {
            const { error } = await supabase
                .from('private_album_access')
                .update({ status: status, updated_at: new Date().toISOString() })
                .eq('id', requestId);
            
            if (error) {
                toast.error('Erro ao responder à solicitação.');
                console.error('Error responding to request:', error);
            } else {
                toast.success(`Solicitação ${status === 'granted' ? 'aceita' : 'recusada'}.`);
                set(state => ({
                    accessRequests: state.accessRequests.filter(req => req.id !== requestId)
                }));
                updateTotalUnreadCount();
            }
        },

        deleteConversation: async (conversationId: number) => {
            set(state => ({
                conversations: state.conversations.filter(c => c.conversation_id !== conversationId)
            }));
            updateTotalUnreadCount();

            const { error } = await supabase.rpc('delete_conversation', { p_conversation_id: conversationId });

            if (error) {
                toast.error('Erro ao apagar a conversa.');
                console.error('Error deleting conversation:', error);
                get().fetchConversations(); // Re-fetch para reverter
            } else {
                toast.success('Conversa apagada.');
            }
        },

        clearWinks: () => {
            if (get().winksHaveBeenSeen) return;
            
            const { winks } = get();
            
            if (winks.length > 0) {
                const newestWinkDate = new Date(winks[0].wink_created_at).getTime() + 1000;
                localStorage.setItem('ponto_g_last_viewed_winks', new Date(newestWinkDate).toISOString());
            } else {
                localStorage.setItem('ponto_g_last_viewed_winks', new Date().toISOString());
            }
            
            set({ winksHaveBeenSeen: true });
            updateTotalUnreadCount();
        },

        clearAccessRequests: () => {
            if (get().requestsHaveBeenSeen) return;
            
            const { accessRequests } = get();

            if (accessRequests.length > 0) {
                const newestRequestDate = new Date(accessRequests[0].created_at).getTime() + 1000;
                localStorage.setItem('ponto_g_last_viewed_requests', new Date(newestRequestDate).toISOString());
            } else {
                localStorage.setItem('ponto_g_last_viewed_requests', new Date().toISOString());
            }
            
            set({ requestsHaveBeenSeen: true });
            updateTotalUnreadCount();
        },
        
        clearUnreadCountForConversation: (conversationId: number) => {
            set(state => ({
                conversations: state.conversations.map(c => 
                    c.conversation_id === conversationId ? { ...c, unread_count: 0 } : c
                )
            }));
            updateTotalUnreadCount();
        },

        subscribeToInboxChanges: () => {
            if (get().realtimeChannel) {
                return;
            }

            const user = useAuthStore.getState().user;
            if (!user) {
                console.error("Cannot subscribe to inbox changes without a user.");
                return;
            }

            const channel = supabase
                .channel(`inbox:${user.id}`)
                .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, payload => {
                    // DEBOUNCE LOGIC FOR CONVERSATIONS
                    // Only update the conversation list every 2 seconds at most to prevent flood.
                    // React state updates are expensive.
                    const now = Date.now();
                    const lastUpdate = get().lastConversationUpdate;
                    
                    if (now - lastUpdate > 2000) {
                        get().fetchConversations();
                        set({ lastConversationUpdate: now });
                    } else {
                        // Optional: Set a timeout to ensure we catch the tail end of a burst
                        // For simplicity, we just throttle for now as chat windows handle their own realtime messages.
                        // The inbox list doesn't need 100% ms-perfect accuracy for unread counts during typing.
                    }
                })
                .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'winks', filter: `receiver_id=eq.${user.id}` }, payload => {
                    get().fetchWinks();
                })
                .on('postgres_changes', { event: '*', schema: 'public', table: 'private_album_access', filter: `owner_id=eq.${user.id}` }, payload => {
                    get().fetchAccessRequests();
                })
                .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'profile_views', filter: `viewed_id=eq.${user.id}` }, payload => {
                    get().fetchProfileViews();
                })
                .subscribe((status) => {
                    if (status === 'SUBSCRIBED') {
                        console.log(`Subscribed to inbox channel for user ${user.id}`);
                    }
                });
            
            set({ realtimeChannel: channel });
        },

        cleanupRealtime: () => {
            const { realtimeChannel } = get();
            if (realtimeChannel) {
                supabase.removeChannel(realtimeChannel);
                set({ realtimeChannel: null });
            }
        },
    }
});
