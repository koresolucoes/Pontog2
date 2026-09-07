import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { User, Coordinates, Venue } from '../types';
import { useAuthStore } from './authStore';
import { transformProfileToUser } from '../lib/utils';
import toast from 'react-hot-toast';

interface MapState {
  users: User[];
  venues: Venue[];
  myLocation: Coordinates | null;
  onlineUsers: string[];
  loading: boolean;
  error: string | null;
  selectedUser: User | null;
  selectedVenue: Venue | null;
  watchId: number | null;
  realtimeChannel: any | null;
  presenceChannel: any | null;
  lastLocationUpdate: number;
  filters: {
    onlineOnly: boolean;
    favoritesOnly: boolean;
    minAge: number | null;
    maxAge: number | null;
    positions: string[];
    tribes: string[];
    lookingFor: string[];
  };
  setUsers: (users: User[]) => void;
  setMyLocation: (coords: Coordinates) => void;
  setSelectedUser: (user: User | null) => void;
  setSelectedVenue: (venue: Venue | null) => void;
  setFilters: (newFilters: Partial<MapState['filters']>) => void;
  requestLocationPermission: () => void;
  stopLocationWatch: () => void;
  updateMyLocationInDb: (coords: Coordinates) => Promise<void>;
  fetchNearbyUsers: (coords: Coordinates) => Promise<void>;
  fetchVenues: (coords?: Coordinates) => Promise<void>;
  suggestVenue: (venueData: Partial<Venue>, photoFile: File | null) => Promise<boolean>;
  setupRealtime: () => void;
  cleanupRealtime: () => void;
  enableTravelMode: (coords: Coordinates) => Promise<void>;
  disableTravelMode: () => Promise<void>;
}

