/**
 * PowerSystem
 *
 * Resolves and executes the 8 power effect types. The PowerResolver class
 * groups effect handlers + target resolution into a single cohesive object.
 *
 * The legacy module-level `executeHeroPower` / `executeEnemyPower` exports
 * are kept as thin wrappers so existing call sites don't have to change.
 *
 * Component Attachment: N/A (utility module, not a Component)
 */

import {
  PowerEffectType,
  PowerTarget,
  StatusEffectType,
  type PowerDefinition,
  type StatusEffect,
  type PowerResult,
} from './PowerTypes';
import type { Hero, Enemy } from './TeamTypes';
import { TeamState } from './TeamState';
import { powerDamage } from './Damage';
import type { GemType } from './Types';

/** Empty result, returned when a power has no effect. */
const EMPTY_RESULT: PowerResult = { damageDealt: 0, healingDone: 0, targetsHit: 0 };

export class PowerResolver {
  private readonly getLevelMult: (heroId: string) => number;
  private readonly getBoardGemCount: (color: GemType) => number;

  constructor(
    private readonly teamState: TeamState,
    getLevelMultiplier?: (heroId: string) => number,
    getBoardGemCount?: (color: GemType) => number,
  ) {
    this.getLevelMult = getLevelMultiplier ?? (() => 1.0);
    this.getBoardGemCount = getBoardGemCount ?? (() => 0);
  }

  /** Execute a hero's power. Returns the resolved damage / healing / target count. */
  executeHero(heroIndex: number): PowerResult {
    const hero = this.teamState.heroes[heroIndex];
    if (!hero) {
      return { ...EMPTY_RESULT };
    }

    const power = hero.power;
    const atk = this.teamState.getEffectiveAtk(hero);
    const levelMult = this.getLevelMult(hero.id);

    const result = this.dispatchHero(power, atk, heroIndex, levelMult);
    this.applySecondaryEffect(hero, power, result);
    return result;
  }

  /** Execute an enemy's power against the heroes. */
  executeEnemy(enemyIndex: number): PowerResult {
    const enemy = this.teamState.enemies[enemyIndex];
    if (!enemy) {
      return { ...EMPTY_RESULT };
    }

    const power = enemy.power;
    const atk = this.teamState.getEffectiveAtk(enemy);

    const result = this.dispatchEnemy(power, atk, enemy);
    this.teamState.spendEnemyMana(power.manaColor, power.manaCost);
    return result;
  }

  // ===== Hero dispatch =====

  private dispatchHero(power: PowerDefinition, atk: number, heroIndex: number, levelMult: number): PowerResult {
    switch (power.effectType) {
      case PowerEffectType.DAMAGE_DIRECT: return this.heroDamageDirect(power, atk, levelMult);
      case PowerEffectType.DAMAGE_BURST:  return this.heroDamageBurst(power, atk, levelMult);
      case PowerEffectType.DAMAGE_DOT:    return this.heroDamageDot(power, atk, levelMult);
      case PowerEffectType.HEAL:          return this.heroHeal(power, atk, heroIndex);
      case PowerEffectType.SHIELD:        return this.heroShield(power, heroIndex);
      case PowerEffectType.DEBUFF_ATK:    return this.heroDebuffAtk(power);
      case PowerEffectType.BUFF_ATK:      return this.heroBuffAtk(power, heroIndex);
      case PowerEffectType.MANA_BOOST:    return this.heroManaBoost(power);
      case PowerEffectType.BOARD_SHUFFLE:     return this.heroBoardShuffle(power);
      case PowerEffectType.GEM_CONVERT:       return this.heroBoardGemConvert(power, atk, levelMult);
      case PowerEffectType.GEM_DESTROY_DAMAGE: return this.heroGemDestroyDamage(power, atk, levelMult);
      case PowerEffectType.HEAL_DOT:          return this.heroHealDot(power, atk, heroIndex);
      default:
        return { ...EMPTY_RESULT };
    }
  }

  private heroDamageDirect(power: PowerDefinition, atk: number, levelMult: number): PowerResult {
    return this.applyEnemyDamage(
      this.resolveEnemyTargets(power.target),
      Math.round(powerDamage(atk, power.atkMultiplier ?? 1.0) * levelMult),
      'Direct',
    );
  }

  private heroDamageBurst(power: PowerDefinition, atk: number, levelMult: number): PowerResult {
    return this.applyEnemyDamage(
      this.resolveEnemyTargets(PowerTarget.ALL_ENEMIES),
      Math.round(powerDamage(atk, power.atkMultiplier ?? 0.7) * levelMult),
      'Burst',
    );
  }

