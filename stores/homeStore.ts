// stores/homeStore.ts
import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { User } from '../types';
import { transformProfileToUser } from '../lib/utils';

const USERS_PER_PAGE = 21;

interface HomeState {
  popularUsers: User[];
  loading: boolean;
  error: string | null;
  currentPage: number;
  hasMore: boolean;
  loadingMore: boolean;
  fetchPopularUsers: () => Promise<void>;
  fetchMorePopularUsers: () => Promise<void>;
}

export const useHomeStore = create<HomeState>((set, get) => ({
  popularUsers: [],
  loading: true,
  error: null,
  currentPage: 0,
  hasMore: true,
  loadingMore: false,

  fetchPopularUsers: async () => {
    set({ loading: true, error: null, popularUsers: [], currentPage: 0, hasMore: true });
    
    const myLocation = (await import('./mapStore')).useMapStore.getState().myLocation;
    if (!myLocation) {
        console.warn("Cannot fetch popular users without location.");
        set({ loading: false, error: "Sua localização é necessária para ver os perfis." });
        return;
    }
    
    const { data, error } = await supabase.rpc('get_popular_profiles_paginated', {
        p_lat: myLocation.lat,
        p_lng: myLocation.lng,
        p_limit: USERS_PER_PAGE,
        p_offset: 0
    });

    if (error) {
        console.error("Error fetching popular users:", error);
        set({ error: "Erro ao buscar perfis populares.", loading: false });
        return;
    }

    if (data) {
        
        const userIds = data.map((u: any) => u.id);
        const { data: profilesData } = await supabase.from('profiles').select('id, current_checkin_venue_id, current_checkin_venue_name, looking_for, kinks').in('id', userIds);
        
        const profilesMap = new Map();
        if (profilesData) {
            profilesData.forEach((p: any) => profilesMap.set(p.id, p));
        }

        const transformedUsers = data.map((profile: any) => {
           const p = profilesMap.get(profile.id);
           if (p) {
               profile.current_checkin_venue_id = p.current_checkin_venue_id;
               profile.current_checkin_venue_name = p.current_checkin_venue_name;
               profile.looking_for = p.looking_for || profile.looking_for;
               profile.kinks = p.kinks || profile.kinks;
           }
           return transformProfileToUser(profile);
        });

        set({ 
            popularUsers: transformedUsers, 
            loading: false, 
            currentPage: 1,
            hasMore: transformedUsers.length === USERS_PER_PAGE
        });
    }
  },

  fetchMorePopularUsers: async () => {
      const { currentPage, hasMore, popularUsers, loadingMore } = get();
      if (!hasMore || loadingMore) return;

      set({ loadingMore: true });
      const myLocation = (await import('./mapStore')).useMapStore.getState().myLocation;
      if (!myLocation) {
          set({ loadingMore: false });
          return;
      }

      const { data, error } = await supabase.rpc('get_popular_profiles_paginated', {
        p_lat: myLocation.lat,
        p_lng: myLocation.lng,
        p_limit: USERS_PER_PAGE,
        p_offset: currentPage * USERS_PER_PAGE
      });
      
      if (error) {
          console.error("Error fetching more popular users:", error);
          set({ loadingMore: false }); // Stop trying on error
          return;
      }

      if (data) {
          
        const userIds = data.map((u: any) => u.id);
        const { data: profilesData } = await supabase.from('profiles').select('id, current_checkin_venue_id, current_checkin_venue_name, looking_for, kinks').in('id', userIds);
        
        const profilesMap = new Map();
        if (profilesData) {
            profilesData.forEach((p: any) => profilesMap.set(p.id, p));
        }

        const newUsers = data.map((profile: any) => {
           const p = profilesMap.get(profile.id);
           if (p) {
               profile.current_checkin_venue_id = p.current_checkin_venue_id;
               profile.current_checkin_venue_name = p.current_checkin_venue_name;
               profile.looking_for = p.looking_for || profile.looking_for;
               profile.kinks = p.kinks || profile.kinks;
           }
           return transformProfileToUser(profile);
        });

          set({
              popularUsers: [...popularUsers, ...newUsers],
              currentPage: currentPage + 1,
              hasMore: newUsers.length === USERS_PER_PAGE,
              loadingMore: false
          });
      } else {
          set({ loadingMore: false, hasMore: false });
      }
  }
}));
