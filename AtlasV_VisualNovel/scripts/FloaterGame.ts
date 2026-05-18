/**
 * FloaterGame — Main game component for Hooked on a Feeling.
 * Manages Cast loop, input, state machine, rendering, save/load.
 * New in v2: 4-action system (WAIT/TWITCH/DRIFT/REEL), emotion icons,
 * affection bar, catch sequence, endings, per-cast progression.
 *
 * Component Attachment: Scene Entity (2d_game_entity)
 * Component Networking: Local (single-player 2D game)
 * Component Ownership: Not Networked
 */

import {
  Component,
  component,
  subscribe,
  Color,
} from 'meta/platform_api';
import {
  OnEntityCreateEvent,
  OnEntityStartEvent,
  OnWorldUpdateEvent,
  OnWorldUpdateEventPayload,
} from 'meta/platform_api';
import { CustomUiComponent, DrawingCommandsBuilder, SolidBrush } from 'meta/custom_ui';
import {
  FocusedInteractionService,
  OnFocusedInteractionInputStartedEvent,
  OnFocusedInteractionInputMovedEvent,
  OnFocusedInteractionInputEndedEvent,
  OnFocusedInteractionInputEventPayload,
  NetworkingService,
  EventService,
  ExecuteOn,
  Vec2,
} from 'meta/worlds';
import { CameraModeProvisionalService } from 'meta/worlds_provisional';
import type { Maybe } from 'meta/worlds';

import {
  floaterVM,
  onFloaterStartGame,
  onFloaterActionSelected,
  onFloaterNewCast,
  onFloaterSkipBeat,
  onFloaterCastStart,
  onDayNightToggle,
  onJournalOpen,
  onJournalClose,
  onJournalTabSwitch,
  onInventoryOpen,
  onInventoryClose,
  onInventoryEquip,

  onCGViewerDismiss,
  onCGItemTapped,
  onResetSavePressed,
  onResetSaveConfirm,
  onResetSaveCancel,
  onCharacterDetailOpen,
  onCharacterDetailClose,
  FloaterActionSelectedPayload,
  FloaterTabSelectedPayload,
  FloaterLureSelectedPayload,
} from './FloaterViewModel';
import { FloaterRenderer } from './FloaterRenderer';

import { FlagSystem } from './FlagSystem';
import { SaveSystem } from './SaveSystem';
import { AffectionSystem } from './AffectionSystem';
import { createDefaultCharacter, getBeats, getCast, getCastCount } from './CastData';
import { characterRegistry } from './CharacterRegistry';
import { resolveFishEntryKnot, buildBeatsFromInk } from './InkBeatAdapter';
import { QuestSystem } from './QuestSystem';
import { EncounterSystem, getZoneFromPower, recipeFromFlag } from './EncounterSystem';
import type { EncounterResult } from './EncounterSystem';
import { ALL_LURES } from './LureData';
import { CGGallerySystem } from './CGGallerySystem';
import { JournalSystem } from './JournalSystem';
import { lureRedSpinnerTexture, lureGoldTeardropTexture, lureFeatherFlyTexture } from './Assets';
import { GlobalStatsSystem } from './GlobalStatsSystem';
import {
  OnSaveDataLoaded,
  OnSaveDataRequested,
  OnResetSaveRequested,
  OnResetComplete,
  OnCGDataLoaded,
  OnCGSaveRequested,
  SaveDataLoadedPayload,
  ResetCompletePayload,
  CGDataLoadedPayload,
} from './SaveEvents';
import {
  CANVAS_WIDTH, CANVAS_HEIGHT, GAME_ASPECT_RATIO,
  APPROACH_DURATION, DEPARTURE_DURATION,
  TEXT_DISPLAY_SPEED, BEAT_PAUSE_DURATION,
  GAUGE_CYCLE_TIME, AFFECTION_MAX, AFFECTION_DRIFT_AWAY_THRESHOLD,
  CAST_START_X, CAST_START_Y, CAST_TARGET_X, CAST_TARGET_Y,
  CAST_FLIGHT_TIME, CAST_MIN_ARC_HEIGHT, CAST_MAX_ARC_HEIGHT,
  SPLASH_RIPPLE_COUNT, SPLASH_RIPPLE_DELAY,
  SPLASH_RIPPLE_EXPAND_SPEED, FLOAT_LANDED_PAUSE,
  FLOAT_IDLE_RIPPLE_INTERVAL, FLOAT_IDLE_RIPPLE_MAX_RADIUS, FLOAT_IDLE_RIPPLE_EXPAND_SPEED,
  FISH_PORTRAIT_X, FISH_PORTRAIT_Y, FISH_PORTRAIT_SIZE,
  EMOTION_ICON_DURATION, EMOTION_ICON_FADE_TIME, EMOTION_ICON_SPACING, EMOTION_ICON_Y_OFFSET, EMOTION_ICON_BOUNCE_TIME, FLOAT_SURPRISE_EMOJI_DURATION,
  FLOAT_X, FLOAT_Y, FLOAT_BOB_SPEED, FLOAT_BOB_AMPLITUDE,
  FLOAT_BOUNCE_DURATION, FLOAT_BOUNCE_COUNT, FLOAT_BOUNCE_AMPLITUDE,
  ACTION_ANIM_WAIT_DURATION, ACTION_ANIM_WAIT_AMPLITUDE, ACTION_ANIM_WAIT_SPEED,
  ACTION_ANIM_REEL_DURATION, ACTION_ANIM_REEL_PULL_Y, ACTION_ANIM_REEL_BOUNCE_COUNT, ACTION_ANIM_REEL_BOUNCE_DECAY,
  ACTION_ANIM_DRIFT_DURATION, ACTION_ANIM_DRIFT_AMPLITUDE_X, ACTION_ANIM_DRIFT_AMPLITUDE_Y,
  ACTION_ANIM_TWITCH_DURATION, ACTION_ANIM_TWITCH_AMPLITUDE_Y, ACTION_ANIM_TWITCH_AMPLITUDE_X,
  USE_POV_CAST_ANIMATION,
  USE_3D_PHYSICS_CAST,
  CAST_3D_GRAVITY_Y, CAST_3D_NUM_LINE_SEGMENTS, CAST_3D_SEGMENT_LENGTH,
  CAST_3D_FOCAL_LENGTH, CAST_3D_WATER_Y, CAST_3D_MAX_FLIGHT_TIME,
  CAST_3D_BASE_SPEED, CAST_3D_POWER_MULTIPLIER, CAST_3D_START_DEPTH, CAST_3D_SCALE_MULTIPLIER,
  CAST_3D_CALC_MIN_FLIGHT_TIME, CAST_3D_CALC_MAX_FLIGHT_TIME, CAST_3D_Y_BOOST_MULTIPLIER,
  VERLET_ROPE_NUM_PARTICLES, VERLET_ROPE_SEGMENT_LENGTH,
  VERLET_ROPE_GRAVITY, VERLET_ROPE_CONSTRAINT_ITERATIONS, VERLET_ROPE_DAMPING,
  CAST_LANDING_NEAR_Y, CAST_LANDING_FAR_Y, CAST_LANDING_X_VARIANCE,
  CAST_LANDING_X_OFFSET,
  CAST_TRAJ_START_X, CAST_TRAJ_START_Y,
  CAST_TRAJ_LANDING_NEAR_Y, CAST_TRAJ_LANDING_FAR_Y,
  CAST_TRAJ_DRAG_SENSITIVITY, CAST_TRAJ_X_SENSITIVITY, CAST_TRAJ_LANDING_MIN_X, CAST_TRAJ_LANDING_MAX_X,
  CAST_TRAJ_CTRL_OFFSET_Y,
  POV_CAST_START_X, POV_CAST_START_Y, POV_CAST_START_SCALE, POV_CAST_END_SCALE, POV_CAST_FLIGHT_TIME,
  POV_CAST_PEAK_X, POV_CAST_PEAK_Y, POV_CAST_PEAK_SCALE, POV_CAST_PEAK_T,
  POV_LINE_START_X, POV_LINE_START_Y,
  ROD_3D_LENGTH, ROD_3D_BASE_X, ROD_3D_BASE_Y, ROD_3D_BASE_Z,
  ROD_3D_INITIAL_ANGLE, ROD_3D_TIP_Z_FACTOR,
  ROD_PHASE_WINDUP_END, ROD_PHASE_ACCELERATE_END, ROD_PHASE_RELEASE_END,
  ROD_WINDUP_PULLBACK, ROD_ACCELERATE_SWING, ROD_RELEASE_ANGLE, ROD_FOLLOWTHROUGH_SETTLE,
  RodState,
  ActionId,
  NOTHING_BITES_DURATION,
  FADE_OUT_DURATION, FADE_IN_DURATION,
  CHAR_RIPPLE_SPAWN_INTERVAL, CHAR_RIPPLE_MAX_RADIUS, CHAR_RIPPLE_EXPAND_SPEED,
  TITLE_LINE_START_X, TITLE_LINE_START_Y,
} from './Constants';
import { Vec3D } from './Vec3D';
import {
  GamePhase, DriftState, ExpressionState,
  EmotionIconType, EndingType, Phase, ANY_LURE,
} from './Types';
import type { Beat, ActionEffect, FishCharacter, FishAffection, SaveData, SplashRipple, FloatingEmotionIcon, EmotionIconAnchor, FishSaveData, LureReaction } from './Types';

@component()
export class FloaterGame extends Component {
  // Core systems
  private builder: DrawingCommandsBuilder = new DrawingCommandsBuilder();
  private renderer: Maybe<FloaterRenderer> = null;

  private flagSystem: FlagSystem = new FlagSystem();

  /** Get the current fish's display name, respecting the trueName/trueNameFlag system. */
  private getFishDisplayName(): string {
    return characterRegistry.getDisplayName(this.fish.id, this.flagSystem.serialize());
  }
  private saveSystem: SaveSystem = new SaveSystem();
  private affectionSystem: AffectionSystem = new AffectionSystem();
  private questSystem: QuestSystem = new QuestSystem();
  private encounterSystem: EncounterSystem = new EncounterSystem();
  private cgGallerySystem: CGGallerySystem = new CGGallerySystem();
  private journalSystem: JournalSystem = new JournalSystem();
  private globalStatsSystem: GlobalStatsSystem = new GlobalStatsSystem();

  // Affection data — re-initialized in loadGame()
  private fishAffection: FishAffection = this.affectionSystem.createAffection(characterRegistry.getDefaultCharacterId());
  private sessionId: string = `session_${Date.now()}`;
  private displayedAffectionLabel: string = 'Indifferent'; // Updated at cast boundaries only

  // Game state
  private phase: GamePhase = GamePhase.Title;
  private fish: FishCharacter = createDefaultCharacter();
  private beats: Beat[] = [];
  private currentBeatIndex: number = 0;
  private seenBeats: Set<string> = new Set();
  private castCount: number = 0;
  private currentCastIndex: number = 0;
  private equippedLureId: string | null = null;
  private perFishCastIndex: Record<string, number> = {};

  // Dialogue state
  private currentLines: string[] = [];
  private currentLineIndex: number = 0;
  private displayedText: string = '';
  private textProgress: number = 0;
  private isTextComplete: boolean = false;
  private isShowingReaction: boolean = false;
  /** True when the currently playing reaction comes from a terminal choice
   *  (Ink `-> END`). When the reaction finishes, the engine triggers the
   *  visual departure directly — no side-table lookup. */
  private currentReactionIsTerminal: boolean = false;

  // Timing
  private time: number = 0;
  private lastTime: number = 0;
  private phaseTimer: number = 0;
  private beatPauseTimer: number = 0;
  private noLureWarningTimer: number = 0;
  private nothingBitesTimer: number = 0;
  private departureFadeTimer: number = 0;

  // Fade Transition (title → idle)
  private fadeState: 'none' | 'fading_out' | 'fading_in' = 'none';
  private fadeTimer: number = 0;
  private fadeAlpha: number = 0;

  // Intro cinematic state \u2014 single paragraph progressively revealed in a
  // typewriter pass, then auto-fades to LakeIdle. No tap required.
  private introActive: boolean = false;
  private introTextProgress: number = 0; // seconds elapsed in typewriter
  private introHoldTimer: number = 0;    // seconds held on fully-revealed paragraph
  private introFadeTimer: number = 0;    // seconds elapsed in fade-out
  private introState: 'typing' | 'hold' | 'fading' = 'typing';
  private readonly introFullText: string =
    'A pond, still under the moon.\n' +
    'The water holds its breath.\n\n' +
    'They say the fish here are different \u2014 they come close, and they speak.\n' +
    'All you need is patience\u2026 and the right lure.';
  private static readonly INTRO_CHAR_SPEED: number = 0.035; // seconds per character
  private static readonly INTRO_HOLD_DURATION: number = 1.8; // pause on full text
  private static readonly INTRO_FADE_DURATION: number = 1.0; // fade overlay out

  // Day/Night Toggle
  private isDayMode: boolean = false;
  private dayNightFadeState: 'none' | 'fading_out' | 'fading_in' = 'none';
  private dayNightFadeTimer: number = 0;
  private dayNightFadeAlpha: number = 0;

  // Action Button Animation State
  private actionMenuAnimState: 'hidden' | 'appearing' | 'visible' | 'responding' | 'disappearing' = 'hidden';
  private actionMenuAnimTimer: number = 0;
  private selectedActionId: ActionId | null = null;
  private readonly ACTION_APPEAR_DURATION: number = 0.25;
  private readonly ACTION_DISAPPEAR_DURATION: number = 0.2;

  // Idle Button Bar Animation State
  private idleBarAnimState: 'hidden' | 'appearing' | 'visible' | 'responding' | 'disappearing' = 'hidden';
  private idleBarAnimTimer: number = 0;
  private selectedIdleBtn: 'bait' | 'cast' | 'journal' | null = null;
  private readonly IDLE_BAR_APPEAR_DURATION: number = 0.25;
  private readonly IDLE_BAR_DISAPPEAR_DURATION: number = 0.2;

  // Silent Beat (Four Minutes)
  private silentBeatActive: boolean = false;
  private silentBeatTimer: number = 0;
  private silentBeatDuration: number = 0;
  private silentBeatUnlocked: boolean = false;

  // Float animation
  private floatDip: number = 0;
  private lineTension: number = 0.5;

  // Action Animation State
  private actionAnimType: ActionId | null = null;
  private actionAnimTimer: number = 0;
  private actionAnimDuration: number = 0;
  private actionAnimOffsetX: number = 0;
  private actionAnimOffsetY: number = 0;

  // Fish approach/departure
  private fishAlpha: number = 0;

  // Skip system — VN-style fast-forward through dialogue.
  // `canSkip` gates whether the button is shown (any dialogue phase).
  // `skipActive` is the player-toggled fast-forward state. When active, dialogue
  // auto-advances on a short timer and the typewriter completes instantly.
  // Skip auto-cancels at unseen beats, action choices, and endings.
  private canSkip: boolean = false;
  private skipActive: boolean = false;
  private skipAdvanceTimer: number = 0;
  private static readonly SKIP_LINE_INTERVAL: number = 0.06; // seconds between auto-advances

  // Character Ripples (expansion + fade, spawned periodically when portrait visible)
  private characterRipples: SplashRipple[] = [];
  private charRippleSpawnTimer: number = 0;

  // Cast Mechanics
  private powerGaugeValue: number = 0;

  // Cast Trajectory Preview (touch-drag on LakeIdle)
  private isInCastAiming: boolean = false; // true after Cast button tapped, before release
  private isCastTouching: boolean = false;
  private castTouchStartY: number = 0;
  private castTouchStartX: number = 0;
  private castTrajectoryDistance: number = 0; // 0..1 (0=near, 1=far)
  private castTrajectoryOffsetX: number = 0; // -1..1 (left..right)
  private previewLandingX: number = 0; // Physics-simulated landing point (2D canvas X)
  private previewLandingY: number = 0; // Physics-simulated landing point (2D canvas Y)

  // Float Idle Ripples (periodic expansion + fade while float is stationary)
  private floatIdleRipples: SplashRipple[] = [];
  private floatIdleRippleTimer: number = 0;
  private powerGaugeDir: number = 1;
  private castFlightT: number = 0;
  private castPower: number = 50;
  private castFloatX: number = 0;
  private castFloatY: number = 0;
  private castFloatScale: number = 1.0;
  private castFloatRotation: number = 0; // degrees, derived from bezier tangent + wobble
  private prevCastFloatScreenX: number = 0;
  private prevCastFloatScreenY: number = 0;

  // === Bezier Flight (Phase 2 prototype) ===
  private isBezierFlying: boolean = false;
  private bezierFlightT: number = 0;
  private bezierFlightDuration: number = 0.6; // seconds
  private bezierP0: { x: number; y: number } = { x: 0, y: 0 };

  // === Verlet Rope Simulation (for bezier flight line) ===
  private verletPositions: Vec3D[] = [];
  private verletPrevPositions: Vec3D[] = [];
  private bezierP1: { x: number; y: number } = { x: 0, y: 0 }; // control point
  private bezierP2: { x: number; y: number } = { x: 0, y: 0 }; // endpoint

  private splashRipples: SplashRipple[] = [];
  private splashTimer: number = 0;
  private floatLandedTimer: number = 0;

  // Landing line transition (smooth morph from 3D physics line to resting Bézier)
  private landingLineSnapshot: { x: number; y: number }[] = [];

  // Float Bounce (post-landing)
  private floatBounceTimer: number = 0;
  private surpriseEmojiTimer: number = 0;
  private showingSurpriseEmoji: boolean = false;

  // Pre-determined encounter result (resolved at bounce start, consumed by startCast)
  private pendingEncounter: EncounterResult | null = null;

  // Flag snapshot at cast start (for detecting newly discovered facts)
  private flagsAtCastStart: Record<string, boolean | number> = {};

  // Dynamic landing target (varies with power)
  private landingTargetX: number = FLOAT_X;
  private landingTargetY: number = FLOAT_Y;

  // 3D Physics Cast State
  private floater3DPos: Vec3D = new Vec3D();
  private floater3DVel: Vec3D = new Vec3D();
  private lineSegments3D: Vec3D[] = [];
  private castFlyingTimer: number = 0;
  private lineExtensionProgress: number = 0;
  private lastCastPower: number = 50;
  private castPeakFraction: number = 0.4; // Fraction of flight at which float peaks (computed per-cast)

  // 3D Fishing Rod State
  private rod3D: { basePos: Vec3D; tipPos: Vec3D; angle: number } = {
    basePos: new Vec3D(),
    tipPos: new Vec3D(),
    angle: 0,
  };
  private rodState: RodState = RodState.WindUp;

  // Approach Sequence Timers (cinematic bite → portrait → emotion)
  private approachPortraitDelay: number = 0.3; // seconds before portrait starts fading in
  private approachEmotionDelay: number = 0.8; // seconds before emotion icon appears
  private approachEmotionSpawned: boolean = false; // whether the arrival icon has been spawned this approach

  // Portrait Animation
  private portraitAnimType: 'none' | 'shake' | 'bounce' = 'none';
  private portraitAnimTimer: number = 0;
  private portraitAnimDuration: number = 0;
  private portraitOffsetX: number = 0;
  private portraitOffsetY: number = 0;

  // Emotion Icons
  private floatingIcons: FloatingEmotionIcon[] = [];

  // Progress Dots (rendered on DrawingSurface instead of XAML text)
  private progressDotsTotal: number = 0;
  private progressDotsFilled: number = 0;

  // Ending
  private currentEnding: EndingType = EndingType.Reel;
  private epitaphFadeTimer: number = 0;
  private epitaphFullText: string = '';
  private epitaphTextProgress: number = 0;
  private epitaphTextComplete: boolean = false;
  private readonly EPITAPH_FADE_DURATION: number = 1.0; // seconds to fade in overlay
  private readonly EPITAPH_TEXT_SPEED: number = 0.03; // seconds per character (typewriter)

  @subscribe(OnEntityCreateEvent)
  onCreate(): void {
    this.renderer = new FloaterRenderer(this.builder);
    const customUi = this.entity.getComponent(CustomUiComponent);
    if (customUi != null) { customUi.dataContext = floaterVM; }

    // Wire up persistent save: whenever local save writes, also push to server
    this.saveSystem.setOnSaveCallback((json: string) => {
      if (!NetworkingService.get().isServerContext()) {
        EventService.sendGlobally(OnSaveDataRequested, { data: json });
      }
    });

    // Seed Day/Night from the player's wall-clock hour (6h-18h = Day).
    // Not persisted: the player can toggle freely; on next launch we re-seed.
    const hour = new Date().getHours();
    this.isDayMode = hour >= 6 && hour < 18;
    floaterVM.isDayMode = this.isDayMode;

    floaterVM.dayNightButtonRotation = this.isDayMode ? 180 : 0;

    this.loadGame();
    this.render();
    console.log('[FloaterGame] Created');
  }

