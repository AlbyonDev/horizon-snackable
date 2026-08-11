/**
 * OverworldFtue4Hud — Fourth FTUE popup for the Overworld, shown the first time
 * the player starts a new run after beating the boss (runCount >= 2).
 *
 * Component Attachment: Scene entity (OverworldFtue4UI in space.hstf)
 * Component Networking: Local (client-only UI)
 * Component Ownership: Server-owned scene entity, UI logic runs on client via ExecuteOn.Owner
 *
 * Shows a 3-step walkthrough once when:
 *   - ft4 === 0 (this FTUE has NOT been seen yet)
 *   - runCount >= 1 (player has beaten the boss at least once; save stores completed runs 0-based)
 *
 * No other FTUE dependencies — ft4 fires independently of ft/ft2/ft3.
 *
 * Blocking overlay prevents interaction until dismissed.
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
const FTUE4_STEPS: string[] = [
  'You defeated the Boss! A new run begins with fresh levels to conquer.',
  'Enemies will get stronger. Adapt your strategy!',
  'Your relics have been reset, but your Skill Tree upgrades are permanent!',
];

// --- ViewModel ---

@uiViewModel()
export class OverworldFtue4ViewModel extends UiViewModel {
  override readonly events = {
    next: UiEvents.overworldFtue4Next,
  };

  visible: boolean = false;
  stepText: string = FTUE4_STEPS[0];
  stepIndicator: string = '1 / 3';
  buttonText: string = 'Next';
}

// --- Component ---

@component()
export class OverworldFtue4Hud extends Component {
  private viewModel: Maybe<OverworldFtue4ViewModel> = null;
  private uiComponent: Maybe<CustomUiComponent> = null;
  private currentStep: number = 0;
  private isShowing: boolean = false;

  @subscribe(OnEntityStartEvent, { execution: ExecuteOn.Owner })
  onStart(): void {
    if (NetworkingService.get().isServerContext()) return;

    this.uiComponent = this.entity.getComponent(CustomUiComponent);
    if (!this.uiComponent) return;

    this.uiComponent.isVisible = false;
    this.viewModel = new OverworldFtue4ViewModel();
    this.uiComponent.dataContext = this.viewModel;
    this.viewModel.visible = false;
  }

  @subscribe(Events.GamePhaseChanged, { execution: ExecuteOn.Owner })
  onPhaseChanged(payload: Events.GamePhaseChangedPayload): void {
    if (NetworkingService.get().isServerContext()) return;
    if (!this.viewModel || !this.uiComponent) return;

    // Only trigger when entering the Overworld phase
    if (payload.phase !== GamePhase.Overworld) return;

    this._tryShow();
  }

  private _tryShow(): void {
    console.log('[OverworldFtue4Hud] _tryShow() called');
    if (this.isShowing) {
      console.log('[OverworldFtue4Hud] Already showing, skipping');
      return;
    }

    const save = SaveService.get();
    if (!save.isLoaded) {
      console.log('[OverworldFtue4Hud] Save not loaded yet, skipping');
      return;
    }

    // Don't show if already seen
    const alreadySeen = save.getOverworldFtue4Seen();
    console.log(`[OverworldFtue4Hud] ft4 already seen: ${alreadySeen}`);
    if (alreadySeen) return;

    // Only show if runCount >= 1 (player has beaten the boss at least once)
    // Note: save.getRunCount() returns COMPLETED runs (0-based), not the
    // current run number. After the first boss kill, runCount = 1.
    const runCount = save.getRunCount();
    if (runCount < 1) {
      console.log(`[OverworldFtue4Hud] runCount=${runCount} < 1, skipping ft4 (boss not beaten yet)`);
      return;
    }

    // Delay so overworld is visible behind (same 500ms pattern)
    console.log(`[OverworldFtue4Hud] Conditions met (runCount=${runCount}), deferring FTUE4 display`);
    setTimeout(() => {
      if (!this.viewModel || !this.uiComponent) return;
      if (this.isShowing) return;
      if (SaveService.get().getOverworldFtue4Seen()) return; // re-check

      console.log('[OverworldFtue4Hud] Showing overworld FTUE4 popup');
      this.currentStep = 0;
      this._updateStep();
      this.viewModel.visible = true;
      this.uiComponent.isVisible = true;
      this.isShowing = true;
    }, 500);
  }

  @subscribe(UiEvents.overworldFtue4Next, { execution: ExecuteOn.Owner })
  onNext(): void {
    if (NetworkingService.get().isServerContext()) return;
    if (!this.viewModel || !this.uiComponent) return;

    // Play click SFX
    EventService.sendLocally(Events.UiButtonClick, new Events.UiButtonClickPayload());

    this.currentStep++;

    if (this.currentStep >= FTUE4_STEPS.length) {
      // Final step dismissed
      console.log('[OverworldFtue4Hud] Got it! dismissed at step 3');
      this.viewModel.visible = false;
      this.uiComponent.isVisible = false;
      this.isShowing = false;

      // Persist flag
      SaveService.get().markOverworldFtue4Seen();
    } else {
      // Advance to next step
      console.log(`[OverworldFtue4Hud] Advancing to step ${this.currentStep + 1}`);
      this._updateStep();
    }
  }

  /** Update the ViewModel to reflect the current step */
  private _updateStep(): void {
    if (!this.viewModel) return;
    this.viewModel.stepText = FTUE4_STEPS[this.currentStep];
    this.viewModel.stepIndicator = `${this.currentStep + 1} / ${FTUE4_STEPS.length}`;
    this.viewModel.buttonText = this.currentStep < FTUE4_STEPS.length - 1 ? 'Next' : 'Got it!';
  }
}
