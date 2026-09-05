import type { ActorContext, EngineContract, RequestContext } from '../../core';

export interface AuthorizationRequest {
  actor: ActorContext;
  action: string;
  resource: string;
  resourceId?: string;
  attributes?: Readonly<Record<string, unknown>>;
}

export interface AuthorizationDecision {
  allowed: boolean;
  reason?: string;
}

export interface AuthorizationEngine extends EngineContract {
  readonly id: 'authorization';
  authorize(request: AuthorizationRequest, context: RequestContext): Promise<AuthorizationDecision>;
}
