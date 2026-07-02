// api/admin/user-actions.ts
import { createClient } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import jwt from 'jsonwebtoken';
import { add } from 'date-fns';

const verifyAdmin = (req: VercelRequest) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) throw new Error('Not authenticated');
    jwt.verify(token, process.env.JWT_SECRET!);
};

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).end('Method Not Allowed');
  }

  try {
    verifyAdmin(req);
    
    const { userId, action, duration_days } = req.body;
    if (!userId || !action) {
      return res.status(400).json({ error: 'userId e action são obrigatórios.' });
    }

    const supabaseAdmin = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    let updates: any = {};
    let message = '';

    switch (action) {
      case 'grant-plus':
        // Por simplicidade, vamos conceder o plano de 1 mês.
        updates = {
          subscription_tier: 'plus',
          subscription_expires_at: add(new Date(), { months: 1 }).toISOString(),
        };
        message = 'Assinatura Plus concedida.';
        // Logar a concessão manual
        await supabaseAdmin.from('payments').insert({
            mercadopago_id: `admin_grant_${Date.now()}`,
            user_id: userId,
            plan_id: 'admin_monthly', // ID genérico para concessão
            amount: 0.00,
            status: 'approved',
        });
        break;

      case 'revoke-plus':
        updates = {
          subscription_tier: 'free',
          subscription_expires_at: new Date().toISOString(),
        };
        message = 'Assinatura Plus revogada.';
        break;

      case 'suspend':
        if (!duration_days || typeof duration_days !== 'number') {
            return res.status(400).json({ error: 'Duração em dias é obrigatória para suspensão.' });
        }
        updates = {
          status: 'suspended',
          suspended_until: add(new Date(), { days: duration_days }).toISOString(),
        };
        message = `Usuário suspenso por ${duration_days} dia(s).`;
        break;

      case 'ban':
        updates = {
          status: 'banned',
          suspended_until: null,
        };
        message = 'Usuário banido permanentemente.';
        break;

      case 'reactivate':
        updates = {
          status: 'active',
          suspended_until: null,
        };
        message = 'Usuário reativado.';
        break;

      default:
        return res.status(400).json({ error: 'Ação inválida.' });
    }

    const { error } = await supabaseAdmin
      .from('profiles')
      .update(updates)
      .eq('id', userId);

    if (error) throw error;
        
    res.status(200).json({ success: true, message });

  } catch (error: any) {
    console.error(`Error in /api/admin/user-actions: ${error.message}`);
    if (error.message === 'Not authenticated' || error.name === 'JsonWebTokenError') {
       return res.status(401).json({ error: 'Authentication failed' });
    }
    res.status(500).json({ error: error.message || 'Erro no servidor' });
  }
}