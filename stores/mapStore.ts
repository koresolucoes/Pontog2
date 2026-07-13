
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
  lastLocationUpdate: number; // Timestamp for throttling
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
  setFilters: (newFilters) => set(state => ({ filters: { ...state.filters, ...newFilters } })),

  requestLocationPermission: () => {
    const authUser = useAuthStore.getState().user;
    
    if (authUser?.is_traveling && authUser.lat && authUser.lng) {
        console.log("Modo Viajante detectado. Usando coordenadas salvas.", { lat: authUser.lat, lng: authUser.lng });
        const travelLocation = { lat: authUser.lat, lng: authUser.lng };
        set({ myLocation: travelLocation, loading: false, error: null });
        get().fetchNearbyUsers(travelLocation);
        get().fetchVenues(travelLocation); 
        get().setupRealtime();
        return;
    }

    if (get().watchId) {
      get().stopLocationWatch();
    }

    if (navigator.geolocation) {
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
            
            // Check distance threshold (approx 50 meters) to avoid jitter
            // 0.0005 degrees is roughly 55 meters
            const hasMoved = !oldLocation || 
                Math.abs(oldLocation.lat - newLocation.lat) > 0.0005 || 
                Math.abs(oldLocation.lng - newLocation.lng) > 0.0005;

            if (hasMoved) {
              set({ myLocation: newLocation, loading: false, error: null });
              // Update DB and fetch venues only if moved significantly
              get().updateMyLocationInDb(newLocation);
              get().fetchVenues(newLocation);
            } 
            
            // Always fetch users on the interval to get new people/updates
            // This replaces the expensive realtime listener
            get().fetchNearbyUsers(newLocation);

          },
          (error) => {
            if (error.code !== error.PERMISSION_DENIED) {
                console.error("Geolocation error:", error);
            }
            if (!get().myLocation) {
                set({ 
                  loading: false, 
                  error: "Não foi possível obter sua localização. Verifique as permissões do seu navegador e tente novamente." 
                });
            }
            // Don't stop watch on temporary errors, but handle permission denied
            if (error.code === error.PERMISSION_DENIED) {
                get().stopLocationWatch();
            }
          },
          { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
        );
      };

      // Run immediately
      updateLocation();
      
      // Poll every 45 seconds (Balanced for performance vs freshness)
      const intervalId = setInterval(updateLocation, 45000);
      set({ watchId: intervalId as any });
      get().setupRealtime();

    } else {
      set({ loading: false, error: "Geolocalização não é suportada por este navegador." });
    }
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
    if (!user) return;
    if (user.is_traveling) return;

    // THROTTLING: Ensure we don't write to DB more than once every 60 seconds
    const now = Date.now();
    const lastUpdate = get().lastLocationUpdate;
    if (now - lastUpdate < 60000) {
        return; 
    }

    set({ lastLocationUpdate: now });

    let { lat, lng } = coords;

    // Check if user is a Plus member. If not, add location fuzzing for physical safety.
    const profile = useAuthStore.getState().profile;
    const isPlus = profile?.subscription_tier === 'plus';

    if (!isPlus) {
        // Apply random displacement between 100m and 400m
        // Earth radius ~ 6,378,137m
        const radius = 100 + Math.random() * 300; // 100m to 400m
        const angle = Math.random() * 2 * Math.PI;

        const latOffset = (radius * Math.sin(angle)) / 111111;
        const lngOffset = (radius * Math.cos(angle)) / (111111 * Math.cos(lat * Math.PI / 180));

        lat += latOffset;
        lng += lngOffset;
    }

    // Fire and forget - don't await to block UI
    supabase.rpc('update_my_location', {
        new_lat: lat,
        new_lng: lng
    }).then(({ error }) => {
        if(error) console.error("Error updating location in DB:", error);
    });
  },

  fetchNearbyUsers: async (coords: Coordinates) => {
    const { lat, lng } = coords;
    // Fetch users within range (DB function handles limit/radius)
    const { data, error } = await supabase.rpc('get_nearby_profiles', {
        p_lat: lat,
        p_lng: lng
    });

    if (error) {
        console.error("Error fetching nearby users:", error);
        return;
    }

    if (data) {
        // Fetch missing columns that the RPC might not return
        const userIds = data.map((u: any) => u.id);
        const { data: profilesData } = await supabase.from('profiles').select('id, current_checkin_venue_id, current_checkin_venue_name, looking_for, kinks').in('id', userIds);
        
        const profilesMap = new Map();
        if (profilesData) {
            profilesData.forEach(p => profilesMap.set(p.id, p));
        }

        const transformedUsers = data.map((profile: any) => {
           const p = profilesMap.get(profile.id);
           if (p) {
               profile.current_checkin_venue_id = p.current_checkin_venue_id;
               profile.current_checkin_venue_name = p.current_checkin_venue_name;
               profile.looking_for = p.looking_for || profile.looking_for;
               profile.kinks = p.kinks || profile.kinks;
           }
           return transformProfileToUser(profile);
        });
        
        // PERFORMANCE OPTIMIZATION:
        // Only update state if the user list has actually changed.
        // We compare the IDs of the new list with the current list.
        const currentUsers = get().users;
        const currentIds = currentUsers.map(u => u.id).sort().join(',');
        const newIds = transformedUsers.map((u: User) => u.id).sort().join(',');

        // If IDs are different OR counts are different, update.
        // Also update if we have very few users (force refresh) to be safe.
        if (currentIds !== newIds || currentUsers.length < 5) {
             set({ users: transformedUsers });
        }
    }
  },

  fetchVenues: async (coords?: Coordinates) => {
      let data, error;

      if (coords) {
          const offset = 0.5; // Aproximadamente 55km de raio de busca
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
          console.error("Error fetching venues:", error);
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
          const fileName = `venue_${Date.now()}.${fileExt}`;
          const filePath = `venues/${fileName}`; 

          const { error: uploadError } = await supabase.storage
              .from('user_uploads')
              .upload(filePath, photoFile);
          
          if (uploadError) {
              console.error("Upload error:", uploadError);
              toast.error("Erro ao enviar a foto.");
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
          source_type: 'user'
      });

      if (error) {
          console.error("Error submitting venue:", error);
          toast.error("Erro ao enviar sugestão.");
          return false;
      }

      return true;
  },

  setupRealtime: () => {
    // Clean up existing to prevent duplicates
    get().cleanupRealtime();

    const profile = useAuthStore.getState().profile;
    if (!profile) return;

    // 1. Presence: Lightweight, efficient for online status
    const presenceChannel = supabase.channel('online-users');
    presenceChannel
        .on('presence', { event: 'sync' }, () => {
            const newState = presenceChannel.presenceState();
            // Transform presence state into a flat list of user IDs
            const userIds = Object.keys(newState).map(key => (newState[key][0] as any).user_id);
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
    if (realtimeChannel) {
        supabase.removeChannel(realtimeChannel);
    }
    if (presenceChannel) {
        supabase.removeChannel(presenceChannel);
    }
    set({ realtimeChannel: null, presenceChannel: null });
  },

  enableTravelMode: async (coords: Coordinates) => {
      const user = useAuthStore.getState().user;
      if (!user) return;

      get().stopLocationWatch();
      
      set({ myLocation: coords, loading: true });
      
      useAuthStore.setState({ 
          user: { ...user, lat: coords.lat, lng: coords.lng, is_traveling: true },
          profile: { ...useAuthStore.getState().profile!, lat: coords.lat, lng: coords.lng, is_traveling: true }
      });

      const { error } = await supabase
          .from('profiles')
          .update({ 
              lat: coords.lat, 
              lng: coords.lng, 
              is_traveling: true 
          })
          .eq('id', user.id);

      if (error) {
          console.error("Error enabling travel mode:", error);
          toast.error("Erro ao ativar Modo Viajante.");
          get().requestLocationPermission();
          
          useAuthStore.getState().fetchProfile(user);
      } else {
          get().fetchNearbyUsers(coords);
          get().fetchVenues(coords); 
          get().setupRealtime();
          toast.success("Modo Viajante ativado! ✈️");
      }
      set({ loading: false });
  },

  disableTravelMode: async () => {
      const user = useAuthStore.getState().user;
      if (!user) return;

      set({ loading: true });

      const { error } = await supabase
          .from('profiles')
          .update({ is_traveling: false })
          .eq('id', user.id);

      if (error) {
          toast.error("Erro ao desativar Modo Viajante.");
          set({ loading: false });
      } else {
          useAuthStore.setState({ 
              user: { ...user, is_traveling: false },
              profile: { ...useAuthStore.getState().profile!, is_traveling: false }
          });
          toast.success("Bem-vindo de volta!");
          
          set({ myLocation: null }); 
          get().requestLocationPermission();
      }
  }
}));
