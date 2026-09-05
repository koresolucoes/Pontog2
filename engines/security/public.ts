import type { ActorContext, EngineContract, RequestContext } from '../../core';

export interface AuthenticationInput {
  authorization?: string;
  apiKey?: string;
  ip?: string;
  userAgent?: string;
}

export interface SecurityEngine extends EngineContract {
  readonly id: 'security';
  authenticate(input: AuthenticationInput, context: RequestContext): Promise<ActorContext | null>;
  assertConfigured(): void;
}
