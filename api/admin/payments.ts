// api/admin/payments.ts
import { createClient } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { enforceRoles } from './_utils';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
) {
  try {
    // Only owner or financial can view payment histories
    enforceRoles(req, ['owner', 'financial']);
    
    const supabaseAdmin = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data, error } = await supabaseAdmin
      .from('payments')
      .select(`
          *,
          profiles (
              username
          )
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;
        
    res.status(200).json(data);

  } catch (error: any) {
    console.error(`Error in /api/admin/payments: ${error.message}`);
    if (error.message === 'Not authenticated' || error.message.includes('Forbidden') || error.name === 'JsonWebTokenError') {
       return res.status(401).json({ error: error.message || 'Authentication failed' });
    }
    res.status(500).json({ error: error.message || 'Server error' });
  }
}
