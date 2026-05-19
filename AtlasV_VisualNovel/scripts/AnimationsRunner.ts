/**
 * AnimationsRunner — All cosmetic, non-gameplay animations.
 *
 * Owns timers and per-frame state for: fade transitions (title→idle,
 * day/night), intro cinematic, character ripples, float idle ripples,
 * portrait shake/bounce, floating emotion icons, action button container
 * appear/disappear/responding, idle bar appear/disappear/responding,
 * epitaph fade + typewriter.
 *
 * Writes directly to floaterVM since these animations exist to drive the UI.
 * Reads no gameplay state — phase-aware decisions (e.g. when to begin a fade)
 * are made by the orchestrator, which calls the explicit start methods here.
 *
 * The two side effects that aren't pure animation (`#unlock-cg` save flush at
 * intro end, advancing the cast index at ending-tap completion) are exposed
 * as callbacks passed in at construction.
 */

import {
  FISH_PORTRAIT_X, FISH_PORTRAIT_Y, FISH_PORTRAIT_SIZE,
  EMOTION_ICON_DURATION, EMOTION_ICON_FADE_TIME, EMOTION_ICON_SPACING,
  EMOTION_ICON_Y_OFFSET, EMOTION_ICON_BOUNCE_TIME, FLOAT_SURPRISE_EMOJI_DURATION,
  CHAR_RIPPLE_SPAWN_INTERVAL, CHAR_RIPPLE_MAX_RADIUS, CHAR_RIPPLE_EXPAND_SPEED,
  FLOAT_IDLE_RIPPLE_INTERVAL, FLOAT_IDLE_RIPPLE_MAX_RADIUS, FLOAT_IDLE_RIPPLE_EXPAND_SPEED,
  CANVAS_WIDTH,
  FADE_OUT_DURATION, FADE_IN_DURATION,
  ActionId,
} from './Constants';
import { GamePhase, EmotionIconType } from './Types';
import type { SplashRipple, FloatingEmotionIcon, EmotionIconAnchor } from './Types';
import { floaterVM } from './FloaterViewModel';
import type { FloaterSharedState } from './FloaterSharedState';

/** Callbacks the runner needs to invoke when an animation reaches a milestone
 *  that requires gameplay-side bookkeeping. The orchestrator wires these. */
export interface AnimationHooks {
  /** Fade-to-black finished — orchestrator decides whether to start intro or
   *  go straight to LakeIdle. */
  onFadeToBlackComplete: () => void;
  /** Intro fade finished — orchestrator persists `run.intro_seen` and enters
   *  LakeIdle. */
  onIntroComplete: () => void;
  /** Day/Night fade-to-black reached its mid-point — orchestrator toggles
   *  state.isDayMode here. */
  onDayNightSwap: () => void;
}

export class AnimationsRunner {
  // === Fish portrait alpha (lifecycle owned by orchestrator's approach/departure
  //     transitions; we just store the value for the presenter to read) ===
  fishAlpha: number = 0;

  // === Title→idle fade ===
  fadeState: 'none' | 'fading_out' | 'fading_in' = 'none';
  fadeAlpha: number = 0;
  private fadeTimer: number = 0;

  // === Day/Night fade ===
  dayNightFadeState: 'none' | 'fading_out' | 'fading_in' = 'none';
  dayNightFadeAlpha: number = 0;
  private dayNightFadeTimer: number = 0;
  private static readonly DAY_NIGHT_FADE_DURATION: number = 0.25;

  // === Intro cinematic ===
  introActive: boolean = false;
  private introTextProgress: number = 0;
  private introHoldTimer: number = 0;
  private introFadeTimer: number = 0;
  private introState: 'typing' | 'hold' | 'fading' = 'typing';
  private readonly introFullText: string =
    'A pond, still under the moon.\n' +
    'The water holds its breath.\n\n' +
    'They say the fish here are different — they come close, and they speak.\n' +
    'All you need is patience… and the right lure.';
  private static readonly INTRO_CHAR_SPEED: number = 0.035;
  private static readonly INTRO_HOLD_DURATION: number = 1.8;
  private static readonly INTRO_FADE_DURATION: number = 1.0;

