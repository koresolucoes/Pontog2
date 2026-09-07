import { supabase } from '../../../lib/supabase';
import type { EditableProfilePatch, ProfileWriteRepository } from '../application/commands';

export const supabaseProfileWriteRepository: ProfileWriteRepository = {
  async updateOwnProfile(patch: EditableProfilePatch) {
    const { data, error } = await supabase.rpc('update_my_profile_v1', { p_patch: patch });
    if (error) throw error;
    return data;
  },
};