  @subscribe(OnEntityStartEvent)
  onStart(): void {
    if (!NetworkingService.get().isPlayerContext()) return;
    this.enableTouchInput();
    console.log('[FloaterGame] Started, touch enabled');
  }

  @subscribe(OnWorldUpdateEvent)
  onUpdate(payload: OnWorldUpdateEventPayload): void {
    const now = Date.now();
    const dt = this.lastTime === 0 ? 1 / 72 : (now - this.lastTime) / 1000;
    this.lastTime = now;
    const clampedDt = Math.min(dt, 1 / 30);
    this.time += clampedDt;

    this.saveSystem.update(clampedDt, () => this.buildSaveData());
    this.updateFadeTransition(clampedDt);
    this.updateDayNightFade(clampedDt);
    this.updateIntro(clampedDt);
    this.updatePhase(clampedDt);
    this.updateFloat(clampedDt);
    this.updateActionAnimation(clampedDt);
    this.updateActionButtonAnimation(clampedDt);
    this.updateIdleBarAnimation(clampedDt);
    this.updateEmotionIcons(clampedDt);
    this.updateCharacterRipples(clampedDt);
    this.updateFloatIdleRipples(clampedDt);
    this.updatePortraitAnimation(clampedDt);
    this.render();
  }

  // === Event Handlers ===

  @subscribe(onFloaterStartGame)
  onStartGame(): void {
    console.log('[FloaterGame] Start game → fade to black');

    // Increment play session counter
    this.globalStatsSystem.incrementPlaySession();
    this.saveSystem.requestSave();

    // titleVisible stays true through the fade-to-black; it flips false at
    // fadeAlpha=1 (in updateFadeTransition) so the title is hidden under the
    // black screen, never as a hard pop. The syncViewModelFromState guard
    // prevents async save loads from re-showing it once the fade has begun.
    this.fadeState = 'fading_out';
    this.fadeTimer = 0;
    this.fadeAlpha = 0;
  }

  @subscribe(onFloaterActionSelected)
  onActionSelected(payload: FloaterActionSelectedPayload): void {
    if (this.phase !== GamePhase.ActionSelect) return;
    const actionId = payload.parameter as ActionId;
    console.log(`[FloaterGame] Action selected: ${actionId}`);
    this.handleAction(actionId);
  }

  @subscribe(onFloaterNewCast)
  onNewCast(): void {
    if (this.phase !== GamePhase.Idle) return;
    floaterVM.idleVisible = false;
    this.enterLakeIdle();
  }

  @subscribe(onFloaterSkipBeat)
  onSkipBeat(): void {
    if (!this.canSkip) return;
    // Toggle VN-style fast-forward. The per-frame tick in updatePhase() drives
    // line-by-line progression while active; it auto-cancels at unseen beats,
    // action choices, and endings.
    this.skipActive = !this.skipActive;
    this.skipAdvanceTimer = 0;
    floaterVM.skipButtonOpacity = 1;
    if (this.skipActive) {
      // Don't sit idle through the inter-beat pause while skipping.
      this.beatPauseTimer = 0;
    }
    console.log(`[FloaterGame] Skip toggled: active=${this.skipActive}, phase=${this.phase}, beatIndex=${this.currentBeatIndex}`);
  }

  /** Cancel any active fast-forward. Button visibility is owned by whoever
   *  changed the phase — this only tears down the skip *state*, never reveals
   *  the button. Otherwise canceling from ActionSelect (where the button must
   *  be hidden) would flash it back into view. */
  private cancelSkip(): void {
    if (this.skipActive) {
      this.skipActive = false;
      this.skipAdvanceTimer = 0;
    }
  }

  /**
   * Per-frame skip tick. Called from updatePhase() for any phase where
   * dialogue is being read. Completes the current typewriter line instantly
   * and then advances one line per SKIP_LINE_INTERVAL. Auto-cancels when the
   * next step would expose unseen content or hand control to the player.
   */
  private updateSkip(dt: number): void {
    if (!this.skipActive) return;
    // Inter-beat pause: skip past it by firing startNextBeat() now. We must
    // NOT just zero the timer and fall through to advanceDialogue — the
    // current `currentLines`/`currentLineIndex` still point at the previous
    // beat's text (e.g. reaction tail), and advanceDialogue would mis-route
    // by reading the next beat's actionEffects against stale line state.
    // startNextBeat is the canonical entry point that loads the new beat.
    if (this.beatPauseTimer > 0 && this.phase === GamePhase.Exchange) {
      this.beatPauseTimer = 0;
      this.skipAdvanceTimer = 0;
      this.startNextBeat();
      return;
    }
    // Snap typewriter to end instantly.
    if (!this.isTextComplete) {
      this.completeCurrentText();
    }
    this.skipAdvanceTimer += dt;
    if (this.skipAdvanceTimer < FloaterGame.SKIP_LINE_INTERVAL) return;
    this.skipAdvanceTimer = 0;

    // Stop at unseen beats: if we're about to wrap to the next beat in Exchange
    // and that beat has never been seen, hand control back to the player.
    if (this.phase === GamePhase.Exchange && !this.isShowingReaction) {
      const atLastLine = this.currentLineIndex >= this.currentLines.length - 1;
      if (atLastLine) {
        const currentBeat = this.beats[this.currentBeatIndex];
        const noChoices = currentBeat && Object.keys(currentBeat.actionEffects).length === 0;
        if (noChoices) {
          // Monologue beat: advanceDialogue() will roll to the next beat.
          const nextBeat = this.beats[this.currentBeatIndex + 1];
          if (nextBeat && !this.seenBeats.has(nextBeat.beatId)) {
            this.cancelSkip();
            return;
          }
        }
        // Beats with action choices stop skip naturally: advanceDialogue will
        // enter ActionSelect, which cancels skip in updatePhase below.
      }
    }
    // Stop at unseen reaction tails too: once reaction finishes, next beat will
    // start. Mirror the seen-beat guard.
    if (this.phase === GamePhase.FishReaction && this.isShowingReaction) {
      const atLastLine = this.currentLineIndex >= this.currentLines.length - 1;
      if (atLastLine && !this.currentReactionIsTerminal) {
        const nextBeat = this.beats[this.currentBeatIndex + 1];
        if (nextBeat && !this.seenBeats.has(nextBeat.beatId)) {
          this.cancelSkip();
          return;
        }
      }
    }

    // Advance one line. Routes match onTouchStart's tap handling.
    if (this.phase === GamePhase.Exchange || this.phase === GamePhase.FishReaction) {
      this.advanceDialogue();
    } else if (this.phase === GamePhase.Departure) {
      // Stop skip on the final departure line so the fish's fade-out anim
      // (gated on lineIndex >= length - 1 in updatePhase) can actually play.
      // Without this, skip blows past the last line before fishAlpha reaches 0.
      if (this.currentLineIndex >= this.currentLines.length - 1) {
        this.cancelSkip();
        return;
      }
      this.advanceDepartureDialogue();
    } else if (this.phase === GamePhase.NothingBites) {
      // NothingBites is a single-line timed message; just complete it and let
      // the existing timer return to LakeIdle. No advance needed.
    }
  }

  @subscribe(onDayNightToggle)
  onDayNightToggle(): void {
    // Don't allow toggling while a day/night transition is already in progress
    if (this.dayNightFadeState !== 'none') return;
    console.log('[FloaterGame] Day/Night toggle pressed');
    this.dayNightFadeState = 'fading_out';
    this.dayNightFadeTimer = 0;
    this.dayNightFadeAlpha = 0;
  }

  // === Cast Aiming Mode ===
  // When the Cast button is tapped, we enter "aiming mode": hide idle bar,
  // show drag instruction, and gate touch input so only drags trigger casting.
  @subscribe(onFloaterCastStart)
  onCastStart(): void {
    if (this.phase !== GamePhase.LakeIdle) return;
    console.log('[FloaterGame] Cast button tapped → entering aiming mode');
    this.isInCastAiming = true;
    this.hideIdleBar();
    floaterVM.castInstructionVisible = true;
  }

  // === Journal/Inventory Events ===
  @subscribe(onJournalOpen)
  onJournalOpenEvent(): void {
    this.setIdleBarResponding('journal');
    floaterVM.journalVisible = true;
    floaterVM.setJournalTab(0);
    this.refreshJournalData();
  }

  @subscribe(onJournalClose)
  onJournalCloseEvent(): void {
    floaterVM.journalVisible = false;
    // Reset idle bar to visible state after closing journal
    if (this.phase === GamePhase.LakeIdle || this.phase === GamePhase.Idle) {
      this.showIdleBar();
    }
  }

  @subscribe(onJournalTabSwitch)
  onJournalTabSwitchEvent(payload: FloaterTabSelectedPayload): void {
    const idx = parseInt(payload.parameter, 10);
    if (idx >= 0 && idx <= 4) {
      floaterVM.setJournalTab(idx);
      if (idx === 1 || idx === 3) {
        floaterVM.journalCollectionText = this.cgGallerySystem.getCollectionText();
      }
      if (idx === 2 || idx === 4) {
        floaterVM.journalStatsText = this.globalStatsSystem.getStatsText();
        floaterVM.journalBadgesText = this.globalStatsSystem.getBadgesText();
        floaterVM.setStatItems(this.globalStatsSystem.getStructuredStats());
        floaterVM.setBadgeItems(this.globalStatsSystem.getStructuredBadges());
      }
    }
  }

  @subscribe(onCGViewerDismiss)
  onCGViewerDismissEvent(): void {
    this.cgGallerySystem.closeViewer();
    floaterVM.cgViewerVisible = false;
  }

  @subscribe(onCGItemTapped)
  onCGItemTappedEvent(payload: FloaterTabSelectedPayload): void {
    const cgId = payload.parameter;
    console.log(`[FloaterGame] CG item tapped: ${cgId}, unlocked=${this.cgGallerySystem.isCGUnlocked(cgId)}`);
    if (this.cgGallerySystem.isCGUnlocked(cgId)) {
      this.cgGallerySystem.openViewer(cgId);
      floaterVM.cgViewerVisible = true;
      floaterVM.cgViewerImage = this.cgGallerySystem.getCGTexture(cgId);
      console.log(`[FloaterGame] CG viewer opened: ${cgId}`);
    }
  }

  /** Build a map of characterId -> affection value for all fish (current + saved). */
  private buildAffectionValuesMap(): Record<string, number> {
    const values: Record<string, number> = {};
    // Current fish
    values[this.fish.id] = this.fishAffection.value;
    // Other fish from saved records
    for (const [id, data] of Object.entries(this.savedFishRecords)) {
      values[id] = data.affection;
    }
    return values;
  }

  @subscribe(onCharacterDetailOpen)
  onCharacterDetailOpenEvent(payload: FloaterTabSelectedPayload): void {
    const charId = payload.parameter;
    const affectionValues = this.buildAffectionValuesMap();
    const cards = this.journalSystem.getCharacterCardsData(affectionValues, this.flagSystem.serialize());
    const card = cards.find(c => c.id === charId);
    if (!card || !card.unlocked) return;

    const character = characterRegistry.getCharacter(charId);

    floaterVM.charDetailName = card.name;
    floaterVM.charDetailSpecies = card.species;
    floaterVM.charDetailTierName = card.tierName;
    floaterVM.charDetailCasts = String(card.castsMade);
    floaterVM.charDetailAccentColor = card.accentColor;
    floaterVM.charDetailTierColor = card.tierColor;
    floaterVM.charDetailPortrait = character?.portraitTexture;
    floaterVM.charDetailQuestName = card.questName;
    floaterVM.charDetailQuestHint = card.questHint;

    // Get observations text (show only facts with flags set)
    const currentFlags = this.flagSystem.serialize();
    if (character?.facts) {
      const unlockedFacts = character.facts
        .filter(f => currentFlags[f.flagKey])
        .map(f => f.text);
      floaterVM.charDetailObservations = unlockedFacts.length > 0
        ? unlockedFacts.map(t => `\u2022 ${t}`).join('\n')
        : 'No observations yet.';
    } else {
      floaterVM.charDetailObservations = 'No observations yet.';
    }

    const targetRecipe = this.journalSystem.getTargetRecipe(charId, currentFlags);
    if (targetRecipe) {
      const zoneLabels: Record<string, string> = {
        near: 'Near bank',
        mid: 'Mid waters',
        far: 'Deep waters',
      };
      floaterVM.charDetailLocationZone = zoneLabels[targetRecipe.zone] ?? targetRecipe.zone;

      // Lure icon
      if (targetRecipe.lure === ANY_LURE) {
        floaterVM.charDetailLocationLureVisible = false;
      } else {
        floaterVM.charDetailLocationLureVisible = true;
        const lureTextureMap: Record<string, typeof lureRedSpinnerTexture> = {
          'red_spinner': lureRedSpinnerTexture,
          'gold_teardrop': lureGoldTeardropTexture,
          'feather_fly': lureFeatherFlyTexture,
        };
        floaterVM.charDetailLocationLureTexture = lureTextureMap[targetRecipe.lure];
      }

      // Phase rotation: Night=0°, Day=180°
      floaterVM.charDetailLocationPhaseRotation = targetRecipe.phase === Phase.Day ? 180 : 0;
      floaterVM.charDetailLocationVisible = true;
    } else {
      floaterVM.charDetailLocationVisible = false;
    }

    floaterVM.charDetailVisible = true;
    console.log(`[FloaterGame] Character detail opened: ${charId}`);
  }

  @subscribe(onCharacterDetailClose)
  onCharacterDetailCloseEvent(): void {
    floaterVM.charDetailVisible = false;
  }

  /** Refresh all journal data from current game state */
  private refreshJournalData(): void {
    // Pond Notes (observations per fish)
    floaterVM.journalPondNotesText = this.journalSystem.getAllPondNotesText(this.flagSystem.serialize());
    // Characters tab (teasing list)
    floaterVM.journalCharactersText = this.journalSystem.getCharacterListText();
    // Lure Box
    floaterVM.journalLureBoxText = this.journalSystem.getLureBoxText(
      this.getOwnedLures(), this.getLureReactions()
    );
    // Keepsakes (removed)
    // Gallery
    floaterVM.journalCollectionText = this.cgGallerySystem.getCollectionText();
    // Stats & Badges
    floaterVM.journalStatsText = this.globalStatsSystem.getStatsText();
    floaterVM.journalBadgesText = this.globalStatsSystem.getBadgesText();
    floaterVM.setStatItems(this.globalStatsSystem.getStructuredStats());
    floaterVM.setBadgeItems(this.globalStatsSystem.getStructuredBadges());
    // Met counter
    floaterVM.journalMetCounter = this.journalSystem.getMetCounterText();

    // Character cards (Fish tab) — built from registry, no per-id branching.
    const cards = this.journalSystem.getCharacterCardsData(this.buildAffectionValuesMap(), this.flagSystem.serialize());
    floaterVM.setCharacterCards(cards.map(card => {
      const config = characterRegistry.getCharacter(card.id);
      return {
        id: card.id,
        name: card.name,
        species: card.species,
        tier: card.tierName,
        casts: String(card.castsMade),
        unlocked: card.unlocked,
        completed: this.flagSystem.check(`${card.id}.ending_complete`),
        spritePath: config?.portraitSpritePath ?? '',
        texture: config?.portraitTexture,
        accentColor: card.accentColor,
      };
    }));

    // CG Gallery (Collection tab) — built from registry-aggregated CG data.
    const cgCards = this.cgGallerySystem.getGalleryCards();
    floaterVM.setCGCards(cgCards.map(cg => ({
      id: cg.id,
      name: cg.name,
      unlocked: cg.isUnlocked,
      spritePath: cg.thumbnailPath,
      texture: cg.thumbnailTexture,
    })));
    floaterVM.cgCollectionProgress = this.cgGallerySystem.getCollectionText();
  }

  /** Persist CG unlocks to separate PVar (survives save resets) */
  private persistCGData(): void {
    const cgArray = this.cgGallerySystem.serialize();
    const cgJson = JSON.stringify(cgArray);
    EventService.sendGlobally(OnCGSaveRequested, { data: cgJson });
    console.log(`[FloaterGame] Persisting ${cgArray.length} CG unlocks to separate PVar`);
  }

  /** Get owned lure IDs for journal display */
  private getOwnedLures(): string[] {
    // Return at least 'bare_hook' as default + any equipped
    const lures: string[] = ['bare_hook'];
    if (this.equippedLureId && !lures.includes(this.equippedLureId)) {
      lures.push(this.equippedLureId);
    }
    return lures;
  }

  /** Get lure reactions (placeholder - returns empty for now) */
  private getLureReactions(): LureReaction[] {
    return [];
  }

  @subscribe(onInventoryOpen)
  onInventoryOpenEvent(): void {
    if (this.phase !== GamePhase.LakeIdle && this.phase !== GamePhase.Idle) return;
    this.setIdleBarResponding('bait');
    floaterVM.inventoryVisible = true;
  }

  @subscribe(onInventoryClose)
  onInventoryCloseEvent(): void {
    floaterVM.inventoryVisible = false;
    // Reset idle bar to visible state after closing inventory
    if (this.phase === GamePhase.LakeIdle || this.phase === GamePhase.Idle) {
      this.showIdleBar();
    }
  }

  @subscribe(onInventoryEquip)
  onInventoryEquipEvent(payload: FloaterLureSelectedPayload): void {
    const lureId = payload.parameter;
    if (!lureId) return;

    if (lureId === 'none') {
      this.equippedLureId = null;
      floaterVM.setEquippedLure('none', 'None', 'No lure equipped. Fish will still bite, but lures can improve your chances.');
    } else {
      this.equippedLureId = lureId;
      const lure = ALL_LURES[lureId];
      const name = lure ? lure.name : lureId;
      const desc = lure ? lure.description : '';
      floaterVM.setEquippedLure(lureId, name, desc);
    }
    this.saveSystem.requestSave();
  }

  // === Persistent Save Events ===
  @subscribe(OnSaveDataLoaded, { execution: ExecuteOn.Everywhere })
  onSaveDataLoaded(payload: SaveDataLoadedPayload): void {
    if (NetworkingService.get().isServerContext()) return; // Client-only
    console.log(`[FloaterGame] Received persistent save data: ${payload.data.length} chars`);
    // Mark save system ready — even if data is empty (new player).
    // This prevents requestSave() from overwriting real data before load completes.
    this.saveSystem.setReady();
    if (payload.data && payload.data.length > 0) {
      this.saveSystem.setPersistentData(payload.data);
      this.loadGame();
      this.syncViewModelFromState();
      this.render();
    }
  }

  @subscribe(OnCGDataLoaded, { execution: ExecuteOn.Everywhere })
  onCGDataLoaded(payload: CGDataLoadedPayload): void {
    if (NetworkingService.get().isServerContext()) return; // Client-only
    console.log(`[FloaterGame] Received persistent CG data: ${payload.data.length} chars`);
    if (payload.data && payload.data.length > 0) {
      try {
        const cgArray = JSON.parse(payload.data) as string[];
        // Merge persistent CG unlocks into cgGallerySystem (union with existing)
        const existingSerialized = this.cgGallerySystem.serialize();
        const merged = Array.from(new Set([...existingSerialized, ...cgArray]));
        this.cgGallerySystem.deserialize(merged);
        console.log(`[FloaterGame] Merged ${merged.length} CG unlocks from persistent storage`);
      } catch (e) {
        console.log('[FloaterGame] ERROR parsing persistent CG data:', e);
      }
    }
  }

  @subscribe(OnResetComplete, { execution: ExecuteOn.Everywhere })
  onResetComplete(payload: ResetCompletePayload): void {
    if (NetworkingService.get().isServerContext()) return; // Client-only
    if (!payload.success) {
      console.log('[FloaterGame] Reset failed on server');
      return;
    }
    console.log('[FloaterGame] Reset complete — restarting to title');
    this.resetAllGameState();
  }

  @subscribe(onResetSavePressed)
  onResetSavePressedEvent(): void {
    floaterVM.resetConfirmVisible = true;
  }

  @subscribe(onResetSaveConfirm)
  onResetSaveConfirmEvent(): void {
    floaterVM.resetConfirmVisible = false;
    floaterVM.journalVisible = false;
    // Send reset request to server
    EventService.sendGlobally(OnResetSaveRequested, { confirm: true });
    // Also clear local state immediately (preserving CG)
    this.resetAllGameState();
  }

  @subscribe(onResetSaveCancel)
  onResetSaveCancelEvent(): void {
    floaterVM.resetConfirmVisible = false;
  }

