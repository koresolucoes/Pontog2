import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import type { Coordinates } from '../types';

export type EventAttendanceStatus = 'interested' | 'going';

export interface EventFeedItem {
  id: string;
  venue_id: string | null;
  title: string;
  description: string | null;
  cover_image_url: string | null;
  category: string;
  start_time: string;
  end_time: string | null;
  location_name: string | null;
  lat: number | null;
  lng: number | null;
  venue_name: string | null;
  source_url: string | null;
  tags: string[];
  interested_count: number;
  going_count: number;
  here_now_count: number;
}

export interface EventAttendeePreview {
  user_id: string;
  username: string;
  avatar_url: string;
  attendance_status: EventAttendanceStatus;
  is_checked_in: boolean;
  checked_in_at: string | null;
}

interface EventState {
  events: EventFeedItem[];
  selectedEvent: EventFeedItem | null;
  attendees: Record<string, EventAttendeePreview[]>;
  myAttendance: Record<string, EventAttendanceStatus | null>;
  loading: boolean;
  actionBusy: boolean;
  error: string | null;
  lastFetchAt: number;
  setSelectedEvent: (event: EventFeedItem | null) => void;
  fetchEvents: (coords?: Coordinates | null, force?: boolean) => Promise<void>;
  fetchVenueEvents: (venueId: string) => Promise<EventFeedItem[]>;
  fetchAttendees: (eventId: string) => Promise<EventAttendeePreview[]>;
  hydrateMyAttendance: (eventIds: string[]) => Promise<void>;
  setAttendance: (eventId: string, status: EventAttendanceStatus | null) => Promise<boolean>;
  setEventCheckin: (eventId: string, active: boolean) => Promise<boolean>;
}

const asCount = (value: unknown) => Number(value || 0);
const mapEvent = (row: any): EventFeedItem => ({
  id: row.id,
  venue_id: row.venue_id ?? null,
  title: row.title,
  description: row.description ?? null,
  cover_image_url: row.cover_image_url ?? null,
  category: row.category || 'other',
  start_time: row.start_time,
  end_time: row.end_time ?? null,
  location_name: row.location_name ?? row.venue_name ?? null,
  lat: Number.isFinite(Number(row.lat)) ? Number(row.lat) : null,
  lng: Number.isFinite(Number(row.lng)) ? Number(row.lng) : null,
  venue_name: row.venue_name ?? null,
  source_url: row.source_url ?? null,
  tags: Array.isArray(row.tags) ? row.tags : [],
  interested_count: asCount(row.interested_count),
  going_count: asCount(row.going_count),
  here_now_count: asCount(row.here_now_count),
});

export const useEventStore = create<EventState>((set, get) => ({
  events: [],
  selectedEvent: null,
  attendees: {},
  myAttendance: {},
  loading: false,
  actionBusy: false,
  error: null,
  lastFetchAt: 0,

  setSelectedEvent: (selectedEvent) => set({ selectedEvent }),

  fetchEvents: async (coords = null, force = false) => {
    const now = Date.now();
    if (!force && get().events.length > 0 && now - get().lastFetchAt < 60000) return;
    set({ loading: true, error: null });

    const { data, error } = await supabase.rpc('get_event_feed_v1', {
      p_lat: coords?.lat ?? null,
      p_lng: coords?.lng ?? null,
      p_limit: 60,
    });

    if (error) {
      console.error('Event feed unavailable:', error);
      set({ loading: false, error: 'Não foi possível carregar os eventos agora.' });
      return;
    }

    const events = (data || []).map(mapEvent);
    set({ events, loading: false, lastFetchAt: now });
    void get().hydrateMyAttendance(events.map((event) => event.id));
  },

  fetchVenueEvents: async (venueId) => {
    const { data, error } = await supabase.rpc('get_venue_events_v1', {
      p_venue_id: venueId,
      p_limit: 12,
    });
    if (error) {
      console.warn('Venue events unavailable:', error);
      return [];
    }

    const venueEvents = (data || []).map((row: any) => mapEvent({ ...row, location_name: null, lat: null, lng: null, venue_name: null }));
    set((state) => {
      const merged = new Map(state.events.map((event) => [event.id, event]));
      venueEvents.forEach((event) => merged.set(event.id, { ...merged.get(event.id), ...event } as EventFeedItem));
      return { events: Array.from(merged.values()) };
    });
    void get().hydrateMyAttendance(venueEvents.map((event) => event.id));
    return venueEvents;
  },

  fetchAttendees: async (eventId) => {
    const { data, error } = await supabase.rpc('get_event_attendees_v1', { p_event_id: eventId });
    if (error) {
      console.warn('Event attendees unavailable:', error);
      set((state) => ({ attendees: { ...state.attendees, [eventId]: [] } }));
      return [];
    }
    const attendees = (data || []).map((row: any) => ({
      user_id: row.user_id,
      username: row.username || 'Pessoa',
      avatar_url: row.avatar_url || '',
      attendance_status: row.attendance_status as EventAttendanceStatus,
      is_checked_in: Boolean(row.is_checked_in),
      checked_in_at: row.checked_in_at ?? null,
    }));
    set((state) => ({ attendees: { ...state.attendees, [eventId]: attendees } }));
    return attendees;
  },

  hydrateMyAttendance: async (eventIds) => {
    if (!eventIds.length) return;
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData.session?.user?.id;
    if (!userId) return;

    const { data, error } = await supabase
      .from('event_attendees')
      .select('event_id,status')
      .eq('user_id', userId)
      .in('event_id', eventIds);
    if (error) return;

    set((state) => {
      const next = { ...state.myAttendance };
      eventIds.forEach((id) => { next[id] = null; });
      (data || []).forEach((row: any) => { next[row.event_id] = row.status as EventAttendanceStatus; });
      return { myAttendance: next };
    });
  },

  setAttendance: async (eventId, status) => {
    if (get().actionBusy) return false;
    set({ actionBusy: true });
    const previous = get().myAttendance[eventId] ?? null;
    set((state) => ({ myAttendance: { ...state.myAttendance, [eventId]: status } }));

    const { error } = await supabase.rpc('set_my_event_attendance_v1', {
      p_event_id: eventId,
      p_status: status,
    });

    if (error) {
      console.error('Event attendance failed:', error);
      set((state) => ({ actionBusy: false, myAttendance: { ...state.myAttendance, [eventId]: previous } }));
      return false;
    }

    set({ actionBusy: false });
    await get().fetchEvents(null, true);
    await get().fetchAttendees(eventId);
    return true;
  },

  setEventCheckin: async (eventId, active) => {
    if (get().actionBusy) return false;
    set({ actionBusy: true });
    const { error } = await supabase.rpc('set_my_event_checkin_v1', {
      p_event_id: eventId,
      p_active: active,
    });
    if (error) {
      console.error('Event check-in failed:', error);
      set({ actionBusy: false });
      return false;
    }

    set({ actionBusy: false });
    await Promise.all([
      get().fetchEvents(null, true),
      get().fetchAttendees(eventId),
    ]);
    return true;
  },
}));
