import { create } from 'zustand';
import { supabase, getPublicImageUrl } from '../lib/supabase';
import { Profile, User } from '../types';
import { calculateAge } from '../lib/utils';
import { usePwaStore } from './pwaStore';
import toast from 'react-hot-toast';

type Session = any;
type SupabaseUser = any;

interface AuthState {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  showOnboarding: boolean;
  profileSubscription: any | null;
  setSession: (session: Session | null) => void;
  fetchProfile: (user: SupabaseUser) => Promise<void>;
  signOut: () => Promise<void>;
  toggleIncognitoMode: (isIncognito: boolean) => Promise<void>;
  toggleCanHost: (canHost: boolean) => Promise<void>;
  completeOnboarding: () => Promise<void>;
  finishTour: () => Promise<void>;
  setupProfileSubscription: (userId: string) => void;
  cleanupProfileSubscription: () => void;
}

const normalizeSelfProfile = (data: any): Profile => {
  const tribes = Array.isArray(data?.tribes)
    ? data.tribes.map((tribe: any) => (typeof tribe === 'string' ? tribe : tribe?.name)).filter(Boolean)
    : [];

  return {
    ...data,
    avatar_url: getPublicImageUrl(data?.avatar_url),
    video_url: data?.video_url ? getPublicImageUrl(data.video_url) : null,
    public_photos: (data?.public_photos || []).map(getPublicImageUrl),
    tribes,
    distance_km: null,
    subscription_tier: data?.subscription_tier || 'free',
    is_incognito: data?.is_incognito || false,
    is_traveling: data?.is_traveling || false,
    has_completed_onboarding: data?.has_completed_onboarding || false,
    tribes_configured: data?.tribes_configured || false,
    kinks: data?.kinks || [],
    can_host: data?.can_host || false,
    status: data?.status || 'active',
    suspended_until: data?.suspended_until || null,
    is_verified: data?.is_verified || false,
    has_seen_tour:
      data?.has_seen_tour || localStorage.getItem(`has_seen_tour_${data?.id}`) === 'true' || false,
  } as Profile;
};

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
      let { data, error } = await supabase.rpc('get_my_profile_v1');
      if (error) throw error;

      if (!data) {
        const suggestedUsername = `${supabaseUser.email?.split('@')[0] || 'user'}${Math.floor(Math.random() * 1000)}`;
        const ensured = await supabase.rpc('ensure_my_profile_v1', {
          p_username: suggestedUsername,
          p_display_name: supabaseUser.user_metadata?.full_name || supabaseUser.email?.split('@')[0] || null,
          p_avatar_url: supabaseUser.user_metadata?.avatar_url || null,
        });
        data = ensured.data;
        error = ensured.error;
        if (error) throw error;
      }

      if (!data) return;

      const profileData = normalizeSelfProfile(data);

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
        }
      }

      const userData: User = {
        ...profileData,
        age: calculateAge(profileData.date_of_birth),
      };

      set({ profile: profileData, user: userData });
      get().setupProfileSubscription(supabaseUser.id);

      (await import('./inboxStore')).useInboxStore.getState().subscribeToInboxChanges();
      (await import('./videoStore')).subscribeToVideoEvents();
      (await import('./communityStore')).subscribeToCommunityEvents();
      (await import('./agoraStore')).subscribeToAgoraEvents();

      if (!profileData.has_completed_onboarding) set({ showOnboarding: true });
    } catch (error) {
      console.error('Error fetching/creating profile:', error);
    } finally {
      set({ loading: false });
    }
  },

  setupProfileSubscription: (userId: string) => {
    get().cleanupProfileSubscription();

    const channel = supabase
      .channel(`profile-changes:${userId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${userId}` },
        (payload) => {
          const { user, profile } = get();
          if (!user || !profile || !payload.new) return;

          const updatedProfileRaw = payload.new;
          set({
            user: {
              ...user,
              status: updatedProfileRaw.status,
              suspended_until: updatedProfileRaw.suspended_until,
              subscription_tier: updatedProfileRaw.subscription_tier,
            },
            profile: {
              ...profile,
              status: updatedProfileRaw.status,
              suspended_until: updatedProfileRaw.suspended_until,
              subscription_tier: updatedProfileRaw.subscription_tier,
            },
          });

          if (updatedProfileRaw.status === 'suspended' || updatedProfileRaw.status === 'banned') {
            toast.error('Sua conta foi suspensa.');
          }
        },
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
      set((state) => ({ user: state.user ? { ...state.user, is_incognito: !isIncognito } : null }));
      return;
    }

    const toastId = toast.loading('Atualizando status...');
    const { error } = await supabase.from('profiles').update({ is_incognito: isIncognito }).eq('id', user.id);

    if (error) {
      toast.error('Erro ao atualizar o modo invisível.', { id: toastId });
      set((state) => ({
        user: state.user ? { ...state.user, is_incognito: !isIncognito } : null,
        profile: state.profile ? { ...state.profile, is_incognito: !isIncognito } : null,
      }));
    } else {
      toast.success(`Modo Invisível ${isIncognito ? 'ativado' : 'desativado'}.`, { id: toastId });
      set((state) => ({
        user: state.user ? { ...state.user, is_incognito: isIncognito } : null,
        profile: state.profile ? { ...state.profile, is_incognito: isIncognito } : null,
      }));
    }
  },

  finishTour: async () => {
    const { user } = get();
    if (!user) return;

    localStorage.setItem(`has_seen_tour_${user.id}`, 'true');
    set((state) => ({
      user: state.user ? { ...state.user, has_seen_tour: true } : null,
      profile: state.profile ? { ...state.profile, has_seen_tour: true } : null,
    }));

    const { error } = await supabase.from('profiles').update({ has_seen_tour: true }).eq('id', user.id);
    if (error) console.error('Error updating tour status in DB:', error);
  },

  toggleCanHost: async (canHost: boolean) => {
    const { user } = get();
    if (!user) return;

    set((state) => ({
      user: state.user ? { ...state.user, can_host: canHost } : null,
      profile: state.profile ? { ...state.profile, can_host: canHost } : null,
    }));

    const { error } = await supabase.from('profiles').update({ can_host: canHost }).eq('id', user.id);
    if (error) {
      console.error('Error toggling host status:', error);
      toast.error('Erro ao atualizar status de local.');
      set((state) => ({
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
      toast.error('Ocorreu um erro ao finalizar. Tente novamente.');
      console.error('Error completing onboarding:', error);
    } else {
      set((state) => ({
        showOnboarding: false,
        user: state.user ? { ...state.user, has_completed_onboarding: true } : null,
        profile: state.profile ? { ...state.profile, has_completed_onboarding: true } : null,
      }));
    }
  },
}));

