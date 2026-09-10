import type { ConnectionRequestResult, ConnectionState, SocialConnection, WinkResult } from '../domain/social-actions.js';

export type ReportableContentType =
  | 'agora_post'
  | 'agora_comment'
  | 'video'
  | 'video_comment'
  | 'community'
  | 'community_post'
  | 'community_comment'
  | 'venue_review'
  | 'venue_review_reply';

export interface SocialActionsRepository {
  setFavorite(targetId: string, enabled: boolean): Promise<boolean>;
  sendWink(targetId: string): Promise<WinkResult>;
  getConnectionState(otherId: string): Promise<ConnectionState | null>;
  getMyConnections(): Promise<SocialConnection[]>;
  requestConnection(targetId: string, firstMessage?: string | null): Promise<ConnectionRequestResult>;
  acceptConnection(connectionId: string): Promise<string>;
  rejectConnection(connectionId: string): Promise<boolean>;
  blockUser(targetId: string): Promise<boolean>;
  unblockUser(targetId: string): Promise<boolean>;
  hideProfile(targetId: string): Promise<void>;
  unhideProfile(targetId: string): Promise<void>;
  reportUser(targetId: string, reason: string, comments?: string | null): Promise<number>;
  reportContent(targetType: ReportableContentType, targetId: string, reason: string, comments?: string | null): Promise<number>;
}

export interface SocialActions extends SocialActionsRepository {}

export function createSocialActions(repository: SocialActionsRepository): SocialActions {
  return repository;
}
