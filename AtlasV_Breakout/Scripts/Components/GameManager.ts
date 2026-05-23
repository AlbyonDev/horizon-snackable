import { component, Component, EventService, ExecuteOn, NetworkingService, OnEntityStartEvent, OnFocusedInteractionInputStartedEvent, OnWorldUpdateEvent, OnWorldUpdateEventPayload, property, subscribe } from 'meta/worlds';
import { Events, HUDEvents, HighScoreHUDEvents, LeaderboardEvents } from '../Types';
import { LEVELS, Title, type LevelConfig } from '../LevelConfig';
import { CameraShakeService } from '../Services/CameraShakeService';
import { VfxService } from '../Services/VfxService';
import { JuiceService } from '../Services/JuiceService';
import { CoinService } from '../Services/CoinService';
import { BallPowerService } from '../Services/BallPowerService';
import { AudioManager } from '../Services/AudioManager';

@component()
export class GameManager extends Component {
  @property()
  private maxLives: number = 1;
  private _cameraShake : CameraShakeService = CameraShakeService.get();
  private _vfxService : VfxService = VfxService.get();
  private _juiceService : JuiceService = JuiceService.get();
  private _coinService : CoinService = CoinService.get();
  private _ballPower : BallPowerService = BallPowerService.get();
  private _audioManager : AudioManager = AudioManager.get();

  private _lives: number = 1;
  private _score: number = 0;
  private _currentLevel: number = 0;
  private _bricksDestroyedThisLevel: number = 0;
  private _destructibleBrickCount: number = 0;
  private _survivalTimer: number = 0;
  private _isClient = false;
  private _showingHighScores: boolean = false;
  private _waitingForCoins = false;
  private _transitionDelay = 0;
  private _showingTitleScreen: boolean = true;

  @subscribe(OnEntityStartEvent)
  onStart(): void {
    this._isClient = !NetworkingService.get().isServerContext();
    if (!this._isClient) return;
    this._lives = this.maxLives;
    this._showingTitleScreen = true;
    this._vfxService.prewarm();
    // Initial spawn is handled by LevelLayout.onStart (level 0 by default).
    // LoadLevel is only emitted on subsequent level changes.
    this._score = 0;
    EventService.sendLocally(HUDEvents.UpdateScore, { score: this._score });
    EventService.sendLocally(HUDEvents.UpdateLives, { lives: this._lives });
    EventService.sendLocally(HUDEvents.ShowMessage, { message: 'Tap to start' });
  }

  private _initLevelState(config: LevelConfig): void {
    this._bricksDestroyedThisLevel = 0;
    this._destructibleBrickCount = this._countDestructibleBricks(config);
    this._survivalTimer = config.victory?.kind === 'survivalTime'
      ? config.victory.seconds
      : 0;
    if (config.livesOverride !== undefined) {
      this._lives = config.livesOverride;
    }
  }

  private _countDestructibleBricks(config: LevelConfig): number {
    let count = 0;
    for (const row of config.grid.split('\n')) {
      for (const char of [...row]) {
        const tmpl = config.brickTemplates[char];
        if (tmpl && !tmpl.indestructible) count++;
      }
    }
    return count;
  }

  // ── Ball lost ─────────────────────────────────────────────────────────────

  @subscribe(Events.BallLost)
  onBallLost(): void {
    // Ignore if already in game-over or level-clear state
    if (this._showingHighScores || this._waitingForCoins) return;

    this._lives--;

    if (this._lives <= 0) {
      // Game over — freeze ball, show high scores (tap to dismiss)
      this._showingHighScores = true;
      EventService.sendLocally(Events.LevelCleared, {}); // freeze ball in place
      EventService.sendLocally(LeaderboardEvents.LeaderboardDisplayRequest, {});
      // Submit score to the leaderboard — server will process and trigger async update
      EventService.sendGlobally(LeaderboardEvents.LeaderboardSubmitScore, { score: this._score });
      return;
    }

    EventService.sendLocally(HUDEvents.UpdateLives, { lives: this._lives });
    EventService.sendLocally(Events.ResetRound, {});
    EventService.sendLocally(HUDEvents.ShowMessage, { message: 'Tap to start' });
  }

