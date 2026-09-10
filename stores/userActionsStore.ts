// stores/userActionsStore.ts
import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import { useMapStore } from './mapStore';
import { useHomeStore } from './homeStore';
import { useInboxStore } from './inboxStore';
import { useUiStore } from './uiStore';
import { useAuthStore } from './authStore';
import { socialActions } from '../modules/social/public';

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
    hideProfile: (userToHide: { id: string, username: string }) => Promise<void>;
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
        const { id: blockedId, username } = userToBlock;
        if (!useAuthStore.getState().user) {
            toast.error('Você precisa estar logado para bloquear usuários.');
            return;
        }

        try {
            await socialActions.blockUser(blockedId);
        } catch (error) {
            toast.error(`Erro ao bloquear ${username}.`);
            console.error('Error blocking user:', error);
            return;
        }

        toast.success(`${username} foi bloqueado.`);
        const { chatUser, setChatUser } = useUiStore.getState();
        const { selectedUser, setSelectedUser } = useMapStore.getState();
        if (chatUser?.id === blockedId) setChatUser(null);
        if (selectedUser?.id === blockedId) setSelectedUser(null);

        const { myLocation, fetchNearbyUsers } = useMapStore.getState();
        if (myLocation) fetchNearbyUsers(myLocation);
        useHomeStore.getState().fetchPopularUsers();
        useInboxStore.getState().fetchConversations(true);
    },

    hideProfile: async (userToHide) => {
        const { id: hiddenId, username } = userToHide;
        if (!useAuthStore.getState().user) {
            toast.error('Você precisa estar logado para ocultar perfis.');
            return;
        }

        try {
            await socialActions.hideProfile(hiddenId);
        } catch (error) {
            toast.error(`Não foi possível ocultar ${username}.`);
            console.error('Error hiding profile:', error);
            return;
        }

        const map = useMapStore.getState();
        map.setUsers(map.users.filter((item) => item.id !== hiddenId));
        if (map.selectedUser?.id === hiddenId) map.setSelectedUser(null);
        useHomeStore.setState((state) => ({ popularUsers: state.popularUsers.filter((item) => item.id !== hiddenId) }));
        toast.success(`${username} não aparecerá mais na sua grade.`);
    },

    reportUser: async (reportedId, reason, comments) => {
        if (!useAuthStore.getState().user) {
            toast.error('Você precisa estar logado para denunciar.');
            return false;
        }

        try {
            await socialActions.reportUser(reportedId, reason, comments || null);
            toast.success('Denúncia enviada. Nossa equipe irá analisar.');
            return true;
        } catch (error: any) {
            if (error?.code === '23505' || error?.message?.includes('already_reported')) {
                toast.error('Você já denunciou este perfil.');
            } else {
                toast.error('Ocorreu um erro ao enviar a denúncia.');
            }
            console.error('Error reporting user:', error);
            return false;
        }
    },

    fetchBlockedUsers: async () => {
        set({ isFetchingBlocked: true });
        const { data, error } = await supabase.rpc('get_my_blocked_users');
        if (error) console.error('Error fetching blocked users:', error);
        else set({ blockedUsers: data || [] });
        set({ isFetchingBlocked: false });
    },

    unblockUser: async (userId) => {
        if (!useAuthStore.getState().user) return;

        try {
            await socialActions.unblockUser(userId);
        } catch (error) {
            toast.error('Erro ao desbloquear usuário.');
            console.error('Error unblocking user:', error);
            return;
        }

        toast.success('Usuário desbloqueado.');
        set(state => ({ blockedUsers: state.blockedUsers.filter(u => u.blocked_id !== userId) }));
        const { myLocation, fetchNearbyUsers } = useMapStore.getState();
        if (myLocation) fetchNearbyUsers(myLocation);
        useHomeStore.getState().fetchPopularUsers();
        useInboxStore.getState().fetchConversations(true);
    },

    favoriteUser: async (userId) => {
        if (!useAuthStore.getState().user) return;

        const previousIds = get().favoriteIds;
        if (!previousIds.includes(userId)) set({ favoriteIds: [...previousIds, userId] });

        try {
            await socialActions.setFavorite(userId, true);
        } catch (error) {
            set({ favoriteIds: previousIds });
            toast.error('Erro ao adicionar aos favoritos.');
            console.error('Error favoriting user:', error);
            return;
        }

        toast.success('Adicionado aos favoritos.', { icon: '⭐️' });
        get().fetchFavorites(true);
    },

    unfavoriteUser: async (userId) => {
        if (!useAuthStore.getState().user) return;

        const previousIds = get().favoriteIds;
        set({ favoriteIds: previousIds.filter(id => id !== userId) });

        try {
            await socialActions.setFavorite(userId, false);
        } catch (error) {
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
