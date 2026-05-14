/**
 * TeamState
 *
 * Holds the data for a battle: hero roster, enemy roster, color
 * assignments, front-character indices, displayed HP for smooth bar drain.
 *
 * Animation tweens live in TeamVisualAnimator.
 * Status-effect logic lives in StatusEffectEngine.
 * Roster construction lives in HeroFactory / EnemyFactory.
 *
 * The methods exposed here are the public surface used by GameComponent;
 * they delegate to the helpers above. Re-exports of legacy constants
 * (ATTACK_DURATION, HURT_FLASH_DURATION) preserve external imports.
 */
import { GemType, GEM_TYPE_COUNT } from './Types';
import type { Hero, Enemy, ColorAssignment, TeamMemberVisual } from './TeamTypes';
import { TurnOwner } from './TeamTypes';
import type { StatusEffect } from './PowerTypes';
import { applyDamage as applyDamageImpl } from './Damage';
import type { DamageOutcome } from './Damage';
import { expDecayFactor } from './Tweener';
import {
  TEAM_HP_DRAIN_SPEED,
  ATTACK_LUNGE_DURATION,
  HURT_FLASH_DURATION as HURT_FLASH_DURATION_CONST,
  DEATH_ANIM_WAIT,
} from './AnimationConfig';
import { TeamVisualAnimator } from './TeamVisualAnimator';
import { StatusEffectEngine } from './StatusEffectEngine';
import { ManaBank } from './ManaBank';
import { pickRandomHeroes } from './HeroFactory';
import { defaultEncounter } from './EnemyFactory';

// Re-exports preserve legacy import sites in CombatSystem & GameComponent.
export const ATTACK_DURATION = ATTACK_LUNGE_DURATION;
export const HURT_FLASH_DURATION = HURT_FLASH_DURATION_CONST;

export class TeamState {
  heroes: Hero[] = [];
  enemies: Enemy[] = [];

  /** Index of the hero currently in front (0-2) */
  frontHeroIndex: number = 0;
  /** Index of the enemy currently in front (0-2) */
  frontEnemyIndex: number = 0;
  /** True when the current encounter is a single boss enemy. */
  private _isBossRoom: boolean = false;

  /** Color assignments: which hero has which color */
  colorAssignments: ColorAssignment[] = [];

  /** Visual states for hero / enemy slots */
  heroVisuals: TeamMemberVisual[] = [];
  enemyVisuals: TeamMemberVisual[] = [];

  /** Current turn owner */
  turnOwner: TurnOwner = TurnOwner.Player;

  /** Displayed HP values for smooth drain animation (parallels heroes/enemies). */
  heroDisplayHp: number[] = [];
  enemyDisplayHp: number[] = [];

  /** Death animation wait duration (kept for legacy callers). */
  static readonly REORG_DELAY = DEATH_ANIM_WAIT;

  private animator: TeamVisualAnimator = new TeamVisualAnimator();
  private effects: StatusEffectEngine = new StatusEffectEngine();
  /** Shared mana pool for the enemy team, accumulated per color each enemy turn. */
  private enemyManaBank: ManaBank = new ManaBank();

  constructor() {
    this.initialize();
  }

  /** Convenience getter for the global hitstop timer. */
  get hitstopTimer(): number { return this.animator.hitstopTimer; }

  /** Set up default teams and assign colors */
  initialize(): void {
    this.heroes = pickRandomHeroes(3);
    this.enemies = defaultEncounter();

    this.assignColors();

    this.frontHeroIndex = this.getHeroIndexForColor(GemType.Red);
    this.frontEnemyIndex = 0;

    this.heroDisplayHp = this.heroes.map(h => h.currentHp);
    this.enemyDisplayHp = this.enemies.map(e => e.currentHp);

    this.heroVisuals = this.heroes.map((_, i) =>
      this.animator.createVisual(i, this.frontHeroIndex, true));
    this._isBossRoom = this.enemies.length === 1 && !!this.enemies[0]?.isBoss;
    this.enemyVisuals = this.enemies.map((_, i) =>
      this.animator.createVisual(i, this.frontEnemyIndex, false, this._isBossRoom));

  }

  /** Assign each gem color to the hero with highest affinity for it. */
  assignColors(): void {
    this.colorAssignments = [];
    for (let gemType = 0; gemType < GEM_TYPE_COUNT; gemType++) {
      const best = this.bestHeroIdForColor(gemType as GemType, this.heroes);
      this.colorAssignments.push({ gemType: gemType as GemType, heroId: best });
    }
  }

