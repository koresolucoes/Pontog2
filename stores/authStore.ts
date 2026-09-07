
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

const profileFetchInFlight = new Map<string, Promise<void>>();
let lastRelinkedAccessToken: string | null = null;

const buildFallbackUsername = (supabaseUser: SupabaseUser) => {
  const emailPrefix = String(supabaseUser?.email || 'user')
    .split('@')[0]
    .replace(/[^a-zA-Z0-9_]/g, '')
    .slice(0, 48) || 'user';
  const suffix = String(supabaseUser?.id || '').replace(/-/g, '').slice(0, 8);
  return `${emailPrefix}_${suffix || 'profile'}`;
};

const normalizeSelfProfile = (raw: any, supabaseUser: SupabaseUser): Profile => {
  const rawTribes = Array.isArray(raw?.tribes) ? raw.tribes : [];
  const tribeNames = rawTribes
    .map((tribe: any) => typeof tribe === 'string' ? tribe : tribe?.name)
    .filter(Boolean);

  return {
    ...raw,
    email: raw?.email || supabaseUser?.email || '',
    username: raw?.username || buildFallbackUsername(supabaseUser),
    display_name: raw?.display_name || supabaseUser?.user_metadata?.full_name || null,
    avatar_url: getPublicImageUrl(raw?.avatar_url || supabaseUser?.user_metadata?.avatar_url || ''),
    video_url: raw?.video_url ? getPublicImageUrl(raw.video_url) : null,
    public_photos: (raw?.public_photos || []).map(getPublicImageUrl),
    tribes: tribeNames,
    distance_km: null,
    subscription_tier: raw?.subscription_tier || 'free',
    is_incognito: raw?.is_incognito || false,
    is_traveling: raw?.is_traveling || false,
    has_completed_onboarding: raw?.has_completed_onboarding || false,
    tribes_configured: raw?.tribes_configured || false,
    kinks: raw?.kinks || [],
    can_host: raw?.can_host || false,
    status: raw?.status || 'active',
    suspended_until: raw?.suspended_until || null,
    is_verified: raw?.is_verified || false,
    has_seen_tour: raw?.has_seen_tour || localStorage.getItem(`has_seen_tour_${supabaseUser.id}`) === 'true' || false,
  } as Profile;
};

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
    const userId = supabaseUser?.id;
    if (!userId) {
      set({ loading: false });
      return;
    }

    const existingFetch = profileFetchInFlight.get(userId);
    if (existingFetch) return existingFetch;

    const fetchTask = (async () => {
      try {
        // Step 04 privacy hardening intentionally revoked direct authenticated
        // table access to the wide profiles row. Self-profile hydration must use
        // the authenticated RPC boundary that safely combines public + private data.
        let { data: rawProfile, error: profileError } = await supabase.rpc('get_my_profile_v1');

        if (profileError) throw profileError;

        if (!rawProfile) {
          console.log('No profile found for user, creating through secure self-profile contract.');
          const { data: ensuredProfile, error: ensureError } = await supabase.rpc('ensure_my_profile_v1', {
            p_username: buildFallbackUsername(supabaseUser),
            p_display_name: supabaseUser.user_metadata?.full_name || supabaseUser.email?.split('@')[0] || null,
            p_avatar_url: supabaseUser.user_metadata?.avatar_url || null,
          });

          if (ensureError) {
            console.error('Error creating profile through ensure_my_profile_v1:', ensureError);
            throw ensureError;
          }
          rawProfile = ensuredProfile;
        }

        if (!rawProfile) throw new Error('Self profile contract returned no profile.');

        const profileData = normalizeSelfProfile(rawProfile, supabaseUser);

        if (profileData.current_checkin_venue_id) {
          const twentyFourHoursAgoIso = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
          const { data: activeCheckin } = await supabase
            .from('venue_checkins')
            .select('venue_id')
            .eq('user_id', supabaseUser.id)
            .gt('created_at', twentyFourHoursAgoIso)
            .maybeSingle();

          if (!activeCheckin) {
            profileData.current_checkin_venue_id = undefined;
            profileData.current_checkin_venue_name = undefined;
            const { error: clearCheckinError } = await supabase.rpc('set_my_checkin_v1', { p_venue_id: null });
            if (clearCheckinError) console.warn('Failed to clear stale check-in:', clearCheckinError);
          }
        }

        const userData: User = {
          ...profileData,
          age: calculateAge(profileData.date_of_birth),
        };
        set({ profile: profileData, user: userData });

        // Mantém apenas subscriptions realmente globais no login.
        // Realtime de Agora/Comunidades/Vídeos agora é montado por view ativa
        // em composition/featureRealtimeLifecycle.ts e destruído ao sair da feature.
        get().setupProfileSubscription(supabaseUser.id);

        // Inbox permanece global para badges/unread, mas mensagens são limitadas
        // às conversas das quais o usuário autenticado realmente participa.
        try {
          await (await import('../composition/inboxRealtimeLifecycle')).mountInboxRealtime(supabaseUser.id);
        } catch (inboxError) {
          // Inbox realtime must never invalidate an otherwise valid login session.
          console.error('Failed to mount inbox realtime after profile hydration:', inboxError);
        }

        set({ showOnboarding: !profileData.has_completed_onboarding });
      } catch (error) {
        console.error('Error fetching/creating profile:', error);
      } finally {
        set({ loading: false });
      }
    })();

    profileFetchInFlight.set(userId, fetchTask);
    try {
      await fetchTask;
    } finally {
      if (profileFetchInFlight.get(userId) === fetchTask) {
        profileFetchInFlight.delete(userId);
      }
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
                    };

                    const updatedProfile = {
                        ...profile,
                        status: updatedProfileRaw.status,
                        suspended_until: updatedProfileRaw.suspended_until,
                        subscription_tier: updatedProfileRaw.subscription_tier,
                    };

                    set({ user: updatedUser, profile: updatedProfile });

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
    const { error } = await supabase.rpc('set_my_incognito_v1', { p_enabled: isIncognito });

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
    localStorage.setItem(`has_seen_tour_${user.id}`, 'true');

    set(state => ({
        user: state.user ? { ...state.user, has_seen_tour: true } : null,
        profile: state.profile ? { ...state.profile, has_seen_tour: true } : null,
    }));

    try {
        const { error } = await supabase.rpc('update_my_profile_v1', {
          p_patch: { has_seen_tour: true }
        });

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

    set(state => ({
        user: state.user ? { ...state.user, can_host: canHost } : null,
        profile: state.profile ? { ...state.profile, can_host: canHost } : null,
    }));

    const { error } = await supabase.rpc('update_my_profile_v1', {
      p_patch: { can_host: canHost }
    });

    if (error) {
        console.error("Error toggling host status:", error);
        toast.error("Erro ao atualizar status de local.");
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

    const { error } = await supabase.rpc('update_my_profile_v1', {
      p_patch: { has_completed_onboarding: true }
    });

    if (error) {
        toast.error("Ocorreu um erro ao finalizar. Tente novamente.");
        console.error("Error completing onboarding:", error);
    } else {
        set(state => ({
            showOnboarding: false,
            user: state.user ? { ...state.user, has_completed_onboarding: true } : null,
            profile: state.profile ? { ...state.profile, has_completed_onboarding: true } : null,
        }));
    }
  },
}));