  private resetAllGameState(): void {
    // Clear local save
    this.saveSystem.clearSave();

    // Preserve CG unlocks across reset
    const preservedCGUnlocks = this.cgGallerySystem.serialize();

    // Reset all game state to initial
    this.phase = GamePhase.Title;
    this.fish = createDefaultCharacter();
    this.fishAffection = this.affectionSystem.createAffection(characterRegistry.getDefaultCharacterId());
    this.beats = [];
    this.currentBeatIndex = 0;
    this.seenBeats = new Set();
    this.castCount = 0;
    this.currentCastIndex = 0;
    this.equippedLureId = null;
    this.perFishCastIndex = {};
    this.savedFishRecords = {};
    this.flagSystem = new FlagSystem();
    this.questSystem = new QuestSystem();
    this.cgGallerySystem = new CGGallerySystem();
    this.journalSystem = new JournalSystem();
    this.globalStatsSystem = new GlobalStatsSystem();

    // Restore preserved CG unlocks (CGs persist across resets)
    if (preservedCGUnlocks.length > 0) {
      this.cgGallerySystem.deserialize(preservedCGUnlocks);
      console.log(`[FloaterGame] Restored ${preservedCGUnlocks.length} CG unlocks after reset`);
    }
    this.currentLines = [];
    this.displayedText = '';
    this.isTextComplete = false;
    this.floatingIcons = [];

    // Reset ViewModel
    floaterVM.titleVisible = true;
    floaterVM.hudVisible = false;
    floaterVM.actionMenuVisible = false;
    floaterVM.departureVisible = false;
    floaterVM.idleVisible = false;
    floaterVM.castButtonVisible = false;
    floaterVM.endingVisible = false;
    floaterVM.dialogueVisible = false;
    floaterVM.skipButtonVisible = false;
    floaterVM.skipButtonOpacity = 0;
    this.canSkip = false;
    this.skipActive = false;
    this.skipAdvanceTimer = 0;
    floaterVM.inventoryVisible = false;
    floaterVM.journalVisible = false;
    floaterVM.inventoryButtonVisible = false;
    floaterVM.journalButtonVisible = false;
    floaterVM.idleBarVisible = false;
    floaterVM.idleBarOpacity = 0;
    floaterVM.idleBarTranslateY = 40;
    this.idleBarAnimState = 'hidden';
    floaterVM.cgViewerVisible = false;
    floaterVM.resetConfirmVisible = false;
    floaterVM.introVisible = false;
    this.introActive = false;

    console.log('[FloaterGame] All state reset to initial');
    this.render();
  }

  // === Touch Input ===
  private screenToCanvas(screenPos: Vec2): { x: number; y: number } {
    const screenAspect = CameraModeProvisionalService.get().aspectRatio;
    let canvasX: number;
    let canvasY: number;

    if (screenAspect > GAME_ASPECT_RATIO) {
      const gameWidthInScreenSpace = GAME_ASPECT_RATIO / screenAspect;
      const offsetX = (1.0 - gameWidthInScreenSpace) / 2.0;
      canvasX = ((screenPos.x - offsetX) / gameWidthInScreenSpace) * CANVAS_WIDTH;
      canvasY = screenPos.y * CANVAS_HEIGHT;
    } else {
      const gameHeightInScreenSpace = screenAspect / GAME_ASPECT_RATIO;
      const offsetY = (1.0 - gameHeightInScreenSpace) / 2.0;
      canvasX = screenPos.x * CANVAS_WIDTH;
      canvasY = ((screenPos.y - offsetY) / gameHeightInScreenSpace) * CANVAS_HEIGHT;
    }

    return { x: canvasX, y: canvasY };
  }

  @subscribe(OnFocusedInteractionInputStartedEvent)
  onTouchStart(payload: OnFocusedInteractionInputEventPayload): void {
    if (payload.interactionIndex !== 0) return;

    if (this.introActive) {
      this.advanceIntro();
      return;
    }

    if (this.phase === GamePhase.Ending) {
      if (!this.epitaphTextComplete) {
        // First tap during typewriter: complete the text instantly
        floaterVM.endingText = this.epitaphFullText;
        this.epitaphTextComplete = true;
        floaterVM.endingTapVisible = true;
        floaterVM.endingOverlayOpacity = 1;
        console.log('[FloaterGame] Ending text completed via tap');
        return;
      }
      // Second tap: dismiss ending screen and return to gameplay
      console.log('[FloaterGame] Ending dismissed via tap → returning to LakeIdle');
      floaterVM.endingVisible = false;
      floaterVM.cgViewerVisible = false;
      // Increment cast index for the character whose ending just completed
      this.currentCastIndex++;
      this.perFishCastIndex[this.fish.id] = this.currentCastIndex;
      // CRITICAL: Flush immediately (cast index advancement is critical state)
      this.saveSystem.flushImmediate(() => this.buildSaveData());
      this.enterLakeIdle();
      return;
    }

    if (this.phase === GamePhase.LakeIdle) {
      // Only allow cast drag when in aiming mode (after Cast button tapped)
      if (!this.isInCastAiming) return;
      const pos = this.screenToCanvas(payload.screenPosition);
      this.isCastTouching = true;
      this.castTouchStartY = pos.y;
      this.castTouchStartX = pos.x;
      this.castTrajectoryDistance = 0.5;
      this.castTrajectoryOffsetX = 0;
      // Immediately compute landing point at center so trajectory preview shows on first frame
      const startLanding = this.computePhysicsLandingPoint(0.5, 0);
      this.previewLandingX = startLanding.x;
      this.previewLandingY = startLanding.y;
      // Hide cast instruction once drag starts
      floaterVM.castInstructionVisible = false;
      return;
    }



    if (this.phase === GamePhase.Departure) {
      if (this.isTextComplete) { this.advanceDepartureDialogue(); }
      else { this.completeCurrentText(); }
      return;
    }

    if (this.phase === GamePhase.Exchange || this.phase === GamePhase.FishReaction) {
      // GUARD: During beat pause, currentLines is empty and isTextComplete may be true.
      // Don't advance dialogue in that state — wait for startNextBeat to fire.
      if (this.beatPauseTimer > 0) {
        console.log('[FloaterGame] Tap ignored during beat pause');
        return;
      }
      if (this.isTextComplete) { this.advanceDialogue(); }
      else { this.completeCurrentText(); }
    }
  }

  @subscribe(OnFocusedInteractionInputMovedEvent)
  onTouchMove(payload: OnFocusedInteractionInputEventPayload): void {
    if (payload.interactionIndex !== 0) return;
    if (!this.isCastTouching || this.phase !== GamePhase.LakeIdle) return;

    const pos = this.screenToCanvas(payload.screenPosition);
    // Moving finger DOWN (increasing Y) = more distance (further cast)
    const deltaY = this.castTouchStartY - pos.y;
    // Normalize: positive deltaY means further cast, clamped 0..1
    const rawDistance = (deltaY * CAST_TRAJ_DRAG_SENSITIVITY) / (CANVAS_HEIGHT * 0.3);
    this.castTrajectoryDistance = Math.max(0, Math.min(1, 0.5 + rawDistance));

    // Horizontal offset: moving finger left/right from start position
    const deltaX = pos.x - this.castTouchStartX;
    const rawOffsetX = (deltaX * CAST_TRAJ_X_SENSITIVITY) / (CANVAS_WIDTH * 0.5);
    this.castTrajectoryOffsetX = Math.max(-1, Math.min(1, rawOffsetX));

    // Compute physics-accurate landing point for preview curve
    const landing = this.computePhysicsLandingPoint(this.castTrajectoryDistance, this.castTrajectoryOffsetX);
    this.previewLandingX = landing.x;
    this.previewLandingY = landing.y;
  }

  @subscribe(OnFocusedInteractionInputEndedEvent)
  onTouchEnd(payload: OnFocusedInteractionInputEventPayload): void {
    if (payload.interactionIndex !== 0) return;

    // === 3D Ballistic Flight Launch: If in LakeIdle with a valid trajectory, launch the float ===
    // isCastTouching guard ensures we only launch when the touch STARTED during LakeIdle
    // (prevents spurious casts when a tap dismisses Ending/NothingBites and transitions to LakeIdle mid-touch)
    if (this.phase === GamePhase.LakeIdle && this.isCastTouching && this.castTrajectoryDistance >= 0) {
      const distance = this.castTrajectoryDistance;
      const xOffset = this.castTrajectoryOffsetX;

      // Compute 2D landing target (same logic as trajectory preview)
      const startX = CAST_TRAJ_START_X;
      const startY = CAST_TRAJ_START_Y;
      const centerX = CANVAS_WIDTH / 2;
      const xRange = (CAST_TRAJ_LANDING_MAX_X - CAST_TRAJ_LANDING_MIN_X) / 2;
      const rawEndX = centerX + xOffset * xRange;
      const endX = Math.max(CAST_TRAJ_LANDING_MIN_X, Math.min(CAST_TRAJ_LANDING_MAX_X, rawEndX));
      const endY = CAST_TRAJ_LANDING_NEAR_Y + distance * (CAST_TRAJ_LANDING_FAR_Y - CAST_TRAJ_LANDING_NEAR_Y);

      // Unproject start and end to 3D space
      const start3D = this.unproject2Dto3D(startX, startY, 1.0);
      const target3D = this.unproject2Dto3D(endX, endY, 1.0);

      // Flight time: higher distance (power) = shorter time
      const flightTime = CAST_3D_CALC_MAX_FLIGHT_TIME + distance * (CAST_3D_CALC_MIN_FLIGHT_TIME - CAST_3D_CALC_MAX_FLIGHT_TIME);

      // Calculate ballistic velocity, then boost Y for dramatic arc
      const velocity = this.calculateBallisticVelocity(start3D, target3D, flightTime);
      velocity.y *= CAST_3D_Y_BOOST_MULTIPLIER;

      // Set 3D flight state
      this.floater3DPos = start3D;
      this.floater3DVel = velocity;
      this.isBezierFlying = true;
      this.bezierFlightT = 0;
      // Store bezier duration as our estimated flight time (used by updateCastFlight)
      this.bezierFlightDuration = flightTime;

      // Store landing targets for onFloatLanded
      this.landingTargetX = endX;
      this.landingTargetY = endY;
      this.lastCastPower = distance * 100; // 0-100 scale

      // Initialize Verlet rope: distribute particles from rod tip to float start position
      const rodTip3D = this.unproject2Dto3D(POV_LINE_START_X, POV_LINE_START_Y, 1.2);
      this.verletPositions = [];
      this.verletPrevPositions = [];
      for (let i = 0; i < VERLET_ROPE_NUM_PARTICLES; i++) {
        const t = i / (VERLET_ROPE_NUM_PARTICLES - 1);
        const pos = new Vec3D(
          rodTip3D.x + (start3D.x - rodTip3D.x) * t,
          rodTip3D.y + (start3D.y - rodTip3D.y) * t,
          rodTip3D.z + (start3D.z - rodTip3D.z) * t
        );
        this.verletPositions.push(pos);
        this.verletPrevPositions.push(pos.clone());
      }

      // Project initial position to set castFloat screen coords
      const projected = this.project3Dto2D(start3D);
      this.castFloatX = projected.x;
      this.castFloatY = projected.y;
      this.castFloatScale = projected.scale;
      this.prevCastFloatScreenX = projected.x;
      this.prevCastFloatScreenY = projected.y;

      // Transition to CastFlying phase
      this.phase = GamePhase.CastFlying;
      this.castFlightT = 0;

      // Track lure usage for quest system
      if (this.equippedLureId) {
        this.questSystem.recordLureUsed(this.equippedLureId);
      }

      // Disable idle buttons (same as onCastStart)
      floaterVM.idleBaitBtnEnabled = false;
      floaterVM.idleCastBtnEnabled = false;
      floaterVM.idleJournalBtnEnabled = false;
      this.hideIdleBar();

      console.log(`[FloaterGame] 3D Ballistic flight launched: distance=${distance.toFixed(2)}, endX=${endX.toFixed(0)}, endY=${endY.toFixed(0)}, flightTime=${flightTime.toFixed(2)}s`);
    }

    const wasCastTouching = this.isCastTouching;
    this.isCastTouching = false;
    this.castTrajectoryDistance = 0;
    this.castTrajectoryOffsetX = 0;

    // Exit aiming mode ONLY if this touch-end corresponds to an actual cast drag
    // (wasCastTouching true). If false, this touch-end is from the Cast button tap itself
    // and should NOT cancel aiming mode.
    if (this.isInCastAiming && wasCastTouching) {
      this.isInCastAiming = false;
      floaterVM.castInstructionVisible = false;
      // If the touch was too short to launch (no valid trajectory), restore idle bar
      if (this.phase === GamePhase.LakeIdle) {
        this.showIdleBar();
      }
    }
  }

  // === Phase Logic ===
  private updateFadeTransition(dt: number): void {
    if (this.fadeState === 'none') return;

    this.fadeTimer += dt;

    if (this.fadeState === 'fading_out') {
      this.fadeAlpha = Math.min(1, this.fadeTimer / FADE_OUT_DURATION);
      if (this.fadeAlpha >= 1) {
        // Fully black — switch state and start fade-in
        this.fadeAlpha = 1;
        this.fadeState = 'fading_in';
        this.fadeTimer = 0;
        // Perform the actual state transition while screen is black
        floaterVM.titleVisible = false;
        if (!this.flagSystem.check('run.intro_seen')) {
          this.startIntro();
        } else {
          this.enterLakeIdle();
        }
        console.log('[FloaterGame] Fade out complete → entering LakeIdle, fading in');
      }
    } else if (this.fadeState === 'fading_in') {
      this.fadeAlpha = Math.max(0, 1 - this.fadeTimer / FADE_IN_DURATION);
      if (this.fadeAlpha <= 0) {
        this.fadeAlpha = 0;
        this.fadeState = 'none';
        console.log('[FloaterGame] Fade in complete');
      }
    }
  }

  private updateDayNightFade(dt: number): void {
    if (this.dayNightFadeState === 'none') return;

    const DAY_NIGHT_FADE_DURATION = 0.25;
    this.dayNightFadeTimer += dt;

    if (this.dayNightFadeState === 'fading_out') {
      this.dayNightFadeAlpha = Math.min(1, this.dayNightFadeTimer / DAY_NIGHT_FADE_DURATION);
      if (this.dayNightFadeAlpha >= 1) {
        this.dayNightFadeAlpha = 1;
        this.dayNightFadeState = 'fading_in';
        this.dayNightFadeTimer = 0;
        // Swap background while screen is black
        this.isDayMode = !this.isDayMode;
        floaterVM.isDayMode = this.isDayMode;
        floaterVM.dayNightButtonRotation = this.isDayMode ? 180 : 0;
        console.log(`[FloaterGame] Day/Night swap: isDayMode=${this.isDayMode}`);
      }
    } else if (this.dayNightFadeState === 'fading_in') {
      this.dayNightFadeAlpha = Math.max(0, 1 - this.dayNightFadeTimer / DAY_NIGHT_FADE_DURATION);
      if (this.dayNightFadeAlpha <= 0) {
        this.dayNightFadeAlpha = 0;
        this.dayNightFadeState = 'none';
        console.log('[FloaterGame] Day/Night fade complete');
      }
    }
  }

  private updatePhase(dt: number): void {
    switch (this.phase) {
      case GamePhase.CastFlying: this.updateCastFlight(dt); break;
      case GamePhase.FloatLanded: this.updateFloatLanded(dt); break;
      case GamePhase.FloatBounce: this.updateFloatBounce(dt); break;
      case GamePhase.NothingBites:
        this.nothingBitesTimer -= dt;
        this.updateTypewriter(dt);
        this.updateSkip(dt);
        if (this.nothingBitesTimer <= 0) {
          console.log('[FloaterGame] Nothing bites timer expired → LakeIdle');
          floaterVM.dialogueVisible = false;
          this.enterLakeIdle();
        }
        break;
      case GamePhase.Approach:
        this.phaseTimer += dt;
        // Sequenced approach: portrait starts fading in after delay
        if (this.phaseTimer >= this.approachPortraitDelay) {
          const fadeElapsed = this.phaseTimer - this.approachPortraitDelay;
          const fadeDuration = 0.5; // 0.5s fade-in
          this.fishAlpha = Math.min(1, fadeElapsed / fadeDuration);
        } else {
          this.fishAlpha = 0;
        }
        // Spawn emotion icon after delay (once)
        if (!this.approachEmotionSpawned && this.phaseTimer >= this.approachEmotionDelay) {
          this.approachEmotionSpawned = true;
          this.spawnEmotionIcon(EmotionIconType.Hesitation);
        }
        if (this.phaseTimer >= APPROACH_DURATION) this.enterExchange();
        break;
      case GamePhase.Exchange: this.updateTypewriter(dt); this.updateSkip(dt); break;
      case GamePhase.FishReaction: this.updateTypewriter(dt); this.updateSkip(dt); break;
      case GamePhase.ActionSelect:
        // Action choices always require explicit player input — cancel any
        // active fast-forward so the player doesn't blow past their own choice.
        if (this.skipActive) this.cancelSkip();
        // Update silent beat timer during ActionSelect
        if (this.silentBeatActive && !this.silentBeatUnlocked) {
          this.silentBeatTimer += dt;
          if (this.silentBeatTimer >= this.silentBeatDuration) {
            this.silentBeatUnlocked = true;
            floaterVM.actionTwitchEnabled = true;
            floaterVM.actionDriftEnabled = true;
            floaterVM.actionReelEnabled = true;
            console.log('[FloaterGame] Silent beat timer expired — all actions unlocked');
          }
        }
        break;
      case GamePhase.Departure:
        this.phaseTimer += dt;
        this.updateTypewriter(dt);
        this.updateSkip(dt);
        // Character stays fully visible during departure dialogue.
        // Fade out only starts when showing the LAST departure line.
        if (this.currentLineIndex >= this.currentLines.length - 1) {
          this.departureFadeTimer += dt;
          this.fishAlpha = Math.max(0, 1 - this.departureFadeTimer / DEPARTURE_DURATION);
          // Auto-finalize once the fish has fully faded AND the last line's
          // typewriter has finished. The player can still tap during the fade
          // to advance immediately (existing onTouchStart path), but if they
          // wait, we transition to LakeIdle automatically — no extra tap
          // required at the end of a cast.
          if (this.isTextComplete
              && this.departureFadeTimer >= DEPARTURE_DURATION
              && this.fishAlpha <= 0) {
            this.advanceDepartureDialogue();
          }
        } else {
          this.fishAlpha = 1;
        }
        break;
      case GamePhase.Ending:
        this.updateEpitaphAnimation(dt);
        break;
      default: break;
    }

    if (this.beatPauseTimer > 0) {
      this.beatPauseTimer -= dt;
      if (this.beatPauseTimer <= 0) {
        this.beatPauseTimer = 0;
        // GUARD: Only fire startNextBeat if we're still in Exchange phase waiting for next beat.
        // If the player tapped during the pause and triggered a phase change (ActionSelect, Departure, etc.),
        // we must NOT call startNextBeat — the game has already moved on.
        if (this.phase === GamePhase.Exchange) {
          this.startNextBeat();
        } else {
          console.log(`[FloaterGame] beatPauseTimer expired but phase is ${this.phase}, skipping startNextBeat`);
        }
      }
    }
    if (this.noLureWarningTimer > 0) {
      this.noLureWarningTimer -= dt;
      if (this.noLureWarningTimer <= 0) { this.noLureWarningTimer = 0; floaterVM.noLureWarningVisible = false; }
    }
  }

  private updateTypewriter(dt: number): void {
    if (this.isTextComplete) return;
    const currentFullText = this.currentLines[this.currentLineIndex] || '';
    this.textProgress += dt;
    const charsToShow = Math.floor(this.textProgress / TEXT_DISPLAY_SPEED);
    if (charsToShow >= currentFullText.length) {
      this.displayedText = currentFullText;
      this.isTextComplete = true;
    } else {
      this.displayedText = currentFullText.substring(0, charsToShow);
    }
  }

  private updateFloat(dt: number): void {
    if (this.floatDip > 0) this.floatDip = Math.max(0, this.floatDip - dt * 20);
  }

  /** Update epitaph overlay: fade-in + typewriter text effect */
  private updateEpitaphAnimation(dt: number): void {
    // Fade in the overlay
    this.epitaphFadeTimer += dt;
    const fadeProgress = Math.min(1, this.epitaphFadeTimer / this.EPITAPH_FADE_DURATION);
    floaterVM.endingOverlayOpacity = fadeProgress;

    // Typewriter: only start after fade reaches 30% so text doesn't appear too early
    if (fadeProgress >= 0.3 && !this.epitaphTextComplete) {
      this.epitaphTextProgress += dt;
      const charsToShow = Math.floor(this.epitaphTextProgress / this.EPITAPH_TEXT_SPEED);
      if (charsToShow >= this.epitaphFullText.length) {
        floaterVM.endingText = this.epitaphFullText;
        this.epitaphTextComplete = true;
        floaterVM.endingTapVisible = true;
      } else {
        floaterVM.endingText = this.epitaphFullText.substring(0, charsToShow);
      }
    }
  }

