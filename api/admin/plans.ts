// api/admin/plans.ts
import { createClient } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { enforceRoles, recordAuditLog } from './_utils.js';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
) {
  try {
    const supabaseAdmin = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    
    switch (req.method) {
        case 'GET':
            // All admins can view plans
            enforceRoles(req, ['owner', 'moderator', 'support', 'financial']);
            const { data: get_data, error: get_error } = await supabaseAdmin
                .from('plans')
                .select('*')
                .order('price', { ascending: true });
            if (get_error) throw get_error;
            return res.status(200).json(get_data);

        case 'POST': {
            // Only OWNER can create plans
            const admin = enforceRoles(req, ['owner']);
            const { data: post_data, error: post_error } = await supabaseAdmin
                .from('plans')
                .insert([req.body])
                .select();
            if (post_error) throw post_error;
            
            await recordAuditLog(
              req, 
              admin, 
              'CREATE_PLAN', 
              post_data[0]?.id || 'unknown', 
              `Criou um novo plano de assinatura: ${req.body.name || req.body.id} com valor R$ ${req.body.price}`
            );
            return res.status(201).json(post_data[0]);
        }

        case 'PUT': {
            // Only OWNER can update plans
            const admin = enforceRoles(req, ['owner']);
            const { id: put_id } = req.query;
            const { data: put_data, error: put_error } = await supabaseAdmin
                .from('plans')
                .update(req.body)
                .eq('id', put_id as string)
                .select();
            if (put_error) throw put_error;
            
            await recordAuditLog(
              req, 
              admin, 
              'UPDATE_PLAN', 
              put_id as string, 
              `Atualizou as propriedades do plano de assinatura ID: ${put_id}. Novas infos: ${JSON.stringify(req.body)}`
            );
            return res.status(200).json(put_data[0]);
        }
        
        default:
            res.setHeader('Allow', ['GET', 'POST', 'PUT']);
            return res.status(405).end('Method Not Allowed');
    }

  } catch (error: any) {
    console.error(`Error in /api/admin/plans: ${error.message}`);
    if (error.message === 'Not authenticated' || error.message.includes('Forbidden') || error.name === 'JsonWebTokenError') {
       return res.status(401).json({ error: error.message || 'Authentication failed' });
    }
    res.status(error.code === '23505' ? 409 : 500).json({ error: error.message || 'Server error', details: error.details });
  }
}