  // === Character ripples ===
  characterRipples: SplashRipple[] = [];
  private charRippleSpawnTimer: number = 0;

  // === Float idle ripples ===
  floatIdleRipples: SplashRipple[] = [];
  private floatIdleRippleTimer: number = 0;

  // === Portrait animation (shake/bounce) ===
  private portraitAnimType: 'none' | 'shake' | 'bounce' = 'none';
  private portraitAnimTimer: number = 0;
  private portraitAnimDuration: number = 0;
  portraitOffsetX: number = 0;
  portraitOffsetY: number = 0;

  // === Floating emotion icons ===
  floatingIcons: FloatingEmotionIcon[] = [];

  // === Action button container animation ===
  actionMenuAnimState: 'hidden' | 'appearing' | 'visible' | 'responding' | 'disappearing' = 'hidden';
  private actionMenuAnimTimer: number = 0;
  private selectedActionId: ActionId | null = null;
  private static readonly ACTION_APPEAR_DURATION: number = 0.25;
  private static readonly ACTION_DISAPPEAR_DURATION: number = 0.2;

  // === Idle button bar animation ===
  idleBarAnimState: 'hidden' | 'appearing' | 'visible' | 'responding' | 'disappearing' = 'hidden';
  private idleBarAnimTimer: number = 0;
  private selectedIdleBtn: 'bait' | 'cast' | 'journal' | null = null;
  private static readonly IDLE_BAR_APPEAR_DURATION: number = 0.25;
  private static readonly IDLE_BAR_DISAPPEAR_DURATION: number = 0.2;

  // === Epitaph (ending overlay) ===
  epitaphFadeTimer: number = 0;
  epitaphFullText: string = '';
  private epitaphTextProgress: number = 0;
  epitaphTextComplete: boolean = false;
  pendingEndingCG: boolean = false;
  static readonly EPITAPH_FADE_DURATION: number = 1.0;
  private static readonly EPITAPH_TEXT_SPEED: number = 0.03;

  // === Progress dots (rendered values, set by presenter via setProgressDots) ===
  progressDotsTotal: number = 0;
  progressDotsFilled: number = 0;

  constructor(
    private readonly state: FloaterSharedState,
    private readonly hooks: AnimationHooks,
  ) {}

  // === Public API: per-frame updates ===

  /** Title→idle fade. Crossing fade-out completion fires onFadeToBlackComplete. */
  updateFadeTransition(dt: number): void {
    if (this.fadeState === 'none') return;

    this.fadeTimer += dt;

    if (this.fadeState === 'fading_out') {
      this.fadeAlpha = Math.min(1, this.fadeTimer / FADE_OUT_DURATION);
      if (this.fadeAlpha >= 1) {
        this.fadeAlpha = 1;
        this.fadeState = 'fading_in';
        this.fadeTimer = 0;
        floaterVM.titleVisible = false;
        this.hooks.onFadeToBlackComplete();
      }
    } else if (this.fadeState === 'fading_in') {
      this.fadeAlpha = Math.max(0, 1 - this.fadeTimer / FADE_IN_DURATION);
      if (this.fadeAlpha <= 0) {
        this.fadeAlpha = 0;
        this.fadeState = 'none';
      }
    }
  }

  /** Day/Night background swap. Crossing fade-to-black mid-point fires
   *  onDayNightSwap (orchestrator flips state.isDayMode + VM accordingly). */
  updateDayNightFade(dt: number): void {
    if (this.dayNightFadeState === 'none') return;
    this.dayNightFadeTimer += dt;

    if (this.dayNightFadeState === 'fading_out') {
      this.dayNightFadeAlpha = Math.min(1, this.dayNightFadeTimer / AnimationsRunner.DAY_NIGHT_FADE_DURATION);
      if (this.dayNightFadeAlpha >= 1) {
        this.dayNightFadeAlpha = 1;
        this.dayNightFadeState = 'fading_in';
        this.dayNightFadeTimer = 0;
        this.hooks.onDayNightSwap();
      }
    } else if (this.dayNightFadeState === 'fading_in') {
      this.dayNightFadeAlpha = Math.max(0, 1 - this.dayNightFadeTimer / AnimationsRunner.DAY_NIGHT_FADE_DURATION);
      if (this.dayNightFadeAlpha <= 0) {
        this.dayNightFadeAlpha = 0;
        this.dayNightFadeState = 'none';
      }
    }
  }

