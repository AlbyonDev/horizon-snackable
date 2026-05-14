/**
 * PowerAnimationSystem - State machine for power cinematic animations.
 * Drives a multi-phase cinematic sequence when a hero uses a power:
 *   Idle → Spotlight → Cinematic → ReturnToNormal → ApplyEffect → Idle
 *
 * Phase intent:
 *   Spotlight       — board dimmed, hero glows, mana drain telegraphs (UI visible)
 *   Cinematic       — fullscreen hero cast (UI hidden)
 *   ReturnToNormal  — dark overlay fades out, UI cross-fades back in
 *   ApplyEffect     — board fully visible: gameplay callback fires, projectiles
 *                     fly hero→target, damage popups + hurt flashes play. Phase
 *                     length is dynamic — waits on the caller's settled predicate.
 *
 * Component Attachment: Used as a plain class instance inside GameComponent (not a @component)
 * Component Networking: Local only (visual effect)
 * Component Ownership: N/A (not a component)
 */

import { TextureAsset } from 'meta/worlds';
import { heroWarriorTexture } from './Assets';
import { PowerEffectType } from './PowerTypes';

/**
 * Snapshot of the casting hero, captured at start() time. The cinematic
 * uses this to draw the *actual* hero (not the team-slot index, which
 * doesn't map to a hero identity once the roster is randomized).
 */
export interface CinematicCasterBinding {
  /** Team-slot index of the caster (0..2). Kept for back-compat / logging. */
  heroIndex: number;
  /** Hero portrait texture — drives both the spotlight glow target and the fullscreen sprite. */
  texture: TextureAsset;
  /** Hero name (displayed small, above the power label). */
  name: string;
  /** Power name (displayed large as the cinematic label). */
  powerName: string;
  /** Caster's screen-space spotlight target X (where the dim-everything glow centres). */
  spotlightX: number;
  /** Caster's screen-space spotlight target Y. */
  spotlightY: number;
}

// ─── Phase Enum ───────────────────────────────────────────────────────────────

export enum CinematicPhase {
  Idle = 0,
  Spotlight = 1,
  Cinematic = 2,
  ApplyEffect = 3,
  ReturnToNormal = 4,
}

// ─── VFX Config Per Power Type ────────────────────────────────────────────────

export interface PowerVfxConfig {
  readonly primaryColor: string;
  readonly secondaryColor: string;
  readonly particleCount: number;
  readonly gradientTop: string;
  readonly gradientBottom: string;
}

const POWER_VFX_CONFIGS: Record<number, PowerVfxConfig> = {
  [PowerEffectType.DAMAGE_DIRECT]: {
    primaryColor: '#FF4444',
    secondaryColor: '#FFAA00',
    particleCount: 12,

    gradientTop: '#1A0000',
    gradientBottom: '#440000',
  },
  [PowerEffectType.DAMAGE_BURST]: {
    primaryColor: '#FF6600',
    secondaryColor: '#FFDD00',
    particleCount: 20,
    gradientTop: '#1A0A00',
    gradientBottom: '#442200',
  },
  [PowerEffectType.DAMAGE_DOT]: {
    primaryColor: '#88FF00',
    secondaryColor: '#00CC44',
    particleCount: 16,
    gradientTop: '#001A00',
    gradientBottom: '#004400',
  },
  [PowerEffectType.HEAL]: {
    primaryColor: '#FFD700',
    secondaryColor: '#FFFFFF',
    particleCount: 10,
    gradientTop: '#1A1A00',
    gradientBottom: '#444400',
  },
  [PowerEffectType.SHIELD]: {
    primaryColor: '#4488FF',
    secondaryColor: '#AADDFF',
    particleCount: 8,
    gradientTop: '#000A1A',
    gradientBottom: '#002244',
  },
  [PowerEffectType.BUFF_ATK]: {
    primaryColor: '#FF2222',
    secondaryColor: '#FF8888',
    particleCount: 14,
    gradientTop: '#1A0000',
    gradientBottom: '#440011',
  },
  [PowerEffectType.DEBUFF_ATK]: {
    primaryColor: '#AA44FF',
    secondaryColor: '#6600CC',
    particleCount: 12,
    gradientTop: '#0A001A',
    gradientBottom: '#220044',
  },
  [PowerEffectType.MANA_BOOST]: {
    primaryColor: '#00CCFF',
    secondaryColor: '#0066FF',
    particleCount: 10,
    gradientTop: '#001A1A',
    gradientBottom: '#004444',
  },
};

// ─── Phase Durations (seconds) ────────────────────────────────────────────────

const SPOTLIGHT_DURATION = 0.4;
const CINEMATIC_DURATION = 1.2;
const RETURN_DURATION = 0.35;
/** Minimum length of ApplyEffect — gives the projectile time to leave the
 *  caster even if the resolve predicate settles immediately. */
