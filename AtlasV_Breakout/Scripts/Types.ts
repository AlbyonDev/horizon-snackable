import { Color, LocalEvent, NetworkEvent, property, serializable, Vec3, type Entity } from "meta/worlds";

export type RGB = [r: number, g: number, b: number];

/**
 * Colors keyed by remaining HP + indestructible state.
 * Ex: { 3: [1,0,0], 2: [0.5,0,0], 1: [0.2,0,0], indestructible: [0.5,0.5,0.5] }
 */
export type BrickColorPalette = Partial<Record<number, RGB>> & { indestructible?: RGB };

export interface Rect {
  x: number;   // min x / left edge (world space)
  y: number;   // min y / bottom edge (world space)
  w: number;   // full width
  h: number;   // full height
}

export interface ICollider {
  readonly colliderTag: string;
  getColliderBounds(): Rect;
  onCollision(other: ICollider): void;
}

/**
 * Extended contract for brick-tagged colliders.
 * Implement this on any brick component to participate in explosion chains
 * and other external destruction triggers without instanceof checks.
 */
export interface IBrick extends ICollider {
  triggerDestruction(): void;
}

export enum PowerUpType {
  BigPaddle = 0,
  StickyPaddle = 1,
}

export enum RevealStyle {
  Pop = 0,       // scale bounce (back-out overshoot)
  DropIn = 1,    // fall from above with bounce
  Spin = 2,      // spin in while scaling up
  Stretch = 3,   // stretch horizontally then vertically
}

/**
 * Top-level game flow states. GameManager holds exactly one of these at a time
 * and fires GameStateEvents.GameStateChanged on every transition.
 *
 * Extension pattern — adding a new screen (e.g. LevelSelect):
 *   1. Add a new value here (e.g. `LevelSelect = 'LevelSelect'`).
 *   2. Add a `case GameState.LevelSelect:` in GameManager.onTap().
 *   3. In your new ViewModel, subscribe to GameStateEvents.GameStateChanged
 *      and set Visibility="Collapsed" for every state that isn't yours.
 *      NEVER use Visibility="Hidden" or Opacity="0" for interactive panels —
 *      those still receive tap events and will soft-lock the game.
 */
export enum GameState {
  TitleScreen = 'TitleScreen',
  Playing     = 'Playing',
  GameOver    = 'GameOver',
}

export namespace GameStateEvents {
  export class GameStateChangedPayload {
    readonly prev: GameState = GameState.TitleScreen;
    readonly next: GameState = GameState.TitleScreen;
  }
  export const GameStateChanged = new LocalEvent<GameStateChangedPayload>(
    'EvGameStateChanged',
    GameStateChangedPayload,
  );
}

export namespace Events
{
  export class RestartPayload {}
  export const Restart = new LocalEvent<RestartPayload>('EvRestart', RestartPayload);

  export class ResetRoundPayload {}
  export const ResetRound = new LocalEvent<ResetRoundPayload>('EvResetRound', ResetRoundPayload);

  export class BallLostPayload {}
  export const BallLost = new LocalEvent<BallLostPayload>('EvBallLost', BallLostPayload);

  export class LevelClearedPayload {}
  export const LevelCleared = new LocalEvent<LevelClearedPayload>('EvLevelCleared', LevelClearedPayload);

  export class BrickDestroyedPayload {
    readonly position: Vec3 = Vec3.zero;
    readonly color: Color = Color.white;
  }
  export const BrickDestroyed = new LocalEvent<BrickDestroyedPayload>('EvBrickDestroyed', BrickDestroyedPayload);

  /** Fired by a brick when its death animation is done — pool can recycle the entity. */
  export class BrickRecyclePayload {
    readonly entity: Entity | null = null;
  }
  export const BrickRecycle = new LocalEvent<BrickRecyclePayload>('EvBrickRecycle', BrickRecyclePayload);

