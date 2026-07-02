
// api/admin/news.ts
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
    
    switch (req.method) {
        case 'GET':
            const { data: get_data, error: get_error } = await supabaseAdmin
                .from('news_articles')
                .select('*')
                .order('published_at', { ascending: false });
            if (get_error) throw get_error;
            return res.status(200).json(get_data);

        case 'POST':
            const { id: _id, created_at: _cat, ...newArticle } = req.body;
            const { data: post_data, error: post_error } = await supabaseAdmin
                .from('news_articles')
                .insert([newArticle])
                .select();
            if (post_error) throw post_error;
            return res.status(201).json(post_data[0]);

        case 'PUT':
            const { id: put_id } = req.query;
            const { id: _pid, created_at: _pcat, ...updates } = req.body;
            const { data: put_data, error: put_error } = await supabaseAdmin
                .from('news_articles')
                .update(updates)
                .eq('id', put_id as string)
                .select();
            if (put_error) throw put_error;
            return res.status(200).json(put_data[0]);
        
        case 'DELETE':
            const { id: del_id } = req.query;
            const { error: del_error } = await supabaseAdmin
                .from('news_articles')
                .delete()
                .eq('id', del_id as string);
            if (del_error) throw del_error;
            return res.status(200).json({ success: true });
        
        default:
            res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
            return res.status(405).end('Method Not Allowed');
    }

  } catch (error: any) {
    console.error(`Error in /api/admin/news: ${error.message}`);
    res.status(error.message === 'Not authenticated' ? 401 : 500).json({ 
        error: error.message || 'Server error',
        details: error.details || JSON.stringify(error) 
    });
  }
}
