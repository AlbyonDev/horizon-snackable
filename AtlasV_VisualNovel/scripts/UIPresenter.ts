/**
 * UIPresenter — Unifies render() and syncViewModelFromState().
 *
 * One method (`present`) writes the full VM state every frame, including
 * dialogue text alignment, HUD visibility, action menu visibility, gauge
 * visibility, scenery vs character speech styling, fish portrait selection,
 * progress dots, and triggers the renderer for the drawing surface.
 *
 * The original code had two separate paths (`render`, `syncViewModelFromState`)
 * that duplicated ~80 lines of identical visibility logic with subtle drift
 * between them. They are now a single function — any visibility decision is
 * made exactly once.
 *
 * Also owns the small VM-helper functions used by the journal/inventory/CG
 * panels (refreshJournalData, buildAffectionValuesMap, etc.).
 */

import { Color } from 'meta/platform_api';
import { SolidBrush } from 'meta/custom_ui';
import {
  CANVAS_WIDTH, CANVAS_HEIGHT,
  FLOAT_BOB_SPEED, FLOAT_BOB_AMPLITUDE,
  TITLE_LINE_START_X, TITLE_LINE_START_Y,
  USE_POV_CAST_ANIMATION, USE_3D_PHYSICS_CAST,
  AFFECTION_MAX, AFFECTION_DRIFT_AWAY_THRESHOLD,
} from './Constants';
import { GamePhase, Phase, ANY_LURE } from './Types';
import { floaterVM } from './FloaterViewModel';
import { FloaterRenderer } from './FloaterRenderer';
import { DrawingCommandsBuilder } from 'meta/custom_ui';
import { characterRegistry } from './CharacterRegistry';
import { lureRedSpinnerTexture, lureGoldTeardropTexture, lureFeatherFlyTexture } from './Assets';
import type { FloaterSharedState } from './FloaterSharedState';
import type { CastSimulation } from './CastSimulation';
import { AnimationsRunner } from './AnimationsRunner';
import type { FlagSystem } from './FlagSystem';
import type { JournalSystem } from './JournalSystem';
import type { CGGallerySystem } from './CGGallerySystem';
import type { GlobalStatsSystem } from './GlobalStatsSystem';

/** Per-frame dialogue snapshot owned by DialogueController and read by
 *  UIPresenter. Avoids exposing all of DialogueController's internals. */
export interface DialogueSnapshot {
  currentLines: string[];
  currentLineIndex: number;
  displayedText: string;
  isTextComplete: boolean;
  canSkip: boolean;
}

export class UIPresenter {
  constructor(
    private readonly state: FloaterSharedState,
    private readonly cast: CastSimulation,
    private readonly anim: AnimationsRunner,
    private readonly builder: DrawingCommandsBuilder,
    private readonly renderer: FloaterRenderer,
    private readonly flagSystemRef: { current: FlagSystem },
    private readonly journalSystemRef: { current: JournalSystem },
    private readonly cgGallerySystemRef: { current: CGGallerySystem },
    private readonly globalStatsSystemRef: { current: GlobalStatsSystem },
  ) {}

  /** Get the current fish's display name, respecting trueName/trueNameFlag. */
  getFishDisplayName(): string {
    return characterRegistry.getDisplayName(this.state.fish.id, this.flagSystemRef.current.serialize());
  }

  /** Correct portrait texture for the current fish. */
  getPortraitTexture() {
    const config = characterRegistry.getCharacter(this.state.fish.id);
    if (config) return config.portraitTexture;
    return characterRegistry.getCharacter(characterRegistry.getDefaultCharacterId())!.portraitTexture;
  }

  /** Build a map of characterId → affection for journal + character detail. */
  buildAffectionValuesMap(): Record<string, number> {
    const values: Record<string, number> = {};
    values[this.state.fish.id] = this.state.fishAffection.value;
    for (const [id, data] of Object.entries(this.state.savedFishRecords)) {
      values[id] = data.affection;
    }
    return values;
  }

