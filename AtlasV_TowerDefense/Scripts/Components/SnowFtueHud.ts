/**
 * SnowFtueHud — First-time tutorial popup for the snow biome's blizzard mechanic.
 *
 * Component Attachment: Scene entity (SnowFtueUI in space.hstf)
 * Component Networking: Local (client-only UI)
 * Component Ownership: Server-owned scene entity, UI logic runs on client via ExecuteOn.Owner
 *
 * Shows a one-time overlay explaining that blizzards periodically freeze towers,
 * but Fire Cannon, Frost, and Pillar towers are immune.
 * Triggered on LevelSelected when biome is 'snow' and the flag hasn't been set.
 * Persists the "seen" flag via SaveService (global.snow_tutorial).
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
export class SnowFtueViewModel extends UiViewModel {
  override readonly events = {
    gotIt: UiEvents.snowFtueGotIt,
  };

  visible: boolean = false;
}

// --- Component ---

@component()
export class SnowFtueHud extends Component {
  private viewModel: Maybe<SnowFtueViewModel> = null;
  private uiComponent: Maybe<CustomUiComponent> = null;

  @subscribe(OnEntityStartEvent, { execution: ExecuteOn.Owner })
  onStart(): void {
    if (NetworkingService.get().isServerContext()) return;

    this.uiComponent = this.entity.getComponent(CustomUiComponent);
    if (!this.uiComponent) return;

    this.uiComponent.isVisible = false;
    this.viewModel = new SnowFtueViewModel();
    this.uiComponent.dataContext = this.viewModel;
    this.viewModel.visible = false;
  }

  @subscribe(Events.LevelSelected, { execution: ExecuteOn.Owner })
  onLevelSelected(_p: Events.LevelSelectedPayload): void {
    if (NetworkingService.get().isServerContext()) return;
    if (!this.viewModel || !this.uiComponent) return;

    const save = SaveService.get();
    // Only show for snow biome, only once
    if (save.activeBiome !== 'snow') return;
    if (save.getSnowFtueSeen()) return;

    console.log('[SnowFtueHud] Showing snow FTUE popup');
    this.viewModel.visible = true;
    this.uiComponent.isVisible = true;
  }

  @subscribe(UiEvents.snowFtueGotIt, { execution: ExecuteOn.Owner })
  onGotIt(): void {
    if (NetworkingService.get().isServerContext()) return;
    if (!this.viewModel || !this.uiComponent) return;

    console.log('[SnowFtueHud] Got it! dismissed');
    EventService.sendLocally(Events.UiButtonClick, new Events.UiButtonClickPayload());

    // Hide popup
    this.viewModel.visible = false;
    this.uiComponent.isVisible = false;

    // Persist flag
    SaveService.get().markSnowFtueSeen();

    // Notify WaveBannerHud that snow FTUE is dismissed so it can show the build-phase hint
    EventService.sendLocally(Events.SnowFtueDismissed, new Events.SnowFtueDismissedPayload());
  }
}
