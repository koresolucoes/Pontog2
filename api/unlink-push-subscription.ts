// api/unlink-push-subscription.ts
import { timingSafeEqual } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '@vercel/node';

function safeEqual(left: unknown, right: unknown): boolean {
  if (typeof left !== 'string' || typeof right !== 'string') return false;
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

function validSubscriptionObject(value: any): boolean {
  return Boolean(
    value &&
    typeof value.endpoint === 'string' &&
    value.endpoint.length > 0 &&
    value.endpoint.length <= 2048 &&
    typeof value.keys?.auth === 'string' &&
    typeof value.keys?.p256dh === 'string'
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

    const supabaseUrl = process.env.SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error('Supabase server credentials are not configured.');
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    }) as any;

    const { data: stored, error: lookupError } = await supabaseAdmin
      .from('push_subscriptions')
      .select('endpoint, subscription_details')
      .eq('endpoint', subscription_object.endpoint)
      .maybeSingle();

    if (lookupError) throw lookupError;

    // Logout can happen after the Supabase session has already been cleared.
    // Instead of accepting an unauthenticated endpoint alone, require proof of
    // possession of both Web Push subscription secrets. Do not reveal whether
    // the endpoint existed or whether the proof matched.
    const storedDetails = stored?.subscription_details;
    const hasPossession = Boolean(
      stored &&
      safeEqual(storedDetails?.keys?.auth, subscription_object.keys.auth) &&
      safeEqual(storedDetails?.keys?.p256dh, subscription_object.keys.p256dh)
    );

    if (hasPossession) {
      const { error: unlinkError } = await supabaseAdmin
        .from('push_subscriptions')
        .update({ user_id: null })
        .eq('endpoint', subscription_object.endpoint);

      if (unlinkError) throw unlinkError;
    }

    return res.status(200).json({ success: true, message: 'Subscription unlink processed.' });
  } catch (error: any) {
    console.error('Error unlinking push subscription:', error);
    return res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
}
