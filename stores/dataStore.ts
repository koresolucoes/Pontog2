// stores/dataStore.ts
import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { Tribe } from '../types';

interface DataState {
  tribes: Tribe[];
  fetchTribes: () => Promise<void>;
}

export const useDataStore = create<DataState>((set) => ({
  tribes: [],
  fetchTribes: async () => {
    const { data, error } = await supabase
      .from('tribes')
      .select('id, name')
      .order('name');
    
    if (error) {
      console.error('Error fetching tribes:', error);
    } else {
      set({ tribes: data });
    }
  },
}));