// Initial check for session on app load.
supabase.auth.getSession().then(({ data: { session } }: any) => {
  useAuthStore.getState().setSession(session);
  if (session?.user) {
    void useAuthStore.getState().fetchProfile(session.user);
  } else {
    useAuthStore.setState({ loading: false });
  }
});

// Listen to auth state changes. fetchProfile de-duplicates concurrent hydration,
// which avoids the OAuth callback + initial session race seen in production.
supabase.auth.onAuthStateChange(async (_event: string, session: Session) => {
  useAuthStore.getState().setSession(session);
  if (session?.user) {
    void useAuthStore.getState().fetchProfile(session.user);

    // SIGNED_IN can be emitted more than once in some browser/session flows.
    // Re-link a push subscription only once per access token.
    if (_event === 'SIGNED_IN' && session.access_token && session.access_token !== lastRelinkedAccessToken) {
      lastRelinkedAccessToken = session.access_token;
      void usePwaStore.getState().relinkSubscriptionOnLogin();
    }
  } else {
    lastRelinkedAccessToken = null;
    useAuthStore.setState({ session: null, user: null, profile: null, loading: false, showOnboarding: false });
    useAuthStore.getState().cleanupProfileSubscription();
    (await import('./pwaStore')).usePwaStore.getState().unlinkSubscriptionOnLogout();
    await (await import('../composition/inboxRealtimeLifecycle')).disposeInboxRealtime();
    (await import('./inboxStore')).useInboxStore.getState().cleanupRealtime(); // Cleanup legado por segurança durante rollout/hot reload
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
            tribes: [],
            lookingFor: []
        }
    });
    (await import('./agoraStore')).useAgoraStore.setState({ posts: [], agoraUserIds: [], isLoading: false, isActivating: false });
    (await import('./homeStore')).useHomeStore.setState({ popularUsers: [], loading: true, error: null });
    (await import('./uiStore')).useUiStore.setState({ chatUser: null, activeView: 'home', isSubscriptionModalOpen: false, isDonationModalOpen: false, isSidebarOpen: false });
  }
});