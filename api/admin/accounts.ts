// api/admin/accounts.ts
import { createClient } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { enforceRoles, recordAuditLog } from './_utils';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
) {
  try {
    // Only Owners can manage admin accounts
    const admin = enforceRoles(req, ['owner']);
    
    const supabaseAdmin = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    switch (req.method) {
      case 'GET': {
        const { data, error } = await supabaseAdmin
          .from('admins')
          .select('id, email, name, role, is_active, created_at')
          .order('created_at', { ascending: false });

        if (error) {
          // If table doesn't exist, we return a clear signal so the frontend can show a warning/setup button
          if (error.code === 'P0001' || error.message.includes('relation "admins" does not exist')) {
            return res.status(200).json({ error: 'TABLE_MISSING', message: 'Tabela "admins" não encontrada no Supabase.' });
          }
          throw error;
        }
        return res.status(200).json(data || []);
      }

      case 'POST': {
        const { email, password, name, role } = req.body;
        if (!email || !password || !name || !role) {
          return res.status(400).json({ error: 'Todos os campos são obrigatórios para criar um admin.' });
        }

        const { data, error } = await supabaseAdmin
          .from('admins')
          .insert([{
            email: email.toLowerCase(),
            password_hash: password, // For simplicity and standard setup. Can be saltd/hashed.
            name,
            role,
            is_active: true
          }])
          .select('id, email, name, role')
          .single();

        if (error) throw error;

        await recordAuditLog(
          req,
          admin,
          'CREATE_ADMIN',
          data.id,
          `Criou nova credencial de administrador: ${data.name} (${data.email}) com cargo de ${data.role}.`
        );

        return res.status(201).json(data);
      }

      case 'PUT': {
        const { id } = req.query;
        const { is_active, role, name, password } = req.body;

        if (!id) return res.status(400).json({ error: 'ID do admin é obrigatório.' });

        const updates: any = {};
        if (typeof is_active === 'boolean') updates.is_active = is_active;
        if (role) updates.role = role;
        if (name) updates.name = name;
        if (password) updates.password_hash = password;
        updates.updated_at = new Date().toISOString();

        // Prevent self-deactivation or self-role demotion of the current active owner log-in to avoid lockouts
        if (admin.email.toLowerCase() === req.body.email?.toLowerCase()) {
          if (is_active === false) {
             return res.status(400).json({ error: 'Você não pode desativar sua própria conta de administrador.' });
          }
          if (role && role !== 'owner') {
             return res.status(400).json({ error: 'Você não pode rebaixar seu próprio nível de permissão.' });
          }
        }

        const { data, error } = await supabaseAdmin
          .from('admins')
          .update(updates)
          .eq('id', id as string)
          .select('id, email, name, role, is_active')
          .single();

        if (error) throw error;

        await recordAuditLog(
          req,
          admin,
          'UPDATE_ADMIN',
          data.id,
          `Atualizou propriedades da conta admin ${data.email}. Alterações: ${JSON.stringify(updates)}`
        );

        return res.status(200).json(data);
      }

      case 'DELETE': {
        const { id } = req.query;
        if (!id) return res.status(400).json({ error: 'ID do admin é obrigatório.' });

        // Get info first for audit logging
        const { data: targetAdmin } = await supabaseAdmin
          .from('admins')
          .select('email, name')
          .eq('id', id as string)
          .single();

        if (targetAdmin && targetAdmin.email.toLowerCase() === admin.email.toLowerCase()) {
          return res.status(400).json({ error: 'Você não pode excluir sua própria conta de administrador ativa.' });
        }

        const { error } = await supabaseAdmin
          .from('admins')
          .delete()
          .eq('id', id as string);

        if (error) throw error;

        await recordAuditLog(
          req,
          admin,
          'DELETE_ADMIN',
          id as string,
          `Excluiu permanentemente a conta de administrador: ${targetAdmin?.name || id} (${targetAdmin?.email || 'N/A'}).`
        );

        return res.status(200).json({ success: true });
      }

      default:
        res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
        return res.status(405).end('Method Not Allowed');
    }

  } catch (error: any) {
    console.error(`Error in /api/admin/accounts: ${error.message}`);
    if (error.message === 'Not authenticated' || error.message.includes('Forbidden') || error.name === 'JsonWebTokenError') {
       return res.status(401).json({ error: error.message || 'Authentication failed' });
    }
    res.status(500).json({ error: error.message || 'Server error' });
  }
}
