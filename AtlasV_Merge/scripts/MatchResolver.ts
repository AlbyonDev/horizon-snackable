/**
 * MatchResolver
 *
 * Owns the gameplay-side reaction to gem matches:
 *   - mana awards + score
 *   - per-match staggered visuals (lunge + popup + damage)
 *   - cascade counter + multi-attack notifier
 *
 * All visual timing is frame-driven: matches are scheduled onto an internal
 * timeline and drained from `update(dt)`, so HP mutation is synchronous with
 * the host frame. CombatFlowController polls `isVisualsSettled()` to know
 * when it is safe to advance the phase machine.
 */
import type { Match } from './Types';
import type { Gem } from './Types';
import type { TeamState } from './TeamState';
import type { ManaBank } from './ManaBank';
import type { AnimationHandler } from './AnimationHandler';
import type { DamagePopupManager } from './DamagePopupManager';
import type { MultiAttackNotifier } from './MultiAttackNotifier';
import { detectMatches, getMatchedPositions } from './MatchDetector';
import { CombatSystem } from './CombatSystem';
import { applyDirect } from './Damage';
import {
  ATTACK_LUNGE_DURATION,
  ATTACK_PEAK_FRACTION,
  CRIT_GEM_COUNT,
  SUPERCRIT_GEM_COUNT,
  MATCH_STAGGER_MS,
  POPUP_BASE_FONT,
  POPUP_CRIT_FONT,
  POPUP_SUPERCRIT_FONT,
  POPUP_COLOR_NORMAL,
  POPUP_COLOR_CRIT,
  POPUP_COLOR_SUPERCRIT,
  SCORE_PER_MATCHED_GEM,
  POPUP_READ_BUFFER_MS,
} from './AnimationConfig';
import { ScreenShakeManager, ShakePreset } from './ScreenShakeManager';

export interface MatchResolverDeps {
  teamState: TeamState;
  manaBank: ManaBank;
  animHandler: AnimationHandler;
  damagePopups: DamagePopupManager;
  multiAttackNotifier: MultiAttackNotifier;
  /** Optional: returns the level multiplier for a hero by id. Defaults to 1.0 if not provided. */
  getLevelMultiplier?: (heroId: string) => number;
  /** Optional: called when mana is gained from a match so particles can be spawned. */
  onManaGained?: (centerX: number, centerY: number, gemType: number) => void;
  /** Optional: screen shake manager for triggering shake on crits, kills, cascades. */
  screenShake?: ScreenShakeManager;
}

/** Outcome returned to GameComponent so it can update score / drive combat phase. */
export interface MatchProcessOutcome {
  /** Number of matches processed (0 = no matches). */
  matchCount: number;
  /** Total score added this resolution. */
  scoreAdded: number;
}

type VisualKind = 'lunge' | 'apply';

interface VisualEvent {
  /** Time on the internal timeline (ms) when this event fires. */
  dueAtMs: number;
  kind: VisualKind;
  match: Match;
  heroIndex: number;
  isCrit: boolean;
  isSuperCrit: boolean;
}

export class MatchResolver {
  private deps: MatchResolverDeps;

  /** Internal timeline cursor (ms). Advances by dt*1000 each frame. */
  private clockMs: number = 0;
  /** Earliest time the next *new* lunge can fire (ms on internal timeline). */
  private nextLungeAtMs: number = 0;
  /** clockMs threshold past which all queued visuals + their lunge tails are done. */
  private settleAtMs: number = 0;
  /** Pending events sorted ascending by dueAtMs. */
  private events: VisualEvent[] = [];

  private _hasAttackedThisTurn: boolean = false;
  private _enemyDiedThisTurn: boolean = false;
  private _cascadeCount: number = 0;

  constructor(deps: MatchResolverDeps) {
    this.deps = deps;
  }

  get hasAttackedThisTurn(): boolean { return this._hasAttackedThisTurn; }
  get enemyDiedThisTurn(): boolean { return this._enemyDiedThisTurn; }
  get cascadeCount(): number { return this._cascadeCount; }

  /** True when all queued visuals fired and the last lunge animation tail finished. */
  isVisualsSettled(): boolean {
    return this.events.length === 0 && this.clockMs >= this.settleAtMs;
  }

  /**
   * Run match detection, schedule per-match visuals, kick off destruction.
   * Returns a summary so GameComponent can update score / track state.
   */
  process(board: (Gem | null)[][]): MatchProcessOutcome {
    const matches = detectMatches(board as Gem[][]);
    if (matches.length === 0) {
      return { matchCount: 0, scoreAdded: 0 };
    }

    let scoreAdded = 0;
    for (const match of matches) {
      this.deps.manaBank.addMana(match.gemType, match.manaValue);
      scoreAdded += match.positions.length * SCORE_PER_MATCHED_GEM;

      // Front-hero swap is gameplay-relevant (affects damage routing); fire now.
      this.deps.teamState.onGemMatched(match.gemType);
      const heroIndex = this.deps.teamState.getHeroIndexForColor(match.gemType);

      this.scheduleMatchVisual(match, heroIndex);

      // Notify mana gain for particle effects (calculate match center)
      if (this.deps.onManaGained && match.positions.length > 0) {
        let cx = 0;
        let cy = 0;
        for (const pos of match.positions) {
          cx += pos.col;
          cy += pos.row;
        }
        cx /= match.positions.length;
        cy /= match.positions.length;
        this.deps.onManaGained(cx, cy, match.gemType);
      }
    }

    this._hasAttackedThisTurn = true;

    const matchedPositions = getMatchedPositions(matches);
    this.deps.animHandler.startDestruction(matchedPositions, board);

    return { matchCount: matches.length, scoreAdded };
  }

