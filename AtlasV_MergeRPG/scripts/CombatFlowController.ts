/**
 * CombatFlowController
 *
 * Drives the post-cascade combat state machine:
 *   ApplyingDamage → CombatAnimating → ResolvingDeaths → ReorganizingTeam →
 *   (PlayerTurn | EnemyTurn | CombatOver)
 *
 * Enemy powers play a fullscreen cinematic (reusing PowerAnimationSystem) before
 * the basic attack. Multiple powers queue up and play one by one:
 *   EnemyTurn → EnemyPowerCinematic (×N) → CombatAnimating → ResolvingDeaths
 *
 * All timing is frame-driven: per-match visuals are gated on
 * MatchResolver.isVisualsSettled(); enemy-strike visuals are gated on a local
 * countdown advanced from update(dt). No setTimeout.
 */
import { CombatPhase } from './Types';
import type { TeamState } from './TeamState';
import type { MatchResolver } from './MatchResolver';
import type { DamagePopupManager } from './DamagePopupManager';
import { CombatSystem } from './CombatSystem';
import type { EnemyTurnResult } from './CombatSystem';
import { executeEnemyPower } from './PowerSystem';
import type { PowerAnimationSystem } from './PowerAnimationSystem';
import type { TextureAsset } from 'meta/worlds';
import { TurnOwner } from './TeamTypes';
import {
  ATTACK_LUNGE_DURATION,
  POPUP_COLOR_ENEMY_DAMAGE,
  POPUP_COLOR_DOT,
  POPUP_COLOR_HEAL,
  POPUP_ENEMY_FONT,
  POPUP_DOT_FONT,
  POPUP_HEAL_FONT,
  ATTACK_PEAK_FRACTION,
  DEATH_ANIM_WAIT,
} from './AnimationConfig';

export interface CombatFlowDeps {
  teamState: TeamState;
  matchResolver: MatchResolver;
  damagePopups: DamagePopupManager;
  /** Called when the player wins or loses; receives victory boolean. */
  onResult: (victory: boolean) => void;
  /** Called once the player turn is unlocked again (for input + re-shuffle check). */
  onPlayerTurnReady: () => void;
  /** Called after team arrays are reorganized (dead members spliced). */
  onTeamReorganized?: () => void;
  /** Shared cinematic state machine — also used by hero powers; never concurrent. */
  animSystem: PowerAnimationSystem;
  /** Returns the sprite texture for the given enemy id (used for the power cinematic). */
  getEnemyTexture: (enemyId: string) => TextureAsset;
}

export class CombatFlowController {
  private deps: CombatFlowDeps;
  private _phase: CombatPhase = CombatPhase.PlayerTurn;
  /** Countdown for ReorganizingTeam (death-fade wait). */
  private timer: number = 0;
  /** Countdown until enemy hurt-flash + popup fires; -1 = none pending. */
  private enemyHitDelay: number = -1;
  /** Countdown for the full enemy attack/hurt sequence after the hit fires; -1 = none. */
  private enemySequenceRemaining: number = -1;
  private deathOccurred: boolean = false;
  private lastEnemyResult: EnemyTurnResult | null = null;
  /** Set when a game-ending condition is detected; fired after the death fade. */
  private pendingOutcome: boolean | null = null;
  /** Queue of enemy indices whose powers are ready; drained one cinematic at a time. */
  private pendingEnemyPowers: number[] = [];
  /**
   * Seconds spent in the current non-PlayerTurn phase. If a phase ever exceeds
   * STUCK_PHASE_TIMEOUT, the controller force-advances to PlayerTurn so the
   * board never permanently locks if a callback fails to fire.
   */
  private phaseElapsed: number = 0;
  private lastPhase: CombatPhase = CombatPhase.PlayerTurn;

  constructor(deps: CombatFlowDeps) { this.deps = deps; }

  get phase(): CombatPhase { return this._phase; }
  set phase(p: CombatPhase) { this._phase = p; }