  /** Intro cinematic update. Fires onIntroComplete at fade end. */
  updateIntro(dt: number): void {
    if (!this.introActive) return;
    if (this.introState === 'typing') {
      this.introTextProgress += dt;
      const charsRevealed = Math.floor(this.introTextProgress / AnimationsRunner.INTRO_CHAR_SPEED);
      if (charsRevealed >= this.introFullText.length) {
        floaterVM.introText = this.introFullText;
        this.introState = 'hold';
        this.introHoldTimer = 0;
      } else {
        floaterVM.introText = this.introFullText.substring(0, charsRevealed);
      }
    } else if (this.introState === 'hold') {
      this.introHoldTimer += dt;
      if (this.introHoldTimer >= AnimationsRunner.INTRO_HOLD_DURATION) {
        this.introState = 'fading';
        this.introFadeTimer = 0;
      }
    } else if (this.introState === 'fading') {
      this.introFadeTimer += dt;
      const t = Math.min(1, this.introFadeTimer / AnimationsRunner.INTRO_FADE_DURATION);
      floaterVM.introOverlayOpacity = 1 - t;
      if (t >= 1) {
        floaterVM.introVisible = false;
        floaterVM.introOverlayOpacity = 1;
        this.introActive = false;
        this.hooks.onIntroComplete();
      }
    }
  }

  /** Character portrait ripples — gated on fishAlpha by caller (we just check
   *  the field). Ripples spawned around the portrait while it's visible. */
  updateCharacterRipples(dt: number): void {
    if (this.fishAlpha <= 0) {
      this.characterRipples = [];
      this.charRippleSpawnTimer = 0;
      return;
    }

    this.charRippleSpawnTimer += dt;
    if (this.charRippleSpawnTimer >= CHAR_RIPPLE_SPAWN_INTERVAL) {
      this.charRippleSpawnTimer -= CHAR_RIPPLE_SPAWN_INTERVAL;
      const centerX = FISH_PORTRAIT_X + this.portraitOffsetX + FISH_PORTRAIT_SIZE / 2;
      const rippleY = FISH_PORTRAIT_Y + this.portraitOffsetY + FISH_PORTRAIT_SIZE * 0.5;
      this.characterRipples.push({ x: centerX, y: rippleY, radius: 0, maxRadius: CHAR_RIPPLE_MAX_RADIUS, alpha: 1 });
    }

    for (let i = this.characterRipples.length - 1; i >= 0; i--) {
      const ripple = this.characterRipples[i];
      ripple.radius += CHAR_RIPPLE_EXPAND_SPEED * dt;
      ripple.alpha = Math.max(0, 1 - ripple.radius / ripple.maxRadius);
      if (ripple.alpha <= 0) {
        this.characterRipples.splice(i, 1);
      }
    }
  }

