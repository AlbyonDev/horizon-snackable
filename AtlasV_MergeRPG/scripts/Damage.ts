/**
 * Damage
 *
 * Single source of truth for damage formulas + the apply step. Three formulas
 * (match, power, basic) are intentionally separate functions because their
 * inputs differ — but the constants, the floor-1 clamp, and the apply step
 * (shield consumption + HP mutation + kill detection) all live here so a
 * tuning pass on damage scaling means editing one file.
 */
import type { Hero, Enemy } from './TeamTypes';
import type { StatusEffectEngine } from './StatusEffectEngine';

// ===== Match-bonus table (gem count → multiplier) =====
export const MATCH_BONUS_3 = 1.0;
export const MATCH_BONUS_4 = 1.4;
export const MATCH_BONUS_5 = 2.0;

export function matchBonus(gemCount: number): number {
  if (gemCount >= 5) return MATCH_BONUS_5;
  if (gemCount >= 4) return MATCH_BONUS_4;
  return MATCH_BONUS_3;
}

// ===== Formulas =====

/** Damage from a power: floor(ATK × multiplier), clamped to ≥1 so attacks
 *  always do *something* even when buffs/debuffs would round it to zero. */
export function powerDamage(atk: number, multiplier: number): number {
  return Math.max(1, Math.floor(atk * multiplier));
}

/** Damage from a basic enemy attack: ATK × 1.0 (no multiplier). */
export function basicAttackDamage(atk: number): number {
  return Math.max(1, atk);
}

// ===== Apply =====

/** Outcome of applying damage to a target. */
export interface DamageOutcome {
  /** Damage actually dealt after shield consumption. */
  dealt: number;
  /** True if a shield absorbed this hit. */
  shielded: boolean;
  /** True if the hit took the target to 0 HP. */
  killed: boolean;
}

/**
 * Apply `amount` damage to `target` honoring any active shield. Used for
 * special abilities — gem matches and basic enemy attacks bypass shields and
 * call `applyDirect` instead.
 *
 * - If a shield is up, one shield charge is consumed and no HP is lost.
 * - Otherwise the target's currentHp is reduced (clamped at 0).
 *
 * Note: caller is responsible for triggering visuals (hurt flash, popup,
 * markDead) — this helper is the bookkeeping primitive.
 */
export function applyDamage(
  target: Hero | Enemy,
  amount: number,
  effects: StatusEffectEngine,
): DamageOutcome {
  if (amount <= 0) return { dealt: 0, shielded: false, killed: false };
  if (effects.hasShield(target)) {
    effects.consumeShield(target);
    return { dealt: 0, shielded: true, killed: false };
  }
  target.currentHp = Math.max(0, target.currentHp - amount);
  return { dealt: amount, shielded: false, killed: target.currentHp <= 0 };
}

/**
 * Apply `amount` damage with no shield interaction. Used for gem-match damage
 * and basic enemy attacks — only special abilities (powers) get blocked by
 * shields. Returns the same outcome shape with `shielded: false` always.
 */
export function applyDirect(target: Hero | Enemy, amount: number): DamageOutcome {
  if (amount <= 0) return { dealt: 0, shielded: false, killed: false };
  target.currentHp = Math.max(0, target.currentHp - amount);
  return { dealt: amount, shielded: false, killed: target.currentHp <= 0 };
}
