import { supabase } from '../../../lib/supabase';
import type { ProfileReadRepository } from '../application/queries';
import type {
  NearbyProfileV2,
  NearbyProfilesQuery,
  PublicProfileV1,
} from '../domain/public-profile';

export const supabaseProfileReadRepository: ProfileReadRepository = {
  async getPublicProfile(profileId: string): Promise<PublicProfileV1 | null> {
    const { data, error } = await supabase.rpc('get_public_profile_v1', {
      p_profile_id: profileId,
    });

    if (error) throw error;
    return (data?.[0] as PublicProfileV1 | undefined) ?? null;
  },

  async getNearbyProfiles(query: NearbyProfilesQuery): Promise<NearbyProfileV2[]> {
    const { data, error } = await supabase.rpc('get_nearby_profiles_v2', {
      p_lat: query.lat,
      p_lng: query.lng,
      p_limit: query.limit ?? 50,
      p_radius_km: query.radiusKm ?? 50,
    });

    if (error) throw error;
    return (data ?? []) as NearbyProfileV2[];
  },
};
