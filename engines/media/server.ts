import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import { AppError } from '../../core';

export type AdminImageKind = 'news' | 'venue';

const BUCKET_BY_KIND: Record<AdminImageKind, 'news_images' | 'venues'> = {
  news: 'news_images',
  venue: 'venues',
};

const EXTENSION_BY_MIME: Readonly<Record<string, string>> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

export interface SignedAdminImageUpload {
  bucket: 'news_images' | 'venues';
  path: string;
  token: string;
  publicUrl: string;
  expiresInSeconds: 7200;
}

function getStorageAdminClient() {
  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new AppError('Storage backend is not configured.', {
      code: 'MEDIA_CONFIGURATION_ERROR',
      status: 500,
    });
  }

  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function createSignedAdminImageUpload(
  kind: AdminImageKind,
  mimeType: string,
): Promise<SignedAdminImageUpload> {
  const bucket = BUCKET_BY_KIND[kind];
  const extension = EXTENSION_BY_MIME[mimeType.toLowerCase()];

  if (!bucket || !extension) {
    throw new AppError('Unsupported image type.', {
      code: 'MEDIA_TYPE_NOT_ALLOWED',
      status: 400,
      expose: true,
    });
  }

  const path = `admin/${Date.now()}-${crypto.randomUUID()}.${extension}`;
  const client = getStorageAdminClient();

  const { data, error } = await client.storage
    .from(bucket)
    .createSignedUploadUrl(path, { upsert: false });

  if (error || !data?.token) {
    throw new AppError('Could not create signed upload.', {
      code: 'MEDIA_SIGNED_UPLOAD_FAILED',
      status: 500,
      cause: error,
    });
  }

  const { data: publicUrlData } = client.storage.from(bucket).getPublicUrl(path);

  return {
    bucket,
    path,
    token: data.token,
    publicUrl: publicUrlData.publicUrl,
    expiresInSeconds: 7200,
  };
}