  /**
   * Called when a power kills the last enemy. Enters the same death-fade wait
   * used by the gem-match flow so the victory screen never races the sprite.
   */
  scheduleVictory(): void {
    this.pendingOutcome = true;
    this._phase = CombatPhase.ReorganizingTeam;
    this.timer = DEATH_ANIM_WAIT;
  }

  /** Reset to PlayerTurn at the start of a battle. */
  reset(): void {
    this._phase = CombatPhase.PlayerTurn;
    this.timer = 0;
    this.enemyHitDelay = -1;
    this.enemySequenceRemaining = -1;
    this.deathOccurred = false;
    this.lastEnemyResult = null;
    this.pendingOutcome = null;
    this.pendingEnemyPowers = [];
    this.phaseElapsed = 0;
    this.lastPhase = CombatPhase.PlayerTurn;
  }

  /** Per-frame tick. Phases that wait on visuals advance here. */
  update(dt: number): void {
    this.tickWatchdog(dt);

    if (this._phase === CombatPhase.CombatAnimating) {
      this.tickEnemyVisuals(dt);
      if (this.deps.teamState.turnOwner === TurnOwner.Player) {
        // Player-side: wait until MatchResolver has fired all queued visuals.
        if (this.deps.matchResolver.isVisualsSettled()) {
          this._phase = CombatPhase.ResolvingDeaths;
          this.resolveDeaths();
        }
      } else {
        // Enemy-side: wait until the enemy attack sequence finishes.
        if (this.enemySequenceRemaining < 0 && this.enemyHitDelay < 0) {
          this._phase = CombatPhase.ResolvingDeaths;
          this.resolveDeaths();
        }
      }
      return;
    }

    if (this._phase === CombatPhase.ReorganizingTeam) {
      this.timer -= dt;
      if (this.timer <= 0) this.finalizeReorganization();
    }

    // EnemyPowerCinematic is fully callback-driven via PowerAnimationSystem; no tick needed.
  }

  /**
   * Called once the cascade settles. Waits for any in-flight per-match visuals
   * to finish, then progresses to death resolution.
   */
  startApplyingDamage(): void {
    if (!this.deps.matchResolver.hasAttackedThisTurn) {
      // No matches happened — skip straight to enemy turn.
      this.startEnemyTurn();
      return;
    }
    this._phase = CombatPhase.CombatAnimating;
    // No timer needed — update() polls matchResolver.isVisualsSettled().
  }

  // ===== Death resolution =====

  private resolveDeaths(): void {
    this.deathOccurred = false;
    const team = this.deps.teamState;

    if (team.turnOwner === TurnOwner.Player) {
      if (team.allEnemiesDead()) {
        this.pendingOutcome = true;
        this.deathOccurred = true;
      } else if (this.deps.matchResolver.enemyDiedThisTurn) {
        this.deathOccurred = true;
      }
    } else {
      // Enemy turn just finished — handle hero death from cached result.
      if (this.lastEnemyResult && this.lastEnemyResult.killed) {
        const deadIdx = this.lastEnemyResult.targetHeroIndex;
        const deadHero = team.heroes[deadIdx];
        if (deadHero) {
          team.markDead(team.heroVisuals, deadIdx);
          team.reassignColorsOnDeath(deadHero.id);
          this.deathOccurred = true;

          if (team.allPlayersDead()) {
            this.pendingOutcome = false;
          }
        }
      }
    }

    if (this.deathOccurred) {
      this._phase = CombatPhase.ReorganizingTeam;
      this.timer = DEATH_ANIM_WAIT;
      return;
    }

    // No deaths — proceed immediately
    this.lastEnemyResult = null;
    this.advanceTurn();
  }

  private finalizeReorganization(): void {
    if (this.pendingOutcome !== null) {
      const outcome = this.pendingOutcome;
      this.pendingOutcome = null;
      this.deps.onResult(outcome);
      return;
    }
    this.deps.teamState.reorganizeHeroes();
    this.deps.teamState.reorganizeEnemies();
    if (this.deps.onTeamReorganized) this.deps.onTeamReorganized();
    this.lastEnemyResult = null;
    this.advanceTurn();
  }

