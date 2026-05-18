/**
 * StatusEffectEngine
 *
 * All status-effect logic in one place: applying, ticking DOTs, ticking
 * buff/debuff durations, shield consumption, and effective-ATK queries.
 *
 * Behaviour is driven by a per-type handler registry (STATUS_HANDLERS).
 * Adding a new effect type means adding the enum value and one entry to the
 * registry — no new conditionals scattered through this file.
 */
import type { Hero, Enemy } from './TeamTypes';
import { StatusEffectType } from './PowerTypes';
import type { StatusEffect } from './PowerTypes';

interface StatusHandler {
  /** Damage dealt per turn by a DOT tick. */
  dotDamage?: (e: StatusEffect) => number;
  /** HP restored per turn by a regen tick (capped at maxHp by tickDots). */
  hotHeal?: (e: StatusEffect) => number;
  /**
   * Contribution to the effective-ATK multiplier. Positive for buff,
   * negative for debuff. Returns 0 if the effect doesn't touch ATK.
   */
  atkModifier?: (e: StatusEffect) => number;
  /**
   * True if this effect's `turnsRemaining` should be decremented on the
   * normal end-of-turn tick (BUFF/DEBUFF/DOT). Hits-based effects like
   * SHIELD set this false and are consumed elsewhere.
   */
  ticksWithTurns: boolean;
}

const STATUS_HANDLERS: Record<StatusEffectType, StatusHandler> = {
  [StatusEffectType.DOT]: {
    dotDamage: (e) => Math.round(e.value),
    ticksWithTurns: true,
  },
  [StatusEffectType.BUFF_ATK]: {
    atkModifier: (e) => e.value,
    ticksWithTurns: true,
  },
  [StatusEffectType.DEBUFF_ATK]: {
    atkModifier: (e) => -e.value,
    ticksWithTurns: true,
  },
  [StatusEffectType.SHIELD]: {
    ticksWithTurns: true,
  },
  [StatusEffectType.REGEN]: {
    hotHeal: (e) => Math.round(e.value),
    ticksWithTurns: true,
  },
};

export class StatusEffectEngine {
  /** Has at least one active shield with hits remaining? */
  hasShield(member: Hero | Enemy): boolean {
    return member.statusEffects.some(e => e.type === StatusEffectType.SHIELD && e.value > 0);
  }

  /** Consume one shield hit. Returns true if a shield was consumed. */
  consumeShield(member: Hero | Enemy): boolean {
    const shield = member.statusEffects.find(
      e => e.type === StatusEffectType.SHIELD && e.value > 0,
    );
    if (!shield) return false;
    shield.value -= 1;
    if (shield.value <= 0) {
      member.statusEffects = member.statusEffects.filter(e => e !== shield);
    }
    return true;
  }

  /**
   * Apply a status effect. Effects of the same type from the same source are
   * refreshed in place rather than stacked, so a renewable buff doesn't
   * accumulate forever.
   */
  applyStatusEffect(member: Hero | Enemy, effect: StatusEffect): void {
    const existing = member.statusEffects.find(
      e => e.type === effect.type && e.sourceId === effect.sourceId,
    );
    if (existing) {
      existing.value = effect.value;
      existing.turnsRemaining = effect.turnsRemaining;
    } else {
      member.statusEffects.push({ ...effect });
    }
  }

  /**
   * Tick DOTs and HOT REGENs on every living member of `group`.
   * Returns separate maps for damage dealt and healing done per index
   * (entries for unaffected members are omitted).
   */
  tickDots<T extends Hero | Enemy>(group: T[]): { damage: Map<number, number>; heal: Map<number, number> } {
    const damage = new Map<number, number>();
    const heal = new Map<number, number>();
    for (let i = 0; i < group.length; i++) {
      const member = group[i];
      if (member.currentHp <= 0) continue;

      let totalDmg = 0;
      let totalHeal = 0;
      for (const e of member.statusEffects) {
        const handler = STATUS_HANDLERS[e.type];
        const dmg = handler.dotDamage?.(e) ?? 0;
        const hot = handler.hotHeal?.(e) ?? 0;
        if (dmg > 0 || hot > 0) {
          totalDmg += dmg;
          totalHeal += hot;
          e.turnsRemaining--;
        }
      }
      if (totalDmg > 0) {
        member.currentHp = Math.max(0, member.currentHp - totalDmg);
        damage.set(i, totalDmg);
      }
      if (totalHeal > 0) {
        member.currentHp = Math.min(member.maxHp, member.currentHp + totalHeal);
        heal.set(i, totalHeal);
      }
      member.statusEffects = member.statusEffects.filter(e => e.turnsRemaining > 0);
    }
    return { damage, heal };
  }

  /** Tick buff/debuff/shield durations for every member of `group`. */
  tickBuffs<T extends Hero | Enemy>(group: T[]): void {
    for (const member of group) {
      for (const e of member.statusEffects) {
        const handler = STATUS_HANDLERS[e.type];
        // Turn-based effects (buffs, debuffs, shield). DOTs are ticked
        // separately by tickDots, which already decrements their turns.
        if (handler.ticksWithTurns && !handler.dotDamage && !handler.hotHeal) {
          e.turnsRemaining--;
        }
      }
      member.statusEffects = member.statusEffects.filter(e => e.turnsRemaining > 0);
    }
  }

  /**
   * Effective ATK after applying any active buff/debuff multipliers.
   * Floored at 1 to ensure attacks never deal zero damage from stacking debuffs.
   */
  effectiveAtk(member: Hero | Enemy): number {
    let multiplier = 1.0;
    for (const e of member.statusEffects) {
      multiplier += STATUS_HANDLERS[e.type].atkModifier?.(e) ?? 0;
    }
    return Math.max(1, Math.round(member.atk * Math.max(0.1, multiplier)));
  }
}
