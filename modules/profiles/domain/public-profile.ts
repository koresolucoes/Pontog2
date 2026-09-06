export interface PublicProfileV1 {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  public_photos: string[] | null;
  video_url: string | null;
  status_text: string | null;
  age: number | null;
  profile_position: string | null;
  relationship_status: string | null;
  body_type: string | null;
  gender_identity: string | null;
  pronouns: string | null;
  sexual_orientation: string | null;
  looking_for: string[] | null;
  interests: string[] | null;
  can_host: boolean | null;
  is_verified: boolean;
  subscription_tier: string;
  has_private_albums: boolean;
}

export interface NearbyProfileV2 {
  id: string;
  username: string | null;
  avatar_url: string | null;
  age: number | null;
  status_text: string | null;
  approximate_lat: number;
  approximate_lng: number;
  distance_band: string;
  is_verified: boolean;
  subscription_tier: string;
  tribes: string[];
}

export interface NearbyProfilesQuery {
  lat: number;
  lng: number;
  limit?: number;
  radiusKm?: number;
}
