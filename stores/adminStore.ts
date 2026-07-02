// stores/adminStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import toast from 'react-hot-toast';

interface AdminState {
  isAdminAuthenticated: boolean;
  token: string | null;
  login: (apiKey: string) => Promise<boolean>;
  logout: () => void;
  getToken: () => string | null;
}

export const useAdminStore = create<AdminState>()(
  persist(
    (set, get) => ({
      isAdminAuthenticated: false,
      token: null,
      
      login: async (apiKey: string) => {
        try {
          const response = await fetch('/api/admin-login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ apiKey }),
          });
          
          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Chave inválida.');
          }

          const { token } = await response.json();
          set({ isAdminAuthenticated: true, token });
          toast.success('Login bem-sucedido!');
          return true;
        } catch (error: any) {
          toast.error(error.message);
          return false;
        }
      },
      
      logout: () => {
        set({ isAdminAuthenticated: false, token: null });
        window.location.href = '/admin';
      },

      getToken: () => {
        return get().token;
      },
    }),
    {
      name: 'admin-auth-storage', // name of the item in the storage (must be unique)
    }
  )
);
