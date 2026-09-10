import type { EngineContract, RequestContext } from '../../core';

export type ModerationSubjectType =
  | 'user'
  | 'agora_post'
  | 'agora_comment'
  | 'video'
  | 'video_comment'
  | 'community'
  | 'community_post'
  | 'community_comment'
  | 'venue_review'
  | 'venue_review_reply';

export type ModerationSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface ModerationInput {
  actorId?: string;
  subjectType: ModerationSubjectType;
  subjectId: string;
  signals?: Readonly<Record<string, unknown>>;
}

export interface ModerationDecision {
  action: 'allow' | 'review' | 'restrict' | 'block';
  reason?: string;
}

export interface ModerationReportSubmission {
  targetType: Exclude<ModerationSubjectType, 'user'>;
  targetId: string;
  reason: string;
  comments?: string | null;
}

export interface ModerationEngine extends EngineContract {
  readonly id: 'moderation';
  evaluate(input: ModerationInput, context: RequestContext): Promise<ModerationDecision>;
}
