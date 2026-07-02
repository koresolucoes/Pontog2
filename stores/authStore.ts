
import { create } from 'zustand';
import { supabase, getPublicImageUrl } from '../lib/supabase';
// import { Session, User as SupabaseUser } from '@supabase/supabase-js';
import { Profile, User } from '../types';
import { calculateAge } from '../lib/utils';
import { usePwaStore } from './pwaStore';
import toast from 'react-hot-toast';

// FIX: Define types as any since the library exports are missing or conflicting in this environment
type Session = any;
type SupabaseUser = any;

interface AuthState {
  session: Session | null;
  user: User | null; // This will be the combined user + profile object
  profile: Profile | null; // This is the raw profile from the DB
  loading: boolean;
  showOnboarding: boolean; // Flag to control the onboarding view
  profileSubscription: any | null; // Realtime channel for profile updates
  setSession: (session: Session | null) => void;
  fetchProfile: (user: SupabaseUser) => Promise<void>;
  signOut: () => Promise<void>;
  toggleIncognitoMode: (isIncognito: boolean) => Promise<void>;
  toggleCanHost: (canHost: boolean) => Promise<void>; // New action
  completeOnboarding: () => Promise<void>; // Function to mark onboarding as done
  finishTour: () => Promise<void>; // Mark guided tour as done
  setupProfileSubscription: (userId: string) => void;
  cleanupProfileSubscription: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  user: null,
  profile: null,
  loading: true,
  showOnboarding: false,
  profileSubscription: null,

  setSession: (session) => set({ session }),

