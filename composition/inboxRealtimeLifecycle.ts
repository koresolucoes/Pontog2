import { supabase } from '../lib/supabase';
import { useInboxStore } from '../stores/inboxStore';
import { useInboxActivityReadStore } from '../stores/inboxActivityReadStore';

const MAX_CONVERSATIONS_PER_FILTER = 100;
const CONVERSATION_REFRESH_DEBOUNCE_MS = 350;

let activeUserId: string | null = null;
let lifecycleGeneration = 0;
let inboxChannel: any | null = null;
let messageChannels: any[] = [];
let conversationRefreshTimer: ReturnType<typeof setTimeout> | null = null;
let conversationChannelRebuildTimer: ReturnType<typeof setTimeout> | null = null;

function chunk<T>(values: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let index = 0; index < values.length; index += size) {
    chunks.push(values.slice(index, index + size));
  }
  return chunks;
}

function scheduleConversationRefresh() {
  if (conversationRefreshTimer) clearTimeout(conversationRefreshTimer);
  conversationRefreshTimer = setTimeout(() => {
    conversationRefreshTimer = null;
    void useInboxStore.getState().fetchConversations(true);
  }, CONVERSATION_REFRESH_DEBOUNCE_MS);
}

function refreshWinks() {
  void Promise.all([
    useInboxStore.getState().fetchWinks(true),
    useInboxActivityReadStore.getState().fetchUnreadCounts(true),
  ]);
}

function refreshProfileViews() {
  void Promise.all([
    useInboxStore.getState().fetchProfileViews(true),
    useInboxActivityReadStore.getState().fetchUnreadCounts(true),
  ]);
}

async function removeMessageChannels() {
  const channels = messageChannels;
  messageChannels = [];
  await Promise.all(channels.map((channel) => supabase.removeChannel(channel)));
}

async function rebuildMessageChannels(userId: string, generation: number) {
  const { data, error } = await supabase
    .from('conversation_participants')
    .select('conversation_id')
    .eq('user_id', userId);

  if (generation !== lifecycleGeneration || userId !== activeUserId) return;

  if (error) {
    console.error('Failed to load inbox conversation ids for realtime:', error);
    return;
  }

  const conversationIds = Array.from(
    new Set((data || []).map((row: any) => Number(row.conversation_id)).filter(Number.isSafeInteger)),
  );

  await removeMessageChannels();
  if (generation !== lifecycleGeneration || userId !== activeUserId) return;

  chunk(conversationIds, MAX_CONVERSATIONS_PER_FILTER).forEach((conversationIdChunk, index) => {
    if (conversationIdChunk.length === 0) return;

    const filter = `conversation_id=in.(${conversationIdChunk.join(',')})`;
    const channel = supabase
      .channel(`inbox:messages:${userId}:${index}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter },
        scheduleConversationRefresh,
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'messages', filter },
        scheduleConversationRefresh,
      )
      .subscribe();

    messageChannels.push(channel);
  });
}

function scheduleMessageChannelRebuild(userId: string, generation: number) {
  if (conversationChannelRebuildTimer) clearTimeout(conversationChannelRebuildTimer);
  conversationChannelRebuildTimer = setTimeout(() => {
    conversationChannelRebuildTimer = null;
    void rebuildMessageChannels(userId, generation);
  }, 250);
}

export async function disposeInboxRealtime() {
  lifecycleGeneration += 1;
  activeUserId = null;

  if (conversationRefreshTimer) clearTimeout(conversationRefreshTimer);
  if (conversationChannelRebuildTimer) clearTimeout(conversationChannelRebuildTimer);
  conversationRefreshTimer = null;
  conversationChannelRebuildTimer = null;

  const baseChannel = inboxChannel;
  inboxChannel = null;

  await Promise.all([
    baseChannel ? supabase.removeChannel(baseChannel) : Promise.resolve(),
    removeMessageChannels(),
  ]);

  useInboxActivityReadStore.getState().reset();
}

export async function mountInboxRealtime(userId: string) {
  if (activeUserId === userId && inboxChannel) return;

  await disposeInboxRealtime();
  const generation = lifecycleGeneration;
  activeUserId = userId;

  // Remove any channel created by the legacy inboxStore lifecycle during a hot update/session handoff.
  useInboxStore.getState().cleanupRealtime();

  inboxChannel = supabase
    .channel(`inbox:events:${userId}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'winks', filter: `receiver_id=eq.${userId}` },
      refreshWinks,
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'private_album_access', filter: `owner_id=eq.${userId}` },
      () => void useInboxStore.getState().fetchAccessRequests(true),
    )
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'profile_views', filter: `viewed_id=eq.${userId}` },
      refreshProfileViews,
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'user_connections', filter: `following_id=eq.${userId}` },
      () => void useInboxStore.getState().fetchMessageRequests(true),
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'inbox_activity_read_state', filter: `user_id=eq.${userId}` },
      () => void useInboxActivityReadStore.getState().fetchUnreadCounts(true),
    )
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'conversation_participants', filter: `user_id=eq.${userId}` },
      () => {
        scheduleMessageChannelRebuild(userId, generation);
        scheduleConversationRefresh();
      },
    )
    .subscribe();

  await Promise.all([
    rebuildMessageChannels(userId, generation),
    useInboxActivityReadStore.getState().fetchUnreadCounts(true),
  ]);
}
