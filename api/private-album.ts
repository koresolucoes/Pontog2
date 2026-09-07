import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  authenticateServerUser,
  createServerAuthorizationClient,
} from '../engines/authorization/server.js';

const queryValue = (value: string | string[] | undefined): string =>
  (Array.isArray(value) ? value[0] : value || '').trim();

const signedUrlTtlSeconds = (isViewOnce: boolean): number => isViewOnce ? 300 : 3600;

const migrateLegacyMedia = async (client: any, photo: any): Promise<any> => {
  if (!photo?.photo_path || photo.storage_bucket !== 'user_uploads') return photo;

  const path = String(photo.photo_path);
  const { data: blob, error: downloadError } = await client.storage.from('user_uploads').download(path);
  if (downloadError || !blob) {
    console.error('Private media legacy download failed:', downloadError);
    return photo;
  }

  const { error: uploadError } = await client.storage.from('private_media').upload(path, blob, {
    upsert: true,
    contentType: blob.type || undefined,
  });
  if (uploadError) {
    console.error('Private media legacy upload failed:', uploadError);
    return photo;
  }

  const { error: rowError } = await client
    .from('private_album_photos')
    .update({ storage_bucket: 'private_media' })
    .eq('id', photo.id)
    .eq('photo_path', path);

  if (rowError) {
    console.error('Private media metadata migration failed:', rowError);
    await client.storage.from('private_media').remove([path]);
    return photo;
  }

  const { error: removeError } = await client.storage.from('user_uploads').remove([path]);
  if (removeError) console.warn('Legacy public media cleanup failed after secure copy:', removeError);

  return { ...photo, storage_bucket: 'private_media' };
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).end('Method Not Allowed');
  }

  res.setHeader('Cache-Control', 'no-store');

  try {
    const albumId = Number.parseInt(queryValue(req.query.albumId as string | string[] | undefined), 10);
    if (!Number.isFinite(albumId) || albumId <= 0) {
      return res.status(400).json({ error: 'albumId inválido.' });
    }

    const client = createServerAuthorizationClient();
    const actor = await authenticateServerUser(req.headers.authorization, client);

    const { data, error } = await client.rpc('open_private_album_server_v1', {
      p_actor_id: actor.id,
      p_album_id: albumId,
    });

    if (error || !data) {
      const message = error?.message || 'album_access_denied';
      if (/not_found/i.test(message)) return res.status(404).json({ error: 'Álbum não encontrado.' });
      if (/access|authentication/i.test(message)) return res.status(403).json({ error: 'Acesso não autorizado.' });
      throw error || new Error(message);
    }

    const access = data._access || {};
    const ttl = signedUrlTtlSeconds(Boolean(access.is_view_once));
    const photos = await Promise.all((data.private_album_photos || []).map(async (rawPhoto: any) => {
      const photo = await migrateLegacyMedia(client, rawPhoto);
      if (photo.storage_bucket !== 'private_media') {
        return { ...photo, photo_url: null };
      }

      const { data: signed, error: signedError } = await client.storage
        .from('private_media')
        .createSignedUrl(String(photo.photo_path), ttl);

      if (signedError || !signed?.signedUrl) {
        console.error('Private media signed URL failed:', signedError);
        return { ...photo, photo_url: null };
      }

      return { ...photo, photo_url: signed.signedUrl };
    }));

    const { _access, ...album } = data;
    return res.status(200).json({
      ...album,
      private_album_photos: photos,
      access: {
        is_view_once: Boolean(access.is_view_once),
        expires_at: access.expires_at || null,
      },
    });
  } catch (error: any) {
    const message = error?.message || 'Falha ao abrir álbum privado.';
    if (/Authentication required/i.test(message)) return res.status(401).json({ error: 'Usuário não autenticado.' });
    console.error('Private album delivery failed:', error);
    return res.status(500).json({ error: 'Não foi possível abrir o álbum privado.' });
  }
}
