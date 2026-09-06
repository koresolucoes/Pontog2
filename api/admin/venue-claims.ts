import type { VercelRequest, VercelResponse } from '@vercel/node';
import { enforceRoles, getSupabaseClient, recordAuditLog } from './_utils.js';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
) {
  try {
    const admin = enforceRoles(req, ['owner', 'moderator']);
    const supabaseAdmin = getSupabaseClient();

    if (!supabaseAdmin) {
      return res.status(500).json({ error: 'Configuração do banco administrativo indisponível.' });
    }

    if (req.method === 'GET') {
      const { data: claims, error } = await supabaseAdmin
        .from('venue_claims')
        .select(`
          *,
          venues (name, address)
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching venue claims:', error);
        return res.status(500).json({ error: 'Erro ao buscar reivindicações' });
      }

      const userIds = [...new Set((claims || []).map((claim: any) => claim.user_id))];
      const profilesMap: Record<string, any> = {};

      if (userIds.length > 0) {
        const { data: profiles, error: profilesError } = await supabaseAdmin
          .from('profiles')
          .select('id, username, email')
          .in('id', userIds);

        if (profilesError) {
          console.error('Error fetching claim profiles:', profilesError);
          return res.status(500).json({ error: 'Erro ao buscar responsáveis pelas reivindicações' });
        }

        for (const profile of profiles || []) {
          profilesMap[profile.id] = profile;
        }
      }

      const data = (claims || []).map((claim: any) => ({
        ...claim,
        users: profilesMap[claim.user_id] || { username: 'Desconhecido', email: '' },
      }));

      return res.status(200).json(data);
    }

    if (req.method === 'POST') {
      const { claimId, action, reason } = req.body || {};

      if (
        typeof claimId !== 'string'
        || typeof action !== 'string'
        || !['approve', 'reject'].includes(action)
      ) {
        return res.status(400).json({ error: 'claimId e action (approve, reject) são obrigatórios' });
      }

      const { data: claim, error: claimError } = await supabaseAdmin
        .from('venue_claims')
        .select('id, venue_id, user_id, status')
        .eq('id', claimId)
        .single();

      if (claimError || !claim) {
        return res.status(404).json({ error: 'Reivindicação não encontrada.' });
      }

      const { data: decision, error: decisionError } = await supabaseAdmin.rpc('process_venue_claim', {
        p_claim_id: claimId,
        p_action: action,
      });

      if (decisionError) {
        const message = decisionError.message || '';
        if (/claim not found/i.test(message)) {
          return res.status(404).json({ error: 'Reivindicação não encontrada.' });
        }
        if (/already decided|already owned/i.test(message)) {
          return res.status(409).json({ error: 'A reivindicação não pode mais ser processada nesse estado.' });
        }
        console.error('Atomic venue claim decision failed:', decisionError);
        return res.status(500).json({ error: 'Erro ao processar a reivindicação.' });
      }

      const status = decision?.status || (action === 'approve' ? 'approved' : 'rejected');

      await recordAuditLog(
        req,
        admin,
        action === 'approve' ? 'APPROVE_CLAIM' : 'REJECT_CLAIM',
        claimId,
        `${action === 'approve' ? 'Aprovou' : 'Rejeitou'} reivindicação do local ${claim.venue_id} para o usuário ${claim.user_id}. Motivo: ${typeof reason === 'string' && reason.trim() ? reason.trim() : 'Não informado'}`,
      );

      return res.status(200).json({ success: true, status, message: `Reivindicação ${status}.` });
    }

    res.setHeader('Allow', 'GET, POST');
    return res.status(405).end('Method Not Allowed');
  } catch (error: any) {
    console.error('Error in venue-claims API:', error);
    const message = error?.message || 'Erro interno';
    return res.status(message.startsWith('Forbidden') ? 403 : 401).json({ error: message });
  }
}
