/**
 * RosterManager
 *
 * Manages the hero collection and party roster selection.
 * All 5 heroes are available in the collection; the player picks exactly 3
 * for their active roster before entering a dungeon.
 *
 * New in this revision:
 * - HP tracking (current/max per hero) persists across dungeons
 * - calculateDamageByColor() for the detail overlay damage table
 * - equipToSlot() / removeFromSlot() for simplified tap-to-equip interaction
 *
 * This is a plain class instantiated by GameComponent.
 */
import { HERO_CATALOG, type HeroData } from './HeroCatalog';
import { GemType } from './Types';

const MAX_ROSTER_SIZE = 3;
const BASE_MATCH_SIZE = 3;
const MAX_HERO_LEVEL = 10;

/** Per-hero HP state that persists across dungeon runs */
export interface HeroHpState {
  current: number;
  max: number;
}

/** Per-hero XP/level state that persists across dungeon runs */
export interface HeroXpState {
  xp: number;
  level: number;
}

/**
 * XP required to reach the NEXT level from the given level.
 * Level 1 → 2 requires 100 XP, Level 2 → 3 requires 200, ..., Level 9 → 10 requires 900.
 */
export function xpRequiredForLevel(level: number): number {
  return level * 100;
}

/**
 * Level multiplier for damage scaling.
 * Linear from 1.0x (level 1) to 2.0x (level 10).
 * Formula: 1.0 + (level - 1) * (1/9)
 */
export function getLevelMultiplier(level: number): number {
  return 1.0 + (level - 1) * (1.0 / 9.0);
}

export class RosterManager {
  /** IDs of heroes the player currently owns (catalog order) */
  private _ownedIds: Set<string> = new Set();

  /** Heroes the player owns, in catalog order */
  get collection(): HeroData[] {
    return HERO_CATALOG.filter(h => this._ownedIds.has(h.id));
  }

  /** Heroes not yet owned */
  getUnownedHeroes(): HeroData[] {
    return HERO_CATALOG.filter(h => !this._ownedIds.has(h.id));
  }

  hasAllHeroes(): boolean {
    return this._ownedIds.size >= HERO_CATALOG.length;
  }

  getOwnedIds(): string[] {
    return Array.from(this._ownedIds);
  }

  /** Currently selected roster (max 3) — stored as fixed-size array with nulls for empty slots */
  rosterSlots: (HeroData | null)[] = [null, null, null];

  /** Index of the hero currently shown in the details panel (-1 = none) */
  selectedIndex: number = -1;

  /** HP state map keyed by hero id */
  heroHp: Map<string, HeroHpState> = new Map();

  /** XP/level state map keyed by hero id */
  heroXp: Map<string, HeroXpState> = new Map();

  /** Death timestamps keyed by hero id (ms since epoch, set when HP drops to 0) */
  heroDeathTime: Map<string, number> = new Map();

  constructor() {
    // Player starts with no heroes — first 3 are acquired free via the buy card
    this.rosterSlots = [null, null, null];
  }

  /** Initialize HP/XP state for a newly owned hero. */
  private _initHeroState(id: string): void {
    const heroData = HERO_CATALOG.find(h => h.id === id);
    if (!heroData) return;
    this._ownedIds.add(id);
    if (!this.heroHp.has(id)) {
      this.heroHp.set(id, { current: heroData.baseHp, max: heroData.baseHp });
    }
    if (!this.heroXp.has(id)) {
      this.heroXp.set(id, { xp: 0, level: 1 });
    }
  }

  /**
   * Add a hero to the player's collection (purchase result).
   * Returns false if the hero is already owned.
   */
  addHeroToCollection(id: string): boolean {
    if (this._ownedIds.has(id)) return false;
    this._initHeroState(id);
    return true;
  }

  /** Get filled roster as flat array (no nulls) */
  get roster(): HeroData[] {
    return this.rosterSlots.filter((h): h is HeroData => h != null);
  }

  /** Select a hero from the collection to show details */
  selectHero(collectionIndex: number): void {
    if (collectionIndex < 0 || collectionIndex >= this.collection.length) return;
    this.selectedIndex = collectionIndex;
  }

  /** Get the currently selected hero data (or null) */
  getSelectedHero(): HeroData | null {
    if (this.selectedIndex < 0 || this.selectedIndex >= this.collection.length) return null;
    return this.collection[this.selectedIndex];
  }

  /** Check if a hero (by collection index) is in the roster */
  isInRoster(collectionIndex: number): boolean {
    const hero = this.collection[collectionIndex];
    if (!hero) return false;
    return this.rosterSlots.some(h => h != null && h.id === hero.id);
  }

  /** Find which slot a hero is in (-1 if not in roster) */
  getSlotForHero(heroId: string): number {
    for (let i = 0; i < MAX_ROSTER_SIZE; i++) {
      if (this.rosterSlots[i]?.id === heroId) return i;
    }
    return -1;
  }

