/**
 * DialogueController — Beat/dialogue flow + VN-style skip + action handling.
 *
 * Owns: the current beat graph (`beats`), beat navigation state
 * (currentBeatIndex, pendingNextBeatId, pendingTriggerEnding, seenBeats,
 * cgsUnlockedThisCast), the line/typewriter state (currentLines,
 * displayedText, isTextComplete, isShowingReaction, currentReactionIsTerminal),
 * the skip system (canSkip, skipActive, skipAdvanceTimer), the silent-beat
 * timer state, and the inter-beat pause / nothingBites / departure timers.
 *
 * Triggers phase transitions through the `PhaseTransitions` interface — never
 * mutates `state.phase` directly except via the orchestrator.
 */

import { floaterVM } from './FloaterViewModel';
import { GamePhase, DriftState, EmotionIconType, ExpressionState } from './Types';
import {
  TEXT_DISPLAY_SPEED, BEAT_PAUSE_DURATION, NOTHING_BITES_DURATION,
  AFFECTION_MAX, AFFECTION_DRIFT_AWAY_THRESHOLD,
  ActionId,
} from './Constants';
import type { Beat, ActionEffect } from './Types';
import type { FloaterSharedState } from './FloaterSharedState';
import type { CastSimulation } from './CastSimulation';
import type { AnimationsRunner } from './AnimationsRunner';
import type { FlagSystem } from './FlagSystem';
import type { CGGallerySystem } from './CGGallerySystem';
import { AffectionSystem } from './AffectionSystem';

/** Subset of PhaseController used by DialogueController to drive transitions
 *  without owning a back-reference to the full controller. */
export interface PhaseTransitions {
  enterDeparture(drift: DriftState): void;
  enterInkDeparture(drift: DriftState): void;
  triggerEnding(endingId: string): void;
  /** True iff the current cast has ended (no more beats). */
  isAtEndOfCast(): boolean;
}

/** Save-flush / persist callbacks the dialogue layer needs at boundaries. */
export interface DialogueSaveHooks {
  requestSave(): void;
  flushImmediate(): void;
  persistCGData(): void;
}

export class DialogueController {
  // === Beat graph + navigation ===
  beats: Beat[] = [];
  currentBeatIndex: number = 0;
  pendingNextBeatId: string | null = null;
  pendingTriggerEnding: string | null = null;
  cgsUnlockedThisCast: Set<string> = new Set();
  seenBeats: Set<string> = new Set();
  flagsAtCastStart: Record<string, boolean | number> = {};

  // === Line/typewriter state ===
  currentLines: string[] = [];
  currentLineIndex: number = 0;
  displayedText: string = '';
  textProgress: number = 0;
  isTextComplete: boolean = false;
  isShowingReaction: boolean = false;
  currentReactionIsTerminal: boolean = false;

  // === Skip ===
  canSkip: boolean = false;
  skipActive: boolean = false;
  private skipAdvanceTimer: number = 0;
  private static readonly SKIP_LINE_INTERVAL: number = 0.06;

  // === Silent Beat (Four Minutes mechanic) ===
  private silentBeatActive: boolean = false;
  private silentBeatTimer: number = 0;
  private silentBeatDuration: number = 0;
  private silentBeatUnlocked: boolean = false;

  // === Inter-beat / message timers ===
  beatPauseTimer: number = 0;
  noLureWarningTimer: number = 0;
  nothingBitesTimer: number = 0;
  departureFadeTimer: number = 0;

  constructor(
    private readonly state: FloaterSharedState,
    private readonly cast: CastSimulation,
    private readonly anim: AnimationsRunner,
    private readonly flagSystemRef: { current: FlagSystem },
    private readonly cgGallerySystemRef: { current: CGGallerySystem },
    private readonly affectionSystem: AffectionSystem,
    private readonly phase: PhaseTransitions,
    private readonly save: DialogueSaveHooks,
  ) {}

  // === Public update API (per-frame) ===

