import { getPublicImageUrl, supabase } from '../../lib/supabase';

const PUBLIC_BUCKET = 'user_uploads';
const MAX_PUBLIC_IMAGE_BYTES = 10 * 1024 * 1024;
const MAX_PUBLIC_VIDEO_BYTES = 20 * 1024 * 1024;

type PublicProfileMediaKind = 'avatar' | 'photo' | 'video';

const sanitizeExtension = (name: string, fallback: string): string => {
  const raw = name.split('.').pop()?.toLowerCase() || fallback;
  return raw.replace(/[^a-z0-9]/g, '') || fallback;
};

const validatePublicProfileMedia = (file: File, kind: PublicProfileMediaKind): void => {
  if (kind === 'video') {
    if (!file.type.startsWith('video/')) throw new Error('invalid_public_video_type');
    if (file.size > MAX_PUBLIC_VIDEO_BYTES) throw new Error('public_video_too_large');
    return;
  }

  if (!file.type.startsWith('image/')) throw new Error('invalid_public_image_type');
  if (file.size > MAX_PUBLIC_IMAGE_BYTES) throw new Error('public_image_too_large');
};

export const uploadPublicProfileMedia = async (
  userId: string,
  file: File,
  kind: PublicProfileMediaKind,
): Promise<string | null> => {
  try {
    validatePublicProfileMedia(file, kind);
    const extension = sanitizeExtension(file.name, kind === 'video' ? 'mp4' : 'jpg');
    const filePath = `${userId}/profile/${kind}_${Date.now()}.${extension}`;

    const { error } = await supabase.storage.from(PUBLIC_BUCKET).upload(filePath, file, {
      cacheControl: '3600',
      upsert: false,
      contentType: file.type || undefined,
    });

    if (error) throw error;
    return filePath;
  } catch (error) {
    console.error(`Public profile ${kind} upload failed:`, error);
    return null;
  }
};

export const publicProfileMediaUrl = (path: string | null | undefined): string => getPublicImageUrl(path);