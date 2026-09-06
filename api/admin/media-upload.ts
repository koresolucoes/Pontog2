import type { VercelRequest, VercelResponse } from '@vercel/node';
import { enforceRoles } from './_utils.js';
import {
  createSignedAdminImageUpload,
  type AdminImageKind,
} from '../../engines/media/server.js';
import { AppError } from '../../core/index.js';

const ALLOWED_KINDS = new Set<AdminImageKind>(['news', 'venue']);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).end('Method Not Allowed');
  }

  try {
    enforceRoles(req, ['owner', 'moderator']);
  } catch (error: any) {
    const message = String(error?.message || 'Not authenticated');
    const status = message.startsWith('Forbidden') ? 403 : 401;
    return res.status(status).json({ error: status === 403 ? 'Forbidden.' : 'Unauthorized.' });
  }

  const kind = req.body?.kind as AdminImageKind | undefined;
  const mimeType = typeof req.body?.mimeType === 'string' ? req.body.mimeType : '';

  if (!kind || !ALLOWED_KINDS.has(kind) || !mimeType) {
    return res.status(400).json({ error: 'Invalid media upload request.' });
  }

  try {
    const upload = await createSignedAdminImageUpload(kind, mimeType);
    return res.status(200).json(upload);
  } catch (error) {
    if (error instanceof AppError) {
      return res.status(error.status).json({
        error: error.expose ? error.message : 'Could not prepare media upload.',
        code: error.code,
      });
    }

    console.error('Admin signed media upload error:', error);
    return res.status(500).json({ error: 'Could not prepare media upload.' });
  }
}
