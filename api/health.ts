import type { VercelRequest, VercelResponse } from '@vercel/node';
import { observeHttp } from '../engines/observability/server';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return res.status(405).json({ ok: false, error: 'method_not_allowed' });
  }

  return observeHttp(req, res, 'health', async () => {
    const body = {
      ok: true,
      service: 'ponto-g',
      environment: process.env.VERCEL_ENV || 'unknown',
      revision: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 12) || 'unknown',
      region: process.env.VERCEL_REGION || 'unknown',
      timestamp: new Date().toISOString(),
    };

    res.setHeader('cache-control', 'no-store');
    if (req.method === 'HEAD') return res.status(200).end();
    return res.status(200).json(body);
  });
}
