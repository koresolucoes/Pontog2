import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  authenticateServerUser,
  createServerAuthorizationClient,
} from '../engines/authorization/server.js';

const queryValue = (value: string | string[] | undefined): string =>
  (Array.isArray(value) ? value[0] : value || '').trim();

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).end('Method Not Allowed');
  }

  res.setHeader('Cache-Control', 'no-store');

  try {
    const ownerId = queryValue(req.query.ownerId as string | string[] | undefined);
    if (!ownerId) return res.status(400).json({ error: 'ownerId é obrigatório.' });

    const client = createServerAuthorizationClient();
    const actor = await authenticateServerUser(req.headers.authorization, client);
    const { data, error } = await client.rpc('list_private_albums_server_v1', {
      p_actor_id: actor.id,
      p_owner_id: ownerId,
    });

    if (error) throw error;
    return res.status(200).json({ albums: Array.isArray(data) ? data : [] });
  } catch (error: any) {
    const message = error?.message || 'Falha ao listar álbuns privados.';
    if (/Authentication required/i.test(message)) return res.status(401).json({ error: 'Usuário não autenticado.' });
    console.error('Private album listing failed:', error);
    return res.status(500).json({ error: 'Não foi possível listar álbuns privados.' });
  }
}
