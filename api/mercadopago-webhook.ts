// api/mercadopago-webhook.ts
import { createClient } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { add } from 'date-fns';
import crypto from 'crypto'; // Módulo nativo do Node.js para criptografia
// FIX: Import Buffer to resolve TypeScript error 'Cannot find name Buffer'.
import { Buffer } from 'buffer';

const plans: { [key: string]: { price: number, months: number } } = {
  monthly: { price: 29.90, months: 1 },
  quarterly: { price: 79.90, months: 3 },
  yearly: { price: 239.90, months: 12 },
};

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
) {
  if (req.method !== 'POST') {
    return res.status(405).end('Method Not Allowed');
  }

  try {
    // --- VERIFICAÇÃO DE ASSINATURA ---
    const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET;
    if (!secret) {
      console.error('Mercado Pago webhook secret is not configured.');
      return res.status(500).json({ error: 'Webhook secret not configured.' });
    }

    const signatureHeader = req.headers['x-signature'] as string;
    const requestIdHeader = req.headers['x-request-id'] as string;

    if (!signatureHeader || !requestIdHeader) {
      return res.status(401).send('Signature headers are missing.');
    }

    // Fix: Correctly parse the signature header by destructuring the resulting object.
    // The original code was incorrectly trying to destructure an object as an array.
    const { ts, v1: hash } = signatureHeader.split(',').reduce((acc, part) => {
      const [key, value] = part.split('=');
      acc[key.trim()] = value.trim();
      return acc;
    }, {} as { [key:string]: string });

    if (!ts || !hash) {
      return res.status(401).send('Invalid signature format.');
    }
    
    // Recria a string que o Mercado Pago assinou
    const manifest = `id:${req.body.data.id};request-id:${requestIdHeader};ts:${ts};`;
    
    // Calcula nossa própria assinatura
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(manifest);
    const expectedHash = hmac.digest('hex');

    // Compara as assinaturas de forma segura para evitar timing attacks
    // FIX: Create Buffers from hex strings and check for equal length before comparing.
    // This prevents timingSafeEqual from throwing an error and ensures correct comparison.
    const receivedHashBuffer = Buffer.from(hash, 'hex');
    const expectedHashBuffer = Buffer.from(expectedHash, 'hex');
    if (
      receivedHashBuffer.length !== expectedHashBuffer.length ||
      !crypto.timingSafeEqual(receivedHashBuffer, expectedHashBuffer)
    ) {
      return res.status(401).send('Invalid signature.');
    }
    // --- FIM DA VERIFICAÇÃO ---


    const { action, data } = req.body;
    
    if (action !== 'payment.updated' && action !== 'payment.created') {
        return res.status(200).send('Event not relevant, skipped.');
    }
    
    const paymentId = data.id;
    if (!paymentId) {
        return res.status(400).json({ error: 'Payment ID not found in webhook body' });
    }

    const mpResponse = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: { 'Authorization': `Bearer ${process.env.MERCADOPAGO_ACCESS_TOKEN!}` },
    });
    
    if (!mpResponse.ok) {
      console.error('Failed to fetch payment details from Mercado Pago', await mpResponse.json());
      return res.status(500).json({ error: 'Could not get payment details' });
    }
    
    const paymentDetails = await mpResponse.json();
    const externalReference = paymentDetails.external_reference;
    
    const supabaseAdmin = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    );
    
    // Processa a lógica baseada no status 'approved'
    if (paymentDetails.status === 'approved') {
        if (externalReference.startsWith('DONATION|')) {
            // É uma doação
            const donationId = externalReference.split('|')[1];
            if (donationId) {
                const { error: donationUpdateError } = await supabaseAdmin
                    .from('donations')
                    .update({
                        status: 'approved',
                        mercadopago_id: paymentDetails.id,
                        amount: paymentDetails.transaction_amount
                    })
                    .eq('id', donationId);
                if (donationUpdateError) throw donationUpdateError;
            }
        } else {
            // É uma assinatura
            const { error: paymentLogError } = await supabaseAdmin
                .from('payments')
                .upsert({
                    mercadopago_id: paymentDetails.id,
                    user_id: externalReference.split('|')[0],
                    plan_id: externalReference.split('|')[1],
                    amount: paymentDetails.transaction_amount,
                    status: paymentDetails.status,
                    updated_at: new Date().toISOString()
                }, { onConflict: 'mercadopago_id' });
            
            if (paymentLogError) throw paymentLogError;
            
            const [userId, planId] = externalReference.split('|');
            const { data: planData } = await supabaseAdmin
                .from('plans')
                .select('months_duration')
                .eq('plan_id', planId)
                .single();
            
            if (!userId || !planData) {
                console.error('Invalid external_reference for subscription:', externalReference);
                return res.status(400).json({ error: 'Invalid external reference in payment' });
            }
            
            const expiresAt = add(new Date(), { months: planData.months_duration }).toISOString();
            
            const { error: profileUpdateError } = await supabaseAdmin
                .from('profiles')
                .update({
                    subscription_tier: 'plus',
                    subscription_expires_at: expiresAt,
                })
                .eq('id', userId);

            if (profileUpdateError) throw profileUpdateError;
        }
    }


    return res.status(200).json({ success: true });

  } catch (error: any) {
    console.error('Mercado Pago Webhook Error:', error);
    return res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
}