  /** Get the hero index that would deal the most damage for a gem color.
   *  Accounts for active buffs/debuffs so a buffed hero can take over a color. */
  getHeroIndexForColor(gemType: GemType): number {
    let bestIdx = 0;
    let bestScore = -1;
    for (let i = 0; i < this.heroes.length; i++) {
      const hero = this.heroes[i];
      if (hero.currentHp <= 0) continue;
      const score = this.getEffectiveAtk(hero) * hero.affinities[gemType];
      if (score > bestScore) {
        bestScore = score;
        bestIdx = i;
      }
    }
    return bestIdx;
  }

  /** Get colors assigned to a specific hero */
  getColorsForHero(heroId: string): GemType[] {
    return this.colorAssignments.filter(a => a.heroId === heroId).map(a => a.gemType);
  }

  /**
   * When a gem match occurs, swap the matching hero to the front.
   * Lunge animation is fired separately by GameComponent (per-match staggered).
   */
  onGemMatched(gemType: GemType): void {
    this.bringHeroToFront(this.getHeroIndexForColor(gemType));
  }

  /**
   * Promote a specific hero to the front slot. Use this instead of
   * `onGemMatched` when the caller wants to centre on a known hero (e.g.,
   * the power preview spotlight) without going through color routing.
   */
  bringHeroToFront(heroIndex: number): void {
    if (heroIndex < 0 || heroIndex >= this.heroes.length) return;
    if (heroIndex === this.frontHeroIndex) return;
    this.frontHeroIndex = heroIndex;
    this.animator.recalculateDepthPositions(this.heroVisuals, this.frontHeroIndex, true);
  }

  /** Snap displayed HP to current HP (e.g. between rooms, after a heal). */
  resetHeroDisplayHp(): void {
    this.heroDisplayHp = this.heroes.map(h => h.currentHp);
  }

  // ===== Animation pass-throughs =====

  triggerBounce(visuals: TeamMemberVisual[], index: number): void {
    this.animator.triggerBounce(visuals, index);
  }

  triggerAttack(visuals: TeamMemberVisual[], index: number, isAlly: boolean): void {
    this.animator.triggerAttack(visuals, index, isAlly);
  }

  triggerHurtFlash(visuals: TeamMemberVisual[], index: number): void {
    this.animator.triggerHurtFlash(visuals, index);
  }

  triggerHitstop(duration: number): void {
    this.animator.triggerHitstop(duration);
  }

  markDead(visuals: TeamMemberVisual[], index: number): void {
    this.animator.markDead(visuals, index);
  }

  recalculateDepthPositions(
    visuals: TeamMemberVisual[],
    frontIndex: number,
    isAlly: boolean,
  ): void {
    this.animator.recalculateDepthPositions(visuals, frontIndex, isAlly);
  }

  /** Update visual animations + smooth HP drain (call each frame). */
  update(dt: number): void {
    if (!this.animator.update(this.heroVisuals, this.enemyVisuals, dt)) return;

    const hpFactor = expDecayFactor(TEAM_HP_DRAIN_SPEED, dt);
    for (let i = 0; i < this.heroes.length; i++) {
      this.heroDisplayHp[i] += (this.heroes[i].currentHp - this.heroDisplayHp[i]) * hpFactor;
      if (Math.abs(this.heroDisplayHp[i] - this.heroes[i].currentHp) < 0.5) {
        this.heroDisplayHp[i] = this.heroes[i].currentHp;
      }
    }
    for (let i = 0; i < this.enemies.length; i++) {
      this.enemyDisplayHp[i] += (this.enemies[i].currentHp - this.enemyDisplayHp[i]) * hpFactor;
      if (Math.abs(this.enemyDisplayHp[i] - this.enemies[i].currentHp) < 0.5) {
        this.enemyDisplayHp[i] = this.enemies[i].currentHp;
      }
    }
  }

  // ===== Reorganization =====

  /** Reassign colors from a dead hero to surviving heroes by highest affinity. */
  reassignColorsOnDeath(deadHeroId: string): GemType[] {
    const reassigned: GemType[] = [];
    const livingHeroes = this.heroes.filter(h => h.currentHp > 0 && h.id !== deadHeroId);
    if (livingHeroes.length === 0) return reassigned;

    for (const assignment of this.colorAssignments) {
      if (assignment.heroId !== deadHeroId) continue;
      assignment.heroId = this.bestHeroIdForColor(assignment.gemType, livingHeroes);
      reassigned.push(assignment.gemType);
    }

    // Update front hero to living hero with highest ATK
    const newFrontIdx = this.indexOfHighestAtk(this.heroes);
    if (newFrontIdx >= 0 && newFrontIdx !== this.frontHeroIndex) {
      this.frontHeroIndex = newFrontIdx;
      this.animator.recalculateDepthPositions(this.heroVisuals, this.frontHeroIndex, true);
    }

    return reassigned;
  }

