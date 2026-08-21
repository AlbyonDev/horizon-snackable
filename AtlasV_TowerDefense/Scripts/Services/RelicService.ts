/**
 * RelicService — Manages active relics and applies their modifiers to game systems.
 *
 * Responsibilities:
 *   - Stores which relics are currently active (by id).
 *   - Registers a HitService modifier that applies damage and slow duration multipliers.
 *   - Exposes getter methods for modifiers consumed by TowerService and ResourceService.
 *   - Provides activate/deactivate API for future UI hookup.
 *
 * Integration points:
 *   - HitService: damageMultiplier and slowDurationMultiplier applied in hit pipeline
 *   - TowerService.getEffectiveStats(): reads getFireRateMultiplier() and getRangeMultiplier()
 *   - ResourceService.reset(): reads getGoldMultiplier() and getBonusLives()
 *
 * Force-instantiated by GameManager to ensure it registers with HitService early.
 */
import { Service } from 'meta/worlds';
import { service, subscribe } from 'meta/worlds';
import { OnServiceReadyEvent } from 'meta/worlds';
import { RELIC_DEFS, type IRelicDef } from '../Defs/RelicDefs';
import { HitService } from './HitService';
import { Events, type IHitContext } from '../Types';

@service()
export class RelicService extends Service {
  private _activeRelicIds: Set<string> = new Set();
  private _relicMap: Map<string, IRelicDef> = new Map();

  @subscribe(OnServiceReadyEvent)
  onReady(): void {
    for (const def of RELIC_DEFS) {
      this._relicMap.set(def.id, def);
    }
    // Register hit pipeline modifier for damage and slow duration relics
    HitService.get().register((ctx: IHitContext) => this._applyHitModifiers(ctx));
    console.log('[RelicService] Initialized with hit pipeline modifier');
  }

  /** Restore active relics from a saved run. Fired on load by SaveService. */
  @subscribe(Events.SaveRestored)
  onSaveRestored(p: Events.SaveRestoredPayload): void {
    this.restore(p.relics);
  }

  /** Clear active relics when a new run starts in the current biome.
   *  Fired by SaveService.ensureRunSeed() — only when the active biome
   *  needs a fresh run. Other biomes' relics are untouched (stored in SaveService). */
  @subscribe(Events.RunReset)
  onRunReset(_p: Events.RunResetPayload): void {
    console.log(`[RelicService] RunReset received — clearing active biome relics (count: ${this._activeRelicIds.size})`);
    this.reset();
  }

  /** Replace the active relic set with the given ids (unknown ids skipped).
   *  Called on biome switch or session load — only the active biome's relics
   *  are loaded here; other biomes' relics stay safely in SaveService. */
  restore(relicIds: string[]): void {
    const prevCount = this._activeRelicIds.size;
    this._activeRelicIds.clear();
    for (const id of relicIds) {
      if (this._relicMap.has(id)) this._activeRelicIds.add(id);
    }
    console.log(`[RelicService] Restored ${this._activeRelicIds.size} relics (was ${prevCount}): [${[...this._activeRelicIds].join(', ')}]`);
  }

  /** Clear all active relics. Called when a new run begins. */
  reset(): void {
    if (this._activeRelicIds.size > 0) {
      console.log(`[RelicService] Resetting ${this._activeRelicIds.size} active relics`);
      this._activeRelicIds.clear();
    }
  }

  /** Restore a set of relics from saved data (used on session load). */
  restoreRelics(relicIds: string[]): void {
    this._activeRelicIds.clear();
    for (const id of relicIds) {
      if (this._relicMap.has(id)) {
        this._activeRelicIds.add(id);
      }
    }
    console.log(`[RelicService] Restored ${this._activeRelicIds.size} relics: ${[...this._activeRelicIds].join(', ')}`);
  }

  // ── Public API u2500─────────────────────────────────────────────────────────────

  /** Activate a relic by id. No-op if already active or id unknown. */
  activate(relicId: string): boolean {
    if (!this._relicMap.has(relicId)) {
      console.log(`[RelicService] Unknown relic id: ${relicId}`);
      return false;
    }
    if (this._activeRelicIds.has(relicId)) return false;
    this._activeRelicIds.add(relicId);
    console.log(`[RelicService] Activated relic: ${relicId}`);
    return true;
  }

