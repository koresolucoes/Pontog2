// api/admin/reports.ts
import { createClient } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { enforceRoles } from './_utils';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
) {
  try {
    // Only owner, moderator, or support can view user reports
    enforceRoles(req, ['owner', 'moderator', 'support']);
    
    const supabaseAdmin = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data, error } = await supabaseAdmin
      .from('reports')
      .select(`
          *,
          reporter:reporter_id ( username ),
          reported:reported_id ( username )
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;
        
    res.status(200).json(data);

  } catch (error: any) {
    console.error(`Error in /api/admin/reports: ${error.message}`);
    if (error.message === 'Not authenticated' || error.message.includes('Forbidden') || error.name === 'JsonWebTokenError') {
       return res.status(401).json({ error: error.message || 'Authentication failed' });
    }
    res.status(500).json({ error: error.message || 'A server error occurred.' });
  }
}
