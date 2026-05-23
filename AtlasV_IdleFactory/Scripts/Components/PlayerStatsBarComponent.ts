import {
  Component,
  component,
  subscribe,
  OnEntityStartEvent,
  OnWorldUpdateEvent,
  OnWorldUpdateEventPayload,
  CustomUiComponent,
  WorldService,
  ExecuteOn,
} from 'meta/worlds';
import type { Maybe } from 'meta/worlds';
import { PlayerStatsBarViewModel } from '../UI/PlayerStatsBarViewModel';
import { EconomyService } from '../Services/EconomyService';
import { Events } from '../Types';

/**
 * PlayerStatsBarComponent - Updates the player stats bar UI with time, packages, and gold.
 *
 * Component Attachment: Scene Entity (PlayerStatsBarUI in space.hstf)
 * Component Networking: Local (UI is client-side only)
 * Component Ownership: Not Networked - Executes on all clients locally
 *
 * This component:
 * - Tracks elapsed game time and formats it as MM:SS or HH:MM:SS
 * - Counts packages delivered by subscribing to ProductDelivered event
 * - Reads current gold balance from EconomyService
 */
@component()
export class PlayerStatsBarComponent extends Component {
  private viewModel: Maybe<PlayerStatsBarViewModel> = null;
  private customUiComponent: Maybe<CustomUiComponent> = null;
  private economyService: Maybe<EconomyService> = null;

  // Tracking stats
  private startTime: number = 0;
  private packagesSent: number = 0;

  @subscribe(OnEntityStartEvent, { execution: ExecuteOn.Everywhere })
  onStart(): void {
    this.customUiComponent = this.entity.getComponent(CustomUiComponent);
    if (!this.customUiComponent) {
      console.error('[PlayerStatsBarComponent] CustomUiComponent not found on entity');
      return;
    }

    this.viewModel = new PlayerStatsBarViewModel();
    this.customUiComponent.dataContext = this.viewModel;
    this.economyService = EconomyService.get();
    this.startTime = WorldService.get().getWorldTime();
    this.updateUI();
  }

  @subscribe(OnWorldUpdateEvent, { execution: ExecuteOn.Everywhere })
  onUpdate(_payload: OnWorldUpdateEventPayload): void {
    // Update UI every frame (time and gold can change frequently)
    this.updateUI();
  }

  @subscribe(Events.TruckDelivered, { execution: ExecuteOn.Everywhere })
  onTruckDelivered(p: Events.TruckDeliveredPayload): void {
    this.packagesSent += p.productCount;
  }

  /**
   * Updates all UI values in the ViewModel.
   */
  private updateUI(): void {
    if (!this.viewModel) return;

    // Update time played
    const currentTime = WorldService.get().getWorldTime();
    const elapsedSeconds = Math.floor(currentTime - this.startTime);
    this.viewModel.TimePlayed = this.formatTime(elapsedSeconds);

    // Update packages sent
    this.viewModel.PackagesSent = this.formatNumber(this.packagesSent);

    // Update gold from EconomyService
    if (this.economyService) {
      this.viewModel.Gold = this.formatNumber(Math.floor(this.economyService.money));
    }
  }

  /**
   * Formats elapsed time as MM:SS or HH:MM:SS if over 1 hour.
   */
  private formatTime(totalSeconds: number): string {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    const pad = (n: number): string => n.toString().padStart(2, '0');

    if (hours > 0) {
      return `${hours}:${pad(minutes)}:${pad(seconds)}`;
    }
    return `${pad(minutes)}:${pad(seconds)}`;
  }

  /**
   * Formats a number with thousand separators.
   */
  private formatNumber(value: number): string {
    return value.toLocaleString();
  }
}
