import { createClient } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { enforceRoles, recordAuditLog } from './_utils.js';

const REPORT_STATUSES = new Set(['open', 'reviewing', 'resolved', 'dismissed']);

function adminClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase server credentials are not configured.');
  return createClient(url, key);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const admin = enforceRoles(req, ['owner', 'moderator', 'support']);
    const supabaseAdmin = adminClient();

    if (req.method === 'GET') {
      const { data, error } = await supabaseAdmin
        .from('reports')
        .select(`
          id,
          reporter_id,
          reported_id,
          reason,
          comments,
          status,
          reviewed_at,
          reviewed_by,
          resolution_notes,
          created_at,
          updated_at,
          reporter:reporter_id ( username ),
          reported:reported_id ( username )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return res.status(200).json(data || []);
    }

    if (req.method === 'PATCH') {
      const reportId = Number(req.body?.reportId);
      const status = typeof req.body?.status === 'string' ? req.body.status : '';
      const resolutionNotes = typeof req.body?.resolutionNotes === 'string'
        ? req.body.resolutionNotes.trim().slice(0, 4000)
        : null;

      if (!Number.isSafeInteger(reportId) || reportId <= 0 || !REPORT_STATUSES.has(status) || status === 'open') {
        return res.status(400).json({ error: 'reportId e status de triagem válidos são obrigatórios.' });
      }

      if (admin.role === 'support' && status !== 'reviewing') {
        return res.status(403).json({ error: 'Suporte pode encaminhar denúncias para análise, mas não encerrá-las.' });
      }

      const { data: existing, error: findError } = await supabaseAdmin
        .from('reports')
        .select('id, reported_id, reason, status')
        .eq('id', reportId)
        .maybeSingle();
      if (findError) throw findError;
      if (!existing) return res.status(404).json({ error: 'Denúncia não encontrada.' });

      const now = new Date().toISOString();
      const updatePayload = {
        status,
        reviewed_at: now,
        reviewed_by: admin.email,
        resolution_notes: status === 'reviewing' ? null : resolutionNotes,
        updated_at: now,
      };

      const { data, error } = await supabaseAdmin
        .from('reports')
        .update(updatePayload)
        .eq('id', reportId)
        .select(`
          id,
          reporter_id,
          reported_id,
          reason,
          comments,
          status,
          reviewed_at,
          reviewed_by,
          resolution_notes,
          created_at,
          updated_at,
          reporter:reporter_id ( username ),
          reported:reported_id ( username )
        `)
        .single();
      if (error) throw error;

      await recordAuditLog(
        req,
        admin,
        `REPORT_${status.toUpperCase()}`,
        String(existing.reported_id),
        `Denúncia #${reportId} (${existing.reason}) movida de ${existing.status} para ${status}.${resolutionNotes ? ` Nota: ${resolutionNotes}` : ''}`,
      );

      return res.status(200).json(data);
    }

    res.setHeader('Allow', 'GET, PATCH');
    return res.status(405).end('Method Not Allowed');
  } catch (error: any) {
    const message = error?.message || 'A server error occurred.';
    console.error(`Error in /api/admin/reports: ${message}`);

    if (message === 'Not authenticated' || message === 'Invalid or expired token') {
      return res.status(401).json({ error: 'Authentication failed' });
    }
    if (message.includes('Forbidden')) {
      return res.status(403).json({ error: message });
    }
    return res.status(500).json({ error: 'Não foi possível processar as denúncias.' });
  }
}