  /**
   * Reorganize heroes: remove dead members, shift survivors forward, reassign
   * colors and front-hero. Returns true if any hero was removed.
   */
  reorganizeHeroes(): boolean {
    return this.reorganizeGroup(
      this.heroes,
      this.heroVisuals,
      this.heroDisplayHp,
      removedFront => {
        if (this.heroes.length === 0) return;
        this.frontHeroIndex = this.indexOfHighestAtkAmongLiving(this.heroes);
        this.assignColors();
        if (removedFront || true) {
          this.animator.recalculateDepthPositions(this.heroVisuals, this.frontHeroIndex, true);
        }
      },
    );
  }

  /**
   * Reorganize enemies: remove dead members, shift survivors forward, update
   * front enemy. Returns true if any enemy was removed.
   */
  reorganizeEnemies(): boolean {
    return this.reorganizeGroup(
      this.enemies,
      this.enemyVisuals,
      this.enemyDisplayHp,
      () => {
        if (this.enemies.length === 0) return;
        this.frontEnemyIndex = this.indexOfHighestAtkAmongLiving(this.enemies);
        this.animator.recalculateDepthPositions(this.enemyVisuals, this.frontEnemyIndex, false, this._isBossRoom);
      },
    );
  }

  /** Check if all player heroes are dead */
  allPlayersDead(): boolean { return this.heroes.every(h => h.currentHp <= 0); }
  /** Check if all enemies are dead */
  allEnemiesDead(): boolean { return this.enemies.every(e => e.currentHp <= 0); }

  /** Update front enemy to next living enemy with highest ATK */
  updateFrontEnemy(): void {
    const idx = this.indexOfHighestAtk(this.enemies);
    if (idx >= 0 && idx !== this.frontEnemyIndex) {
      this.frontEnemyIndex = idx;
      this.animator.recalculateDepthPositions(this.enemyVisuals, this.frontEnemyIndex, false, this._isBossRoom);
    }
  }

  // ===== Status-effect pass-throughs =====

  hasShield(member: Hero | Enemy): boolean { return this.effects.hasShield(member); }
  consumeShield(member: Hero | Enemy): boolean { return this.effects.consumeShield(member); }
  applyStatusEffect(member: Hero | Enemy, effect: StatusEffect): void {
    this.effects.applyStatusEffect(member, effect);
  }
  getEffectiveAtk(member: Hero | Enemy): number { return this.effects.effectiveAtk(member); }

  /**
   * Apply damage to a hero or enemy honoring shields. See Damage.applyDamage
   * for the semantics. Caller is responsible for the visuals; this helper is
   * the bookkeeping primitive.
   */
  applyDamage(target: Hero | Enemy, amount: number): DamageOutcome {
    return applyDamageImpl(target, amount, this.effects);
  }

  /** Tick DOTs on enemies. Returns damage and heal maps per enemy index. */
  tickEnemyDots(): { damage: Map<number, number>; heal: Map<number, number> } { return this.effects.tickDots(this.enemies); }
  /** Tick DOTs/HOTs on heroes. Returns damage and heal maps per hero index. */
  tickHeroDots(): { damage: Map<number, number>; heal: Map<number, number> } { return this.effects.tickDots(this.heroes); }
  /** Tick buff/debuff durations on heroes (call at end of player turn). */
  tickHeroBuffs(): void { this.effects.tickBuffs(this.heroes); }
  /** Tick buff/debuff durations on enemies (call at end of enemy turn). */
  tickEnemyBuffs(): void { this.effects.tickBuffs(this.enemies); }

  /**
   * Accumulate enemy mana into the shared pool. Each living enemy contributes
   * its per-color manaGain to the team bank. Called once per enemy turn.
   */
  accumulateEnemyMana(): void {
    for (const enemy of this.enemies) {
      if (enemy.currentHp <= 0) continue;
      for (let g = 0; g < GEM_TYPE_COUNT; g++) {
        this.enemyManaBank.addMana(g as GemType, enemy.manaGain[g as GemType]);
      }
    }
  }

  /**
   * Indices of living enemies whose power has enough shared mana.
   * Tentative spends are tracked across the loop so two enemies sharing the
   * same mana color don't both qualify from a pool that can only afford one.
   */
  getEnemiesWithPowerReady(): number[] {
    const ready: number[] = [];
    const tentativeSpend: Partial<Record<GemType, number>> = {};

    for (let i = 0; i < this.enemies.length; i++) {
      const e = this.enemies[i];
      if (e.currentHp <= 0) continue;
      const color = e.power.manaColor;
      const spent = tentativeSpend[color] ?? 0;
      const available = this.enemyManaBank.getMana(color) - spent;
      if (available >= e.power.manaCost) {
        ready.push(i);
        tentativeSpend[color] = spent + e.power.manaCost;
      }
    }
    return ready;
  }

