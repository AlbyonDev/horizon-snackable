/**
 * OverworldFtue2Hud — Second FTUE popup for the Overworld, shown AFTER the
 * player beats level 0 and returns to the Overworld for the first time.
 *
 * Component Attachment: Scene entity (OverworldFtue2UI in space.hstf)
 * Component Networking: Local (client-only UI)
 * Component Ownership: Server-owned scene entity, UI logic runs on client via ExecuteOn.Owner
 *
 * Shows a 4-step tips walkthrough once when:
 *   - The first FTUE (ft) has already been seen (ft === 1)
 *   - Level 0 has been beaten in save data
 *   - This second FTUE has NOT been seen yet (ft2 === 0)
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
const FTUE2_STEPS: string[] = [
  'Great job! You unlocked the next level. Keep progressing to reach the Boss!',
  "Use Relic wisely to power up your towers for this run.",
];

// --- ViewModel ---

@uiViewModel()
export class OverworldFtue2ViewModel extends UiViewModel {
  override readonly events = {
    next: UiEvents.overworldFtue2Next,
  };

  visible: boolean = false;
  stepText: string = FTUE2_STEPS[0];
  stepIndicator: string = '1 / 4';
  buttonText: string = 'Next';
}

// --- Component ---

@component()
export class OverworldFtue2Hud extends Component {
  private viewModel: Maybe<OverworldFtue2ViewModel> = null;
  private uiComponent: Maybe<CustomUiComponent> = null;
  private currentStep: number = 0;
  private isShowing: boolean = false;

  @subscribe(OnEntityStartEvent, { execution: ExecuteOn.Owner })
  onStart(): void {
    if (NetworkingService.get().isServerContext()) return;

    this.uiComponent = this.entity.getComponent(CustomUiComponent);
    if (!this.uiComponent) return;

    this.uiComponent.isVisible = false;
    this.viewModel = new OverworldFtue2ViewModel();
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

  /** Also check when save is restored (in case Overworld is already showing) */
  @subscribe(Events.SaveRestored, { execution: ExecuteOn.Owner })
  onSaveRestored(_payload: Events.SaveRestoredPayload): void {
    if (NetworkingService.get().isServerContext()) return;
    if (!this.viewModel || !this.uiComponent) return;

    // Don't auto-trigger on SaveRestored for this FTUE — it should only
    // trigger on phase change to Overworld (after returning from level 0).
  }

  private _tryShow(): void {
    if (this.isShowing) return;

    const save = SaveService.get();
    if (!save.isLoaded) {
      console.log('[OverworldFtue2Hud] Save not loaded yet, skipping');
      return;
    }

    // Don't show if the first FTUE hasn't been seen yet (it takes priority)
    if (!save.getOverworldFtueSeen()) {
      console.log('[OverworldFtue2Hud] First FTUE not yet seen, skipping ft2');
      return;
    }

    // Don't show if already seen
    if (save.getOverworldFtue2Seen()) return;

    // Only show if level 0 has been beaten
    const beaten = save.getBeaten();
    if (!beaten[0]) {
      console.log('[OverworldFtue2Hud] Level 0 not beaten yet, skipping ft2');
      return;
    }

    // Delay so overworld is visible behind
    console.log('[OverworldFtue2Hud] Conditions met, deferring FTUE2 display');
    setTimeout(() => {
      if (!this.viewModel || !this.uiComponent) return;
      if (this.isShowing) return;
      if (SaveService.get().getOverworldFtue2Seen()) return; // re-check

      console.log('[OverworldFtue2Hud] Showing overworld FTUE2 popup');
      this.currentStep = 0;
      this._updateStep();
      this.viewModel.visible = true;
      this.uiComponent.isVisible = true;
      this.isShowing = true;
    }, 500);
  }

  @subscribe(UiEvents.overworldFtue2Next, { execution: ExecuteOn.Owner })
  onNext(): void {
    if (NetworkingService.get().isServerContext()) return;
    if (!this.viewModel || !this.uiComponent) return;

    // Play click SFX
    EventService.sendLocally(Events.UiButtonClick, new Events.UiButtonClickPayload());

    this.currentStep++;

    if (this.currentStep >= FTUE2_STEPS.length) {
      // Final step dismissed
      console.log('[OverworldFtue2Hud] Got it! dismissed at step 4');
      this.viewModel.visible = false;
      this.uiComponent.isVisible = false;
      this.isShowing = false;

      // Persist flag
      SaveService.get().markOverworldFtue2Seen();
    } else {
      // Advance to next step
      console.log(`[OverworldFtue2Hud] Advancing to step ${this.currentStep + 1}`);
      this._updateStep();
    }
  }

  /** Update the ViewModel to reflect the current step */
  private _updateStep(): void {
    if (!this.viewModel) return;
    this.viewModel.stepText = FTUE2_STEPS[this.currentStep];
    this.viewModel.stepIndicator = `${this.currentStep + 1} / ${FTUE2_STEPS.length}`;
    this.viewModel.buttonText = this.currentStep < FTUE2_STEPS.length - 1 ? 'Next' : 'Got it!';
  }
}
