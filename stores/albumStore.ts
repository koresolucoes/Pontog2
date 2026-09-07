import { useAlbumStore as legacyAlbumStore } from './albumStoreLegacy';
import { supabase, getPublicImageUrl } from '../lib/supabase';
import type { PrivateAlbum } from '../types';
import { isVideoUrl } from '../lib/utils';
import { consumeAlbumShareIntent } from '../modules/albums/shareIntent';

const normalizeAlbum = (raw: any): PrivateAlbum => ({
  ...raw,
  private_album_photos: (raw?.private_album_photos || []).map((photo: any) => ({
    ...photo,
    photo_path: getPublicImageUrl(photo.photo_path),
    media_type: photo.media_type || (isVideoUrl(photo.photo_path) ? 'video' : 'photo'),
  })),
});

const fetchAlbumByIdSecurely = async (albumId: number): Promise<PrivateAlbum | null> => {
  const { data, error } = await supabase.rpc('open_private_album_v2', { p_album_id: albumId });
  if (error || !data) {
    console.error('Error opening private album:', error);
    return null;
  }
  return normalizeAlbum(data);
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

// Keep mature album CRUD/upload behavior while replacing only the privacy-sensitive
// access operations with the v2 database contract.
legacyAlbumStore.setState({
  fetchAlbumById: fetchAlbumByIdSecurely,
  grantAccess: grantAlbumAccessSecurely,
} as any);

export const useAlbumStore = legacyAlbumStore;
