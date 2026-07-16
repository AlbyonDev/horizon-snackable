/**
 * GameOverScreenHud — Displays the Game Over / Victory screen overlay.
 *
 * Component Attachment: Scene entity (GameOverScreenUI in space.hstf)
 * Component Networking: Local (client-only UI)
 * Component Ownership: Server-owned scene entity, but UI logic runs on client via ExecuteOn.Owner
 *
 * Shows a full-screen overlay when the game ends (victory or defeat).
 * Displays stats and allows the player to restart or return to overworld.
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

// -- Module-level UiEvent constants --

@serializable()
export class RestartTapPayload {
  readonly parameter: string = '';
}

const restartTapEvent = new UiEvent('GameOverScreenViewModel-onRestartTap', RestartTapPayload);

@serializable()
export class OverworldTapPayload {
  readonly parameter: string = '';
}

const overworldTapEvent = new UiEvent('GameOverScreenViewModel-onOverworldTap', OverworldTapPayload);

@serializable()
export class ChooseRelicTapPayload {
  readonly parameter: string = '';
}

const chooseRelicTapEvent = new UiEvent('GameOverScreenViewModel-onChooseRelicTap', ChooseRelicTapPayload);

// -- ViewModel --

@uiViewModel()
export class GameOverScreenViewModel extends UiViewModel {
  override readonly events = {
    restartTap: restartTapEvent,
    overworldTap: overworldTapEvent,
    chooseRelicTap: chooseRelicTapEvent,
  };

  visible: boolean = false;
  isVictory: boolean = false;
  showDefeatButtons: boolean = false;
  showChooseRelic: boolean = false;
  enemiesKilled: number = 0;
  goldEarned: number = 0;
  wavesCompleted: number = 0;
  totalWaves: number = 0;
}

// -- Component --

@component()
export class GameOverScreenHud extends Component {
  private viewModel: Maybe<GameOverScreenViewModel> = null;
  private uiComponent: Maybe<CustomUiComponent> = null;

  // Track stats during gameplay
  private _enemiesKilled: number = 0;
  private _goldEarned: number = 0;
  private _currentWave: number = 0;
  private _totalWaves: number = 0;
  private _ended: boolean = false;

  // -- Lifecycle --

  @subscribe(OnEntityStartEvent, { execution: ExecuteOn.Owner })
  onStart(): void {
    if (NetworkingService.get().isServerContext()) return;

    this.uiComponent = this.entity.getComponent(CustomUiComponent);
    if (!this.uiComponent) return;

    // Hide the native panel immediately to prevent XAML binding race
    // (unresolved bindings default to Visible, covering the screen)
    this.uiComponent.isVisible = false;

    this.viewModel = new GameOverScreenViewModel();
    this.uiComponent.dataContext = this.viewModel;
    this.viewModel.visible = false;
  }

  // -- Events --

  /**
   * Track enemy kills for stats
   */
  @subscribe(Events.EnemyDied, { execution: ExecuteOn.Owner })
  onEnemyDied(payload: Events.EnemyDiedPayload): void {
    if (NetworkingService.get().isServerContext()) return;
    this._enemiesKilled++;
    this._goldEarned += payload.reward;
  }

  /**
   * Track wave completion bonus gold for stats
   */
  @subscribe(Events.WaveCompleted, { execution: ExecuteOn.Owner })
  onWaveCompleted(payload: Events.WaveCompletedPayload): void {
    if (NetworkingService.get().isServerContext()) return;
    this._goldEarned += payload.bonusGold;
  }

  /**
   * Track tower sell refunds for stats
   */
  @subscribe(Events.TowerSold, { execution: ExecuteOn.Owner })
  onTowerSold(payload: Events.TowerSoldPayload): void {
    if (NetworkingService.get().isServerContext()) return;
    this._goldEarned += payload.refund;
  }

  /**
   * Track current wave number and total waves for stats
   */
  @subscribe(Events.WaveStarted, { execution: ExecuteOn.Owner })
  onWaveStarted(payload: Events.WaveStartedPayload): void {
    if (NetworkingService.get().isServerContext()) return;
    if (this._ended) return;
    this._currentWave = payload.waveIndex + 1;
    this._totalWaves = payload.totalWaves;
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
    this.viewModel.goldEarned = this._goldEarned;
    this.viewModel.wavesCompleted = this._currentWave;
    this.viewModel.totalWaves = this._totalWaves;

    // On victory: show "Choose Relic" button; on defeat: show Overworld/Play Again
    this.viewModel.showChooseRelic = payload.won;
    this.viewModel.showDefeatButtons = !payload.won;

    // Show the overlay - enable native panel first, then set ViewModel
    if (this.uiComponent) {
      this.uiComponent.isVisible = true;
    }
    this.viewModel.visible = true;
  }

  /**
   * When Play Again is tapped, fire ShowTitleScreen event and hide
   */
  @subscribe(restartTapEvent, { execution: ExecuteOn.Owner })
  onRestartTap(_payload: RestartTapPayload): void {
    if (NetworkingService.get().isServerContext()) return;
    if (!this.viewModel) return;

    this._resetAndHide();

    // Return to title screen
    EventService.sendLocally(Events.ShowTitleScreen, new Events.ShowTitleScreenPayload());
  }

  /**
   * When Return to Overworld is tapped, fire RestartGame event to go back to overworld
   */
  @subscribe(overworldTapEvent, { execution: ExecuteOn.Owner })
  onOverworldTap(_payload: OverworldTapPayload): void {
    if (NetworkingService.get().isServerContext()) return;
    if (!this.viewModel) return;

    console.log('[GameOverScreenHud] Return to Overworld tapped');
    this._resetAndHide();

    // Fire RestartGame which transitions to the Overworld phase
    EventService.sendLocally(Events.RestartGame, new Events.RestartGamePayload());
  }

  /**
   * When Choose Relic is tapped (victory only), hide this screen and show relic choice
   */
  @subscribe(chooseRelicTapEvent, { execution: ExecuteOn.Owner })
  onChooseRelicTap(_payload: ChooseRelicTapPayload): void {
    if (NetworkingService.get().isServerContext()) return;
    if (!this.viewModel) return;

    console.log('[GameOverScreenHud] Choose Relic tapped');
    this._resetAndHide();

    // Show the relic choice screen
    EventService.sendLocally(Events.ShowRelicChoice, new Events.ShowRelicChoicePayload());
  }

  private _resetAndHide(): void {
    if (!this.viewModel) return;

    this.viewModel.visible = false;
    if (this.uiComponent) {
      this.uiComponent.isVisible = false;
    }
    this._enemiesKilled = 0;
    this._goldEarned = 0;
    this._currentWave = 0;
    this._totalWaves = 0;
    this._ended = false;
  }
}

// -- Export UiEvent for Types.ts --

export namespace GameOverUiEvents {
  export const restartTap = restartTapEvent;
  export const overworldTap = overworldTapEvent;
  export type RestartTapPayload = typeof RestartTapPayload;
  export type OverworldTapPayload = typeof OverworldTapPayload;
}
