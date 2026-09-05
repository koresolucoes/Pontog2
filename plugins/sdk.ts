import type { EngineId, PluginManifest } from '../core';

export interface PluginContext {
  hasCapability(capability: string): boolean;
  requireCapability(capability: string): void;
  getEngine<TContract>(engineId: EngineId): TContract;
}

export interface PontoGPlugin {
  readonly manifest: PluginManifest;
  register(context: PluginContext): void | Promise<void>;
}
