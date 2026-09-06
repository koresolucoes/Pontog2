import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  authenticatePaymentUser,
  buildPaymentUrls,
  createMercadoPagoPreference,
  createPaymentAdminClient,
  getPaymentRuntimeConfig,
} from '../engines/payments/server';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).end('Method Not Allowed');
  }

  try {
    const amount = Number(req.body?.amount);
    const message = typeof req.body?.message === 'string'
      ? req.body.message.trim().slice(0, 500)
      : '';

    if (!Number.isFinite(amount) || amount < 1) {
      return res.status(400).json({ error: 'O valor da doação deve ser maior ou igual a R$ 1,00.' });
    }

    const roundedAmount = Math.round(amount * 100) / 100;
    const config = getPaymentRuntimeConfig();
    const supabaseAdmin = createPaymentAdminClient(config);
    const user = await authenticatePaymentUser(req.headers.authorization, supabaseAdmin);

    const { data: donationData, error: donationInsertError } = await supabaseAdmin
      .from('donations')
      .insert({
        user_id: user.id,
        amount: roundedAmount,
        message: message || null,
        status: 'pending',
      })
      .select('id')
      .single();

    if (donationInsertError || !donationData) {
      console.error('Error creating pending donation record:', donationInsertError);
      throw new Error('Não foi possível registrar a doação no banco de dados.');
    }

    const donationId = donationData.id;
    const urls = buildPaymentUrls(config, 'success_donation');
    const preference = {
      items: [{
        id: `DONATION-${donationId}`,
        title: 'Apoio ao Ponto G',
        description: 'Obrigado por apoiar o desenvolvimento do app!',
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
      external_reference: `DONATION|${donationId}`,
      notification_url: urls.notification,
    };

    const response = await createMercadoPagoPreference(
      config,
      preference,
      `donation-${user.id}-${donationId}`,
    );

    return res.status(200).json({ init_point: response.init_point });
  } catch (error: any) {
    const message = error?.message || 'Erro interno do servidor.';
    if (/authentication required/i.test(message)) {
      return res.status(401).json({ error: 'Usuário não autenticado.' });
    }
    console.error('Error creating Mercado Pago donation preference:', error);
    return res.status(500).json({ error: message });
  }
}