  /** Float idle ripples — phase-aware (only when float is stationary). */
  updateFloatIdleRipples(dt: number, floatX: number, floatY: number): void {
    const phase = this.state.phase;
    const showStaticFloat = phase === GamePhase.Title
      || phase === GamePhase.FloatBounce
      || phase === GamePhase.Approach
      || phase === GamePhase.Exchange
      || phase === GamePhase.ActionSelect
      || phase === GamePhase.FishReaction
      || phase === GamePhase.Departure
      || phase === GamePhase.NothingBites;

    if (!showStaticFloat) {
      this.floatIdleRipples = [];
      this.floatIdleRippleTimer = 0;
      return;
    }

    const rippleX = phase === GamePhase.Title ? CANVAS_WIDTH / 2 : floatX;
    const rippleY = phase === GamePhase.Title ? 570 : floatY;

    this.floatIdleRippleTimer += dt;
    if (this.floatIdleRippleTimer >= FLOAT_IDLE_RIPPLE_INTERVAL) {
      this.floatIdleRippleTimer -= FLOAT_IDLE_RIPPLE_INTERVAL;
      this.floatIdleRipples.push({
        x: rippleX,
        y: rippleY + 12,
        radius: 0,
        maxRadius: FLOAT_IDLE_RIPPLE_MAX_RADIUS,
        alpha: 1,
      });
    }

    for (let i = this.floatIdleRipples.length - 1; i >= 0; i--) {
      const ripple = this.floatIdleRipples[i];
      ripple.radius += FLOAT_IDLE_RIPPLE_EXPAND_SPEED * dt;
      ripple.alpha = Math.max(0, 1 - ripple.radius / ripple.maxRadius);
      if (ripple.alpha <= 0) {
        this.floatIdleRipples.splice(i, 1);
      }
    }
  }

  /** Portrait shake/bounce decay envelope. */
  updatePortraitAnimation(dt: number): void {
    if (this.portraitAnimType === 'none') return;

    this.portraitAnimTimer += dt;
    const progress = Math.min(1, this.portraitAnimTimer / this.portraitAnimDuration);

    if (progress >= 1) {
      this.portraitAnimType = 'none';
      this.portraitOffsetX = 0;
      this.portraitOffsetY = 0;
      return;
    }

    const decay = 1 - progress;

    if (this.portraitAnimType === 'shake') {
      const frequency = 30;
      const amplitude = 4 * decay;
      this.portraitOffsetX = Math.sin(this.portraitAnimTimer * frequency) * amplitude;
      this.portraitOffsetY = 0;
    } else if (this.portraitAnimType === 'bounce') {
      const frequency = 12;
      const amplitude = 5 * decay;
      this.portraitOffsetY = -Math.abs(Math.sin(this.portraitAnimTimer * frequency)) * amplitude;
      this.portraitOffsetX = 0;
    }
  }

  /** Floating emotion icons (per-frame scale/fade/upward float). */
  updateEmotionIcons(dt: number): void {
    for (let i = this.floatingIcons.length - 1; i >= 0; i--) {
      const icon = this.floatingIcons[i];
      icon.timer -= dt;

      const elapsed = icon.maxDuration - icon.timer;
      if (elapsed < EMOTION_ICON_BOUNCE_TIME) {
        const t = elapsed / EMOTION_ICON_BOUNCE_TIME;
        if (t < 0.25) {
          icon.scale = (t / 0.25) * 1.3;
        } else if (t < 0.5) {
          icon.scale = 1.3 - ((t - 0.25) / 0.25) * 0.35;
        } else if (t < 0.75) {
          icon.scale = 0.95 + ((t - 0.5) / 0.25) * 0.1;
        } else {
          icon.scale = 1.05 - ((t - 0.75) / 0.25) * 0.05;
        }
      } else {
        icon.scale = 1.0;
      }

      if (icon.timer < EMOTION_ICON_FADE_TIME) {
        const fadeT = 1 - (icon.timer / EMOTION_ICON_FADE_TIME);
        icon.alpha = 1 - fadeT;
        icon.scale *= (1 - fadeT * 0.6);
        icon.y -= dt * 30;
      }

      if (icon.timer <= 0) {
        this.floatingIcons.splice(i, 1);
      }
    }
  }

