import type { EngineContract, RequestContext } from '../../core';

export type NotificationTemplate =
  | 'message.received'
  | 'wink.received'
  | 'album.access_requested';

export interface NotificationCommand {
  template: NotificationTemplate;
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