  /** Deactivate a relic by id. No-op if not active. */
  deactivate(relicId: string): boolean {
    if (!this._activeRelicIds.has(relicId)) return false;
    this._activeRelicIds.delete(relicId);
    console.log(`[RelicService] Deactivated relic: ${relicId}`);
    return true;
  }

  /** Check if a relic is currently active. */
  isActive(relicId: string): boolean {
    return this._activeRelicIds.has(relicId);
  }

  /** Get all active relic ids. */
  getActiveRelicIds(): string[] {
    return [...this._activeRelicIds];
  }

  /** Get all relic definitions. */
  getAllDefs(): IRelicDef[] {
    return RELIC_DEFS;
  }

  // ── Modifier Getters (consumed by other services) ───────────────────────────

  /** Returns the cumulative gold multiplier from active relics. Default 1. */
  getGoldMultiplier(): number {
    return this._getModifierValue('goldMultiplier', 1);
  }

  /** Returns the cumulative fire rate multiplier from active relics. Default 1. */
  getFireRateMultiplier(): number {
    return this._getModifierValue('fireRateMultiplier', 1);
  }

  /** Returns the cumulative range multiplier from active relics. Default 1. */
  getRangeMultiplier(): number {
    return this._getModifierValue('rangeMultiplier', 1);
  }

  /** Returns the total bonus lives from active relics. Default 0. */
  getBonusLives(): number {
    return this._getModifierValue('bonusLives', 0);
  }

  /** Returns the flat kill gold bonus from active relics. Default 0. */
  getKillGoldBonus(): number {
    return this._getModifierValue('killGoldBonus', 0);
  }

  /** Returns the cumulative projectile speed multiplier from active relics. Default 1. */
  getProjectileSpeedMultiplier(): number {
    return this._getModifierValue('projectileSpeedMultiplier', 1);
  }

  /** Returns the cumulative splash radius multiplier from active relics. Default 1. */
  getSplashRadiusMultiplier(): number {
    return this._getModifierValue('splashRadiusMultiplier', 1);
  }

  /** Returns 1 if Ward Breaker is active (destroys shaman shields on target). Default 0. */
  getWardBreaker(): number {
    return this._getModifierValue('wardBreaker', 0);
  }

  /** Returns the fireball speed reduction factor from active relics. Default 0. */
  getFireballSpeedReduction(): number {
    return this._getModifierValue('fireballSpeedReduction', 0);
  }

  /** Returns the cumulative tower defense/damage multiplier from active relics. Default 1. */
  getTowerDefenseMultiplier(): number {
    return this._getModifierValue('towerDefenseMultiplier', 1);
  }

  /** Returns the flat elite kill gold bonus from active relics. Default 0. */
  getEliteKillGoldBonus(): number {
    return this._getModifierValue('eliteKillGoldBonus', 0);
  }

  // ── Private ─────────────────────────────────────────────────────────────────

  /** Compute the effective value for a modifier key across all active relics.
   *  For multipliers (default 1): multiplicative stacking.
   *  For flat bonuses (default 0): additive stacking. */
  private _getModifierValue(key: string, defaultValue: number): number {
    let result = defaultValue;
    for (const relicId of this._activeRelicIds) {
      const def = this._relicMap.get(relicId);
      if (def && def.modifierKey === key) {
        if (defaultValue === 1) {
          // Multiplicative stacking for multipliers
          result *= def.modifierValue;
        } else {
          // Additive stacking for flat bonuses
          result += def.modifierValue;
        }
      }
    }
    return result;
  }

  /** Hit pipeline modifier: applies damage multiplier and slow duration boost. */
  private _applyHitModifiers(ctx: IHitContext): IHitContext {
    // Damage multiplier
    const dmgMult = this._getModifierValue('damageMultiplier', 1);
    if (dmgMult !== 1) {
      ctx.damage = Math.round(ctx.damage * dmgMult);
    }

    // Slow duration multiplier (if projectile has slowDuration in props)
    const slowMult = this._getModifierValue('slowDurationMultiplier', 1);
    if (slowMult !== 1 && ctx.props['slowDuration'] != null) {
      ctx.props = { ...ctx.props, slowDuration: (ctx.props['slowDuration'] as number) * slowMult };
    }

    return ctx;
  }
}