  export class PowerUpCollectedPayload {
    readonly powerUpType: PowerUpType = PowerUpType.BigPaddle;
    readonly duration: number = 10;
  }
  export const PowerUpCollected = new LocalEvent<PowerUpCollectedPayload>('EvPowerUpCollected', PowerUpCollectedPayload);

  export class StickyPaddleActivatedPayload {}
  export const StickyPaddleActivated = new LocalEvent<StickyPaddleActivatedPayload>('EvStickyPaddleActivated', StickyPaddleActivatedPayload);

  export class StickyPaddleDeactivatedPayload {}
  export const StickyPaddleDeactivated = new LocalEvent<StickyPaddleDeactivatedPayload>('EvStickyPaddleDeactivated', StickyPaddleDeactivatedPayload);

  export class ReleaseBallPayload {}
  export const ReleaseBall = new LocalEvent<ReleaseBallPayload>('EvReleaseBall', ReleaseBallPayload);

  export class LoadLevelPayload {
    readonly levelIndex: number = 0;
  }
  export const LoadLevel = new LocalEvent<LoadLevelPayload>('EvLoadLevel', LoadLevelPayload);

  export class InitBrickPayload {
    readonly hits: number = 1;
    readonly indestructible: boolean = false;
    readonly colors: BrickColorPalette | undefined = undefined;
    /** Delay in seconds before the brick reveal animation starts. */
    readonly revealDelay: number = 0;
    /** Which reveal animation style to use. */
    readonly revealStyle: RevealStyle = RevealStyle.Pop;
    /** If true, brick enters idle title-screen animation after reveal. */
    readonly titleAnim: boolean = false;
  }
  export const InitBrick = new LocalEvent<InitBrickPayload>('EvInitBrick', InitBrickPayload);

  /** Fired on non-lethal brick hit (for shake/particles). */
  export class BrickHitPayload {
    readonly position: Vec3 = Vec3.zero;
    readonly color: Color = Color.white;
  }
  export const BrickHit = new LocalEvent<BrickHitPayload>('EvBrickHit', BrickHitPayload);

  /** Fired when ball hits the paddle (for squash/sparks). */
  export class PaddleHitPayload {
    readonly position: Vec3 = Vec3.zero;
    readonly ballVelocityX: number = 0;
    readonly ballVelocityY: number = 0;
  }
  export const PaddleHit = new LocalEvent<PaddleHitPayload>('EvPaddleHit', PaddleHitPayload);

  /** Fired when an explosive brick chain starts (for big freeze/shake). */
  export class ExplosionChainPayload {
    readonly position: Vec3 = Vec3.zero;
    readonly chainSize: number = 1;
  }
  export const ExplosionChain = new LocalEvent<ExplosionChainPayload>('EvExplosionChain', ExplosionChainPayload);

  /** Fired when a coin is absorbed by the paddle vacuum. */
  export class CoinCollectedPayload {
    readonly value: number = 1;
  }
  export const CoinCollected = new LocalEvent<CoinCollectedPayload>('EvCoinCollected', CoinCollectedPayload);
}

/**
 * HUD-related events and payloads.
 * Other systems dispatch these events; the GameHUDViewModel subscribes to update the UI.
 */
export namespace HUDEvents {
  export class UpdateScorePayload {
    readonly score: number = 0;
  }
  export const UpdateScore = new LocalEvent<UpdateScorePayload>('EvHUDUpdateScore', UpdateScorePayload);

  export class UpdateLivesPayload {
    readonly lives: number = 3;
  }
  export const UpdateLives = new LocalEvent<UpdateLivesPayload>('EvHUDUpdateLives', UpdateLivesPayload);

  export class ShowMessagePayload {
    readonly message: string = '';
  }
  export const ShowMessage = new LocalEvent<ShowMessagePayload>('EvHUDShowMessage', ShowMessagePayload);

  export class HideMessagePayload {}
  export const HideMessage = new LocalEvent<HideMessagePayload>('EvHUDHideMessage', HideMessagePayload);
}

