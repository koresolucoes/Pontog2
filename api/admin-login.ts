// api/admin-login.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import jwt from 'jsonwebtoken';

export default function handler(
  req: VercelRequest,
  res: VercelResponse,
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).end('Method Not Allowed');
  }

  const { apiKey } = req.body;
  const adminApiKey = process.env.ADMIN_API_KEY;
  const jwtSecret = process.env.JWT_SECRET;

  if (!adminApiKey || !jwtSecret) {
    console.error('Admin API Key or JWT Secret not set in environment variables.');
    return res.status(500).json({ error: 'Configuration error.' });
  }

  if (apiKey === adminApiKey) {
    // A chave está correta, gerar um token JWT
    const token = jwt.sign(
        { role: 'admin' }, 
        jwtSecret, 
        { expiresIn: '8h' } // Token expira em 8 horas
    );
    return res.status(200).json({ token });
  } else {
    // Chave incorreta
    return res.status(401).json({ error: 'Chave de acesso inválida.' });
  }
}
