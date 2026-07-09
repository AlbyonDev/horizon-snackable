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

import { Events, GamePhase, UiEvents } from '../Types';
import { ResourceService } from '../Services/ResourceService';
import { EnemyService } from '../Services/EnemyService';
import { LevelGeneratorService } from '../Services/LevelGeneratorService';
import { START_GOLD, START_LIVES } from '../Constants';

@uiViewModel()
export class GameHudViewModel extends UiViewModel {
  visible: boolean = false;
  lives: number = START_LIVES;
  gold: number = START_GOLD;
  waveNumber: number = 1;
  totalWaves: number = 0;
  waveText: string = '';
  countdown: number = 0;
  showCountdown: boolean = false;
  showAbandon: boolean = false;
  showConfirmPopup: boolean = false;
  showNextWave: boolean = false;

  override readonly events = {
    skipWaveTap: UiEvents.skipWaveTap,
    abandonLevelTap: UiEvents.abandonLevelTap,
    confirmYesTap: UiEvents.confirmAbandonYesTap,
    confirmNoTap: UiEvents.confirmAbandonNoTap,
    nextWaveTap: UiEvents.nextWaveTap,
  };
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

    // Hide the native panel immediately to prevent XAML binding race
    // (unresolved bindings default to Visible, covering the screen)
    this.uiComponent.isVisible = false;

    this.viewModel = new GameHudViewModel();
    this.uiComponent.dataContext = this.viewModel;
    this.viewModel.visible = false;

    const resourceSvc = ResourceService.get();
    this.viewModel.lives = resourceSvc.lives;
    this.viewModel.gold = resourceSvc.gold;
    this.viewModel.waveNumber = 1;
    this.viewModel.totalWaves = 0;
  }

  @subscribe(Events.LevelSelected, { execution: ExecuteOn.Owner })
  onLevelSelected(p: Events.LevelSelectedPayload): void {
    if (NetworkingService.get().isServerContext()) return;
    if (!this.viewModel) return;
    if (this.uiComponent) this.uiComponent.isVisible = true;
    this.viewModel.visible = true;

    // Show total waves summary on level entry; switches to "WAVE X/N" on WaveStarted
    const levelDef = LevelGeneratorService.get().getLevelDef(p.levelIndex);
    this.viewModel.waveNumber = 0;
    this.viewModel.totalWaves = levelDef.waves.length;
    this.viewModel.waveText = `${levelDef.waves.length} waves in this level`;
  }

  @subscribe(Events.ShowTitleScreen, { execution: ExecuteOn.Owner })
  onShowTitleScreen(_p: Events.ShowTitleScreenPayload): void {
    if (NetworkingService.get().isServerContext()) return;
    if (!this.viewModel) return;
    this.viewModel.visible = false;
    if (this.uiComponent) this.uiComponent.isVisible = false;
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
    if (this.uiComponent) this.uiComponent.isVisible = false;
    this.viewModel.waveNumber = 1;
    this.viewModel.totalWaves = 0;
    this.viewModel.waveText = "";
    this.viewModel.countdown = 0;
    this.viewModel.showCountdown = false;
    this.viewModel.showConfirmPopup = false;
    this.viewModel.showNextWave = false;
  }

  @subscribe(UiEvents.skipWaveTap, { execution: ExecuteOn.Owner })
  onSkipWaveTap(_p: UiEvents.SkipWaveTapPayload): void {
    if (NetworkingService.get().isServerContext()) return;
    EventService.sendLocally(Events.SkipBuild, new Events.SkipBuildPayload());
  }

  @subscribe(UiEvents.abandonLevelTap, { execution: ExecuteOn.Owner })
  onAbandonLevelTap(_p: UiEvents.SkipWaveTapPayload): void {
    if (NetworkingService.get().isServerContext()) return;
    if (!this.viewModel) return;
    console.log('[GameHudController] Abandon level tapped — showing confirm popup');
    this.viewModel.showConfirmPopup = true;
  }

  @subscribe(UiEvents.confirmAbandonYesTap, { execution: ExecuteOn.Owner })
  onConfirmYes(_p: UiEvents.SkipWaveTapPayload): void {
    if (NetworkingService.get().isServerContext()) return;
    if (!this.viewModel) return;
    console.log('[GameHudController] Confirm Yes — firing RestartGame');
    this.viewModel.showConfirmPopup = false;
    EventService.sendLocally(Events.RestartGame, new Events.RestartGamePayload());
  }

  @subscribe(UiEvents.confirmAbandonNoTap, { execution: ExecuteOn.Owner })
  onConfirmNo(_p: UiEvents.SkipWaveTapPayload): void {
    if (NetworkingService.get().isServerContext()) return;
    if (!this.viewModel) return;
    console.log('[GameHudController] Confirm No — closing popup');
    this.viewModel.showConfirmPopup = false;
  }

  @subscribe(Events.GamePhaseChanged, { execution: ExecuteOn.Owner })
  onPhaseChanged(p: Events.GamePhaseChangedPayload): void {
    if (NetworkingService.get().isServerContext()) return;
    if (!this.viewModel) return;
    const phase = p.phase;
    // Show abandon button only during active gameplay phases
    this.viewModel.showAbandon =
      phase === GamePhase.Build ||
      phase === GamePhase.Wave ||
      phase === GamePhase.WaveClear;
    // Show "Next Wave" debug button only during active Wave phase
    this.viewModel.showNextWave = phase === GamePhase.Wave;
  }

  @subscribe(UiEvents.nextWaveTap, { execution: ExecuteOn.Owner })
  onNextWaveTap(_p: UiEvents.SkipWaveTapPayload): void {
    if (NetworkingService.get().isServerContext()) return;
    console.log('[GameHudController] Next Wave tapped — killing all enemies');
    const enemies = EnemyService.get().getAll();
    for (const [id, rec] of enemies) {
      const dmgP = new Events.TakeDamagePayload();
      dmgP.enemyId = id;
      dmgP.damage = rec.hp; // lethal damage
      dmgP.props = {};
      dmgP.originX = rec.worldX;
      dmgP.originZ = rec.worldZ;
      EventService.sendLocally(Events.TakeDamage, dmgP, { eventTarget: rec.entity });
    }
  }

  private _updateWaveText(): void {
    if (!this.viewModel) return;
    this.viewModel.waveText = `WAVE ${this.viewModel.waveNumber}/${this.viewModel.totalWaves}`;
  }
}
