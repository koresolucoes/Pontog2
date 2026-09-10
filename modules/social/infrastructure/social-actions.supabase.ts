import { supabase } from '../../../lib/supabase.js';
import type { SocialActionsRepository } from '../application/social-actions.js';
import type { ConnectionRequestResult, ConnectionState, SocialConnection, WinkResult } from '../domain/social-actions.js';

function firstRow<T>(value: T[] | T | null): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

export const supabaseSocialActionsRepository: SocialActionsRepository = {
  async setFavorite(targetId, enabled) {
    const { data, error } = await supabase.rpc('set_favorite_v1', {
      p_target_id: targetId,
      p_enabled: enabled,
    });
    if (error) throw error;
    return Boolean(data);
  },

  async sendWink(targetId) {
    const { data, error } = await supabase.rpc('send_wink', {
      p_receiver_id: targetId,
    });
    if (error) throw error;
    return String(data) as WinkResult;
  },

  async getConnectionState(otherId) {
    const { data, error } = await supabase.rpc('get_connection_state_v1', {
      p_other_id: otherId,
    });
    if (error) throw error;
    return (data as ConnectionState | null) ?? null;
  },

  async getMyConnections() {
    const { data, error } = await supabase.rpc('get_my_connections_v1');
    if (error) throw error;
    return (data ?? []) as SocialConnection[];
  },

  async requestConnection(targetId, firstMessage = null) {
    const { data, error } = await supabase.rpc('request_connection_v1', {
      p_target_id: targetId,
      p_first_message: firstMessage,
    });
    if (error) throw error;
    const row = firstRow(data as ConnectionRequestResult[] | null);
    if (!row) throw new Error('connection_request_failed');
    return row;
  },

  async acceptConnection(connectionId) {
    const { data, error } = await supabase.rpc('accept_connection_v1', {
      p_connection_id: connectionId,
    });
    if (error) throw error;
    return String(data);
  },

  async rejectConnection(connectionId) {
    const { data, error } = await supabase.rpc('reject_connection_v1', {
      p_connection_id: connectionId,
    });
    if (error) throw error;
    return Boolean(data);
  },

  async blockUser(targetId) {
    const { data, error } = await supabase.rpc('block_user_v1', {
      p_target_id: targetId,
    });
    if (error) throw error;
    return Boolean(data);
  },

  async unblockUser(targetId) {
    const { data, error } = await supabase.rpc('unblock_user_v1', {
      p_target_id: targetId,
    });
    if (error) throw error;
    return Boolean(data);
  },

  async hideProfile(targetId) {
    const { error } = await supabase.rpc('hide_profile_v1', {
      p_hidden_id: targetId,
    });
    if (error) throw error;
  },

  async unhideProfile(targetId) {
    const { error } = await supabase.rpc('unhide_profile_v1', {
      p_hidden_id: targetId,
    });
    if (error) throw error;
  },

  async reportUser(targetId, reason, comments = null) {
    const { data, error } = await supabase.rpc('report_user_v1', {
      p_target_id: targetId,
      p_reason: reason,
      p_comments: comments,
    });
    if (error) throw error;
    return Number(data);
  },

  async reportContent(targetType, targetId, reason, comments = null) {
    const { data, error } = await supabase.rpc('report_content_v1', {
      p_target_type: targetType,
      p_target_id: targetId,
      p_reason: reason,
      p_comments: comments,
    });
    if (error) throw error;
    return Number(data);
  },
};
