import { createProfileQueries } from './application/queries';
import { createProfileCommands } from './application/commands';
import { supabaseProfileReadRepository } from './infrastructure/supabase-profile-read.repository';
import { supabaseProfileWriteRepository } from './infrastructure/supabase-profile-write.repository';

export type {
  NearbyProfileV2,
  NearbyProfilesQuery,
  PublicProfileV1,
} from './domain/public-profile';

export type {
  ProfileQueries,
  ProfileReadRepository,
} from './application/queries';

export type {
  EditableProfilePatch,
  ProfileCommands,
  ProfileWriteRepository,
} from './application/commands';

export const profileQueries = createProfileQueries(supabaseProfileReadRepository);
export const profileCommands = createProfileCommands(supabaseProfileWriteRepository);