  private _dismissHighScoresAndRestart(): void {
    this._showingHighScores = false;

    EventService.sendLocally(HighScoreHUDEvents.HideHighScores, {});

    this._lives = this.maxLives;
    this._score = 0;
    EventService.sendLocally(HUDEvents.UpdateScore, { score: this._score });
    EventService.sendLocally(Events.Restart, {});
    this._loadLevel(this._currentLevel);
    EventService.sendLocally(HUDEvents.UpdateLives, { lives: this._lives });
    EventService.sendLocally(Events.ResetRound, {});
    EventService.sendLocally(HUDEvents.ShowMessage, { message: 'Tap to start' });
  }

  // ── Coin collected (scoring) ───────────────────────────────────────────────

  @subscribe(Events.CoinCollected)
  onCoinCollected(payload: Events.CoinCollectedPayload): void {
    this._score += payload.value;
    EventService.sendLocally(HUDEvents.UpdateScore, { score: this._score });
  }

  // ── Brick destroyed ───────────────────────────────────────────────────────

  @subscribe(Events.BrickDestroyed)
  onBrickDestroyed(): void {
    this._bricksDestroyedThisLevel++;
    this._checkVictory();
  }

  private _checkVictory(): void {
    const victory = LEVELS[this._currentLevel].victory ?? { kind: 'allBricksDestroyed' };

    const won =
      victory.kind === 'allBricksDestroyed'
        ? this._bricksDestroyedThisLevel >= this._destructibleBrickCount
        : victory.kind === 'bricksDestroyed'
          ? this._bricksDestroyedThisLevel >= victory.count
          : false; // survivalTime handled in onUpdate

    if (won) this._advanceLevel();
  }

  // ── Survival (victory: survivalTime) ──────────────────────────────────────

  @subscribe(OnWorldUpdateEvent, { execution: ExecuteOn.Owner })
  onUpdate(payload: OnWorldUpdateEventPayload): void {
    if (!this._isClient) return;

    // Wait for all coins to be collected, then pause before transitioning
    if (this._waitingForCoins) {
      if (this._coinService.activeCoinCount === 0) {
        this._transitionDelay += payload.deltaTime;
        if (this._transitionDelay >= 1.0) {
          this._finishLevelTransition();
        }
      }
      return;
    }

    if (this._survivalTimer <= 0) return;

    this._survivalTimer -= payload.deltaTime;
    if (this._survivalTimer <= 0) {
      this._advanceLevel();
    }
  }

  // ── Level progression ─────────────────────────────────────────────────────

  private _advanceLevel(): void {
    // Freeze ball in place, activate super vacuum, wait for coins
    this._waitingForCoins = true;
    this._transitionDelay = 0;
    EventService.sendLocally(Events.LevelCleared, {});
    this._coinService.activateSuperVacuum();
    EventService.sendLocally(HUDEvents.ShowMessage, { message: 'Cleared' });
  }

  private _finishLevelTransition(): void {
    this._waitingForCoins = false;
    const nextIndex = (this._currentLevel + 1) % LEVELS.length;
    this._loadLevel(nextIndex);
    EventService.sendLocally(Events.ResetRound, {});
    EventService.sendLocally(HUDEvents.ShowMessage, { message: 'Tap to start' });
  }

  @subscribe(Events.ReleaseBall)
  onReleaseBall(): void {
    EventService.sendLocally(HUDEvents.HideMessage, {});
  }

  @subscribe(OnFocusedInteractionInputStartedEvent)
  onTap(): void {
    if (this._showingTitleScreen) {
      EventService.sendLocally(HUDEvents.HideMessage, {});
      this._loadLevel(0);
    } else if (this._showingHighScores) {
      this._dismissHighScoresAndRestart();
    }
  }

  private _loadLevel(index: number): void {
    this._currentLevel = index;
    this._showingTitleScreen = false;
    this._initLevelState(LEVELS[index]);
    EventService.sendLocally(Events.LoadLevel, { levelIndex: index });
    EventService.sendLocally(HUDEvents.UpdateLives, { lives: this._lives });
  }
}