  /**
   * Equip a hero (by collection index) into a specific slot.
   * If the slot is occupied, does nothing (tap occupied = remove instead).
   * Returns true if successfully equipped.
   */
  equipToSlot(collectionIndex: number, slotIndex: number): boolean {
    if (slotIndex < 0 || slotIndex >= MAX_ROSTER_SIZE) return false;
    if (this.rosterSlots[slotIndex] != null) return false; // slot occupied
    if (collectionIndex < 0 || collectionIndex >= this.collection.length) return false;

    const hero = this.collection[collectionIndex];
    if (!hero) return false;

    // Don't allow duplicates
    if (this.rosterSlots.some(h => h != null && h.id === hero.id)) {
      return false;
    }

    this.rosterSlots[slotIndex] = hero;
    return true;
  }

  /** Remove a hero from a specific roster slot. Returns true if removed. */
  removeFromSlot(slotIndex: number): boolean {
    if (slotIndex < 0 || slotIndex >= MAX_ROSTER_SIZE) return false;
    const hero = this.rosterSlots[slotIndex];
    if (!hero) return false;
    this.rosterSlots[slotIndex] = null;
    return true;
  }

  /** Check if the roster is valid (all 3 slots filled) */
  isRosterValid(): boolean {
    return this.rosterSlots.every(h => h != null);
  }

  /** Get roster hero IDs (non-null only) for passing to TeamState */
  getRosterIds(): string[] {
    return this.roster.map(h => h.id);
  }

  /** Get HP state for a hero */
  getHp(heroId: string): HeroHpState {
    return this.heroHp.get(heroId) ?? { current: 0, max: 0 };
  }

  /** Sync HP from combat results back into the persistent map */
  syncHpFromCombat(heroId: string, currentHp: number): void {
    const state = this.heroHp.get(heroId);
    if (state) {
      const wasAlive = state.current > 0;
      state.current = Math.max(0, Math.min(currentHp, state.max));
      if (wasAlive && state.current <= 0) {
        this.heroDeathTime.set(heroId, Date.now());
      }
      if (state.current > 0) {
        this.heroDeathTime.delete(heroId);
      }
    }
  }

  /** Get death timestamp for a hero (ms since epoch), or null if alive */
  getDeathTime(heroId: string): number | null {
    return this.heroDeathTime.get(heroId) ?? null;
  }

  // ===== Per-Hero XP/Level Methods =====

  /** Get XP state for a hero */
  getXpState(heroId: string): HeroXpState {
    return this.heroXp.get(heroId) ?? { xp: 0, level: 1 };
  }

  /** Get hero level (1-10) */
  getHeroLevel(heroId: string): number {
    return this.getXpState(heroId).level;
  }

  /** Get level multiplier for a hero (1.0x to 2.0x) */
  getHeroLevelMultiplier(heroId: string): number {
    return getLevelMultiplier(this.getHeroLevel(heroId));
  }

  /**
   * Award XP to a list of heroes (split evenly).
   * Returns a map of heroId → levels gained.
   */
  addXpToHeroes(heroIds: string[], totalXp: number): Map<string, number> {
    const levelsGained = new Map<string, number>();
    if (heroIds.length === 0 || totalXp <= 0) return levelsGained;

    const xpPerHero = Math.floor(totalXp / heroIds.length);
    for (const heroId of heroIds) {
      const state = this.heroXp.get(heroId);
      if (!state) continue;

      if (state.level >= MAX_HERO_LEVEL) {
        levelsGained.set(heroId, 0);
        continue;
      }

      const oldLevel = state.level;
      state.xp += xpPerHero;

      // Check for level ups
      while (state.level < MAX_HERO_LEVEL && state.xp >= xpRequiredForLevel(state.level)) {
        state.xp -= xpRequiredForLevel(state.level);
        state.level++;
      }

      // Cap XP at max level
      if (state.level >= MAX_HERO_LEVEL) {
        state.xp = 0;
      }

      levelsGained.set(heroId, state.level - oldLevel);
    }

    return levelsGained;
  }

  /** Get XP progress info for a hero (for UI display) */
  getXpProgress(heroId: string): { currentXp: number; xpToNext: number; percent: number } {
    const state = this.getXpState(heroId);
    if (state.level >= MAX_HERO_LEVEL) {
      return { currentXp: 0, xpToNext: 0, percent: 1.0 };
    }
    const xpToNext = xpRequiredForLevel(state.level);
    return {
      currentXp: state.xp,
      xpToNext,
      percent: xpToNext > 0 ? state.xp / xpToNext : 0,
    };
  }

