import { createClient } from '@supabase/supabase-js';
import webpush from 'web-push';

type ConnectionEventType = 'connection_request' | 'connection_accepted';
type DeliveryStatus = 'sent' | 'skipped' | 'failed';

export interface ConnectionNotificationInput {
  accessToken: string;
  hintedRecipientId: string;
}

export interface ConnectionNotificationResult {
  success: true;
  eventType: ConnectionEventType;
  eventId: number;
  recipientId: string;
  delivered: number;
  duplicate?: boolean;
  skipped?: boolean;
}

interface ResolvedConnectionEvent {
  eventType: ConnectionEventType;
  eventId: number;
  actorId: string;
  recipientId: string;
  title: string;
  body: string;
}

let vapidFingerprint: string | null = null;

function adminClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase server credentials are not configured.');

  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  }) as any;
}

function configureVapid() {
  const contact = process.env.VAPID_CONTACT_EMAIL;
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!contact || !publicKey || !privateKey) {
    throw new Error('Web Push VAPID credentials are not configured.');
  }

  const fingerprint = `${contact}:${publicKey}`;
  if (fingerprint === vapidFingerprint) return;

  webpush.setVapidDetails(
    contact.startsWith('mailto:') ? contact : `mailto:${contact}`,
    publicKey,
    privateKey,
  );
  vapidFingerprint = fingerprint;
}