  // === Character Ripples (expansion + fade) ===
  private updateCharacterRipples(dt: number): void {
    // Only spawn/update when portrait is visible
    if (this.fishAlpha <= 0) {
      this.characterRipples = [];
      this.charRippleSpawnTimer = 0;
      return;
    }

    // Spawn new ripples periodically
    this.charRippleSpawnTimer += dt;
    if (this.charRippleSpawnTimer >= CHAR_RIPPLE_SPAWN_INTERVAL) {
      this.charRippleSpawnTimer -= CHAR_RIPPLE_SPAWN_INTERVAL;
      const centerX = FISH_PORTRAIT_X + this.portraitOffsetX + FISH_PORTRAIT_SIZE / 2;
      const rippleY = FISH_PORTRAIT_Y + this.portraitOffsetY + FISH_PORTRAIT_SIZE * 0.5;
      this.characterRipples.push({ x: centerX, y: rippleY, radius: 0, maxRadius: CHAR_RIPPLE_MAX_RADIUS, alpha: 1 });
    }

    // Update existing ripples (expand + fade)
    for (let i = this.characterRipples.length - 1; i >= 0; i--) {
      const ripple = this.characterRipples[i];
      ripple.radius += CHAR_RIPPLE_EXPAND_SPEED * dt;
      ripple.alpha = Math.max(0, 1 - ripple.radius / ripple.maxRadius);
      if (ripple.alpha <= 0) {
        this.characterRipples.splice(i, 1);
      }
    }
  }

  // === Float Idle Ripples (periodic expansion + fade while float is stationary) ===
  private updateFloatIdleRipples(dt: number): void {
    // Determine if float is stationary (same phases as showStaticFloat in render + Title)
    const showStaticFloat = this.phase === GamePhase.Title
      || this.phase === GamePhase.FloatBounce
      || this.phase === GamePhase.Approach
      || this.phase === GamePhase.Exchange
      || this.phase === GamePhase.ActionSelect
      || this.phase === GamePhase.FishReaction
      || this.phase === GamePhase.Departure
      || this.phase === GamePhase.NothingBites;

    if (!showStaticFloat) {
      // Reset when float is not visible
      this.floatIdleRipples = [];
      this.floatIdleRippleTimer = 0;
      return;
    }

    // For Title phase, use a fixed center position
    const rippleX = this.phase === GamePhase.Title ? CANVAS_WIDTH / 2 : this.landingTargetX;
    const rippleY = this.phase === GamePhase.Title ? 570 : this.landingTargetY;

    // Spawn new ripple periodically
    this.floatIdleRippleTimer += dt;
    if (this.floatIdleRippleTimer >= FLOAT_IDLE_RIPPLE_INTERVAL) {
      this.floatIdleRippleTimer -= FLOAT_IDLE_RIPPLE_INTERVAL;
      this.floatIdleRipples.push({
        x: rippleX,
        y: rippleY + 12, // Descend de 12px pour être au niveau de l'eau
        radius: 0,
        maxRadius: FLOAT_IDLE_RIPPLE_MAX_RADIUS,
        alpha: 1,
      });
    }

    // Update existing ripples (expand + fade)
    for (let i = this.floatIdleRipples.length - 1; i >= 0; i--) {
      const ripple = this.floatIdleRipples[i];
      ripple.radius += FLOAT_IDLE_RIPPLE_EXPAND_SPEED * dt;
      ripple.alpha = Math.max(0, 1 - ripple.radius / ripple.maxRadius);
      if (ripple.alpha <= 0) {
        this.floatIdleRipples.splice(i, 1);
      }
    }
  }

  // === Portrait Animation ===
  private triggerPortraitAnimation(type: 'shake' | 'bounce', duration: number): void {
    this.portraitAnimType = type;
    this.portraitAnimTimer = 0;
    this.portraitAnimDuration = duration;
    this.portraitOffsetX = 0;
    this.portraitOffsetY = 0;
  }

  private updatePortraitAnimation(dt: number): void {
    if (this.portraitAnimType === 'none') return;

    this.portraitAnimTimer += dt;
    const progress = Math.min(1, this.portraitAnimTimer / this.portraitAnimDuration);

    if (progress >= 1) {
      this.portraitAnimType = 'none';
      this.portraitOffsetX = 0;
      this.portraitOffsetY = 0;
      return;
    }

    // Decay envelope (stronger at start, fades out)
    const decay = 1 - progress;

    if (this.portraitAnimType === 'shake') {
      // Quick horizontal shake using sine wave with decay
      const frequency = 30; // Hz - fast shaking
      const amplitude = 4 * decay; // pixels max offset
      this.portraitOffsetX = Math.sin(this.portraitAnimTimer * frequency) * amplitude;
      this.portraitOffsetY = 0;
    } else if (this.portraitAnimType === 'bounce') {
      // Vertical bounce using abs(sin) with decay
      const frequency = 12; // Hz
      const amplitude = 5 * decay; // pixels max offset
      this.portraitOffsetY = -Math.abs(Math.sin(this.portraitAnimTimer * frequency)) * amplitude;
      this.portraitOffsetX = 0;
    }
  }

  // === Cast Management ===
  private startCast(): void {
    this.castCount++;
    this.currentBeatIndex = 0;

    // Snapshot flags at cast start for detecting newly discovered facts later
    this.flagsAtCastStart = { ...this.flagSystem.serialize() };

    // Use pre-determined encounter result from enterFloatBounce()
    const encounter = this.pendingEncounter;
    this.pendingEncounter = null;
    const selectedCharacter = encounter?.character ?? null;

    if (!selectedCharacter) {
      // Nothing bites — no fish matches zone/lure conditions
      console.log('[FloaterGame] Nothing bites — entering NothingBites phase');
      this.phase = GamePhase.NothingBites;
      this.nothingBitesTimer = NOTHING_BITES_DURATION;
      this.currentLines = ['Nothing bites...'];
      this.currentLineIndex = 0;
      this.startNewLine();
      floaterVM.dialogueVisible = true;
      // Clear any leftover floating icons — no fish, no reactions
      this.floatingIcons = [];
      // Reset portrait animation so nothing bobs/shakes
      this.portraitAnimType = 'none';
      this.portraitOffsetX = 0;
      this.portraitOffsetY = 0;
      return;
    }

    // Surprise emoji was already spawned in enterFloatBounce() at bob start
    console.log('[FloaterGame] Fish confirmed — proceeding with approach');

    // Initialize or restore fish state for selected character
    if (this.fish.id !== selectedCharacter.id) {
      // Save current fish's live state into savedFishRecords before switching
      this.savedFishRecords[this.fish.id] = {
        affection: this.fishAffection.value,
        drift: this.fish.currentDrift,
      };

      this.fish = selectedCharacter.initialState();
      // Restore affection from savedFishRecords (populated during loadGame)
      const savedFishData = this.savedFishRecords[selectedCharacter.id];
      if (savedFishData) {
        this.fish.affection = savedFishData.affection;
        this.fish.currentDrift = savedFishData.drift;
        this.fishAffection = this.affectionSystem.restoreFromSave(selectedCharacter.id, {
          value: savedFishData.affection,
          peakValue: savedFishData.peakValue ?? savedFishData.affection,
          lastChangeSessionId: savedFishData.lastChangeSessionId ?? '',
          lastChangeDelta: savedFishData.lastChangeDelta ?? 0,
        });
        console.log(`[FloaterGame] Restored ${selectedCharacter.id} from saved records: affection=${savedFishData.affection}`);
      } else {
        this.fishAffection = this.affectionSystem.createAffection(selectedCharacter.id);
        console.log(`[FloaterGame] No saved data for ${selectedCharacter.id}, starting fresh`);
      }
      this.displayedAffectionLabel = this.affectionSystem.getAffectionLabel(this.fishAffection.value);
    }

    // Recipe-driven dispatch: ask Ink's <fishId>_entry knot to route to the
    // right cast based on `from.<fishId>.<recipeId>` flags. The encounter
    // system set that flag in enterFloatBounce(); after dispatch, we clear
    // every `from.<fishId>.*` so the signal doesn't linger.
    //
    // We also expose the fish's previous departure drift as a synthetic
    // string flag `mood.<fishId>.last_drift` so Ink bridge dialogues can
    // branch on it (e.g. `{ mood.fugu.last_drift == "WARY" : ... }`).
    // It's ephemeral — not persisted via `serialize()`; re-derived from
    // `fish.currentDrift` (which IS persisted) every time we dispatch.
    const lastDriftKey = `mood.${this.fish.id}.last_drift`;
    // DriftState enum values are 'DRIFT_X' / 'none'. Normalize to the bare
    // uppercase token used in Ink (`#drift:WARY` and `== "WARY"`).
    const driftToken = this.fish.currentDrift === DriftState.None
      ? 'NONE'
      : this.fish.currentDrift.replace(/^DRIFT_/, '');
    this.flagSystem.set(lastDriftKey, driftToken);

    const totalCasts = getCastCount(this.fish.id);
    this.currentCastIndex = Math.min(this.perFishCastIndex[this.fish.id] ?? 0, Math.max(0, totalCasts - 1));

    const startNodeId = resolveFishEntryKnot(this.fish.id, this.flagSystem);

    if (!startNodeId) {
      // Defensive: missing entry knot or no matching branch. Fall back to
      // the legacy index-based cast for now so we don't crash mid-play.
      console.error(`[FloaterGame] No entry-knot dispatch for ${this.fish.id}; falling back to index ${this.currentCastIndex}.`);
      this.beats = getBeats(this.currentCastIndex, this.fish.id);
    } else {
      console.log(`[FloaterGame] startCast: castCount=${this.castCount}, recipe="${encounter!.recipe.id}" → entry dispatched to "${startNodeId}"`);
      // Build beats with flags so bridge dialogues (e.g. `{ mood.fugu.last_drift == "WARY" : ... }`)
      // evaluate against current state. Must happen BEFORE we clear last_drift.
      this.beats = buildBeatsFromInk(this.fish.id, startNodeId, this.flagSystem).map((b: Beat) => ({ ...b, seen: false }));
    }

    // Clear every `from.<fishId>.*` one-shot signal — they've now been read
    // by the dispatcher and by the bridge-aware beat builder. Doing this in
    // the engine means Ink dispatchers no longer need explicit
    // `~ from.fugu.X = false` lines.
    const fromPrefix = `from.${this.fish.id}.`;
    for (const key of Object.keys(this.flagSystem.serialize())) {
      if (key.startsWith(fromPrefix)) this.flagSystem.clear(key);
    }
    // last_drift is also ephemeral — clear so it doesn't leak into other paths.
    this.flagSystem.clear(lastDriftKey);
    console.log(`[FloaterGame] Loaded ${this.beats.length} beats for cast`);

    this.phase = GamePhase.Approach;
    this.phaseTimer = 0;
    this.fishAlpha = 0;
    this.approachEmotionSpawned = false;
    this.fish.currentExpression = ExpressionState.Neutral;
    this.hideIdleBar();

    floaterVM.hudVisible = true;
    floaterVM.fishNameText = this.getFishDisplayName();
    this.syncAffectionDisplay();

    console.log(`[FloaterGame] Cast #${this.castCount}, castIdx ${this.currentCastIndex}`);
  }

  private enterExchange(): void {
    this.phase = GamePhase.Exchange;
    // Skip button visible across all dialogue phases. Opacity reflects active
    // (1.0) vs idle (0.6) state; the per-frame updateSkip drives the rest.
    this.canSkip = true;
    floaterVM.skipButtonVisible = true;
    floaterVM.skipButtonOpacity = 1;
    this.startNextBeat();
  }

  private startNextBeat(): void {
    if (this.currentBeatIndex >= this.beats.length) {
      // Climax flags determine the narrative ending. Reel takes priority over
      // Release if both happen to be set (defensive — the Ink author should
      // set only one). See climax beats in Story_<fish>.ts.
      if (this.flagSystem.check(`${this.fish.id}.catch_available`)) {
        this.triggerEnding(EndingType.Reel);
      } else if (this.flagSystem.check(`${this.fish.id}.release_ready`)) {
        this.triggerEnding(EndingType.Release);
      } else {
        this.enterDeparture(this.fish.currentDrift || DriftState.Warm);
      }
      return;
    }

    const beat = this.beats[this.currentBeatIndex];
    console.log(`[FloaterGame] startNextBeat: beatIndex=${this.currentBeatIndex}, beatId="${beat.beatId}", firstLine="${beat.fishLines[0]}"`);
    // Skip button visibility is managed by enterExchange() — always visible during Exchange

    // Push per-action intent tooltips for this Beat (optional, contextual).
    // Falls back to the action name (Wait/Twitch/Drift/Reel) for debug visibility
    // when the author hasn't written a context-specific intent yet.
    floaterVM.setActionIntents(
      beat.actionEffects[ActionId.Wait]?.intent ?? 'Wait',
      beat.actionEffects[ActionId.Twitch]?.intent ?? 'Twitch',
      beat.actionEffects[ActionId.Drift]?.intent ?? 'Drift',
      beat.actionEffects[ActionId.Reel]?.intent ?? 'Reel',
    );

    // Handle silent beat (Four Minutes mechanic)
    if (beat.silentBeat) {
      console.log(`[FloaterGame] Silent beat detected: ${beat.silentBeatDurationSec ?? 240}s`);
      this.silentBeatActive = true;
      this.silentBeatTimer = 0;
      this.silentBeatDuration = beat.silentBeatDurationSec ?? 240;
      this.silentBeatUnlocked = false;
      // Show scenery line then go to ActionSelect with restricted buttons
      this.phase = GamePhase.Exchange;
      this.currentLines = beat.fishLines;
      this.currentLineIndex = 0;
      this.startNewLine();
      return;
    }

    this.phase = GamePhase.Exchange;
    this.currentLines = beat.fishLines;
    this.currentLineIndex = 0;
    this.startNewLine();
  }

  private startNewLine(): void {
    this.textProgress = 0;
    this.displayedText = '';
    this.isTextComplete = false;
  }

  private advanceDialogue(): void {
    if (this.isShowingReaction) {
      // Advance through all reaction lines before moving to next beat
      this.currentLineIndex++;
      if (this.currentLineIndex >= this.currentLines.length) {
        // All reaction lines shown — advance to next beat
        // Keep selected button state persistent (don't reset until new choices appear)
        this.isShowingReaction = false;
        this.currentBeatIndex++;

        const beat = this.beats[this.currentBeatIndex - 1];
        this.seenBeats.add(beat.beatId);
        this.saveSystem.requestSave();

        // Climax flag dispatch: catch_available → Reel, release_ready → Release.
        // A terminal choice (-> END in Ink) ends the cast regardless of beat
        // position — an early wrong choice in a multi-beat puzzle is just as
        // terminal as reaching the last beat.
        if (this.flagSystem.check(`${this.fish.id}.catch_available`)) {
          this.triggerEnding(EndingType.Reel);
        } else if (this.flagSystem.check(`${this.fish.id}.release_ready`)) {
          this.triggerEnding(EndingType.Release);
        } else if (this.currentReactionIsTerminal) {
          // Ink-driven departure: goodbye lines were already part of the
          // reaction. Skip the side-table lookup and go straight to the
          // visual fade-out.
          this.enterInkDeparture(this.fish.currentDrift || DriftState.Warm);
        } else if (this.currentBeatIndex >= this.beats.length) {
          this.enterDeparture(this.fish.currentDrift || DriftState.Warm);
        } else {
          this.beatPauseTimer = BEAT_PAUSE_DURATION;
          this.phase = GamePhase.Exchange;
          // Keep currentLines and displayedText intact so dialogue box stays visible
          this.isTextComplete = false; // Prevent premature advance during pause
        }
      } else {
        // More reaction lines to show
        this.startNewLine();
      }
      return;
    }

    this.currentLineIndex++;
    if (this.currentLineIndex >= this.currentLines.length) {
      // No-choice beat (monologue): auto-advance without showing action buttons
      const currentBeat = this.beats[this.currentBeatIndex];
      if (currentBeat && Object.keys(currentBeat.actionEffects).length === 0) {
        this.seenBeats.add(currentBeat.beatId);
        this.saveSystem.requestSave();
        this.currentBeatIndex++;
        if (this.currentBeatIndex >= this.beats.length) {
          // Climax flag dispatch: catch_available → Reel, release_ready → Release.
          if (this.flagSystem.check(`${this.fish.id}.catch_available`)) {
            this.triggerEnding(EndingType.Reel);
          } else if (this.flagSystem.check(`${this.fish.id}.release_ready`)) {
            this.triggerEnding(EndingType.Release);
          } else {
            this.enterDeparture(this.fish.currentDrift || DriftState.Warm);
          }
        } else {
          this.beatPauseTimer = BEAT_PAUSE_DURATION;
          this.phase = GamePhase.Exchange;
          this.isTextComplete = false;
        }
        return;
      }

      // If this is a silent beat, enter ActionSelect with restricted buttons
      if (this.silentBeatActive && !this.silentBeatUnlocked) {
        this.phase = GamePhase.ActionSelect;
        this.showActionButtons();
        floaterVM.actionWaitEnabled = true;
        floaterVM.actionTwitchEnabled = false;
        floaterVM.actionDriftEnabled = false;
        floaterVM.actionReelEnabled = false;
        this.canSkip = false; floaterVM.skipButtonVisible = false; floaterVM.skipButtonOpacity = 0;
      } else {
        this.phase = GamePhase.ActionSelect;
        this.showActionButtons();
        floaterVM.actionWaitEnabled = true;
        floaterVM.actionTwitchEnabled = true;
        floaterVM.actionDriftEnabled = true;
        floaterVM.actionReelEnabled = true;
        this.canSkip = false; floaterVM.skipButtonVisible = false; floaterVM.skipButtonOpacity = 0;
      }
    } else {
      this.startNewLine();
    }
  }

  private completeCurrentText(): void {
    const currentFullText = this.currentLines[this.currentLineIndex] || '';
    this.displayedText = currentFullText;
    this.isTextComplete = true;
  }

  private handleAction(actionId: ActionId): void {
    // Catch/Release endings are now driven exclusively by narrative climax
    // flags (`catch_available` / `release_ready`) set on the final cast's
    // terminal choice. There is no longer an "instant Reel at max affection"
    // shortcut — the ending always emerges from a written, chosen moment.

    const beat = this.beats[this.currentBeatIndex];
    const effect = beat.actionEffects[actionId];
    if (!effect) return;

    // Reset silent beat state after action is taken
    if (this.silentBeatActive) {
      console.log(`[FloaterGame] Silent beat action: ${actionId}, unlocked=${this.silentBeatUnlocked}, timer=${this.silentBeatTimer.toFixed(1)}s`);
      this.silentBeatActive = false;
    }

    // Set buttons to responding state (selected highlighted, others dimmed & disabled)
    this.setActionButtonsResponding(actionId);

    // Apply affection
    this.affectionSystem.applyDelta(this.fishAffection, effect.affectionDelta, this.sessionId);
    this.fish.affection = this.fishAffection.value;

    // Apply expression and drift
    this.fish.currentExpression = effect.resultExpression;
    if (effect.resultDrift) this.fish.currentDrift = effect.resultDrift;

    // Set flags
    if (effect.flagsToSet) {
      for (const flag of effect.flagsToSet) { this.flagSystem.set(flag, true); }
    }
    // Clear flags — RESET TO DEFAULT semantics.
    //   `#clear-flag:X` removes the flag entirely. For `recipe.X` flags whose
    //   recipe is `initial:true`, this RE-ACTIVATES the recipe (loops back to
    //   home). To explicitly DISABLE a recipe (tier closure), use
    //   `#disable-flag:X` instead.
    if (effect.flagsToClear) {
      for (const flag of effect.flagsToClear) { this.flagSystem.clear(flag); }
    }
    // Disable flags — EXPLICIT FALSE semantics.
    //   `#disable-flag:X` stores false so `isRecipeActive` returns false even
    //   for `initial:true` recipes. Used at tier transitions to permanently
    //   close a recipe slot.
    if (effect.flagsToDisable) {
      for (const flag of effect.flagsToDisable) { this.flagSystem.set(flag, false); }
    }

    // Spawn emotion icon
    if (effect.emotionIcon && effect.emotionIcon !== EmotionIconType.None) {
      this.spawnEmotionIcon(effect.emotionIcon);
    }

    // Animate float
    this.animateAction(actionId);

    // Show reaction
    this.phase = GamePhase.FishReaction;
    this.isShowingReaction = true;
    this.currentReactionIsTerminal = effect.terminal === true;
    this.currentLines = effect.responseLines;
    this.currentLineIndex = 0;
    this.startNewLine();
    // Re-enable skip for reaction dialogue (ActionSelect cleared it).
    this.canSkip = true;
    floaterVM.skipButtonVisible = true;
    floaterVM.skipButtonOpacity = 1;

    // Update HUD
    this.syncAffectionDisplay();
  }

