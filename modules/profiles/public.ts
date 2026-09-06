import { createProfileQueries } from './application/queries';
import { supabaseProfileReadRepository } from './infrastructure/supabase-profile-read.repository';

export type {
  NearbyProfileV2,
  NearbyProfilesQuery,
  PublicProfileV1,
} from './domain/public-profile';

export type {
  ProfileQueries,
  ProfileReadRepository,
} from './application/queries';

export const profileQueries = createProfileQueries(supabaseProfileReadRepository);
