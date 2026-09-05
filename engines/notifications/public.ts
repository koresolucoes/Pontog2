import type { EngineContract, RequestContext } from '../../core';

export interface NotificationCommand {
  template: string;
  recipientId: string;
  data?: Readonly<Record<string, unknown>>;
  deduplicationKey?: string;
}

export interface NotificationResult {
  accepted: boolean;
  providerMessageId?: string;
}

export interface NotificationEngine extends EngineContract {
  readonly id: 'notifications';
  send(command: NotificationCommand, context: RequestContext): Promise<NotificationResult>;
}
