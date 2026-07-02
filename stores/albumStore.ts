import { create } from 'zustand';
import { supabase, getPublicImageUrl } from '../lib/supabase';
import { useAuthStore } from './authStore';
import { PrivateAlbum, PrivateAlbumPhoto, AlbumAccessStatus } from '../types';

interface AlbumState {
    myAlbums: PrivateAlbum[];
    isUploading: boolean;
    isLoading: boolean;
    
    // State for viewing other user's albums
    viewedUserAlbums: PrivateAlbum[];
    viewedUserAccessStatus: AlbumAccessStatus;
    isFetchingViewedUserAlbums: boolean;

    fetchMyAlbums: () => Promise<void>;
    uploadPhoto: (file: File) => Promise<string | null>;
    uploadAudio: (file: File) => Promise<string | null>;
    createAlbum: (name: string) => Promise<PrivateAlbum | null>;
    deleteAlbum: (albumId: number) => Promise<boolean>;
    addPhotoToAlbum: (albumId: number, photoPath: string) => Promise<PrivateAlbumPhoto | null>;
    deletePhotoFromAlbum: (photoId: number) => Promise<boolean>;

    // Functions for access control and viewing other's albums
    fetchAlbumsAndAccessStatusForUser: (userId: string) => Promise<void>;
    requestAccess: (ownerId: string) => Promise<void>;
    grantAccess: (albumId: number, targetUserId: string) => Promise<void>;
    clearViewedUserData: () => void;
}

