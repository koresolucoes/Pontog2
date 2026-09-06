import type { VercelRequest, VercelResponse } from '@vercel/node';
import { dispatchAuthorizedConnectionNotification } from '../engines/notifications/connection.js';

function bearerToken(req: VercelRequest): string {
  const authorization = req.headers.authorization;
  if (!authorization || !authorization.startsWith('Bearer ')) return '';
  return authorization.slice('Bearer '.length).trim();
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).end('Method Not Allowed');
  }

  // Compatibility adapter only. It intentionally ignores client-provided title/body.
  // The Notification Engine derives actor, recipient, event kind and notification copy
  // from a persisted user_connections row and enforces blocks, active status,
  // preferences and idempotency before delivery.
  const accessToken = bearerToken(req);
  const hintedRecipientId = typeof req.body?.receiver_id === 'string' ? req.body.receiver_id : '';

  try {
    const result = await dispatchAuthorizedConnectionNotification({
      accessToken,
      hintedRecipientId,
    });
    return res.status(200).json(result);
  } catch (error: any) {
    const message = error?.message || 'Connection notification could not be delivered.';

    if (message.includes('Authentication required') || message.includes('Invalid or expired access token')) {
      return res.status(401).json({ error: 'Authentication required.' });
    }
    if (message.includes('blocked') || message.includes('must be active')) {
      return res.status(403).json({ error: 'Connection notification is not authorized.' });
    }

    console.warn('Rejected connection notification compatibility request:', message);
    return res.status(400).json({ error: 'No authorized connection event matches this request.' });
  }
}
