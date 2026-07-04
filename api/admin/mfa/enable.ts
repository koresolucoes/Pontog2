// api/admin/mfa/enable.ts
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
    const { secret, code } = req.body;

    if (!secret || !code) {
      return res.status(400).json({ error: 'Secret e código de 6 dígitos são obrigatórios.' });
    }

    // Verify code against the prospective secret
    const isValid = verifyTOTP(code, secret);
    if (!isValid) {
      return res.status(400).json({ error: 'Código de autenticação inválido. Verifique o seu aplicativo e tente novamente.' });
    }

    // Persist secret in the database
    const supabaseAdmin = getSupabaseClient();
    if (!supabaseAdmin) {
      return res.status(500).json({ error: 'Integração com Supabase não está configurada.' });
    }

    const { error } = await supabaseAdmin
      .from('admins')
      .update({
        mfa_secret: secret,
        updated_at: new Date().toISOString()
      })
      .eq('email', admin.email.toLowerCase());

    if (error) {
      throw error;
    }

    await recordAuditLog(
      req,
      admin,
      'ENABLE_MFA',
      admin.email,
      'Habilitou com sucesso a autenticação em duas etapas (2FA) na própria conta.'
    );

    return res.status(200).json({ success: true });

  } catch (error: any) {
    console.error(`Error in /api/admin/mfa/enable: ${error.message}`);
    if (error.message === 'Not authenticated' || error.message.includes('expired')) {
      return res.status(401).json({ error: 'Sessão administrativa expirada.' });
    }
    return res.status(500).json({ error: error.message || 'Erro interno no servidor.' });
  }
}