export const useMapStore = create<MapState>((set, get) => ({
  users: [],
  venues: [],
  myLocation: null,
  onlineUsers: [],
  loading: true,
  error: null,
  selectedUser: null,
  selectedVenue: null,
  watchId: null,
  realtimeChannel: null,
  presenceChannel: null,
  lastLocationUpdate: 0,
  filters: {
    onlineOnly: false,
    favoritesOnly: false,
    minAge: 18,
    maxAge: 99,
    positions: [],
    tribes: [],
    lookingFor: [],
  },

  setUsers: (users) => set({ users }),
  setMyLocation: (coords) => set({ myLocation: coords }),
  setSelectedUser: (user) => set({ selectedUser: user, selectedVenue: null }),
  setSelectedVenue: (venue) => set({ selectedVenue: venue, selectedUser: null }),
  setFilters: (newFilters) => set((state) => ({ filters: { ...state.filters, ...newFilters } })),

  requestLocationPermission: () => {
    const authUser = useAuthStore.getState().user;

    if (authUser?.is_traveling && authUser.lat && authUser.lng) {
      const travelLocation = { lat: authUser.lat, lng: authUser.lng };
      set({ myLocation: travelLocation, loading: false, error: null });
      get().fetchNearbyUsers(travelLocation);
      get().fetchVenues(travelLocation);
      get().setupRealtime();
      return;
    }

    if (get().watchId) get().stopLocationWatch();

    if (!navigator.geolocation) {
      set({ loading: false, error: 'Geolocalização não é suportada por este navegador.' });
      return;
    }

    const updateLocation = () => {
      const currentUser = useAuthStore.getState().user;
      if (currentUser?.is_traveling) {
        get().stopLocationWatch();
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          const newLocation = { lat: latitude, lng: longitude };
          const oldLocation = get().myLocation;
          const hasMoved =
            !oldLocation ||
            Math.abs(oldLocation.lat - newLocation.lat) > 0.0005 ||
            Math.abs(oldLocation.lng - newLocation.lng) > 0.0005;

          if (hasMoved) {
            set({ myLocation: newLocation, loading: false, error: null });
            get().updateMyLocationInDb(newLocation);
            get().fetchVenues(newLocation);
          }

          get().fetchNearbyUsers(newLocation);
        },
        (error) => {
          if (error.code !== error.PERMISSION_DENIED) console.error('Geolocation error:', error);
          if (!get().myLocation) {
            set({
              loading: false,
              error: 'Não foi possível obter sua localização. Verifique as permissões do seu navegador e tente novamente.',
            });
          }
          if (error.code === error.PERMISSION_DENIED) get().stopLocationWatch();
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
      );
    };

    updateLocation();
    const intervalId = setInterval(updateLocation, 45000);
    set({ watchId: intervalId as any });
    get().setupRealtime();
  },

  stopLocationWatch: () => {
    const { watchId } = get();
    if (watchId !== null) {
      clearInterval(watchId);
      set({ watchId: null });
    }
  },

  updateMyLocationInDb: async (coords: Coordinates) => {
    const user = useAuthStore.getState().user;
    if (!user || user.is_traveling) return;

    const now = Date.now();
    if (now - get().lastLocationUpdate < 60000) return;
    set({ lastLocationUpdate: now });

    let { lat, lng } = coords;
    const profile = useAuthStore.getState().profile;
    const isPlus = profile?.subscription_tier === 'plus';

    if (!isPlus) {
      const radius = 100 + Math.random() * 300;
      const angle = Math.random() * 2 * Math.PI;
      lat += (radius * Math.sin(angle)) / 111111;
      lng += (radius * Math.cos(angle)) / (111111 * Math.cos((lat * Math.PI) / 180));
    }

    supabase
      .rpc('update_my_location', { new_lat: lat, new_lng: lng })
      .then(({ error }) => {
        if (error) console.error('Error updating location in DB:', error);
      });
  },

  fetchNearbyUsers: async (coords: Coordinates) => {
    const { data, error } = await supabase.rpc('get_nearby_profiles_v3', {
      p_lat: coords.lat,
      p_lng: coords.lng,
    });

    if (error) {
      console.error('Error fetching nearby users:', error);
      return;
    }

    const transformedUsers = (data || []).map((profile: any) => transformProfileToUser(profile));
    const currentUsers = get().users;
    const currentIds = currentUsers.map((u) => u.id).sort().join(',');
    const newIds = transformedUsers.map((u: User) => u.id).sort().join(',');

    if (currentIds !== newIds || currentUsers.length < 5) {
      set({ users: transformedUsers });
    }
  },

  fetchVenues: async (coords?: Coordinates) => {
    let data: any[] | null = null;
    let error: any = null;

    if (coords) {
      const offset = 0.5;
      const result = await supabase
        .from('venues')
        .select('*')
        .eq('is_verified', true)
        .gte('lat', coords.lat - offset)
        .lte('lat', coords.lat + offset)
        .gte('lng', coords.lng - offset)
        .lte('lng', coords.lng + offset)
        .limit(300);
      data = result.data;
      error = result.error;
    }

    if (!coords || error || !data || data.length === 0) {
      const result = await supabase
        .from('venues')
        .select('*')
        .eq('is_verified', true)
        .order('created_at', { ascending: false })
        .limit(50);
      data = result.data;
      error = result.error;
    }

    if (error) {
      console.error('Error fetching venues:', error);
      return;
    }

    if (data) {
      const uniqueVenues = Array.from(new Map(data.map((v: Venue) => [v.id, v])).values());
      set({ venues: uniqueVenues as Venue[] });
    }
  },

  suggestVenue: async (venueData: Partial<Venue>, photoFile: File | null) => {
    const user = useAuthStore.getState().user;
    if (!user) return false;

    let imageUrl = null;
    if (photoFile) {
      const fileExt = photoFile.name.split('.').pop();
      const filePath = `venues/venue_${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from('user_uploads').upload(filePath, photoFile);
      if (uploadError) {
        console.error('Upload error:', uploadError);
        toast.error('Erro ao enviar a foto.');
        return false;
      }
      imageUrl = filePath;
    }

    const { error } = await supabase.from('venues').insert({
      ...venueData,
      image_url: imageUrl,
      submitted_by: user.id,
      is_verified: false,
      is_partner: false,
      source_type: 'user',
    });

    if (error) {
      console.error('Error submitting venue:', error);
      toast.error('Erro ao enviar sugestão.');
      return false;
    }

    return true;
  },

  setupRealtime: () => {
    get().cleanupRealtime();
    const profile = useAuthStore.getState().profile;
    if (!profile) return;

    const presenceChannel = supabase.channel('online-users');
    presenceChannel
      .on('presence', { event: 'sync' }, () => {
        const newState = presenceChannel.presenceState();
        const userIds = Object.keys(newState).map((key) => (newState[key][0] as any).user_id);
        set({ onlineUsers: userIds });
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await presenceChannel.track({ user_id: profile.id, online_at: new Date().toISOString() });
        }
      });

    set({ presenceChannel });
  },

  cleanupRealtime: () => {
    const { realtimeChannel, presenceChannel } = get();
    if (realtimeChannel) supabase.removeChannel(realtimeChannel);
    if (presenceChannel) supabase.removeChannel(presenceChannel);
    set({ realtimeChannel: null, presenceChannel: null });
  },

  enableTravelMode: async (coords: Coordinates) => {
    const user = useAuthStore.getState().user;
    if (!user) return;

    get().stopLocationWatch();
    set({ myLocation: coords, loading: true });
    useAuthStore.setState({
      user: { ...user, lat: coords.lat, lng: coords.lng, is_traveling: true },
      profile: { ...useAuthStore.getState().profile!, lat: coords.lat, lng: coords.lng, is_traveling: true },
    });

    const { error } = await supabase.rpc('set_my_travel_mode', {
      p_enabled: true,
      p_lat: coords.lat,
      p_lng: coords.lng,
    });

    if (error) {
      console.error('Error enabling travel mode:', error);
      toast.error('Erro ao ativar Modo Viajante.');
      get().requestLocationPermission();
      useAuthStore.getState().fetchProfile(user);
    } else {
      get().fetchNearbyUsers(coords);
      get().fetchVenues(coords);
      get().setupRealtime();
      toast.success('Modo Viajante ativado! ✈️');
    }
    set({ loading: false });
  },

  disableTravelMode: async () => {
    const user = useAuthStore.getState().user;
    if (!user) return;

    set({ loading: true });
    const { error } = await supabase.rpc('set_my_travel_mode', {
      p_enabled: false,
      p_lat: null,
      p_lng: null,
    });

    if (error) {
      toast.error('Erro ao desativar Modo Viajante.');
      set({ loading: false });
      return;
    }

    useAuthStore.setState({
      user: { ...user, is_traveling: false },
      profile: { ...useAuthStore.getState().profile!, is_traveling: false },
    });
    toast.success('Bem-vindo de volta!');
    set({ myLocation: null });
    get().requestLocationPermission();
  },
}));
