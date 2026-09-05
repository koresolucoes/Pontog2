export interface DomainEvent<TPayload = unknown> {
  name: string;
  occurredAt: string;
  payload: TPayload;
  correlationId?: string;
  actorId?: string;
}

export type EventHandler<TPayload = unknown> = (
  event: DomainEvent<TPayload>,
) => void | Promise<void>;

export interface EventBus {
  publish<TPayload>(event: DomainEvent<TPayload>): Promise<void>;
  subscribe<TPayload>(eventName: string, handler: EventHandler<TPayload>): () => void;
}
