import type { AgoraFeedPage } from '../domain/agora-feed.js';

export interface AgoraFeedRepository {
  getPage(actorUserId: string, page: number, limit: number): Promise<AgoraFeedPage>;
}

export interface AgoraFeedQueries {
  getPage(actorUserId: string, page: number, limit: number): Promise<AgoraFeedPage>;
}

export function createAgoraFeedQueries(repository: AgoraFeedRepository): AgoraFeedQueries {
  return {
    getPage(actorUserId, page, limit) {
      return repository.getPage(actorUserId, page, limit);
    },
  };
}
