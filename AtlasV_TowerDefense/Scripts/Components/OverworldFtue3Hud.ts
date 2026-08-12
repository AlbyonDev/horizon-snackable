/**
 * OverworldFtue3Hud — Third FTUE popup for the Overworld, shown the first time
 * the player has at least one unclaimed completed achievement tier.
 *
 * Component Attachment: Scene entity (OverworldFtue3UI in space.hstf)
 * Component Networking: Local (client-only UI)
 * Component Ownership: Server-owned scene entity, UI logic runs on client via ExecuteOn.Owner
 *
 * Shows a 3-step walkthrough once when:
 *   - ft  === 1 (first FTUE already seen)
 *   - ft2 === 1 (second FTUE already seen)
 *   - ft3 === 0 (this FTUE has NOT been seen yet)
 *   - Player has at least one unclaimed completed achievement tier
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
import { ACHIEVEMENT_GROUPS } from '../Defs/AchievementDefs';

// Step definitions
const FTUE3_STEPS: string[] = [
  "You've earned your first reward! Tap the REWARDS button at the top to claim it.",
  "Complete achievements to earn skulls. It's your permanent currency!",
  'Spend skulls in the Skill Tree to unlock powerful upgrades forever!',
];

// --- ViewModel ---

@uiViewModel()
export class OverworldFtue3ViewModel extends UiViewModel {
  override readonly events = {
    next: UiEvents.overworldFtue3Next,
  };

  visible: boolean = false;
  stepText: string = FTUE3_STEPS[0];
  stepIndicator: string = '1 / 3';
  buttonText: string = 'Next';
}

// --- Component ---

@component()
export class OverworldFtue3Hud extends Component {
  private viewModel: Maybe<OverworldFtue3ViewModel> = null;
  private uiComponent: Maybe<CustomUiComponent> = null;
  private currentStep: number = 0;
  private isShowing: boolean = false;

  @subscribe(OnEntityStartEvent, { execution: ExecuteOn.Owner })
  onStart(): void {
    if (NetworkingService.get().isServerContext()) return;

    this.uiComponent = this.entity.getComponent(CustomUiComponent);
    if (!this.uiComponent) return;

    this.uiComponent.isVisible = false;
    this.viewModel = new OverworldFtue3ViewModel();
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
    if (this.isShowing) return;

    const save = SaveService.get();
    if (!save.isLoaded) {
      console.log('[OverworldFtue3Hud] Save not loaded yet, skipping');
      return;
    }

    // Priority: first and second FTUEs must be dismissed first
    if (!save.getOverworldFtueSeen()) {
      console.log('[OverworldFtue3Hud] First FTUE not yet seen, skipping ft3');
      return;
    }
    if (!save.getOverworldFtue2Seen()) {
      console.log('[OverworldFtue3Hud] Second FTUE not yet seen, skipping ft3');
      return;
    }

    // Don't show if already seen
    if (save.getOverworldFtue3Seen()) return;

    // Check if there's at least one unclaimed completed achievement tier
    if (!this._hasUnclaimedReward(save)) {
      console.log('[OverworldFtue3Hud] No unclaimed rewards yet, skipping ft3');
      return;
    }

    // Delay so overworld is visible behind (same 500ms pattern)
    console.log('[OverworldFtue3Hud] Conditions met, deferring FTUE3 display');
    setTimeout(() => {
      if (!this.viewModel || !this.uiComponent) return;
      if (this.isShowing) return;
      if (SaveService.get().getOverworldFtue3Seen()) return; // re-check

      console.log('[OverworldFtue3Hud] Showing overworld FTUE3 popup');
      this.currentStep = 0;
      this._updateStep();
      this.viewModel.visible = true;
      this.uiComponent.isVisible = true;
      this.isShowing = true;
    }, 500);
  }

  /** Check if any achievement group has a completed tier that hasn't been claimed yet. */
  private _hasUnclaimedReward(save: SaveService): boolean {
    for (const group of ACHIEVEMENT_GROUPS) {
      const currentProgress = save.getAchievementStat(group.statKey);
      const claimedTiers = save.getClaimedTiers(group.id);

      // Find how many tiers are completed (stat >= tier threshold)
      let completedTiers = 0;
      for (let t = 0; t < group.tiers.length; t++) {
        if (currentProgress >= group.tiers[t]) {
          completedTiers = t + 1;
        } else {
          break;
        }
      }

      // If completed tiers > claimed tiers, there's an unclaimed reward
      if (completedTiers > claimedTiers) {
        console.log(`[OverworldFtue3Hud] Unclaimed reward found: ${group.id} (completed=${completedTiers}, claimed=${claimedTiers})`);
        return true;
      }
    }
    return false;
  }

  @subscribe(UiEvents.overworldFtue3Next, { execution: ExecuteOn.Owner })
  onNext(): void {
    if (NetworkingService.get().isServerContext()) return;
    if (!this.viewModel || !this.uiComponent) return;

    // Play click SFX
    EventService.sendLocally(Events.UiButtonClick, new Events.UiButtonClickPayload());

    this.currentStep++;

    if (this.currentStep >= FTUE3_STEPS.length) {
      // Final step dismissed
      console.log('[OverworldFtue3Hud] Got it! dismissed at step 3');
      this.viewModel.visible = false;
      this.uiComponent.isVisible = false;
      this.isShowing = false;

      // Persist flag
      SaveService.get().markOverworldFtue3Seen();
    } else {
      // Advance to next step
      console.log(`[OverworldFtue3Hud] Advancing to step ${this.currentStep + 1}`);
      this._updateStep();
    }
  }

  /** Update the ViewModel to reflect the current step */
  private _updateStep(): void {
    if (!this.viewModel) return;
    this.viewModel.stepText = FTUE3_STEPS[this.currentStep];
    this.viewModel.stepIndicator = `${this.currentStep + 1} / ${FTUE3_STEPS.length}`;
    this.viewModel.buttonText = this.currentStep < FTUE3_STEPS.length - 1 ? 'Next' : 'Got it!';
  }
}
