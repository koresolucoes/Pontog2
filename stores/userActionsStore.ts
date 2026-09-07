// stores/userActionsStore.ts
import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import { useMapStore } from './mapStore';
import { useHomeStore } from './homeStore';
import { useInboxStore } from './inboxStore';
import { useUiStore } from './uiStore';
import { useAuthStore } from './authStore';

export const reportReasons = [
    { key: 'spam', label: 'Spam ou publicidade' },
    { key: 'inappropriate_photos', label: 'Fotos inapropriadas' },
    { key: 'harassment', label: 'Assédio ou discurso de ódio' },
    { key: 'impersonation', label: 'Perfil falso / Impersonificação' },
    { key: 'underage', label: 'Menor de idade' },
    { key: 'scam_or_fraud', label: 'Golpe ou fraude' },
    { key: 'other', label: 'Outro' },
];

export interface BlockedUser {
    blocked_id: string;
    username: string;
    avatar_url: string;
}

export interface FavoriteUser {
    favorite_id: string;
    username: string;
    avatar_url: string;
    age: number;
    distance_km: number | null;
    is_verified: boolean;
    subscription_tier: string;
}

interface UserActionsState {
    blockedUsers: BlockedUser[];
    isFetchingBlocked: boolean;
    favoriteUsers: FavoriteUser[];
    favoriteIds: string[];
    isFetchingFavorites: boolean;
    lastFavoritesFetch: number;
    blockUser: (userToBlock: { id: string, username: string }) => Promise<void>;
    reportUser: (reportedId: string, reason: string, comments: string) => Promise<boolean>;
    fetchBlockedUsers: () => Promise<void>;
    unblockUser: (userId: string) => Promise<void>;
    favoriteUser: (userId: string) => Promise<void>;
    unfavoriteUser: (userId: string) => Promise<void>;
    fetchFavorites: (force?: boolean) => Promise<void>;
}

export const useUserActionsStore = create<UserActionsState>((set, get) => ({
    blockedUsers: [],
    isFetchingBlocked: false,
    favoriteUsers: [],
    favoriteIds: [],
    isFetchingFavorites: false,

    blockUser: async (userToBlock) => {
        const { id: blocked_id, username } = userToBlock;
        const currentUser = useAuthStore.getState().user;

        if (!currentUser) {
            toast.error('Você precisa estar logado para bloquear usuários.');
            return;
        }

        const { error } = await supabase.from('blocks').insert({
            blocker_id: currentUser.id,
            blocked_id,
        });

        if (error) {
            toast.error(`Erro ao bloquear ${username}.`);
            console.error('Error blocking user:', error);
            return;
        }

        toast.success(`${username} foi bloqueado.`);

        const { chatUser, setChatUser } = useUiStore.getState();
        const { selectedUser, setSelectedUser } = useMapStore.getState();

        if (chatUser?.id === blocked_id) setChatUser(null);
        if (selectedUser?.id === blocked_id) setSelectedUser(null);

        const { myLocation, fetchNearbyUsers } = useMapStore.getState();
        if (myLocation) fetchNearbyUsers(myLocation);
        useHomeStore.getState().fetchPopularUsers();
        useInboxStore.getState().fetchConversations();
    },

    reportUser: async (reportedId: string, reason: string, comments: string) => {
        const currentUser = useAuthStore.getState().user;
        if (!currentUser) {
            toast.error('Você precisa estar logado para denunciar.');
            return false;
        }

        const { error } = await supabase.from('reports').insert({
            reporter_id: currentUser.id,
            reported_id: reportedId,
            reason,
            comments: comments || null,
        });

        if (error) {
            if (error.code === '23505') toast.error('Você já denunciou este perfil.');
            else toast.error('Ocorreu um erro ao enviar a denúncia.');
            console.error('Error reporting user:', error);
            return false;
        }

        toast.success('Denúncia enviada. Nossa equipe irá analisar.');
        return true;
    },

    fetchBlockedUsers: async () => {
        set({ isFetchingBlocked: true });
        const { data, error } = await supabase.rpc('get_my_blocked_users');
        if (error) console.error('Error fetching blocked users:', error);
        else set({ blockedUsers: data || [] });
        set({ isFetchingBlocked: false });
    },

    unblockUser: async (userId: string) => {
        const currentUser = useAuthStore.getState().user;
        if (!currentUser) return;

        const { error } = await supabase.from('blocks').delete().match({
            blocker_id: currentUser.id,
            blocked_id: userId,
        });

        if (error) {
            toast.error('Erro ao desbloquear usuário.');
            console.error('Error unblocking user:', error);
            return;
        }

        toast.success('Usuário desbloqueado.');
        set(state => ({ blockedUsers: state.blockedUsers.filter(u => u.blocked_id !== userId) }));

        const { myLocation, fetchNearbyUsers } = useMapStore.getState();
        if (myLocation) fetchNearbyUsers(myLocation);
        useHomeStore.getState().fetchPopularUsers();
        useInboxStore.getState().fetchConversations();
    },

    favoriteUser: async (userId: string) => {
        const currentUser = useAuthStore.getState().user;
        if (!currentUser) return;

        const previousIds = get().favoriteIds;
        set({ favoriteIds: [...previousIds, userId] });

        const { error } = await supabase.from('favorites').insert({
            user_id: currentUser.id,
            favorite_id: userId,
        });

        if (error) {
            set({ favoriteIds: previousIds });
            toast.error('Erro ao adicionar aos favoritos.');
            console.error('Error favoriting user:', error);
            return;
        }

        toast.success('Adicionado aos favoritos.', { icon: '⭐️' });
        get().fetchFavorites(true);
    },

    unfavoriteUser: async (userId: string) => {
        const currentUser = useAuthStore.getState().user;
        if (!currentUser) return;

        const previousIds = get().favoriteIds;
        set({ favoriteIds: previousIds.filter(id => id !== userId) });

        const { error } = await supabase.from('favorites').delete().match({
            user_id: currentUser.id,
            favorite_id: userId,
        });

        if (error) {
            set({ favoriteIds: previousIds });
            toast.error('Erro ao remover dos favoritos.');
            console.error('Error unfavoriting user:', error);
            return;
        }

        toast.success('Removido dos favoritos.');
        set(state => ({ favoriteUsers: state.favoriteUsers.filter(u => u.favorite_id !== userId) }));
    },

    lastFavoritesFetch: 0,
    fetchFavorites: async (force = false) => {
        const now = Date.now();
        if (!force && now - get().lastFavoritesFetch < 60000 && get().favoriteUsers.length > 0) return;

        set({ isFetchingFavorites: true });

        const currentUserId = (await supabase.auth.getSession()).data.session?.user?.id;
        if (!currentUserId) {
            set({ isFetchingFavorites: false });
            return;
        }

        const { data, error } = await supabase.rpc('get_my_favorite_users');

        if (error) {
            console.error('Error fetching favorites:', error);
        } else {
            const mappedData: FavoriteUser[] = (data || []).map((item: any) => ({
                favorite_id: item.favorite_id,
                username: item.username || 'Usuário',
                avatar_url: item.avatar_url,
                age: item.age || 0,
                distance_km: item.distance_km ?? null,
                is_verified: !!item.is_verified,
                subscription_tier: item.subscription_tier || 'free',
            }));

            set({
                favoriteUsers: mappedData,
                favoriteIds: mappedData.map(u => u.favorite_id),
                lastFavoritesFetch: now,
            });
        }
        set({ isFetchingFavorites: false });
    },
}));
