// stores/planStore.ts
import { create } from 'zustand';
import { supabase } from '../lib/supabase';

interface Plan {
    id: string;
    name: string;
    price: number;
    perMonth: number;
    popular: boolean;
    discount: string | null;
    months_duration: number;
}

interface PlanState {
  plans: Plan[];
  loading: boolean;
  fetchPlans: () => Promise<void>;
}

export const usePlanStore = create<PlanState>((set) => ({
  plans: [],
  loading: true,
  fetchPlans: async () => {
    set({ loading: true });
    try {
      const { data, error } = await supabase.rpc('get_active_plans');
      if (error) throw error;
      set({ plans: data || [], loading: false });
    } catch (error) {
      console.error('Error fetching plans:', error);
      set({ loading: false });
    }
  },
}));