  /** Action menu container appear/disappear animation. */
  updateActionButtonAnimation(dt: number): void {
    if (this.actionMenuAnimState === 'hidden') return;
    this.actionMenuAnimTimer += dt;

    switch (this.actionMenuAnimState) {
      case 'appearing': {
        const t = Math.min(1, this.actionMenuAnimTimer / AnimationsRunner.ACTION_APPEAR_DURATION);
        const eased = 1 - Math.pow(1 - t, 3);
        floaterVM.actionMenuOpacity = eased;
        floaterVM.actionMenuTranslateY = 40 * (1 - eased);
        if (t >= 1) {
          this.actionMenuAnimState = 'visible';
          floaterVM.actionMenuOpacity = 1;
          floaterVM.actionMenuTranslateY = 0;
        }
        break;
      }
      case 'disappearing': {
        const t = Math.min(1, this.actionMenuAnimTimer / AnimationsRunner.ACTION_DISAPPEAR_DURATION);
        const eased = t * t;
        floaterVM.actionMenuOpacity = 1 - eased;
        floaterVM.actionMenuTranslateY = 40 * eased;
        if (t >= 1) {
          this.actionMenuAnimState = 'hidden';
          floaterVM.actionMenuVisible = false;
          floaterVM.actionMenuOpacity = 0;
          floaterVM.actionMenuTranslateY = 40;
        }
        break;
      }
      case 'visible':
      case 'responding':
        break;
    }
  }

  /** Idle bar container appear/disappear animation. */
  updateIdleBarAnimation(dt: number): void {
    if (this.idleBarAnimState === 'hidden') return;
    this.idleBarAnimTimer += dt;

    switch (this.idleBarAnimState) {
      case 'appearing': {
        const t = Math.min(1, this.idleBarAnimTimer / AnimationsRunner.IDLE_BAR_APPEAR_DURATION);
        const eased = 1 - Math.pow(1 - t, 3);
        floaterVM.idleBarOpacity = eased;
        floaterVM.idleBarTranslateY = 40 * (1 - eased);
        if (t >= 1) {
          this.idleBarAnimState = 'visible';
          floaterVM.idleBarOpacity = 1;
          floaterVM.idleBarTranslateY = 0;
        }
        break;
      }
      case 'disappearing': {
        const t = Math.min(1, this.idleBarAnimTimer / AnimationsRunner.IDLE_BAR_DISAPPEAR_DURATION);
        const eased = t * t;
        floaterVM.idleBarOpacity = 1 - eased;
        floaterVM.idleBarTranslateY = 40 * eased;
        if (t >= 1) {
          this.idleBarAnimState = 'hidden';
          floaterVM.idleBarVisible = false;
          floaterVM.idleBarOpacity = 0;
          floaterVM.idleBarTranslateY = 40;
        }
        break;
      }
      case 'visible':
      case 'responding':
        break;
    }
  }

  /** Epitaph overlay fade-in + typewriter for the ending screen. */
  updateEpitaphAnimation(dt: number): void {
    this.epitaphFadeTimer += dt;
    const fadeProgress = Math.min(1, this.epitaphFadeTimer / AnimationsRunner.EPITAPH_FADE_DURATION);
    floaterVM.endingOverlayOpacity = fadeProgress;

    if (fadeProgress >= 0.3 && !this.epitaphTextComplete) {
      this.epitaphTextProgress += dt;
      const charsToShow = Math.floor(this.epitaphTextProgress / AnimationsRunner.EPITAPH_TEXT_SPEED);
      if (charsToShow >= this.epitaphFullText.length) {
        floaterVM.endingText = this.epitaphFullText;
        this.epitaphTextComplete = true;
        floaterVM.endingTapVisible = true;
      } else {
        floaterVM.endingText = this.epitaphFullText.substring(0, charsToShow);
      }
    }
  }

  // === Public API: animation triggers (called by orchestrator/controllers) ===

  /** Title's Start button pressed — begin the fade-to-black. */
  beginTitleFadeOut(): void {
    this.fadeState = 'fading_out';
    this.fadeTimer = 0;
    this.fadeAlpha = 0;
  }

  /** Day/Night toggle — begin the swap fade. */
  beginDayNightFade(): void {
    if (this.dayNightFadeState !== 'none') return;
    this.dayNightFadeState = 'fading_out';
    this.dayNightFadeTimer = 0;
    this.dayNightFadeAlpha = 0;
  }

