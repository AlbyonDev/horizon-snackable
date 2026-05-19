/**
 * PhaseController — Phase state machine + transitions.
 *
 * Owns the small set of phase-transition state (phaseTimer, approach delays)
 * and orchestrates the per-phase update dispatch each frame. All
 * `state.phase` writes go through this controller.
 *
 * Transitions follow a clear topology:
 *   Title → (intro) → LakeIdle → CastFlying → FloatLanded → FloatBounce →
 *   {NothingBites → LakeIdle} | {Approach → Exchange ↔ ActionSelect ↔ FishReaction → Departure → LakeIdle} | {Ending → LakeIdle}
 *
 * Implements `PhaseTransitions` so DialogueController can request the
 * downstream transitions without owning a back-reference to this class.
 */

import { floaterVM } from './FloaterViewModel';
import {
  GamePhase, DriftState, ExpressionState, EmotionIconType,
} from './Types';
import {
  APPROACH_DURATION, DEPARTURE_DURATION,
} from './Constants';
import { EncounterSystem, getZoneFromPower, recipeFromFlag } from './EncounterSystem';
import type { EncounterResult } from './EncounterSystem';
import { characterRegistry } from './CharacterRegistry';
import { getBeats, getCast, getCastCount } from './CastData';
import { resolveFishEntryKnot, buildBeatsFromInk } from './InkBeatAdapter';
import type { Beat } from './Types';
import type { FloaterSharedState } from './FloaterSharedState';
import type { CastSimulation } from './CastSimulation';
import type { AnimationsRunner } from './AnimationsRunner';
import type { DialogueController, PhaseTransitions } from './DialogueController';
import type { FlagSystem } from './FlagSystem';
import type { QuestSystem } from './QuestSystem';
import type { CGGallerySystem } from './CGGallerySystem';
import type { JournalSystem } from './JournalSystem';
import type { GlobalStatsSystem } from './GlobalStatsSystem';
import type { AffectionSystem } from './AffectionSystem';
import type { UIPresenter } from './UIPresenter';

export interface PhaseSaveHooks {
  flushImmediate(): void;
  requestSave(): void;
  persistCGData(): void;
}

export class PhaseController implements PhaseTransitions {
  // === Phase-transition local state ===
  phaseTimer: number = 0;

  // === Approach sequencing (portrait fade-in, emotion icon delay) ===
  private approachPortraitDelay: number = 0.3;
  private approachEmotionDelay: number = 0.8;
  private approachEmotionSpawned: boolean = false;

  // === Pre-determined encounter (resolved at bounce start) ===
  private pendingEncounter: EncounterResult | null = null;

  constructor(
    private readonly state: FloaterSharedState,
    private readonly cast: CastSimulation,
    private readonly anim: AnimationsRunner,
    private readonly dialogue: DialogueController,
    private readonly presenter: UIPresenter,
    private readonly flagSystemRef: { current: FlagSystem },
    private readonly questSystemRef: { current: QuestSystem },
    private readonly cgGallerySystemRef: { current: CGGallerySystem },
    private readonly journalSystemRef: { current: JournalSystem },
    private readonly globalStatsSystemRef: { current: GlobalStatsSystem },
    private readonly encounterSystem: EncounterSystem,
    private readonly affectionSystem: AffectionSystem,
    private readonly save: PhaseSaveHooks,
  ) {}

  // === Per-frame dispatch ===