  fetchProfile: async (supabaseUser: SupabaseUser) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          *,
          profile_tribes (
            tribes (
              id,
              name
            )
          )
        `)
        .eq('id', supabaseUser.id)
        .single();
        
      if (error && error.code !== 'PGRST116') { // PGRST116: single row not found, which is fine on first login
        throw error;
      }
      
      let profileData: Profile | null = null;
      let isNewUser = false;

      if (data) {
        profileData = {
            ...data,
            avatar_url: getPublicImageUrl(data.avatar_url),
            video_url: data.video_url ? getPublicImageUrl(data.video_url) : null,
            public_photos: (data.public_photos || []).map(getPublicImageUrl),
            tribes: data.profile_tribes?.map((pt: any) => pt.tribes.name) || [],
            distance_km: null,
            subscription_tier: data.subscription_tier || 'free',
            is_incognito: data.is_incognito || false,
            is_traveling: data.is_traveling || false,
            has_completed_onboarding: data.has_completed_onboarding || false,
            tribes_configured: data.tribes_configured || false,
            kinks: data.kinks || [],
            can_host: data.can_host || false,
            status: data.status || 'active',
            suspended_until: data.suspended_until || null,
            is_verified: data.is_verified || false,
            has_seen_tour: data.has_seen_tour || localStorage.getItem(`has_seen_tour_${supabaseUser.id}`) === 'true' || false,
        };
        delete (profileData as any).profile_tribes;
      } else {
        isNewUser = true;
        console.log('No profile found for user, creating a new one.');
        const newProfileData = {
          id: supabaseUser.id,
          username: supabaseUser.email!.split('@')[0] + Math.floor(Math.random() * 1000),
          display_name: supabaseUser.user_metadata?.full_name || supabaseUser.email!.split('@')[0],
          avatar_url: supabaseUser.user_metadata?.avatar_url,
          subscription_tier: 'free',
          is_incognito: false,
          has_completed_onboarding: false,
          kinks: [],
          can_host: false,
          status: 'active',
          is_verified: false,
          has_seen_tour: false,
        };

        const { data: insertedProfile, error: insertError } = await supabase
          .from('profiles')
          .insert(newProfileData)
          .select()
          .single();

        if (insertError) {
          console.error('Error creating profile:', insertError);
          throw insertError;
        }

        if (insertedProfile) {
          profileData = {
            ...(insertedProfile as unknown as Profile),
            avatar_url: getPublicImageUrl(insertedProfile.avatar_url),
            video_url: null,
            public_photos: [],
            tribes: [],
            distance_km: null,
            kinks: [],
            can_host: false,
            is_traveling: false,
            is_verified: false,
            has_seen_tour: false,
          };
        }
      }
      
      if (profileData) {
        const userData: User = {
            ...profileData,
            age: calculateAge(profileData.date_of_birth),
        };
        set({ profile: profileData, user: userData });
        
        // Inicia a escuta por mudanças no perfil (para detectar ban/suspensão em tempo real)
        get().setupProfileSubscription(supabaseUser.id);

        // Inicia a escuta por eventos da caixa de entrada assim que o perfil é carregado
        (await import('./inboxStore')).useInboxStore.getState().subscribeToInboxChanges();

        // Trigger onboarding if the flag is false
        if (!profileData.has_completed_onboarding) {
            set({ showOnboarding: true });
        }
      }

    } catch (error) {
      console.error('Error fetching/creating profile:', error);
    } finally {
      set({ loading: false });
    }
  },

  setupProfileSubscription: (userId: string) => {
      // Limpa assinatura anterior se existir
      get().cleanupProfileSubscription();

      const channel = supabase
        .channel(`profile-changes:${userId}`)
        .on(
            'postgres_changes',
            { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${userId}` },
            (payload) => {
                console.log('Profile update detected:', payload);
                const { user, profile } = get();
                if (user && profile && payload.new) {
                    // Atualiza o estado local com os novos dados (focando principalmente em status)
                    const updatedProfileRaw = payload.new;
                    
                    const updatedUser = {
                        ...user,
                        status: updatedProfileRaw.status,
                        suspended_until: updatedProfileRaw.suspended_until,
                        subscription_tier: updatedProfileRaw.subscription_tier,
                        // Atualize outros campos se necessário
                    };
                    
                    const updatedProfile = {
                        ...profile,
                        status: updatedProfileRaw.status,
                        suspended_until: updatedProfileRaw.suspended_until,
                        subscription_tier: updatedProfileRaw.subscription_tier,
                    };

                    set({ user: updatedUser, profile: updatedProfile });

                    // Feedback visual se for bloqueado ao vivo
                    if (updatedProfileRaw.status === 'suspended' || updatedProfileRaw.status === 'banned') {
                        toast.error('Sua conta foi suspensa.');
                    }
                }
            }
        )
        .subscribe();
      
      set({ profileSubscription: channel });
  },

  cleanupProfileSubscription: () => {
      const { profileSubscription } = get();
      if (profileSubscription) {
          supabase.removeChannel(profileSubscription);
          set({ profileSubscription: null });
      }
  },

  signOut: async () => {
    set({ loading: true });
    const { error } = await supabase.auth.signOut({ scope: 'local' });
    get().cleanupProfileSubscription();
    if (error) {
        toast.error('Erro ao sair.');
        console.error(error);
        set({ loading: false });
    }
  },

  toggleIncognitoMode: async (isIncognito: boolean) => {
    const { user } = get();
    if (!user) return;
    
    if (user.subscription_tier !== 'plus') {
        toast.error('Modo Invisível é um benefício do Ponto G Plus.');
        set(state => ({ user: state.user ? { ...state.user, is_incognito: !isIncognito } : null }));
        return;
    }

    const toastId = toast.loading('Atualizando status...');
    const { error } = await supabase
      .from('profiles')
      .update({ is_incognito: isIncognito })
      .eq('id', user.id);
    
    if (error) {
      toast.error('Erro ao atualizar o modo invisível.', { id: toastId });
       set(state => ({
          user: state.user ? { ...state.user, is_incognito: !isIncognito } : null,
          profile: state.profile ? { ...state.profile, is_incognito: !isIncognito } : null,
      }));
    } else {
      toast.success(`Modo Invisível ${isIncognito ? 'ativado' : 'desativado'}.`, { id: toastId });
      set(state => ({
          user: state.user ? { ...state.user, is_incognito: isIncognito } : null,
          profile: state.profile ? { ...state.profile, is_incognito: isIncognito } : null,
      }));
    }
  },

  finishTour: async () => {
    const { user } = get();
    if (!user) return;
    
    console.log('Finishing tour for user:', user.id);
    // Fallback in case DB column doesn't exist yet
    localStorage.setItem(`has_seen_tour_${user.id}`, 'true');

    // Update local state immediately
    set(state => ({
        user: state.user ? { ...state.user, has_seen_tour: true } : null,
        profile: state.profile ? { ...state.profile, has_seen_tour: true } : null,
    }));

    try {
        // Update DB
        const { error } = await supabase
          .from('profiles')
          .update({ has_seen_tour: true })
          .eq('id', user.id);
        
        if (error) {
          console.error('Error updating tour status in DB:', error);
        } else {
          console.log('Successfully updated tour status in DB.');
        }
    } catch (e) {
        console.error('Exception updating tour status:', e);
    }
  },

  toggleCanHost: async (canHost: boolean) => {
    const { user } = get();
    if (!user) return;

    // Optimistic update
    set(state => ({
        user: state.user ? { ...state.user, can_host: canHost } : null,
        profile: state.profile ? { ...state.profile, can_host: canHost } : null,
    }));

    const { error } = await supabase
        .from('profiles')
        .update({ can_host: canHost })
        .eq('id', user.id);

    if (error) {
        console.error("Error toggling host status:", error);
        toast.error("Erro ao atualizar status de local.");
        // Revert
        set(state => ({
            user: state.user ? { ...state.user, can_host: !canHost } : null,
            profile: state.profile ? { ...state.profile, can_host: !canHost } : null,
        }));
    } else {
        toast.success(canHost ? "Você está visível como 'Com Local'!" : "Status 'Com Local' removido.");
    }
  },

  completeOnboarding: async () => {
    const { user } = get();
    if (!user) return;

    const { error } = await supabase
        .from('profiles')
        .update({ has_completed_onboarding: true })
        .eq('id', user.id);

    if (error) {
        toast.error("Ocorreu um erro ao finalizar. Tente novamente.");
        console.error("Error completing onboarding:", error);
    } else {
        // Update local state to hide the onboarding screen
        set(state => ({
            showOnboarding: false,
            user: state.user ? { ...state.user, has_completed_onboarding: true } : null,
            profile: state.profile ? { ...state.profile, has_completed_onboarding: true } : null,
        }));
    }
  },
}));