  /** Move from "deaths resolved" → next turn (player or enemy). */
  private advanceTurn(): void {
    this.deps.matchResolver.resetForNewTurn();
    this.tickStatusEffects();

    if (this.checkDotDeaths()) return;

    if (this.deps.teamState.turnOwner === TurnOwner.Player) {
      this.startEnemyTurn();
    } else {
      this.endEnemyTurn();
    }
  }

  /**
   * After tickStatusEffects, scan for members whose HP reached 0 from DOT.
   * If any died, mark them dead and re-enter the ReorganizingTeam phase.
   * Returns true if the flow was captured (caller must not advance further).
   */
  private checkDotDeaths(): boolean {
    const team = this.deps.teamState;
    let anyDied = false;

    if (team.turnOwner === TurnOwner.Player) {
      for (let i = 0; i < team.enemies.length; i++) {
        if (team.enemies[i].currentHp <= 0 && !team.enemyVisuals[i].isDead) {
          team.markDead(team.enemyVisuals, i);
          team.updateFrontEnemy();
          anyDied = true;
        }
      }
      if (anyDied && team.allEnemiesDead()) {
        this.pendingOutcome = true;
      }
    } else {
      for (let i = 0; i < team.heroes.length; i++) {
        if (team.heroes[i].currentHp <= 0 && !team.heroVisuals[i].isDead) {
          team.markDead(team.heroVisuals, i);
          team.reassignColorsOnDeath(team.heroes[i].id);
          anyDied = true;
        }
      }
      if (anyDied && team.allPlayersDead()) {
        this.pendingOutcome = false;
      }
    }

    if (anyDied) {
      this._phase = CombatPhase.ReorganizingTeam;
      this.timer = DEATH_ANIM_WAIT;
      return true;
    }
    return false;
  }

  /**
   * Tick DOTs and buff/debuff durations at the end of the current turn.
   * Player turn just ended → tick enemy DOTs + enemy buffs.
   * Enemy turn just ended → tick hero DOTs + hero buffs.
   * DOT damage is shown as a popup above each affected member.
   */
  private tickStatusEffects(): void {
    const team = this.deps.teamState;

    if (team.turnOwner === TurnOwner.Player) {
      const { damage: enemyDots } = team.tickEnemyDots();
      for (const [idx, dmg] of enemyDots) {
        const visual = team.enemyVisuals[idx];
        if (visual) {
          this.deps.damagePopups.spawn(
            visual.x,
            visual.y - 20,
            String(dmg),
            { fontColor: POPUP_COLOR_DOT, fontSize: POPUP_DOT_FONT },
          );
        }
      }
      team.tickEnemyBuffs();
    } else {
      const { damage: heroDots, heal: heroHeals } = team.tickHeroDots();
      for (const [idx, dmg] of heroDots) {
        const visual = team.heroVisuals[idx];
        if (visual) {
          this.deps.damagePopups.spawn(
            visual.x + 80 * visual.scale,
            visual.y - 5,
            String(dmg),
            { fontColor: POPUP_COLOR_DOT, fontSize: POPUP_DOT_FONT },
          );
        }
      }
      for (const [idx, amount] of heroHeals) {
        const visual = team.heroVisuals[idx];
        if (visual) {
          this.deps.damagePopups.spawn(
            visual.x + 80 * visual.scale,
            visual.y - 5,
            `+${amount}`,
            { fontColor: POPUP_COLOR_HEAL, fontSize: POPUP_HEAL_FONT },
          );
        }
      }
      team.tickHeroBuffs();
    }
  }

  // ===== Turn boundaries =====

  startEnemyTurn(): void {
    const team = this.deps.teamState;
    team.turnOwner = TurnOwner.Enemy;
    this._phase = CombatPhase.EnemyTurn;

    team.accumulateEnemyMana();

    const readyIndices = team.getEnemiesWithPowerReady();
    if (readyIndices.length > 0) {
      this.pendingEnemyPowers = readyIndices;
      this._phase = CombatPhase.EnemyPowerCinematic;
      this.playNextEnemyPower(() => this.proceedToBasicAttack());
      return;
    }

    this.proceedToBasicAttack();
  }

