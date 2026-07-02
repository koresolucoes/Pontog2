import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { Event, EventAttendee } from '../types';

interface EventState {
    events: Event[];
    myEvents: Event[];
    loading: boolean;
    error: string | null;
    
    // Actions
    fetchEvents: () => Promise<void>;
    fetchMyEvents: () => Promise<void>;
    createEvent: (data: Partial<Event>) => Promise<Event | null>;
    attendEvent: (eventId: string, status: 'interested' | 'going') => Promise<void>;
    unattendEvent: (eventId: string) => Promise<void>;
}

export const useEventStore = create<EventState>((set, get) => ({
    events: [],
    myEvents: [],
    loading: false,
    error: null,

    fetchEvents: async () => {
        set({ loading: true, error: null });
        try {
            const { data, error } = await supabase
                .from('events')
                .select('*, organizer:profiles(*)')
                .order('start_time', { ascending: true })
                .gte('start_time', new Date().toISOString()); // Only upcoming events
                
            if (error) throw error;
            set({ events: data as any[] });
        } catch (error: any) {
            console.error('Error fetching events:', error);
            set({ error: error.message });
        } finally {
            set({ loading: false });
        }
    },

    fetchMyEvents: async () => {
        set({ loading: true, error: null });
        const { data: userData } = await supabase.auth.getUser();
        if (!userData.user) return set({ loading: false });
        
        try {
            const { data, error } = await supabase
                .from('event_attendees')
                .select('event_id, status, events(*, organizer:profiles(*))')
                .eq('user_id', userData.user.id);
                
            if (error) throw error;
            const myEvts = data.map((d: any) => ({...d.events, attendeeStatus: d.status})) as any[];
            set({ myEvents: myEvts });
        } catch (error: any) {
            console.error('Error fetching my events:', error);
            set({ error: error.message });
        } finally {
            set({ loading: false });
        }
    },

    createEvent: async (data: Partial<Event>) => {
        set({ loading: true, error: null });
        const { data: userData } = await supabase.auth.getUser();
        if (!userData.user) return null;
        
        try {
            const { data: newEvent, error } = await supabase
                .from('events')
                .insert({ ...data, organizer_id: userData.user.id })
                .select()
                .single();
                
            if (error) throw error;
            
            // Auto attend creator as 'going'
            await supabase.from('event_attendees').insert({
                event_id: newEvent.id,
                user_id: userData.user.id,
                status: 'going'
            });
            
            set(state => ({ events: [...state.events, newEvent] }));
            get().fetchMyEvents();
            return newEvent as Event;
        } catch (error: any) {
            console.error('Error creating event:', error);
            set({ error: error.message });
            return null;
        } finally {
            set({ loading: false });
        }
    },

    attendEvent: async (eventId: string, status: 'interested' | 'going') => {
        const { data: userData } = await supabase.auth.getUser();
        if (!userData.user) return;
        try {
            const { error } = await supabase
                .from('event_attendees')
                .upsert({ event_id: eventId, user_id: userData.user.id, status });
            if (error) throw error;
            get().fetchMyEvents();
        } catch (error: any) {
            console.error('Error attending event:', error);
        }
    },

    unattendEvent: async (eventId: string) => {
        const { data: userData } = await supabase.auth.getUser();
        if (!userData.user) return;
        try {
            const { error } = await supabase
                .from('event_attendees')
                .delete()
                .eq('event_id', eventId)
                .eq('user_id', userData.user.id);
            if (error) throw error;
            get().fetchMyEvents();
        } catch (error: any) {
            console.error('Error unattending event:', error);
        }
    }
}));
