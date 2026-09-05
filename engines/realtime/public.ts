import type { EngineContract } from '../../core';

export interface RealtimeSubscription {
  key: string;
  dispose(): Promise<void> | void;
}

export interface RealtimeEngine extends EngineContract {
  readonly id: 'realtime';
  subscribe(channel: string, handler: (payload: unknown) => void): Promise<RealtimeSubscription>;
  disposeScope(scope: string): Promise<void>;
}
