import crypto from 'crypto';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  authenticatePaymentUser,
  buildPaymentUrls,
  createMercadoPagoPreference,
  createPaymentAdminClient,
  getPaymentRuntimeConfig,
} from '../engines/payments/server.js';

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
    const planId = typeof req.body?.planId === 'string' ? req.body.planId.trim() : '';
    if (!planId) return res.status(400).json({ error: 'ID do plano é obrigatório.' });

    const config = getPaymentRuntimeConfig();
    const supabaseAdmin = createPaymentAdminClient(config);
    const user = await authenticatePaymentUser(req.headers.authorization, supabaseAdmin);

    const { data: planData, error: planError } = await supabaseAdmin
      .from('plans')
      .select('name, price, months_duration')
      .eq('plan_id', planId)
      .eq('is_active', true)
      .single();

    if (planError || !planData) {
      return res.status(404).json({ error: 'Plano não encontrado ou inativo.' });
    }

    const urls = buildPaymentUrls(config, 'success');
    const preference = {
      items: [{
        id: planId,
        title: planData.name,
        description: `Acesso ao Ponto G Plus por ${planData.months_duration} ${planData.months_duration > 1 ? 'meses' : 'mês'}.`,
        quantity: 1,
        currency_id: 'BRL',
        unit_price: Number(planData.price),
      }],
      payer: { email: user.email },
      back_urls: {
        success: urls.success,
        failure: urls.failure,
        pending: urls.pending,
      },
      auto_return: 'approved',
      external_reference: `${user.id}|${planId}`,
      notification_url: urls.notification,
    };

    const idempotencyKey = requestIdempotencyKey(req)
      || `subscription-${user.id}-${planId}-${crypto.randomUUID()}`;
    const response = await createMercadoPagoPreference(config, preference, idempotencyKey);

    return res.status(200).json({ init_point: response.init_point });
  } catch (error: any) {
    const message = error?.message || 'Erro interno do servidor.';
    if (/authentication required/i.test(message)) return res.status(401).json({ error: 'Usuário não autenticado.' });
    console.error('Error creating Mercado Pago preference:', error);
    return res.status(500).json({ error: message });
  }
}