  /**
   * Apply persisted HP from the heroHp map onto an array of Hero objects.
   * Call this after creating heroes via createHeroById() so they carry
   * forward their saved HP rather than resetting to full.
   */
  applyHpToHeroes(heroes: { id: string; currentHp: number; maxHp: number }[]): void {
    for (const hero of heroes) {
      const hp = this.heroHp.get(hero.id);
      if (hp) {
        hero.maxHp = hp.max;
        hero.currentHp = hp.current;
      }
    }
  }

  /**
   * Sync current HP from all living/dead heroes in combat back into
   * the persistent heroHp map. Call this BEFORE triggering a save so
   * the roster manager has up-to-date HP values.
   */
  syncAllHpFromCombat(heroes: { id: string; currentHp: number }[]): void {
    for (const hero of heroes) {
      this.syncHpFromCombat(hero.id, hero.currentHp);
    }
  }

  // ===== Regen Accumulator (for live regen ticking) =====
  private _regenAccumulator: number = 0;

  /**
   * Apply offline regeneration based on elapsed time since last save.
   * - Alive but damaged heroes: +1 HP per elapsed minute, clamped to max.
   * - Dead heroes: resurrect to 1 HP after 60 min, then regen remaining minutes.
   * @param lastSaveTimestamp Date.now() value from the last save (ms since epoch)
   */
  applyOfflineRegen(lastSaveTimestamp: number): void {
    const elapsedMs = Date.now() - lastSaveTimestamp;
    if (elapsedMs <= 0) return;
    const elapsedMinutes = elapsedMs / 60000;

    for (const [heroId, hp] of this.heroHp.entries()) {
      if (hp.current >= hp.max) continue; // Already full

      if (hp.current > 0) {
        // Alive but damaged: add 1 HP per minute
        hp.current = Math.min(hp.max, hp.current + Math.floor(elapsedMinutes));
      } else {
        // Dead: check if enough time has passed for resurrection
        const deathTime = this.heroDeathTime.get(heroId);
        if (deathTime == null) {
          // No death timestamp — treat as if they just died (no regen)
          continue;
        }
        const elapsedSinceDeath = (Date.now() - deathTime) / 60000; // minutes since death
        if (elapsedSinceDeath >= 60) {
          // Resurrect to 1 HP, then regen for remaining minutes
          const regenMinutes = Math.floor(elapsedSinceDeath - 60);
          hp.current = Math.min(hp.max, 1 + regenMinutes);
          this.heroDeathTime.delete(heroId);
        }
        // If < 60 min since death, hero stays dead
      }
    }
    // Seed the accumulator with the sub-minute remainder so the first
    // live-regen tick fires at the correct time rather than 60s from now,
    // and so getRestorationTimeMs shows the right countdown immediately.
    this._regenAccumulator = (elapsedMs % 60000) / 1000;
  }

  /**
   * Tick live regeneration while the player is on the roster/collection screen.
   * Accumulates real seconds; every 60s, heals +1 HP to all alive-but-damaged heroes.
   * Also checks if any dead hero's resurrection timer has elapsed.
   * @returns true if any HP changed (caller should refresh UI)
   */
  tickLiveRegen(dtSeconds: number): boolean {
    this._regenAccumulator += dtSeconds;
    if (this._regenAccumulator < 60) return false;

    // Drain full minutes from accumulator
    const ticks = Math.floor(this._regenAccumulator / 60);
    this._regenAccumulator -= ticks * 60;

    let anyChanged = false;
    const now = Date.now();
    for (const [heroId, hp] of this.heroHp.entries()) {
      if (hp.current >= hp.max) continue; // Already full

      if (hp.current <= 0) {
        // Dead — check if resurrection time (60 min) has passed
        const deathTime = this.heroDeathTime.get(heroId);
        if (deathTime != null && (now - deathTime) >= 60 * 60 * 1000) {
          hp.current = 1;
          this.heroDeathTime.delete(heroId);
          anyChanged = true;
        }
      } else {
        // Alive but damaged — heal ticks HP
        hp.current = Math.min(hp.max, hp.current + ticks);
        anyChanged = true;
      }
    }
    if (anyChanged) {
    }
    return anyChanged;
  }

  /**
   * Restore death timestamps from serialized save data.
   */
  restoreDeathTimestamps(entries: { id: string; deathTime: number }[]): void {
    this.heroDeathTime.clear();
    for (const entry of entries) {
      this.heroDeathTime.set(entry.id, entry.deathTime);
    }
  }

  /**
   * Get all death timestamps for serialization into save data.
   */
  getDeathTimestamps(): { id: string; deathTime: number }[] {
    const entries: { id: string; deathTime: number }[] = [];
    for (const [id, time] of this.heroDeathTime.entries()) {
      entries.push({ id, deathTime: time });
    }
    return entries;
  }