  private heroDamageDot(power: PowerDefinition, atk: number, levelMult: number): PowerResult {
    const targets = this.resolveEnemyTargets(power.target);
    const dotDmg = Math.round(powerDamage(atk, power.atkMultiplier ?? 0.4) * levelMult);
    let applied = 0;

    for (const idx of targets) {
      const enemy = this.teamState.enemies[idx];
      if (!enemy) continue;
      const dot: StatusEffect = {
        type: StatusEffectType.DOT,
        turnsRemaining: power.duration ?? 3,
        value: dotDmg,
      };
      this.teamState.applyStatusEffect(enemy, dot);
      applied++;
    }
    return { damageDealt: 0, healingDone: 0, targetsHit: applied };
  }

  private heroHeal(power: PowerDefinition, atk: number, casterIndex: number): PowerResult {
    const targets = this.resolveHeroTargets(power.target, casterIndex);
    let totalHealing = 0;

    for (const idx of targets) {
      const hero = this.teamState.heroes[idx];
      if (!hero || hero.currentHp <= 0) continue;
      const heal = powerDamage(atk, power.atkMultiplier ?? 1.0);
      const before = hero.currentHp;
      hero.currentHp = Math.min(hero.maxHp, hero.currentHp + heal);
      const actual = hero.currentHp - before;
      totalHealing += actual;
    }
    return { damageDealt: 0, healingDone: totalHealing, targetsHit: targets.length };
  }

  private heroShield(power: PowerDefinition, casterIndex: number): PowerResult {
    const targets = this.resolveHeroTargets(power.target, casterIndex);
    let applied = 0;
    for (const idx of targets) {
      const hero = this.teamState.heroes[idx];
      if (!hero) continue;
      const shield: StatusEffect = {
        type: StatusEffectType.SHIELD,
        turnsRemaining: power.duration ?? 3,
        value: power.shieldHits ?? 2,
      };
      this.teamState.applyStatusEffect(hero, shield);
      applied++;
    }
    return { damageDealt: 0, healingDone: 0, targetsHit: applied };
  }

  private heroDebuffAtk(power: PowerDefinition): PowerResult {
    const targets = this.resolveEnemyTargets(power.target);
    let applied = 0;
    for (const idx of targets) {
      const enemy = this.teamState.enemies[idx];
      if (!enemy) continue;
      const debuff: StatusEffect = {
        type: StatusEffectType.DEBUFF_ATK,
        turnsRemaining: power.duration ?? 3,
        value: power.buffMultiplier ?? 0.5,
      };
      this.teamState.applyStatusEffect(enemy, debuff);
      applied++;
    }
    return { damageDealt: 0, healingDone: 0, targetsHit: applied };
  }

  private heroBuffAtk(power: PowerDefinition, casterIndex: number): PowerResult {
    const targets = this.resolveHeroTargets(power.target, casterIndex);
    let applied = 0;
    for (const idx of targets) {
      const hero = this.teamState.heroes[idx];
      if (!hero) continue;
      const buff: StatusEffect = {
        type: StatusEffectType.BUFF_ATK,
        turnsRemaining: power.duration ?? 3,
        value: power.buffMultiplier ?? 1.5,
      };
      this.teamState.applyStatusEffect(hero, buff);
      applied++;
    }
    return { damageDealt: 0, healingDone: 0, targetsHit: applied };
  }

  private heroBoardGemConvert(power: PowerDefinition, atk: number, levelMult: number): PowerResult {
    const result: PowerResult = {
      damageDealt: 0,
      healingDone: 0,
      targetsHit: 1,
      gemConvert: {
        fromColor: power.convertFromColor!,
        toColor: power.convertToColor!,
        count: power.convertCount ?? 5,
      },
      manaGrant: power.manaGrant,
    };
    // Secondary DAMAGE_BURST (e.g. Pyromancer): apply directly since primary deals no damage
    if (power.secondaryEffect?.effectType === PowerEffectType.DAMAGE_BURST) {
      const burstResult = this.heroDamageBurst(
        { ...power, atkMultiplier: power.secondaryEffect.atkMultiplier },
        atk, levelMult,
      );
      result.damageDealt = burstResult.damageDealt;
      result.targetsHit = burstResult.targetsHit;
    }
    return result;
  }

  private heroGemDestroyDamage(power: PowerDefinition, atk: number, levelMult: number): PowerResult {
    const color = power.convertFromColor!;
    const count = this.getBoardGemCount(color);
    const rawMult = power.atkMultiplier ?? 0.5;
    const dmgPerGem = rawMult > 0 ? Math.round(powerDamage(atk, rawMult) * levelMult) : 0;
    const result: PowerResult = { damageDealt: 0, healingDone: 0, targetsHit: 0, gemDestroy: { color } };
    if (count > 0) {
      const hit = this.applyEnemyDamage(
        this.resolveEnemyTargets(PowerTarget.ALL_ENEMIES),
        dmgPerGem * count,
        'GemDestroy',
      );
      result.damageDealt = hit.damageDealt;
      result.targetsHit = hit.targetsHit;
    }
    return result;
  }

