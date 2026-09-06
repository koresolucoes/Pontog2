import { createClient } from '@supabase/supabase-js';
import webpush from 'web-push';

export type UserNotificationEventType = 'message' | 'wink' | 'album_request';

type PreferenceType = 'new_message' | 'new_wink' | 'new_album_request';

type NotificationDeliveryStatus = 'sent' | 'skipped' | 'failed';

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

interface ResolvedNotificationEvent {
  eventType: UserNotificationEventType;
  eventId: number;
  actorId: string;
  recipientId: string;
  preferenceType: PreferenceType;
  title: string;
  body: string;
}

const LEGACY_EVENT_MAX_AGE_MS = 5 * 60 * 1000;
let configuredVapidFingerprint: string | null = null;

function createAdminClient() {
  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error('Supabase server credentials are not configured.');
  }

  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  }) as any;
}

function ensureVapidConfigured() {
  const contact = process.env.VAPID_CONTACT_EMAIL;
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;

  if (!contact || !publicKey || !privateKey) {
    throw new Error('Web Push VAPID credentials are not configured.');
  }

  const fingerprint = `${contact}:${publicKey}`;
  if (configuredVapidFingerprint === fingerprint) return;

  const subject = contact.startsWith('mailto:') ? contact : `mailto:${contact}`;
  webpush.setVapidDetails(subject, publicKey, privateKey);
  configuredVapidFingerprint = fingerprint;
}

function normalizeId(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isSafeInteger(value) && value > 0) return value;
  if (typeof value === 'string' && /^\d+$/.test(value)) {
    const parsed = Number(value);
    if (Number.isSafeInteger(parsed) && parsed > 0) return parsed;
  }
  return undefined;
}

function isRecent(createdAt: string | null | undefined): boolean {
  if (!createdAt) return false;
  const created = new Date(createdAt).getTime();
  return Number.isFinite(created) && Date.now() - created <= LEGACY_EVENT_MAX_AGE_MS;
}

function cleanPreview(text: string): string {
  return text.replace(/\s+/g, ' ').trim().slice(0, 80);
}

function messagePreview(message: any): string {
  if (message.is_view_once) return 'Mídia de visualização única';
  if (message.image_url) return '📷 Foto';

  const content = typeof message.content === 'string' ? message.content : '';
  if (!content) return 'Nova mensagem';

  try {
    const parsed = JSON.parse(content);
    if (parsed?.type === 'audio') return '🎙️ Áudio';
    if (parsed?.type === 'album') return '🔒 Álbum privado';
    if (parsed?.type === 'location') return '📍 Localização';
  } catch {
    // Plain text message.
  }

  return cleanPreview(content) || 'Nova mensagem';
}

async function requireActorId(supabaseAdmin: any, accessToken: string): Promise<string> {
  if (!accessToken) throw new Error('Authentication required.');

  const { data, error } = await supabaseAdmin.auth.getUser(accessToken);
  if (error || !data?.user?.id) {
    throw new Error('Invalid or expired access token.');
  }

  return data.user.id;
}

async function assertNotBlocked(supabaseAdmin: any, actorId: string, recipientId: string) {
  const [{ data: actorBlock, error: actorBlockError }, { data: recipientBlock, error: recipientBlockError }] = await Promise.all([
    supabaseAdmin
      .from('blocks')
      .select('id')
      .eq('blocker_id', actorId)
      .eq('blocked_id', recipientId)
      .limit(1),
    supabaseAdmin
      .from('blocks')
      .select('id')
      .eq('blocker_id', recipientId)
      .eq('blocked_id', actorId)
      .limit(1),
  ]);

  if (actorBlockError) throw actorBlockError;
  if (recipientBlockError) throw recipientBlockError;
  if ((actorBlock?.length || 0) > 0 || (recipientBlock?.length || 0) > 0) {
    throw new Error('Notification blocked by user safety rules.');
  }
}

async function getActorUsername(supabaseAdmin: any, actorId: string): Promise<string> {
  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('username')
    .eq('id', actorId)
    .single();

  if (error || !data?.username) return 'Alguém';
  return String(data.username).slice(0, 60);
}

