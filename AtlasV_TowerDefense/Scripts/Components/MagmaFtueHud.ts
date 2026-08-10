/**
 * MagmaFtueHud — First-time tutorial popup for the volcano biome's magma tiles.
 *
 * Component Attachment: Scene entity (MagmaFtueUI in space.hstf)
 * Component Networking: Local (client-only UI)
 * Component Ownership: Server-owned scene entity, UI logic runs on client via ExecuteOn.Owner
 *
 * Shows a one-time overlay explaining that magma tiles block tower placement.
 * Triggered on LevelSelected when biome is 'volcano' and the flag hasn't been set.
 * Persists the "seen" flag via SaveService (global.volcano_tutorial).
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

// --- ViewModel ---

@uiViewModel()
export class MagmaFtueViewModel extends UiViewModel {
  override readonly events = {
    gotIt: UiEvents.magmaFtueGotIt,
  };

  visible: boolean = false;
}

// --- Component ---

@component()
export class MagmaFtueHud extends Component {
  private viewModel: Maybe<MagmaFtueViewModel> = null;
  private uiComponent: Maybe<CustomUiComponent> = null;

  @subscribe(OnEntityStartEvent, { execution: ExecuteOn.Owner })
  onStart(): void {
    if (NetworkingService.get().isServerContext()) return;

    this.uiComponent = this.entity.getComponent(CustomUiComponent);
    if (!this.uiComponent) return;

    this.uiComponent.isVisible = false;
    this.viewModel = new MagmaFtueViewModel();
    this.uiComponent.dataContext = this.viewModel;
    this.viewModel.visible = false;
  }

  @subscribe(Events.LevelSelected, { execution: ExecuteOn.Owner })
  onLevelSelected(_p: Events.LevelSelectedPayload): void {
    if (NetworkingService.get().isServerContext()) return;
    if (!this.viewModel || !this.uiComponent) return;

    const save = SaveService.get();
    // Only show for volcano biome, only once
    if (save.activeBiome !== 'volcano') return;
    if (save.getVolcanoFtueSeen()) return;

    console.log('[MagmaFtueHud] Showing volcano FTUE popup');
    this.viewModel.visible = true;
    this.uiComponent.isVisible = true;
  }

  @subscribe(UiEvents.magmaFtueGotIt, { execution: ExecuteOn.Owner })
  onGotIt(): void {
    if (NetworkingService.get().isServerContext()) return;
    if (!this.viewModel || !this.uiComponent) return;

    console.log('[MagmaFtueHud] Got it! dismissed');
    EventService.sendLocally(Events.UiButtonClick, new Events.UiButtonClickPayload());

    // Hide popup
    this.viewModel.visible = false;
    this.uiComponent.isVisible = false;

    // Persist flag
    SaveService.get().markVolcanoFtueSeen();

    // Notify WaveBannerHud that volcano FTUE is dismissed so it can show the build-phase hint
    EventService.sendLocally(Events.VolcanoFtueDismissed, new Events.VolcanoFtueDismissedPayload());
  }
}