  /**
   * Dequeue the next enemy power and start its cinematic. When the cinematic
   * completes, either play the next power in the queue or call onAllDone.
   * Deaths from powers are caught by checkDotDeaths at the next turn boundary.
   */
  private playNextEnemyPower(onAllDone: () => void): void {
    if (this.pendingEnemyPowers.length === 0) {
      onAllDone();
      return;
    }

    const enemyIdx = this.pendingEnemyPowers.shift()!;
    const team = this.deps.teamState;
    const enemy = team.enemies[enemyIdx];
    const visual = team.enemyVisuals[enemyIdx];
    // Skip if the caster died (DoT, hero-power kill) since the queue was built.
    if (!enemy || !visual || enemy.currentHp <= 0) {
      this.playNextEnemyPower(onAllDone);
      return;
    }

    const texture = this.deps.getEnemyTexture(enemy.spriteKey);

    this.deps.animSystem.start(
      {
        heroIndex: enemyIdx,
        texture,
        name: enemy.name,
        powerName: enemy.power.name,
        spotlightX: visual.x + 80 * visual.scale,
        spotlightY: visual.y + 100 * visual.scale,
      },
      enemy.power.effectType,
      (idx) => this.applyEnemyPowerEffect(idx),
      () => {
        if (team.allPlayersDead()) {
          this.pendingOutcome = false;
          this._phase = CombatPhase.ReorganizingTeam;
          this.timer = DEATH_ANIM_WAIT;
          return;
        }
        this.playNextEnemyPower(onAllDone);
      },
    );
  }

  /**
   * Fires at the cinematic's ApplyEffect beat: executes the power logic and
   * spawns hurt flashes + damage popups on heroes that lost HP.
   * Deaths are deferred to the checkDotDeaths sweep at the next turn boundary.
   */
  private applyEnemyPowerEffect(enemyIdx: number): void {
    const team = this.deps.teamState;
    const hpBefore = team.heroes.map(h => h.currentHp);
    const statusCountBefore = team.heroes.map(h => h.statusEffects.length);

    executeEnemyPower(team, enemyIdx);

    // Iterate the intersection of before/after — reorganize could splice heroes
    // mid-callback in principle, so don't trust either length alone.
    const len = Math.min(hpBefore.length, team.heroes.length);
    for (let i = 0; i < len; i++) {
      const hero = team.heroes[i];
      const visual = team.heroVisuals[i];
      if (!hero || !visual) continue;
      const dmg = hpBefore[i] - hero.currentHp;
      const gotStatusEffect = hero.statusEffects.length > statusCountBefore[i];
      if (dmg <= 0 && !gotStatusEffect) continue;
      team.triggerHurtFlash(team.heroVisuals, i);
      if (dmg > 0) {
        this.deps.damagePopups.spawn(
          visual.x + 80 * visual.scale,
          visual.y - 5,
          String(dmg),
          { fontColor: POPUP_COLOR_ENEMY_DAMAGE, fontSize: POPUP_ENEMY_FONT },
        );
      }
    }
  }

  /** Execute the front enemy's physical attack and enter CombatAnimating. */
  private proceedToBasicAttack(): void {
    const team = this.deps.teamState;

    if (team.allPlayersDead()) {
      this.pendingOutcome = false;
      this._phase = CombatPhase.ReorganizingTeam;
      this.timer = DEATH_ANIM_WAIT;
      return;
    }

    this.lastEnemyResult = CombatSystem.executeEnemyTurn(team);

    if (this.lastEnemyResult.damage > 0 || this.lastEnemyResult.shielded) {
      team.triggerAttack(team.enemyVisuals, team.frontEnemyIndex, false);

      // Schedule the hurt flash + popup at the lunge peak, and the sequence-end
      // tick when the full attack animation completes.
      this.enemyHitDelay = ATTACK_LUNGE_DURATION * ATTACK_PEAK_FRACTION;
      this.enemySequenceRemaining = CombatSystem.combatSequenceDuration;
      this._phase = CombatPhase.CombatAnimating;
    } else {
      // No damage dealt — resolve immediately
      this._phase = CombatPhase.ResolvingDeaths;
      this.resolveDeaths();
    }
  }

