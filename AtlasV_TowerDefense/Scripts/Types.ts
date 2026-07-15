/**
 * Types.ts — Central type registry for the entire project.
 *
 * Contains ALL: enums, interfaces, pipeline contexts, LocalEvents, UiEvents.
 * No imports from sibling files — zero local dependencies.
 * Add new events, interfaces, and enums here at implementation time only.
 */
import { LocalEvent, UiEvent, serializable } from 'meta/worlds';
import type { TemplateAsset } from 'meta/worlds';

// ─── Enums ────────────────────────────────────────────────────────────────────

export enum OverworldNodeState {
  Locked  = 0,
  Open    = 1,
  Beaten  = 2,
}

export enum GamePhase {
  Idle        = 0,
  Build       = 1,
  Wave        = 2,
  WaveClear   = 3,
  GameOver    = 4,
  Victory     = 5,
  Overworld   = 6,
  BiomeSelect = 7,
}

// ─── Interfaces ───────────────────────────────────────────────────────────────

export interface ITowerStats {
  damage: number;
  range: number;
  fireRate: number;
  projectileSpeed: number;
  props: Record<string, unknown>; // splashRadius, debuff, and any future per-system data
}

export type UpgradeApplyFn = (stats: ITowerStats) => ITowerStats;

export interface IUpgradeNode {
  label: string;
  cost: number;
  apply: UpgradeApplyFn;
  next?: readonly [IUpgradeNode, IUpgradeNode];
}

export interface ITowerDef {
  id: string;
  name: string;
  cost: number;
  stats: ITowerStats;

  template: TemplateAsset;
  upgrades: readonly [IUpgradeNode, IUpgradeNode];
}

export interface IEnemyDef {
  id: string;
  name: string;
  hp: number;
  speed: number;      // cells per second
  reward: number;     // gold on death
  color: { r: number; g: number; b: number };
  template: TemplateAsset;
  dodgeChance?: number;  // 0–1 probability to ignore a projectile hit
  regenPerSec?: number;  // HP regenerated per second while alive
  slowImmune?: boolean;  // if true, slow debuffs have no effect
}

export interface IWaveGroup {
  enemyId: string;
  count: number;
}

export interface IWaveDef {
  groups: IWaveGroup[];
}

// ─── Pipeline Contexts ────────────────────────────────────────────────────────

export interface IHitContext {
  originX: number;
  originZ: number;
  primaryTargetId: number;
  targets: number[];
  damage: number;
  props: Record<string, unknown>;
}

// ─── Events ───────────────────────────────────────────────────────────────────

export namespace Events {

  // Game phase
  export class GamePhaseChangedPayload { phase: GamePhase = GamePhase.Idle; }
  export const GamePhaseChanged = new LocalEvent<GamePhaseChangedPayload>('EvGamePhaseChanged', GamePhaseChangedPayload);

  // Wave
  export class WaveStartedPayload { waveIndex: number = 0; totalWaves: number = 0; }
  export const WaveStarted = new LocalEvent<WaveStartedPayload>('EvWaveStarted', WaveStartedPayload);

  export class WaveCompletedPayload { waveIndex: number = 0; }
  export const WaveCompleted = new LocalEvent<WaveCompletedPayload>('EvWaveCompleted', WaveCompletedPayload);

  export class CountdownTickPayload { secondsLeft: number = 0; }
  export const CountdownTick = new LocalEvent<CountdownTickPayload>('EvCountdownTick', CountdownTickPayload);

  // Enemy lifecycle
  export class InitEnemyPayload { defId: string = ''; waveIndex: number = 0; }
  export const InitEnemy = new LocalEvent<InitEnemyPayload>('EvInitEnemy', InitEnemyPayload);

  export class UpdateHealthBarPayload { worldX: number = 0; worldY: number = 0; worldZ: number = 0; hp: number = 0; maxHp: number = 1; }
  export const UpdateHealthBar = new LocalEvent<UpdateHealthBarPayload>('EvUpdateHealthBar', UpdateHealthBarPayload);

  export class ParkHealthBarPayload {}
  export const ParkHealthBar = new LocalEvent<ParkHealthBarPayload>('EvParkHealthBar', ParkHealthBarPayload);

