import { create } from 'zustand';
import { supabase, getPublicImageUrl } from '../lib/supabase';
import { useAuthStore } from './authStore';
import { PrivateAlbum, PrivateAlbumPhoto, AlbumAccessStatus } from '../types';
import { isVideoUrl } from '../lib/utils';

interface AlbumState {
  myAlbums: PrivateAlbum[];
  isUploading: boolean;
  isLoading: boolean;
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
  fetchAlbumsAndAccessStatusForUser: (userId: string) => Promise<void>;
  requestAccess: (ownerId: string) => Promise<void>;
  grantAccess: (albumId: number, targetUserId: string) => Promise<void>;
  clearViewedUserData: () => void;
}

const PRIVATE_BUCKET = 'private_media';
const LEGACY_PUBLIC_BUCKET = 'user_uploads';
const SIGNED_URL_TTL_SECONDS = 60 * 60;

const resolveAlbumMediaUrl = async (photo: any): Promise<any> => {
  const storagePath = photo.photo_path;
  const storageBucket = photo.storage_bucket || LEGACY_PUBLIC_BUCKET;

  if (storageBucket === PRIVATE_BUCKET) {
    const { data, error } = await supabase.storage
      .from(PRIVATE_BUCKET)
      .createSignedUrl(storagePath, SIGNED_URL_TTL_SECONDS);

    if (error) {
      console.error('Error signing private album media:', error);
      return { ...photo, photo_path: '', storage_path: storagePath, storage_bucket: storageBucket };
    }

    return {
      ...photo,
      photo_path: data.signedUrl,
      storage_path: storagePath,
      storage_bucket: storageBucket,
      media_type: photo.media_type || (isVideoUrl(storagePath) ? 'video' : 'photo'),
    };
  }

  return {
    ...photo,
    photo_path: getPublicImageUrl(storagePath),
    storage_path: storagePath,
    storage_bucket: storageBucket,
    media_type: photo.media_type || (isVideoUrl(storagePath) ? 'video' : 'photo'),
  };
};