// Initial check for session on app load
supabase.auth.getSession().then(({ data: { session } }: any) => {
  useAuthStore.getState().setSession(session);
  if (session?.user) {
    useAuthStore.getState().fetchProfile(session.user);
  } else {
    useAuthStore.setState({ loading: false });
  }
});

// Listen to auth state changes
supabase.auth.onAuthStateChange(async (_event: string, session: Session) => {
  useAuthStore.getState().setSession(session);
  if (session?.user) {
    useAuthStore.getState().fetchProfile(session.user);
    usePwaStore.getState().relinkSubscriptionOnLogin();
  } else {
    useAuthStore.setState({ session: null, user: null, profile: null, loading: false, showOnboarding: false });
    useAuthStore.getState().cleanupProfileSubscription();
    (await import('./pwaStore')).usePwaStore.getState().unlinkSubscriptionOnLogout();
    (await import('./inboxStore')).useInboxStore.getState().cleanupRealtime(); // Limpa a inscrição realtime
    (await import('./inboxStore')).useInboxStore.setState({ conversations: [], winks: [], accessRequests: [], profileViews: [], loadingConversations: false, loadingWinks: false, loadingRequests: false, loadingProfileViews: false });
    (await import('./albumStore')).useAlbumStore.setState({ myAlbums: [], viewedUserAlbums: [], viewedUserAccessStatus: null, isUploading: false, isLoading: false, isFetchingViewedUserAlbums: false });
    (await import('./notificationStore')).useNotificationStore.setState({ preferences: [], loading: false });
    (await import('./mapStore')).useMapStore.getState().stopLocationWatch();
    (await import('./mapStore')).useMapStore.getState().cleanupRealtime();
    (await import('./mapStore')).useMapStore.setState({ 
        users: [], 
        myLocation: null, 
        selectedUser: null, 
        onlineUsers: [], 
        loading: true, 
        error: null, 
        filters: { 
            onlineOnly: false,
            favoritesOnly: false,
            minAge: 18,
            maxAge: 99,
            positions: [],
            tribes: []
        } 
    });
    (await import('./agoraStore')).useAgoraStore.setState({ posts: [], agoraUserIds: [], isLoading: false, isActivating: false });
    (await import('./homeStore')).useHomeStore.setState({ popularUsers: [], loading: true, error: null });
    (await import('./uiStore')).useUiStore.setState({ chatUser: null, activeView: 'home', isSubscriptionModalOpen: false, isDonationModalOpen: false, isSidebarOpen: false });
  }
});