  update(dt: number): void {
    const phase = this.state.phase;

    switch (phase) {
      case GamePhase.CastFlying: {
        const ev = this.cast.updateFlight(dt);
        if (ev === 'landed') {
          this.state.phase = GamePhase.FloatLanded;
        }
        break;
      }
      case GamePhase.FloatLanded: {
        const done = this.cast.updateLanded(dt);
        if (done) {
          this.enterFloatBounce();
        }
        break;
      }
      case GamePhase.FloatBounce: {
        const done = this.cast.updateBounce(dt);
        if (done) {
          this.startCast();
        }
        break;
      }
      case GamePhase.NothingBites: {
        this.dialogue.updateTypewriter(dt);
        this.dialogue.updateSkip(dt);
        if (this.dialogue.updateNothingBitesTimer(dt)) {
          floaterVM.dialogueVisible = false;
          this.enterLakeIdle();
        }
        break;
      }
      case GamePhase.Approach: {
        this.phaseTimer += dt;
        if (this.phaseTimer >= this.approachPortraitDelay) {
          const fadeElapsed = this.phaseTimer - this.approachPortraitDelay;
          const fadeDuration = 0.5;
          this.anim.fishAlpha = Math.min(1, fadeElapsed / fadeDuration);
        } else {
          this.anim.fishAlpha = 0;
        }
        if (!this.approachEmotionSpawned && this.phaseTimer >= this.approachEmotionDelay) {
          this.approachEmotionSpawned = true;
          this.anim.spawnEmotionIcon(EmotionIconType.Hesitation);
        }
        if (this.phaseTimer >= APPROACH_DURATION) this.enterExchange();
        break;
      }
      case GamePhase.Exchange:
      case GamePhase.FishReaction:
        this.dialogue.updateTypewriter(dt);
        this.dialogue.updateSkip(dt);
        break;
      case GamePhase.ActionSelect:
        if (this.dialogue.skipActive) this.dialogue.cancelSkip();
        this.dialogue.updateSilentBeat(dt);
        break;
      case GamePhase.Departure: {
        this.phaseTimer += dt;
        this.dialogue.updateTypewriter(dt);
        this.dialogue.updateSkip(dt);
        if (this.dialogue.currentLineIndex >= this.dialogue.currentLines.length - 1) {
          this.dialogue.departureFadeTimer += dt;
          this.anim.fishAlpha = Math.max(0, 1 - this.dialogue.departureFadeTimer / DEPARTURE_DURATION);
          if (this.dialogue.isTextComplete
              && this.dialogue.departureFadeTimer >= DEPARTURE_DURATION
              && this.anim.fishAlpha <= 0) {
            this.advanceDeparture();
          }
        } else {
          this.anim.fishAlpha = 1;
        }
        break;
      }
      case GamePhase.Ending:
        this.anim.updateEpitaphAnimation(dt);
        break;
      default:
        break;
    }

    // Inter-beat pause (kept globally — used by Exchange but ticked
    // independently of switch so the timer survives phase-internal updates).
    if (this.dialogue.updateBeatPause(dt)) {
      // GUARD: Only fire startNextBeat if still in Exchange phase.
      if (this.state.phase === GamePhase.Exchange) {
        this.dialogue.startNextBeat();
      }
    }
    this.dialogue.updateNoLureWarning(dt);
  }

  // === Public transitions ===

  enterLakeIdle(): void {
    this.state.phase = GamePhase.LakeIdle;
    this.anim.fishAlpha = 0;
    this.cast.cancelAim();
    floaterVM.castInstructionVisible = false;
    floaterVM.castButtonVisible = false;
    floaterVM.hudVisible = false;
    floaterVM.inventoryButtonVisible = false;
    // Defensive: ensure title is hidden when arriving at LakeIdle (covers
    // the skipped-intro path).
    floaterVM.titleVisible = false;
    this.dialogue.canSkip = false;
    this.dialogue.skipActive = false;
    floaterVM.skipButtonVisible = false;
    floaterVM.skipButtonOpacity = 0;
    floaterVM.idleBaitBtnEnabled = true;
    floaterVM.idleCastBtnEnabled = true;
    floaterVM.idleJournalBtnEnabled = true;
    this.anim.showIdleBar();
  }

  startIntro(): void {
    this.anim.beginIntro();
  }

  /** Title's Start button pressed → begin the fade then enter intro/LakeIdle. */
  beginStartGameFade(): void {
    this.globalStatsSystemRef.current.incrementPlaySession();
    this.save.requestSave();
    this.anim.beginTitleFadeOut();
  }

  /** Called by AnimationsRunner's fade-to-black callback. */
  onTitleFadeComplete(): void {
    if (!this.flagSystemRef.current.check('run.intro_seen')) {
      this.startIntro();
    } else {
      this.enterLakeIdle();
    }
  }