  /** Sync the HUD-side affection display: bar, marker, mood text, dots. */
  syncAffectionDisplay(): void {
    // Narrative progression — milestones if available, else affection ratio.
    const config = characterRegistry.getCharacter(this.state.fish.id);
    const milestones = config?.progressionMilestones;
    let progress: number;
    if (milestones && milestones.length > 0) {
      let reached = 0;
      for (const key of milestones) {
        if (this.flagSystemRef.current.check(key)) reached++;
      }
      progress = reached / milestones.length;
    } else {
      const range = AFFECTION_MAX - AFFECTION_DRIFT_AWAY_THRESHOLD;
      const normalized = (this.state.fishAffection.value - AFFECTION_DRIFT_AWAY_THRESHOLD) / range;
      progress = Math.max(0, Math.min(1, normalized));
    }
    floaterVM.affectionBarWidth = progress * 200;
    floaterVM.updateGaugeMarker(this.state.fishAffection.value);

    floaterVM.hudPortrait = this.state.fish.portrait ?? this.getPortraitTexture();
    floaterVM.hudNameColor = this.state.fish.accentColor;
    floaterVM.hudNameText = this.getFishDisplayName();
    floaterVM.hudMoodText = this.state.displayedAffectionLabel;
    floaterVM.hudMoodColor = this.state.fish.accentColor;
    floaterVM.hudNameMoodText = this.getFishDisplayName();
    floaterVM.emotionName = '';
    floaterVM.tierText = this.state.displayedAffectionLabel;

    const totalCasts = characterRegistry.getCastCount(this.state.fish.id);
    this.anim.progressDotsTotal = totalCasts;
    this.anim.progressDotsFilled = Math.min(this.state.currentCastIndex, totalCasts);
    floaterVM.setProgressDots(this.anim.progressDotsTotal, this.anim.progressDotsFilled);
  }

  /** Refresh all journal-panel data from current game state. */
  refreshJournalData(): void {
    floaterVM.setStatItems(this.globalStatsSystemRef.current.getStructuredStats());
    floaterVM.setBadgeItems(this.globalStatsSystemRef.current.getStructuredBadges());
    floaterVM.journalMetCounter = this.journalSystemRef.current.getMetCounterText();

    const cards = this.journalSystemRef.current.getCharacterCardsData(this.buildAffectionValuesMap(), this.flagSystemRef.current.serialize());
    floaterVM.setCharacterCards(cards.map(card => {
      const config = characterRegistry.getCharacter(card.id);
      return {
        id: card.id,
        name: card.name,
        species: card.species,
        tier: card.tierName,
        casts: String(card.castsMade),
        unlocked: card.unlocked,
        completed: this.flagSystemRef.current.check(`${card.id}.ending_complete`),
        spritePath: config?.portraitSpritePath ?? '',
        texture: config?.portraitTexture,
        accentColor: card.accentColor,
      };
    }));

    const cgCards = this.cgGallerySystemRef.current.getGalleryCards();
    floaterVM.setCGCards(cgCards.map(cg => ({
      id: cg.id,
      name: cg.name,
      unlocked: cg.isUnlocked,
      spritePath: cg.thumbnailPath,
      texture: cg.thumbnailTexture,
    })));
    floaterVM.cgCollectionProgress = this.cgGallerySystemRef.current.getCollectionText();
  }

  /** Open the character-detail panel for the given character id. */
  openCharacterDetail(charId: string): void {
    const affectionValues = this.buildAffectionValuesMap();
    const cards = this.journalSystemRef.current.getCharacterCardsData(affectionValues, this.flagSystemRef.current.serialize());
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

    const currentFlags = this.flagSystemRef.current.serialize();
    if (character?.facts) {
      const unlockedFacts = character.facts
        .filter(f => currentFlags[f.flagKey])
        .map(f => f.text);
      floaterVM.charDetailObservations = unlockedFacts.length > 0
        ? unlockedFacts.map(t => `• ${t}`).join('\n')
        : 'No observations yet.';
    } else {
      floaterVM.charDetailObservations = 'No observations yet.';
    }

    const targetRecipe = this.journalSystemRef.current.getTargetRecipe(charId, currentFlags);
    if (targetRecipe) {
      const zoneLabels: Record<string, string> = {
        near: 'Near bank',
        mid: 'Mid waters',
        far: 'Deep waters',
      };
      floaterVM.charDetailLocationZone = zoneLabels[targetRecipe.zone] ?? targetRecipe.zone;

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

      floaterVM.charDetailLocationPhaseRotation = targetRecipe.phase === Phase.Day ? 180 : 0;
      floaterVM.charDetailLocationVisible = true;
    } else {
      floaterVM.charDetailLocationVisible = false;
    }

    floaterVM.charDetailVisible = true;
  }