  private advanceBeat(): void {
    this.currentBeatIndex++;
    this.seenBeats.add(this.beats[this.currentBeatIndex - 1].beatId);
    floaterVM.skipButtonVisible = false;
    this.canSkip = false;

    if (this.currentBeatIndex >= this.beats.length) {
      this.enterDeparture(DriftState.Warm);
    } else {
      this.beatPauseTimer = BEAT_PAUSE_DURATION;
      // Keep currentLines and displayedText intact so dialogue box stays visible
      this.isTextComplete = false; // Prevent premature advance during pause
    }
  }

  private enterDeparture(drift: DriftState): void {
    this.phase = GamePhase.Departure;
    this.phaseTimer = 0;
    this.departureFadeTimer = 0;
    // Fix: DriftState.None is truthy ('none'), so || fallback doesn't work.
    // Explicitly default to Warm if drift is None or not in departures map.
    const effectiveDrift = (drift === DriftState.None) ? DriftState.Warm : drift;
    this.fish.currentDrift = effectiveDrift;
    this.hideActionButtons();
    // Departure is short, auto-finalizes after the fade, and is meant to be
    // watched — hide the skip button entirely here.
    this.canSkip = false;
    this.skipActive = false;
    this.skipAdvanceTimer = 0;
    floaterVM.skipButtonVisible = false;
    floaterVM.skipButtonOpacity = 0;

    // Clear emoji icons at the start of departure (they don't need to stay)
    this.floatingIcons = [];

    // Character stays fully visible until the last departure line
    this.fishAlpha = 1;

    // Get departure data from cast
    const cast = getCast(this.currentCastIndex, this.fish.id);
    const departureData = cast.departures[effectiveDrift] || cast.departures[DriftState.Warm];

    // Use tap-to-advance dialogue system for departure lines
    // NOTE: departure icon is NOT spawned since we clear icons at departure start
    if (departureData) {
      this.currentLines = departureData.dialogue;
      if (departureData.flagsToSet) {
        for (const flag of departureData.flagsToSet) { this.flagSystem.set(flag, true); }
      }
    } else {
      this.currentLines = ['*She drifts away...*'];
    }

    this.currentLineIndex = 0;
    this.startNewLine();

    // Don't show old departure overlay — use dialogue panel instead
    floaterVM.departureVisible = false;

    // Check affection threshold for Drift-Away ending
    if (this.fishAffection.value <= AFFECTION_DRIFT_AWAY_THRESHOLD) {
      console.log(`[FloaterGame] Affection ${this.fishAffection.value} <= ${AFFECTION_DRIFT_AWAY_THRESHOLD}, triggering Drift-Away`);
      this.triggerEnding(EndingType.DriftAway);
      return;
    }

    console.log(`[FloaterGame] Departure: ${drift}`);
  }

  /**
   * Ink-driven departure: the fish's goodbye lines were written inline in the
   * terminal choice's response (per Ink Authoring Guide §4.4) and have just
   * been spoken during the FishReaction phase. This skips the side-table
   * lookup, starts the visual fade immediately, and finalizes the cast on
   * the next player tap (same bookkeeping as advanceDepartureDialogue).
   */
  private enterInkDeparture(drift: DriftState): void {
    this.phase = GamePhase.Departure;
    this.phaseTimer = 0;
    this.departureFadeTimer = 0;
    const effectiveDrift = (drift === DriftState.None) ? DriftState.Warm : drift;
    this.fish.currentDrift = effectiveDrift;
    this.hideActionButtons();
    floaterVM.skipButtonVisible = false;
    this.floatingIcons = [];
    this.fishAlpha = 1;

    // No extra dialogue — goodbye already shown. Single empty "line" so the
    // existing tap-to-advance flow finalizes the cast on the next tap, and
    // the Departure-phase fade-out logic (`lineIndex >= length - 1`) starts
    // immediately.
    this.currentLines = [''];
    this.currentLineIndex = 0;
    this.displayedText = '';
    this.isTextComplete = true;

    floaterVM.departureVisible = false;
    floaterVM.dialogueVisible = false;

    if (this.fishAffection.value <= AFFECTION_DRIFT_AWAY_THRESHOLD) {
      console.log(`[FloaterGame] Affection ${this.fishAffection.value} <= ${AFFECTION_DRIFT_AWAY_THRESHOLD}, triggering Drift-Away (ink path)`);
      this.triggerEnding(EndingType.DriftAway);
      return;
    }

    console.log(`[FloaterGame] Ink departure: ${drift}`);
  }

  private advanceDepartureDialogue(): void {
    console.log(`[FloaterGame] advanceDepartureDialogue: lineIdx=${this.currentLineIndex}, totalLines=${this.currentLines.length}, currentCastIndex=${this.currentCastIndex}`);
    this.currentLineIndex++;
    if (this.currentLineIndex >= this.currentLines.length) {
      // All departure lines shown — increment cast index (a global counter
      // for affection/tier display + stats). Narrative progression itself is
      // governed by Ink flags, not by this index.
      const oldIdx = this.currentCastIndex;
      this.currentCastIndex++;
      this.perFishCastIndex[this.fish.id] = this.currentCastIndex;
      console.log(`[FloaterGame] Departure complete, currentCastIndex: ${oldIdx} → ${this.currentCastIndex}`);

      // Track quest events: talked to fish and fish left
      this.questSystem.recordTalkedToFish(this.fish.id);
      this.questSystem.recordFishLeft(this.fish.id);

      // Track journal and stats for this Cast
      this.journalSystem.recordCast(
        this.fish.id,
        [this.fish.currentExpression]
      );
      // Unlock portrait CG on first encounter (silently)
      this.cgGallerySystem.unlockPortraitCG(this.fish.id);
      this.persistCGData();

      // Check for newly unlocked facts based on flags
      const newFacts = this.journalSystem.checkFactUnlocks(this.flagSystem.serialize(), this.flagsAtCastStart);
      if (newFacts.length > 0) {
        console.log('[FloaterGame] New facts discovered:', newFacts);
      }

      this.globalStatsSystem.recordCast(
        this.journalSystem.getAllFishEntries(),
        this.flagSystem.serialize()
      );

      // Update affection label at cast boundary (not mid-cast)
      this.displayedAffectionLabel = this.affectionSystem.getAffectionLabel(this.fishAffection.value);

      // CRITICAL: Flush save immediately at departure (no 0.5s delay)
      // to prevent data loss if a reload happens before the timer fires.
      this.saveSystem.flushImmediate(() => this.buildSaveData());
      this.enterLakeIdle();
    } else {
      this.startNewLine();
    }
  }



  // === Endings ===
  /**
   * Trigger the ending for the current fish. Each piece (CG, text screen) is
   * optional and shown only if the character declares it — NPCs without
   * endings just have their state advanced without any visual.
   */
  private triggerEnding(type: EndingType): void {
    // Track journal/CG/stats (same as advanceDepartureDialogue — endings bypass departure)
    this.questSystem.recordTalkedToFish(this.fish.id);
    this.questSystem.recordFishLeft(this.fish.id);
    this.journalSystem.recordCast(this.fish.id, [this.fish.currentExpression]);
    this.cgGallerySystem.unlockPortraitCG(this.fish.id);
    this.persistCGData();
    const newFacts = this.journalSystem.checkFactUnlocks(this.flagSystem.serialize(), this.flagsAtCastStart);
    if (newFacts.length > 0) {
      console.log('[FloaterGame] New facts discovered (ending):', newFacts);
    }
    this.globalStatsSystem.recordCast(
      this.journalSystem.getAllFishEntries(),
      this.flagSystem.serialize()
    );

    const character = characterRegistry.getCharacter(this.fish.id);
    const catchData = character?.catchSequenceData;

    // Resolve epitaph text + CG id per ending type.
    let epitaphText: string | undefined;
    let cgId: string | undefined;
    switch (type) {
      case EndingType.Reel:
        epitaphText = catchData?.reelEpitaph;
        cgId = `ending_${this.fish.id}_reel`;
        break;
      case EndingType.Release:
        epitaphText = catchData?.releaseEpitaph;
        cgId = `ending_${this.fish.id}_release`;
        this.flagSystem.set(`cross.${this.fish.id}.released`, true);
        break;
      case EndingType.DriftAway:
        epitaphText = character?.driftAwayJournalText;
        cgId = `ending_${this.fish.id}_drift_away`;
        break;
    }

    // Bookkeeping always runs — the ending logically happened.
    this.flagSystem.set(`${this.fish.id}.catch_available`, false);
    this.flagSystem.set(`${this.fish.id}.ending_complete`, true);
    // CRITICAL: Flush immediately at ending (journal/stats/flags just updated)
    this.saveSystem.flushImmediate(() => this.buildSaveData());

    // Optional fullscreen CG — shown only if the character declares one
    // for this ending (and only on first unlock, preserving prior behavior).
    let cgShown = false;
    if (cgId && this.cgGallerySystem.getCG(cgId)) {
      const newlyUnlocked = this.cgGallerySystem.unlockCG(cgId);
      if (newlyUnlocked) {
        this.cgGallerySystem.openViewer(cgId);
        floaterVM.cgViewerVisible = true;
        floaterVM.cgViewerImage = this.cgGallerySystem.getCGTexture(cgId);
        cgShown = true;
        console.log(`[FloaterGame] CG unlocked and displayed: ${cgId}`);
        this.persistCGData();
      }
    }

    // Optional ending text overlay — skipped entirely if the character
    // has no epitaph for this ending type.
    const textShown = !!epitaphText;
    if (textShown) {
      // Initialize epitaph animation state (fade-in + typewriter)
      this.epitaphFullText = epitaphText!;
      this.epitaphFadeTimer = 0;
      this.epitaphTextProgress = 0;
      this.epitaphTextComplete = false;
      floaterVM.endingText = ''; // Start empty, typewriter fills it
      floaterVM.endingOverlayOpacity = 0; // Start transparent, fades in
      floaterVM.endingTapVisible = false; // Hidden until typewriter completes
      floaterVM.endingVisible = true;
    } else {
      floaterVM.endingVisible = false;
    }

    // Nothing to display → advance straight back to lake idle.
    if (!cgShown && !textShown) {
      console.log(`[FloaterGame] No ending visuals for ${this.fish.id}/${type} — skipping ending phase`);
      this.currentCastIndex++;
      this.perFishCastIndex[this.fish.id] = this.currentCastIndex;
      // CRITICAL: Flush immediately (cast index advancement is critical state)
      this.saveSystem.flushImmediate(() => this.buildSaveData());
      this.enterLakeIdle();
      return;
    }

    // Enter the ending phase — wait for the player tap to dismiss.
    this.phase = GamePhase.Ending;
    this.currentEnding = type;
    floaterVM.departureVisible = false;
    floaterVM.hudVisible = false;
    this.hideActionButtons();
    // Endings are intentionally tap-gated (epitaph reveal). Cancel skip and
    // hide the button so the player must read the closing beat.
    this.canSkip = false;
    this.skipActive = false;
    floaterVM.skipButtonVisible = false;
    floaterVM.skipButtonOpacity = 0;

    console.log(`[FloaterGame] Ending triggered: ${type}, cg=${cgShown}, text=${textShown}`);
  }

