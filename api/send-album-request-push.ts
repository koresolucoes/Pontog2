// api/send-album-request-push.ts
import { createClient } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import webpush from 'web-push';

webpush.setVapidDetails(
  `mailto:${process.env.VAPID_CONTACT_EMAIL!}`,
  process.env.VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).end('Method Not Allowed');
  }

  try {
    const { receiver_id } = req.body;
    if (!receiver_id) {
      return res.status(400).json({ error: 'receiver_id is required' });
    }
    
    const supabaseAdmin = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } }
    ) as any;

    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'Authorization header missing' });
    }
    const token = authHeader.replace('Bearer ', '');
    const { data: { user: senderUser } } = await supabaseAdmin.auth.getUser(token);

    if (!senderUser) {
      return res.status(401).json({ error: 'Sender not authenticated' });
    }

    // 1. Verifica se o destinatário quer receber notificações de 'new_album_request'
    const { data: preferences, error: prefError } = await supabaseAdmin
        .from('notification_preferences')
        .select('enabled')
        .eq('user_id', receiver_id)
        .eq('notification_type', 'new_album_request')
        .limit(1);
        
    if (prefError) throw prefError;
        
    if (!preferences || preferences.length === 0 || !preferences[0].enabled) {
        return res.status(200).json({ success: true, message: 'User has disabled album request notifications.' });
    }
    
    const { data: senderProfile } = await supabaseAdmin
        .from('profiles')
        .select('username')
        .eq('id', senderUser.id)
        .single();
    
    if (!senderProfile) {
        return res.status(404).json({ error: 'Sender profile not found' });
    }

    const { data: subscriptions, error: subscriptionError } = await supabaseAdmin
      .from('push_subscriptions')
      .select('subscription_details')
      .eq('user_id', receiver_id);

    if (subscriptionError) {
        throw subscriptionError;
    }

    if (!subscriptions || subscriptions.length === 0) {
      return res.status(200).json({ success: true, message: 'No subscription found.' });
    }

    const payload = JSON.stringify({
      title: 'Solicitação de Acesso a Álbuns',
      body: `${senderProfile.username} pediu para ver os seus álbuns privados.`,
    });
    
    const sendPromises = subscriptions.map((sub: any) => {
        const subscription = sub.subscription_details as any;
        return webpush.sendNotification(subscription, payload).catch(async (error) => {
            if (error.statusCode === 410 || error.statusCode === 404) {
                console.log(`Subscription for user ${receiver_id} is gone. Deleting endpoint: ${subscription.endpoint}`);
                await supabaseAdmin.from('push_subscriptions').delete().eq('endpoint', subscription.endpoint);
            } else {
                console.error('Error sending album request push notification:', error);
            }
        });
    });

    await Promise.all(sendPromises);

    return res.status(200).json({ success: true });

  } catch (error: any) {
    console.error('Internal server error in send-album-request-push:', error);
    return res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
}