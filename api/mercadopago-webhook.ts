import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  createPaymentAdminClient,
  fetchMercadoPagoPayment,
  getPaymentRuntimeConfig,
  settleMercadoPagoPayment,
  verifyMercadoPagoSignature,
} from '../engines/payments/server';

const firstQueryValue = (value: string | string[] | undefined): string | undefined =>
  Array.isArray(value) ? value[0] : value;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).end('Method Not Allowed');
  }

  try {
    const config = getPaymentRuntimeConfig();
    const action = req.body?.action;
    const type = req.body?.type;
    const bodyPaymentId = req.body?.data?.id;
    const queryPaymentId = firstQueryValue(req.query?.['data.id'] as string | string[] | undefined);
    const signedPaymentId = queryPaymentId || (bodyPaymentId != null ? String(bodyPaymentId) : undefined);

    if (type && type !== 'payment') {
      return res.status(200).json({ success: true, status: 'ignored', reason: 'event_type' });
    }

    if (action !== 'payment.updated' && action !== 'payment.created') {
      return res.status(200).json({ success: true, status: 'ignored', reason: 'event_action' });
    }

    if (!signedPaymentId || bodyPaymentId == null) {
      return res.status(400).json({ error: 'Payment ID is required.' });
    }

    const validSignature = verifyMercadoPagoSignature({
      signatureHeader: req.headers['x-signature'],
      requestIdHeader: req.headers['x-request-id'],
      dataId: signedPaymentId,
      bodyDataId: bodyPaymentId,
      secret: config.mercadoPagoWebhookSecret,
    });

    if (!validSignature) {
      return res.status(401).json({ error: 'Invalid Mercado Pago webhook signature.' });
    }

    const payment = await fetchMercadoPagoPayment(config, String(bodyPaymentId));
    if (String(payment.id) !== String(bodyPaymentId)) {
      throw new Error('Provider payment ID mismatch.');
    }

    if (payment.status !== 'approved') {
      return res.status(200).json({
        success: true,
        status: 'ignored',
        reason: `payment_${payment.status || 'unknown'}`,
      });
    }

    const supabaseAdmin = createPaymentAdminClient(config);
    const settlement = await settleMercadoPagoPayment(supabaseAdmin, payment);

    return res.status(200).json({ success: true, settlement });
  } catch (error: any) {
    console.error('Mercado Pago webhook settlement failed:', error);
    return res.status(500).json({ error: error?.message || 'Internal Server Error' });
  }
}
