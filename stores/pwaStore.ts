import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

// Define o tipo do evento, pois ele ainda não é padrão na lib.dom.d.ts do TS
interface BeforeInstallPromptEvent extends Event {
  readonly platforms: Array<string>;
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

// Helper para converter a VAPID key
function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}


interface PwaState {
  installPromptEvent: BeforeInstallPromptEvent | null;
  setInstallPromptEvent: (event: BeforeInstallPromptEvent | null) => void;
  triggerInstall: () => void;
  // Novas propriedades de estado para Push Notifications
  pushState: 'unsupported' | 'denied' | 'prompt' | 'granted';
  isSubscribing: boolean;
  checkPushSupport: () => Promise<void>;
  subscribeToPushNotifications: () => void;
  unlinkSubscriptionOnLogout: () => Promise<void>;
  relinkSubscriptionOnLogin: () => Promise<void>;
}

const log = {
    info: (message: string, data?: any) => console.log(`[PWA_STORE] INFO: ${message}`, data || ''),
    error: (message: string, error?: any) => console.error(`[PWA_STORE] ERROR: ${message}`, error || ''),
};

export const usePwaStore = create<PwaState>((set, get) => ({
  installPromptEvent: null,
  pushState: 'prompt',
  isSubscribing: false,
  
  setInstallPromptEvent: (event) => set({ installPromptEvent: event }),

  triggerInstall: async () => {
    const { installPromptEvent } = get();
    if (!installPromptEvent) {
      log.info('O prompt de instalação do PWA não está disponível.');
      return;
    }
    
    installPromptEvent.prompt();
    const { outcome } = await installPromptEvent.userChoice;
    log.info(`Resposta do usuário ao prompt de instalação: ${outcome}`);
    set({ installPromptEvent: null });
  },

  checkPushSupport: async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      set({ pushState: 'unsupported' });
      return;
    }

    if (Notification.permission === 'denied') {
        set({pushState: 'denied'});
        return;
    }

    if (Notification.permission === 'granted') {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        set({ pushState: 'granted' });
      } else {
        set({ pushState: 'prompt' });
      }
    } else {
      set({ pushState: 'prompt' });
    }
  },

  subscribeToPushNotifications: async () => {
    log.info('Iniciando processo de inscrição de notificação...');
    set({ isSubscribing: true });

    try {
        const vapidPublicKey = (import.meta as any).env.VITE_VAPID_PUBLIC_KEY;
        if (!vapidPublicKey) {
            throw new Error('VAPID public key não encontrada nas variáveis de ambiente.');
        }
        log.info('VAPID public key encontrada.');

        if (get().pushState === 'denied' || get().pushState === 'unsupported') {
            toast('As notificações estão bloqueadas ou não são suportadas neste navegador.');
            set({ isSubscribing: false });
            return;
        }

        log.info('Solicitando permissão para notificações...');
        const permission = await Notification.requestPermission();
        log.info(`Permissão de notificação: ${permission}`);
        if (permission !== 'granted') {
            throw new Error('Permissão para notificações não concedida.');
        }

        log.info('Aguardando o Service Worker ficar pronto...');
        const registration = await navigator.serviceWorker.ready;
        log.info('Service Worker está pronto.', registration);

        log.info('Inscrevendo no Push Manager...');
        const subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
        });
        const subscriptionObject = subscription.toJSON();
        log.info('Inscrição criada com sucesso no navegador.', subscriptionObject);

        log.info('Obtendo sessão do Supabase para enviar ao servidor...');
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            throw new Error("Usuário não autenticado para salvar inscrição.");
        }

        log.info('Sessão do usuário obtida. Enviando inscrição para /api/store-push-subscription...');
        const response = await fetch('/api/store-push-subscription', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session.access_token}`
            },
            body: JSON.stringify({ subscription_object: subscriptionObject }),
        });
        log.info('Resposta recebida do servidor.', { status: response.status });

        if (!response.ok) {
            const errorData = await response.json();
            log.error('Servidor retornou um erro ao salvar a inscrição.', errorData);
            throw new Error(errorData.error || 'Falha ao salvar a inscrição no servidor.');
        }

        log.info('Inscrição salva com sucesso no servidor!');
        toast.success('Notificações ativadas com sucesso!');
        set({ pushState: 'granted' });

    } catch (error: any) {
        log.error('Falha no processo de inscrição de notificação.', error);
        if (Notification.permission === 'denied') {
            set({ pushState: 'denied' });
            toast.error('Você bloqueou as notificações. Altere nas configurações do navegador.');
        } else {
             if (error.message.toLowerCase().includes("service worker")) {
                toast.error('Erro ao ativar serviço de notificações. Tente recarregar a página.');
            } else {
                toast.error('Não foi possível ativar as notificações.');
            }
        }
    } finally {
        log.info('Processo de inscrição finalizado.');
        set({ isSubscribing: false });
    }
  },

  unlinkSubscriptionOnLogout: async () => {
    try {
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      
      if (subscription) {
        const subscriptionObject = subscription.toJSON();
        fetch('/api/unlink-push-subscription', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ subscription_object: subscriptionObject }),
        });
        log.info('Desvinculando inscrição de push do backend.');
      }
    } catch (error) {
      log.error('Erro ao desvincular a inscrição de push:', error);
    }
  },

  relinkSubscriptionOnLogin: async () => {
    try {
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
      
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      
      if (subscription) {
        log.info('Inscrição existente encontrada no dispositivo. Re-vinculando com o usuário atual.');
        const subscriptionObject = subscription.toJSON();
        const { session } = (await supabase.auth.getSession()).data;
        if (!session) return;

        const response = await fetch('/api/store-push-subscription', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session.access_token}`
            },
            body: JSON.stringify({ subscription_object: subscriptionObject }),
        });

        if (response.ok) {
          log.info('Inscrição re-vinculada com sucesso.');
          set({ pushState: 'granted' });
        } else {
          log.error('Falha ao re-vincular a inscrição.');
        }
      }
    } catch (error) {
      log.error('Erro durante o re-vínculo da inscrição de push:', error);
    }
  },
}));