  /** Called by AnimationsRunner's intro-complete callback. */
  onIntroComplete(): void {
    this.flagSystemRef.current.set('run.intro_seen', true);
    this.save.requestSave();
    this.save.flushImmediate();
    this.enterLakeIdle();
  }

  // === Cast progression transitions ===

  enterFloatBounce(): void {
    this.state.phase = GamePhase.FloatBounce;
    this.cast.beginFloatBounce();

    // Pre-determine encounter at bounce start so "!" can appear immediately.
    const zone = getZoneFromPower(this.cast.lastCastPower);
    const phase = this.state.getCurrentPhase();
    const encounter = this.encounterSystem.selectCharacter(
      zone,
      phase,
      this.state.equippedLureId,
      this.flagSystemRef.current,
      (fishId) => fishId === this.state.fish.id
        ? this.state.fishAffection.value
        : (this.state.savedFishRecords[fishId]?.affection ?? 0),
    );
    this.pendingEncounter = encounter;

    if (encounter) {
      this.flagSystemRef.current.set(recipeFromFlag(encounter.character.id, encounter.recipe.id), true);
      this.anim.spawnEmotionIcon(EmotionIconType.Surprise, 'float', this.cast.landingTargetX, this.cast.landingTargetY);
    }
  }

  /** Equivalent to the original `startCast` — sets up the cast after a
   *  successful bounce + encounter resolution. */
  startCast(): void {
    this.state.castCount++;

    // Snapshot flags at cast start for detecting newly discovered facts.
    const flagsAtCastStart = { ...this.flagSystemRef.current.serialize() };

    const encounter = this.pendingEncounter;
    this.pendingEncounter = null;
    const selectedCharacter = encounter?.character ?? null;

    if (!selectedCharacter) {
      this.state.phase = GamePhase.NothingBites;
      this.dialogue.beginNothingBites();
      this.anim.floatingIcons = [];
      // Reset portrait animation so nothing bobs/shakes during NothingBites.
      this.anim.clearPortraitAnimation();
      // Reset cast cosmetic state.
      this.cast.resetForNewCast();
      return;
    }

    // Initialize or restore fish state for selected character.
    if (this.state.fish.id !== selectedCharacter.id) {
      this.state.savedFishRecords[this.state.fish.id] = {
        affection: this.state.fishAffection.value,
        drift: this.state.fish.currentDrift,
      };

      this.state.fish = selectedCharacter.initialState();
      const savedFishData = this.state.savedFishRecords[selectedCharacter.id];
      if (savedFishData) {
        this.state.fish.affection = savedFishData.affection;
        this.state.fish.currentDrift = savedFishData.drift;
        this.state.fishAffection = this.affectionSystem.restoreFromSave(selectedCharacter.id, {
          value: savedFishData.affection,
          lastChangeSessionId: savedFishData.lastChangeSessionId ?? '',
          lastChangeDelta: savedFishData.lastChangeDelta ?? 0,
        });
      } else {
        this.state.fishAffection = this.affectionSystem.createAffection(selectedCharacter.id);
      }
      this.state.displayedAffectionLabel = this.affectionSystem.getAffectionLabel(this.state.fishAffection.value);
    }

    // Expose previous departure drift as ephemeral flag for Ink bridge dialogues.
    const lastDriftKey = `mood.${this.state.fish.id}.last_drift`;
    const driftToken = this.state.fish.currentDrift === DriftState.None
      ? 'NONE'
      : this.state.fish.currentDrift.replace(/^DRIFT_/, '');
    this.flagSystemRef.current.set(lastDriftKey, driftToken);

    const totalCasts = getCastCount(this.state.fish.id);
    this.state.currentCastIndex = Math.min(this.state.perFishCastIndex[this.state.fish.id] ?? 0, Math.max(0, totalCasts - 1));

    const startNodeId = resolveFishEntryKnot(this.state.fish.id, this.flagSystemRef.current);

    let beats: Beat[];
    if (!startNodeId) {
      console.error(`[Phase] No entry-knot dispatch for ${this.state.fish.id}; fallback to index ${this.state.currentCastIndex}.`);
      beats = getBeats(this.state.currentCastIndex, this.state.fish.id);
    } else {
      beats = buildBeatsFromInk(this.state.fish.id, startNodeId, this.flagSystemRef.current).map((b: Beat) => ({ ...b, seen: false }));
    }

    // Clear one-shot `from.<fishId>.*` signals + the ephemeral last_drift.
    const fromPrefix = `from.${this.state.fish.id}.`;
    for (const key of Object.keys(this.flagSystemRef.current.serialize())) {
      if (key.startsWith(fromPrefix)) this.flagSystemRef.current.clear(key);
    }
    this.flagSystemRef.current.clear(lastDriftKey);

    this.dialogue.beginCastWith(beats, flagsAtCastStart);

    this.state.phase = GamePhase.Approach;
    this.phaseTimer = 0;
    this.anim.fishAlpha = 0;
    this.approachEmotionSpawned = false;
    this.state.fish.currentExpression = ExpressionState.Neutral;
    this.anim.hideIdleBar();

    floaterVM.hudVisible = true;
    floaterVM.fishNameText = this.presenter.getFishDisplayName();
    this.presenter.syncAffectionDisplay();
  }

