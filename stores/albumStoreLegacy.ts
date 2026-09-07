import { create } from 'zustand';
import { supabase, getPublicImageUrl } from '../lib/supabase';
import { useAuthStore } from './authStore';
import { PrivateAlbum, PrivateAlbumPhoto, AlbumAccessStatus } from '../types';
import { isVideoUrl } from '../lib/utils';

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
    uploadVideo: (file: File) => Promise<string | null>;
    uploadMedia: (file: File) => Promise<{ path: string; mediaType: 'photo' | 'video' } | null>;
    uploadAudio: (file: File) => Promise<string | null>;
    createAlbum: (name: string) => Promise<PrivateAlbum | null>;
    deleteAlbum: (albumId: number) => Promise<boolean>;
    addPhotoToAlbum: (albumId: number, photoPath: string, mediaType?: 'photo' | 'video') => Promise<PrivateAlbumPhoto | null>;
    deletePhotoFromAlbum: (photoId: number) => Promise<boolean>;
    fetchAlbumById: (albumId: number) => Promise<PrivateAlbum | null>;

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

        // Processa os caminhos das fotos/vídeos para URLs públicas
        const albumsWithUrls = data.map(album => ({
            ...album,
            private_album_photos: (album.private_album_photos || []).map(photo => ({
                ...photo,
                photo_path: getPublicImageUrl(photo.photo_path),
                media_type: photo.media_type || (isVideoUrl(photo.photo_path) ? 'video' : 'photo')
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
        const fileExt = file.name.split('.').pop() || 'jpg';
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

    uploadVideo: async (file: File) => {
        set({ isUploading: true });
        const user = useAuthStore.getState().user;
        if (!user) {
            set({ isUploading: false });
            return null;
        }
        const fileExt = file.name.split('.').pop() || 'mp4';
        const fileName = `${Date.now()}_video.${fileExt}`;
        const filePath = `${user.id}/videos/${fileName}`;

        const { error } = await supabase.storage
            .from('user_uploads')
            .upload(filePath, file);

        set({ isUploading: false });
        if (error) {
            console.error('Error uploading video:', error);
            return null;
        }
        return filePath;
    },

    uploadMedia: async (file: File) => {
        const isVideo = file.type.startsWith('video/') || isVideoUrl(file.name);
        if (isVideo) {
            const path = await get().uploadVideo(file);
            return path ? { path, mediaType: 'video' as const } : null;
        } else {
            const path = await get().uploadPhoto(file);
            return path ? { path, mediaType: 'photo' as const } : null;
        }
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
        await get().fetchMyAlbums();
        return newAlbum;
    },

    deleteAlbum: async (albumId: number) => {
        set(state => ({ myAlbums: state.myAlbums.filter(a => a.id !== albumId) }));
        const { error } = await supabase.from('private_albums').delete().eq('id', albumId);
        if (error) {
            console.error('Error deleting album:', error);
            await get().fetchMyAlbums();
            return false;
        }
        await get().fetchMyAlbums();
        return true;
    },

    addPhotoToAlbum: async (albumId: number, photoPath: string, mediaType: 'photo' | 'video' = 'photo') => {
        const user = useAuthStore.getState().user;
        if (!user) return null;

        const payload: any = { 
            album_id: albumId, 
            photo_path: photoPath, 
            user_id: user.id 
        };
        if (mediaType === 'video' || isVideoUrl(photoPath)) {
            payload.media_type = 'video';
        }

        let { data, error } = await supabase
            .from('private_album_photos')
            .insert(payload)
            .select()
            .single();

        if (error && error.message?.includes('media_type')) {
            delete payload.media_type;
            const res = await supabase
                .from('private_album_photos')
                .insert(payload)
                .select()
                .single();
            data = res.data;
            error = res.error;
        }

        if (error) {
            console.error('Error adding photo to album:', error);
            return null;
        }

        const publicUrl = getPublicImageUrl(photoPath);
        const newPhoto: PrivateAlbumPhoto = {
            ...data,
            photo_path: publicUrl,
            media_type: mediaType === 'video' || isVideoUrl(photoPath) ? 'video' : 'photo'
        };

        set(state => ({
            myAlbums: state.myAlbums.map(album => 
                album.id === albumId 
                    ? { ...album, private_album_photos: [...(album.private_album_photos || []), newPhoto] }
                    : album
            )
        }));

        await get().fetchMyAlbums(); 
        return data;
    },
    
    deletePhotoFromAlbum: async (photoId: number) => {
        set(state => ({
            myAlbums: state.myAlbums.map(album => ({
                ...album,
                private_album_photos: (album.private_album_photos || []).filter(p => p.id !== photoId)
            }))
        }));

        const { error } = await supabase.from('private_album_photos').delete().eq('id', photoId);
        if (error) {
            console.error('Error deleting photo:', error);
            await get().fetchMyAlbums();
            return false;
        }
        await get().fetchMyAlbums();
        return true;
    },

    fetchAlbumById: async (albumId: number): Promise<PrivateAlbum | null> => {
        const { data, error } = await supabase
            .from('private_albums')
            .select('*, private_album_photos(*, user_id)')
            .eq('id', albumId)
            .single();

        if (error || !data) {
            console.error('Error fetching album by id:', error);
            return null;
        }

        return {
            ...data,
            private_album_photos: (data.private_album_photos || []).map((photo: any) => ({
                ...photo,
                photo_path: getPublicImageUrl(photo.photo_path),
                media_type: photo.media_type || (isVideoUrl(photo.photo_path) ? 'video' : 'photo')
            }))
        };
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
                        photo_path: getPublicImageUrl(photo.photo_path),
                        media_type: photo.media_type || (isVideoUrl(photo.photo_path) ? 'video' : 'photo')
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
        const currentUser = useAuthStore.getState().user;
        if (!currentUser) return;

        try {
            const { error: rpcError } = await supabase.rpc('grant_album_access', {
                p_album_id: albumId,
                p_target_user_id: targetUserId,
            });
            if (!rpcError) return;
        } catch (e) {
            console.warn("RPC grant_album_access warning:", e);
        }

        // Direct table upsert fallback
        const { error } = await supabase
            .from('private_album_access')
            .upsert({
                owner_id: currentUser.id,
                requester_id: targetUserId,
                status: 'granted'
            }, { onConflict: 'owner_id,requester_id' });

        if (error) {
            console.error('Error granting album access:', error);
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