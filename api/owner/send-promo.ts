import { createClient } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import webpush from 'web-push';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).end('Method Not Allowed');
  }

  try {
    const { venueId, title, message } = req.body;
    if (!venueId || !title || !message) {
      return res.status(400).json({ error: 'Missing parameters' });
    }

    const supabaseAdmin = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } }
    );

    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).json({ error: 'Authorization header missing' });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user } } = await supabaseAdmin.auth.getUser(token);

    if (!user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    // Verify owner
    const { data: venue } = await supabaseAdmin
      .from('venues')
      .select('owner_id, name, image_url, type, description, address, lat, lng, is_partner, is_verified, tags')
      .eq('id', venueId)
      .single();

    if (!venue || venue.owner_id !== user.id) {
        return res.status(403).json({ error: 'Forbidden' });
    }

    // Insert into venue_posts to publish to the Agora social feed!
    const { error: postError } = await supabaseAdmin
      .from('venue_posts')
      .insert({
        venue_id: venueId,
        title: title,
        content: message,
        image_url: venue.image_url || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&auto=format&fit=crop&q=80',
        is_active: true,
        starts_at: new Date().toISOString(),
        ends_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24-hour lifetime
      });

    if (postError) {
      console.error('Error inserting venue post:', postError);
    }

    // Attempt to set up Web Push if keys are present
    const vapidPublic = process.env.VAPID_PUBLIC_KEY;
    const vapidPrivate = process.env.VAPID_PRIVATE_KEY;
    const vapidEmail = process.env.VAPID_CONTACT_EMAIL || 'contact@example.com';

    let canSendPush = false;
    if (vapidPublic && vapidPrivate) {
      try {
        webpush.setVapidDetails(
          `mailto:${vapidEmail}`,
          vapidPublic,
          vapidPrivate
        );
        canSendPush = true;
      } catch (e: any) {
        console.error('Failed to set VAPID details:', e.message);
      }
    } else {
      console.warn('VAPID keys not configured in environment variables. Skipping push notification portion.');
    }

    // Get users who checked in (recent ones, or all unique)
    const { data: checkins } = await supabaseAdmin
      .from('venue_checkins')
      .select('user_id')
      .eq('venue_id', venueId);

    if (!checkins || checkins.length === 0) {
      return res.status(200).json({ success: true, message: 'Published to feed. No users checked-in to notify.' });
    }

    const uniqueUserIds = [...new Set(checkins.map(c => c.user_id))];

    // If we cannot send push, return success since we successfully published to feed!
    if (!canSendPush) {
      return res.status(200).json({ success: true, message: 'Published to feed. Push notifications unconfigured.', sentCount: 0 });
    }

    // Find subscriptions
    const { data: subscriptions } = await supabaseAdmin
      .from('push_subscriptions')
      .select('subscription_details, endpoint')
      .in('user_id', uniqueUserIds);

    if (!subscriptions || subscriptions.length === 0) {
      return res.status(200).json({ success: true, message: 'Published to feed. No push subscriptions found.' });
    }

    const payload = JSON.stringify({
      title: `${venue.name}: ${title}`,
      body: message,
    });

    const sendPromises = subscriptions.map((sub: any) => {
        return webpush.sendNotification(sub.subscription_details, payload)
            .catch(async (error) => {
                if (error.statusCode === 410 || error.statusCode === 404) {
                    await supabaseAdmin
                        .from('push_subscriptions')
                        .delete()
                        .eq('endpoint', sub.endpoint);
                }
            });
    });

    await Promise.all(sendPromises);

    return res.status(200).json({ success: true, message: 'Promo successfully sent!', sentCount: sendPromises.length });

  } catch (error: any) {
    console.error('Error sending promo:', error);
    return res.status(500).json({ error: error.message });
  }
}