function validUuid(value: unknown): value is string {
  return typeof value === 'string'
    && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

async function actorIdFromToken(client: any, token: string): Promise<string> {
  const { data, error } = await client.auth.getUser(token);
  if (error || !data?.user?.id) throw new Error('Invalid or expired access token.');
  return String(data.user.id);
}

async function assertActivePair(client: any, actorId: string, recipientId: string): Promise<string> {
  const { data, error } = await client
    .from('profiles')
    .select('id, username, status')
    .in('id', [actorId, recipientId]);
  if (error) throw error;

  const profiles = data || [];
  const actor = profiles.find((profile: any) => String(profile.id) === actorId);
  const recipient = profiles.find((profile: any) => String(profile.id) === recipientId);
  if (!actor || actor.status !== 'active' || !recipient || recipient.status !== 'active') {
    throw new Error('Connection notification participants must be active.');
  }

  const { data: blocks, error: blockError } = await client
    .from('blocks')
    .select('id')
    .or(`and(blocker_id.eq.${actorId},blocked_id.eq.${recipientId}),and(blocker_id.eq.${recipientId},blocked_id.eq.${actorId})`)
    .limit(1);
  if (blockError) throw blockError;
  if (blocks?.length) throw new Error('Notification blocked by user safety rules.');

  return actor.username ? String(actor.username).slice(0, 60) : 'Alguém';
}

function numericEventId(value: unknown): number {
  const eventId = Number(value);
  if (!Number.isSafeInteger(eventId) || eventId <= 0) {
    throw new Error('Connection notification event id is invalid.');
  }
  return eventId;
}

async function resolveConnectionEvent(
  client: any,
  actorId: string,
  recipientId: string,
): Promise<ResolvedConnectionEvent> {
  const { data: request, error: requestError } = await client
    .from('user_connections')
    .select('notification_event_id, follower_id, following_id, status')
    .eq('follower_id', actorId)
    .eq('following_id', recipientId)
    .eq('status', 'pending')
    .maybeSingle();
  if (requestError) throw requestError;

  const username = await assertActivePair(client, actorId, recipientId);

  if (request) {
    return {
      eventType: 'connection_request',
      eventId: numericEventId(request.notification_event_id),
      actorId,
      recipientId,
      title: 'Nova solicitação de conexão 🤝',
      body: `${username} quer se conectar com você.`,
    };
  }

  const { data: accepted, error: acceptedError } = await client
    .from('user_connections')
    .select('notification_event_id, follower_id, following_id, status')
    .eq('follower_id', recipientId)
    .eq('following_id', actorId)
    .eq('status', 'accepted')
    .maybeSingle();
  if (acceptedError) throw acceptedError;

  if (accepted) {
    return {
      eventType: 'connection_accepted',
      eventId: numericEventId(accepted.notification_event_id),
      actorId,
      recipientId,
      title: 'Solicitação de conexão aceita 🎉',
      body: `${username} aceitou sua solicitação de conexão.`,
    };
  }

  throw new Error('No authorized persisted connection event matches this request.');
}

async function preferenceEnabled(client: any, recipientId: string): Promise<boolean> {
  const { data, error } = await client
    .from('notification_preferences')
    .select('enabled')
    .eq('user_id', recipientId)
    .eq('notification_type', 'new_connection')
    .maybeSingle();
  if (error) throw error;
  return data?.enabled !== false;
}

async function claim(client: any, event: ResolvedConnectionEvent): Promise<boolean> {
  const { data, error } = await client.rpc('claim_notification_delivery', {
    p_event_type: event.eventType,
    p_event_id: event.eventId,
    p_actor_id: event.actorId,
    p_recipient_id: event.recipientId,
  });
  if (error) throw error;
  return data === true;
}

async function finish(
  client: any,
  event: ResolvedConnectionEvent,
  status: DeliveryStatus,
  errorCode?: string,
) {
  const { error } = await client.rpc('finish_notification_delivery', {
    p_event_type: event.eventType,
    p_event_id: event.eventId,
    p_status: status,
    p_error_code: errorCode || null,
  });
  if (error) console.error('Could not finalize connection notification audit row:', error);
}

export async function dispatchAuthorizedConnectionNotification(
  input: ConnectionNotificationInput,
): Promise<ConnectionNotificationResult> {
  if (!input.accessToken) throw new Error('Authentication required.');
  if (!validUuid(input.hintedRecipientId)) throw new Error('A valid recipient hint is required.');

  const client = adminClient();
  const actorId = await actorIdFromToken(client, input.accessToken);
  if (input.hintedRecipientId === actorId) throw new Error('Connection notification recipient must differ from actor.');

  const event = await resolveConnectionEvent(client, actorId, input.hintedRecipientId);

  const enabled = await preferenceEnabled(client, event.recipientId);
  if (!enabled) {
    const claimed = await claim(client, event);
    if (claimed) await finish(client, event, 'skipped', 'preference_disabled');
    return {
      success: true,
      eventType: event.eventType,
      eventId: event.eventId,
      recipientId: event.recipientId,
      delivered: 0,
      duplicate: !claimed || undefined,
      skipped: true,
    };
  }

  const { data: subscriptions, error } = await client
    .from('push_subscriptions')
    .select('endpoint, subscription_details')
    .eq('user_id', event.recipientId);
  if (error) throw error;

  if (!subscriptions?.length) {
    const claimed = await claim(client, event);
    if (claimed) await finish(client, event, 'skipped', 'no_subscription');
    return {
      success: true,
      eventType: event.eventType,
      eventId: event.eventId,
      recipientId: event.recipientId,
      delivered: 0,
      duplicate: !claimed || undefined,
      skipped: true,
    };
  }

  configureVapid();
  const claimed = await claim(client, event);
  if (!claimed) {
    return {
      success: true,
      eventType: event.eventType,
      eventId: event.eventId,
      recipientId: event.recipientId,
      delivered: 0,
      duplicate: true,
    };
  }

  const payload = JSON.stringify({
    title: event.title,
    body: event.body,
    event_type: event.eventType,
    event_id: event.eventId,
  });

  const outcomes = await Promise.all(subscriptions.map(async (row: any) => {
    try {
      await webpush.sendNotification(row.subscription_details, payload);
      return 'sent' as const;
    } catch (sendError: any) {
      if (sendError?.statusCode === 404 || sendError?.statusCode === 410) {
        await client.from('push_subscriptions').delete().eq('endpoint', row.endpoint);
        return 'stale' as const;
      }
      console.error('Connection Web Push delivery failed:', { statusCode: sendError?.statusCode });
      return 'failed' as const;
    }
  }));

  const delivered = outcomes.filter((value) => value === 'sent').length;
  const failures = outcomes.filter((value) => value === 'failed').length;

  if (delivered > 0) await finish(client, event, 'sent');
  else if (failures > 0) await finish(client, event, 'failed', 'provider_error');
  else await finish(client, event, 'skipped', 'stale_subscriptions');

  return {
    success: true,
    eventType: event.eventType,
    eventId: event.eventId,
    recipientId: event.recipientId,
    delivered,
    skipped: delivered === 0 || undefined,
  };
}
