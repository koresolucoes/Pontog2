// api/admin/reports.ts
import { createClient } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import jwt from 'jsonwebtoken';

const verifyAdmin = (req: VercelRequest) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) throw new Error('Not authenticated');
    jwt.verify(token, process.env.JWT_SECRET!);
};

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
) {
  try {
    verifyAdmin(req);
    
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
    res.status(401).json({ error: error.message || 'Authentication failed' });
  }
}