  /** Begin the intro cinematic. Caller hides the title VM separately. */
  beginIntro(): void {
    this.introActive = true;
    this.introState = 'typing';
    this.introTextProgress = 0;
    this.introHoldTimer = 0;
    this.introFadeTimer = 0;
    floaterVM.titleVisible = false;
    floaterVM.introVisible = true;
    floaterVM.introOverlayOpacity = 1;
    floaterVM.introText = '';
    floaterVM.introTapVisible = false;
    this.fadeState = 'none';
    this.fadeAlpha = 0;
  }

  /** Player tapped during the intro — advance one stage. */
  advanceIntro(): void {
    if (this.introState === 'typing') {
      floaterVM.introText = this.introFullText;
      this.introState = 'hold';
      this.introHoldTimer = 0;
    } else if (this.introState === 'hold') {
      this.introState = 'fading';
      this.introFadeTimer = 0;
    }
  }

  /** Portrait shake or bounce. */
  triggerPortraitAnimation(type: 'shake' | 'bounce', duration: number): void {
    this.portraitAnimType = type;
    this.portraitAnimTimer = 0;
    this.portraitAnimDuration = duration;
    this.portraitOffsetX = 0;
    this.portraitOffsetY = 0;
  }

  /** Stop any portrait animation and zero its offsets. */
  clearPortraitAnimation(): void {
    this.portraitAnimType = 'none';
    this.portraitOffsetX = 0;
    this.portraitOffsetY = 0;
  }

  /** Spawn an emotion icon over the portrait or float. */
  spawnEmotionIcon(
    type: EmotionIconType,
    anchor: EmotionIconAnchor = 'portrait',
    landingTargetX: number = 0,
    landingTargetY: number = 0,
  ): void {
    if (type === EmotionIconType.None) return;

    let baseX: number;
    let baseY: number;

    if (anchor === 'float') {
      baseX = landingTargetX;
      baseY = landingTargetY + EMOTION_ICON_Y_OFFSET - 35;
    } else {
      baseX = FISH_PORTRAIT_X + FISH_PORTRAIT_SIZE / 2;
      baseY = FISH_PORTRAIT_Y + EMOTION_ICON_Y_OFFSET;
    }

    const portraitIcons = this.floatingIcons.filter(i => i.anchor === 'portrait');
    const offsetX = anchor === 'portrait' ? portraitIcons.length * EMOTION_ICON_SPACING : 0;

    const duration = anchor === 'float' ? FLOAT_SURPRISE_EMOJI_DURATION : EMOTION_ICON_DURATION;
    this.floatingIcons.push({
      type,
      x: anchor === 'portrait' ? baseX + offsetX - (portraitIcons.length * EMOTION_ICON_SPACING / 2) : baseX,
      y: baseY,
      scale: 0,
      alpha: 1,
      timer: duration,
      maxDuration: duration,
      anchor,
    });

    switch (type) {
      case EmotionIconType.Surprise:
      case EmotionIconType.Delight:
      case EmotionIconType.Curiosity:
        this.triggerPortraitAnimation('bounce', 0.35);
        break;
      case EmotionIconType.Shock:
      case EmotionIconType.Sadness:
        this.triggerPortraitAnimation('shake', 0.4);
        break;
      default:
        break;
    }
  }

  // === Action button container API ===

