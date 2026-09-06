// api/store-push-subscription.ts
import { createClient } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '@vercel/node';

function getBearerToken(req: VercelRequest): string | null {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return null;
  return header.slice('Bearer '.length).trim() || null;
}

function validSubscriptionObject(value: any): boolean {
  return Boolean(
    value &&
    typeof value.endpoint === 'string' &&
    value.endpoint.startsWith('https://') &&
    value.endpoint.length <= 2048 &&
    typeof value.keys?.auth === 'string' &&
    value.keys.auth.length > 0 &&
    value.keys.auth.length <= 512 &&
    typeof value.keys?.p256dh === 'string' &&
    value.keys.p256dh.length > 0 &&
    value.keys.p256dh.length <= 1024
  );
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).end('Method Not Allowed');
  }

  try {
    const { subscription_object } = req.body || {};
    if (!validSubscriptionObject(subscription_object)) {
      return res.status(400).json({ error: 'A valid push subscription is required.' });
    }

    const token = getBearerToken(req);
    if (!token) {
      return res.status(401).json({ error: 'Authorization header missing or invalid.' });
    }

    const supabaseUrl = process.env.SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error('Supabase server credentials are not configured.');
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    }) as any;

    const { data: userResult, error: userError } = await supabaseAdmin.auth.getUser(token);
    const user = userResult?.user;
    if (userError || !user) {
      return res.status(401).json({ error: 'User not authenticated or token is invalid.' });
    }

    const normalizedSubscription = {
      endpoint: subscription_object.endpoint,
      expirationTime: subscription_object.expirationTime ?? null,
      keys: {
        auth: subscription_object.keys.auth,
        p256dh: subscription_object.keys.p256dh,
      },
    };

    const { error } = await supabaseAdmin
      .from('push_subscriptions')
      .upsert({
        endpoint: normalizedSubscription.endpoint,
        user_id: user.id,
        subscription_details: normalizedSubscription,
      }, { onConflict: 'endpoint' });

    if (error) throw error;

    const { error: prefError } = await supabaseAdmin.rpc('ensure_default_notification_preferences', {
      p_user_id: user.id,
    });

    if (prefError) {
      console.error('Error ensuring default notification preferences:', prefError);
      return res.status(500).json({ error: 'Could not initialize notification preferences.' });
    }

    return res.status(200).json({ success: true });
  } catch (error: any) {
    console.error('Error storing push subscription:', error);
    return res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
}
