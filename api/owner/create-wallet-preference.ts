import crypto from 'crypto';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  assertWalletOwnership,
  authenticatePaymentUser,
  buildPaymentUrls,
  createMercadoPagoPreference,
  createPaymentAdminClient,
  getPaymentRuntimeConfig,
} from '../../engines/payments/server';

const requestIdempotencyKey = (req: VercelRequest): string | null => {
  const raw = req.headers['idempotency-key'];
  const value = Array.isArray(raw) ? raw[0] : raw;
  return value && /^[A-Za-z0-9._:-]{8,128}$/.test(value) ? value : null;
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).end('Method Not Allowed');
  }

  try {
    const amount = Number(req.body?.amount);
    const walletId = typeof req.body?.walletId === 'string' ? req.body.walletId.trim() : '';

    if (!Number.isFinite(amount) || amount < 10) {
      return res.status(400).json({ error: 'O valor mínimo é R$ 10,00.' });
    }
    if (!walletId) return res.status(400).json({ error: 'ID da carteira é obrigatório.' });

    const config = getPaymentRuntimeConfig();
    const supabaseAdmin = createPaymentAdminClient(config);
    const user = await authenticatePaymentUser(req.headers.authorization, supabaseAdmin);
    const wallet = await assertWalletOwnership(supabaseAdmin, user.id, walletId);

    if (String(wallet.currency || 'BRL').toUpperCase() !== 'BRL') {
      return res.status(400).json({ error: 'Moeda da carteira não suportada.' });
    }

    const roundedAmount = Math.round(amount * 100) / 100;
    const externalReference = `wallet_topup|${wallet.id}|${user.id}|${roundedAmount.toFixed(2)}`;
    const urls = buildPaymentUrls(config, 'success', '/owner');

    const preference = {
      items: [{
        id: 'WALLET_TOPUP',
        title: `Recarga de Saldo B2B - R$ ${roundedAmount.toFixed(2)}`,
        description: 'Recarga de créditos para a carteira de anúncios Ponto G.',
        quantity: 1,
        currency_id: 'BRL',
        unit_price: roundedAmount,
      }],
      payer: { email: user.email },
      back_urls: {
        success: urls.success,
        failure: urls.failure,
        pending: urls.pending,
      },
      auto_return: 'approved',
      external_reference: externalReference,
      notification_url: urls.notification,
    };

    const idempotencyKey = requestIdempotencyKey(req)
      || `wallet-${wallet.id}-${user.id}-${crypto.randomUUID()}`;
    const response = await createMercadoPagoPreference(config, preference, idempotencyKey);

    return res.status(200).json({ init_point: response.init_point });
  } catch (error: any) {
    const message = error?.message || 'Erro interno do servidor.';
    if (/authentication required/i.test(message)) return res.status(401).json({ error: 'Usuário não autenticado.' });
    if (/wallet not found/i.test(message)) return res.status(404).json({ error: 'Carteira não encontrada.' });
    if (/does not belong/i.test(message)) return res.status(403).json({ error: 'Você não possui permissão para recarregar esta carteira.' });
    console.error('Error creating Mercado Pago preference for wallet:', error);
    return res.status(500).json({ error: message });
  }
}
