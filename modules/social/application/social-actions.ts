import type { ConnectionRequestResult, ConnectionState, SocialConnection, WinkResult } from '../domain/social-actions.js';

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
  reportUser(targetId: string, reason: string, comments?: string | null): Promise<number>;
}

export interface SocialActions extends SocialActionsRepository {}

export function createSocialActions(repository: SocialActionsRepository): SocialActions {
  return repository;
}