  // === Main per-frame presenter ===

  /** Single source of truth for ViewModel state + rendering. Called every
   *  frame from the orchestrator's onUpdate and also from `syncFromState`
   *  on save-load / hot-reload paths (which doesn't need the drawing surface
   *  but does need the VM caught up). */
  present(dialogue: DialogueSnapshot): void {
    this.renderer.clear();
    this.drawScene(dialogue);
    this.updateViewModelVisibility(dialogue);
    floaterVM.drawCommands = this.builder.build();
  }

  /** No-draw variant: writes VM state but doesn't run the renderer. Used by
   *  save-load and hot-reload code paths that need to bring the VM up to date
   *  without owning a drawing-surface frame. */
  syncFromState(dialogue: DialogueSnapshot): void {
    this.updateViewModelVisibility(dialogue);
    if (this.state.phase === GamePhase.Ending) {
      // Hot-reload special case: snap epitaph to fully shown.
      floaterVM.endingOverlayOpacity = 1;
      floaterVM.endingText = this.anim.epitaphFullText;
      floaterVM.endingTapVisible = true;
      this.anim.epitaphTextComplete = true;
    }
  }

  // === Drawing surface composition ===

  private drawScene(dialogue: DialogueSnapshot): void {
    const phase = this.state.phase;
    const time = this.state.time;

    const onTitleScreen = phase === GamePhase.Title
      && !this.anim.introActive
      && floaterVM.titleVisible;

    if (onTitleScreen) {
      this.renderer.drawTitleBackground();
    } else {
      this.renderer.drawBackground(this.state.isDayMode);
    }

    // Title decorations.
    if (onTitleScreen) {
      this.renderer.drawSplashRipples(this.anim.floatIdleRipples);
      const titleFloatX = CANVAS_WIDTH / 2;
      const titleBobOffset = Math.sin(time * FLOAT_BOB_SPEED) * FLOAT_BOB_AMPLITUDE;
      const titleFloatY = 570 + titleBobOffset;
      this.renderer.drawCastFishingLine(titleFloatX, titleFloatY, 1.0, USE_POV_CAST_ANIMATION, TITLE_LINE_START_X, TITLE_LINE_START_Y, time);
      this.renderer.drawFloatAtScaled(titleFloatX, titleFloatY, 1.0, true);
    }

    // Static float during gameplay phases.
    const showStaticFloat = phase === GamePhase.FloatBounce
      || phase === GamePhase.Approach
      || phase === GamePhase.Exchange
      || phase === GamePhase.ActionSelect
      || phase === GamePhase.FishReaction
      || phase === GamePhase.Departure
      || phase === GamePhase.NothingBites;
    if (showStaticFloat) {
      const bobOffset = Math.sin(time * FLOAT_BOB_SPEED) * FLOAT_BOB_AMPLITUDE;
      const dipOffset = this.cast.floatDip;
      let floatDrawX = this.cast.landingTargetX + this.cast.actionAnimOffsetX;
      let floatDrawY = this.cast.landingTargetY + bobOffset + dipOffset + this.cast.actionAnimOffsetY;

      if (phase === GamePhase.FloatBounce) {
        const bounced = this.cast.computeBouncedFloatPos();
        floatDrawX = bounced.x;
        floatDrawY = bounced.y;
      }

      this.renderer.drawSplashRipples(this.anim.floatIdleRipples);
      this.renderer.drawCastFishingLine(floatDrawX, floatDrawY, 1.0, USE_POV_CAST_ANIMATION, undefined, undefined, time);
      this.renderer.drawFloatAtScaled(floatDrawX, floatDrawY, 1.0, true);
    }

    // Cast flight visuals.
    if (phase === GamePhase.CastFlying) {
      if (this.cast.isBezierFlying) {
        if (this.cast.verletPositions.length >= 2) {
          this.renderer.drawSegmentedLine3D(this.cast.verletPositions, (v) => this.cast.project3Dto2D(v));
        } else {
          this.renderer.drawCastFishingLine(this.cast.castFloatX, this.cast.castFloatY, this.cast.bezierFlightT, true, undefined, undefined, time);
        }
      } else if (USE_3D_PHYSICS_CAST) {
        this.renderer.drawSegmentedLine3D(this.cast.lineSegments3D, (v) => this.cast.project3Dto2D(v));
      } else {
        this.renderer.drawCastFishingLine(this.cast.castFloatX, this.cast.castFloatY, this.cast.castFlightT, USE_POV_CAST_ANIMATION, undefined, undefined, time);
      }
      this.renderer.drawFloatAtScaled(this.cast.castFloatX, this.cast.castFloatY, this.cast.castFloatScale, false, this.cast.castFloatRotation);
    }

    // Float-landed splash + transition line.
    if (phase === GamePhase.FloatLanded) {
      if (this.cast.landingLineSnapshot.length > 0) {
        const progress = Math.min(1.0, this.getLandedProgress());
        this.renderer.drawTransitionLine(this.cast.landingLineSnapshot, this.cast.castFloatX, this.cast.castFloatY, progress, USE_POV_CAST_ANIMATION);
      } else {
        this.renderer.drawCastFishingLine(this.cast.castFloatX, this.cast.castFloatY, 1.0, USE_POV_CAST_ANIMATION, undefined, undefined, time);
      }
      this.renderer.drawFloatAt(this.cast.castFloatX, this.cast.castFloatY, true);
      this.renderer.drawSplashRipples(this.cast.splashRipples);
    }

    // Cast trajectory preview during LakeIdle drag.
    if (phase === GamePhase.LakeIdle && this.cast.isCastTouching) {
      this.renderer.drawCastTrajectoryBezier(
        this.cast.castTrajectoryDistance,
        this.cast.castTrajectoryOffsetX,
        this.cast.previewLandingX,
        this.cast.previewLandingY,
      );
    }

    // Fish portrait + ripples.
    if (this.anim.fishAlpha > 0) {
      this.renderer.drawCharacterRipples(this.anim.characterRipples, this.anim.fishAlpha);
      this.renderer.drawFishPortrait(this.anim.fishAlpha, this.anim.portraitOffsetX, this.anim.portraitOffsetY, this.getPortraitTexture());
    }

    // Semi-transparent ending portrait.
    if (phase === GamePhase.Ending) {
      const endingPortraitAlpha = 0.2 * Math.min(1, this.anim.epitaphFadeTimer / AnimationsRunner.EPITAPH_FADE_DURATION);
      if (endingPortraitAlpha > 0) {
        this.renderer.drawEndingPortrait(endingPortraitAlpha, this.getPortraitTexture());
      }
    }

    // Floating emotion icons on top.
    this.renderer.drawFloatingEmotionIcons(this.anim.floatingIcons);

    // Day/Night fade overlay.
    if (this.anim.dayNightFadeAlpha > 0) {
      const brush = new SolidBrush(new Color(0, 0, 0, this.anim.dayNightFadeAlpha));
      this.builder.drawRect(brush, null, { x: 0, y: 0, width: CANVAS_WIDTH, height: CANVAS_HEIGHT });
    }

    // Title→idle fade overlay.
    if (this.anim.fadeAlpha > 0) {
      const brush = new SolidBrush(new Color(0, 0, 0, this.anim.fadeAlpha));
      this.builder.drawRect(brush, null, { x: 0, y: 0, width: CANVAS_WIDTH, height: CANVAS_HEIGHT });
    }
  }