async function resolveMessageEvent(
  supabaseAdmin: any,
  actorId: string,
  input: UserNotificationInput,
): Promise<ResolvedNotificationEvent> {
  const explicitMessageId = normalizeId(input.messageId);
  let message: any = null;

  if (explicitMessageId) {
    const { data, error } = await supabaseAdmin
      .from('messages')
      .select('id, conversation_id, sender_id, content, image_url, is_view_once, created_at')
      .eq('id', explicitMessageId)
      .eq('sender_id', actorId)
      .single();

    if (error || !data) throw new Error('Message event not found for authenticated sender.');
    message = data;
  } else {
    const hintedRecipientId = input.hintedRecipientId;
    if (!hintedRecipientId || hintedRecipientId === actorId) {
      throw new Error('A valid recipient hint is required for the legacy message notification flow.');
    }

    const [{ data: actorParts, error: actorPartsError }, { data: recipientParts, error: recipientPartsError }] = await Promise.all([
      supabaseAdmin.from('conversation_participants').select('conversation_id').eq('user_id', actorId).limit(200),
      supabaseAdmin.from('conversation_participants').select('conversation_id').eq('user_id', hintedRecipientId).limit(200),
    ]);

    if (actorPartsError) throw actorPartsError;
    if (recipientPartsError) throw recipientPartsError;

    const recipientConversationIds = new Set((recipientParts || []).map((row: any) => Number(row.conversation_id)));
    const sharedConversationIds = (actorParts || [])
      .map((row: any) => Number(row.conversation_id))
      .filter((id: number) => recipientConversationIds.has(id));

    if (sharedConversationIds.length === 0) {
      throw new Error('No authorized shared conversation found.');
    }

    const cutoff = new Date(Date.now() - LEGACY_EVENT_MAX_AGE_MS).toISOString();
    const { data, error } = await supabaseAdmin
      .from('messages')
      .select('id, conversation_id, sender_id, content, image_url, is_view_once, created_at')
      .in('conversation_id', sharedConversationIds)
      .eq('sender_id', actorId)
      .gte('created_at', cutoff)
      .order('created_at', { ascending: false })
      .limit(1);

    if (error) throw error;
    if (!data?.[0]) throw new Error('No recent message event found for notification.');
    message = data[0];
  }

  if (!isRecent(message.created_at)) {
    throw new Error('Message event is outside the notification delivery window.');
  }

  const { data: participants, error: participantError } = await supabaseAdmin
    .from('conversation_participants')
    .select('user_id')
    .eq('conversation_id', message.conversation_id);

  if (participantError) throw participantError;

  const participantIds = Array.from(new Set((participants || []).map((row: any) => String(row.user_id))));
  if (participantIds.length !== 2 || !participantIds.includes(actorId)) {
    throw new Error('Notification is only supported for authorized 1:1 conversations.');
  }

  const recipientId = participantIds.find((id) => id !== actorId);
  if (!recipientId) throw new Error('Conversation recipient could not be resolved.');
  if (input.hintedRecipientId && input.hintedRecipientId !== recipientId) {
    throw new Error('Recipient hint does not match the message conversation.');
  }

  await assertNotBlocked(supabaseAdmin, actorId, recipientId);
  const username = await getActorUsername(supabaseAdmin, actorId);

  return {
    eventType: 'message',
    eventId: Number(message.id),
    actorId,
    recipientId,
    preferenceType: 'new_message',
    title: `Nova mensagem de ${username}`,
    body: messagePreview(message),
  };
}

