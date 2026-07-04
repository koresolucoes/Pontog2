// api/admin/audit-logs.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { enforceRoles, getAuditLogs } from './_utils.js';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).end('Method Not Allowed');
  }

  try {
    // Only 'owner' or 'financial' can view audit logs
    const admin = enforceRoles(req, ['owner', 'financial']);
    
    const logs = await getAuditLogs(req);
    return res.status(200).json(logs);

  } catch (error: any) {
    console.error(`Error in /api/admin/audit-logs: ${error.message}`);
    if (error.message === 'Not authenticated' || error.message.includes('Forbidden') || error.name === 'JsonWebTokenError') {
       return res.status(401).json({ error: error.message || 'Authentication failed' });
    }
    res.status(500).json({ error: error.message || 'Server error' });
  }
}
