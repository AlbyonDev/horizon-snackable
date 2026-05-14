/**
 * VictoryAnimator.ts
 *
 * Manages the JRPG-style victory screen animation sequence:
 * - Phase 1: XP bars fill smoothly over ~1.5s
 * - Phase 2: Level-up heroes get a bouncy scale animation + glow
 * - Phase 3: Continue button appears
 *
 * Frame-rate independent using delta time. Handles multiple level-ups
 * per hero (bar wraps around for each level gained).
 */
import { xpRequiredForLevel } from './RosterManager';
import { clamp, lerp, easeOutQuad } from './Tweener';
import type { VictoryHeroViewModel } from './SpriteViewModel';
import type { TextureAsset, Maybe } from 'meta/worlds';

/** Snapshot of a hero's XP state BEFORE the reward is applied. */
export interface HeroXpSnapshot {
  heroId: string;
  heroName: string;
  texture: Maybe<TextureAsset>;
  startLevel: number;
  startXp: number;
  xpGained: number;
  endLevel: number;
  endXp: number;
  manaColorHex: string;
  hpText: string;
  /** HP bar fill width in pixels (0..116) */
  hpFillWidth: number;
  /** True when hero died in combat (HP = 0) */
  isDead: boolean;
}

/** Width in XAML logical pixels of the full XP bar. */
const XP_BAR_MAX_WIDTH = 132;
/** Duration of the XP fill phase in seconds. */
const FILL_DURATION = 1.5;
/** Duration of the bounce animation in seconds. */
const BOUNCE_DURATION = 0.5;
/** Delay after fill before continue button shows (seconds). */
const POST_ANIM_DELAY = 0.4;
/** Bounce peak scale. */
const BOUNCE_PEAK = 1.2;

enum VictoryPhase {
  Idle,
  Filling,
  Bouncing,
  Done,
}

interface HeroAnimState {
  snapshot: HeroXpSnapshot;
  /** Animated progress 0..1 through the total fill. */
  fillT: number;
  /** Whether this hero leveled up at all. */
  didLevelUp: boolean;
  /** Bounce timer (0..BOUNCE_DURATION). */
  bounceTimer: number;
  /** Current computed scale (1.0 normally, peaks at BOUNCE_PEAK). */
  scale: number;
  /** Glow opacity (0..1). */
  glowOpacity: number;
  /** Whether the LEVEL UP text is visible. */
  levelUpVisible: boolean;
  /** Elapsed time since levelUpVisible became true — drives pop-in then pulse. */
  levelUpPulseT: number;
}

export class VictoryAnimator {
  private phase: VictoryPhase = VictoryPhase.Idle;
  private heroes: HeroAnimState[] = [];
  private phaseTimer: number = 0;
  private goldReward: number = 0;

  /** True when animation is fully complete and continue button should show. */
  public continueReady: boolean = false;
  /** True while the animator is running (fill or bounce). */
  public isActive: boolean = false;

  /** Gold reward text for display. */
  public get goldText(): string { return `+${this.goldReward} Gold`; }

  /** Start the victory animation sequence. Call once per room clear. */
  start(snapshots: HeroXpSnapshot[], gold: number): void {
    this.goldReward = gold;
    this.continueReady = false;
    this.isActive = true;
    this.phaseTimer = 0;
    this.phase = VictoryPhase.Filling;

    this.heroes = snapshots.map(snap => ({
      snapshot: snap,
      fillT: 0,
      didLevelUp: snap.endLevel > snap.startLevel,
      bounceTimer: 0,
      scale: 1.0,
      glowOpacity: 0,
      levelUpVisible: false,
      levelUpPulseT: 0,
    }));

  }

  /** Reset animator to idle state. */
  reset(): void {
    this.phase = VictoryPhase.Idle;
    this.heroes = [];
    this.continueReady = false;
    this.isActive = false;
    this.phaseTimer = 0;
  }

  /** Update animation each frame. Call with capped delta time. */
  update(dt: number): void {
    if (this.phase === VictoryPhase.Idle) return;

    this.phaseTimer += dt;

    // Tick level-up pulse timer for any hero showing the LEVEL UP! overlay.
    for (const h of this.heroes) {
      if (h.levelUpVisible) h.levelUpPulseT += dt;
    }

    switch (this.phase) {
      case VictoryPhase.Filling:
        this.updateFilling(dt);
        break;
      case VictoryPhase.Bouncing:
        this.updateBouncing(dt);
        break;
      case VictoryPhase.Done:
        this.updatePulsing();
        break;
    }
  }

  /** Sync current animation state to ViewModels. */
  syncToViewModels(vms: readonly VictoryHeroViewModel[]): void {
    for (let i = 0; i < this.heroes.length && i < vms.length; i++) {
      const h = this.heroes[i];
      const vm = vms[i];

      vm.heroName = h.snapshot.heroName;
      vm.texture = h.snapshot.texture;
      vm.cardScaleX = h.scale;
      vm.cardScaleY = h.scale;
      vm.levelUpVisible = h.levelUpVisible;
      vm.levelUpTextScale = h.levelUpVisible ? this.computeLevelUpTextScale(h.levelUpPulseT) : 1.0;
      vm.glowOpacity = h.glowOpacity;
      vm.manaColorHex = h.snapshot.manaColorHex;
      vm.hpText = h.snapshot.hpText;
      vm.hpFillWidth = h.snapshot.hpFillWidth;
      vm.isDead = h.snapshot.isDead;

      // Compute current animated level and XP bar fill
      const { level, xpBarFillWidth, xpGainedDisplay } = this.computeFillState(h);
      vm.levelText = `Lv.${level}`;
      vm.xpBarFillWidth = xpBarFillWidth;
      vm.xpGainedText = xpGainedDisplay;
    }
  }

