/**
 * CombatSystem.ts
 *
 * Combat orchestration: enemy turn, match-damage application. Damage formulas
 * + the apply step live in Damage.ts; this file is just the per-turn glue.
 */
import { GemType } from './Types';
import type { Match } from './Types';
import { TeamState, ATTACK_DURATION, HURT_FLASH_DURATION } from './TeamState';
import { matchBonus, basicAttackDamage } from './Damage';

/** Result of enemy turn */
export interface EnemyTurnResult {
  damage: number;
  targetHeroIndex: number;
  killed: boolean;
  shielded: boolean;
}

export class CombatSystem {
  /**
   * Calculate damage for a single match.
   * MatchDamage = ATK(hero_assigned_to_color) × Affinity[hero][color] × MatchBonus × LevelMultiplier
   */
  static calculateMatchDamage(match: Match, teamState: TeamState, levelMultiplier: number = 1.0): number {
    const heroIndex = teamState.getHeroIndexForColor(match.gemType);
    const hero = teamState.heroes[heroIndex];
    if (!hero || hero.currentHp <= 0) return 0;
    const atk = teamState.getEffectiveAtk(hero);
    const dmg = Math.round(atk * hero.affinities[match.gemType] * matchBonus(match.positions.length) * levelMultiplier);
    return dmg;
  }

  /**
   * Execute enemy turn: front enemy deals a basic attack honoring shields
   * against the front hero.
   */
  static executeEnemyTurn(teamState: TeamState): EnemyTurnResult {
    const frontEnemy = teamState.enemies[teamState.frontEnemyIndex];
    const targetHeroIndex = teamState.frontHeroIndex;
    const targetHero = teamState.heroes[targetHeroIndex];

    if (frontEnemy.currentHp <= 0 || targetHero.currentHp <= 0) {
      return { damage: 0, targetHeroIndex, killed: false, shielded: false };
    }

    const damage = basicAttackDamage(teamState.getEffectiveAtk(frontEnemy));
    const outcome = teamState.applyDamage(targetHero, damage);

    return {
      damage: outcome.dealt,
      targetHeroIndex,
      killed: outcome.killed,
      shielded: outcome.shielded,
    };
  }

  /**
   * Get the total animation time for combat sequences.
   */
  static get attackAnimDuration(): number {
    return ATTACK_DURATION;
  }

  static get hurtAnimDuration(): number {
    return HURT_FLASH_DURATION;
  }

  /** Time to wait for the full attack+hurt sequence */
  static get combatSequenceDuration(): number {
    return ATTACK_DURATION + 0.1 + HURT_FLASH_DURATION + 0.15;
  }
}
