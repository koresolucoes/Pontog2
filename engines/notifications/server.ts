import { createClient } from '@supabase/supabase-js';
import webpush from 'web-push';

export type UserNotificationEventType = 'message' | 'wink' | 'album_request';
type PreferenceType = 'new_message' | 'new_wink' | 'new_album_request';
type DeliveryStatus = 'sent' | 'skipped' | 'failed';

export interface UserNotificationInput {
  accessToken: string;
  eventType: UserNotificationEventType;
  messageId?: number;
  hintedRecipientId?: string;
}

export interface UserNotificationResult {
  success: true;
  eventType: UserNotificationEventType;
  eventId: number;
  recipientId: string;
  delivered: number;
  duplicate?: boolean;
  skipped?: boolean;
}

interface ResolvedEvent {
  eventType: UserNotificationEventType;
  eventId: number;
  actorId: string;
  recipientId: string;
  preferenceType: PreferenceType;
  title: string;
  body: string;
}

const EVENT_MAX_AGE_MS = 5 * 60 * 1000;
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
  webpush.setVapidDetails(contact.startsWith('mailto:') ? contact : `mailto:${contact}`, publicKey, privateKey);
  vapidFingerprint = fingerprint;
}

function positiveInteger(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isSafeInteger(value) && value > 0) return value;
  if (typeof value === 'string' && /^\d+$/.test(value)) {
    const parsed = Number(value);
    if (Number.isSafeInteger(parsed) && parsed > 0) return parsed;
  }
  return undefined;
}

function recent(timestamp: string | null | undefined) {
  if (!timestamp) return false;
  const value = new Date(timestamp).getTime();
  return Number.isFinite(value) && Date.now() - value <= EVENT_MAX_AGE_MS;
}

async function actorIdFromToken(client: any, token: string): Promise<string> {
  const { data, error } = await client.auth.getUser(token);
  if (error || !data?.user?.id) throw new Error('Invalid or expired access token.');
  return data.user.id;
}

async function actorUsername(client: any, actorId: string): Promise<string> {
  const { data } = await client.from('profiles').select('username').eq('id', actorId).maybeSingle();
  return data?.username ? String(data.username).slice(0, 60) : 'Alguém';
}

async function assertNotBlocked(client: any, actorId: string, recipientId: string) {
  const { data, error } = await client
    .from('blocks')
    .select('id')
    .or(`and(blocker_id.eq.${actorId},blocked_id.eq.${recipientId}),and(blocker_id.eq.${recipientId},blocked_id.eq.${actorId})`)
    .limit(1);
  if (error) throw error;
  if (data?.length) throw new Error('Notification blocked by user safety rules.');
}

async function resolveMessage(client: any, actorId: string, input: UserNotificationInput): Promise<ResolvedEvent> {
  const explicitId = positiveInteger(input.messageId);
  let message: any;

  if (explicitId) {
    const { data, error } = await client
      .from('messages')
      .select('id, conversation_id, sender_id, created_at')
      .eq('id', explicitId)
      .eq('sender_id', actorId)
      .maybeSingle();
    if (error) throw error;
    if (!data) throw new Error('Message event not found for authenticated sender.');
    message = data;
  } else {
    const recipientHint = input.hintedRecipientId;
    if (!recipientHint || recipientHint === actorId) throw new Error('A valid recipient hint is required.');

    const [{ data: actorParts, error: actorError }, { data: recipientParts, error: recipientError }] = await Promise.all([
      client.from('conversation_participants').select('conversation_id').eq('user_id', actorId).limit(200),
      client.from('conversation_participants').select('conversation_id').eq('user_id', recipientHint).limit(200),
    ]);
    if (actorError) throw actorError;
    if (recipientError) throw recipientError;

    const recipientConversations = new Set((recipientParts || []).map((row: any) => Number(row.conversation_id)));
    const sharedIds = (actorParts || [])
      .map((row: any) => Number(row.conversation_id))
      .filter((id: number) => recipientConversations.has(id));
    if (!sharedIds.length) throw new Error('No authorized shared conversation found.');

    const cutoff = new Date(Date.now() - EVENT_MAX_AGE_MS).toISOString();
    const { data, error } = await client
      .from('messages')
      .select('id, conversation_id, sender_id, created_at')
      .in('conversation_id', sharedIds)
      .eq('sender_id', actorId)
      .gte('created_at', cutoff)
      .order('created_at', { ascending: false })
      .limit(1);
    if (error) throw error;
    if (!data?.[0]) throw new Error('No recent message event found for notification.');
    message = data[0];
  }

  if (!recent(message.created_at)) throw new Error('Message event is outside the notification delivery window.');

  const { data: participants, error } = await client
    .from('conversation_participants')
    .select('user_id')
    .eq('conversation_id', message.conversation_id);
  if (error) throw error;

  const ids: string[] = Array.from(
    new Set<string>(((participants || []) as any[]).map((row: any): string => String(row.user_id))),
  );
  if (ids.length !== 2 || !ids.includes(actorId)) {
    throw new Error('Notification is only supported for authorized 1:1 conversations.');
  }
  const recipientId = ids.find((id) => id !== actorId);
  if (!recipientId) throw new Error('Conversation recipient could not be resolved.');
  if (input.hintedRecipientId && input.hintedRecipientId !== recipientId) {
    throw new Error('Recipient hint does not match the message conversation.');
  }

  await assertNotBlocked(client, actorId, recipientId);
  const username = await actorUsername(client, actorId);
  return {
    eventType: 'message',
    eventId: Number(message.id),
    actorId,
    recipientId,
    preferenceType: 'new_message',
    title: `Nova mensagem de ${username}`,
    // Never expose conversation content on a lock screen notification.
    body: 'Você recebeu uma nova mensagem. Abra o Ponto G para ver.',
  };
}

