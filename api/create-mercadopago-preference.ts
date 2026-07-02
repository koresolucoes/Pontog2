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
    const { planId } = req.body;
    if (!planId) {
      return res.status(400).json({ error: 'ID do plano é obrigatório.' });
    }

    const supabaseAdmin = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    ) as any;
    
    // Busca o plano do banco de dados para garantir que os dados estão corretos
    const { data: planData, error: planError } = await supabaseAdmin
      .from('plans')
      .select('name, price, months_duration')
      .eq('plan_id', planId)
      .eq('is_active', true)
      .single();

    if (planError || !planData) {
      return res.status(404).json({ error: 'Plano não encontrado ou inativo.' });
    }

    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'Autorização ausente.' });
    
    const token = authHeader.replace('Bearer ', '');
    const { data: { user } } = await supabaseAdmin.auth.getUser(token);
    if (!user) return res.status(401).json({ error: 'Usuário não autenticado.' });

    const preference = {
      items: [{
          id: planId,
          title: planData.name,
          description: `Acesso ao Ponto G Plus por ${planData.months_duration} ${planData.months_duration > 1 ? 'meses' : 'mês'}.`,
          quantity: 1,
          currency_id: 'BRL',
          unit_price: planData.price,
      }],
      payer: { email: user.email },
      back_urls: {
        success: `${process.env.NEXT_PUBLIC_SITE_URL || req.headers.origin}/?payment=success`,
        failure: `${process.env.NEXT_PUBLIC_SITE_URL || req.headers.origin}/?payment=failure`,
        pending: `${process.env.NEXT_PUBLIC_SITE_URL || req.headers.origin}/?payment=pending`,
      },
      auto_return: 'approved',
      external_reference: `${user.id}|${planId}`,
      notification_url: `https://${req.headers.host}/api/mercadopago-webhook`,
    };
    
    const mpResponse = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.MERCADOPAGO_ACCESS_TOKEN!}`,
        'X-Idempotency-Key': `${user.id}-${planId}-${Date.now()}`
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
    console.error('Error creating Mercado Pago preference:', error);
    return res.status(500).json({ error: error.message || 'Erro interno do servidor.' });
  }
}