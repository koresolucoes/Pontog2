import type { ActorContext, EngineContract } from '../../core';

export type MediaVisibility = 'public' | 'private';

export interface MediaDescriptor {
  id: string;
  ownerId: string;
  visibility: MediaVisibility;
  mimeType: string;
  sizeBytes?: number;
}

export interface MediaEngine extends EngineContract {
  readonly id: 'media';
  validateUpload(input: Pick<MediaDescriptor, 'mimeType' | 'sizeBytes'>): void;
  canMutate(actor: ActorContext, media: MediaDescriptor): Promise<boolean>;
  createReadUrl(media: MediaDescriptor, actor?: ActorContext): Promise<string>;
}
