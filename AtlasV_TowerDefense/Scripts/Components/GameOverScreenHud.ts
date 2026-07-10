/**
 * GameOverScreenHud — Displays the Game Over / Victory screen overlay.
 *
 * Component Attachment: Scene entity (GameOverScreenUI in space.hstf)
 * Component Networking: Local (client-only UI)
 * Component Ownership: Server-owned scene entity, but UI logic runs on client via ExecuteOn.Owner
 *
 * Shows a full-screen overlay when the game ends (victory or defeat).
 * Displays stats and allows the player to tap anywhere to restart.
 */
import {
  Component,
  OnEntityStartEvent,
  NetworkingService,
  ExecuteOn,
  EventService,
  component,
  subscribe,
  uiViewModel,
  UiViewModel,
  UiEvent,
  CustomUiComponent,
  serializable,
} from 'meta/worlds';
import type { Maybe } from 'meta/worlds';

import { Events, UiEvents } from '../Types';
import { LEVEL_DEFS } from '../Defs/LevelDefs';
import { ResourceService } from '../Services/ResourceService';

// ── Module-level UiEvent constants ──────────────────────────────────────────

@serializable()
export class RestartTapPayload {
  readonly parameter: string = '';
}

const restartTapEvent = new UiEvent('GameOverScreenViewModel-onRestartTap', RestartTapPayload);

// ── ViewModel ───────────────────────────────────────────────────────────────

@uiViewModel()
export class GameOverScreenViewModel extends UiViewModel {
  override readonly events = {
    restartTap: restartTapEvent,
  };

  visible: boolean = false;
  isVictory: boolean = false;
  enemiesKilled: number = 0;
  goldEarned: number = 0;
  wavesCompleted: number = 0;
  totalWaves: number = LEVEL_DEFS[0].waves.length;
}

// ── Component ───────────────────────────────────────────────────────────────

@component()
export class GameOverScreenHud extends Component {
  private viewModel: Maybe<GameOverScreenViewModel> = null;
  private uiComponent: Maybe<CustomUiComponent> = null;

  // Track stats during gameplay
  private _enemiesKilled: number = 0;
  private _currentWave: number = 0;
  private _ended: boolean = false;

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  @subscribe(OnEntityStartEvent, { execution: ExecuteOn.Owner })
  onStart(): void {
    if (NetworkingService.get().isServerContext()) return;

    this.uiComponent = this.entity.getComponent(CustomUiComponent);
    if (!this.uiComponent) return;
    this.uiComponent.isVisible = false;

    this.viewModel = new GameOverScreenViewModel();
    this.uiComponent.dataContext = this.viewModel;
    this.viewModel.visible = false;

    this.uiComponent.isVisible = true;
  }

  // ── Events ────────────────────────────────────────────────────────────────

  /**
   * Track enemy kills for stats
   */
  @subscribe(Events.EnemyDied, { execution: ExecuteOn.Owner })
  onEnemyDied(_payload: Events.EnemyDiedPayload): void {
    if (NetworkingService.get().isServerContext()) return;
    this._enemiesKilled++;
  }

  /**
   * Track current wave number for stats
   */
  @subscribe(Events.WaveStarted, { execution: ExecuteOn.Owner })
  onWaveStarted(payload: Events.WaveStartedPayload): void {
    if (NetworkingService.get().isServerContext()) return;
    if (this._ended) return;
    this._currentWave = payload.waveIndex + 1;
  }

  /**
   * When the game ends, show the overlay with stats
   */
  @subscribe(Events.GameOver, { execution: ExecuteOn.Owner })
  onGameOver(payload: Events.GameOverPayload): void {
    if (NetworkingService.get().isServerContext()) return;
    if (!this.viewModel) return;

    this._ended = true;
    this.viewModel.isVictory = payload.won;
    this.viewModel.enemiesKilled = this._enemiesKilled;
    this.viewModel.goldEarned = ResourceService.get().totalEarned;
    this.viewModel.wavesCompleted = this._currentWave;

    // Show the overlay
    this.viewModel.visible = true;
  }

  /**
   * When the overlay is tapped, fire restart event and hide
   */
  @subscribe(restartTapEvent, { execution: ExecuteOn.Owner })
  onRestartTap(_payload: RestartTapPayload): void {
    if (NetworkingService.get().isServerContext()) return;
    if (!this.viewModel) return;

    this.viewModel.visible = false;
    this._enemiesKilled = 0;
    this._currentWave = 0;
    this._ended = false;

    // Return to title screen instead of restarting directly
    EventService.sendLocally(Events.ShowTitleScreen, new Events.ShowTitleScreenPayload());
  }
}

// ── Export UiEvent for Types.ts ─────────────────────────────────────────────

export namespace GameOverUiEvents {
  export const restartTap = restartTapEvent;
  export type RestartTapPayload = typeof RestartTapPayload;
}
