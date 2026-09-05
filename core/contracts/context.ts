export type RequestSource = 'http' | 'job' | 'event' | 'plugin' | 'ui';

export interface ActorContext {
  userId: string;
  roles: readonly string[];
  sessionId?: string;
}

export interface RequestContext {
  requestId: string;
  source: RequestSource;
  actor?: ActorContext;
  correlationId?: string;
  locale?: string;
}
