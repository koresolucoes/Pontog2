

import { create } from 'zustand';
import { User } from '../types';

export type View = 'home' | 'map' | 'grid' | 'inbox' | 'profile' | 'agora' | 'news' | 'communities';

interface UiState {
  activeView: View;
  chatUser: User | null;
  isSubscriptionModalOpen: boolean;
  isDonationModalOpen: boolean;
  isSidebarOpen: boolean;
  isSuggestVenueModalOpen: boolean; // New state
  setActiveView: (view: View) => void;
  setChatUser: (user: User | null) => void;
  setSubscriptionModalOpen: (isOpen: boolean) => void;
  setDonationModalOpen: (isOpen: boolean) => void;
  setSidebarOpen: (isOpen: boolean) => void;
  setSuggestVenueModalOpen: (isOpen: boolean) => void; // New action
}

export const useUiStore = create<UiState>((set) => ({
  activeView: 'home',
  chatUser: null,
  isSubscriptionModalOpen: false,
  isDonationModalOpen: false,
  isSidebarOpen: false,
  isSuggestVenueModalOpen: false,
  setActiveView: (view) => set({ activeView: view }),
  setChatUser: (user) => {
      if (user) {
          import('./mapStore').then(({ useMapStore }) => {
            useMapStore.getState().setSelectedUser(null);
          });
      }
      set({ chatUser: user })
  },
  setSubscriptionModalOpen: (isOpen) => set({ isSubscriptionModalOpen: isOpen }),
  setDonationModalOpen: (isOpen) => set({ isDonationModalOpen: isOpen }),
  setSidebarOpen: (isOpen) => set({ isSidebarOpen: isOpen }),
  setSuggestVenueModalOpen: (isOpen) => set({ isSuggestVenueModalOpen: isOpen }),
}));