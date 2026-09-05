import type { EngineContract, RequestContext } from '../../core';

export interface ModerationInput {
  actorId?: string;
  subjectType: string;
  subjectId: string;
  signals?: Readonly<Record<string, unknown>>;
}

export interface ModerationDecision {
  action: 'allow' | 'review' | 'restrict' | 'block';
  reason?: string;
}

export interface ModerationEngine extends EngineContract {
  readonly id: 'moderation';
  evaluate(input: ModerationInput, context: RequestContext): Promise<ModerationDecision>;
}
