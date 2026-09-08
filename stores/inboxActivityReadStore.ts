import { create } from 'zustand';
import { supabase } from '../lib/supabase';

export type InboxActivityKind = 'winks' | 'profile_views';

interface InboxActivityReadState {
  unreadWinksCount: number;
  unreadProfileViewsCount: number;
  loading: boolean;
  lastFetch: number;
  fetchUnreadCounts: (force?: boolean) => Promise<void>;
  markSeen: (kind: InboxActivityKind) => Promise<void>;
  reset: () => void;
}

const normalizeCount = (value: unknown): number => {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 0;
};

export const useInboxActivityReadStore = create<InboxActivityReadState>((set, get) => ({
  unreadWinksCount: 0,
  unreadProfileViewsCount: 0,
  loading: false,
  lastFetch: 0,

  fetchUnreadCounts: async (force = false) => {
    const now = Date.now();
    if (!force && now - get().lastFetch < 15_000) return;

    set({ loading: true });
    const { data, error } = await supabase.rpc('get_inbox_activity_unread_v1');
    if (error) {
      console.error('Error fetching inbox activity unread counts:', error);
      set({ loading: false });
      return;
    }

    const row = Array.isArray(data) ? data[0] : data;
    set({
      unreadWinksCount: normalizeCount(row?.winks_unread),
      unreadProfileViewsCount: normalizeCount(row?.profile_views_unread),
      loading: false,
      lastFetch: now,
    });
  },

  markSeen: async (kind) => {
    const previous = kind === 'winks' ? get().unreadWinksCount : get().unreadProfileViewsCount;
    if (previous <= 0) return;

    // Immediate UI convergence; backend remains the source of truth and rolls back on failure.
    if (kind === 'winks') set({ unreadWinksCount: 0 });
    else set({ unreadProfileViewsCount: 0 });

    const { error } = await supabase.rpc('mark_inbox_activity_seen_v1', { p_kind: kind });
    if (error) {
      console.error(`Error marking ${kind} as seen:`, error);
      if (kind === 'winks') set({ unreadWinksCount: previous });
      else set({ unreadProfileViewsCount: previous });
      return;
    }

    // Re-read to close races with an event inserted while the mark operation was in flight.
    set({ lastFetch: 0 });
    await get().fetchUnreadCounts(true);
  },

  reset: () => set({
    unreadWinksCount: 0,
    unreadProfileViewsCount: 0,
    loading: false,
    lastFetch: 0,
  }),
}));
