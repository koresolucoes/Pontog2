import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  authenticateServerUser,
  createServerAuthorizationClient,
} from '../engines/authorization/server.js';

const listAllUnderPrefix = async (client: any, bucket: string, prefix: string): Promise<string[]> => {
  const results: string[] = [];
  const walk = async (current: string, depth: number) => {
    if (depth > 6) return;
    const { data, error } = await client.storage.from(bucket).list(current, { limit: 1000 });
    if (error || !data) return;
    for (const item of data) {
      const path = current ? `${current}/${item.name}` : item.name;
      if (item.id) results.push(path);
      else await walk(path, depth + 1);
    }
  };
  await walk(prefix, 0);
  return results;
};

const removeInChunks = async (client: any, bucket: string, paths: string[]) => {
  for (let index = 0; index < paths.length; index += 100) {
    const chunk = paths.slice(index, index + 100);
    if (!chunk.length) continue;
    const { error } = await client.storage.from(bucket).remove(chunk);
    if (error) console.warn(`Account media cleanup failed in ${bucket}:`, error);
  }
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).end('Method Not Allowed');
  }

  res.setHeader('Cache-Control', 'no-store');

  try {
    const client = createServerAuthorizationClient();
    const actor = await authenticateServerUser(req.headers.authorization, client);
    const reason = typeof req.body?.reason === 'string' && req.body.reason === 'underage'
      ? 'underage'
      : 'user_requested';

    const [publicMedia, privateMedia] = await Promise.all([
      listAllUnderPrefix(client, 'user_uploads', actor.id),
      listAllUnderPrefix(client, 'private_media', actor.id),
    ]);

    await Promise.all([
      removeInChunks(client, 'user_uploads', publicMedia),
      removeInChunks(client, 'private_media', privateMedia),
    ]);

    const { error: anonymizeError } = await client.rpc('anonymize_account_server_v1', {
      p_actor_id: actor.id,
      p_reason: reason,
    });
    if (anonymizeError) throw anonymizeError;

    const { error: authDeleteError } = await client.auth.admin.deleteUser(actor.id);
    if (authDeleteError) throw authDeleteError;

    return res.status(200).json({ deleted: true });
  } catch (error: any) {
    const message = error?.message || 'Account deletion failed.';
    if (/Authentication required/i.test(message)) return res.status(401).json({ error: 'Usuário não autenticado.' });
    console.error('Account deletion failed:', error);
    return res.status(500).json({ error: 'Não foi possível excluir a conta.' });
  }
}