export const useAlbumStore = create<AlbumState>((set, get) => ({
    myAlbums: [],
    isUploading: false,
    isLoading: false,

    viewedUserAlbums: [],
    viewedUserAccessStatus: null,
    isFetchingViewedUserAlbums: false,

    fetchMyAlbums: async () => {
        set({ isLoading: true });
        const user = useAuthStore.getState().user;
        if (!user) {
            set({ isLoading: false });
            return;
        }

        const { data, error } = await supabase
            .from('private_albums')
            .select('*, private_album_photos(*, user_id)')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching albums:', error);
            set({ isLoading: false });
            return;
        }

        // Processa os caminhos das fotos para URLs públicas
        const albumsWithUrls = data.map(album => ({
            ...album,
            private_album_photos: (album.private_album_photos || []).map(photo => ({
                ...photo,
                photo_path: getPublicImageUrl(photo.photo_path)
            }))
        }));

        set({ myAlbums: albumsWithUrls, isLoading: false });
    },

    uploadPhoto: async (file: File) => {
        set({ isUploading: true });
        const user = useAuthStore.getState().user;
        if (!user) {
            set({ isUploading: false });
            return null;
        }
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}.${fileExt}`;
        const filePath = `${user.id}/${fileName}`;

        const { error } = await supabase.storage
            .from('user_uploads')
            .upload(filePath, file);

        set({ isUploading: false });
        if (error) {
            console.error('Error uploading photo:', error);
            return null;
        }
        return filePath;
    },

    uploadAudio: async (file: File) => {
        set({ isUploading: true });
        const user = useAuthStore.getState().user;
        if (!user) {
            set({ isUploading: false });
            return null;
        }
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}.${fileExt}`;
        const filePath = `${user.id}/audios/${fileName}`;

        const { error } = await supabase.storage
            .from('user_uploads')
            .upload(filePath, file);

        set({ isUploading: false });
        if (error) {
            console.error('Error uploading audio:', error);
            return null;
        }
        return filePath;
    },

    createAlbum: async (name: string) => {
        const user = useAuthStore.getState().user;
        if (!user) return null;

        const { data, error } = await supabase
            .from('private_albums')
            .insert({ name, user_id: user.id })
            .select()
            .single();
        
        if (error) {
            console.error('Error creating album:', error);
            return null;
        }
        
        const newAlbum = { ...data, private_album_photos: [] };
        set(state => ({ myAlbums: [newAlbum, ...state.myAlbums] }));
        return newAlbum;
    },

    deleteAlbum: async (albumId: number) => {
        const { error } = await supabase.from('private_albums').delete().eq('id', albumId);
        if (error) {
            console.error('Error deleting album:', error);
            return false;
        }
        set(state => ({ myAlbums: state.myAlbums.filter(a => a.id !== albumId) }));
        return true;
    },

    addPhotoToAlbum: async (albumId: number, photoPath: string) => {
        const user = useAuthStore.getState().user;
        if (!user) return null;

        const { data, error } = await supabase
            .from('private_album_photos')
            .insert({ album_id: albumId, photo_path: photoPath, user_id: user.id })
            .select()
            .single();

        if (error) {
            console.error('Error adding photo to album:', error);
            return null;
        }

        get().fetchMyAlbums(); 
        return data;
    },
    
    deletePhotoFromAlbum: async (photoId: number) => {
        const { error } = await supabase.from('private_album_photos').delete().eq('id', photoId);
        if (error) {
            console.error('Error deleting photo:', error);
            return false;
        }
        get().fetchMyAlbums();
        return true;
    },

    fetchAlbumsAndAccessStatusForUser: async (userId: string) => {
        set({ isFetchingViewedUserAlbums: true, viewedUserAlbums: [], viewedUserAccessStatus: null });
        const currentUser = useAuthStore.getState().user;
        if (!currentUser || currentUser.id === userId) {
            set({ isFetchingViewedUserAlbums: false });
            return;
        }
        
        const { data: accessData, error: accessError } = await supabase
            .from('private_album_access')
            .select('status')
            .eq('owner_id', userId)
            .eq('requester_id', currentUser.id)
            .limit(1);
        
        if (accessError) {
            console.error("Error fetching album access status:", accessError);
        }

        const status = accessData && accessData.length > 0 ? accessData[0].status as AlbumAccessStatus : null;
        set({ viewedUserAccessStatus: status });

        // 2. If access is granted, fetch albums
        if (status === 'granted') {
            const { data, error } = await supabase
                .from('private_albums')
                .select('*, private_album_photos(*, user_id)')
                .eq('user_id', userId);
            
            if (data && !error) {
                const albumsWithUrls = data.map(album => ({
                    ...album,
                    private_album_photos: (album.private_album_photos || []).map(photo => ({
                        ...photo,
                        photo_path: getPublicImageUrl(photo.photo_path)
                    }))
                }));
                set({ viewedUserAlbums: albumsWithUrls });
            }
        }
        set({ isFetchingViewedUserAlbums: false });
    },

    requestAccess: async (ownerId: string) => {
        const currentUser = useAuthStore.getState().user;
        if (!currentUser) throw new Error("User not logged in");
        
        const { error } = await supabase
            .from('private_album_access')
            .insert({
                owner_id: ownerId,
                requester_id: currentUser.id,
                status: 'pending'
            });

        if (error) {
            console.error('Error requesting access:', error);
            throw error;
        }
        
        // Notifica o usuário sobre a solicitação de acesso
        const { session } = (await supabase.auth.getSession()).data;
        if (session) {
            fetch('/api/send-album-request-push', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`
                },
                body: JSON.stringify({ receiver_id: ownerId })
            }).catch(err => console.error("Error sending album request push notification:", err));
        }

        set({ viewedUserAccessStatus: 'pending' });
    },
    
    grantAccess: async (albumId: number, targetUserId: string) => {
        const { error } = await supabase.rpc('grant_album_access', {
            p_album_id: albumId,
            p_target_user_id: targetUserId,
        });
        if (error) {
            console.error('Error granting album access:', error);
            throw error;
        }
    },

    clearViewedUserData: () => {
        set({
            viewedUserAlbums: [],
            viewedUserAccessStatus: null,
            isFetchingViewedUserAlbums: false
        });
    },
}));