/**
 * Background animation events and payloads.
 * Any system can dispatch IntensifyBackground to pulse the background color overlay.
 */
export namespace BackgroundEvents {
  export class IntensifyBackgroundPayload {
    /** Intensity of the pulse, 0-1. */
    readonly intensity: number = 0;
    /** Duration of the pulse in seconds. */
    readonly durationSeconds: number = 0.5;
  }
  export const IntensifyBackground = new LocalEvent<IntensifyBackgroundPayload>(
    'EvBackgroundIntensify',
    IntensifyBackgroundPayload,
  );
}

/**
 * Combo HUD events and payloads.
 * Combo = bricks destroyed in a single launch (resets on paddle hit / BallLost).
 * Other systems dispatch these events; the ComboHUDViewModel subscribes to update the combo UI.
 */
export namespace ComboHUDEvents {
  export class IncrementComboPayload {}
  export const IncrementCombo = new LocalEvent<IncrementComboPayload>('EvComboIncrement', IncrementComboPayload);

  export class ResetComboPayload {}
  export const ResetCombo = new LocalEvent<ResetComboPayload>('EvComboReset', ResetComboPayload);
}

/**
 * Heat events and payloads.
 * Heat = total bricks destroyed since last BallLost / Restart (never resets on paddle hit).
 * Consumed by BallPowerService to drive speed scaling and pierce thresholds.
 */
export namespace HeatEvents {
  export class IncrementHeatPayload {}
  export const IncrementHeat = new LocalEvent<IncrementHeatPayload>('EvHeatIncrement', IncrementHeatPayload);

  export class ResetHeatPayload {}
  export const ResetHeat = new LocalEvent<ResetHeatPayload>('EvHeatReset', ResetHeatPayload);
}

/**
 * High Score HUD events and payloads.
 * GameManager dispatches ShowHighScores on game over; HighScoreHUDViewModel subscribes to render.
 */
@serializable()
export class HighScoreEntry {
  @property()
  readonly rank: number = -1;
  @property()
  readonly name: string = '';
  @property()
  readonly score: number = 0;
  @property()
  readonly isCurrentPlayer: boolean = false;
}

export namespace HighScoreHUDEvents {
  export class ShowHighScoresPayload {
    readonly entries: readonly HighScoreEntry[] = [];
  }
  export const ShowHighScores = new LocalEvent<ShowHighScoresPayload>('EvHighScoreShow', ShowHighScoresPayload);

  export class HideHighScoresPayload {}
  export const HideHighScores = new LocalEvent<HideHighScoresPayload>('EvHighScoreHide', HideHighScoresPayload);
}

/**
 * Leaderboard events.
 * GameManager sends LeaderboardSubmitScore (NetworkEvent) on game over.
 * LeaderboardManager listens server-side for submission and client-side for data readiness.
 */
export namespace LeaderboardEvents {
  @serializable()
  export class LeaderboardSubmitScorePayload {
    @property()
    readonly score: number = 0;
  }
  export const LeaderboardSubmitScore = new NetworkEvent<LeaderboardSubmitScorePayload>(
    'EvLeaderboardSubmitScore',
    LeaderboardSubmitScorePayload,
  );

  @serializable()
  export class LeaderboardEntriesFetchedPayload {
    @property()
    readonly entries: readonly HighScoreEntry[] = [];
    @property()
    readonly playerRank: number = -1;
  }
  export const LeaderboardEntriesFetched = new NetworkEvent<LeaderboardEntriesFetchedPayload>(
    'EvLeaderboardEntriesFetched',
    LeaderboardEntriesFetchedPayload,
  );

  export class LeaderboardDisplayRequestPayload {}
  export const LeaderboardDisplayRequest = new LocalEvent<LeaderboardDisplayRequestPayload>(
    'EvLeaderboardDisplayRequest',
    LeaderboardDisplayRequestPayload,
  );
}
