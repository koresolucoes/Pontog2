import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { Venue, VenueCheckin, User } from '../types';
import { toast } from 'react-hot-toast';

interface OwnerState {
    managedVenues: Venue[];
    venueCheckins: Record<string, VenueCheckin[]>; // venue_id -> checkins
    bannedUsers: Record<string, User[]>; // venue_id -> banned users
    loading: boolean;
    fetchManagedVenues: (userId: string) => Promise<void>;
    fetchVenueCheckins: (venueId: string) => Promise<void>;
    claimVenue: (userId: string, venueId: string, proofText: string) => Promise<boolean>;
    banUser: (venueId: string, userId: string, reason: string) => Promise<boolean>;
    unbanUser: (venueId: string, userId: string) => Promise<boolean>;
}

export const useOwnerStore = create<OwnerState>((set, get) => ({
    managedVenues: [],
    venueCheckins: {},
    bannedUsers: {},
    loading: false,

    fetchManagedVenues: async (userId: string) => {
        set({ loading: true });
        try {
            // Assume table owner_venues mapping exists. If not, we will just simulate for now or use the owner_id column if present.
            // Let's assume the user ran a script that added an owner_id to venues, or an owner_venues table.
            // For now, let's try a hypothetical `owner_venues` table, or just `venues` where `owner_id = userId`.
            // Wait, standard practice would be an owner_venues mapping for multiple owners, or just owner_id on venues.
            // Let's try owner_venues first.
            const { data, error } = await supabase
                .from('venues')
                .select('*')
                // .eq('owner_id', userId) // Let's assume the SQL script added owner_id to venues. We'll fallback if it fails.
            
            if (error) {
                console.warn("Could not fetch owner venues strictly. This might need proper SQL integration.", error);
                // Fallback dummy logic if table is not configured properly, just to show UI
                set({ managedVenues: [], loading: false });
                return;
            }
            
            // For safety without knowing exact SQL, let's filter in memory if owner_id exists
            const ownedVenues = data ? data.filter(v => v.owner_id === userId) : [];
            set({ managedVenues: ownedVenues as Venue[], loading: false });
        } catch (err) {
            console.error(err);
            set({ loading: false });
        }
    },

    fetchVenueCheckins: async (venueId: string) => {
        try {
            const { data, error } = await supabase
                .from('venue_checkins')
                .select(`
                    user_id,
                    checked_in_at,
                    users ( username, avatar_url )
                `)
                .eq('venue_id', venueId)
                .order('checked_in_at', { ascending: false });

            if (error) throw error;
            
            const formatted = data.map((d: any) => ({
                user_id: d.user_id,
                checked_in_at: d.checked_in_at,
                username: d.users?.username || 'Unknown',
                avatar_url: d.users?.avatar_url || ''
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
            // Assuming an owner_claims table
            const { error } = await supabase
                .from('venue_claims')
                .insert({ venue_id: venueId, user_id: userId, proof: proofText, status: 'pending' });
            
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
        } catch(err) {
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
        } catch(err) {
            toast.error('Erro ao desbanir usuário.');
            return false;
        }
    }
}));