  endEnemyTurn(): void {
    this.deps.teamState.turnOwner = TurnOwner.Player;
    this._phase = CombatPhase.PlayerTurn;
    this.deps.onPlayerTurnReady();
  }

  // ===== Internal =====

  /**
   * Safety net: if the controller stays in a non-PlayerTurn phase for too long,
   * something upstream (cinematic callback, animation settle) silently dropped
   * a transition. Force-recover to PlayerTurn so the player can keep playing
   * instead of having to use the flee button.
   */
  private tickWatchdog(dt: number): void {
    const STUCK_PHASE_TIMEOUT = 8.0; // seconds — longer than any legitimate phase
    if (this._phase !== this.lastPhase) {
      this.lastPhase = this._phase;
      this.phaseElapsed = 0;
      return;
    }
    if (this._phase === CombatPhase.PlayerTurn || this._phase === CombatPhase.CombatOver) {
      this.phaseElapsed = 0;
      return;
    }
    this.phaseElapsed += dt;
    if (this.phaseElapsed >= STUCK_PHASE_TIMEOUT) {
      console.warn(`[CombatFlow] watchdog: phase ${CombatPhase[this._phase]} stuck for ${this.phaseElapsed.toFixed(1)}s — forcing PlayerTurn.`);
      this.forceRecover();
    }
  }

  /**
   * Tear down any pending phase state and return control to the player. Called
   * by tickWatchdog when a phase has been wedged past its expected duration.
   */
  private forceRecover(): void {
    this.enemyHitDelay = -1;
    this.enemySequenceRemaining = -1;
    this.timer = 0;
    this.pendingEnemyPowers = [];
    this.lastEnemyResult = null;
    this.pendingOutcome = null;
    this.deps.animSystem.reset();
    this.deps.teamState.turnOwner = TurnOwner.Player;
    this._phase = CombatPhase.PlayerTurn;
    this.phaseElapsed = 0;
    this.lastPhase = CombatPhase.PlayerTurn;
    this.deps.onPlayerTurnReady();
  }

  /** Tick down the enemy-strike timeline and fire the hurt flash + popup at peak. */
  private tickEnemyVisuals(dt: number): void {
    if (this.enemyHitDelay >= 0) {
      this.enemyHitDelay -= dt;
      if (this.enemyHitDelay <= 0) {
        this.fireEnemyHitVisuals();
        this.enemyHitDelay = -1;
      }
    }
    if (this.enemySequenceRemaining >= 0) {
      this.enemySequenceRemaining -= dt;
      if (this.enemySequenceRemaining <= 0) {
        this.enemySequenceRemaining = -1;
      }
    }
  }

  private fireEnemyHitVisuals(): void {
    if (!this.lastEnemyResult) return;
    const team = this.deps.teamState;
    const idx = this.lastEnemyResult.targetHeroIndex;
    team.triggerHurtFlash(team.heroVisuals, idx);
    const visual = team.heroVisuals[idx];
    const cx = visual.x + 80 * visual.scale;
    const cy = visual.y - 5;
    if (this.lastEnemyResult.shielded) {
      this.deps.damagePopups.spawn(cx, cy, 'Blocked', {
        fontColor: '#AADDFF',
        fontSize: POPUP_ENEMY_FONT,
      });
    } else {
      this.deps.damagePopups.spawn(cx, cy, String(this.lastEnemyResult.damage), {
        fontColor: POPUP_COLOR_ENEMY_DAMAGE,
        fontSize: POPUP_ENEMY_FONT,
      });
    }
  }
}
