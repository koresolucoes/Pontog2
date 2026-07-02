// api/unlink-push-subscription.ts
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
    const { subscription_object } = req.body;

    if (!subscription_object || !subscription_object.endpoint) {
        return res.status(400).json({ error: 'subscription_object with endpoint is required' });
    }

    const supabaseAdmin = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } }
    );

    // Find subscription by endpoint and set user_id to null
    // This unlinks the device from any user, useful on logout.
    const { error } = await supabaseAdmin
      .from('push_subscriptions')
      .update({ user_id: null })
      .eq('endpoint', subscription_object.endpoint);

    // We don't throw an error if not found, as it might have been deleted already.
    if (error && error.code !== 'PGRST116') throw error;

    return res.status(200).json({ success: true, message: 'Subscription unlinked.' });

  } catch (error: any) {
    console.error('Error unlinking push subscription:', error);
    return res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
}