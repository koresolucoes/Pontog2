// api/send-push.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { dispatchAuthorizedUserNotification } from '../engines/notifications/server';

function getBearerToken(req: VercelRequest): string | null {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return null;
  return header.slice('Bearer '.length).trim() || null;
}

function statusForError(message: string): number {
  if (/authentication|access token/i.test(message)) return 401;
  if (/blocked|authorized|recipient|conversation|sender|event/i.test(message)) return 403;
  return 400;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).end('Method Not Allowed');
  }

  const accessToken = getBearerToken(req);
  if (!accessToken) {
    return res.status(401).json({ error: 'Authorization header missing or invalid.' });
  }

  try {
    const result = await dispatchAuthorizedUserNotification({
      accessToken,
      eventType: 'message',
      messageId: req.body?.message_id,
      // Compatibility bridge for the current ChatWindow. The server does not
      // trust message_content and resolves the real persisted message itself.
      hintedRecipientId: req.body?.receiver_id,
    });

    return res.status(200).json(result);
  } catch (error: any) {
    const message = error?.message || 'Notification delivery failed.';
    console.error('Message notification rejected:', error);
    return res.status(statusForError(message)).json({ error: message });
  }
}