  export class EnemyDiedPayload { enemyId: number = 0; reward: number = 0; worldX: number = 0; worldZ: number = 0; }
  export const EnemyDied = new LocalEvent<EnemyDiedPayload>('EvEnemyDied', EnemyDiedPayload);

  export class ActivateCoinPayload { worldX: number = 0; worldZ: number = 0; amount: number = 0; }
  export const ActivateCoin = new LocalEvent<ActivateCoinPayload>('EvActivateCoin', ActivateCoinPayload);

  export class CoinCollectedPayload { amount: number = 0; }
  export const CoinCollected = new LocalEvent<CoinCollectedPayload>('EvCoinCollected', CoinCollectedPayload);

  // Floating text
  export class ActivateFloatingTextPayload {
    text: string = '';
    worldX: number = 0;
    worldZ: number = 0;
    colorR: number = 0.96; // default gold
    colorG: number = 0.77;
    colorB: number = 0.09;
  }
  export const ActivateFloatingText = new LocalEvent<ActivateFloatingTextPayload>('EvActivateFloatingText', ActivateFloatingTextPayload);

  export class EnemyReachedEndPayload { enemyId: number = 0; }
  export const EnemyReachedEnd = new LocalEvent<EnemyReachedEndPayload>('EvEnemyReachedEnd', EnemyReachedEndPayload);

  // Tower lifecycle
  export class InitTowerPayload { defId: string = ''; col: number = 0; row: number = 0; }
  export const InitTower = new LocalEvent<InitTowerPayload>('EvInitTower', InitTowerPayload);

  // Input
  export class GridTappedPayload { col: number = 0; row: number = 0; }
  export const GridTapped = new LocalEvent<GridTappedPayload>('EvGridTapped', GridTappedPayload);

  // Projectile
  export class InitProjectilePayload {
    targetEnemyId: number = 0;
    damage: number = 0;
    speed: number = 0;
    props: Record<string, unknown> = {};
    originX: number = 0;
    originZ: number = 0;
  }
  export const InitProjectile = new LocalEvent<InitProjectilePayload>('EvInitProjectile', InitProjectilePayload);

  export class TakeDamagePayload { enemyId: number = 0; damage: number = 0; props: Record<string, unknown> = {}; originX: number = 0; originZ: number = 0; }
  export const TakeDamage = new LocalEvent<TakeDamagePayload>('EvTakeDamage', TakeDamagePayload);

  // Resources
  export class ResourceChangedPayload { gold: number = 0; lives: number = 0; }
  export const ResourceChanged = new LocalEvent<ResourceChangedPayload>('EvResourceChanged', ResourceChangedPayload);

  // Tower shop
  export class TowerShopSelectedPayload { towerId: string = ''; }
  export const TowerShopSelected = new LocalEvent<TowerShopSelectedPayload>('EvTowerShopSelected', TowerShopSelectedPayload);

  // Tower selection
  export class TowerSelectedPayload { col: number = 0; row: number = 0; defId: string = ''; tier: number = 0; choices: number[] = []; }
  export const TowerSelected = new LocalEvent<TowerSelectedPayload>('EvTowerSelected', TowerSelectedPayload);

  export class TowerDeselectedPayload {}
  export const TowerDeselected = new LocalEvent<TowerDeselectedPayload>('EvTowerDeselected', TowerDeselectedPayload);

  // Tower actions
  export class TowerSoldPayload { col: number = 0; row: number = 0; refund: number = 0; }
  export const TowerSold = new LocalEvent<TowerSoldPayload>('EvTowerSold', TowerSoldPayload);

  export class TowerUpgradedPayload { col: number = 0; row: number = 0; tier: number = 0; choice: number = 0; }
  export const TowerUpgraded = new LocalEvent<TowerUpgradedPayload>('EvTowerUpgraded', TowerUpgradedPayload);

  // Game end
  export class GameOverPayload { won: boolean = false; }
  export const GameOver = new LocalEvent<GameOverPayload>('EvGameOver', GameOverPayload);

  // Restart game
  export class RestartGamePayload {}
  export const RestartGame = new LocalEvent<RestartGamePayload>('EvRestartGame', RestartGamePayload);

  // Return to title screen after game over / victory
  export class ShowTitleScreenPayload {}
  export const ShowTitleScreen = new LocalEvent<ShowTitleScreenPayload>('EvShowTitleScreen', ShowTitleScreenPayload);

