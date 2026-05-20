/**
 * GameManager — Top-level game orchestrator. Attached to a scene entity in space.hstf.
 *
 * Responsibilities:
 *   - _startGame(): prewarms all pools, forces service instantiation, starts first wave.
 *   - onUpdate(): drives WaveService.tick(dt) each frame while _running.
 *   - onEnemyReachedEnd(): calls _endGame(false) when lives reach 0.
 *   - onPhaseChanged(): calls _endGame(true) on Victory phase.
 *   - onRestart(): resets resources and restarts the wave sequence.
 *   - _endGame(): sets _running=false, fires GameOver event (once, guarded).
 * Services are force-instantiated here to control initialization order.
 * Ground texture is handled by TDGroundTextureController (grass texture on Ground entity).
 */
import { Color, ColorComponent, Component, EventService } from 'meta/worlds';
import { component, subscribe, property } from 'meta/worlds';
import { OnEntityStartEvent, OnWorldUpdateEvent } from 'meta/worlds';
import type { OnWorldUpdateEventPayload, Maybe, Entity } from 'meta/worlds';
import { NetworkingService } from 'meta/worlds';
import { Events, GamePhase } from '../Types';

import { WaveService } from '../Services/WaveService';
import { ResourceService } from '../Services/ResourceService';
import { SlowService } from '../Services/SlowService';
import { PlacementService } from '../Services/PlacementService';
import { PathService } from '../Services/PathService';
import { ProjectilePool } from '../Services/ProjectilePool';
import { HealthBarService } from '../Services/HealthBarService';
import { FloatingTextService } from '../Services/FloatingTextService';
import { CoinService } from '../Services/CoinService';
import { CritService } from '../Services/CritService';
import { SplashSystem } from '../Services/SplashSystem';
import { VfxService } from '../Services/VfxService';
import { GROUND_COLOR, hexColor } from '../Constants';
import { CameraShakeService } from '../Services/CameraShakeService';
import { PathTileService } from '../Services/PathTileService';

@component()
export class GameManager extends Component {
  @property() enabled: boolean = false;

  private _running: boolean = false;

  @subscribe(OnEntityStartEvent)
  onStart(): void {
    if (NetworkingService.get().isServerContext()) return;
    SlowService.get();
    if (this.enabled) {
      this._startGame();
    }
  }

  @subscribe(Events.StartGame)
  onStartGame(_p: Events.StartGamePayload): void {
    if (NetworkingService.get().isServerContext()) return;
    if (this._running) return;
    this._startGame();
  }

  @subscribe(OnWorldUpdateEvent)
  onUpdate(p: OnWorldUpdateEventPayload): void {
    if (!this._running) return;
    const dt = p.deltaTime;
    WaveService.get().tick(dt);
  }

  @subscribe(Events.EnemyReachedEnd)
  onEnemyReachedEnd(_p: Events.EnemyReachedEndPayload): void {
    if (ResourceService.get().lives <= 0) {
      this._endGame(false);
    }
  }

  @subscribe(Events.GamePhaseChanged)
  onPhaseChanged(p: Events.GamePhaseChangedPayload): void {
    if (p.phase === GamePhase.Victory) {
      this._endGame(true);
    }
  }

  @subscribe(Events.RestartGame)
  onRestart(_p: Events.RestartGamePayload): void {
    // Services have already cleaned up their state before this fires.
    this._running = true;
    ResourceService.get().reset();
    WaveService.get().startGame();
  }

  private _startGame(): void {
    this._running = true;
    CritService.get();
    SplashSystem.get();
    VfxService.get();
    CameraShakeService.get();
    void Promise.all([
      ProjectilePool.get().prewarm(),
      HealthBarService.get().prewarm(),
      PlacementService.get().prewarm(),
      FloatingTextService.get().prewarm(),
      VfxService.get().prewarm(),
      CoinService.get().prewarm(),
      PathTileService.get().prewarm(),
    ]);
    ResourceService.get().reset();
    WaveService.get().startGame();
  }

  private _endGame(won: boolean): void {
    if (!this._running) return;
    this._running = false;
    const p = new Events.GameOverPayload();
    p.won = won;
    EventService.sendLocally(Events.GameOver, p);
  }
}