  enterExchange(): void {
    this.state.phase = GamePhase.Exchange;
    this.dialogue.canSkip = true;
    floaterVM.skipButtonVisible = true;
    floaterVM.skipButtonOpacity = 1;
    this.dialogue.startNextBeat();
  }

  enterDeparture(drift: DriftState): void {
    this.state.phase = GamePhase.Departure;
    this.phaseTimer = 0;
    const effectiveDrift = (drift === DriftState.None) ? DriftState.Warm : drift;
    this.state.fish.currentDrift = effectiveDrift;
    this.anim.hideActionButtons();
    this.dialogue.canSkip = false;
    this.dialogue.skipActive = false;
    floaterVM.skipButtonVisible = false;
    floaterVM.skipButtonOpacity = 0;

    this.anim.floatingIcons = [];
    this.anim.fishAlpha = 1;

    const cast = getCast(this.state.currentCastIndex, this.state.fish.id);
    const departureData = cast?.departures[effectiveDrift] || cast?.departures[DriftState.Warm];

    if (departureData) {
      this.dialogue.beginDeparture(departureData.dialogue);
      if (departureData.flagsToSet) {
        for (const flag of departureData.flagsToSet) { this.flagSystemRef.current.set(flag, true); }
      }
    } else {
      this.dialogue.beginDeparture(['*She drifts away...*']);
    }

    floaterVM.departureVisible = false;
  }

  enterInkDeparture(drift: DriftState): void {
    this.state.phase = GamePhase.Departure;
    this.phaseTimer = 0;
    const effectiveDrift = (drift === DriftState.None) ? DriftState.Warm : drift;
    this.state.fish.currentDrift = effectiveDrift;
    this.anim.hideActionButtons();
    floaterVM.skipButtonVisible = false;
    this.anim.floatingIcons = [];
    this.anim.fishAlpha = 1;

    this.dialogue.beginInkDeparture();

    floaterVM.departureVisible = false;
    floaterVM.dialogueVisible = false;
  }

  /** Tap-to-advance during departure — fires per-tap on the input layer. */
  advanceDeparture(): void {
    const done = this.dialogue.advanceDepartureDialogue();
    if (!done) return;

    // End-of-cast bookkeeping.
    this.state.currentCastIndex++;
    this.state.perFishCastIndex[this.state.fish.id] = this.state.currentCastIndex;

    this.questSystemRef.current.recordTalkedToFish(this.state.fish.id);
    this.questSystemRef.current.recordFishLeft(this.state.fish.id);

    this.journalSystemRef.current.recordCast(
      this.state.fish.id,
      [this.state.fish.currentExpression]
    );
    this.cgGallerySystemRef.current.unlockPortraitCG(this.state.fish.id);
    this.save.persistCGData();

    const newFacts = this.journalSystemRef.current.checkFactUnlocks(
      this.flagSystemRef.current.serialize(),
      this.dialogue.flagsAtCastStart,
    );
    if (newFacts.length > 0) {
      console.log('[Phase] New facts discovered:', newFacts);
    }

    this.globalStatsSystemRef.current.recordCast(
      this.journalSystemRef.current.getAllFishEntries(),
      this.flagSystemRef.current.serialize()
    );

    this.state.displayedAffectionLabel = this.affectionSystem.getAffectionLabel(this.state.fishAffection.value);

    this.save.flushImmediate();
    this.enterLakeIdle();
  }