async function resolveWink(client: any, actorId: string, input: UserNotificationInput): Promise<ResolvedEvent> {
  const recipientId = input.hintedRecipientId;
  if (!recipientId || recipientId === actorId) throw new Error('A valid wink recipient is required.');

  const { data, error } = await client
    .from('winks')
    .select('id, sender_id, receiver_id, created_at')
    .eq('sender_id', actorId)
    .eq('receiver_id', recipientId)
    .order('created_at', { ascending: false })
    .limit(1);
  if (error) throw error;
  const wink = data?.[0];
  if (!wink || !recent(wink.created_at)) throw new Error('No recent wink event found for notification.');

  await assertNotBlocked(client, actorId, recipientId);
  const username = await actorUsername(client, actorId);
  return {
    eventType: 'wink',
    eventId: Number(wink.id),
    actorId,
    recipientId,
    preferenceType: 'new_wink',
    title: 'Você recebeu um novo chamado! 😉',
    body: `${username} chamou você.`,
  };
}

async function resolveAlbumRequest(client: any, actorId: string, input: UserNotificationInput): Promise<ResolvedEvent> {
  const recipientId = input.hintedRecipientId;
  if (!recipientId || recipientId === actorId) throw new Error('A valid album owner is required.');

  const { data, error } = await client
    .from('private_album_access')
    .select('id, owner_id, requester_id, status, created_at, updated_at')
    .eq('owner_id', recipientId)
    .eq('requester_id', actorId)
    .eq('status', 'pending')
    .order('updated_at', { ascending: false })
    .limit(1);
  if (error) throw error;
  const request = data?.[0];
  if (!request || !recent(request.updated_at || request.created_at)) {
    throw new Error('No recent pending album access request found for notification.');
  }

  await assertNotBlocked(client, actorId, recipientId);
  const username = await actorUsername(client, actorId);
  return {
    eventType: 'album_request',
    eventId: Number(request.id),
    actorId,
    recipientId,
    preferenceType: 'new_album_request',
    title: 'Solicitação de acesso a álbuns',
    body: `${username} pediu acesso aos seus álbuns privados.`,
  };
}

async function resolveEvent(client: any, actorId: string, input: UserNotificationInput) {
  if (input.eventType === 'message') return resolveMessage(client, actorId, input);
  if (input.eventType === 'wink') return resolveWink(client, actorId, input);
  return resolveAlbumRequest(client, actorId, input);
}

async function claim(client: any, event: ResolvedEvent): Promise<boolean> {
  const { data, error } = await client.rpc('claim_notification_delivery', {
    p_event_type: event.eventType,
    p_event_id: event.eventId,
    p_actor_id: event.actorId,
    p_recipient_id: event.recipientId,
  });
  if (error) throw error;
  return data === true;
}

async function finish(client: any, event: ResolvedEvent, status: DeliveryStatus, errorCode?: string) {
  const { error } = await client.rpc('finish_notification_delivery', {
    p_event_type: event.eventType,
    p_event_id: event.eventId,
    p_status: status,
    p_error_code: errorCode || null,
  });
  if (error) console.error('Could not finalize notification delivery audit row:', error);
}

async function preferenceEnabled(client: any, event: ResolvedEvent): Promise<boolean> {
  const { data, error } = await client
    .from('notification_preferences')
    .select('enabled')
    .eq('user_id', event.recipientId)
    .eq('notification_type', event.preferenceType)
    .limit(1);
  if (error) throw error;
  return Boolean(data?.[0]?.enabled);
}

export async function dispatchAuthorizedUserNotification(input: UserNotificationInput): Promise<UserNotificationResult> {
  const client = adminClient();
  if (!input.accessToken) throw new Error('Authentication required.');
  const actorId = await actorIdFromToken(client, input.accessToken);
  const event = await resolveEvent(client, actorId, input);

  const enabled = await preferenceEnabled(client, event);
  if (!enabled) {
    const claimed = await claim(client, event);
    if (claimed) await finish(client, event, 'skipped', 'preference_disabled');
    return { success: true, eventType: event.eventType, eventId: event.eventId, recipientId: event.recipientId, delivered: 0, duplicate: !claimed || undefined, skipped: true };
  }

  const { data: subscriptions, error } = await client
    .from('push_subscriptions')
    .select('endpoint, subscription_details')
    .eq('user_id', event.recipientId);
  if (error) throw error;

  if (!subscriptions?.length) {
    const claimed = await claim(client, event);
    if (claimed) await finish(client, event, 'skipped', 'no_subscription');
    return { success: true, eventType: event.eventType, eventId: event.eventId, recipientId: event.recipientId, delivered: 0, duplicate: !claimed || undefined, skipped: true };
  }

  configureVapid();
  const claimed = await claim(client, event);
  if (!claimed) {
    return { success: true, eventType: event.eventType, eventId: event.eventId, recipientId: event.recipientId, delivered: 0, duplicate: true };
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
      console.error('Web Push delivery failed:', { statusCode: sendError?.statusCode });
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
