import { createClient } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { enforceRoles, recordAuditLog } from './_utils.js';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
) {
  try {
    const admin = enforceRoles(req, ['owner', 'moderator']);
    const supabaseAdmin = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    if (req.method === 'GET') {
      const { data, error } = await supabaseAdmin
        .from('venue_claims')
        .select(`
          *,
          users:profiles (username, email),
          venues:venue_id (name, address)
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching venue claims:', error);
        return res.status(500).json({ error: 'Erro ao buscar reivindicações' });
      }

      return res.status(200).json(data);
    } 
    
    if (req.method === 'POST') {
      const { claimId, action, reason } = req.body;
      
      if (!claimId || !['approve', 'reject'].includes(action)) {
        return res.status(400).json({ error: 'claimId e action (approve, reject) são obrigatórios' });
      }

      // Fetch the claim to get user and venue details
      const { data: claim, error: claimError } = await supabaseAdmin
        .from('venue_claims')
        .select('*')
        .eq('id', claimId)
        .single();
        
      if (claimError || !claim) {
        return res.status(404).json({ error: 'Reivindicação não encontrada.' });
      }

      const status = action === 'approve' ? 'approved' : 'rejected';
      
      const { error: updateError } = await supabaseAdmin
        .from('venue_claims')
        .update({ status })
        .eq('id', claimId);
        
      if (updateError) {
         return res.status(500).json({ error: 'Erro ao atualizar status da reivindicação' });
      }

      // If approved, update the venue with the owner and make user owner
      if (action === 'approve') {
          await supabaseAdmin
            .from('venues')
            .update({ owner_id: claim.user_id })
            .eq('id', claim.venue_id);
            
          await supabaseAdmin
            .from('profiles')
            .update({ is_owner: true })
            .eq('id', claim.user_id);
      }

      await recordAuditLog(
          req, 
          admin, 
          action === 'approve' ? 'APPROVE_CLAIM' : 'REJECT_CLAIM', 
          claimId, 
          `${action === 'approve' ? 'Aprovou' : 'Rejeitou'} reivindicação do local ${claim.venue_id} para o usuário ${claim.user_id}. Motivo: ${reason || 'Não informado'}`
      );

      return res.status(200).json({ success: true, message: `Reivindicação ${status}.` });
    }

    res.setHeader('Allow', 'GET, POST');
    return res.status(405).end('Method Not Allowed');
  } catch (error: any) {
    console.error('Error in venue-claims API:', error);
    return res.status(error.message === 'Forbidden' ? 403 : 401).json({ error: error.message });
  }
}