  /** Ink-authored ending dispatch. */
  triggerEnding(endingId: string): void {
    this.questSystemRef.current.recordTalkedToFish(this.state.fish.id);
    this.questSystemRef.current.recordFishLeft(this.state.fish.id);
    this.journalSystemRef.current.recordCast(this.state.fish.id, [this.state.fish.currentExpression]);
    this.save.persistCGData();
    const newFacts = this.journalSystemRef.current.checkFactUnlocks(
      this.flagSystemRef.current.serialize(),
      this.dialogue.flagsAtCastStart,
    );
    if (newFacts.length > 0) {
      console.log('[Phase] New facts discovered (ending):', newFacts);
    }
    this.globalStatsSystemRef.current.recordCast(
      this.journalSystemRef.current.getAllFishEntries(),
      this.flagSystemRef.current.serialize()
    );

    const character = characterRegistry.getCharacter(this.state.fish.id);
    const epitaphText = character?.endings?.[endingId]?.epitaph;

    this.flagSystemRef.current.set(`${this.state.fish.id}.ending_complete`, true);
    this.save.flushImmediate();

    const textShown = !!epitaphText;

    let cgShown: boolean;
    if (textShown) {
      const hasCGToShow = this.dialogue.cgsUnlockedThisCast.size > 0;
      this.anim.pendingEndingCG = hasCGToShow;
      cgShown = hasCGToShow;
    } else {
      this.anim.epitaphTextComplete = true;
      cgShown = this.openMostRecentEndingCG();
    }
    if (textShown) {
      this.anim.beginEpitaph(epitaphText!);
      floaterVM.endingVisible = true;
    } else {
      floaterVM.endingVisible = false;
    }

    if (!cgShown && !textShown) {
      console.log(`[Phase] No ending visuals for ${this.state.fish.id}/${endingId} — skipping ending phase`);
      this.state.currentCastIndex++;
      this.state.perFishCastIndex[this.state.fish.id] = this.state.currentCastIndex;
      this.save.flushImmediate();
      this.enterLakeIdle();
      return;
    }

    this.state.phase = GamePhase.Ending;
    floaterVM.departureVisible = false;
    floaterVM.hudVisible = false;
    this.anim.hideActionButtons();
    this.dialogue.canSkip = false;
    this.dialogue.skipActive = false;
    floaterVM.skipButtonVisible = false;
    floaterVM.skipButtonOpacity = 0;
  }

  /** Open the fullscreen CG viewer on the most recently unlocked CG owned by
   *  the current fish, if any was unlocked this cast. */
  openMostRecentEndingCG(): boolean {
    const character = characterRegistry.getCharacter(this.state.fish.id);
    if (!character?.cgs) return false;
    for (let i = character.cgs.length - 1; i >= 0; i--) {
      const cg = character.cgs[i];
      if (cg.id === `portrait_${this.state.fish.id}`) continue;
      if (!this.cgGallerySystemRef.current.isCGUnlocked(cg.id)) continue;
      if (!this.dialogue.cgsUnlockedThisCast.has(cg.id)) continue;
      this.cgGallerySystemRef.current.openViewer(cg.id);
      floaterVM.cgViewerVisible = true;
      floaterVM.cgViewerImage = this.cgGallerySystemRef.current.getCGTexture(cg.id);
      return true;
    }
    return false;
  }

  /** True iff no beat is currently available (used by DialogueController). */
  isAtEndOfCast(): boolean {
    return this.dialogue.isAtEndOfCast();
  }

  // === Hard reset ===

  resetAll(): void {
    this.phaseTimer = 0;
    this.approachEmotionSpawned = false;
    this.pendingEncounter = null;
    this.state.phase = GamePhase.Title;
  }
}
