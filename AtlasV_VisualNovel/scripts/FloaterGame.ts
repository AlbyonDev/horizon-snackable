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
import { QuestSystem } from './QuestSystem';
import { EncounterSystem } from './EncounterSystem';
import { ALL_LURES } from './LureData';
import { CGGallerySystem } from './CGGallerySystem';
import { JournalSystem } from './JournalSystem';
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
  CAST_3D_CALC_MIN_FLIGHT_TIME, CAST_3D_CALC_MAX_FLIGHT_TIME,
  CAST_LANDING_NEAR_Y, CAST_LANDING_FAR_Y, CAST_LANDING_X_VARIANCE,
  CAST_LANDING_X_OFFSET,
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
  EmotionIconType, EndingType,
} from './Types';
import type { Beat, ActionEffect, FishCharacter, FishAffection, SaveData, SplashRipple, FloatingEmotionIcon, EmotionIconAnchor, CharacterConfig, FishSaveData, LureReaction } from './Types';

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

  // Skip system
  private canSkip: boolean = false;

  // Character Ripples (expansion + fade, spawned periodically when portrait visible)
  private characterRipples: SplashRipple[] = [];
  private charRippleSpawnTimer: number = 0;

  // Cast Mechanics
  private powerGaugeValue: number = 0;

  // Float Idle Ripples (periodic expansion + fade while float is stationary)
  private floatIdleRipples: SplashRipple[] = [];
  private floatIdleRippleTimer: number = 0;
  private powerGaugeDir: number = 1;
  private castFlightT: number = 0;
  private castPower: number = 50;
  private castFloatX: number = 0;
  private castFloatY: number = 0;
  private castFloatScale: number = 1.0;
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
  private pendingEncounterCharacter: CharacterConfig | null = null;

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
    this.advanceBeat();
  }

  @subscribe(onFloaterCastStart)
  onCastStart(): void {
    if (this.phase !== GamePhase.LakeIdle) return;
    console.log('[FloaterGame] Cast button pressed → CastCharging');
    this.phase = GamePhase.CastCharging;
    this.powerGaugeValue = 0;
    this.powerGaugeDir = 1;
    // Disable idle buttons during the entire cast sequence
    floaterVM.idleBaitBtnEnabled = false;
    floaterVM.idleCastBtnEnabled = false;
    floaterVM.idleJournalBtnEnabled = false;
    // Hide idle bar immediately when cast starts (animate out)
    this.hideIdleBar();
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

    if (this.phase === GamePhase.CastCharging) {
      this.castPower = this.powerGaugeValue;
      this.launchFloat();
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
        this.enterLakeIdle();
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

  private updatePhase(dt: number): void {
    switch (this.phase) {
      case GamePhase.CastCharging: this.updatePowerGauge(dt); break;
      case GamePhase.CastFlying: this.updateCastFlight(dt); break;
      case GamePhase.FloatLanded: this.updateFloatLanded(dt); break;
      case GamePhase.FloatBounce: this.updateFloatBounce(dt); break;
      case GamePhase.NothingBites:
        this.nothingBitesTimer -= dt;
        this.updateTypewriter(dt);
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
      case GamePhase.Exchange: this.updateTypewriter(dt); break;
      case GamePhase.FishReaction: this.updateTypewriter(dt); break;
      case GamePhase.ActionSelect:
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
        // Character stays fully visible during departure dialogue.
        // Fade out only starts when showing the LAST departure line.
        if (this.currentLineIndex >= this.currentLines.length - 1) {
          this.departureFadeTimer += dt;
          this.fishAlpha = Math.max(0, 1 - this.departureFadeTimer / DEPARTURE_DURATION);
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
    const selectedCharacter = this.pendingEncounterCharacter;
    this.pendingEncounterCharacter = null;

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

    // Get per-fish cast index, clamped to the last available cast.
    const totalCasts = getCastCount(this.fish.id);
    this.currentCastIndex = Math.min(this.perFishCastIndex[this.fish.id] ?? 0, Math.max(0, totalCasts - 1));

    const currentCast = getCast(this.currentCastIndex, this.fish.id);
    console.log(`[FloaterGame] startCast: castCount=${this.castCount}, currentCastIndex=${this.currentCastIndex}/${totalCasts}, castName="${currentCast.name}", castId="${currentCast.id}"`);
    this.beats = getBeats(this.currentCastIndex, this.fish.id);
    console.log(`[FloaterGame] Loaded ${this.beats.length} beats for cast "${currentCast.name}"`);

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
    this.startNextBeat();
  }

  private startNextBeat(): void {
    if (this.currentBeatIndex >= this.beats.length) {
      if (this.flagSystem.check(`${this.fish.id}.release_ready`)
       || this.flagSystem.check(`${this.fish.id}.catch_available`)) {
        this.triggerEnding(EndingType.Release);
      } else {
        this.enterDeparture(this.fish.currentDrift || DriftState.Warm);
      }
      return;
    }

    const beat = this.beats[this.currentBeatIndex];
    console.log(`[FloaterGame] startNextBeat: beatIndex=${this.currentBeatIndex}, beatId="${beat.beatId}", firstLine="${beat.fishLines[0]}"`);
    if (this.seenBeats.has(beat.beatId)) {
      this.canSkip = true; floaterVM.skipButtonVisible = true; floaterVM.skipButtonOpacity = 1;
    } else {
      this.canSkip = false; floaterVM.skipButtonVisible = false; floaterVM.skipButtonOpacity = 0;
    }

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

        if (this.currentBeatIndex >= this.beats.length) {
          if (this.flagSystem.check(`${this.fish.id}.release_ready`)
           || this.flagSystem.check(`${this.fish.id}.catch_available`)) {
            this.triggerEnding(EndingType.Release);
          } else {
            this.enterDeparture(this.fish.currentDrift || DriftState.Warm);
          }
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
          if (this.flagSystem.check(`${this.fish.id}.release_ready`)
           || this.flagSystem.check(`${this.fish.id}.catch_available`)) {
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
        floaterVM.skipButtonVisible = false; floaterVM.skipButtonOpacity = 0;
      } else {
        this.phase = GamePhase.ActionSelect;
        this.showActionButtons();
        floaterVM.actionWaitEnabled = true;
        floaterVM.actionTwitchEnabled = true;
        floaterVM.actionDriftEnabled = true;
        floaterVM.actionReelEnabled = true;
        floaterVM.skipButtonVisible = false; floaterVM.skipButtonOpacity = 0;
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
    // REEL at max affection → trigger Reel ending directly, regardless of beat effects.
    if (actionId === ActionId.Reel && this.affectionSystem.isCatchReady(this.fishAffection)) {
      this.triggerEnding(EndingType.Reel);
      return;
    }

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

    // Spawn emotion icon
    if (effect.emotionIcon && effect.emotionIcon !== EmotionIconType.None) {
      this.spawnEmotionIcon(effect.emotionIcon);
    }

    // Animate float
    this.animateAction(actionId);

    // Show reaction
    this.phase = GamePhase.FishReaction;
    this.isShowingReaction = true;
    this.currentLines = effect.responseLines;
    this.currentLineIndex = 0;
    this.startNewLine();

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
    floaterVM.skipButtonVisible = false;

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
      this.currentLines = ['She drifts away...'];
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

  private advanceDepartureDialogue(): void {
    console.log(`[FloaterGame] advanceDepartureDialogue: lineIdx=${this.currentLineIndex}, totalLines=${this.currentLines.length}, currentCastIndex=${this.currentCastIndex}`);
    this.currentLineIndex++;
    if (this.currentLineIndex >= this.currentLines.length) {
      // All departure lines shown — increment cast index and go to LakeIdle
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
    const range = AFFECTION_MAX - AFFECTION_DRIFT_AWAY_THRESHOLD;
    const normalized = (this.fishAffection.value - AFFECTION_DRIFT_AWAY_THRESHOLD) / range;
    const percent = Math.max(0, Math.min(1, normalized)) * 100;
    floaterVM.affectionBarWidth = (percent / 100) * 200; // 200px max width
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

  // === Cast Mechanics ===
  private enterLakeIdle(): void {
    this.phase = GamePhase.LakeIdle;
    this.fishAlpha = 0;
    floaterVM.castButtonVisible = false;
    floaterVM.hudVisible = false;
    floaterVM.inventoryButtonVisible = false;
    floaterVM.journalButtonVisible = false;
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

    // Pre-determine encounter at bounce start so "!" can appear immediately
    const selectedCharacter = this.encounterSystem.selectCharacter(
      this.lastCastPower,
      this.equippedLureId,
      this.flagSystem,
      this.questSystem,
    );
    this.pendingEncounterCharacter = selectedCharacter;

    if (selectedCharacter) {
      // Fish found — spawn surprise emoji NOW (at the start of the bob)
      this.spawnEmotionIcon(EmotionIconType.Surprise, 'float');
      console.log('[FloaterGame] FloatBounce started — fish found, surprise emoji spawned!');
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

    // Use title background on title screen, pond background elsewhere
    if (this.phase === GamePhase.Title) {
      this.renderer.drawTitleBackground();
    } else {
      this.renderer.drawBackground();
    }

    // Draw title logo and decorative floater on title screen
    if (this.phase === GamePhase.Title) {
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
      const floatDrawX = this.landingTargetX + this.actionAnimOffsetX;
      const floatDrawY = this.landingTargetY + bobOffset + dipOffset + this.actionAnimOffsetY;
      // Draw periodic idle ripples FIRST (behind float)
      this.renderer.drawSplashRipples(this.floatIdleRipples);
      this.renderer.drawCastFishingLine(floatDrawX, floatDrawY, 1.0, USE_POV_CAST_ANIMATION, undefined, undefined, this.time);
      // During FloatBounce, draw float with bounce offset
      if (this.phase === GamePhase.FloatBounce && !this.showingSurpriseEmoji) {
        const t = this.floatBounceTimer / FLOAT_BOUNCE_DURATION;
        const amplitude = FLOAT_BOUNCE_AMPLITUDE * (1 - t);
        const bobY = amplitude * Math.sin(t * FLOAT_BOUNCE_COUNT * 2 * Math.PI);
        this.renderer.drawFloatAtScaled(this.landingTargetX, this.landingTargetY + bobY, 1.0, true);
      } else {
        this.renderer.drawFloatAtScaled(floatDrawX, floatDrawY, 1.0, true);
      }
    }

    if (this.phase === GamePhase.CastFlying) {
      if (USE_3D_PHYSICS_CAST) {
        this.renderer.drawSegmentedLine3D(this.lineSegments3D, (v: Vec3D) => this.project3Dto2D(v));
      } else {
        this.renderer.drawCastFishingLine(this.castFloatX, this.castFloatY, this.castFlightT, USE_POV_CAST_ANIMATION, undefined, undefined, this.time);
      }
      this.renderer.drawFloatAtScaled(this.castFloatX, this.castFloatY, this.castFloatScale);
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
    if (this.phase === GamePhase.CastCharging) this.renderer.drawPowerGauge(this.powerGaugeValue);
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
    floaterVM.titleVisible = this.phase === GamePhase.Title;
    floaterVM.hudVisible = this.phase !== GamePhase.Title && this.phase !== GamePhase.Idle
      && this.phase !== GamePhase.LakeIdle && this.phase !== GamePhase.CastCharging
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
}
