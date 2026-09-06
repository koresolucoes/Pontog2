import type {
  NearbyProfileV2,
  NearbyProfilesQuery,
  PublicProfileV1,
} from '../domain/public-profile';

export interface ProfileReadRepository {
  getPublicProfile(profileId: string): Promise<PublicProfileV1 | null>;
  getNearbyProfiles(query: NearbyProfilesQuery): Promise<NearbyProfileV2[]>;
}

export interface ProfileQueries {
  getPublicProfile(profileId: string): Promise<PublicProfileV1 | null>;
  getNearbyProfiles(query: NearbyProfilesQuery): Promise<NearbyProfileV2[]>;
}

export function createProfileQueries(repository: ProfileReadRepository): ProfileQueries {
  return {
    getPublicProfile(profileId) {
      return repository.getPublicProfile(profileId);
    },
    getNearbyProfiles(query) {
      return repository.getNearbyProfiles(query);
    },
  };
}
