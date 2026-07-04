// api/admin/mfa/setup.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { verifyAdminAndGetRole } from '../_utils.js';
import { generateBase32Secret } from '../_totp.js';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).end('Method Not Allowed');
  }

  try {
    // Ensure the administrator is authenticated
    const admin = verifyAdminAndGetRole(req);

    const secret = generateBase32Secret(16);
    const issuer = 'Ponto G';
    const label = `${issuer}:${admin.email}`;
    const otpauthUri = `otpauth://totp/${encodeURIComponent(label)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}`;

    return res.status(200).json({
      secret,
      otpauthUri
    });

  } catch (error: any) {
    console.error(`Error in /api/admin/mfa/setup: ${error.message}`);
    if (error.message === 'Not authenticated' || error.message.includes('expired') || error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Sessão administrativa expirada ou inválida.' });
    }
    return res.status(500).json({ error: error.message || 'Erro interno no servidor.' });
  }
}
