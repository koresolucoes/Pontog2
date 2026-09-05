import type { EngineContract, RequestContext } from '../../core';

export interface PaymentCommand {
  operation: string;
  actorId?: string;
  amountMinor?: number;
  currency?: string;
  idempotencyKey: string;
  metadata?: Readonly<Record<string, unknown>>;
}

export interface PaymentResult {
  status: 'accepted' | 'processed' | 'ignored' | 'failed';
  providerReference?: string;
}

export interface PaymentEngine extends EngineContract {
  readonly id: 'payments';
  execute(command: PaymentCommand, context: RequestContext): Promise<PaymentResult>;
}
