export interface RegistryEntry {
  id: string;
}

export class Registry<TEntry extends RegistryEntry> {
  private readonly entries = new Map<string, TEntry>();

  register(entry: TEntry): void {
    if (this.entries.has(entry.id)) {
      throw new Error(`Architecture component already registered: ${entry.id}`);
    }
    this.entries.set(entry.id, entry);
  }

  get(id: string): TEntry | undefined {
    return this.entries.get(id);
  }

  require(id: string): TEntry {
    const entry = this.entries.get(id);
    if (!entry) {
      throw new Error(`Architecture component not registered: ${id}`);
    }
    return entry;
  }

  list(): readonly TEntry[] {
    return [...this.entries.values()];
  }
}
