// api/admin/settings.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { enforceRoles, getSystemSettings, updateSystemSetting, recordAuditLog } from './_utils';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
) {
  try {
    if (req.method === 'GET') {
      // Any authenticated admin can read settings
      enforceRoles(req, ['owner', 'moderator', 'support', 'financial']);
      const settings = await getSystemSettings();
      return res.status(200).json(settings);
    } 
    
    if (req.method === 'PUT') {
      // Only owner can update settings
      const admin = enforceRoles(req, ['owner']);
      const { settings } = req.body;
      
      if (!settings || typeof settings !== 'object') {
        return res.status(400).json({ error: 'Configurações inválidas.' });
      }

      for (const [key, val] of Object.entries(settings)) {
        await updateSystemSetting(key, val, admin.email);
      }

      await recordAuditLog(
        req, 
        admin, 
        'UPDATE_SETTINGS', 
        'system', 
        `Configurações do sistema atualizadas: ${JSON.stringify(settings)}`
      );

      return res.status(200).json({ success: true, message: 'Configurações atualizadas.' });
    }

    res.setHeader('Allow', ['GET', 'PUT']);
    return res.status(405).end('Method Not Allowed');

  } catch (error: any) {
    console.error(`Error in /api/admin/settings: ${error.message}`);
    if (error.message === 'Not authenticated' || error.message.includes('Forbidden')) {
       return res.status(401).json({ error: error.message || 'Authentication failed' });
    }
    res.status(500).json({ error: error.message || 'Server error' });
  }
}
