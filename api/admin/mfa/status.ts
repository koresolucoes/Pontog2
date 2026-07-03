// api/admin/mfa/status.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { verifyAdminAndGetRole, getSupabaseClient } from '../_utils';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).end('Method Not Allowed');
  }

  try {
    const admin = verifyAdminAndGetRole(req);

    const supabaseAdmin = getSupabaseClient();
    if (!supabaseAdmin) {
      return res.status(200).json({ mfaEnabled: false });
    }

    const { data: dbAdmin, error } = await supabaseAdmin
      .from('admins')
      .select('mfa_secret')
      .eq('email', admin.email.toLowerCase())
      .single();

    if (error || !dbAdmin) {
      return res.status(200).json({ mfaEnabled: false });
    }

    return res.status(200).json({ mfaEnabled: !!dbAdmin.mfa_secret });

  } catch (err) {
    return res.status(200).json({ mfaEnabled: false });
  }
}