  // Level selected (fired by overworld screen)
  export class LevelSelectedPayload { levelIndex: number = 0; }
  export const LevelSelected = new LocalEvent<LevelSelectedPayload>('EvLevelSelected', LevelSelectedPayload);

  // Level completed (fired when player wins a level, transitions back to overworld)
  export class LevelCompletedPayload { levelIndex: number = 0; }
  export const LevelCompleted = new LocalEvent<LevelCompletedPayload>('EvLevelCompleted', LevelCompletedPayload);

  // Biome changed (fired when a biome is randomly selected for a level)
  export class BiomeChangedPayload { biomeId: string = 'grass'; }
  export const BiomeChanged = new LocalEvent<BiomeChangedPayload>('EvBiomeChanged', BiomeChangedPayload);

  // Start game (fired by title screen)
  export class StartGamePayload {}
  export const StartGame = new LocalEvent<StartGamePayload>('EvStartGame', StartGamePayload);

  // Skip build phase → immediately start wave
  export class SkipBuildPayload {}
  export const SkipBuild = new LocalEvent<SkipBuildPayload>('EvSkipBuild', SkipBuildPayload);

  // Tower spawn bounce (sent to newly placed tower entity)
  export class TowerSpawnedPayload { col: number = 0; row: number = 0; }
  export const TowerSpawned = new LocalEvent<TowerSpawnedPayload>('EvTowerSpawned', TowerSpawnedPayload);

  // Fired once after a tower is successfully placed on the grid
  export class TowerPlacedPayload { defId: string = ''; col: number = 0; row: number = 0; }
  export const TowerPlaced = new LocalEvent<TowerPlacedPayload>('EvTowerPlaced', TowerPlacedPayload);

  // Fired by WaveService to show the FTUE "place your first tower" hint
  export class FtueHintPayload {}
  export const FtueHint = new LocalEvent<FtueHintPayload>('EvFtueHint', FtueHintPayload);

  // Relic choice flow
  export class ShowRelicChoicePayload {}
  export const ShowRelicChoice = new LocalEvent<ShowRelicChoicePayload>('EvShowRelicChoice', ShowRelicChoicePayload);

  export class RelicChosenPayload { relicId: string = ''; }
  export const RelicChosen = new LocalEvent<RelicChosenPayload>('EvRelicChosen', RelicChosenPayload);

}

// ─── UI Events ────────────────────────────────────────────────────────────────

export namespace UiEvents {
  @serializable() export class TowerShopTapPayload      { readonly parameter: string = ''; }
  @serializable() export class SellTowerTapPayload      { readonly parameter: string = ''; }
  @serializable() export class UpgradeTowerTapPayload   { readonly parameter: string = ''; }

  @serializable() export class SkipWaveTapPayload         { readonly parameter: string = ''; }
  @serializable() export class OverworldLevelTapPayload   { readonly parameter: string = ''; }

  export const towerShopTap    = new UiEvent('TowerShopTapEvent',                             TowerShopTapPayload);
  export const sellTowerTap    = new UiEvent('TowerUpgradeMenuViewModel-onSellTowerTap',    SellTowerTapPayload);
  export const upgradeTowerTap = new UiEvent('TowerUpgradeMenuViewModel-onUpgradeTowerTap', UpgradeTowerTapPayload);
  export const skipWaveTap     = new UiEvent('GameHudViewModel-onSkipWaveTap',               SkipWaveTapPayload);
  export const abandonLevelTap = new UiEvent('GameHudViewModel-onAbandonLevelTap',           SkipWaveTapPayload);
  export const confirmAbandonYesTap = new UiEvent('GameHudViewModel-onConfirmAbandonYes',   SkipWaveTapPayload);
  export const confirmAbandonNoTap  = new UiEvent('GameHudViewModel-onConfirmAbandonNo',    SkipWaveTapPayload);
  export const overworldLevelTap = new UiEvent('OverworldViewModel-onLevelTap',              OverworldLevelTapPayload);
  export const nextWaveTap       = new UiEvent('GameHudViewModel-onNextWaveTap',             SkipWaveTapPayload);

  @serializable() export class BiomeSelectTapPayload     { readonly parameter: string = ''; }
  export const biomeSelectTap  = new UiEvent('BiomeSelectViewModel-onBiomeTap',             BiomeSelectTapPayload);
}
