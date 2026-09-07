import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  authenticateServerUser,
  createServerAuthorizationClient,
} from '../engines/authorization/server';
import {
  createAgoraFeedQueries,
  createSupabaseAgoraFeedRepository,
} from '../modules/social/public';

const parsePositiveInteger = (value: unknown, fallback: number): number => {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).end('Method Not Allowed');
  }

  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');

  try {
    const client = createServerAuthorizationClient();

    let actor;
    try {
      actor = await authenticateServerUser(req.headers.authorization, client);
    } catch {
      return res.status(401).json({ error: 'Authentication required.' });
    }

    const page = parsePositiveInteger(req.query.page, 1);
    const limit = Math.min(50, parsePositiveInteger(req.query.limit, 10));

    const feed = createAgoraFeedQueries(createSupabaseAgoraFeedRepository(client));
    const result = await feed.getPage(actor.id, page, limit);

    return res.status(200).json({
      data: result.items,
      hasMore: result.hasMore,
    });
  } catch (error: any) {
    if (error?.message === 'Active profile required.') {
      return res.status(403).json({ error: 'Active profile required.' });
    }

    console.error('Unhandled server error in /api/agora-posts:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