const decorateAlbum = async (album: any): Promise<PrivateAlbum> => ({
  ...album,
  private_album_photos: await Promise.all((album.private_album_photos || []).map(resolveAlbumMediaUrl)),
});

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
      .select('*, private_album_photos(*)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching albums:', error);
      set({ isLoading: false });
      return;
    }

    const albums = await Promise.all((data || []).map(decorateAlbum));
    set({ myAlbums: albums, isLoading: false });
  },

  uploadPhoto: async (file: File) => {
    set({ isUploading: true });
    const user = useAuthStore.getState().user;
    if (!user) {
      set({ isUploading: false });
      return null;
    }

    const fileExt = file.name.split('.').pop() || 'jpg';
    const filePath = `${user.id}/albums/${Date.now()}.${fileExt}`;
    const { error } = await supabase.storage.from(PRIVATE_BUCKET).upload(filePath, file);
    set({ isUploading: false });

    if (error) {
      console.error('Error uploading private photo:', error);
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
    const filePath = `${user.id}/albums/videos/${Date.now()}.${fileExt}`;
    const { error } = await supabase.storage.from(PRIVATE_BUCKET).upload(filePath, file);
    set({ isUploading: false });

    if (error) {
      console.error('Error uploading private video:', error);
      return null;
    }
    return filePath;
  },

  uploadMedia: async (file: File) => {
    const video = file.type.startsWith('video/') || isVideoUrl(file.name);
    const path = video ? await get().uploadVideo(file) : await get().uploadPhoto(file);
    return path ? { path, mediaType: video ? 'video' : 'photo' } : null;
  },

  uploadAudio: async (file: File) => {
    set({ isUploading: true });
    const user = useAuthStore.getState().user;
    if (!user) {
      set({ isUploading: false });
      return null;
    }

    const fileExt = file.name.split('.').pop() || 'webm';
    const filePath = `${user.id}/albums/audios/${Date.now()}.${fileExt}`;
    const { error } = await supabase.storage.from(PRIVATE_BUCKET).upload(filePath, file);
    set({ isUploading: false });

    if (error) {
      console.error('Error uploading private audio:', error);
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

    const newAlbum = { ...data, private_album_photos: [] } as PrivateAlbum;
    set((state) => ({ myAlbums: [newAlbum, ...state.myAlbums] }));
    return newAlbum;
  },

  deleteAlbum: async (albumId: number) => {
    const previous = get().myAlbums;
    set((state) => ({ myAlbums: state.myAlbums.filter((album) => album.id !== albumId) }));
    const { error } = await supabase.from('private_albums').delete().eq('id', albumId);
    if (error) {
      console.error('Error deleting album:', error);
      set({ myAlbums: previous });
      return false;
    }
    return true;
  },

  addPhotoToAlbum: async (albumId: number, photoPath: string, mediaType: 'photo' | 'video' = 'photo') => {
    const user = useAuthStore.getState().user;
    if (!user) return null;

    const { data, error } = await supabase
      .from('private_album_photos')
      .insert({
        album_id: albumId,
        photo_path: photoPath,
        user_id: user.id,
        storage_bucket: PRIVATE_BUCKET,
      })
      .select()
      .single();

    if (error || !data) {
      console.error('Error adding private media to album:', error);
      return null;
    }

    const decorated = await resolveAlbumMediaUrl({ ...data, media_type: mediaType });
    set((state) => ({
      myAlbums: state.myAlbums.map((album) =>
        album.id === albumId
          ? { ...album, private_album_photos: [...(album.private_album_photos || []), decorated] }
          : album,
      ),
    }));
    return decorated as PrivateAlbumPhoto;
  },

  deletePhotoFromAlbum: async (photoId: number) => {
    let target: any = null;
    for (const album of get().myAlbums) {
      const found = (album.private_album_photos || []).find((photo: any) => photo.id === photoId);
      if (found) {
        target = found;
        break;
      }
    }

    const { error } = await supabase.from('private_album_photos').delete().eq('id', photoId);
    if (error) {
      console.error('Error deleting photo from album:', error);
      return false;
    }

    if (target?.storage_bucket === PRIVATE_BUCKET && target?.storage_path) {
      const { error: storageError } = await supabase.storage.from(PRIVATE_BUCKET).remove([target.storage_path]);
      if (storageError) console.warn('Private media metadata deleted but object cleanup failed:', storageError);
    }

    set((state) => ({
      myAlbums: state.myAlbums.map((album) => ({
        ...album,
        private_album_photos: (album.private_album_photos || []).filter((photo: any) => photo.id !== photoId),
      })),
    }));
    return true;
  },

  fetchAlbumById: async (albumId: number) => {
    const { data, error } = await supabase
      .from('private_albums')
      .select('*, private_album_photos(*)')
      .eq('id', albumId)
      .single();

    if (error || !data) {
      console.error('Error fetching album by id:', error);
      return null;
    }
    return decorateAlbum(data);
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

    if (accessError) console.error('Error fetching album access status:', accessError);
    const status = accessData?.[0]?.status as AlbumAccessStatus | undefined;
    set({ viewedUserAccessStatus: status || null });

    if (status === 'granted') {
      const { data, error } = await supabase
        .from('private_albums')
        .select('*, private_album_photos(*)')
        .eq('user_id', userId);

      if (!error && data) {
        set({ viewedUserAlbums: await Promise.all(data.map(decorateAlbum)) });
      }
    }

    set({ isFetchingViewedUserAlbums: false });
  },

  requestAccess: async (ownerId: string) => {
    const currentUser = useAuthStore.getState().user;
    if (!currentUser) throw new Error('User not logged in');

    const { error } = await supabase.from('private_album_access').insert({
      owner_id: ownerId,
      requester_id: currentUser.id,
      status: 'pending',
    });

    if (error) throw error;

    const { session } = (await supabase.auth.getSession()).data;
    if (session) {
      fetch('/api/send-album-request-push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ receiver_id: ownerId }),
      }).catch((err) => console.error('Error sending album request push notification:', err));
    }

    set({ viewedUserAccessStatus: 'pending' });
  },

  grantAccess: async (albumId: number, targetUserId: string) => {
    const currentUser = useAuthStore.getState().user;
    if (!currentUser) return;

    const { error } = await supabase.rpc('grant_album_access', {
      p_album_id: albumId,
      p_target_user_id: targetUserId,
    });
    if (error) console.error('Error granting album access:', error);
  },

  clearViewedUserData: () => {
    set({ viewedUserAlbums: [], viewedUserAccessStatus: null, isFetchingViewedUserAlbums: false });
  },
}));
