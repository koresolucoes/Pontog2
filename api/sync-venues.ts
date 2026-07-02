
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(
  req: VercelRequest,
  res: VercelResponse,
) {
  // Endpoint desativado para gestão manual de locais.
  return res.status(404).json({ message: 'Auto-sync disabled. Please add venues manually via Admin Panel.' });
}
