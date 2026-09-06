import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  authenticateServerUser,
  createServerAuthorizationClient,
  requireVenueOwner,
} from '../../engines/authorization/server';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).end('Method Not Allowed');
  }

  try {
    const venueId = typeof req.body?.venueId === 'string' ? req.body.venueId.trim() : '';
    if (!venueId) return res.status(400).json({ error: 'Local é obrigatório.' });

    const client = createServerAuthorizationClient();
    const user = await authenticateServerUser(req.headers.authorization, client);
    await requireVenueOwner(client, user.id, venueId);

    const { data, error } = await client.rpc('create_b2b_campaign_atomic', {
      p_actor_user_id: user.id,
      p_venue_id: venueId,
      p_title: typeof req.body?.title === 'string' ? req.body.title : '',
      p_message: typeof req.body?.message === 'string' ? req.body.message : '',
      p_target_tribe: typeof req.body?.targetTribe === 'string' ? req.body.targetTribe : 'Geral',
      p_placement: typeof req.body?.placement === 'string' ? req.body.placement : 'feed',
      p_duration_hours: Number(req.body?.durationHours || 24),
      p_range_meters: Number(req.body?.rangeMeters || 500),
      p_image_url: typeof req.body?.imageUrl === 'string' ? req.body.imageUrl : null,
      p_cta_text: typeof req.body?.ctaText === 'string' ? req.body.ctaText : 'Saiba Mais',
      p_cta_url: typeof req.body?.ctaUrl === 'string' ? req.body.ctaUrl : null,
    });

    if (error) throw error;
    return res.status(201).json({ success: true, campaign: data });
  } catch (error: any) {
    const message = error?.message || 'Falha ao criar campanha.';
    if (/authentication required/i.test(message)) return res.status(401).json({ error: 'Usuário não autenticado.' });
    if (/venue not found/i.test(message)) return res.status(404).json({ error: 'Local não encontrado.' });
    if (/does not belong|not owned/i.test(message)) return res.status(403).json({ error: 'Você não possui este local.' });
    if (/insufficient wallet balance/i.test(message)) return res.status(409).json({ error: 'Saldo insuficiente para esta campanha.' });
    if (/invalid campaign|invalid placement/i.test(message)) return res.status(400).json({ error: 'Dados da campanha são inválidos.' });
    console.error('Atomic B2B campaign creation failed:', error);
    return res.status(500).json({ error: 'Não foi possível criar a campanha.' });
  }
}