  // === Emotion Icons ===
  private spawnEmotionIcon(type: EmotionIconType, anchor: EmotionIconAnchor = 'portrait'): void {
    if (type === EmotionIconType.None) return;

    let baseX: number;
    let baseY: number;

    if (anchor === 'float') {
      // Position above the float's landing position
      baseX = this.landingTargetX;
      baseY = this.landingTargetY + EMOTION_ICON_Y_OFFSET - 35; // Above the float (closer to float)
    } else {
      // Position above portrait center, offset by existing icons
      baseX = FISH_PORTRAIT_X + FISH_PORTRAIT_SIZE / 2;
      baseY = FISH_PORTRAIT_Y + EMOTION_ICON_Y_OFFSET; // Just above portrait top edge
    }

    // Only offset for portrait-anchored icons (multiple can stack)
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

    // Trigger portrait animation based on emotion type
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

  private updateEmotionIcons(dt: number): void {
    for (let i = this.floatingIcons.length - 1; i >= 0; i--) {
      const icon = this.floatingIcons[i];
      icon.timer -= dt;

      // Scale animation (dynamic bounce-in with overshoot)
      const elapsed = icon.maxDuration - icon.timer;
      if (elapsed < EMOTION_ICON_BOUNCE_TIME) {
        const t = elapsed / EMOTION_ICON_BOUNCE_TIME;
        // Multi-phase bounce: 0→1.3→0.95→1.05→1.0
        if (t < 0.25) {
          icon.scale = (t / 0.25) * 1.3;
        } else if (t < 0.5) {
          icon.scale = 1.3 - ((t - 0.25) / 0.25) * 0.35; // 1.3 → 0.95
        } else if (t < 0.75) {
          icon.scale = 0.95 + ((t - 0.5) / 0.25) * 0.1; // 0.95 → 1.05
        } else {
          icon.scale = 1.05 - ((t - 0.75) / 0.25) * 0.05; // 1.05 → 1.0
        }
      } else {
        icon.scale = 1.0;
      }

      // Fade out: scale down + float upward in last EMOTION_ICON_FADE_TIME seconds
      if (icon.timer < EMOTION_ICON_FADE_TIME) {
        const fadeT = 1 - (icon.timer / EMOTION_ICON_FADE_TIME); // 0→1
        icon.alpha = 1 - fadeT; // alpha decreases
        icon.scale *= (1 - fadeT * 0.6); // shrink during fade
        icon.y -= dt * 30; // float upward during fade
      }

      // Remove expired
      if (icon.timer <= 0) {
        this.floatingIcons.splice(i, 1);
      }
    }
  }

  // === Float Animation ===
  private animateAction(actionId: ActionId): void {
    this.actionAnimType = actionId;
    this.actionAnimTimer = 0;
    this.actionAnimOffsetX = 0;
    this.actionAnimOffsetY = 0;

    switch (actionId) {
      case ActionId.Wait:
        this.actionAnimDuration = ACTION_ANIM_WAIT_DURATION;
        this.lineTension = 0.5;
        break;
      case ActionId.Twitch:
        this.actionAnimDuration = ACTION_ANIM_TWITCH_DURATION;
        this.lineTension = 0.7;
        this.triggerPortraitAnimation('bounce', 0.35);
        break;
      case ActionId.Drift:
        this.actionAnimDuration = ACTION_ANIM_DRIFT_DURATION;
        this.lineTension = 0.2;
        break;
      case ActionId.Reel:
        this.actionAnimDuration = ACTION_ANIM_REEL_DURATION;
        this.lineTension = 1.0;
        this.triggerPortraitAnimation('shake', 0.4);
        break;
    }
  }

  private updateActionAnimation(dt: number): void {
    if (this.actionAnimType === null) return;

    this.actionAnimTimer += dt;
    const t = Math.min(1, this.actionAnimTimer / this.actionAnimDuration);

    switch (this.actionAnimType) {
      case ActionId.Wait: {
        // Slow, regular enhanced bobbing - gentle sine wave
        const decay = 1 - t; // Fade out over duration
        this.actionAnimOffsetY = Math.sin(this.actionAnimTimer * ACTION_ANIM_WAIT_SPEED) * ACTION_ANIM_WAIT_AMPLITUDE * decay;
        this.actionAnimOffsetX = 0;
        break;
      }
      case ActionId.Reel: {
        // Quick pull upward then bouncing resistance
        if (t < 0.25) {
          // Pull phase: quick ease-out upward
          const pullT = t / 0.25;
          const eased = 1 - Math.pow(1 - pullT, 3); // ease-out cubic
          this.actionAnimOffsetY = ACTION_ANIM_REEL_PULL_Y * eased;
        } else {
          // Bounce phase: decaying oscillation settling back to 0
          const bounceT = (t - 0.25) / 0.75;
          const decay = Math.pow(ACTION_ANIM_REEL_BOUNCE_DECAY, bounceT * ACTION_ANIM_REEL_BOUNCE_COUNT);
          const bounce = Math.sin(bounceT * ACTION_ANIM_REEL_BOUNCE_COUNT * Math.PI * 2);
          this.actionAnimOffsetY = ACTION_ANIM_REEL_PULL_Y * decay * bounce * (1 - bounceT);
        }
        this.actionAnimOffsetX = 0;
        break;
      }
      case ActionId.Drift: {
        // Gentle lateral drift with subtle vertical bob
        // Smooth ease-in, hold, ease-out for X movement
        let driftX: number;
        if (t < 0.2) {
          // Ease in
          const easeT = t / 0.2;
          driftX = easeT * easeT * ACTION_ANIM_DRIFT_AMPLITUDE_X;
        } else if (t < 0.7) {
          // Hold with gentle sine variation
          const holdT = (t - 0.2) / 0.5;
          driftX = ACTION_ANIM_DRIFT_AMPLITUDE_X + Math.sin(holdT * Math.PI) * 4;
        } else {
          // Ease out back to center
          const easeT = (t - 0.7) / 0.3;
          const eased = 1 - Math.pow(easeT, 2);
          driftX = ACTION_ANIM_DRIFT_AMPLITUDE_X * eased;
        }
        this.actionAnimOffsetX = driftX;
        // Subtle vertical bob during drift (like rocking on water)
        this.actionAnimOffsetY = Math.sin(this.actionAnimTimer * 4) * ACTION_ANIM_DRIFT_AMPLITUDE_Y;
        break;
      }
      case ActionId.Twitch: {
        // Sharp, quick jerk upward then rapid settle
        if (t < 0.15) {
          // Sharp impulse: instant jerk up
          const impulseT = t / 0.15;
          this.actionAnimOffsetY = ACTION_ANIM_TWITCH_AMPLITUDE_Y * impulseT;
          this.actionAnimOffsetX = ACTION_ANIM_TWITCH_AMPLITUDE_X * Math.sin(impulseT * Math.PI);
        } else {
          // Rapid settle with wobble
          const settleT = (t - 0.15) / 0.85;
          const decay = Math.pow(1 - settleT, 3); // fast decay
          this.actionAnimOffsetY = ACTION_ANIM_TWITCH_AMPLITUDE_Y * decay * Math.cos(settleT * Math.PI * 4);
          this.actionAnimOffsetX = ACTION_ANIM_TWITCH_AMPLITUDE_X * decay * Math.sin(settleT * Math.PI * 6);
        }
        break;
      }
    }

    // Animation complete
    if (t >= 1) {
      this.actionAnimType = null;
      this.actionAnimOffsetX = 0;
      this.actionAnimOffsetY = 0;
    }
  }

  // === Action Button Container Animation ===
  private updateActionButtonAnimation(dt: number): void {
    if (this.actionMenuAnimState === 'hidden') return;

    this.actionMenuAnimTimer += dt;

    switch (this.actionMenuAnimState) {
      case 'appearing': {
        const t = Math.min(1, this.actionMenuAnimTimer / this.ACTION_APPEAR_DURATION);
        // Ease-out cubic for smooth appear
        const eased = 1 - Math.pow(1 - t, 3);
        floaterVM.actionMenuOpacity = eased;
        // Pure vertical slide up from below (40px → 0px)
        floaterVM.actionMenuTranslateY = 40 * (1 - eased);
        if (t >= 1) {
          this.actionMenuAnimState = 'visible';
          floaterVM.actionMenuOpacity = 1;
          floaterVM.actionMenuTranslateY = 0;
        }
        break;
      }
      case 'disappearing': {
        const t = Math.min(1, this.actionMenuAnimTimer / this.ACTION_DISAPPEAR_DURATION);
        // Ease-in for disappear
        const eased = t * t;
        floaterVM.actionMenuOpacity = 1 - eased;
        // Pure vertical slide down (0px → 40px)
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
        // No timer-based animation; state driven by game events
        break;
    }
  }

  /** Start showing action buttons with appear animation.
   *  If buttons are already visible (e.g., transitioning from 'responding' state back to
   *  interactive), snaps directly to idle state without re-triggering the appear animation. */
  private showActionButtons(): void {
    // If buttons are already on screen (responding or visible), snap to idle — no animation
    if (this.actionMenuAnimState === 'responding' || this.actionMenuAnimState === 'visible') {
      this.actionMenuAnimState = 'visible';
      this.selectedActionId = null;
      floaterVM.actionMenuOpacity = 1;
      floaterVM.actionMenuTranslateY = 0;
      // Snap per-button states to uniform (no animation, instant)
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

    // Buttons are hidden or disappearing — trigger full appear animation
    this.actionMenuAnimState = 'appearing';
    this.actionMenuAnimTimer = 0;
    this.selectedActionId = null;
    floaterVM.actionMenuVisible = true;
    floaterVM.actionMenuOpacity = 0;
    floaterVM.actionMenuTranslateY = 40;
    // Reset all per-button states to uniform
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

  /** Mark selected button and dim others (responding state) */
  private setActionButtonsResponding(selectedId: ActionId): void {
    this.actionMenuAnimState = 'responding';
    this.selectedActionId = selectedId;
    // Selected: full opacity + translate up, others: dimmed + no translation
    const buttons: Array<{id: ActionId; opacityProp: 'actionWaitBtnOpacity' | 'actionTwitchBtnOpacity' | 'actionDriftBtnOpacity' | 'actionReelBtnOpacity'; translateYProp: 'actionWaitBtnTranslateY' | 'actionTwitchBtnTranslateY' | 'actionDriftBtnTranslateY' | 'actionReelBtnTranslateY'}> = [
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
    // Disable all buttons during response
    floaterVM.actionWaitEnabled = false;
    floaterVM.actionTwitchEnabled = false;
    floaterVM.actionDriftEnabled = false;
    floaterVM.actionReelEnabled = false;
  }

  /** Hide action buttons with disappear animation */
  private hideActionButtons(): void {
    if (this.actionMenuAnimState === 'hidden') return;
    this.actionMenuAnimState = 'disappearing';
    this.actionMenuAnimTimer = 0;
    this.selectedActionId = null;
  }



  // === Idle Button Bar Animation ===
  private updateIdleBarAnimation(dt: number): void {
    if (this.idleBarAnimState === 'hidden') return;
    this.idleBarAnimTimer += dt;

    switch (this.idleBarAnimState) {
      case 'appearing': {
        const t = Math.min(1, this.idleBarAnimTimer / this.IDLE_BAR_APPEAR_DURATION);
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
        const t = Math.min(1, this.idleBarAnimTimer / this.IDLE_BAR_DISAPPEAR_DURATION);
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

  private showIdleBar(): void {
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

  private hideIdleBar(): void {
    if (this.idleBarAnimState === 'hidden') return;
    this.idleBarAnimState = 'disappearing';
    this.idleBarAnimTimer = 0;
    this.selectedIdleBtn = null;
  }

  private setIdleBarResponding(btn: 'bait' | 'cast' | 'journal'): void {
    this.idleBarAnimState = 'responding';
    this.selectedIdleBtn = btn;
    const btns: Array<{id: string; opProp: 'idleBaitBtnOpacity' | 'idleCastBtnOpacity' | 'idleJournalBtnOpacity'; tyProp: 'idleBaitBtnTranslateY' | 'idleCastBtnTranslateY' | 'idleJournalBtnTranslateY'}> = [
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

  // === Affection Display ===
  /** Get the correct portrait texture for the current fish character. */
  private getPortraitTexture() {
    const config = characterRegistry.getCharacter(this.fish.id);
    if (config) return config.portraitTexture;
    return characterRegistry.getCharacter(characterRegistry.getDefaultCharacterId())!.portraitTexture;
  }

  private syncAffectionDisplay(): void {
    // The gauge bar displays NARRATIVE PROGRESSION, not raw affection.
    //
    //   - Main fish (have `progressionMilestones`): count how many of the
    //     character's narrative milestones (quest flags) are set. Cumulative
    //     across casts; reflects the player's overall journey with this fish.
    //
    //   - Other fish (NPCs / no milestones): fall back to the affection ratio
    //     so the gauge fills during the per-cast puzzle and resets when the
    //     fish leaves (affection back to 0 on a fresh encounter).
    //
    // The catch-ready marker on the gauge stays tied to actual affection so
    // the player sees when REEL would trigger the catch.
    const config = characterRegistry.getCharacter(this.fish.id);
    const milestones = config?.progressionMilestones;
    let progress: number; // 0..1
    if (milestones && milestones.length > 0) {
      let reached = 0;
      for (const key of milestones) {
        if (this.flagSystem.check(key)) reached++;
      }
      progress = reached / milestones.length;
    } else {
      const range = AFFECTION_MAX - AFFECTION_DRIFT_AWAY_THRESHOLD;
      const normalized = (this.fishAffection.value - AFFECTION_DRIFT_AWAY_THRESHOLD) / range;
      progress = Math.max(0, Math.min(1, normalized));
    }
    floaterVM.affectionBarWidth = progress * 200; // 200px max width
    floaterVM.updateGaugeMarker(this.fishAffection.value);

    // HUD: portrait, name, no mood/tier text anymore
    floaterVM.hudPortrait = this.fish.portrait ?? this.getPortraitTexture();
    floaterVM.hudNameColor = this.fish.accentColor;
    floaterVM.hudNameText = this.getFishDisplayName();
    floaterVM.hudMoodText = this.displayedAffectionLabel;
    floaterVM.hudMoodColor = this.fish.accentColor;
    floaterVM.hudNameMoodText = this.getFishDisplayName();
    floaterVM.emotionName = '';
    floaterVM.tierText = this.displayedAffectionLabel;

    // Progress dots: linear cast progression for this character.
    const totalCasts = characterRegistry.getCastCount(this.fish.id);
    this.progressDotsTotal = totalCasts;
    this.progressDotsFilled = Math.min(this.currentCastIndex, totalCasts);
    floaterVM.setProgressDots(this.progressDotsTotal, this.progressDotsFilled);
  }

  // === Intro Cinematic ===
  // Single paragraph progressively revealed (cinematic typewriter), then a
  // brief hold, then a fade to LakeIdle. No tap required — the Start button
  // is already hidden via `titleVisible = false` during the title fade-out.
  // A tap during typewriter skips to the full paragraph; a tap during hold
  // ends the intro immediately.
  private startIntro(): void {
    console.log('[FloaterGame] Starting intro cinematic');
    this.introActive = true;
    this.introState = 'typing';
    this.introTextProgress = 0;
    this.introHoldTimer = 0;
    this.introFadeTimer = 0;
    // Ensure the title screen is hidden the moment the intro takes over,
    // independent of fade-out state.
    floaterVM.titleVisible = false;
    floaterVM.introVisible = true;
    floaterVM.introOverlayOpacity = 1;
    floaterVM.introText = '';
    floaterVM.introTapVisible = false;
    // Prevent fade-in while intro is showing
    this.fadeState = 'none';
    this.fadeAlpha = 0;
  }

  /** Called from onTouchStart when intro is active: skip ahead one stage. */
  private advanceIntro(): void {
    if (this.introState === 'typing') {
      // Reveal the whole paragraph immediately and enter hold.
      floaterVM.introText = this.introFullText;
      this.introState = 'hold';
      this.introHoldTimer = 0;
    } else if (this.introState === 'hold') {
      // Skip the hold — start the fade now.
      this.introState = 'fading';
      this.introFadeTimer = 0;
    }
    // During 'fading' a tap is ignored — fade is short and finishing it
    // cleanly avoids visual jumps into the lake.
  }

  /** Per-frame update for the intro cinematic. */
  private updateIntro(dt: number): void {
    if (!this.introActive) return;
    if (this.introState === 'typing') {
      this.introTextProgress += dt;
      const charsRevealed = Math.floor(this.introTextProgress / FloaterGame.INTRO_CHAR_SPEED);
      if (charsRevealed >= this.introFullText.length) {
        floaterVM.introText = this.introFullText;
        this.introState = 'hold';
        this.introHoldTimer = 0;
      } else {
        floaterVM.introText = this.introFullText.substring(0, charsRevealed);
      }
    } else if (this.introState === 'hold') {
      this.introHoldTimer += dt;
      if (this.introHoldTimer >= FloaterGame.INTRO_HOLD_DURATION) {
        this.introState = 'fading';
        this.introFadeTimer = 0;
      }
    } else if (this.introState === 'fading') {
      this.introFadeTimer += dt;
      const t = Math.min(1, this.introFadeTimer / FloaterGame.INTRO_FADE_DURATION);
      floaterVM.introOverlayOpacity = 1 - t;
      if (t >= 1) {
        console.log('[FloaterGame] Intro complete → LakeIdle');
        this.flagSystem.set('run.intro_seen', true);
        // CRITICAL: flush immediately so the flag persists. Without this the
        // flag lives only in memory and the intro replays on next launch.
        // `requestSave` is the safety net: if the immediate flush is rejected
        // (e.g. the persistent-data load hasn't arrived yet → SaveSystem not
        // ready), the deferred timer-driven save will retry once ready.
        this.saveSystem.requestSave();
        this.saveSystem.flushImmediate(() => this.buildSaveData());
        floaterVM.introVisible = false;
        floaterVM.introOverlayOpacity = 1; // reset for next time
        this.introActive = false;
        this.enterLakeIdle();
      }
    }
  }

  // === Cast Mechanics ===
  private enterLakeIdle(): void {
    this.phase = GamePhase.LakeIdle;
    this.fishAlpha = 0;
    this.isInCastAiming = false;
    floaterVM.castInstructionVisible = false;
    floaterVM.castButtonVisible = false;
    floaterVM.hudVisible = false;
    floaterVM.inventoryButtonVisible = false;
    floaterVM.journalButtonVisible = false;
    // Defensive: ensure the title screen (Start button + rod sprite) is hidden
    // once we reach LakeIdle. Normally cleared by the fade-out, but a skipped
    // intro can land here without that having run.
    floaterVM.titleVisible = false;
    // Hide skip button when returning to lake idle
    this.canSkip = false;
    this.skipActive = false;
    this.skipAdvanceTimer = 0;
    floaterVM.skipButtonVisible = false;
    floaterVM.skipButtonOpacity = 0;
    // Re-enable idle buttons when returning to lake idle
    floaterVM.idleBaitBtnEnabled = true;
    floaterVM.idleCastBtnEnabled = true;
    floaterVM.idleJournalBtnEnabled = true;
    this.showIdleBar();
  }

  private updatePowerGauge(dt: number): void {
    const speed = (100 / (GAUGE_CYCLE_TIME / 2));
    this.powerGaugeValue += this.powerGaugeDir * speed * dt;
    if (this.powerGaugeValue >= 100) { this.powerGaugeValue = 100; this.powerGaugeDir = -1; }
    else if (this.powerGaugeValue <= 0) { this.powerGaugeValue = 0; this.powerGaugeDir = 1; }
  }

  private launchFloat(): void {
    this.phase = GamePhase.CastFlying;
    this.castFlightT = 0;

    // Track lure usage for quest system
    if (this.equippedLureId) {
      this.questSystem.recordLureUsed(this.equippedLureId);
    }

    if (USE_3D_PHYSICS_CAST) {
      this.initCast3D(this.castPower);
      // Project initial 3D rod tip position to 2D so the float starts OFF-SCREEN
      // (at the rod tip) and arcs INTO view — no position swap needed
      const projected = this.project3Dto2D(this.floater3DPos);
      this.castFloatX = projected.x;
      this.castFloatY = projected.y;
      this.castFloatScale = projected.scale;
      this.prevCastFloatScreenX = projected.x;
      this.prevCastFloatScreenY = projected.y;
    } else if (USE_POV_CAST_ANIMATION) {
      this.castFloatX = POV_CAST_START_X;
      this.castFloatY = POV_CAST_START_Y;
      this.castFloatScale = POV_CAST_START_SCALE;
    } else {
      this.castFloatX = CAST_START_X;
      this.castFloatY = CAST_START_Y;
      this.castFloatScale = 1.0;
    }
  }

  private updateCastFlight(dt: number): void {
    // === 3D Ballistic Flight (replaces flat bezier) ===
    if (this.isBezierFlying) {
      // Integrate gravity: vel.y += gravity * dt
      this.floater3DVel = new Vec3D(
        this.floater3DVel.x,
        this.floater3DVel.y + CAST_3D_GRAVITY_Y * dt,
        this.floater3DVel.z
      );

      // Integrate position: pos += vel * dt
      this.floater3DPos = new Vec3D(
        this.floater3DPos.x + this.floater3DVel.x * dt,
        this.floater3DPos.y + this.floater3DVel.y * dt,
        this.floater3DPos.z + this.floater3DVel.z * dt
      );

      // Project 3D position to screen space
      const projected = this.project3Dto2D(this.floater3DPos);
      this.castFloatX = projected.x;
      this.castFloatY = projected.y;
      this.castFloatScale = projected.scale;

      // Compute rotation from frame-to-frame projected position delta
      const dx = this.castFloatX - this.prevCastFloatScreenX;
      const dy = this.castFloatY - this.prevCastFloatScreenY;
      const tangentAngle = (Math.abs(dx) > 0.01 || Math.abs(dy) > 0.01)
        ? Math.atan2(dy, dx) * (180 / Math.PI)
        : this.castFloatRotation; // keep previous if no movement
      this.prevCastFloatScreenX = this.castFloatX;
      this.prevCastFloatScreenY = this.castFloatY;
      // Damped wobble based on flight progress
      this.bezierFlightT += dt / this.bezierFlightDuration;
      const wobble = Math.sin(this.bezierFlightT * Math.PI * 3) * (1 - Math.min(1, this.bezierFlightT)) * 15;
      this.castFloatRotation = tangentAngle + wobble;

      // Check landing: flight time elapsed (projectile has reached target3D)
      if (this.bezierFlightT >= 1.0) {
        this.isBezierFlying = false;
        // Use pre-computed landing target from onTouchEnd (correct endX/endY)
        this.castFloatX = this.landingTargetX;
        this.castFloatY = this.landingTargetY;
        this.castFloatScale = 1.0;
        this.castFloatRotation = 0;
        this.onFloatLanded();
        return;
      }

      // Safety: max flight time exceeded
      if (this.bezierFlightT >= 1.5) {
        this.isBezierFlying = false;
        // Keep final projected position instead of snapping to pre-computed landing target
        this.landingTargetX = this.castFloatX;
        this.landingTargetY = this.castFloatY;
        this.castFloatScale = 1.0;
        this.castFloatRotation = 0;
        this.onFloatLanded();
        return;
      }

      // === Verlet Rope Simulation ===
      // Anchor endpoints: particle 0 = rod tip, particle N-1 = float
      const rodTip3D = this.unproject2Dto3D(POV_LINE_START_X, POV_LINE_START_Y, 1.2);
      const floatScale = this.castFloatScale > 0.01 ? this.castFloatScale : 0.5;
      const float3D = this.unproject2Dto3D(this.castFloatX, this.castFloatY, floatScale);
      const numP = this.verletPositions.length;

      if (numP >= 2) {
        // Verlet integration for interior particles
        for (let i = 1; i < numP - 1; i++) {
          const cur = this.verletPositions[i];
          const prev = this.verletPrevPositions[i];
          // velocity = current - previous (Verlet implicit velocity)
          const vx = (cur.x - prev.x) * VERLET_ROPE_DAMPING;
          const vy = (cur.y - prev.y) * VERLET_ROPE_DAMPING;
          const vz = (cur.z - prev.z) * VERLET_ROPE_DAMPING;
          // Apply gravity (Y is up, gravity is negative Y)
          const newPos = new Vec3D(
            cur.x + vx,
            cur.y + vy + VERLET_ROPE_GRAVITY * dt * dt,
            cur.z + vz
          );
          this.verletPrevPositions[i] = cur;
          this.verletPositions[i] = newPos;
        }

        // Pin endpoints
        this.verletPrevPositions[0] = this.verletPositions[0];
        this.verletPositions[0] = rodTip3D;
        this.verletPrevPositions[numP - 1] = this.verletPositions[numP - 1];
        this.verletPositions[numP - 1] = float3D;

        // Distance constraint iterations
        for (let iter = 0; iter < VERLET_ROPE_CONSTRAINT_ITERATIONS; iter++) {
          // Pin endpoints each iteration
          this.verletPositions[0] = rodTip3D;
          this.verletPositions[numP - 1] = float3D;

          for (let i = 0; i < numP - 1; i++) {
            const a = this.verletPositions[i];
            const b = this.verletPositions[i + 1];
            const dx = b.x - a.x;
            const dy = b.y - a.y;
            const dz = b.z - a.z;
            const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
            if (dist < 0.001) continue;
            const diff = (dist - VERLET_ROPE_SEGMENT_LENGTH) / dist;
            const offsetX = dx * 0.5 * diff;
            const offsetY = dy * 0.5 * diff;
            const offsetZ = dz * 0.5 * diff;

            // Don't move pinned endpoints
            if (i > 0) {
              this.verletPositions[i] = new Vec3D(
                a.x + offsetX, a.y + offsetY, a.z + offsetZ
              );
            }
            if (i + 1 < numP - 1) {
              this.verletPositions[i + 1] = new Vec3D(
                b.x - offsetX, b.y - offsetY, b.z - offsetZ
              );
            }
          }
        }
      }

      return;
    }

    if (USE_3D_PHYSICS_CAST) {
      this.updateCastFlying3D(dt);
    } else if (USE_POV_CAST_ANIMATION) {
      this.updateCastFlightPOV(dt);
    } else {
      this.updateCastFlightSideView(dt);
    }
  }

  // Issue 2 fix: All segments are simulated continuously. No activeSegmentCount gating.

  // === 3D Fishing Rod Methods ===

  /** Initialize rod 3D position based on constants */
  private initRod3D(): void {
    this.rod3D.basePos = new Vec3D(ROD_3D_BASE_X, ROD_3D_BASE_Y, ROD_3D_BASE_Z);
    this.rod3D.angle = ROD_3D_INITIAL_ANGLE;
    this.rodState = RodState.WindUp;
    this.updateRodTip();
  }

  /** Recalculate rod tip position from base + angle */
  private updateRodTip(): void {
    this.rod3D.tipPos = new Vec3D(
      this.rod3D.basePos.x + Math.cos(this.rod3D.angle) * ROD_3D_LENGTH * 0.5,
      this.rod3D.basePos.y + Math.sin(this.rod3D.angle) * ROD_3D_LENGTH,
      this.rod3D.basePos.z + ROD_3D_LENGTH * ROD_3D_TIP_Z_FACTOR,
    );
  }

  /** Animate rod through cast phases based on normalized time t (0..1) */
  private updateRodAnimation(t: number): void {
    if (t < ROD_PHASE_WINDUP_END) {
      // Wind-up: Pull back
      this.rodState = RodState.WindUp;
      const windupT = t / ROD_PHASE_WINDUP_END;
      this.rod3D.angle = ROD_3D_INITIAL_ANGLE - windupT * ROD_WINDUP_PULLBACK;

    } else if (t < ROD_PHASE_ACCELERATE_END) {
      // Accelerate: Swing forward rapidly
      this.rodState = RodState.Accelerate;
      const accelT = (t - ROD_PHASE_WINDUP_END) / (ROD_PHASE_ACCELERATE_END - ROD_PHASE_WINDUP_END);
      const eased = accelT * accelT; // Ease-in (accelerating)
      this.rod3D.angle = (ROD_3D_INITIAL_ANGLE - ROD_WINDUP_PULLBACK) + eased * ROD_ACCELERATE_SWING;

    } else if (t < ROD_PHASE_RELEASE_END) {
      // Release: Hold at peak
      this.rodState = RodState.Release;
      this.rod3D.angle = ROD_RELEASE_ANGLE;

    } else {
      // Follow-through: Settle back down
      this.rodState = RodState.FollowThrough;
      const followT = (t - ROD_PHASE_RELEASE_END) / (1.0 - ROD_PHASE_RELEASE_END);
      const eased = 1 - Math.pow(1 - followT, 2); // Ease-out
      this.rod3D.angle = ROD_RELEASE_ANGLE - eased * ROD_FOLLOWTHROUGH_SETTLE;
    }

    this.updateRodTip();
  }

  /** 3D physics cast: realistic projectile with gravity, projected to 2D.
   *  FIX Issue 2: All segments are always simulated continuously (no activeSegmentCount).
   *  This prevents the visual discontinuity/"break" that occurred when segments
   *  activated mid-flight from stale positions. */
  private updateCastFlying3D(dt: number): void {
    this.castFlyingTimer += dt;

    // Calculate normalized flight progress
    const normalizedPower = this.lastCastPower / 100;
    const totalFlightTime = CAST_3D_CALC_MAX_FLIGHT_TIME + normalizedPower * (CAST_3D_CALC_MIN_FLIGHT_TIME - CAST_3D_CALC_MAX_FLIGHT_TIME);
    const t = Math.min(this.castFlyingTimer / totalFlightTime, 1.0);

    // Animate rod
    this.updateRodAnimation(t);

    // Update floater velocity with gravity
    this.floater3DVel = this.floater3DVel.add(new Vec3D(0, CAST_3D_GRAVITY_Y * dt, 0));
    // Update floater position
    this.floater3DPos = this.floater3DPos.add(this.floater3DVel.scale(dt));

    // FIX Issue 2: Always simulate ALL segments continuously.
    // No activeSegmentCount gating - every segment participates from the start.
    const totalSegments = this.lineSegments3D.length;

    // Last segment follows floater
    this.lineSegments3D[totalSegments - 1] = this.floater3DPos.clone();

    // Apply slight gravity to middle segments for natural sag
    const segGravity = CAST_3D_GRAVITY_Y * 0.15 * dt;
    for (let i = 1; i < totalSegments - 1; i++) {
      this.lineSegments3D[i] = new Vec3D(
        this.lineSegments3D[i].x,
        this.lineSegments3D[i].y + segGravity,
        this.lineSegments3D[i].z
      );
    }

    // Backward pass: constrain each segment to be EXACTLY segment_length from next
    for (let i = totalSegments - 2; i >= 1; i--) {
      const target = this.lineSegments3D[i + 1];
      const current = this.lineSegments3D[i];
      const dir = target.subtract(current);
      const dist = dir.length();

      if (dist > 0.001) {
        const pull = dir.normalize().scale(CAST_3D_SEGMENT_LENGTH);
        this.lineSegments3D[i] = target.subtract(pull);
      } else {
        const toRod = this.rod3D.tipPos.subtract(target).normalize();
        this.lineSegments3D[i] = target.subtract(toRod.scale(CAST_3D_SEGMENT_LENGTH));
      }
    }

    // Forward pass: ensure segments don't bunch from rod side either
    for (let i = 1; i < totalSegments - 1; i++) {
      const prev = this.lineSegments3D[i - 1];
      const current = this.lineSegments3D[i];
      const dir = current.subtract(prev);
      const dist = dir.length();

      if (dist > 0.001 && dist < CAST_3D_SEGMENT_LENGTH * 0.5) {
        const pushed = prev.add(dir.normalize().scale(CAST_3D_SEGMENT_LENGTH));
        this.lineSegments3D[i] = new Vec3D(
          current.x * 0.5 + pushed.x * 0.5,
          current.y * 0.5 + pushed.y * 0.5,
          current.z * 0.5 + pushed.z * 0.5
        );
      }
    }

    // First segment follows rod tip
    this.lineSegments3D[0] = this.rod3D.tipPos.clone();

    // Project floater to 2D screen space
    const projected = this.project3Dto2D(this.floater3DPos);
    this.castFloatX = projected.x;
    this.castFloatY = projected.y;
    this.castFloatScale = projected.scale;

    // Check if landed (Y below water level or timeout)
    if (this.floater3DPos.y < CAST_3D_WATER_Y || this.castFlyingTimer > CAST_3D_MAX_FLIGHT_TIME) {
      this.onFloatLanded();
    }
  }

  /** Unproject a 2D screen position + desired scale back to 3D space.
   *  Inverts the perspective projection used in project3Dto2D. */
  private unproject2Dto3D(screenX: number, screenY: number, desiredScale: number): Vec3D {
    // From project3Dto2D: scale = (focalLength / depth) * scaleMultiplier
    // Solve for depth: depth = (focalLength * scaleMultiplier) / scale
    const depth = (CAST_3D_FOCAL_LENGTH * CAST_3D_SCALE_MULTIPLIER) / desiredScale;
    const z = depth - CAST_3D_FOCAL_LENGTH;

    // From project3Dto2D: screenX = (x / depth) * 200 + CANVAS_WIDTH / 2
    // Solve for x: x = (screenX - CANVAS_WIDTH/2) * depth / 200
    const x = (screenX - CANVAS_WIDTH / 2) * depth / 200;

    // From project3Dto2D: screenY = (-y / depth) * 200 + CANVAS_HEIGHT / 2
    // Solve for y: y = -(screenY - CANVAS_HEIGHT/2) * depth / 200
    const y = -(screenY - CANVAS_HEIGHT / 2) * depth / 200;

    return new Vec3D(x, y, z);
  }

  /** Calculate the initial velocity needed to travel from start to target
   *  in exactly flightTime seconds under gravity. */
  private calculateBallisticVelocity(start: Vec3D, target: Vec3D, flightTime: number): Vec3D {
    // Ballistic equation: target = start + velocity * t + 0.5 * gravity * t²
    // Solve for velocity: velocity = (target - start - 0.5 * gravity * t²) / t
    const gravity = new Vec3D(0, CAST_3D_GRAVITY_Y, 0);
    const displacement = target.subtract(start);
    const gravityTerm = gravity.scale(0.5 * flightTime * flightTime);
    const velocity = displacement.subtract(gravityTerm).scale(1 / flightTime);
    return velocity;
  }

  /** Compute the 2D landing point directly from distance and xOffset.
   *  The 3D simulation produced incorrect results because z-depth never varied
   *  (both start and target unprojected at desiredScale=1.0), causing the
   *  y-threshold landing to always project to the same screen Y. Instead, we
   *  return the geometric landing point directly — this is what the preview
   *  curve targets and what the flight should land at. */
  private computePhysicsLandingPoint(distance: number, xOffset: number): { x: number; y: number } {
    const centerX = CANVAS_WIDTH / 2;
    const xRange = (CAST_TRAJ_LANDING_MAX_X - CAST_TRAJ_LANDING_MIN_X) / 2;
    const rawEndX = centerX + xOffset * xRange;
    const endX = Math.max(CAST_TRAJ_LANDING_MIN_X, Math.min(CAST_TRAJ_LANDING_MAX_X, rawEndX));
    const endY = CAST_TRAJ_LANDING_NEAR_Y + distance * (CAST_TRAJ_LANDING_FAR_Y - CAST_TRAJ_LANDING_NEAR_Y);
    return { x: endX, y: endY };
  }

  /** Initialize 3D cast physics state with designed upward arc.
   *  Y velocity is calculated to peak at 60% of planned flight time (when line fully extends).
   *  X/Z velocities target the pond center based on actual time to reach water level.
   *  Landing distance now varies with power: low power = close, high power = far. */
  private initCast3D(power: number): void {
    this.lastCastPower = power;

    // Initialize rod
    this.initRod3D();

    // Start floater at rod tip
    const start3D = this.rod3D.tipPos.clone();

    // Calculate power-based landing position
    // normalizedPower: 0 = weak (lands close/low), 1 = strong (lands far/high)
    const normalizedPower = power / 100;
    this.landingTargetY = CAST_LANDING_NEAR_Y + (CAST_LANDING_FAR_Y - CAST_LANDING_NEAR_Y) * normalizedPower;
    // Slight X variance for realism (seeded from power to be deterministic)
    this.landingTargetX = FLOAT_X + CAST_LANDING_X_OFFSET + (normalizedPower - 0.5) * CAST_LANDING_X_VARIANCE * 0.5;

    // Target position: power-adjusted landing spot at normal scale (1.0)
    const target3D = this.unproject2Dto3D(this.landingTargetX, this.landingTargetY, 1.0);

    // Flight time based on power: higher power = shorter time (faster, flatter arc)
    const plannedFlightTime = CAST_3D_CALC_MAX_FLIGHT_TIME + normalizedPower * (CAST_3D_CALC_MIN_FLIGHT_TIME - CAST_3D_CALC_MAX_FLIGHT_TIME);

    // Design Y velocity so the arc peaks at 60% of planned flight time
    // (matching when lineExtensionProgress reaches 1.0)
    // At peak: vy + g * t_peak = 0, so vy = -g * t_peak = |g| * peakFraction * T
    const peakFraction = 0.6;
    const vy = Math.abs(CAST_3D_GRAVITY_Y) * peakFraction * plannedFlightTime;

    // Calculate actual time for floater to reach water level with this Y velocity
    // y(t) = start_y + vy*t + 0.5*g*t² → solving for y = CAST_3D_WATER_Y:
    // 0.5*|g|*t² - vy*t + (WATER_Y - start_y) = 0
    const aCoeff = 0.5 * Math.abs(CAST_3D_GRAVITY_Y);
    const bCoeff = -vy;
    const cCoeff = CAST_3D_WATER_Y - start3D.y;
    const discriminant = bCoeff * bCoeff - 4 * aCoeff * cCoeff;
    const actualFlightTime = discriminant > 0
      ? (-bCoeff + Math.sqrt(discriminant)) / (2 * aCoeff)
      : plannedFlightTime * 2.5; // fallback

    // X and Z velocities: reach target position in actualFlightTime
    // (no gravity on X/Z, so simple displacement/time)
    const vx = (target3D.x - start3D.x) / actualFlightTime;
    const vz = (target3D.z - start3D.z) / actualFlightTime;

    const velocity = new Vec3D(vx, vy, vz);

    // Set initial state
    this.floater3DPos = start3D.clone();
    this.floater3DVel = velocity;

    // FIX Issue 2: Initialize line segments distributed along a short line
    // from rod tip toward the initial velocity direction. This prevents all
    // segments starting at the same position (which caused "straight then physics"
    // discontinuity as the backward pass spread them out one-by-one).
    this.lineSegments3D = [];
    const initDir = velocity.normalize();
    for (let i = 0; i < CAST_3D_NUM_LINE_SEGMENTS; i++) {
      // Distribute segments from rod tip outward along cast direction
      // First segment at tip, last segment slightly ahead (fraction of total line length)
      const fraction = i / (CAST_3D_NUM_LINE_SEGMENTS - 1);
      const offset = initDir.scale(fraction * CAST_3D_SEGMENT_LENGTH * 3);
      this.lineSegments3D.push(this.rod3D.tipPos.add(offset));
    }

    this.castFlyingTimer = 0;
    this.lineExtensionProgress = 0;
    console.log(`[FloaterGame] initCast3D: power=${power.toFixed(1)}, landingTarget=(${this.landingTargetX.toFixed(0)}, ${this.landingTargetY.toFixed(0)}), plannedT=${plannedFlightTime.toFixed(2)}s, actualT=${actualFlightTime.toFixed(2)}s, vy=${vy.toFixed(2)}, vel=(${velocity.x.toFixed(2)}, ${velocity.y.toFixed(2)}, ${velocity.z.toFixed(2)})`);
  }

  /** Project 3D position to 2D screen space with perspective */
  private project3Dto2D(pos3D: Vec3D): { x: number; y: number; scale: number } {
    const depth = pos3D.z + CAST_3D_FOCAL_LENGTH;

    if (depth <= 0.1) {
      return { x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT / 2, scale: 0.1 };
    }

    // Project to screen space
    const screenX = (pos3D.x / depth) * 200 + CANVAS_WIDTH / 2;
    const screenY = (-pos3D.y / depth) * 200 + CANVAS_HEIGHT / 2; // Flip Y

    // Increase scale multiplier for more dramatic size changes
    const scale = (CAST_3D_FOCAL_LENGTH / depth) * CAST_3D_SCALE_MULTIPLIER;

    return { x: screenX, y: screenY, scale };
  }

  /** POV-style cast: floater starts in right hand, arcs up and left (arm swing), then falls to pond center */
  private updateCastFlightPOV(dt: number): void {
    this.castFlightT += dt / POV_CAST_FLIGHT_TIME;
    if (this.castFlightT >= 1) { this.castFlightT = 1; this.onFloatLanded(); return; }
    const t = this.castFlightT;

    const startX = POV_CAST_START_X;
    const startY = POV_CAST_START_Y;
    const startScale = POV_CAST_START_SCALE;

    const peakX = POV_CAST_PEAK_X;
    const peakY = POV_CAST_PEAK_Y;
    const peakScale = POV_CAST_PEAK_SCALE;
    const peakT = POV_CAST_PEAK_T;

    const endX = this.landingTargetX; // Power-adjusted landing position
    const endY = this.landingTargetY; // Power-adjusted landing position
    const endScale = POV_CAST_END_SCALE;
    let currentX: number;
    let currentY: number;
    let currentScale: number;

    if (t < peakT) {
      // Rising phase: hand to sky (ease-out for natural arm swing)
      const riseT = t / peakT;
      const eased = 1 - Math.pow(1 - riseT, 2); // ease-out quadratic

      currentX = startX + (peakX - startX) * eased;
      currentY = startY + (peakY - startY) * eased;
      currentScale = startScale + (peakScale - startScale) * eased;
    } else {
      // Falling phase: sky to pond (ease-in for gravity feel)
      const fallT = (t - peakT) / (1 - peakT);
      const eased = fallT * fallT; // ease-in quadratic (gravity)

      currentX = peakX + (endX - peakX) * eased;
      currentY = peakY + (endY - peakY) * eased;
      currentScale = peakScale + (endScale - peakScale) * fallT; // Linear scale for natural feel
    }

    this.castFloatX = currentX;
    this.castFloatY = currentY;
    this.castFloatScale = currentScale;
  }

  /** Side-view arc cast (original animation, kept as backup) */
  private updateCastFlightSideView(dt: number): void {
    this.castFlightT += dt / CAST_FLIGHT_TIME;
    if (this.castFlightT >= 1) { this.castFlightT = 1; this.onFloatLanded(); return; }
    const t = this.castFlightT;
    const arcHeight = CAST_MIN_ARC_HEIGHT + (this.castPower / 100) * (CAST_MAX_ARC_HEIGHT - CAST_MIN_ARC_HEIGHT);
    this.castFloatX = CAST_START_X + (this.landingTargetX - CAST_START_X) * t;
    this.castFloatY = CAST_START_Y + (this.landingTargetY - CAST_START_Y) * t - arcHeight * Math.sin(Math.PI * t);
    this.castFloatScale = 1.0;
  }

  private onFloatLanded(): void {
    this.phase = GamePhase.FloatLanded;

    // FIX Issues 2+3: Capture a snapshot of the current line's 2D positions
    // before snapping to the final position. This enables a smooth transition.
    if (USE_3D_PHYSICS_CAST && this.lineSegments3D.length > 0) {
      this.landingLineSnapshot = [];
      for (let i = 0; i < this.lineSegments3D.length; i++) {
        const p = this.project3Dto2D(this.lineSegments3D[i]);
        this.landingLineSnapshot.push({ x: p.x, y: p.y });
      }
      // Force first point to off-screen anchor and blend early points
      // (matching drawSegmentedLine3D off-screen clamping behavior)
      if (this.landingLineSnapshot.length > 0) {
        const anchor = { x: POV_LINE_START_X, y: POV_LINE_START_Y };
        this.landingLineSnapshot[0] = anchor;
        // Blend early points toward anchor (same as renderer)
        const fadeCount = Math.min(3, this.landingLineSnapshot.length - 1);
        for (let i = 1; i < fadeCount; i++) {
          const blendT = 1 - (i / fadeCount);
          const blendFactor = blendT * 0.6;
          this.landingLineSnapshot[i] = {
            x: this.landingLineSnapshot[i].x + (anchor.x - this.landingLineSnapshot[i].x) * blendFactor,
            y: this.landingLineSnapshot[i].y + (anchor.y - this.landingLineSnapshot[i].y) * blendFactor,
          };
        }
      }
    } else if (this.verletPositions.length >= 2) {
      // Verlet rope was active during bezier flight — project to 2D for snapshot
      this.landingLineSnapshot = [];
      for (let i = 0; i < this.verletPositions.length; i++) {
        const p = this.project3Dto2D(this.verletPositions[i]);
        this.landingLineSnapshot.push({ x: p.x, y: p.y });
      }
      // Force first point to off-screen anchor and blend early points
      if (this.landingLineSnapshot.length > 0) {
        const anchor = { x: POV_LINE_START_X, y: POV_LINE_START_Y };
        this.landingLineSnapshot[0] = anchor;
        const fadeCount = Math.min(3, this.landingLineSnapshot.length - 1);
        for (let i = 1; i < fadeCount; i++) {
          const blendT = 1 - (i / fadeCount);
          const blendFactor = blendT * 0.6;
          this.landingLineSnapshot[i] = {
            x: this.landingLineSnapshot[i].x + (anchor.x - this.landingLineSnapshot[i].x) * blendFactor,
            y: this.landingLineSnapshot[i].y + (anchor.y - this.landingLineSnapshot[i].y) * blendFactor,
          };
        }
      }
    } else {
      this.landingLineSnapshot = [];
    }

    // Keep castFloatX/Y as-is (they hold the physics-computed position)
    // Update landingTarget to match current float position for ripples & rest line
    this.landingTargetX = this.castFloatX;
    this.landingTargetY = this.castFloatY;
    this.floatLandedTimer = 0;
    this.splashTimer = 0;
    this.splashRipples = [];
    for (let i = 0; i < SPLASH_RIPPLE_COUNT; i++) {
      this.splashRipples.push({ x: this.landingTargetX, y: this.landingTargetY, radius: 0, maxRadius: 45, alpha: 0 });
    }
  }

  private updateFloatLanded(dt: number): void {
    this.splashTimer += dt;
    this.floatLandedTimer += dt;
    for (let i = 0; i < this.splashRipples.length; i++) {
      const ripple = this.splashRipples[i];
      const rippleStartTime = i * SPLASH_RIPPLE_DELAY;
      if (this.splashTimer >= rippleStartTime) {
        const elapsed = this.splashTimer - rippleStartTime;
        ripple.radius = elapsed * SPLASH_RIPPLE_EXPAND_SPEED;
        ripple.alpha = Math.max(0, 1 - ripple.radius / ripple.maxRadius);
      }
    }
    // FIX Issue 3: Continue physics line settling during FloatLanded
    //this.settleLineSegments(dt);
    if (this.floatLandedTimer >= FLOAT_LANDED_PAUSE) { this.splashRipples = []; this.enterFloatBounce(); }
  }

  private enterFloatBounce(): void {
    this.phase = GamePhase.FloatBounce;
    this.floatBounceTimer = 0;
    this.showingSurpriseEmoji = false;
    this.surpriseEmojiTimer = 0;

    // Pre-determine encounter at bounce start so "!" can appear immediately.
    // Recipe-driven: (zone, phase, lure) → deterministic fish + recipe.
    const zone = getZoneFromPower(this.lastCastPower);
    const phase = this.getCurrentPhase();
    const encounter = this.encounterSystem.selectCharacter(
      zone,
      phase,
      this.equippedLureId,
      this.flagSystem,
    );
    this.pendingEncounter = encounter;

    if (encounter) {
      // Set the one-shot "from" signal so the fish's entry knot can dispatch
      // to the right dialogue. Ink will clear this flag immediately on entry.
      this.flagSystem.set(recipeFromFlag(encounter.character.id, encounter.recipe.id), true);

      this.spawnEmotionIcon(EmotionIconType.Surprise, 'float');
      console.log(`[FloaterGame] FloatBounce started — ${encounter.character.id} matched recipe "${encounter.recipe.id}"`);
    } else {
      console.log('[FloaterGame] FloatBounce started — nothing bites');
    }
  }

  /** FIX Issue 3: Gradually settle line segments toward rest position.
   *  Lerps each segment toward where the static Bézier line would be,
   *  creating a smooth transition from physics to rest state. */
  private settleLineSegments(dt: number): void {
    if (this.lineSegments3D.length < 2) return;
    const numSegments = this.lineSegments3D.length;

    // Compute target "rest" positions: evenly spaced 3D points between
    // the rod tip (off-screen anchor) and the floater landing position.
    // Use the off-screen anchor as the rod tip target for settling.
    const rodTipTarget = this.rod3D.tipPos.clone();
    const floaterTarget = this.unproject2Dto3D(this.landingTargetX, this.landingTargetY, 1.0);

    // Lerp speed: settle quickly (exponential smoothing)
    const settleRate = 4.0; // per second
    const t = 1 - Math.exp(-settleRate * dt);

    // Keep first and last fixed
    this.lineSegments3D[0] = rodTipTarget;
    this.lineSegments3D[numSegments - 1] = floaterTarget;

    // Lerp intermediate segments toward evenly-spaced rest positions
    for (let i = 1; i < numSegments - 1; i++) {
      const fraction = i / (numSegments - 1);
      // Target: lerp between rod tip and floater with slight sag
      const targetX = rodTipTarget.x + (floaterTarget.x - rodTipTarget.x) * fraction;
      const targetZ = rodTipTarget.z + (floaterTarget.z - rodTipTarget.z) * fraction;
      // Add parabolic sag in Y
      const sagAmount = -0.5 * fraction * (1 - fraction) * 4; // max sag at midpoint
      const targetY = rodTipTarget.y + (floaterTarget.y - rodTipTarget.y) * fraction + sagAmount;

      const current = this.lineSegments3D[i];
      this.lineSegments3D[i] = new Vec3D(
        current.x + (targetX - current.x) * t,
        current.y + (targetY - current.y) * t,
        current.z + (targetZ - current.z) * t
      );
    }
  }

  private updateFloatBounce(dt: number): void {
    this.floatBounceTimer += dt;
    // FIX Issue 3: Continue physics line settling during FloatBounce
    this.settleLineSegments(dt);
    if (this.floatBounceTimer >= FLOAT_BOUNCE_DURATION) {
      // Bounce done — proceed to startCast which decides if a fish bites
      // Surprise emoji is spawned inside startCast only if a fish is found
      this.startCast();
    }
  }

  // === Save/Load ===

  /** Cached fish save data for characters not currently active.
   *  Populated from loaded save data and preserved across character switches. */
  private savedFishRecords: Record<string, FishSaveData> = {};

  private buildSaveData(): SaveData {
    // Merge: start with all previously saved fish records, then overlay current fish
    const allFish: Record<string, FishSaveData> = { ...this.savedFishRecords };
    // Always write current fish's live state (most up-to-date)
    allFish[this.fish.id] = {
      affection: this.fishAffection.value,
      drift: this.fish.currentDrift,
    };

    return {
      fish: allFish,
      flags: this.flagSystem.serialize(),
      seenBeats: Array.from(this.seenBeats),
      // castCount and currentCastIndex no longer persisted —
      // derived from globalStats.totalCasts and perFishCastIndex on load
      quests: this.questSystem.serialize(),
      perFishCastIndex: { ...this.perFishCastIndex },
      cgUnlocks: this.cgGallerySystem.serialize(),
      journal: this.journalSystem.serialize(),
      globalStats: this.globalStatsSystem.serialize(),
    };
  }

  private loadGame(): void {
    const data = this.saveSystem.loadSave();
    if (data) {
      // Populate savedFishRecords with ALL fish data from save
      this.savedFishRecords = {};
      for (const fishId of Object.keys(data.fish)) {
        this.savedFishRecords[fishId] = { ...data.fish[fishId] };
      }
      console.log(`[FloaterGame] Loaded ${Object.keys(this.savedFishRecords).length} fish records: ${Object.keys(this.savedFishRecords).join(', ')}`);

      const fishData = data.fish[this.fish.id];
      if (fishData) {
        this.fish.affection = fishData.affection;
        this.fish.currentDrift = fishData.drift;
        this.fishAffection = this.affectionSystem.restoreFromSave(this.fish.id, {
          value: fishData.affection,
          peakValue: fishData.peakValue ?? fishData.affection,
          lastChangeSessionId: fishData.lastChangeSessionId ?? '',
          lastChangeDelta: fishData.lastChangeDelta ?? 0,
        });
        this.displayedAffectionLabel = this.affectionSystem.getAffectionLabel(this.fishAffection.value);
      }
      this.flagSystem.deserialize(data.flags);
      this.seenBeats = new Set(data.seenBeats);

      if (data.cgUnlocks) {
        this.cgGallerySystem.deserialize(data.cgUnlocks);
      }
      if (data.journal) {
        this.journalSystem.deserialize(data.journal);
      }
      if (data.globalStats) {
        // Pass journal entries and flags to reconstruct derived stats
        this.globalStatsSystem.deserialize(
          data.globalStats,
          this.journalSystem.getAllFishEntries(),
          this.flagSystem.serialize(),
        );
      }

      // Reconstruct castCount from globalStats.totalCasts (or legacy field)
      this.castCount = this.globalStatsSystem.getStats().totalCasts || data.castCount || 0;

      // Reconstruct currentCastIndex from perFishCastIndex (or legacy field)
      if (data.perFishCastIndex) {
        this.perFishCastIndex = { ...data.perFishCastIndex };
        this.currentCastIndex = this.perFishCastIndex[this.fish.id] ?? data.currentCastIndex ?? 0;
      } else {
        this.currentCastIndex = data.currentCastIndex ?? 0;
        this.perFishCastIndex = {};
        if (this.currentCastIndex > 0) {
          this.perFishCastIndex[this.fish.id] = this.currentCastIndex;
        }
      }

      if (data.quests) {
        this.questSystem.deserialize(data.quests);
        // Reconstruct completedQuests from current conditions + flags
        const allChars = characterRegistry.getAllCharacters().map(c => ({ id: c.id, questRequirement: c.questRequirement }));
        this.questSystem.reconstructCompletedQuests(allChars, this.flagSystem);
      }
      console.log(`[FloaterGame] Loaded save: castCount=${this.castCount}, currentCastIndex=${this.currentCastIndex}`);
    } else {
      console.log('[FloaterGame] No save data found, starting fresh');
      this.savedFishRecords = {};
    }
  }

  // === Rendering ===
  private render(): void {
    if (!this.renderer) return;
    this.renderer.clear();

    // Title art is shown only when the player is actually on the title screen
    // — not during the Start-button fade-out, not during the intro, and not
    // during the intro's fade-out. Once `titleVisible` flips false (in
    // `onStartGame`) we treat the title as gone, even though `phase` is still
    // `Title` until `enterLakeIdle` runs at the end of the intro.
    const onTitleScreen = this.phase === GamePhase.Title
      && !this.introActive
      && floaterVM.titleVisible;
    if (onTitleScreen) {
      this.renderer.drawTitleBackground();
    } else {
      this.renderer.drawBackground(this.isDayMode);
    }

    // Draw title logo and decorative floater on title screen
    // (suppressed while the intro cinematic is showing so the overlay isn't
    // backed by the title's rod/float/line bleeding through.)
    if (onTitleScreen) {
      // Draw idle ripples behind the float
      this.renderer.drawSplashRipples(this.floatIdleRipples);
      // Draw fishing line from off-screen to the bobbing float
      const titleFloatX = CANVAS_WIDTH / 2;
      const titleBobOffset = Math.sin(this.time * FLOAT_BOB_SPEED) * FLOAT_BOB_AMPLITUDE;
      const titleFloatY = 570 + titleBobOffset;
      this.renderer.drawCastFishingLine(titleFloatX, titleFloatY, 1.0, USE_POV_CAST_ANIMATION, TITLE_LINE_START_X, TITLE_LINE_START_Y, this.time);
      // Draw bobbing float
      this.renderer.drawFloatAtScaled(titleFloatX, titleFloatY, 1.0, true);
    }

    // Only show static float during active phases (hide during Title, LakeIdle, Idle, CastCharging, Ending)
    const showStaticFloat = this.phase === GamePhase.FloatBounce
      || this.phase === GamePhase.Approach
      || this.phase === GamePhase.Exchange
      || this.phase === GamePhase.ActionSelect
      || this.phase === GamePhase.FishReaction
      || this.phase === GamePhase.Departure
      || this.phase === GamePhase.NothingBites;
    if (showStaticFloat) {
      // Use the same Bézier curve as the cast line (consistent appearance)
      // floatDip provides action animation feedback (Twitch/Reel dip the float)
      const bobOffset = Math.sin(this.time * FLOAT_BOB_SPEED) * FLOAT_BOB_AMPLITUDE;
      const dipOffset = this.floatDip;
      let floatDrawX = this.landingTargetX + this.actionAnimOffsetX;
      let floatDrawY = this.landingTargetY + bobOffset + dipOffset + this.actionAnimOffsetY;

      // During FloatBounce, override line endpoint to match the actual bounce sprite position
      if (this.phase === GamePhase.FloatBounce && !this.showingSurpriseEmoji) {
        const t = this.floatBounceTimer / FLOAT_BOUNCE_DURATION;
        const amplitude = FLOAT_BOUNCE_AMPLITUDE * (1 - t);
        const bobY = amplitude * Math.sin(t * FLOAT_BOUNCE_COUNT * 2 * Math.PI);
        floatDrawX = this.landingTargetX;
        floatDrawY = this.landingTargetY + bobY;
      }

      // Draw periodic idle ripples FIRST (behind float)
      this.renderer.drawSplashRipples(this.floatIdleRipples);
      this.renderer.drawCastFishingLine(floatDrawX, floatDrawY, 1.0, USE_POV_CAST_ANIMATION, undefined, undefined, this.time);
      // Draw float sprite at same position as line endpoint
      this.renderer.drawFloatAtScaled(floatDrawX, floatDrawY, 1.0, true);
    }

    if (this.phase === GamePhase.CastFlying) {
      // Draw fishing line attached to float during bezier flight
      if (this.isBezierFlying) {
        // Use Verlet rope simulation rendered via 3D segmented line
        if (this.verletPositions.length >= 2) {
          this.renderer.drawSegmentedLine3D(this.verletPositions, (v: Vec3D) => this.project3Dto2D(v));
        } else {
          // Fallback to flat bezier line if Verlet not initialized
          this.renderer.drawCastFishingLine(this.castFloatX, this.castFloatY, this.bezierFlightT, true, undefined, undefined, this.time);
        }
      } else if (USE_3D_PHYSICS_CAST) {
        this.renderer.drawSegmentedLine3D(this.lineSegments3D, (v: Vec3D) => this.project3Dto2D(v));
      } else {
        this.renderer.drawCastFishingLine(this.castFloatX, this.castFloatY, this.castFlightT, USE_POV_CAST_ANIMATION, undefined, undefined, this.time);
      }
      this.renderer.drawFloatAtScaled(this.castFloatX, this.castFloatY, this.castFloatScale, false, this.castFloatRotation);
    }
    if (this.phase === GamePhase.FloatLanded) {
      // FIX Issues 2+3: Use transition line that lerps from snapshot to resting curve
      if (this.landingLineSnapshot.length > 0) {
        const progress = Math.min(1.0, this.floatLandedTimer / FLOAT_LANDED_PAUSE);
        this.renderer.drawTransitionLine(this.landingLineSnapshot, this.castFloatX, this.castFloatY, progress, USE_POV_CAST_ANIMATION);
      } else {
        this.renderer.drawCastFishingLine(this.castFloatX, this.castFloatY, 1.0, USE_POV_CAST_ANIMATION, undefined, undefined, this.time);
      }
      this.renderer.drawFloatAt(this.castFloatX, this.castFloatY, true);
      this.renderer.drawSplashRipples(this.splashRipples);
    }
    // Cast trajectory preview during LakeIdle touch-drag
    // (zone debug overlay disabled — uncomment for level tuning)
    // if (this.isInCastAiming) {
    //   this.renderer.drawDebugZoneOverlay();
    // }
    if (this.phase === GamePhase.LakeIdle && this.isCastTouching) {
      this.renderer.drawCastTrajectoryBezier(this.castTrajectoryDistance, this.castTrajectoryOffsetX, this.previewLandingX, this.previewLandingY);
    }
    if (this.fishAlpha > 0) {
      this.renderer.drawCharacterRipples(this.characterRipples, this.fishAlpha);
      this.renderer.drawFishPortrait(this.fishAlpha, this.portraitOffsetX, this.portraitOffsetY, this.getPortraitTexture());
    }

    // Draw semi-transparent portrait as background during Ending phase
    if (this.phase === GamePhase.Ending) {
      const endingPortraitAlpha = 0.2 * Math.min(1, this.epitaphFadeTimer / this.EPITAPH_FADE_DURATION);
      if (endingPortraitAlpha > 0) {
        this.renderer.drawEndingPortrait(endingPortraitAlpha, this.getPortraitTexture());
      }
    }


    // Draw floating emotion icons
    this.renderer.drawFloatingEmotionIcons(this.floatingIcons);

    // Progress dots are now rendered in XAML (see floater.xaml HUD section)

    // Update XAML dialogue panel — controlled by phase, not text length (prevents flicker)
    const isDialoguePhase = this.phase === GamePhase.Exchange
      || this.phase === GamePhase.FishReaction
      || this.phase === GamePhase.ActionSelect
      || this.phase === GamePhase.Departure
      || this.phase === GamePhase.NothingBites;
    const showDialogue = isDialoguePhase;
    floaterVM.dialogueVisible = showDialogue;
    // Hide dialogue during ink-driven departure (empty text, fade-out only)
    if (this.phase === GamePhase.Departure && this.displayedText === '' && this.isTextComplete) {
      floaterVM.dialogueVisible = false;
    }
    // Affection gauge visible during dialogue exchange phases (not Departure or NothingBites).
    const showGauge = this.phase === GamePhase.Exchange
      || this.phase === GamePhase.FishReaction
      || this.phase === GamePhase.ActionSelect;
    floaterVM.gaugeVisible = showGauge;

    // Scenery/narration mode: triggered by asterisk prefix on the line
    // OR forced during NothingBites phase (no fish present, never show character name).
    // Detection uses the full line (not displayedText) so styling is stable through
    // the typewriter and not delayed by the first character render.
    // FIX: When currentLineIndex is past the end (e.g., ActionSelect after last scenery line),
    // use the last valid line to preserve the scenery/dialogue mode.
    const lineIdx = this.currentLineIndex < this.currentLines.length
      ? this.currentLineIndex
      : Math.max(0, this.currentLines.length - 1);
    const fullLine = this.currentLines[lineIdx] ?? '';
    const isScenery = fullLine.startsWith('*') || this.phase === GamePhase.NothingBites;
    floaterVM.speakerNameVisible = !isScenery;
    floaterVM.dialogueTextAlignment = isScenery ? 'Center' : 'Left';
    floaterVM.dialogueTextFontStyle = isScenery ? 'Italic' : 'Normal';

    if (showDialogue) {
      floaterVM.speakerName = isScenery ? '' : this.getFishDisplayName();
      floaterVM.speakerColor = this.fish.accentColor;
      floaterVM.dialogueText = isScenery ? this.displayedText.replace(/^\*+|\*+$/g, '') : this.displayedText;
      floaterVM.showContinue = this.isTextComplete;
      floaterVM.tapIndicatorVisible = this.isTextComplete;
    } else {
      floaterVM.tapIndicatorVisible = false;
    }

    // Draw day/night transition overlay
    if (this.dayNightFadeAlpha > 0) {
      const dayNightBrush = new SolidBrush(new Color(0, 0, 0, this.dayNightFadeAlpha));
      this.builder.drawRect(dayNightBrush, null, {
        x: 0, y: 0,
        width: CANVAS_WIDTH, height: CANVAS_HEIGHT,
      });
    }

    // Draw fade overlay (on top of everything)
    if (this.fadeAlpha > 0) {
      const fadeBrush = new SolidBrush(new Color(0, 0, 0, this.fadeAlpha));
      this.builder.drawRect(fadeBrush, null, {
        x: 0, y: 0,
        width: CANVAS_WIDTH, height: CANVAS_HEIGHT,
      });
    }

    floaterVM.drawCommands = this.builder.build();
  }

  // === Touch Setup ===
  private enableTouchInput(): void {
    try {
      const service = FocusedInteractionService.get();
      service.enableFocusedInteraction({
        disableFocusExitButton: true,
        disableEmotesButton: true,
        interactionStringId: 'floater_game',
      });

      // Disable default tap/trail visual feedback since the game has its own UI
      service.setTapOptions(false, {
        startColor: new Color(0, 0, 0, 0),
        endColor: new Color(0, 0, 0, 0),
        duration: 0,
        startScale: 0,
        endScale: 0,
      });

      service.setTrailOptions(false, {
        startColor: new Color(0, 0, 0, 0),
        endColor: new Color(0, 0, 0, 0),
        startWidth: 0,
        endWidth: 0,
        length: 0,
      });

      console.log('[FloaterGame] Touch input enabled, default UI hidden');
    } catch (e) {
      console.log('[FloaterGame] Failed to enable touch input');
    }
  }

  // === Hot Reload ===
  override onBeforeHotReload(): Maybe<Record<string, unknown>> {
    return super.onBeforeHotReload();
  }

  override onAfterHotReload(savedState: Record<string, unknown>): void {
    super.onAfterHotReload(savedState);
    this.renderer = new FloaterRenderer(this.builder);
    const customUi = this.entity.getComponent(CustomUiComponent);
    if (customUi != null) { customUi.dataContext = floaterVM; }
    this.syncViewModelFromState();
    if (NetworkingService.get().isPlayerContext()) { this.enableTouchInput(); }
    this.render();
  }

  private syncViewModelFromState(): void {
    // `titleVisible` is owned by the title→intro→LakeIdle flow (set false in
    // `onStartGame` and stays false from then on). Don't derive it from
    // `phase === Title` here: this method runs when save data loads, which
    // can land mid-fade-out and would re-show the title XAML grid (Start
    // button + rod) on top of the fading screen.
    if (this.phase === GamePhase.Title && this.fadeState === 'none' && !this.introActive) {
      floaterVM.titleVisible = true;
    }
    floaterVM.hudVisible = this.phase !== GamePhase.Title && this.phase !== GamePhase.Idle
      && this.phase !== GamePhase.LakeIdle
      && this.phase !== GamePhase.CastFlying && this.phase !== GamePhase.FloatLanded
      && this.phase !== GamePhase.Ending;
    floaterVM.actionMenuVisible = this.phase === GamePhase.ActionSelect || this.phase === GamePhase.FishReaction || this.phase === GamePhase.Exchange;
    if (this.phase === GamePhase.ActionSelect) {
      this.actionMenuAnimState = 'visible';
      floaterVM.actionMenuOpacity = 1;
      floaterVM.actionMenuTranslateY = 0;
    } else if ((this.phase === GamePhase.FishReaction || this.phase === GamePhase.Exchange) && this.actionMenuAnimState !== 'hidden') {
      this.actionMenuAnimState = 'visible';
      floaterVM.actionMenuOpacity = 1;
      floaterVM.actionMenuTranslateY = 0;
    } else {
      this.actionMenuAnimState = 'hidden';
      floaterVM.actionMenuOpacity = 0;
      floaterVM.actionMenuTranslateY = 40;
    }
    floaterVM.departureVisible = false; // Departure now uses dialogue panel
    floaterVM.idleVisible = this.phase === GamePhase.Idle;
    floaterVM.skipButtonVisible = this.canSkip;
    floaterVM.skipButtonOpacity = this.canSkip ? 1 : 0;
    floaterVM.castButtonVisible = false;
    floaterVM.inventoryButtonVisible = false;
    floaterVM.journalButtonVisible = false;
    floaterVM.fishNameText = this.getFishDisplayName();
    floaterVM.inventoryVisible = false;
    floaterVM.journalVisible = false;
    floaterVM.noLureWarningVisible = false;
    floaterVM.endingVisible = this.phase === GamePhase.Ending;
    if (this.phase === GamePhase.Ending) {
      floaterVM.endingOverlayOpacity = 1;
      floaterVM.endingText = this.epitaphFullText;
      floaterVM.endingTapVisible = true;
      this.epitaphTextComplete = true;
    }
    // Idle bar visibility sync — only visible during LakeIdle (hides when cast starts)
    const showIdleBarSync = this.phase === GamePhase.LakeIdle;
    floaterVM.idleBarVisible = showIdleBarSync;
    if (showIdleBarSync) {
      this.idleBarAnimState = 'visible';
      floaterVM.idleBarOpacity = 1;
      floaterVM.idleBarTranslateY = 0;
    } else {
      this.idleBarAnimState = 'hidden';
      floaterVM.idleBarOpacity = 0;
      floaterVM.idleBarTranslateY = 40;
    }
    floaterVM.tierTransitionVisible = false;
    this.syncAffectionDisplay();

    const isDialoguePhaseSync = this.phase === GamePhase.Exchange || this.phase === GamePhase.FishReaction
      || this.phase === GamePhase.ActionSelect || this.phase === GamePhase.Departure
      || this.phase === GamePhase.NothingBites;
    const showDialogueSync = isDialoguePhaseSync;
    floaterVM.dialogueVisible = showDialogueSync;
    // Hide dialogue during ink-driven departure (empty text, fade-out only)
    if (this.phase === GamePhase.Departure && this.displayedText === '' && this.isTextComplete) {
      floaterVM.dialogueVisible = false;
    }
    // Gauge visible during exchange/reaction/action phases.
    const showGaugeSync = this.phase === GamePhase.Exchange
      || this.phase === GamePhase.FishReaction
      || this.phase === GamePhase.ActionSelect;
    floaterVM.gaugeVisible = showGaugeSync;

    const lineIdxSync = this.currentLineIndex < this.currentLines.length
      ? this.currentLineIndex
      : Math.max(0, this.currentLines.length - 1);
    const fullLineSync = this.currentLines[lineIdxSync] ?? '';
    const isScenerySync = fullLineSync.startsWith('*') || this.phase === GamePhase.NothingBites;
    floaterVM.speakerNameVisible = !isScenerySync;
    floaterVM.dialogueTextAlignment = isScenerySync ? 'Center' : 'Left';
    floaterVM.dialogueTextFontStyle = isScenerySync ? 'Italic' : 'Normal';

    if (showDialogueSync) {
      floaterVM.speakerName = isScenerySync ? '' : this.getFishDisplayName();
      floaterVM.speakerColor = this.fish.accentColor;
      floaterVM.dialogueText = isScenerySync ? this.displayedText.replace(/^\*+|\*+$/g, '') : this.displayedText;
      floaterVM.showContinue = this.isTextComplete;
      floaterVM.tapIndicatorVisible = this.isTextComplete;
    } else {
      floaterVM.tapIndicatorVisible = false;
    }
  }

  /** Current Day/Night phase. Consumed by the encounter recipe system. */
  getCurrentPhase(): Phase {
    return this.isDayMode ? Phase.Day : Phase.Night;
  }
}
