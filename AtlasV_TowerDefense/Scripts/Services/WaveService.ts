/**
 * WaveService — Wave state machine and enemy spawn sequencer.
 *
 * State machine: Idle → Build → Wave → WaveClear → Build → … → Victory
 * startGame(): transitions from Idle to Build phase.
 * tick(dt): called every frame by GameManager. Drives timers and spawn queue.
 * Build phase lasts WAVE_BUILD_DURATION seconds, then auto-starts the wave.
 * Wave phase spawns enemies at ENEMY_SPAWN_INTERVAL intervals from the current wave def.
 * WaveClear phase waits WAVE_CLEAR_DURATION after last enemy dies, then loops or fires Victory.
 * Sends: GamePhaseChanged, WaveStarted, WaveCompleted, InitEnemy (via EnemyService.spawn).
 * Awards WAVE_BONUS_GOLD at end of each wave via ResourceService.
 * Resets on RestartGame.
 */
import { Service, EventService } from 'meta/worlds';
import { service, subscribe } from 'meta/worlds';
import { OnServiceReadyEvent } from 'meta/worlds';
import { Events, GamePhase } from '../Types';
import { WAVE_CLEAR_DURATION, WAVE_BONUS_GOLD, WAVE_BUILD_DURATION, ENEMY_SPAWN_INTERVAL, INCOME_RATE } from '../Constants';
import { LevelGeneratorService } from './LevelGeneratorService';
import { EnemyService } from './EnemyService';
import { ResourceService } from './ResourceService';
import { BossModifierService } from './BossModifierService';
import { TowerService } from './TowerService';

@service()
export class WaveService extends Service {
  private _waveIndex: number = 0;
  private _totalWaves: number = 0;
  private _phase: GamePhase = GamePhase.Idle;
  private _timer: number = 0;
  private _ftueWaiting: boolean = false;
  private _currentLevel: number = 0;

  // ── Spawn queue ───────────────────────────────────────────────────────────────
  private _spawnQueue: string[] = [];
  private _spawnTimer: number = 0;
  private _spawnedCount: number = 0;
  private _totalInWave: number = 0;

  @subscribe(OnServiceReadyEvent)
  onReady(): void {
    // totalWaves will be set when a level is selected (from LevelGeneratorService)
    this._totalWaves = 0;
  }

  get waveIndex(): number { return this._waveIndex; }
  get totalWaves(): number { return this._totalWaves; }
  get phase(): GamePhase { return this._phase; }

  @subscribe(Events.LevelSelected)
  onLevelSelected(p: Events.LevelSelectedPayload): void {
    this._currentLevel = p.levelIndex;
    const levelDef = LevelGeneratorService.get().getLevelDef(this._currentLevel);
    this._totalWaves = levelDef.waves.length;
  }

  @subscribe(Events.RestartGame)
  onRestart(_p: Events.RestartGamePayload): void {
    this._waveIndex    = 0;
    this._phase        = GamePhase.Idle;
    this._timer        = 0;
    this._ftueWaiting  = false;
    this._spawnQueue   = [];
    this._spawnTimer   = 0;
    this._spawnedCount = 0;
    this._totalInWave  = 0;
  }

  startGame(): void {
    this._waveIndex   = 0;
    this._ftueWaiting = false;
    this._enterBuild();
  }

  tick(dt: number): void {
    if (this._phase === GamePhase.Build && this._waveIndex === 0) {
      const prevSeconds = Math.ceil(this._timer);
      this._timer -= dt;
      const newSeconds = Math.ceil(this._timer);
      if (newSeconds !== prevSeconds && newSeconds >= 0) {
        const p = new Events.CountdownTickPayload();
        p.secondsLeft = newSeconds;
        EventService.sendLocally(Events.CountdownTick, p);
      }
    } else {
      this._timer -= dt;
    }

    if (this._phase === GamePhase.Build && this._timer <= 0 && !this._ftueWaiting) {
      this._enterWave();
    } else if (this._phase === GamePhase.WaveClear && this._timer <= 0) {
      if (this._waveIndex >= this._totalWaves) {
        this._sendPhase(GamePhase.Victory);
      } else {
        this._enterBuild();
      }
    }

    this._tickSpawn(dt);
  }

  @subscribe(Events.TowerPlaced)
  onTowerPlaced(_p: Events.TowerPlacedPayload): void {
    if (!this._ftueWaiting) return;
    this._ftueWaiting = false;
    this._timer = WAVE_BUILD_DURATION;
  }

