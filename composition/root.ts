import type { EngineContract, ModuleContract, PluginManifest } from '../core';
import { Registry } from '../core';
import { domainModuleManifest } from '../modules/manifest';

export interface ArchitectureRoot {
  engines: Registry<EngineContract>;
  modules: Registry<ModuleContract>;
  plugins: Registry<PluginManifest>;
}

export function createArchitectureRoot(): ArchitectureRoot {
  const engines = new Registry<EngineContract>();
  const modules = new Registry<ModuleContract>();
  const plugins = new Registry<PluginManifest>();

  for (const moduleDefinition of domainModuleManifest) {
    modules.register(moduleDefinition);
  }

  return { engines, modules, plugins };
}
