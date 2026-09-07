import { supabase } from '../../lib/supabase';

export type ProfilePatch = Record<string, unknown>;

const EDITABLE_PROFILE_FIELDS = new Set([
  'username','display_name','avatar_url','date_of_birth','height_cm','weight_kg',
  'status_text','position','hiv_status','public_photos','status_relacionamento',
  'tipo_corpo','etnia','habitos_fumo','habitos_bebida','redes_sociais','kinks',
  'can_host','video_url','gender_identity','pronouns','sexual_orientation',
  'relationship_status','looking_for','interests','tribes_configured','visibility',
  'oral_preference','accommodation_preference','has_completed_onboarding','has_seen_tour',
]);

export interface CheckinState {
  venue_id: string | null;
  venue_name: string | null;
  checked_in_at: string | null;
}

export interface PublicProfileIdentity {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
}

export interface VerificationRequestResult {
  request_id: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
}

export const pickEditableProfilePatch = (input: Record<string, unknown>): ProfilePatch =>
  Object.fromEntries(Object.entries(input).filter(([key]) => EDITABLE_PROFILE_FIELDS.has(key)));

export const updateMyProfile = async (patch: ProfilePatch): Promise<any> => {
  const { data, error } = await supabase.rpc('update_my_profile_v1', { p_patch: patch });
  if (error) throw error;
  return data;
};

export const setMyCheckin = async (venueId: string | null): Promise<CheckinState> => {
  const { data, error } = await supabase.rpc('set_my_checkin_v1', { p_venue_id: venueId });
  if (error) throw error;
  return data as CheckinState;
};

export const setMyIncognito = async (enabled: boolean): Promise<boolean> => {
  const { data, error } = await supabase.rpc('set_my_incognito_v1', { p_enabled: enabled });
  if (error) throw error;
  return Boolean(data);
};

export const submitMyVerificationRequest = async (estimatedAge: number): Promise<VerificationRequestResult> => {
  const { data, error } = await supabase.rpc('submit_profile_verification_v1', {
    p_estimated_age: estimatedAge,
  });
  if (error) throw error;
  return data as VerificationRequestResult;
};

export const getPublicProfile = async (profileId: string): Promise<any | null> => {
  const { data, error } = await supabase.rpc('get_public_profile_v1', { p_profile_id: profileId });
  if (error) throw error;
  return Array.isArray(data) ? (data[0] ?? null) : data;
};

export const getPublicProfileIdentities = async (profileIds: string[]): Promise<Map<string, PublicProfileIdentity>> => {
  const uniqueIds = Array.from(new Set(profileIds.filter(Boolean)));
  const entries = await Promise.all(uniqueIds.map(async (id) => {
    try {
      const profile = await getPublicProfile(id);
      if (!profile) return null;
      return [id, {
        id,
        username: profile.username ?? null,
        display_name: profile.display_name ?? null,
        avatar_url: profile.avatar_url ?? null,
      }] as const;
    } catch {
      return null;
    }
  }));

  return new Map(entries.filter((entry): entry is readonly [string, PublicProfileIdentity] => entry !== null));
};