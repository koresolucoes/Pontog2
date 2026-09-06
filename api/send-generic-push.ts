// api/send-generic-push.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).end('Method Not Allowed');
  }

  // This endpoint previously accepted arbitrary receiver/title/body values from
  // authenticated clients. That trust boundary is intentionally retired.
  // Product notifications must now originate from persisted, authorized events
  // and pass through the Notification Engine adapters.
  return res.status(410).json({
    error: 'Generic push delivery has been retired. Use an authorized event-specific notification flow.',
  });
}
