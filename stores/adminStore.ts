// stores/adminStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import toast from 'react-hot-toast';

export interface AdminUser {
  email: string;
  role: 'owner' | 'moderator' | 'support' | 'financial';
  name: string;
}

interface AdminState {
  isAdminAuthenticated: boolean;
  token: string | null;
  adminUser: AdminUser | null;
  login: (emailOrKey: string, password?: string) => Promise<boolean>;
  logout: () => void;
  getToken: () => string | null;
}

export const useAdminStore = create<AdminState>()(
  persist(
    (set, get) => ({
      isAdminAuthenticated: false,
      token: null,
      adminUser: null,
      
      login: async (emailOrKey: string, password?: string) => {
        try {
          const bodyPayload: any = {};
          
          if (password) {
            bodyPayload.email = emailOrKey;
            bodyPayload.password = password;
          } else {
            bodyPayload.apiKey = emailOrKey;
          }

          const response = await fetch('/api/admin-login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(bodyPayload),
          });
          
          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Chave ou credenciais inválidas.');
          }

          const { token, adminUser } = await response.json();
          set({ isAdminAuthenticated: true, token, adminUser });
          toast.success(`Bem-vindo, ${adminUser?.name || 'Administrador'}!`);
          return true;
        } catch (error: any) {
          toast.error(error.message);
          return false;
        }
      },
      
      logout: () => {
        set({ isAdminAuthenticated: false, token: null, adminUser: null });
        window.location.href = '/admin';
      },

      getToken: () => {
        return get().token;
      },
    }),
    {
      name: 'admin-auth-storage',
    }
  )
);