supabase.auth.getSession().then(({ data: { session } }: any) => {
  useAuthStore.getState().setSession(session);
  if (session?.user) useAuthStore.getState().fetchProfile(session.user);
  else useAuthStore.setState({ loading: false });
});

supabase.auth.onAuthStateChange(async (_event: string, session: Session) => {
  useAuthStore.getState().setSession(session);
  if (session?.user) {
    useAuthStore.getState().fetchProfile(session.user);
    usePwaStore.getState().relinkSubscriptionOnLogin();
    return;
  }

  useAuthStore.setState({ session: null, user: null, profile: null, loading: false, showOnboarding: false });
  useAuthStore.getState().cleanupProfileSubscription();
  (await import('./pwaStore')).usePwaStore.getState().unlinkSubscriptionOnLogout();
  (await import('./inboxStore')).useInboxStore.getState().cleanupRealtime();
  (await import('./inboxStore')).useInboxStore.setState({
    conversations: [],
    winks: [],
    accessRequests: [],
    profileViews: [],
    loadingConversations: false,
    loadingWinks: false,
    loadingRequests: false,
    loadingProfileViews: false,
  });
  (await import('./albumStore')).useAlbumStore.setState({
    myAlbums: [],
    viewedUserAlbums: [],
    viewedUserAccessStatus: null,
    isUploading: false,
    isLoading: false,
    isFetchingViewedUserAlbums: false,
  });
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
      lookingFor: [],
    },
  });
  (await import('./agoraStore')).useAgoraStore.setState({ posts: [], agoraUserIds: [], isLoading: false, isActivating: false });
  (await import('./homeStore')).useHomeStore.setState({ popularUsers: [], loading: true, error: null });
  (await import('./uiStore')).useUiStore.setState({
    chatUser: null,
    activeView: 'home',
    isSubscriptionModalOpen: false,
    isDonationModalOpen: false,
    isSidebarOpen: false,
  });
});
