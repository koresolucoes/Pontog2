// api/admin/news.ts
import { createClient } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { enforceRoles, recordAuditLog } from './_utils';

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
            // All admins can view news
            enforceRoles(req, ['owner', 'moderator', 'support', 'financial']);
            const { data: get_data, error: get_error } = await supabaseAdmin
                .from('news_articles')
                .select('*')
                .order('published_at', { ascending: false });
            if (get_error) throw get_error;
            return res.status(200).json(get_data);

        case 'POST': {
            // Only Owner and Moderator can create news
            const admin = enforceRoles(req, ['owner', 'moderator']);
            const { id: _id, created_at: _cat, ...newArticle } = req.body;
            const { data: post_data, error: post_error } = await supabaseAdmin
                .from('news_articles')
                .insert([newArticle])
                .select();
            if (post_error) throw post_error;
            
            await recordAuditLog(
              req, 
              admin, 
              'CREATE_ARTICLE', 
              post_data[0]?.id || 'unknown', 
              `Publicou novo artigo de notícias/blog: "${newArticle.title}"`
            );
            return res.status(201).json(post_data[0]);
        }

        case 'PUT': {
            // Only Owner and Moderator can edit news
            const admin = enforceRoles(req, ['owner', 'moderator']);
            const { id: put_id } = req.query;
            const { id: _pid, created_at: _pcat, ...updates } = req.body;
            const { data: put_data, error: put_error } = await supabaseAdmin
                .from('news_articles')
                .update(updates)
                .eq('id', put_id as string)
                .select();
            if (put_error) throw put_error;
            
            await recordAuditLog(
              req, 
              admin, 
              'UPDATE_ARTICLE', 
              put_id as string, 
              `Editou o artigo de notícias ID: ${put_id}. Novo título: "${updates.title}"`
            );
            return res.status(200).json(put_data[0]);
        }
        
        case 'DELETE': {
            // Only Owner and Moderator can delete news
            const admin = enforceRoles(req, ['owner', 'moderator']);
            const { id: del_id } = req.query;
            
            // Get title for logging
            const { data: article } = await supabaseAdmin
              .from('news_articles')
              .select('title')
              .eq('id', del_id as string)
              .single();

            const { error: del_error } = await supabaseAdmin
                .from('news_articles')
                .delete()
                .eq('id', del_id as string);
            if (del_error) throw del_error;
            
            await recordAuditLog(
              req, 
              admin, 
              'DELETE_ARTICLE', 
              del_id as string, 
              `Excluiu o artigo de notícias: "${article?.title || del_id}"`
            );
            return res.status(200).json({ success: true });
        }
        
        default:
            res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
            return res.status(405).end('Method Not Allowed');
    }

  } catch (error: any) {
    console.error(`Error in /api/admin/news: ${error.message}`);
    if (error.message === 'Not authenticated' || error.message.includes('Forbidden') || error.name === 'JsonWebTokenError') {
       return res.status(401).json({ error: error.message || 'Authentication failed' });
    }
    res.status(500).json({ 
        error: error.message || 'Server error',
        details: error.details || JSON.stringify(error) 
    });
  }
}