const APPLY_EFFECT_MIN_DURATION = 0.3;
/** Hard cap so a stuck particle/popup can't keep input locked forever. */
const APPLY_EFFECT_MAX_DURATION = 2.0;

// ─── Animation State ──────────────────────────────────────────────────────────

export interface CinematicState {
  phase: CinematicPhase;
  /** Snapshot of the casting hero — texture, position, name. */
  caster: CinematicCasterBinding;
  effectType: PowerEffectType;
  elapsed: number;
  phaseProgress: number; // 0-1 within current phase
  vfxConfig: PowerVfxConfig;
  // Spotlight
  overlayAlpha: number;
  casterScale: number;
  glowIntensity: number;
  // Cinematic
  cinematicAlpha: number;
  heroSpriteScale: number;
  vfxTime: number; // accumulated for procedural VFX
  // Return
  returnProgress: number;
}

// ─── System Class ─────────────────────────────────────────────────────────────

export class PowerAnimationSystem {
  private state: CinematicState;
  private onApplyEffect: ((heroIndex: number) => void) | null = null;
  private onComplete: (() => void) | null = null;
  /** Caller-provided predicate: ApplyEffect phase ends when this returns true
   *  (and at least APPLY_EFFECT_MIN_DURATION has elapsed). Lets us wait for
   *  in-zone particles + damage popups to finish before unlocking input. */
  private isResolveSettled: (() => boolean) | null = null;
  /** Whether onApplyEffect has been fired this cast. Guarded so it only
   *  triggers once at the start of the ApplyEffect phase. */
  private applyEffectFired: boolean = false;

  constructor() {
    this.state = this.createIdleState();
  }

  get isActive(): boolean {
    return this.state.phase !== CinematicPhase.Idle;
  }

  /** True only while the fullscreen hero cast is on screen. The board UI
   *  (sprites, HP bars, popups, mana strip) should be hidden during this
   *  window and visible during Spotlight / ReturnToNormal / ApplyEffect. */
  get isFullscreenActive(): boolean {
    return this.state.phase === CinematicPhase.Cinematic;
  }

  get currentState(): Readonly<CinematicState> {
    return this.state;
  }

  get phase(): CinematicPhase {
    return this.state.phase;
  }

  /**
   * Start a power cinematic. Pass a `CinematicCasterBinding` so the renderer
   * can draw the actual casting hero — heroIndex alone is ambiguous because
   * the roster is randomly picked from a larger pool, so slot 0 is not always
   * the same hero.
   *
   * @param isResolveSettled Optional predicate. When provided, the ApplyEffect
   *   phase waits for it to return true (after a min-duration grace window)
   *   before transitioning to Idle. Use it to gate on `powerEffectParticles.isActive`
   *   plus `damagePopups.hasActive()` so the player sees the effect resolve fully.
   */
  start(
    caster: CinematicCasterBinding,
    effectType: PowerEffectType,
    onApplyEffect: (heroIndex: number) => void,
    onComplete: () => void,
    isResolveSettled?: () => boolean,
  ): void {
    if (this.isActive) {
      return;
    }
    this.onApplyEffect = onApplyEffect;
    this.onComplete = onComplete;
    this.isResolveSettled = isResolveSettled ?? null;
    this.applyEffectFired = false;

    const vfxConfig = POWER_VFX_CONFIGS[effectType] ?? POWER_VFX_CONFIGS[PowerEffectType.DAMAGE_DIRECT];

    this.state = {
      phase: CinematicPhase.Spotlight,
      caster,
      effectType,
      elapsed: 0,
      phaseProgress: 0,
      vfxConfig,
      overlayAlpha: 0,
      casterScale: 1.0,
      glowIntensity: 0,
      cinematicAlpha: 0,
      heroSpriteScale: 0,
      vfxTime: 0,
      returnProgress: 0,
    };
  }

  /** Update per frame. dt in seconds. */
  update(dt: number): void {
    if (this.state.phase === CinematicPhase.Idle) return;

    this.state.elapsed += dt;

    switch (this.state.phase) {
      case CinematicPhase.Spotlight:
        this.updateSpotlight(dt);
        break;
      case CinematicPhase.Cinematic:
        this.updateCinematic(dt);
        break;
      case CinematicPhase.ReturnToNormal:
        this.updateReturn(dt);
        break;
      case CinematicPhase.ApplyEffect:
        this.updateApplyEffect(dt);
        break;
    }
  }

  /** Force reset to idle (e.g., on game reset). */
  reset(): void {
    this.state = this.createIdleState();
    this.onApplyEffect = null;
    this.onComplete = null;
    this.isResolveSettled = null;
    this.applyEffectFired = false;
  }

  // ─── Phase Updates ────────────────────────────────────────────────────────