  /** Drain time-due events and advance the internal clock. Call once per frame. */
  update(dt: number): void {
    if (this.events.length === 0 && this.clockMs >= this.settleAtMs) return;
    this.clockMs += dt * 1000;
    while (this.events.length > 0 && this.events[0].dueAtMs <= this.clockMs) {
      const ev = this.events.shift()!;
      if (ev.kind === 'lunge') this.fireLunge(ev);
      else this.fireApply(ev);
    }
  }

  /** Bump cascade counter + show the multi-attack banner. */
  registerCascade(): void {
    this._cascadeCount++;
    this.deps.multiAttackNotifier.trigger(this._cascadeCount);
    // Screen shake on large cascades (4+)
    if (this._cascadeCount >= 4 && this.deps.screenShake) {
      this.deps.screenShake.trigger(ShakePreset.Medium);
    }
  }

  /** Cascade chain ended — clear the banner and chain count. */
  clearCascade(): void {
    if (this._cascadeCount > 0) {
    }
    this._cascadeCount = 0;
    this.deps.multiAttackNotifier.clear();
  }

  /** Reset state at the start of a new turn or after a board reset. */
  resetForNewTurn(): void {
    this._hasAttackedThisTurn = false;
    this._enemyDiedThisTurn = false;
    this.clockMs = 0;
    this.nextLungeAtMs = 0;
    this.settleAtMs = 0;
    this.events.length = 0;
  }

  reset(): void {
    this.resetForNewTurn();
    this._cascadeCount = 0;
  }

  // ===== Internal =====

  /** Get level multiplier for a hero at a given index. */
  private getLevelMultForHero(heroIndex: number): number {
    const fn = this.deps.getLevelMultiplier;
    if (!fn) return 1.0;
    const hero = this.deps.teamState.heroes[heroIndex];
    if (!hero) return 1.0;
    return fn(hero.id);
  }

  private scheduleMatchVisual(match: Match, heroIndex: number): void {
    const lungeAt = Math.max(this.clockMs, this.nextLungeAtMs);
    const applyAt = lungeAt + ATTACK_LUNGE_DURATION * 1000 * ATTACK_PEAK_FRACTION;
    const lungeEndMs = lungeAt + ATTACK_LUNGE_DURATION * 1000;

    const isSuperCrit = match.positions.length >= SUPERCRIT_GEM_COUNT;
    const isCrit = match.positions.length >= CRIT_GEM_COUNT;

    this.events.push({ dueAtMs: lungeAt, kind: 'lunge', match, heroIndex, isCrit, isSuperCrit });
    this.events.push({ dueAtMs: applyAt, kind: 'apply', match, heroIndex, isCrit, isSuperCrit });
    this.events.sort((a, b) => a.dueAtMs - b.dueAtMs);

    this.nextLungeAtMs = lungeAt + MATCH_STAGGER_MS;
    this.settleAtMs = Math.max(this.settleAtMs, lungeEndMs + POPUP_READ_BUFFER_MS);
  }

  private fireLunge(ev: VisualEvent): void {
    const team = this.deps.teamState;
    team.triggerAttack(team.heroVisuals, ev.heroIndex, true);
    if (ev.isCrit || ev.isSuperCrit) {
      this.deps.multiAttackNotifier.triggerMatchBanner(ev.isSuperCrit);
    }
  }

  /**
   * Apply damage at the lunge peak. Targeting is resolved at strike time so
   * a kill in match N reroutes match N+1 to the next enemy automatically.
   */
  private fireApply(ev: VisualEvent): void {
    const team = this.deps.teamState;
    if (team.allEnemiesDead()) return;
    if (team.enemies[team.frontEnemyIndex].currentHp <= 0) {
      team.updateFrontEnemy();
      if (team.allEnemiesDead()) return;
    }

    const targetIdx = team.frontEnemyIndex;
    const enemy = team.enemies[targetIdx];

    const damage = CombatSystem.calculateMatchDamage(ev.match, team, this.getLevelMultForHero(ev.heroIndex));
    const outcome = applyDirect(enemy, damage);
    if (outcome.dealt <= 0) return;

    if (outcome.killed) {
      team.markDead(team.enemyVisuals, targetIdx);
      team.updateFrontEnemy();
      this._enemyDiedThisTurn = true;
      // Screen shake on enemy kill
      if (this.deps.screenShake) {
        this.deps.screenShake.trigger(ShakePreset.Medium);
      }
    }

    team.triggerHurtFlash(team.enemyVisuals, targetIdx);
    const visual = team.enemyVisuals[targetIdx];
    const cx = visual.x + 80 * visual.scale; // sprite is 160 wide at scale 1.0
    const cy = visual.y - 5;
    this.deps.damagePopups.spawn(cx, cy, String(damage), {
      fontColor: ev.isSuperCrit ? POPUP_COLOR_SUPERCRIT : ev.isCrit ? POPUP_COLOR_CRIT : POPUP_COLOR_NORMAL,
      fontSize: ev.isSuperCrit ? POPUP_SUPERCRIT_FONT : ev.isCrit ? POPUP_CRIT_FONT : POPUP_BASE_FONT,
      strokeThickness: ev.isSuperCrit ? 4 : 3,
    });

    // Screen shake on critical hits
    if (ev.isSuperCrit && this.deps.screenShake) {
      this.deps.screenShake.trigger(ShakePreset.Heavy);
    } else if (ev.isCrit && this.deps.screenShake) {
      this.deps.screenShake.trigger(ShakePreset.Light);
    }
  }
}