  /** Deduct mana from the shared enemy pool after a power fires. */
  spendEnemyMana(color: GemType, amount: number): void {
    this.enemyManaBank.spendMana(color, amount);
  }

  /** Current shared mana for one color (used by HUD if we expose it later). */
  getEnemyMana(color: GemType): number {
    return this.enemyManaBank.getMana(color);
  }

  /** Check if a hero's power is ready given the player mana bank. */
  isHeroPowerReady(heroIndex: number, getMana: (gemType: GemType) => number): boolean {
    if (heroIndex < 0 || heroIndex >= this.heroes.length) return false;
    const hero = this.heroes[heroIndex];
    if (hero.currentHp <= 0) return false;
    return getMana(hero.power.manaColor) >= hero.power.manaCost;
  }

  /**
   * Set a custom enemy encounter (used by dungeon system).
   * Replaces the current enemies with the provided array and
   * re-initializes visuals and display HP for those enemies.
   */
  setEnemies(newEnemies: Enemy[]): void {
    this.enemies = newEnemies;
    this.frontEnemyIndex = 0;
    this.enemyManaBank.reset();
    this.enemyDisplayHp = this.enemies.map(e => e.currentHp);
    this._isBossRoom = this.enemies.length === 1 && !!this.enemies[0]?.isBoss;
    this.enemyVisuals = this.enemies.map((_, i) =>
      this.animator.createVisual(i, this.frontEnemyIndex, false, this._isBossRoom));
  }

  /**
   * Set a custom hero roster (used by roster management system).
   * Replaces the current heroes with heroes built from the provided array
   * and re-initializes visuals, display HP, colors, and front hero.
   */
  setHeroes(newHeroes: Hero[]): void {
    this.heroes = newHeroes;
    this.assignColors();
    this.frontHeroIndex = this.getHeroIndexForColor(GemType.Red);
    this.heroDisplayHp = this.heroes.map(h => h.currentHp);
    this.heroVisuals = this.heroes.map((_, i) =>
      this.animator.createVisual(i, this.frontHeroIndex, true));
    // Snap KO'd heroes to invisible so their sprites never appear at combat start
    for (let i = 0; i < this.heroes.length; i++) {
      if (this.heroes[i].currentHp <= 0) {
        this.animator.markDead(this.heroVisuals, i);
        this.heroVisuals[i].opacity = 0;
        this.heroVisuals[i].scale = 0;
      }
    }
  }

  /** Reset to initial state */
  reset(): void {
    this.animator.hitstopTimer = 0;
    this.initialize();
  }

  // ===== Internal =====

  /** Pick the hero id from `pool` with the highest affinity for `color`. */
  private bestHeroIdForColor(color: GemType, pool: Hero[]): string {
    if (pool.length === 0) return '';
    let bestId = pool[0].id;
    let bestAff = pool[0].affinities[color];
    for (let i = 1; i < pool.length; i++) {
      const aff = pool[i].affinities[color];
      if (aff > bestAff) {
        bestAff = aff;
        bestId = pool[i].id;
      }
    }
    return bestId;
  }

  private indexOfHighestAtk(group: { atk: number; currentHp: number }[]): number {
    let bestIdx = -1;
    let bestAtk = -1;
    for (let i = 0; i < group.length; i++) {
      if (group[i].currentHp > 0 && group[i].atk > bestAtk) {
        bestAtk = group[i].atk;
        bestIdx = i;
      }
    }
    return bestIdx;
  }

  private indexOfHighestAtkAmongLiving(group: { atk: number; currentHp: number }[]): number {
    // Like indexOfHighestAtk but never returns -1 for non-empty arrays
    let bestIdx = 0;
    let bestAtk = group[0]?.atk ?? -1;
    for (let i = 1; i < group.length; i++) {
      if (group[i].atk > bestAtk) {
        bestAtk = group[i].atk;
        bestIdx = i;
      }
    }
    return bestIdx;
  }

  private reorganizeGroup<T extends { name: string; currentHp: number }>(
    group: T[],
    visuals: TeamMemberVisual[],
    displayHp: number[],
    onAfterRemoval: (frontWasRemoved: boolean) => void,
  ): boolean {
    const dead: number[] = [];
    for (let i = group.length - 1; i >= 0; i--) {
      if (group[i].currentHp <= 0) dead.push(i);
    }
    if (dead.length === 0) return false;

    for (const idx of dead) {
      group.splice(idx, 1);
      visuals.splice(idx, 1);
      displayHp.splice(idx, 1);
    }

    onAfterRemoval(true);

    return true;
  }
}
