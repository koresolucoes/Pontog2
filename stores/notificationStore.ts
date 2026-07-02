// stores/notificationStore.ts
import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { NotificationPreference, NotificationType } from '../types';
import toast from 'react-hot-toast';

interface NotificationState {
  preferences: NotificationPreference[];
  loading: boolean;
  fetchPreferences: () => Promise<void>;
  updatePreference: (type: NotificationType, enabled: boolean) => Promise<void>;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  preferences: [],
  loading: false,

  fetchPreferences: async () => {
    set({ loading: true });
    const { data, error } = await supabase
      .from('notification_preferences')
      .select('notification_type, enabled');

    if (error) {
      console.error('Error fetching notification preferences:', error);
      toast.error('Não foi possível carregar as preferências de notificação.');
    } else {
      set({ preferences: data as NotificationPreference[] });
    }
    set({ loading: false });
  },

  updatePreference: async (type: NotificationType, enabled: boolean) => {
    // Optimistic update
    set(state => ({
      preferences: state.preferences.map(p => 
        p.notification_type === type ? { ...p, enabled } : p
      ),
    }));

    const { error } = await supabase
      .from('notification_preferences')
      .update({ enabled })
      .eq('notification_type', type);

    if (error) {
      toast.error(`Erro ao atualizar a preferência de ${type}.`);
      console.error('Error updating preference:', error);
      // Revert optimistic update on failure
      get().fetchPreferences(); 
    }
  },
}));