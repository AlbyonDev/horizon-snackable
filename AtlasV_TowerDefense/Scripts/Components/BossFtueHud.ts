/**
 * BossFtueHud — First-time tutorial popup for the cave boss mechanic.
 *
 * Component Attachment: Scene entity (BossFtueUI in space.hstf)
 * Component Networking: Local (client-only UI)
 * Component Ownership: Server-owned scene entity, UI logic runs on client via ExecuteOn.Owner
 *
 * Shows a one-time overlay explaining that the cave boss throws fireballs from its cave,
 * and if it reaches the player base, it kills instantly.
 * Triggered on LevelSelected when nodeType is 'boss' and the bf flag hasn't been set.
 * Persists the "seen" flag via SaveService (global.bf).
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

import { Events, UiEvents } from '../Types';
import { SaveService } from '../Services/SaveService';
import { OverworldNodeType } from '../Defs/NodeDefs';

// --- ViewModel ---

@uiViewModel()
export class BossFtueViewModel extends UiViewModel {
  override readonly events = {
    gotIt: UiEvents.bossFtueGotIt,
  };

  visible: boolean = false;
}

// --- Component ---

@component()
export class BossFtueHud extends Component {
  private viewModel: Maybe<BossFtueViewModel> = null;
  private uiComponent: Maybe<CustomUiComponent> = null;

  @subscribe(OnEntityStartEvent, { execution: ExecuteOn.Owner })
  onStart(): void {
    if (NetworkingService.get().isServerContext()) return;

    this.uiComponent = this.entity.getComponent(CustomUiComponent);
    if (!this.uiComponent) return;

    this.uiComponent.isVisible = false;
    this.viewModel = new BossFtueViewModel();
    this.uiComponent.dataContext = this.viewModel;
    this.viewModel.visible = false;
  }

  @subscribe(Events.LevelSelected, { execution: ExecuteOn.Owner })
  onLevelSelected(p: Events.LevelSelectedPayload): void {
    if (NetworkingService.get().isServerContext()) return;
    if (!this.viewModel || !this.uiComponent) return;

    const save = SaveService.get();
    // Only show for boss node type, only once
    if (p.nodeType !== OverworldNodeType.Boss) return;
    if (save.getBossFtueSeen()) return;

    console.log('[BossFtueHud] Showing boss FTUE popup');
    this.viewModel.visible = true;
    this.uiComponent.isVisible = true;
  }

  @subscribe(UiEvents.bossFtueGotIt, { execution: ExecuteOn.Owner })
  onGotIt(): void {
    if (NetworkingService.get().isServerContext()) return;
    if (!this.viewModel || !this.uiComponent) return;

    console.log('[BossFtueHud] Got it! dismissed');
    EventService.sendLocally(Events.UiButtonClick, new Events.UiButtonClickPayload());

    // Hide popup and panel
    this.viewModel.visible = false;
    this.uiComponent.isVisible = false;

    // Persist flag
    SaveService.get().markBossFtueSeen();

    // Notify other systems that boss FTUE is dismissed so WaveBannerHud can show the hint
    EventService.sendLocally(Events.BossFtueDismissed, new Events.BossFtueDismissedPayload());
  }
}
