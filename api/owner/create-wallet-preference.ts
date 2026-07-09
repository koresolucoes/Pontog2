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
    const { amount, walletId } = req.body;
    if (!amount || amount < 10) {
      return res.status(400).json({ error: 'O valor mínimo é R$ 10,00.' });
    }
    if (!walletId) {
      return res.status(400).json({ error: 'ID da carteira é obrigatório.' });
    }

    const supabaseAdmin = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    );
    
    // Validate wallet
    const { data: walletData, error: walletError } = await supabaseAdmin
      .from('b2b_wallets')
      .select('id, venue_id')
      .eq('id', walletId)
      .single();

    if (walletError || !walletData) {
      return res.status(404).json({ error: 'Carteira não encontrada.' });
    }

    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'Autorização ausente.' });
    
    const token = authHeader.replace('Bearer ', '');
    const { data: { user } } = await supabaseAdmin.auth.getUser(token);
    if (!user) return res.status(401).json({ error: 'Usuário não autenticado.' });

    // The logic to add the balance on payment success is usually handled by the webhook.
    // For wallet top-up, we use a different external_reference format.
    const externalReference = `wallet_topup|${walletId}|${user.id}|${amount}`;

    const preference = {
      items: [{
          id: 'WALLET_TOPUP',
          title: `Recarga de Saldo B2B - R$ ${amount.toFixed(2)}`,
          description: `Recarga de créditos para a carteira de anúncios Ponto G.`,
          quantity: 1,
          currency_id: 'BRL',
          unit_price: Number(amount),
      }],
      payer: { email: user.email },
      back_urls: {
        success: `${process.env.NEXT_PUBLIC_SITE_URL || req.headers.origin}/owner?payment=success`,
        failure: `${process.env.NEXT_PUBLIC_SITE_URL || req.headers.origin}/owner?payment=failure`,
        pending: `${process.env.NEXT_PUBLIC_SITE_URL || req.headers.origin}/owner?payment=pending`,
      },
      auto_return: 'approved',
      external_reference: externalReference,
      notification_url: `https://${req.headers.host}/api/mercadopago-webhook`,
    };
    
    const mpResponse = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.MERCADOPAGO_ACCESS_TOKEN!}`,
        'X-Idempotency-Key': `wallet-${walletId}-${Date.now()}`
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
    console.error('Error creating Mercado Pago preference for wallet:', error);
    return res.status(500).json({ error: error.message || 'Erro interno do servidor.' });
  }
}