  private heroHealDot(power: PowerDefinition, atk: number, casterIndex: number): PowerResult {
    const targets = this.resolveHeroTargets(power.target, casterIndex);
    const healPerTurn = Math.round(powerDamage(atk, power.atkMultiplier ?? 0.35));
    let applied = 0;
    for (const idx of targets) {
      const hero = this.teamState.heroes[idx];
      if (!hero) continue;
      const regen: StatusEffect = {
        type: StatusEffectType.REGEN,
        turnsRemaining: power.duration ?? 4,
        value: healPerTurn,
      };
      this.teamState.applyStatusEffect(hero, regen);
      applied++;
    }
    return { damageDealt: 0, healingDone: 0, targetsHit: applied };
  }

  private heroBoardShuffle(power: PowerDefinition): PowerResult {
    return {
      damageDealt: 0,
      healingDone: 0,
      targetsHit: 1,
      boardShuffle: true,
      manaGrant: power.manaGrant,
    };
  }

  private heroManaBoost(power: PowerDefinition): PowerResult {
    return {
      damageDealt: 0,
      healingDone: 0,
      targetsHit: 1,
      manaGrant: power.manaGrant,
    };
  }

  // ===== Enemy dispatch =====

  private dispatchEnemy(power: PowerDefinition, atk: number, enemy: Enemy): PowerResult {
    switch (power.effectType) {
      case PowerEffectType.DAMAGE_DIRECT: return this.enemyDamageDirect(power, atk);
      case PowerEffectType.DAMAGE_BURST:  return this.enemyDamageBurst(power, atk);
      case PowerEffectType.DAMAGE_DOT:    return this.enemyDamageDot(power, atk);
      case PowerEffectType.HEAL:          return this.enemyHeal(power, atk, enemy);
      case PowerEffectType.BUFF_ATK:      return this.enemyBuffSelf(power, enemy);
      default:
        return { ...EMPTY_RESULT };
    }
  }

  private enemyDamageDirect(power: PowerDefinition, atk: number): PowerResult {
    const living = this.teamState.heroes.filter(h => h.currentHp > 0);
    if (living.length === 0) return { ...EMPTY_RESULT };
    const target = living[Math.floor(Math.random() * living.length)];
    const dmg = powerDamage(atk, power.atkMultiplier ?? 1.0);
    const outcome = this.teamState.applyDamage(target, dmg);
    return { damageDealt: outcome.dealt, healingDone: 0, targetsHit: 1 };
  }

  private enemyDamageBurst(power: PowerDefinition, atk: number): PowerResult {
    const dmg = powerDamage(atk, power.atkMultiplier ?? 0.6);
    let total = 0;
    let targetsHit = 0;
    for (const hero of this.teamState.heroes) {
      if (hero.currentHp <= 0) continue;
      total += this.teamState.applyDamage(hero, dmg).dealt;
      targetsHit++;
    }
    return { damageDealt: total, healingDone: 0, targetsHit };
  }

  private enemyDamageDot(power: PowerDefinition, atk: number): PowerResult {
    const dotDmg = Math.round(powerDamage(atk, power.atkMultiplier ?? 0.4));
    const living = this.teamState.heroes
      .map((h, i) => ({ h, i }))
      .filter(({ h }) => h.currentHp > 0);
    if (living.length === 0) return { ...EMPTY_RESULT };

    // ALL_ENEMIES from enemy POV = all heroes; anything else = one random hero.
    const targets = power.target === PowerTarget.ALL_ENEMIES
      ? living
      : [living[Math.floor(Math.random() * living.length)]];

    for (const { h } of targets) {
      this.teamState.applyStatusEffect(h, {
        type: StatusEffectType.DOT,
        turnsRemaining: power.duration ?? 3,
        value: dotDmg,
      });
    }
    return { damageDealt: 0, healingDone: 0, targetsHit: targets.length };
  }

  private enemyHeal(power: PowerDefinition, atk: number, enemy: Enemy): PowerResult {
    const heal = powerDamage(atk, power.atkMultiplier ?? 1.0);
    const before = enemy.currentHp;
    enemy.currentHp = Math.min(enemy.maxHp, enemy.currentHp + heal);
    const actual = enemy.currentHp - before;
    return { damageDealt: 0, healingDone: actual, targetsHit: 1 };
  }

  private enemyBuffSelf(power: PowerDefinition, enemy: Enemy): PowerResult {
    const buff: StatusEffect = {
      type: StatusEffectType.BUFF_ATK,
      turnsRemaining: power.duration ?? 3,
      value: power.buffMultiplier ?? 1.5,
    };
    this.teamState.applyStatusEffect(enemy, buff);
    return { damageDealt: 0, healingDone: 0, targetsHit: 1 };
  }