  // === Private ===

  private updateFilling(_dt: number): void {
    const progress = clamp(this.phaseTimer / FILL_DURATION, 0, 1);
    const easedProgress = easeOutQuad(progress);

    for (const h of this.heroes) {
      h.fillT = easedProgress;
    }

    if (progress >= 1.0) {
      // Fill complete — move to bounce phase
      const anyLevelUp = this.heroes.some(h => h.didLevelUp);
      if (anyLevelUp) {
        this.phase = VictoryPhase.Bouncing;
        this.phaseTimer = 0;
        for (const h of this.heroes) {
          if (h.didLevelUp) {
            h.bounceTimer = 0;
            h.levelUpVisible = true;
          }
        }
      } else {
        this.finishAnimation();
      }
    }
  }

  private updateBouncing(dt: number): void {
    let allDone = true;

    for (const h of this.heroes) {
      if (!h.didLevelUp) continue;

      h.bounceTimer += dt;
      const t = clamp(h.bounceTimer / BOUNCE_DURATION, 0, 1);

      if (t < 1.0) {
        allDone = false;
        // Bouncy overshoot: scale up then settle back to 1.0
        // Using a damped sine for the overshoot feel
        const bounce = Math.sin(t * Math.PI) * (1.0 - t);
        h.scale = 1.0 + (BOUNCE_PEAK - 1.0) * bounce * 3.0;
        h.glowOpacity = (1.0 - t) * 0.8;
      } else {
        h.scale = 1.0;
        h.glowOpacity = 0;
      }
    }

    if (allDone) {
      this.finishAnimation();
    }
  }

  private finishAnimation(): void {
    this.phase = VictoryPhase.Done;
    this.continueReady = true;
    // Keep isActive true so the overlay stays visible
  }

  /** Keep level-up hero glows pulsing after bounce settles. */
  private updatePulsing(): void {
    for (const h of this.heroes) {
      if (!h.levelUpVisible) continue;
      h.glowOpacity = 0.25 + 0.2 * Math.sin(h.levelUpPulseT * Math.PI * 2.5);
    }
  }

  /**
   * Scale for the LEVEL UP! overlay text:
   *   0–0.25 s  : pop-in from 0 to 1.2 (easeOutQuad)
   *   0.25–0.5 s: settle 1.2 → 1.0 (easeOutQuad)
   *   0.5 s+    : gentle sine pulse around 1.0
   */
  private computeLevelUpTextScale(pulseT: number): number {
    const POP_RISE = 0.25;
    const POP_SETTLE = 0.5;
    if (pulseT < POP_RISE) {
      const t = pulseT / POP_RISE;
      return easeOutQuad(t) * 1.2;
    }
    if (pulseT < POP_SETTLE) {
      const t = (pulseT - POP_RISE) / (POP_SETTLE - POP_RISE);
      return lerp(1.2, 1.0, easeOutQuad(t));
    }
    const elapsed = pulseT - POP_SETTLE;
    return 1.0 + 0.07 * Math.sin(elapsed * Math.PI * 2.5);
  }

  /**
   * Compute the current visual state for a hero's XP bar based on fillT.
   * Handles multi-level wrapping: the bar fills to max, resets, and fills again
   * for each level gained.
   */
  private computeFillState(h: HeroAnimState): {
    level: number;
    xpBarFillWidth: number;
    xpGainedDisplay: string;
  } {
    const snap = h.snapshot;
    const totalXpGained = snap.xpGained;
    const animatedXpGained = Math.floor(totalXpGained * h.fillT);

    // Simulate XP addition step by step to find current animated level/xp
    let currentLevel = snap.startLevel;
    let currentXp = snap.startXp;
    let remaining = animatedXpGained;

    while (remaining > 0 && currentLevel < 10) {
      const needed = xpRequiredForLevel(currentLevel) - currentXp;
      if (remaining >= needed) {
        remaining -= needed;
        currentLevel++;
        currentXp = 0;
      } else {
        currentXp += remaining;
        remaining = 0;
      }
    }

    // Compute fill width
    let fillPercent: number;
    if (currentLevel >= 10) {
      fillPercent = 1.0;
    } else {
      const xpForThisLevel = xpRequiredForLevel(currentLevel);
      fillPercent = xpForThisLevel > 0 ? currentXp / xpForThisLevel : 0;
    }

    return {
      level: currentLevel,
      xpBarFillWidth: Math.round(fillPercent * XP_BAR_MAX_WIDTH),
      xpGainedDisplay: animatedXpGained > 0 ? `+${animatedXpGained} XP` : '',
    };
  }
}
