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
import { OnServiceReadyEvent, EventService } from 'meta/worlds';
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

  /** Reset all active relics at the start of a new run. */
  @subscribe(Events.StartGame)
  onStartGame(_p: Events.StartGamePayload): void {
    this.reset();
  }

  /** Clear all active relics. Called when a new game begins. */
  reset(): void {
    if (this._activeRelicIds.size > 0) {
      console.log(`[RelicService] Resetting ${this._activeRelicIds.size} active relics`);
      this._activeRelicIds.clear();
    }
  }

  // ── Public API ──────────────────────────────────────────────────────────────

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