  @subscribe(Events.SkipBuild)
  onSkipBuild(_p: Events.SkipBuildPayload): void {
    if (this._phase === GamePhase.Build) {
      this._timer = 0; // next tick() will call _enterWave()
    }
  }

  @subscribe(Events.EnemyDied)
  onEnemyDied(_p: Events.EnemyDiedPayload): void {
    this._checkWaveClear();
  }

  @subscribe(Events.EnemyReachedEnd)
  onEnemyReachedEnd(_p: Events.EnemyReachedEndPayload): void {
    this._checkWaveClear();
  }

  private _tickSpawn(dt: number): void {
    if (this._spawnQueue.length === 0) return;
    this._spawnTimer -= dt;
    if (this._spawnTimer > 0) return;
    this._spawnTimer = ENEMY_SPAWN_INTERVAL;

    const enemyId = this._spawnQueue.shift()!;
    void EnemyService.get().spawn(enemyId, this._waveIndex);
    this._spawnedCount++;
  }

  private _checkWaveClear(): void {
    if (this._phase !== GamePhase.Wave) return;
    if (this._spawnedCount < this._totalInWave) return; // still spawning
    if (EnemyService.get().count > 0) return;

    const goldBeforeBonus = ResourceService.get().gold;
    const incomeMultiplier = BossModifierService.get().incomeMultiplier;
    const waveBonus = Math.floor(WAVE_BONUS_GOLD * incomeMultiplier);
    const incomeBonus = Math.floor(goldBeforeBonus * INCOME_RATE * incomeMultiplier);
    if (waveBonus > 0) ResourceService.get().earn(waveBonus);
    if (incomeBonus > 0) ResourceService.get().earn(incomeBonus);
    const totalBonus = waveBonus + incomeBonus;
    this._waveIndex++;

    const doneP = new Events.WaveCompletedPayload();
    doneP.waveIndex = this._waveIndex - 1;
    doneP.bonusGold = totalBonus;
    EventService.sendLocally(Events.WaveCompleted, doneP);

    this._phase = GamePhase.WaveClear;
    this._timer = WAVE_CLEAR_DURATION;
    this._sendPhase(GamePhase.WaveClear);
  }

  private _enterBuild(): void {
    this._phase = GamePhase.Build;
    if (this._waveIndex === 0) {
      this._ftueWaiting = true;
      this._timer = 0;
      EventService.sendLocally(Events.FtueHint, new Events.FtueHintPayload());
    } else {
      this._timer = 0;
    }
    this._sendPhase(GamePhase.Build);
  }

  private _enterWave(): void {
    this._phase = GamePhase.Wave;
    this._spawnedCount = 0;
    this._spawnTimer = 0;

    const waveDef = LevelGeneratorService.get().getLevelDef(this._currentLevel).waves[this._waveIndex];
    this._spawnQueue = [];
    for (const group of waveDef.groups) {
      for (let i = 0; i < group.count; i++) {
        this._spawnQueue.push(group.enemyId);
      }
    }
    this._totalInWave = this._spawnQueue.length;

    // Fisher-Yates shuffle — mixes enemy types for chaotic, fun waves
    for (let i = this._spawnQueue.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this._spawnQueue[i], this._spawnQueue[j]] = [this._spawnQueue[j], this._spawnQueue[i]];
    }

    const startP = new Events.WaveStartedPayload();
    startP.waveIndex = this._waveIndex;
    startP.totalWaves = this._totalWaves;
    EventService.sendLocally(Events.WaveStarted, startP);

    // Boss modifier: destroy a random tower every 5 waves
    const waveNumber = this._waveIndex + 1;
    if (BossModifierService.get().shouldDestroyTower(waveNumber)) {
      const allTowers = TowerService.get().getAll();
      if (allTowers.size > 0) {
        const towerIds = [...allTowers.keys()];
        const randomIdx = Math.floor(Math.random() * towerIds.length);
        const rec = allTowers.get(towerIds[randomIdx]);
        if (rec) {
          console.log(`[WaveService] Boss modifier: destroying tower at col=${rec.col}, row=${rec.row} (wave ${waveNumber})`);
          rec.entity.destroy();
          TowerService.get().removeTowerAt(rec.col, rec.row);
        }
      } else {
        console.log(`[WaveService] Boss modifier: no towers to destroy at wave ${waveNumber}`);
      }
    }

    this._sendPhase(GamePhase.Wave);
  }

  private _sendPhase(phase: GamePhase): void {
    const p = new Events.GamePhaseChangedPayload();
    p.phase = phase;
    EventService.sendLocally(Events.GamePhaseChanged, p);
  }
}
