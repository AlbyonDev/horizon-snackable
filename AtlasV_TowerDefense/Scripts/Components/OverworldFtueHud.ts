/**
 * OverworldFtueHud — Multi-step first-time tutorial popup for the Overworld phase.
 *
 * Component Attachment: Scene entity (OverworldFtueUI in space.hstf)
 * Component Networking: Local (client-only UI)
 * Component Ownership: Server-owned scene entity, UI logic runs on client via ExecuteOn.Owner
 *
 * Shows a 4-step walkthrough the first time the player enters the Overworld.
 * The overlay blocks all interaction until dismissed. Persists the "seen" flag
 * via SaveService (global.ft).
 *
 * Triggered on GamePhaseChanged to Overworld when the flag hasn't been set.
 */
import {
  Component,
  OnEntityStartEvent,
  NetworkingService,
  ExecuteOn,
  EventService,
  CustomUiComponent,
  component,
  subscribe,
  uiViewModel,
  UiViewModel,
} from 'meta/worlds';
import type { Maybe } from 'meta/worlds';

import { Events, GamePhase, UiEvents } from '../Types';
import { SaveService } from '../Services/SaveService';

// Step definitions
const FTUE_STEPS: string[] = [
  'Welcome to this world... invaded by gobelins!',
  'Tap the first node to start a level. Good luck !'
];

// --- ViewModel ---

@uiViewModel()
export class OverworldFtueViewModel extends UiViewModel {
  override readonly events = {
    next: UiEvents.overworldFtueNext,
  };

  visible: boolean = false;
  stepText: string = FTUE_STEPS[0];
  stepIndicator: string = '1 / 4';
  buttonText: string = 'Next';
}

// --- Component ---

@component()
export class OverworldFtueHud extends Component {
  private viewModel: Maybe<OverworldFtueViewModel> = null;
  private uiComponent: Maybe<CustomUiComponent> = null;
  private currentStep: number = 0;
  private isShowing: boolean = false;
  /** Tracks the current game phase so onSaveRestored can gate on Overworld. */
  private _currentPhase: GamePhase = GamePhase.Idle;

  @subscribe(OnEntityStartEvent, { execution: ExecuteOn.Owner })
  onStart(): void {
    if (NetworkingService.get().isServerContext()) return;

    this.uiComponent = this.entity.getComponent(CustomUiComponent);
    if (!this.uiComponent) return;

    this.uiComponent.isVisible = false;
    this.viewModel = new OverworldFtueViewModel();
    this.uiComponent.dataContext = this.viewModel;
    this.viewModel.visible = false;
  }

  @subscribe(Events.GamePhaseChanged, { execution: ExecuteOn.Owner })
  onPhaseChanged(payload: Events.GamePhaseChangedPayload): void {
    if (NetworkingService.get().isServerContext()) return;

    // Always track the current phase for gating in onSaveRestored
    this._currentPhase = payload.phase;

    if (!this.viewModel || !this.uiComponent) return;

    // Only trigger when entering the Overworld phase
    if (payload.phase !== GamePhase.Overworld) return;

    // Only show if save is loaded and the flag is not set
    const save = SaveService.get();
    if (!save.isLoaded) {
      console.log('[OverworldFtueHud] Save not loaded yet, skipping FTUE check');
      return;
    }
    if (save.getOverworldFtueSeen()) return;

    // Delay the FTUE display so the Overworld UI (nodes, path, background)
    // has time to render and become visible underneath the semi-transparent
    // FTUE overlay. Without this delay the FTUE could appear before the
    // Overworld is visually rendered, confusing the player.
    console.log('[OverworldFtueHud] Overworld phase entered, deferring FTUE display for render');
    setTimeout(() => {
      if (!this.viewModel || !this.uiComponent) return;
      if (this.isShowing) return; // guard against double-fire
      if (SaveService.get().getOverworldFtueSeen()) return; // re-check in case dismissed elsewhere

      console.log('[OverworldFtueHud] Showing overworld FTUE popup (after Overworld render delay)');
      this.currentStep = 0;
      this._updateStep();
      this.viewModel.visible = true;
      this.uiComponent.isVisible = true;
      this.isShowing = true;
    }, 500);
  }

  /** Also check when save is restored (in case Overworld is already showing) */
  @subscribe(Events.SaveRestored, { execution: ExecuteOn.Owner })
  onSaveRestored(_payload: Events.SaveRestoredPayload): void {
    if (NetworkingService.get().isServerContext()) return;
    if (!this.viewModel || !this.uiComponent) return;
    if (this.isShowing) return; // already showing

    // CRITICAL: Only show the FTUE if we are actually in the Overworld phase.
    // SaveRestored typically fires during the Title Screen (before the player
    // taps Play). Without this guard, the FTUE overlay would appear on top of
    // the Title Screen instead of the Overworld.
    if (this._currentPhase !== GamePhase.Overworld) {
      console.log('[OverworldFtueHud] SaveRestored fired but phase is not Overworld, skipping');
      return;
    }

    // Check if we need to show FTUE (Overworld might already be active)
    const save = SaveService.get();
    if (save.getOverworldFtueSeen()) return;

    // Defer slightly to let OverworldHud show first
    setTimeout(() => {
      if (!this.viewModel || !this.uiComponent) return;
      if (this.isShowing) return;
      if (save.getOverworldFtueSeen()) return;

      console.log('[OverworldFtueHud] SaveRestored -> showing overworld FTUE');
      this.currentStep = 0;
      this._updateStep();
      this.viewModel.visible = true;
      this.uiComponent.isVisible = true;
      this.isShowing = true;
    }, 200);
  }

  @subscribe(UiEvents.overworldFtueNext, { execution: ExecuteOn.Owner })
  onNext(): void {
    if (NetworkingService.get().isServerContext()) return;
    if (!this.viewModel || !this.uiComponent) return;

    // Play click SFX
    EventService.sendLocally(Events.UiButtonClick, new Events.UiButtonClickPayload());

    this.currentStep++;

    if (this.currentStep >= FTUE_STEPS.length) {
      // Final step dismissed
      console.log('[OverworldFtueHud] Got it! dismissed at step 4');
      this.viewModel.visible = false;
      this.uiComponent.isVisible = false;
      this.isShowing = false;

      // Persist flag
      SaveService.get().markOverworldFtueSeen();
    } else {
      // Advance to next step
      console.log(`[OverworldFtueHud] Advancing to step ${this.currentStep + 1}`);
      this._updateStep();
    }
  }

  /** Update the ViewModel to reflect the current step */
  private _updateStep(): void {
    if (!this.viewModel) return;
    this.viewModel.stepText = FTUE_STEPS[this.currentStep];
    this.viewModel.stepIndicator = `${this.currentStep + 1} / ${FTUE_STEPS.length}`;
    this.viewModel.buttonText = this.currentStep < FTUE_STEPS.length - 1 ? 'Next' : 'Got it!';
  }
}
