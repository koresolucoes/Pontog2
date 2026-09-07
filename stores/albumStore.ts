import { useAlbumStore as legacyAlbumStore } from './albumStoreLegacy';
import { supabase } from '../lib/supabase';
import { useAuthStore } from './authStore';
import type { AlbumAccessStatus, PrivateAlbum, PrivateAlbumPhoto } from '../types';
import { isVideoUrl } from '../lib/utils';
import { consumeAlbumShareIntent } from '../modules/albums/shareIntent';

const PRIVATE_BUCKET = 'private_media';

const authenticatedJson = async (url: string): Promise<any> => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error('authentication_required');

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${session.access_token}` },
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body?.error || `request_failed_${response.status}`);
  }
  return response.json();
};

const normalizeDeliveredAlbum = (raw: any): PrivateAlbum => ({
  ...raw,
  private_album_photos: (raw?.private_album_photos || [])
    .filter((photo: any) => Boolean(photo?.photo_url))
    .map((photo: any) => ({
      ...photo,
      storage_path: photo.photo_path,
      storage_bucket: photo.storage_bucket || PRIVATE_BUCKET,
      photo_path: photo.photo_url,
      media_type: photo.media_type || (isVideoUrl(photo.photo_path) ? 'video' : 'photo'),
    })),
});

const listAuthorizedAlbums = async (ownerId: string): Promise<PrivateAlbum[]> => {
  const payload = await authenticatedJson(`/api/private-albums?ownerId=${encodeURIComponent(ownerId)}`);
  return (payload.albums || []).map((album: any) => ({ ...album, private_album_photos: [] }));
};

const fetchAlbumByIdSecurely = async (albumId: number): Promise<PrivateAlbum | null> => {
  try {
    const payload = await authenticatedJson(`/api/private-album?albumId=${encodeURIComponent(String(albumId))}`);
    return normalizeDeliveredAlbum(payload);
  } catch (error) {
    console.error('Error opening private album:', error);
    return null;
  }
};

const grantAlbumAccessSecurely = async (albumId: number, targetUserId: string): Promise<void> => {
  const intent = consumeAlbumShareIntent(albumId);
  const expiresAt = intent.expiresInHours
    ? new Date(Date.now() + intent.expiresInHours * 60 * 60 * 1000).toISOString()
    : null;

  const { error } = await supabase.rpc('grant_album_access_v2', {
    p_album_id: albumId,
    p_target_user_id: targetUserId,
    p_expires_at: expiresAt,
    p_is_view_once: intent.isViewOnce,
  });

  if (error) {
    console.error('Error granting album access:', error);
    throw error;
  }
};

const fetchMyAlbumsSecurely = async (): Promise<void> => {
  legacyAlbumStore.setState({ isLoading: true } as any);
  const user = useAuthStore.getState().user;
  if (!user) {
    legacyAlbumStore.setState({ isLoading: false } as any);
    return;
  }

  try {
    const metadata = await listAuthorizedAlbums(user.id);
    const albums = (await Promise.all(metadata.map((album) => fetchAlbumByIdSecurely(album.id))))
      .filter((album): album is PrivateAlbum => Boolean(album));
    legacyAlbumStore.setState({ myAlbums: albums, isLoading: false } as any);
  } catch (error) {
    console.error('Error fetching private albums:', error);
    legacyAlbumStore.setState({ isLoading: false } as any);
  }
};

const uploadPrivateAlbumMedia = async (file: File): Promise<{ path: string; mediaType: 'photo' | 'video' } | null> => {
  legacyAlbumStore.setState({ isUploading: true } as any);
  const user = useAuthStore.getState().user;
  if (!user) {
    legacyAlbumStore.setState({ isUploading: false } as any);
    return null;
  }

  const isVideo = file.type.startsWith('video/') || isVideoUrl(file.name);
  const extension = file.name.split('.').pop() || (isVideo ? 'mp4' : 'jpg');
  const path = `${user.id}/albums/${Date.now()}_${crypto.randomUUID()}.${extension}`;

  const { error } = await supabase.storage.from(PRIVATE_BUCKET).upload(path, file, {
    upsert: false,
    contentType: file.type || undefined,
  });
  legacyAlbumStore.setState({ isUploading: false } as any);

  if (error) {
    console.error('Error uploading private album media:', error);
    return null;
  }

  return { path, mediaType: isVideo ? 'video' : 'photo' };
};

const addPrivateMediaToAlbum = async (
  albumId: number,
  photoPath: string,
  mediaType: 'photo' | 'video' = 'photo',
): Promise<PrivateAlbumPhoto | null> => {
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

  if (error) {
    console.error('Error adding private media to album:', error);
    await supabase.storage.from(PRIVATE_BUCKET).remove([photoPath]);
    return null;
  }

  await fetchMyAlbumsSecurely();
  return { ...data, media_type: mediaType } as PrivateAlbumPhoto;
};

const deletePrivateMedia = async (photoId: number): Promise<boolean> => {
  const state = legacyAlbumStore.getState();
  const media = state.myAlbums
    .flatMap((album) => album.private_album_photos || [])
    .find((photo) => photo.id === photoId) as any;

  const { error } = await supabase.from('private_album_photos').delete().eq('id', photoId);
  if (error) {
    console.error('Error deleting private album media row:', error);
    return false;
  }

  const storagePath = media?.storage_path;
  if (storagePath) {
    const { error: storageError } = await supabase.storage.from(PRIVATE_BUCKET).remove([storagePath]);
    if (storageError) console.warn('Private media object cleanup failed:', storageError);
  }

  await fetchMyAlbumsSecurely();
  return true;
};

const fetchAlbumsAndAccessStatusSecurely = async (ownerId: string): Promise<void> => {
  legacyAlbumStore.setState({
    isFetchingViewedUserAlbums: true,
    viewedUserAlbums: [],
    viewedUserAccessStatus: null,
  } as any);

  const currentUser = useAuthStore.getState().user;
  if (!currentUser || currentUser.id === ownerId) {
    legacyAlbumStore.setState({ isFetchingViewedUserAlbums: false } as any);
    return;
  }

  try {
    const [albums, accessResult] = await Promise.all([
      listAuthorizedAlbums(ownerId),
      supabase
        .from('private_album_access')
        .select('status, expires_at, consumed_at')
        .eq('owner_id', ownerId)
        .eq('requester_id', currentUser.id)
        .order('id', { ascending: false })
        .limit(10),
    ]);

    if (accessResult.error) throw accessResult.error;
    const rows = accessResult.data || [];
    const now = Date.now();
    const validGranted = rows.some((row: any) => row.status === 'granted'
      && !row.consumed_at
      && (!row.expires_at || new Date(row.expires_at).getTime() > now));
    const pending = rows.some((row: any) => row.status === 'pending');
    const status: AlbumAccessStatus = validGranted ? 'granted' : pending ? 'pending' : null;

    legacyAlbumStore.setState({
      viewedUserAlbums: albums,
      viewedUserAccessStatus: status,
      isFetchingViewedUserAlbums: false,
    } as any);
  } catch (error) {
    console.error('Error fetching private album access:', error);
    legacyAlbumStore.setState({ isFetchingViewedUserAlbums: false } as any);
  }
};

legacyAlbumStore.setState({
  fetchMyAlbums: fetchMyAlbumsSecurely,
  uploadMedia: uploadPrivateAlbumMedia,
  addPhotoToAlbum: addPrivateMediaToAlbum,
  deletePhotoFromAlbum: deletePrivateMedia,
  fetchAlbumById: fetchAlbumByIdSecurely,
  fetchAlbumsAndAccessStatusForUser: fetchAlbumsAndAccessStatusSecurely,
  grantAccess: grantAlbumAccessSecurely,
} as any);

export const useAlbumStore = legacyAlbumStore;
