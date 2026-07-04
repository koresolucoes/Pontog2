// api/admin/user-actions.ts
import { createClient } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { enforceRoles, recordAuditLog } from './_utils.js';
import { add } from 'date-fns';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).end('Method Not Allowed');
  }

  try {
    // 1. Authenticate the admin (any valid role can initially access the endpoint)
    const admin = enforceRoles(req, ['owner', 'moderator', 'support']);
    
    const { userId, action, duration_days, reason } = req.body;
    if (!userId || !action) {
      return res.status(400).json({ error: 'userId e action são obrigatórios.' });
    }

    const supabaseAdmin = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Fetch the target user's username for better audit logs
    const { data: targetUser } = await supabaseAdmin
      .from('profiles')
      .select('username')
      .eq('id', userId)
      .single();
    
    const targetName = targetUser?.username || userId;

    let updates: any = {};
    let message = '';

    // 2. Enforce granular roles for specific actions
    switch (action) {
      case 'grant-plus':
        // Only OWNER can grant Plus
        if (admin.role !== 'owner') {
          return res.status(403).json({ error: 'Apenas Administradores do tipo Owner podem conceder assinaturas manualmente.' });
        }
        updates = {
          subscription_tier: 'plus',
          subscription_expires_at: add(new Date(), { months: 1 }).toISOString(),
        };
        message = 'Assinatura Plus concedida.';
        
        await supabaseAdmin.from('payments').insert({
            mercadopago_id: `admin_grant_${Date.now()}`,
            user_id: userId,
            plan_id: 'admin_monthly',
            amount: 0.00,
            status: 'approved',
        });
        
        await recordAuditLog(
          req, 
          admin, 
          'GRANT_PLUS', 
          userId, 
          `Concedeu plano Plus de 1 mês para o usuário @${targetName}. Motivo: ${reason || 'Não informado'}`
        );
        break;

      case 'revoke-plus':
        // Only OWNER can revoke Plus
        if (admin.role !== 'owner') {
          return res.status(403).json({ error: 'Apenas Administradores do tipo Owner podem revogar assinaturas.' });
        }
        updates = {
          subscription_tier: 'free',
          subscription_expires_at: new Date().toISOString(),
        };
        message = 'Assinatura Plus revogada.';
        
        await recordAuditLog(
          req, 
          admin, 
          'REVOKE_PLUS', 
          userId, 
          `Revogou plano Plus do usuário @${targetName}. Motivo: ${reason || 'Não informado'}`
        );
        break;

      case 'suspend':
        // Owner, Moderator, and Support can suspend
        if (!duration_days || typeof duration_days !== 'number') {
            return res.status(400).json({ error: 'Duração em dias é obrigatória para suspensão.' });
        }
        updates = {
          status: 'suspended',
          suspended_until: add(new Date(), { days: duration_days }).toISOString(),
        };
        message = `Usuário suspenso por ${duration_days} dia(s).`;
        
        await recordAuditLog(
          req, 
          admin, 
          'SUSPEND_USER', 
          userId, 
          `Suspendeu o usuário @${targetName} por ${duration_days} dias. Motivo: ${reason || 'Não informado'}`
        );
        break;

      case 'ban':
        // Only Owner and Moderator can ban
        if (admin.role === 'support') {
          return res.status(403).json({ error: 'Suporte não pode banir usuários permanentemente. Solicite a um moderador ou owner.' });
        }
        updates = {
          status: 'banned',
          suspended_until: null,
        };
        message = 'Usuário banido permanentemente.';
        
        await recordAuditLog(
          req, 
          admin, 
          'BAN_USER', 
          userId, 
          `Baniu permanentemente o usuário @${targetName}. Motivo: ${reason || 'Não informado'}`
        );
        break;

      case 'reactivate':
        // Owner, Moderator, and Support can reactivate
        updates = {
          status: 'active',
          suspended_until: null,
        };
        message = 'Usuário reativado.';
        
        await recordAuditLog(
          req, 
          admin, 
          'REACTIVATE_USER', 
          userId, 
          `Reativou a conta do usuário @${targetName}. Motivo: ${reason || 'Não informado'}`
        );
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
