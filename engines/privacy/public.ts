import type { ActorContext, EngineContract } from '../../core';

export interface LocationPoint {
  lat: number;
  lng: number;
}

export interface PrivacyEngine extends EngineContract {
  readonly id: 'privacy';
  canView(actor: ActorContext | undefined, resource: string, ownerId: string): Promise<boolean>;
  approximateLocation(point: LocationPoint, precisionMeters: number): LocationPoint;
}
