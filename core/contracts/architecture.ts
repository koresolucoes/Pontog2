export type EngineId =
  | 'security'
  | 'authorization'
  | 'realtime'
  | 'notifications'
  | 'media'
  | 'payments'
  | 'moderation'
  | 'privacy'
  | 'observability';

export type ModuleId =
  | 'identity'
  | 'profiles'
  | 'discovery'
  | 'messaging'
  | 'albums'
  | 'social'
  | 'communities'
  | 'venues'
  | 'subscriptions'
  | 'trust-safety'
  | 'partnerships'
  | 'admin';

export interface ArchitectureComponent<TId extends string = string> {
  id: TId;
  version: string;
}

export interface EngineContract extends ArchitectureComponent<EngineId> {}

export interface ModuleContract extends ArchitectureComponent<ModuleId> {
  engines: readonly EngineId[];
  ownsData: readonly string[];
  publishes: readonly string[];
  consumes: readonly string[];
}

export interface PluginManifest extends ArchitectureComponent<string> {
  capabilities: readonly string[];
  requiredEngines?: readonly EngineId[];
}