  updateTypewriter(dt: number): void {
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

  /** Drive the silent-beat unlock timer during ActionSelect. Returns true
   *  when timer just unlocked (caller may want to flush VM state). */
  updateSilentBeat(dt: number): boolean {
    if (!this.silentBeatActive || this.silentBeatUnlocked) return false;
    this.silentBeatTimer += dt;
    if (this.silentBeatTimer >= this.silentBeatDuration) {
      this.silentBeatUnlocked = true;
      floaterVM.actionTwitchEnabled = true;
      floaterVM.actionDriftEnabled = true;
      floaterVM.actionReelEnabled = true;
      return true;
    }
    return false;
  }

  /** Tick the inter-beat pause. Returns true when the pause just finished
   *  and the caller should call `startNextBeat()`. */
  updateBeatPause(dt: number): boolean {
    if (this.beatPauseTimer <= 0) return false;
    this.beatPauseTimer -= dt;
    if (this.beatPauseTimer <= 0) {
      this.beatPauseTimer = 0;
      return true;
    }
    return false;
  }

  updateNoLureWarning(dt: number): void {
    if (this.noLureWarningTimer > 0) {
      this.noLureWarningTimer -= dt;
      if (this.noLureWarningTimer <= 0) {
        this.noLureWarningTimer = 0;
        floaterVM.noLureWarningVisible = false;
      }
    }
  }

  /** Returns true when the nothingBites timer expires. */
  updateNothingBitesTimer(dt: number): boolean {
    this.nothingBitesTimer -= dt;
    return this.nothingBitesTimer <= 0;
  }

  /** Skip tick — per-phase auto-advance through dialogue. Returns 'cancelSkip'
   *  if the caller should also clear any active fast-forward UI state. */
  updateSkip(dt: number): void {
    if (!this.skipActive) return;

    // Inter-beat pause: skip past it by firing startNextBeat now.
    if (this.beatPauseTimer > 0 && this.state.phase === GamePhase.Exchange) {
      this.beatPauseTimer = 0;
      this.skipAdvanceTimer = 0;
      this.startNextBeat();
      return;
    }

    if (!this.isTextComplete) {
      this.completeCurrentText();
    }
    this.skipAdvanceTimer += dt;
    if (this.skipAdvanceTimer < DialogueController.SKIP_LINE_INTERVAL) return;
    this.skipAdvanceTimer = 0;

    // Stop at unseen beats during Exchange.
    if (this.state.phase === GamePhase.Exchange && !this.isShowingReaction) {
      const atLastLine = this.currentLineIndex >= this.currentLines.length - 1;
      if (atLastLine) {
        const currentBeat = this.beats[this.currentBeatIndex];
        const noChoices = currentBeat && Object.keys(currentBeat.actionEffects).length === 0;
        if (noChoices) {
          const nextBeat = this.beats[this.currentBeatIndex + 1];
          if (nextBeat && !this.seenBeats.has(nextBeat.beatId)) {
            this.cancelSkip();
            return;
          }
        }
      }
    }
    // Stop at unseen reaction tails.
    if (this.state.phase === GamePhase.FishReaction && this.isShowingReaction) {
      const atLastLine = this.currentLineIndex >= this.currentLines.length - 1;
      if (atLastLine && !this.currentReactionIsTerminal) {
        const nextBeat = this.pendingNextBeatId !== null
          ? this.beats.find(b => b.beatId === this.pendingNextBeatId)
          : this.beats[this.currentBeatIndex + 1];
        if (nextBeat && !this.seenBeats.has(nextBeat.beatId)) {
          this.cancelSkip();
          return;
        }
      }
    }

    // Advance one line.
    if (this.state.phase === GamePhase.Exchange || this.state.phase === GamePhase.FishReaction) {
      this.advanceDialogue();
    } else if (this.state.phase === GamePhase.Departure) {
      if (this.currentLineIndex >= this.currentLines.length - 1) {
        this.cancelSkip();
        return;
      }
      this.advanceDepartureDialogue();
    }
    // NothingBites: single-line timed, no advance needed.
  }

  // === Skip control ===

  toggleSkip(): void {
    if (!this.canSkip) return;
    this.skipActive = !this.skipActive;
    this.skipAdvanceTimer = 0;
    floaterVM.skipButtonOpacity = 1;
    if (this.skipActive) {
      this.beatPauseTimer = 0;
    }
  }

  cancelSkip(): void {
    if (this.skipActive) {
      this.skipActive = false;
      this.skipAdvanceTimer = 0;
    }
  }

  // === Beat flow ===

  startNextBeat(): void {
    if (this.phase.isAtEndOfCast()) {
      this.phase.enterDeparture(this.state.fish.currentDrift || DriftState.Warm);
      return;
    }

    const beat = this.beats[this.currentBeatIndex];

    floaterVM.setActionIntents(
      beat.actionEffects[ActionId.Wait]?.intent ?? 'Wait',
      beat.actionEffects[ActionId.Twitch]?.intent ?? 'Twitch',
      beat.actionEffects[ActionId.Drift]?.intent ?? 'Drift',
      beat.actionEffects[ActionId.Reel]?.intent ?? 'Reel',
    );

    if (beat.silentBeat) {
      this.silentBeatActive = true;
      this.silentBeatTimer = 0;
      this.silentBeatDuration = beat.silentBeatDurationSec ?? 240;
      this.silentBeatUnlocked = false;
      this.state.phase = GamePhase.Exchange;
      this.currentLines = beat.fishLines;
      this.currentLineIndex = 0;
      this.startNewLine();
      return;
    }

    this.state.phase = GamePhase.Exchange;
    this.currentLines = beat.fishLines;
    this.currentLineIndex = 0;
    this.startNewLine();
  }

  startNewLine(): void {
    this.textProgress = 0;
    this.displayedText = '';
    this.isTextComplete = false;
  }

  completeCurrentText(): void {
    const currentFullText = this.currentLines[this.currentLineIndex] || '';
    this.displayedText = currentFullText;
    this.isTextComplete = true;
  }

  /** Tap-to-advance during dialogue. */
  advanceDialogue(): void {
    if (this.isShowingReaction) {
      this.currentLineIndex++;
      if (this.currentLineIndex >= this.currentLines.length) {
        this.isShowingReaction = false;

        const finishedBeat = this.beats[this.currentBeatIndex];
        this.seenBeats.add(finishedBeat.beatId);
        this.save.requestSave();

        this.advanceToNextBeat();

        // Priority: Ink #ending wins, then terminal choice, then end-of-cast.
        const inkEnding = this.pendingTriggerEnding;
        this.pendingTriggerEnding = null;
        if (inkEnding !== null) {
          this.phase.triggerEnding(inkEnding);
        } else if (this.currentReactionIsTerminal) {
          this.phase.enterInkDeparture(this.state.fish.currentDrift || DriftState.Warm);
        } else if (this.phase.isAtEndOfCast()) {
          this.phase.enterDeparture(this.state.fish.currentDrift || DriftState.Warm);
        } else {
          this.beatPauseTimer = BEAT_PAUSE_DURATION;
          this.state.phase = GamePhase.Exchange;
          this.isTextComplete = false;
        }
      } else {
        this.startNewLine();
      }
      return;
    }

    this.currentLineIndex++;
    if (this.currentLineIndex >= this.currentLines.length) {
      const currentBeat = this.beats[this.currentBeatIndex];
      if (currentBeat && Object.keys(currentBeat.actionEffects).length === 0) {
        // Monologue beat — auto-advance.
        this.seenBeats.add(currentBeat.beatId);
        this.save.requestSave();
        this.advanceToNextBeat();
        if (this.phase.isAtEndOfCast()) {
          this.phase.enterDeparture(this.state.fish.currentDrift || DriftState.Warm);
        } else {
          this.beatPauseTimer = BEAT_PAUSE_DURATION;
          this.state.phase = GamePhase.Exchange;
          this.isTextComplete = false;
        }
        return;
      }

      // Show action buttons (silent or full).
      if (this.silentBeatActive && !this.silentBeatUnlocked) {
        this.state.phase = GamePhase.ActionSelect;
        this.anim.showActionButtons();
        floaterVM.actionWaitEnabled = true;
        floaterVM.actionTwitchEnabled = false;
        floaterVM.actionDriftEnabled = false;
        floaterVM.actionReelEnabled = false;
        this.canSkip = false; floaterVM.skipButtonVisible = false; floaterVM.skipButtonOpacity = 0;
      } else {
        this.state.phase = GamePhase.ActionSelect;
        this.anim.showActionButtons();
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

  /** Tap-to-advance during departure. Returns true once the cast is finalized
   *  (caller transitions to LakeIdle). */
  advanceDepartureDialogue(): boolean {
    this.currentLineIndex++;
    if (this.currentLineIndex >= this.currentLines.length) {
      // End-of-cast bookkeeping — caller is responsible for journal/quest/CG/stats
      // updates (we trigger them via the orchestrator). Here we only finalize
      // dialogue state and signal completion.
      return true;
    }
    this.startNewLine();
    return false;
  }

  /** Apply the chosen action's effects, animate, transition to FishReaction. */
  handleAction(actionId: ActionId): void {
    const beat = this.beats[this.currentBeatIndex];
    const effect: ActionEffect | undefined = beat.actionEffects[actionId];
    if (!effect) return;

    if (this.silentBeatActive) {
      this.silentBeatActive = false;
    }

    this.anim.setActionButtonsResponding(actionId);

    this.affectionSystem.applyDelta(this.state.fishAffection, effect.affectionDelta, this.state.sessionId);
    this.state.fish.affection = this.state.fishAffection.value;
    this.syncAffectionBoundaryFlags();

    this.state.fish.currentExpression = effect.resultExpression;
    if (effect.resultDrift) this.state.fish.currentDrift = effect.resultDrift;

    if (effect.flagsToSet) {
      for (const flag of effect.flagsToSet) { this.flagSystemRef.current.set(flag, true); }
    }
    if (effect.flagsToClear) {
      for (const flag of effect.flagsToClear) { this.flagSystemRef.current.clear(flag); }
    }
    if (effect.flagsToDisable) {
      for (const flag of effect.flagsToDisable) { this.flagSystemRef.current.set(flag, false); }
    }

    if (effect.cgsToUnlock) {
      for (const cgId of effect.cgsToUnlock) {
        if (!this.cgGallerySystemRef.current.getCG(cgId)) {
          console.warn(`[Dialogue] #unlock-cg references unknown CG '${cgId}'`);
          continue;
        }
        const newlyUnlocked = this.cgGallerySystemRef.current.unlockCG(cgId);
        if (newlyUnlocked) {
          this.save.persistCGData();
        }
        this.cgsUnlockedThisCast.add(cgId);
      }
    }

    this.pendingTriggerEnding = effect.triggerEnding ?? null;

    if (effect.emotionIcon && effect.emotionIcon !== EmotionIconType.None) {
      this.anim.spawnEmotionIcon(effect.emotionIcon);
    }

    this.cast.applyActionImpact(actionId);
    // Animation triggers driven by the action — those that animate the
    // portrait remain anim-side.
    if (actionId === ActionId.Twitch) {
      this.anim.triggerPortraitAnimation('bounce', 0.35);
    } else if (actionId === ActionId.Reel) {
      this.anim.triggerPortraitAnimation('shake', 0.4);
    }

    this.state.phase = GamePhase.FishReaction;
    this.isShowingReaction = true;
    this.currentReactionIsTerminal = effect.terminal === true;
    this.pendingNextBeatId = effect.nextBeatId ?? null;
    this.currentLines = effect.responseLines;
    this.currentLineIndex = 0;
    this.startNewLine();
    this.canSkip = true;
    floaterVM.skipButtonVisible = true;
    floaterVM.skipButtonOpacity = 1;
  }

  /** Maintain affection.floor.<id> / affection.peak.<id> flags. */
  syncAffectionBoundaryFlags(): void {
    const v = this.state.fishAffection.value;
    const floorKey = `affection.floor.${this.state.fish.id}`;
    const peakKey = `affection.peak.${this.state.fish.id}`;
    const fs = this.flagSystemRef.current;
    if (v <= AFFECTION_DRIFT_AWAY_THRESHOLD) fs.set(floorKey, true);
    else fs.clear(floorKey);
    if (v >= AFFECTION_MAX) fs.set(peakKey, true);
    else fs.clear(peakKey);
  }

  /** Move currentBeatIndex via per-choice divert. */
  advanceToNextBeat(): void {
    const targetId = this.pendingNextBeatId;
    this.pendingNextBeatId = null;
    if (targetId === null) {
      this.currentBeatIndex = this.beats.length;
      return;
    }
    const idx = this.beats.findIndex(b => b.beatId === targetId);
    if (idx >= 0) {
      this.currentBeatIndex = idx;
      return;
    }
    console.warn(`[Dialogue] nextBeatId '${targetId}' not found — ending cast`);
    this.currentBeatIndex = this.beats.length;
  }

  isAtEndOfCast(): boolean {
    return this.currentBeatIndex >= this.beats.length;
  }

  // === Bulk state operations ===

  /** Begin nothing-bites micro-phase (no fish matched recipe). */
  beginNothingBites(): void {
    this.nothingBitesTimer = NOTHING_BITES_DURATION;
    this.currentLines = ['Nothing bites...'];
    this.currentLineIndex = 0;
    this.startNewLine();
    floaterVM.dialogueVisible = true;
  }

  /** Initialize dialogue state for a new cast (after PhaseController.startCast
   *  has determined the fish, dispatch entry knot, and built the beat graph). */
  beginCastWith(beats: Beat[], flagsAtCastStart: Record<string, boolean | number>): void {
    this.beats = beats;
    this.currentBeatIndex = 0;
    this.pendingNextBeatId = null;
    this.pendingTriggerEnding = null;
    this.cgsUnlockedThisCast = new Set();
    this.flagsAtCastStart = flagsAtCastStart;
  }

  /** Begin Departure dialogue (orchestrator hands the data). */
  beginDeparture(lines: string[]): void {
    this.currentLines = lines;
    this.currentLineIndex = 0;
    this.startNewLine();
    this.canSkip = false;
    this.skipActive = false;
    this.skipAdvanceTimer = 0;
    this.departureFadeTimer = 0;
  }

  /** Single empty line for ink-driven departure. */
  beginInkDeparture(): void {
    this.currentLines = [''];
    this.currentLineIndex = 0;
    this.displayedText = '';
    this.isTextComplete = true;
    this.departureFadeTimer = 0;
  }

  /** Hard reset (used on save reset). */
  resetAll(): void {
    this.beats = [];
    this.currentBeatIndex = 0;
    this.pendingNextBeatId = null;
    this.pendingTriggerEnding = null;
    this.cgsUnlockedThisCast = new Set();
    this.seenBeats = new Set();
    this.currentLines = [];
    this.displayedText = '';
    this.isTextComplete = false;
    this.isShowingReaction = false;
    this.canSkip = false;
    this.skipActive = false;
    this.skipAdvanceTimer = 0;
    this.beatPauseTimer = 0;
    this.noLureWarningTimer = 0;
    this.nothingBitesTimer = 0;
    this.departureFadeTimer = 0;
    this.silentBeatActive = false;
    this.flagsAtCastStart = {};
  }

  // === Public snapshot accessor for the presenter ===

  snapshot() {
    return {
      currentLines: this.currentLines,
      currentLineIndex: this.currentLineIndex,
      displayedText: this.displayedText,
      isTextComplete: this.isTextComplete,
      canSkip: this.canSkip,
    };
  }
}
