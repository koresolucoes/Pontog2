// api/admin/mfa/disable.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { verifyAdminAndGetRole, recordAuditLog, getSupabaseClient } from '../_utils.js';
import { verifyTOTP } from '../_totp.js';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).end('Method Not Allowed');
  }

  try {
    const admin = verifyAdminAndGetRole(req);
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({ error: 'O código atual de 6 dígitos é obrigatório para desativar a proteção MFA.' });
    }

    const supabaseAdmin = getSupabaseClient();
    if (!supabaseAdmin) {
      return res.status(500).json({ error: 'Integração com Supabase não está configurada.' });
    }

    // Fetch current secret to verify
    const { data: dbAdmin, error: fetchError } = await supabaseAdmin
      .from('admins')
      .select('mfa_secret')
      .eq('email', admin.email.toLowerCase())
      .single();

    if (fetchError || !dbAdmin) {
      return res.status(404).json({ error: 'Administrador não encontrado.' });
    }

    if (!dbAdmin.mfa_secret) {
      return res.status(400).json({ error: 'MFA não está habilitado para esta conta.' });
    }

    // Verify token
    const isValid = verifyTOTP(code, dbAdmin.mfa_secret);
    if (!isValid) {
      return res.status(400).json({ error: 'Código de autenticação inválido. Não foi possível desativar o MFA.' });
    }

    // Clear secret in DB
    const { error: updateError } = await supabaseAdmin
      .from('admins')
      .update({
        mfa_secret: null,
        updated_at: new Date().toISOString()
      })
      .eq('email', admin.email.toLowerCase());

    if (updateError) {
      throw updateError;
    }

    await recordAuditLog(
      req,
      admin,
      'DISABLE_MFA',
      admin.email,
      'Desativou com sucesso a autenticação em duas etapas (2FA) da própria conta.'
    );

    return res.status(200).json({ success: true });

  } catch (error: any) {
    console.error(`Error in /api/admin/mfa/disable: ${error.message}`);
    if (error.message === 'Not authenticated' || error.message.includes('expired')) {
      return res.status(401).json({ error: 'Sessão administrativa expirada.' });
    }
    return res.status(500).json({ error: error.message || 'Erro interno no servidor.' });
  }
}
