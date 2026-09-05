import type { EngineContract, RequestContext } from '../../core';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface ObservabilityEngine extends EngineContract {
  readonly id: 'observability';
  log(level: LogLevel, message: string, data: Readonly<Record<string, unknown>> | undefined, context: RequestContext): void;
  metric(name: string, value: number, tags?: Readonly<Record<string, string>>): void;
}
