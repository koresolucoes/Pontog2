export type EditableProfilePatch = {
  username?: string | null;
  display_name?: string | null;
  avatar_url?: string | null;
  date_of_birth?: string | null;
  height_cm?: number | null;
  weight_kg?: number | null;
  status_text?: string | null;
  position?: string | null;
  hiv_status?: string | null;
  public_photos?: string[];
  redes_sociais?: Record<string, string> | null;
  kinks?: string[];
  can_host?: boolean;
  video_url?: string | null;
  gender_identity?: string | null;
  pronouns?: string | null;
  sexual_orientation?: string | null;
  relationship_status?: string | null;
  looking_for?: string[];
  interests?: string[];
  tribes_configured?: boolean;
  visibility?: string | null;
  oral_preference?: string | null;
  accommodation_preference?: string | null;
  has_completed_onboarding?: boolean;
  has_seen_tour?: boolean;
};

export interface ProfileWriteRepository {
  updateOwnProfile(patch: EditableProfilePatch): Promise<unknown>;
}

export interface ProfileCommands {
  updateOwnProfile(patch: EditableProfilePatch): Promise<unknown>;
}

export const createProfileCommands = (repository: ProfileWriteRepository): ProfileCommands => ({
  updateOwnProfile: (patch) => repository.updateOwnProfile(patch),
});
