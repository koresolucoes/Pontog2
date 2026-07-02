// api/create-donation-preference.ts
import { createClient } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).end('Method Not Allowed');
  }

  try {
    const { amount, message } = req.body;
    if (typeof amount !== 'number' || amount < 1) {
      return res.status(400).json({ error: 'O valor da doação deve ser um número maior ou igual a 1.' });
    }

    const supabaseAdmin = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    ) as any;

    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'Autorização ausente.' });
    
    const token = authHeader.replace('Bearer ', '');
    const { data: { user } } = await supabaseAdmin.auth.getUser(token);
    if (!user) return res.status(401).json({ error: 'Usuário não autenticado.' });

    // 1. Criar um registro de doação pendente para obter um ID
    const { data: donationData, error: donationInsertError } = await supabaseAdmin
      .from('donations')
      .insert({
        user_id: user.id,
        amount: amount,
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

    // 2. Criar a preferência de pagamento com o ID da doação na referência
    const preference = {
      items: [{
          id: `DONATION-${donationId}`,
          title: 'Apoio ao Ponto G',
          description: 'Obrigado por apoiar o desenvolvimento do app!',
          quantity: 1,
          currency_id: 'BRL',
          unit_price: amount,
      }],
      payer: { email: user.email },
      back_urls: {
        success: `${process.env.NEXT_PUBLIC_SITE_URL || req.headers.origin}/?payment=success_donation`,
        failure: `${process.env.NEXT_PUBLIC_SITE_URL || req.headers.origin}/?payment=failure`,
        pending: `${process.env.NEXT_PUBLIC_SITE_URL || req.headers.origin}/?payment=pending`,
      },
      auto_return: 'approved',
      external_reference: `DONATION|${donationId}`,
      notification_url: `https://${req.headers.host}/api/mercadopago-webhook`,
    };
    
    const mpResponse = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.MERCADOPAGO_ACCESS_TOKEN!}`,
        'X-Idempotency-Key': `donation-${user.id}-${donationId}`
      },
      body: JSON.stringify(preference),
    });

    if (!mpResponse.ok) {
      const errorData = await mpResponse.json();
      console.error('Mercado Pago API Error:', errorData);
      throw new Error('Erro ao se comunicar com o Mercado Pago.');
    }

    const responseData = await mpResponse.json();
    return res.status(200).json({ init_point: responseData.init_point });

  } catch (error: any) {
    console.error('Error creating Mercado Pago donation preference:', error);
    return res.status(500).json({ error: error.message || 'Erro interno do servidor.' });
  }
}