  showActionButtons(): void {
    if (this.actionMenuAnimState === 'responding' || this.actionMenuAnimState === 'visible') {
      this.actionMenuAnimState = 'visible';
      this.selectedActionId = null;
      floaterVM.actionMenuOpacity = 1;
      floaterVM.actionMenuTranslateY = 0;
      floaterVM.actionWaitBtnOpacity = 1;
      floaterVM.actionTwitchBtnOpacity = 1;
      floaterVM.actionDriftBtnOpacity = 1;
      floaterVM.actionReelBtnOpacity = 1;
      floaterVM.actionWaitBtnScale = 1;
      floaterVM.actionTwitchBtnScale = 1;
      floaterVM.actionDriftBtnScale = 1;
      floaterVM.actionReelBtnScale = 1;
      floaterVM.actionWaitBtnTranslateY = 0;
      floaterVM.actionTwitchBtnTranslateY = 0;
      floaterVM.actionDriftBtnTranslateY = 0;
      floaterVM.actionReelBtnTranslateY = 0;
      return;
    }
    this.actionMenuAnimState = 'appearing';
    this.actionMenuAnimTimer = 0;
    this.selectedActionId = null;
    floaterVM.actionMenuVisible = true;
    floaterVM.actionMenuOpacity = 0;
    floaterVM.actionMenuTranslateY = 40;
    floaterVM.actionWaitBtnOpacity = 1;
    floaterVM.actionTwitchBtnOpacity = 1;
    floaterVM.actionDriftBtnOpacity = 1;
    floaterVM.actionReelBtnOpacity = 1;
    floaterVM.actionWaitBtnScale = 1;
    floaterVM.actionTwitchBtnScale = 1;
    floaterVM.actionDriftBtnScale = 1;
    floaterVM.actionReelBtnScale = 1;
    floaterVM.actionWaitBtnTranslateY = 0;
    floaterVM.actionTwitchBtnTranslateY = 0;
    floaterVM.actionDriftBtnTranslateY = 0;
    floaterVM.actionReelBtnTranslateY = 0;
  }

  setActionButtonsResponding(selectedId: ActionId): void {
    this.actionMenuAnimState = 'responding';
    this.selectedActionId = selectedId;
    const buttons: Array<{
      id: ActionId;
      opacityProp: 'actionWaitBtnOpacity' | 'actionTwitchBtnOpacity' | 'actionDriftBtnOpacity' | 'actionReelBtnOpacity';
      translateYProp: 'actionWaitBtnTranslateY' | 'actionTwitchBtnTranslateY' | 'actionDriftBtnTranslateY' | 'actionReelBtnTranslateY';
    }> = [
      { id: ActionId.Wait, opacityProp: 'actionWaitBtnOpacity', translateYProp: 'actionWaitBtnTranslateY' },
      { id: ActionId.Twitch, opacityProp: 'actionTwitchBtnOpacity', translateYProp: 'actionTwitchBtnTranslateY' },
      { id: ActionId.Drift, opacityProp: 'actionDriftBtnOpacity', translateYProp: 'actionDriftBtnTranslateY' },
      { id: ActionId.Reel, opacityProp: 'actionReelBtnOpacity', translateYProp: 'actionReelBtnTranslateY' },
    ];
    for (const btn of buttons) {
      if (btn.id === selectedId) {
        floaterVM[btn.opacityProp] = 1;
        floaterVM[btn.translateYProp] = -8;
      } else {
        floaterVM[btn.opacityProp] = 0.5;
        floaterVM[btn.translateYProp] = 3;
      }
    }
    floaterVM.actionWaitEnabled = false;
    floaterVM.actionTwitchEnabled = false;
    floaterVM.actionDriftEnabled = false;
    floaterVM.actionReelEnabled = false;
  }

  hideActionButtons(): void {
    if (this.actionMenuAnimState === 'hidden') return;
    this.actionMenuAnimState = 'disappearing';
    this.actionMenuAnimTimer = 0;
    this.selectedActionId = null;
  }

  // === Idle bar API ===

