export type {
  AgoraFeedItem,
  AgoraFeedPage,
  AgoraFeedUserPost,
  AgoraFeedVenuePost,
} from './domain/agora-feed.js';
export type { AgoraFeedQueries, AgoraFeedRepository } from './application/agora-feed.js';
export { createAgoraFeedQueries } from './application/agora-feed.js';
export { createSupabaseAgoraFeedRepository } from './infrastructure/agora-feed.supabase.js';

export type {
  ConnectionRequestResult,
  ConnectionState,
  ConnectionStatus,
  SocialConnection,
  WinkResult,
} from './domain/social-actions.js';
export type { SocialActions, SocialActionsRepository } from './application/social-actions.js';
export { createSocialActions } from './application/social-actions.js';
export { supabaseSocialActionsRepository } from './infrastructure/social-actions.supabase.js';

import { createSocialActions } from './application/social-actions.js';
import { supabaseSocialActionsRepository } from './infrastructure/social-actions.supabase.js';

export const socialActions = createSocialActions(supabaseSocialActionsRepository);