  /**
   * Get the estimated time (in ms) until a hero is fully restored.
   * - Alive but damaged: (hpMax - hpCurrent) * 60000 ms (1 HP per minute)
   * - Dead: resurrection time remaining + full regen time after
   * - Already full or not tracked: returns 0
   */
  getRestorationTimeMs(heroId: string): number {
    const hp = this.heroHp.get(heroId);
    if (!hp) return 0;
    if (hp.current >= hp.max) return 0;

    if (hp.current > 0) {
      // Alive but damaged: 1 HP per minute, minus sub-minute elapsed seconds
      const hpNeeded = hp.max - hp.current;
      return Math.max(0, hpNeeded * 60000 - this._regenAccumulator * 1000);
    }

    // Dead: 60 min resurrection + (max - 1) min regen
    const deathTime = this.heroDeathTime.get(heroId);
    const RESURRECTION_MS = 60 * 60 * 1000; // 60 minutes
    if (deathTime == null) {
      // No death timestamp — assume just died
      return RESURRECTION_MS + (hp.max - 1) * 60000;
    }

    const elapsedSinceDeath = Date.now() - deathTime;
    if (elapsedSinceDeath >= RESURRECTION_MS) {
      // Already resurrectable — just regen time from 1 HP
      return (hp.max - 1) * 60000;
    }

    // Time until resurrection + regen from 1 to max
    const resTimeRemaining = RESURRECTION_MS - elapsedSinceDeath;
    return resTimeRemaining + (hp.max - 1) * 60000;
  }

  /** Fully heal all heroes (e.g. between dungeon runs) */
  healAll(): void {
    for (const hero of this.collection) {
      const state = this.heroHp.get(hero.id);
      if (state) state.current = state.max;
      this.heroDeathTime.delete(hero.id);
    }
  }

  /** Heal a single hero to full HP and clear death state. */
  healHero(heroId: string): void {
    const state = this.heroHp.get(heroId);
    if (state) {
      state.current = state.max;
    }
    this.heroDeathTime.delete(heroId);
  }

  /**
   * Restore roster state from save data.
   * ownedHeroIds: list of hero IDs the player owns. If undefined (old save),
   * defaults to the first 5 catalog heroes.
   */
  restoreFromSave(
    ownedHeroIds: string[] | undefined,
    rosterSlotIds: (string | null)[],
    heroHpEntries: { id: string; current: number; max: number }[],
    heroXpEntries?: { id: string; xp: number; level: number }[],
  ): void {
    // Re-initialize owned heroes
    this._ownedIds.clear();
    this.heroHp.clear();
    this.heroXp.clear();

    const ids = ownedHeroIds ?? [];
    for (const id of ids) {
      this._initHeroState(id);
    }

    // Restore roster slots (only heroes that are owned can be in slots)
    for (let i = 0; i < MAX_ROSTER_SIZE; i++) {
      const id = rosterSlotIds[i] ?? null;
      if (id) {
        const hero = HERO_CATALOG.find(h => h.id === id && this._ownedIds.has(h.id)) ?? null;
        this.rosterSlots[i] = hero;
      } else {
        this.rosterSlots[i] = null;
      }
    }

    // Overwrite default HP values with saved ones (for owned heroes only).
    // Re-derive max from the catalog so a corrupted save cannot carry a bad max.
    for (const entry of heroHpEntries) {
      const existing = this.heroHp.get(entry.id);
      if (existing) {
        const heroData = HERO_CATALOG.find(h => h.id === entry.id);
        existing.max = heroData?.baseHp ?? entry.max;
        existing.current = Math.max(0, Math.min(entry.current, existing.max));
      }
    }

    // Restore XP entries
    if (heroXpEntries) {
      for (const entry of heroXpEntries) {
        const existing = this.heroXp.get(entry.id);
        if (existing) {
          existing.xp = entry.xp;
          existing.level = Math.min(MAX_HERO_LEVEL, Math.max(1, entry.level));
        }
      }
    }
  }

  /**
   * Calculate damage per gem color for a given hero.
   * Formula: Damage = ATK × Affinity × BASE_MATCH_SIZE × LevelMultiplier
   * Returns a Record<GemType, number> with rounded damage values.
   */
  calculateDamageByColor(heroId: string): Record<number, { damage: number; multiplier: number }> {
    const hero = this.collection.find(h => h.id === heroId);
    if (!hero) return {};

    const result: Record<number, { damage: number; multiplier: number }> = {};
    const gemTypes = [GemType.Red, GemType.Blue, GemType.Green, GemType.Yellow, GemType.Purple];
    const levelMult = this.getHeroLevelMultiplier(heroId);

    for (const gem of gemTypes) {
      const affinity = hero.affinities[gem] ?? 0;
      const damage = Math.round(hero.baseAtk * affinity * BASE_MATCH_SIZE * levelMult);
      result[gem] = { damage, multiplier: affinity };
    }

    return result;
  }
}