  showIdleBar(): void {
    if (this.idleBarAnimState === 'visible' || this.idleBarAnimState === 'responding') {
      this.idleBarAnimState = 'visible';
      this.selectedIdleBtn = null;
      floaterVM.idleBarOpacity = 1;
      floaterVM.idleBarTranslateY = 0;
      floaterVM.idleBaitBtnOpacity = 1;
      floaterVM.idleBaitBtnTranslateY = 0;
      floaterVM.idleCastBtnOpacity = 1;
      floaterVM.idleCastBtnTranslateY = 0;
      floaterVM.idleJournalBtnOpacity = 1;
      floaterVM.idleJournalBtnTranslateY = 0;
      return;
    }
    this.idleBarAnimState = 'appearing';
    this.idleBarAnimTimer = 0;
    this.selectedIdleBtn = null;
    floaterVM.idleBarVisible = true;
    floaterVM.idleBarOpacity = 0;
    floaterVM.idleBarTranslateY = 40;
    floaterVM.idleBaitBtnOpacity = 1;
    floaterVM.idleBaitBtnTranslateY = 0;
    floaterVM.idleCastBtnOpacity = 1;
    floaterVM.idleCastBtnTranslateY = 0;
    floaterVM.idleJournalBtnOpacity = 1;
    floaterVM.idleJournalBtnTranslateY = 0;
  }

  hideIdleBar(): void {
    if (this.idleBarAnimState === 'hidden') return;
    this.idleBarAnimState = 'disappearing';
    this.idleBarAnimTimer = 0;
    this.selectedIdleBtn = null;
  }

  setIdleBarResponding(btn: 'bait' | 'cast' | 'journal'): void {
    this.idleBarAnimState = 'responding';
    this.selectedIdleBtn = btn;
    const btns: Array<{
      id: string;
      opProp: 'idleBaitBtnOpacity' | 'idleCastBtnOpacity' | 'idleJournalBtnOpacity';
      tyProp: 'idleBaitBtnTranslateY' | 'idleCastBtnTranslateY' | 'idleJournalBtnTranslateY';
    }> = [
      { id: 'bait', opProp: 'idleBaitBtnOpacity', tyProp: 'idleBaitBtnTranslateY' },
      { id: 'cast', opProp: 'idleCastBtnOpacity', tyProp: 'idleCastBtnTranslateY' },
      { id: 'journal', opProp: 'idleJournalBtnOpacity', tyProp: 'idleJournalBtnTranslateY' },
    ];
    for (const b of btns) {
      if (b.id === btn) {
        floaterVM[b.opProp] = 1;
        floaterVM[b.tyProp] = -8;
      } else {
        floaterVM[b.opProp] = 0.5;
        floaterVM[b.tyProp] = 0;
      }
    }
  }

  // === Epitaph API ===

  beginEpitaph(text: string): void {
    this.epitaphFullText = text;
    this.epitaphFadeTimer = 0;
    this.epitaphTextProgress = 0;
    this.epitaphTextComplete = false;
    floaterVM.endingText = '';
    floaterVM.endingOverlayOpacity = 0;
    floaterVM.endingTapVisible = false;
  }

  /** Player tap completes epitaph text instantly. */
  completeEpitaphText(): void {
    floaterVM.endingText = this.epitaphFullText;
    this.epitaphTextComplete = true;
    floaterVM.endingTapVisible = true;
    floaterVM.endingOverlayOpacity = 1;
  }

  /** Hard-reset all anim state (used on save reset). */
  resetAll(): void {
    this.fadeState = 'none';
    this.fadeTimer = 0;
    this.fadeAlpha = 0;
    this.dayNightFadeState = 'none';
    this.dayNightFadeTimer = 0;
    this.dayNightFadeAlpha = 0;
    this.introActive = false;
    this.characterRipples = [];
    this.charRippleSpawnTimer = 0;
    this.floatIdleRipples = [];
    this.floatIdleRippleTimer = 0;
    this.portraitAnimType = 'none';
    this.portraitAnimTimer = 0;
    this.portraitOffsetX = 0;
    this.portraitOffsetY = 0;
    this.floatingIcons = [];
    this.actionMenuAnimState = 'hidden';
    this.actionMenuAnimTimer = 0;
    this.selectedActionId = null;
    this.idleBarAnimState = 'hidden';
    this.idleBarAnimTimer = 0;
    this.selectedIdleBtn = null;
    this.epitaphFadeTimer = 0;
    this.epitaphFullText = '';
    this.epitaphTextProgress = 0;
    this.epitaphTextComplete = false;
    this.pendingEndingCG = false;
    this.fishAlpha = 0;
  }
}