  /** Floats the landed-progress fraction (0..1) for the transition line.
   *  Owned by CastSim conceptually but exposed via splash timer fraction. */
  private getLandedProgress(): number {
    // Public access: cast doesn't expose floatLandedTimer; the renderer used
    // FLOAT_LANDED_PAUSE as the divisor. We compute from splash ripple state
    // (first ripple's progress is a stable proxy). If splashRipples empty,
    // assume 1.0 (fully transitioned).
    if (this.cast.splashRipples.length === 0) return 1.0;
    const first = this.cast.splashRipples[0];
    return Math.min(1.0, first.radius / first.maxRadius);
  }

  // === ViewModel composition (the unified ex-syncViewModelFromState + render) ===

  private updateViewModelVisibility(dialogue: DialogueSnapshot): void {
    const phase = this.state.phase;

    // Title visibility — owned by the title→intro→LakeIdle flow. Don't derive
    // from `phase === Title` directly because save-load can land mid-fade-out
    // and we must not re-show the title overlay.
    if (phase === GamePhase.Title && this.anim.fadeState === 'none' && !this.anim.introActive) {
      floaterVM.titleVisible = true;
    }

    floaterVM.hudVisible = phase !== GamePhase.Title
      && phase !== GamePhase.Idle
      && phase !== GamePhase.LakeIdle
      && phase !== GamePhase.CastFlying
      && phase !== GamePhase.FloatLanded
      && phase !== GamePhase.Ending;

    floaterVM.actionMenuVisible = phase === GamePhase.ActionSelect
      || phase === GamePhase.FishReaction
      || phase === GamePhase.Exchange;

    floaterVM.departureVisible = false;
    floaterVM.idleVisible = phase === GamePhase.Idle;
    floaterVM.skipButtonVisible = dialogue.canSkip;
    floaterVM.skipButtonOpacity = dialogue.canSkip ? 1 : 0;
    floaterVM.castButtonVisible = false;
    floaterVM.inventoryButtonVisible = false;
    floaterVM.fishNameText = this.getFishDisplayName();
    floaterVM.endingVisible = phase === GamePhase.Ending;

    // Idle bar visibility sync.
    const showIdleBarSync = phase === GamePhase.LakeIdle;
    floaterVM.idleBarVisible = showIdleBarSync;

    floaterVM.tierTransitionVisible = false;
    this.syncAffectionDisplay();

    // Dialogue panel + scenery styling.
    const isDialoguePhase = phase === GamePhase.Exchange
      || phase === GamePhase.FishReaction
      || phase === GamePhase.ActionSelect
      || phase === GamePhase.Departure
      || phase === GamePhase.NothingBites;
    floaterVM.dialogueVisible = isDialoguePhase;

    // Hide dialogue during ink-driven departure (empty text, fade-out only).
    if (phase === GamePhase.Departure && dialogue.displayedText === '' && dialogue.isTextComplete) {
      floaterVM.dialogueVisible = false;
    }

    // Gauge visibility — dialogue phases except Departure/NothingBites.
    const showGauge = phase === GamePhase.Exchange
      || phase === GamePhase.FishReaction
      || phase === GamePhase.ActionSelect;
    floaterVM.gaugeVisible = showGauge;

    // Scenery vs character speech: leading '*' marks narration; also NothingBites.
    const lineIdx = dialogue.currentLineIndex < dialogue.currentLines.length
      ? dialogue.currentLineIndex
      : Math.max(0, dialogue.currentLines.length - 1);
    const fullLine = dialogue.currentLines[lineIdx] ?? '';
    const isScenery = fullLine.startsWith('*') || phase === GamePhase.NothingBites;
    floaterVM.speakerNameVisible = !isScenery;
    floaterVM.dialogueTextAlignment = isScenery ? 'Center' : 'Left';
    floaterVM.dialogueTextFontStyle = isScenery ? 'Italic' : 'Normal';

    if (floaterVM.dialogueVisible) {
      floaterVM.speakerName = isScenery ? '' : this.getFishDisplayName();
      floaterVM.speakerColor = this.state.fish.accentColor;
      floaterVM.dialogueText = isScenery ? dialogue.displayedText.replace(/^\*+|\*+$/g, '') : dialogue.displayedText;
      floaterVM.showContinue = dialogue.isTextComplete;
      floaterVM.tapIndicatorVisible = dialogue.isTextComplete;
    } else {
      floaterVM.tapIndicatorVisible = false;
    }
  }
}