  // ===== Helpers =====

  /** Apply a fixed damage value to a list of enemy indices, respecting shields. */
  private applyEnemyDamage(targets: number[], dmg: number, label: string): PowerResult {
    let totalDamage = 0;
    for (const idx of targets) {
      const enemy = this.teamState.enemies[idx];
      if (!enemy) continue;
      const outcome = this.teamState.applyDamage(enemy, dmg);
      totalDamage += outcome.dealt;
      if (outcome.shielded) {
      } else {
      }
    }
    return { damageDealt: totalDamage, healingDone: 0, targetsHit: targets.length };
  }

  /** Apply the optional secondary effect (HEAL, DEBUFF_ATK, or DAMAGE_DOT). */
  private applySecondaryEffect(hero: Hero, power: PowerDefinition, result: PowerResult): void {
    if (!power.secondaryEffect) return;
    const sec = power.secondaryEffect;

    switch (sec.effectType) {
      case PowerEffectType.HEAL: {
        if (result.damageDealt <= 0) return;
        const healAmount = Math.floor(result.damageDealt * (sec.atkMultiplier ?? 0.5));
        const before = hero.currentHp;
        hero.currentHp = Math.min(hero.maxHp, hero.currentHp + healAmount);
        result.healingDone += hero.currentHp - before;
        break;
      }
      case PowerEffectType.DEBUFF_ATK: {
        const targets = this.resolveEnemyTargets(power.target);
        for (const idx of targets) {
          const enemy = this.teamState.enemies[idx];
          if (!enemy) continue;
          const debuff: StatusEffect = {
            type: StatusEffectType.DEBUFF_ATK,
            turnsRemaining: power.duration ?? 3,
            value: sec.atkMultiplier ?? 0.5,
          };
          this.teamState.applyStatusEffect(enemy, debuff);
        }
        break;
      }
      case PowerEffectType.DAMAGE_DOT: {
        const atk = this.teamState.getEffectiveAtk(hero);
        const levelMult = this.getLevelMult(hero.id);
        const dotDmg = Math.round(powerDamage(atk, sec.atkMultiplier ?? 0.4) * levelMult);
        const targets = this.resolveEnemyTargets(power.target);
        for (const idx of targets) {
          const enemy = this.teamState.enemies[idx];
          if (!enemy) continue;
          const dot: StatusEffect = {
            type: StatusEffectType.DOT,
            turnsRemaining: power.duration ?? 3,
            value: dotDmg,
          };
          this.teamState.applyStatusEffect(enemy, dot);
        }
        break;
      }
      case PowerEffectType.BUFF_ATK: {
        const buff: StatusEffect = {
          type: StatusEffectType.BUFF_ATK,
          turnsRemaining: sec.duration ?? 2,
          value: sec.buffMultiplier ?? 2.0,
        };
        this.teamState.applyStatusEffect(hero, buff);
        break;
      }
      // DAMAGE_BURST secondary is handled directly inside heroBoardGemConvert
    }
  }

  /** Resolve enemy-side targets for a given PowerTarget. */
  private resolveEnemyTargets(target: PowerTarget): number[] {
    const enemies = this.teamState.enemies;
    if (enemies.length === 0) return [];
    switch (target) {
      case PowerTarget.SINGLE_ENEMY: return [this.teamState.frontEnemyIndex];
      case PowerTarget.ALL_ENEMIES:  return enemies.map((_, i) => i);
      case PowerTarget.RANDOM_ENEMY: return [Math.floor(Math.random() * enemies.length)];
      default: return [];
    }
  }

  /** Resolve hero-side targets for a given PowerTarget. */
  private resolveHeroTargets(target: PowerTarget, casterIndex: number): number[] {
    const heroes = this.teamState.heroes;
    if (heroes.length === 0) return [];
    switch (target) {
      case PowerTarget.SELF:        return [casterIndex];
      case PowerTarget.ALL_ALLIES:  return heroes.map((_, i) => i);
      default: return [];
    }
  }
}

// ===== Legacy function-style API =====
// Existing call sites (GameComponent, CombatSystem) use these; we keep them as
// thin adapters so the migration is non-breaking.

export function executeHeroPower(teamState: TeamState, heroIndex: number, getLevelMultiplier?: (heroId: string) => number): PowerResult {
  return new PowerResolver(teamState, getLevelMultiplier).executeHero(heroIndex);
}

export function executeEnemyPower(teamState: TeamState, enemyIndex: number): PowerResult {
  return new PowerResolver(teamState).executeEnemy(enemyIndex);
}
