import { supabase } from '../../lib/supabase';
import type { AdminImageKind } from './server';

interface SignedUploadIntent {
  bucket: 'news_images' | 'venues';
  path: string;
  token: string;
  publicUrl: string;
  expiresInSeconds: number;
}

export async function uploadAdminImage(
  file: File,
  kind: AdminImageKind,
  adminToken: string,
): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Somente imagens são permitidas.');
  }

  if (file.size > 5 * 1024 * 1024) {
    throw new Error('Imagem muito grande (Max 5MB).');
  }

  const intentResponse = await fetch('/api/admin/media-upload', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({ kind, mimeType: file.type }),
  });

  if (!intentResponse.ok) {
    const payload = await intentResponse.json().catch(() => ({}));
    throw new Error(payload.error || 'Falha ao preparar upload seguro.');
  }

  const intent = (await intentResponse.json()) as SignedUploadIntent;
  const { error } = await supabase.storage
    .from(intent.bucket)
    .uploadToSignedUrl(intent.path, intent.token, file, {
      contentType: file.type,
      cacheControl: '3600',
    });

  if (error) {
    throw new Error(`Falha no upload seguro: ${error.message}`);
  }

  return intent.publicUrl;
}