async function resolveWinkEvent(
  supabaseAdmin: any,
  actorId: string,
  input: UserNotificationInput,
): Promise<ResolvedNotificationEvent> {
  const recipientId = input.hintedRecipientId;
  if (!recipientId || recipientId === actorId) throw new Error('A valid wink recipient is required.');

  const { data, error } = await supabaseAdmin
    .from('winks')
    .select('id, sender_id, receiver_id, created_at')
    .eq('sender_id', actorId)
    .eq('receiver_id', recipientId)
    .order('created_at', { ascending: false })
    .limit(1);

  if (error) throw error;
  const wink = data?.[0];
  if (!wink || !isRecent(wink.created_at)) {
    throw new Error('No recent wink event found for notification.');
  }

  await assertNotBlocked(supabaseAdmin, actorId, recipientId);
  const username = await getActorUsername(supabaseAdmin, actorId);

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

async function resolveAlbumRequestEvent(
  supabaseAdmin: any,
  actorId: string,
  input: UserNotificationInput,
): Promise<ResolvedNotificationEvent> {
  const recipientId = input.hintedRecipientId;
  if (!recipientId || recipientId === actorId) throw new Error('A valid album owner is required.');

  const { data, error } = await supabaseAdmin
    .from('private_album_access')
    .select('id, owner_id, requester_id, status, created_at, updated_at')
    .eq('owner_id', recipientId)
    .eq('requester_id', actorId)
    .eq('status', 'pending')
    .limit(1);

  if (error) throw error;
  const request = data?.[0];
  if (!request || !isRecent(request.updated_at || request.created_at)) {
    throw new Error('No recent pending album access request found for notification.');
  }

  await assertNotBlocked(supabaseAdmin, actorId, recipientId);
  const username = await getActorUsername(supabaseAdmin, actorId);

  return {
    eventType: 'album_request',
    eventId: Number(request.id),
    actorId,
    recipientId,
    preferenceType: 'new_album_request',
    title: 'Solicitação de Acesso a Álbuns',
    body: `${username} pediu para ver os seus álbuns privados.`,
  };
}

async function resolveEvent(
  supabaseAdmin: any,
  actorId: string,
  input: UserNotificationInput,
): Promise<ResolvedNotificationEvent> {
  if (input.eventType === 'message') return resolveMessageEvent(supabaseAdmin, actorId, input);
  if (input.eventType === 'wink') return resolveWinkEvent(supabaseAdmin, actorId, input);
  return resolveAlbumRequestEvent(supabaseAdmin, actorId, input);
}

async function claimDelivery(supabaseAdmin: any, event: ResolvedNotificationEvent): Promise<boolean> {
  const { data, error } = await supabaseAdmin.rpc('claim_notification_delivery', {
    p_event_type: event.eventType,
    p_event_id: event.eventId,
    p_actor_id: event.actorId,
    p_recipient_id: event.recipientId,
  });

  if (error) throw error;
  return data === true;
}

async function finishDelivery(
  supabaseAdmin: any,
  event: ResolvedNotificationEvent,
  status: NotificationDeliveryStatus,
  errorCode?: string,
) {
  const { error } = await supabaseAdmin.rpc('finish_notification_delivery', {
    p_event_type: event.eventType,
    p_event_id: event.eventId,
    p_status: status,
    p_error_code: errorCode || null,
  });

  if (error) console.error('Could not finalize notification delivery audit row:', error);
}

async function notificationEnabled(
  supabaseAdmin: any,
  recipientId: string,
  preferenceType: PreferenceType,
): Promise<boolean> {
  const { data, error } = await supabaseAdmin
    .from('notification_preferences')
    .select('enabled')
    .eq('user_id', recipientId)
    .eq('notification_type', preferenceType)
    .limit(1);

  if (error) throw error;
  return Boolean(data?.[0]?.enabled);
}

export async function dispatchAuthorizedUserNotification(
  input: UserNotificationInput,
): Promise<UserNotificationResult> {
  const supabaseAdmin = createAdminClient();
  const actorId = await requireActorId(supabaseAdmin, input.accessToken);
  const event = await resolveEvent(supabaseAdmin, actorId, input);

  const enabled = await notificationEnabled(supabaseAdmin, event.recipientId, event.preferenceType);
  if (!enabled) {
    const claimed = await claimDelivery(supabaseAdmin, event);
    if (claimed) await finishDelivery(supabaseAdmin, event, 'skipped', 'preference_disabled');
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

  const { data: subscriptions, error: subscriptionError } = await supabaseAdmin
    .from('push_subscriptions')
    .select('endpoint, subscription_details')
    .eq('user_id', event.recipientId);

  if (subscriptionError) throw subscriptionError;

  if (!subscriptions?.length) {
    const claimed = await claimDelivery(supabaseAdmin, event);
    if (claimed) await finishDelivery(supabaseAdmin, event, 'skipped', 'no_subscription');
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

  ensureVapidConfigured();

  const claimed = await claimDelivery(supabaseAdmin, event);
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

  let delivered = 0;
  let failed = 0;

  await Promise.all(
    subscriptions.map(async (row: any) => {
      const subscription = row.subscription_details;
      try {
        await webpush.sendNotification(subscription, payload);
        delivered += 1;
      } catch (error: any) {
        if (error?.statusCode === 404 || error?.statusCode === 410) {
          await supabaseAdmin.from('push_subscriptions').delete().eq('endpoint', row.endpoint);
          return;
        }
        failed += 1;
        console.error('Web Push delivery failed:', error);
      }
    }),
  );

  if (delivered > 0) {
    await finishDelivery(supabaseAdmin, event, 'sent');
  } else if (failed > 0) {
    await finishDelivery(supabaseAdmin, event, 'failed', 'provider_error');
  } else {
    await finishDelivery(supabaseAdmin, event, 'skipped', 'stale_subscriptions');
  }

  return {
    success: true,
    eventType: event.eventType,
    eventId: event.eventId,
    recipientId: event.recipientId,
    delivered,
    skipped: delivered === 0 || undefined,
  };
}
