import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { Venue, VenueCheckin, User } from '../types';
import { toast } from 'react-hot-toast';
import { useAuthStore } from './authStore';

interface OwnerState {
    managedVenues: Venue[];
    venueCheckins: Record<string, VenueCheckin[]>;
    bannedUsers: Record<string, User[]>;
    loading: boolean;
    fetchManagedVenues: (userId: string) => Promise<void>;
    fetchVenueCheckins: (venueId: string) => Promise<void>;
    claimVenue: (userId: string, venueId: string, proofText: string) => Promise<boolean>;
    banUser: (venueId: string, userId: string, reason: string) => Promise<boolean>;
    unbanUser: (venueId: string, userId: string) => Promise<boolean>;
    updateVenue: (venueId: string, updates: Partial<Venue>) => Promise<boolean>;
    sendPromotion: (venueId: string, title: string, message: string, imageUrl?: string) => Promise<boolean>;
}

export const useOwnerStore = create<OwnerState>((set) => ({
    managedVenues: [],
    venueCheckins: {},
    bannedUsers: {},
    loading: false,

    fetchManagedVenues: async (userId: string) => {
        set({ loading: true });
        try {
            const { data, error } = await supabase
                .from('venues')
                .select('*')
                .eq('owner_id', userId)
                .order('name', { ascending: true });

            if (error) throw error;
            set({ managedVenues: (data || []) as Venue[], loading: false });
        } catch (err) {
            console.error('Could not fetch owner venues:', err);
            set({ managedVenues: [], loading: false });
        }
    },

    fetchVenueCheckins: async (venueId: string) => {
        try {
            const { data, error } = await supabase
                .from('venue_checkins')
                .select(`
                    user_id,
                    created_at,
                    profiles ( username, avatar_url )
                `)
                .eq('venue_id', venueId)
                .order('created_at', { ascending: false });

            if (error) throw error;

            const formatted = (data || []).map((d: any) => ({
                user_id: d.user_id,
                checked_in_at: d.created_at,
                username: d.profiles?.username || 'Unknown',
                avatar_url: d.profiles?.avatar_url || ''
            }));

            set(state => ({
                venueCheckins: { ...state.venueCheckins, [venueId]: formatted }
            }));
        } catch (err) {
            console.error(err);
        }
    },

    claimVenue: async (userId: string, venueId: string, proofText: string) => {
        try {
            const authenticatedUser = useAuthStore.getState().user;
            if (!authenticatedUser || authenticatedUser.id !== userId) {
                toast.error('Sessão inválida. Entre novamente.');
                return false;
            }

            const { error } = await supabase
                .from('venue_claims')
                .insert({
                    venue_id: venueId,
                    user_id: authenticatedUser.id,
                    message: proofText.trim(),
                    status: 'pending'
                });

            if (error) {
                toast.error('Erro ao enviar reivindicação. Tente novamente.');
                return false;
            }
            toast.success('Reivindicação enviada com sucesso. Nossa equipe analisará em breve.');
            return true;
        } catch (err) {
            toast.error('Erro de conexão.');
            return false;
        }
    },

    banUser: async (venueId: string, userId: string, reason: string) => {
        try {
            const { error } = await supabase
                .from('venue_bans')
                .insert({ venue_id: venueId, user_id: userId, reason });

            if (error) throw error;
            toast.success('Usuário banido do local.');
            return true;
        } catch (err) {
            toast.error('Erro ao banir usuário.');
            return false;
        }
    },

    unbanUser: async (venueId: string, userId: string) => {
        try {
            const { error } = await supabase
                .from('venue_bans')
                .delete()
                .match({ venue_id: venueId, user_id: userId });

            if (error) throw error;
            toast.success('Usuário desbanido.');
            return true;
        } catch (err) {
            toast.error('Erro ao desbanir usuário.');
            return false;
        }
    },

    updateVenue: async (venueId: string, updates: Partial<Venue>) => {
        try {
            const { error } = await supabase
                .from('venues')
                .update(updates)
                .eq('id', venueId);

            if (error) throw error;

            set(state => ({
                managedVenues: state.managedVenues.map(v => v.id === venueId ? { ...v, ...updates } as Venue : v)
            }));

            toast.success('Perfil do local atualizado.');
            return true;
        } catch (err) {
            toast.error('Erro ao atualizar local.');
            return false;
        }
    },

    sendPromotion: async (venueId: string, title: string, message: string, imageUrl?: string) => {
        try {
            const user = useAuthStore.getState().user;
            const session = useAuthStore.getState().session;
            if (!user || !session?.access_token) return false;

            const response = await fetch('/api/owner/send-promo', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`
                },
                body: JSON.stringify({ venueId, title, message, imageUrl })
            });

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(errData.error || 'Falha ao enviar');
            }

            toast.success('Promoção enviada aos clientes!');
            return true;
        } catch (err: any) {
            toast.error(err.message || 'Erro ao enviar promoção.');
            return false;
        }
    }
}));
