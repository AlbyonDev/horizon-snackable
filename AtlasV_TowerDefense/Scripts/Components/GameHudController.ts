/**
 * GameHudController — ViewModel controller for the top HUD bar (gold, lives, wave).
 *
 * Attached to: GameHUD entity in space.hstf (has CustomUiComponent → GameHud.xaml).
 * GameHudViewModel fields: lives, gold, waveNumber, totalWaves, waveText ("N/10").
 * Updates on: ResourceChanged (gold/lives), WaveStarted (wave number), RestartGame (reset to 1).
 * All subscriptions use ExecuteOn.Owner — client-only UI, no server logic.
 */
import {
  Component,
  EventService,
  OnEntityStartEvent,
  OnWorldUpdateEvent,
  NetworkingService,
  ExecuteOn,
  component,
  subscribe,
  uiViewModel,
  UiViewModel,
  CustomUiComponent,
} from 'meta/worlds';
import type { Maybe, OnWorldUpdateEventPayload } from 'meta/worlds';

import { Events, UiEvents } from '../Types';
import { ResourceService } from '../Services/ResourceService';
import { START_GOLD, START_LIVES } from '../Constants';
import { LEVEL_DEFS } from '../Defs/LevelDefs';

@uiViewModel()
export class GameHudViewModel extends UiViewModel {
  visible: boolean = false;
  lives: number = START_LIVES;
  gold: number = START_GOLD;
  waveNumber: number = 1;
  totalWaves: number = LEVEL_DEFS[0].waves.length;
  waveText: string = '';
  countdown: number = 0;
  showCountdown: boolean = false;
}

const CASINO_SPEED = 120; // gold units per second during roll

@component()
export class GameHudController extends Component {
  private viewModel: Maybe<GameHudViewModel> = null;
  private uiComponent: Maybe<CustomUiComponent> = null;

  private _displayedGold: number = START_GOLD;
  private _targetGold: number = START_GOLD;

  @subscribe(OnEntityStartEvent, { execution: ExecuteOn.Owner })
  onStart(): void {
    if (NetworkingService.get().isServerContext()) return;

    this.uiComponent = this.entity.getComponent(CustomUiComponent);
    if (!this.uiComponent) return;

    this.viewModel = new GameHudViewModel();
    this.uiComponent.dataContext = this.viewModel;
    this.viewModel.visible = false;

    const resourceSvc = ResourceService.get();
    this.viewModel.lives = resourceSvc.lives;
    this.viewModel.gold = resourceSvc.gold;
    this.viewModel.waveNumber = 1;
    this.viewModel.totalWaves = LEVEL_DEFS[0].waves.length;
  }

  @subscribe(Events.LevelSelected, { execution: ExecuteOn.Owner })
  onLevelSelected(_p: Events.LevelSelectedPayload): void {
    if (NetworkingService.get().isServerContext()) return;
    if (!this.viewModel) return;
    this.viewModel.visible = true;
  }

  @subscribe(Events.ShowTitleScreen, { execution: ExecuteOn.Owner })
  onShowTitleScreen(_p: Events.ShowTitleScreenPayload): void {
    if (NetworkingService.get().isServerContext()) return;
    if (!this.viewModel) return;
    this.viewModel.visible = false;
  }

  @subscribe(Events.ResourceChanged, { execution: ExecuteOn.Owner })
  onResourceChanged(payload: Events.ResourceChangedPayload): void {
    if (NetworkingService.get().isServerContext()) return;
    if (!this.viewModel) return;
    this.viewModel.lives = payload.lives;
    this._targetGold = payload.gold;
    // Spending snaps immediately; earning rolls up
    if (payload.gold < this._displayedGold) {
      this._displayedGold = payload.gold;
      this.viewModel.gold = payload.gold;
    }
  }

  @subscribe(OnWorldUpdateEvent, { execution: ExecuteOn.Owner })
  onUpdate(p: OnWorldUpdateEventPayload): void {
    if (!this.viewModel || this._displayedGold === this._targetGold) return;
    const step = CASINO_SPEED * p.deltaTime;
    if (this._displayedGold < this._targetGold) {
      this._displayedGold = Math.min(this._displayedGold + step, this._targetGold);
    }
    this.viewModel.gold = Math.round(this._displayedGold);
  }

  @subscribe(Events.WaveStarted, { execution: ExecuteOn.Owner })
  onWaveStarted(payload: Events.WaveStartedPayload): void {
    if (NetworkingService.get().isServerContext()) return;
    if (!this.viewModel) return;
    this.viewModel.waveNumber = payload.waveIndex + 1; // 1-based display
    this.viewModel.totalWaves = payload.totalWaves;
    this.viewModel.showCountdown = false;
    this.viewModel.countdown = 0;
    this._updateWaveText();
  }

  @subscribe(Events.CountdownTick, { execution: ExecuteOn.Owner })
  onCountdownTick(payload: Events.CountdownTickPayload): void {
    if (NetworkingService.get().isServerContext()) return;
    if (!this.viewModel) return;
    this.viewModel.countdown = payload.secondsLeft;
    this.viewModel.showCountdown = payload.secondsLeft > 0;
  }

  @subscribe(Events.RestartGame, { execution: ExecuteOn.Owner })
  onRestart(_p: Events.RestartGamePayload): void {
    if (!this.viewModel) return;
    // Hide HUD — will show again when LevelSelected fires
    this.viewModel.visible = false;
    this.viewModel.waveNumber = 1;
    this.viewModel.totalWaves = LEVEL_DEFS[0].waves.length;
    this.viewModel.waveText = "";
    this.viewModel.countdown = 0;
    this.viewModel.showCountdown = false;
  }


  @subscribe(UiEvents.skipWaveTap, { execution: ExecuteOn.Owner })
  onSkipWaveTap(_p: UiEvents.SkipWaveTapPayload): void {
    if (NetworkingService.get().isServerContext()) return;
    EventService.sendLocally(Events.SkipBuild, new Events.SkipBuildPayload());
  }

  private _updateWaveText(): void {
    if (!this.viewModel) return;
    this.viewModel.waveText = `WAVE ${this.viewModel.waveNumber}/${this.viewModel.totalWaves}`;
  }
}
