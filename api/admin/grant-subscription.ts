// api/admin/grant-subscription.ts
import { createClient } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import jwt from 'jsonwebtoken';
import { add } from 'date-fns';

const verifyAdmin = (req: VercelRequest) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) throw new Error('Not authenticated');
    jwt.verify(token, process.env.JWT_SECRET!);
};

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).end('Method Not Allowed');
  }

  try {
    verifyAdmin(req);
    
    const { userId, planId } = req.body;
    if (!userId || !planId) {
      return res.status(400).json({ error: 'userId e planId são obrigatórios.' });
    }

    const supabaseAdmin = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // 1. Obter detalhes do plano
    const { data: plan, error: planError } = await supabaseAdmin
      .from('plans')
      .select('months_duration, price')
      .eq('plan_id', planId)
      .single();
    
    if (planError || !plan) {
      return res.status(404).json({ error: 'Plano não encontrado.' });
    }
    
    // 2. Calcular a data de expiração
    const expiresAt = add(new Date(), { months: plan.months_duration }).toISOString();

    // 3. Atualizar o perfil do usuário
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({
        subscription_tier: 'plus',
        subscription_expires_at: expiresAt,
      })
      .eq('id', userId);

    if (profileError) throw profileError;

    // 4. (Opcional, mas recomendado) Criar um registro de pagamento para auditoria
    const { error: paymentError } = await supabaseAdmin
      .from('payments')
      .insert({
        mercadopago_id: `manual_${Date.now()}`,
        user_id: userId,
        plan_id: planId,
        amount: 0.00, // Preço zero pois foi concedido
        status: 'manual_grant',
      });

    if (paymentError) {
      console.error("Failed to log manual grant, but subscription was given:", paymentError);
    }
        
    res.status(200).json({ success: true, message: 'Assinatura concedida com sucesso.' });

  } catch (error: any) {
    console.error(`Error in /api/admin/grant-subscription: ${error.message}`);
    res.status(500).json({ error: error.message || 'Erro no servidor' });
  }
}