  private updateSpotlight(_dt: number): void {
    const progress = Math.min(this.state.elapsed / SPOTLIGHT_DURATION, 1.0);
    this.state.phaseProgress = progress;

    // Ease in overlay darken
    this.state.overlayAlpha = easeOutQuad(progress) * 0.6;
    // Scale caster up
    this.state.casterScale = 1.0 + easeOutQuad(progress) * 0.2;
    // Glow
    this.state.glowIntensity = easeOutQuad(progress);

    if (progress >= 1.0) {
      this.transitionTo(CinematicPhase.Cinematic);
    }
  }

  private updateCinematic(dt: number): void {
    const progress = Math.min(this.state.elapsed / CINEMATIC_DURATION, 1.0);
    this.state.phaseProgress = progress;
    this.state.vfxTime += dt;

    // Fade in cinematic overlay
    if (progress < 0.15) {
      this.state.cinematicAlpha = progress / 0.15;
    } else if (progress > 0.85) {
      this.state.cinematicAlpha = (1.0 - progress) / 0.15;
    } else {
      this.state.cinematicAlpha = 1.0;
    }

    // Hero sprite scale punch-in then settle
    if (progress < 0.2) {
      this.state.heroSpriteScale = easeOutBack(progress / 0.2);
    } else {
      this.state.heroSpriteScale = 1.0;
    }

    if (progress >= 1.0) {
      this.transitionTo(CinematicPhase.ReturnToNormal);
    }
  }

  private updateReturn(_dt: number): void {
    const progress = Math.min(this.state.elapsed / RETURN_DURATION, 1.0);
    this.state.phaseProgress = progress;
    this.state.returnProgress = progress;

    // Fade out overlay so the board cross-fades back in
    this.state.overlayAlpha = 0.6 * (1.0 - easeInQuad(progress));
    this.state.casterScale = 1.0 + 0.2 * (1.0 - easeInQuad(progress));
    this.state.glowIntensity = 1.0 - easeInQuad(progress);
    this.state.cinematicAlpha = 0;

    if (progress >= 1.0) {
      // Hand off to the visible-board resolution phase. ApplyEffect now plays
      // *on top of the normal game view*: the player sees the projectile
      // travel hero→enemy, damage popups, hurt flashes.
      this.transitionTo(CinematicPhase.ApplyEffect);
    }
  }

  private updateApplyEffect(_dt: number): void {
    // Fire the gameplay callback once at the start of the phase, so particles
    // + popups + lunge spawn while the board is fully visible.
    if (!this.applyEffectFired) {
      this.applyEffectFired = true;
      if (this.onApplyEffect) {
        this.onApplyEffect(this.state.caster.heroIndex);
      }
    }

    // Phase length is dynamic: wait for in-zone particles + popups to settle
    // (via the caller's predicate), but never less than the min nor more
    // than the max — so a stuck particle can't deadlock input.
    const elapsed = this.state.elapsed;
    this.state.phaseProgress = Math.min(elapsed / APPLY_EFFECT_MIN_DURATION, 1.0);

    const settled = this.isResolveSettled ? this.isResolveSettled() : true;
    const minReached = elapsed >= APPLY_EFFECT_MIN_DURATION;
    const maxReached = elapsed >= APPLY_EFFECT_MAX_DURATION;

    if ((minReached && settled) || maxReached) {
      // Clear callbacks BEFORE firing onComplete so that if onComplete calls
      // start() to chain a new cinematic, the newly registered callbacks are
      // not immediately nulled out by the lines below.
      this.state = this.createIdleState();
      const onComplete = this.onComplete;
      this.onApplyEffect = null;
      this.onComplete = null;
      this.isResolveSettled = null;
      if (onComplete) {
        onComplete();
      }
    }
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  private transitionTo(phase: CinematicPhase): void {
    this.state.phase = phase;
    this.state.elapsed = 0;
    this.state.phaseProgress = 0;
  }

  private createIdleState(): CinematicState {
    return {
      phase: CinematicPhase.Idle,
      // Placeholder caster binding — never read because the renderer
      // short-circuits when phase === Idle.
      caster: {
        heroIndex: -1,
        texture: heroWarriorTexture,
        name: '',
        powerName: '',
        spotlightX: 0,
        spotlightY: 0,
      },
      effectType: PowerEffectType.DAMAGE_DIRECT,
      elapsed: 0,
      phaseProgress: 0,
      vfxConfig: POWER_VFX_CONFIGS[PowerEffectType.DAMAGE_DIRECT],
      overlayAlpha: 0,
      casterScale: 1.0,
      glowIntensity: 0,
      cinematicAlpha: 0,
      heroSpriteScale: 0,
      vfxTime: 0,
      returnProgress: 0,
    };
  }
}

// ─── Easing Functions ─────────────────────────────────────────────────────────

function easeOutQuad(t: number): number {
  return t * (2 - t);
}

function easeInQuad(t: number): number {
  return t * t;
}

function easeOutBack(t: number): number {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}
