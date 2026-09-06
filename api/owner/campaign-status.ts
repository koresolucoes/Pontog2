import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  authenticateServerUser,
  createServerAuthorizationClient,
} from '../../engines/authorization/server';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).end('Method Not Allowed');
  }

  try {
    const campaignId = typeof req.body?.campaignId === 'string' ? req.body.campaignId.trim() : '';
    const status = typeof req.body?.status === 'string' ? req.body.status.trim().toLowerCase() : '';
    if (!campaignId || !['approved', 'paused'].includes(status)) {
      return res.status(400).json({ error: 'Campanha ou status inválido.' });
    }

    const client = createServerAuthorizationClient();
    const user = await authenticateServerUser(req.headers.authorization, client);
    const { data, error } = await client.rpc('set_b2b_campaign_status', {
      p_actor_user_id: user.id,
      p_campaign_id: campaignId,
      p_status: status,
    });

    if (error) throw error;
    return res.status(200).json({ success: true, status: data || status });
  } catch (error: any) {
    const message = error?.message || 'Falha ao alterar campanha.';
    if (/authentication required/i.test(message)) return res.status(401).json({ error: 'Usuário não autenticado.' });
    if (/not owned|does not belong/i.test(message)) return res.status(403).json({ error: 'Você não possui esta campanha.' });
    console.error('Owner campaign status update failed:', error);
    return res.status(500).json({ error: 'Não foi possível alterar o status da campanha.' });
  }
}
