/**
 * SYS-03-FLAGS: Centralized flag store with namespace prefixes.
 * Namespaces: met., secret., quest., mood., count., cross., run., time.
 * Supports boolean and numeric flags.
 */

// Valid namespace prefixes
const VALID_NAMESPACES = ['met.', 'secret.', 'quest.', 'mood.', 'count.', 'cross.', 'run.', 'time.', 'fact.'];

export class FlagSystem {
  private flags: Map<string, boolean | number> = new Map();
  private registeredKeys: Set<string> = new Set();

  /** Register a flag key (for orphan detection) */
  register(key: string): void {
    this.validateNamespace(key);
    this.registeredKeys.add(key);
  }

  /** Set a boolean flag */
  set(key: string, value: boolean | number): void {
    this.validateNamespace(key);
    this.flags.set(key, value);
  }

  /** Get a flag value (default false for boolean, 0 for number) */
  get(key: string): boolean | number {
    return this.flags.get(key) ?? false;
  }

  /** Check if a boolean flag is true */
  check(key: string): boolean {
    const val = this.flags.get(key);
    return val === true || (typeof val === 'number' && val > 0);
  }

  /** Increment a numeric flag */
  increment(key: string, amount: number = 1): number {
    const current = this.flags.get(key);
    const numVal = typeof current === 'number' ? current : 0;
    const newVal = numVal + amount;
    this.flags.set(key, newVal);
    return newVal;
  }

  /** Clear a flag */
  clear(key: string): void {
    this.flags.delete(key);
  }

  /** Serialize all flags for save */
  serialize(): Record<string, boolean | number> {
    const result: Record<string, boolean | number> = {};
    for (const [k, v] of this.flags) {
      result[k] = v;
    }
    return result;
  }

  /** Load flags from save data */
  deserialize(data: Record<string, boolean | number>): void {
    this.flags.clear();
    for (const key of Object.keys(data)) {
      this.flags.set(key, data[key]);
    }
  }

  /** Reset all flags (new game) */
  reset(): void {
    this.flags.clear();
  }

  /**
   * SYS-03 flag_audit(): Detect orphans and dangling references.
   * Orphan = flag set but never registered.
   * Dangling = registered key never set.
   */
  flagAudit(): { orphans: string[]; dangling: string[] } {
    const orphans: string[] = [];
    const dangling: string[] = [];

    for (const key of this.flags.keys()) {
      if (!this.registeredKeys.has(key)) {
        orphans.push(key);
      }
    }
    for (const key of this.registeredKeys) {
      if (!this.flags.has(key)) {
        dangling.push(key);
      }
    }

    if (orphans.length > 0 || dangling.length > 0) {
      console.log(`[FlagSystem] Audit: ${orphans.length} orphan(s), ${dangling.length} dangling`);
      if (orphans.length > 0) console.log(`[FlagSystem]   Orphans: ${orphans.join(', ')}`);
      if (dangling.length > 0) console.log(`[FlagSystem]   Dangling: ${dangling.join(', ')}`);
    }

    return { orphans, dangling };
  }

  private validateNamespace(key: string): void {
    const hasValidPrefix = VALID_NAMESPACES.some(ns => key.startsWith(ns));
    if (!hasValidPrefix) {
      console.log(`[FlagSystem] WARNING: Key "${key}" missing namespace prefix`);
    }
  }
}
