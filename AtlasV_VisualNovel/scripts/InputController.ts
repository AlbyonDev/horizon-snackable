/**
 * InputController — Touch input routing.
 *
 * Single responsibility: translate raw touch events into well-typed controller
 * calls based on the current `state.phase`. Contains no gameplay logic — it
 * only decides *which* controller handles a tap/drag.
 *
 * `screenToCanvas` lives here because input is the only consumer of raw
 * screen coordinates; everything downstream operates in canvas space.
 */

import { Color } from 'meta/platform_api';
import {
  FocusedInteractionService,
  OnFocusedInteractionInputEventPayload,
  Vec2,
} from 'meta/worlds';
import { CameraModeProvisionalService } from 'meta/worlds_provisional';
import { floaterVM } from './FloaterViewModel';
import { GamePhase } from './Types';
import { CANVAS_WIDTH, CANVAS_HEIGHT, GAME_ASPECT_RATIO } from './Constants';
import type { FloaterSharedState } from './FloaterSharedState';
import type { CastSimulation } from './CastSimulation';
import type { AnimationsRunner } from './AnimationsRunner';
import type { DialogueController } from './DialogueController';
import type { PhaseController } from './PhaseController';
import type { CGGallerySystem } from './CGGallerySystem';
import type { QuestSystem } from './QuestSystem';
import type { SaveCoordinator } from './SaveCoordinator';

export class InputController {
  constructor(
    private readonly state: FloaterSharedState,
    private readonly cast: CastSimulation,
    private readonly anim: AnimationsRunner,
    private readonly dialogue: DialogueController,
    private readonly phaseCtrl: PhaseController,
    private readonly cgGallerySystemRef: { current: CGGallerySystem },
    private readonly questSystemRef: { current: QuestSystem },
    private readonly save: SaveCoordinator,
  ) {}

  /** Enable focused interaction + suppress default tap/trail visual feedback. */
  enableTouchInput(): void {
    try {
      const service = FocusedInteractionService.get();
      service.enableFocusedInteraction({
        disableFocusExitButton: true,
        disableEmotesButton: true,
        interactionStringId: 'floater_game',
      });

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
    } catch (e) {
      console.log('[Input] Failed to enable touch input');
    }
  }

  /** Map screen-normalized [0..1] coords to canvas pixel coords, accounting
   *  for letterboxing/pillarboxing based on aspect mismatch. */
  screenToCanvas(screenPos: Vec2): { x: number; y: number } {
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

  // === Touch event entry points ===

  onTouchStart(payload: OnFocusedInteractionInputEventPayload): void {
    if (payload.interactionIndex !== 0) return;

    if (this.anim.introActive) {
      this.anim.advanceIntro();
      return;
    }

    if (this.state.phase === GamePhase.Ending) {
      this.handleEndingTap();
      return;
    }

    if (this.state.phase === GamePhase.LakeIdle) {
      // Only allow cast drag when in aiming mode (after Cast button tapped).
      if (!this.cast.isInCastAiming) return;
      const pos = this.screenToCanvas(payload.screenPosition);
      this.cast.startDrag(pos.x, pos.y);
      floaterVM.castInstructionVisible = false;
      return;
    }

    if (this.state.phase === GamePhase.Departure) {
      if (this.dialogue.isTextComplete) {
        this.phaseCtrl.advanceDeparture();
      } else {
        this.dialogue.completeCurrentText();
      }
      return;
    }

    if (this.state.phase === GamePhase.Exchange || this.state.phase === GamePhase.FishReaction) {
      // GUARD: during beat pause, currentLines may be empty / isTextComplete may be true.
      if (this.dialogue.beatPauseTimer > 0) return;
      if (this.dialogue.isTextComplete) {
        this.dialogue.advanceDialogue();
      } else {
        this.dialogue.completeCurrentText();
      }
    }
  }

  onTouchMove(payload: OnFocusedInteractionInputEventPayload): void {
    if (payload.interactionIndex !== 0) return;
    if (!this.cast.isCastTouching || this.state.phase !== GamePhase.LakeIdle) return;
    const pos = this.screenToCanvas(payload.screenPosition);
    this.cast.updateDrag(pos.x, pos.y);
  }

  onTouchEnd(payload: OnFocusedInteractionInputEventPayload): void {
    if (payload.interactionIndex !== 0) return;

    let launched = false;
    if (this.state.phase === GamePhase.LakeIdle
        && this.cast.isCastTouching
        && this.cast.castTrajectoryDistance >= 0) {
      launched = this.cast.endDrag();
      if (launched) {
        // Transition to CastFlying — phase write owned here for direct UX.
        this.state.phase = GamePhase.CastFlying;
        // Track lure usage for quest system.
        if (this.state.equippedLureId) {
          this.questSystemRef.current.recordLureUsed(this.state.equippedLureId);
        }
        floaterVM.idleBaitBtnEnabled = false;
        floaterVM.idleCastBtnEnabled = false;
        floaterVM.idleJournalBtnEnabled = false;
        this.anim.hideIdleBar();
      }
    }

    const wasCastTouching = this.cast.isCastTouching;
    // endDrag() already cleared isCastTouching; for the case where wasCastTouching
    // was false we still need to reset trajectory inputs harmlessly.
    if (!launched) {
      this.cast.resetTrajectoryInputs();
    }

    // Exit aiming mode ONLY if this touch-end came from an actual drag.
    if (this.cast.isInCastAiming && wasCastTouching) {
      this.cast.isInCastAiming = false;
      floaterVM.castInstructionVisible = false;
      if (this.state.phase === GamePhase.LakeIdle) {
        this.anim.showIdleBar();
      }
    }
  }

  // === Ending phase tap (three-state dismissal) ===

  private handleEndingTap(): void {
    if (!this.anim.epitaphTextComplete) {
      this.anim.completeEpitaphText();
      return;
    }
    // State 1: epitaph showing, CG pending → dismiss epitaph, show CG.
    if (this.anim.pendingEndingCG) {
      floaterVM.endingVisible = false;
      this.anim.pendingEndingCG = false;
      this.phaseCtrl.openMostRecentEndingCG();
      return;
    }
    if (floaterVM.cgViewerVisible) {
      // State 2: CG showing → dismiss CG, advance cast, return to LakeIdle.
      this.cgGallerySystemRef.current.closeViewer();
      floaterVM.cgViewerVisible = false;
      floaterVM.endingVisible = false;
      this.state.currentCastIndex++;
      this.state.perFishCastIndex[this.state.fish.id] = this.state.currentCastIndex;
      this.save.flushImmediate(Array.from(this.dialogue.seenBeats));
      this.phaseCtrl.enterLakeIdle();
      return;
    }
    // State 3: no pending CG, no CG visible → just dismiss ending.
    floaterVM.endingVisible = false;
    this.state.currentCastIndex++;
    this.state.perFishCastIndex[this.state.fish.id] = this.state.currentCastIndex;
    this.save.flushImmediate(Array.from(this.dialogue.seenBeats));
    this.phaseCtrl.enterLakeIdle();
  }
}
