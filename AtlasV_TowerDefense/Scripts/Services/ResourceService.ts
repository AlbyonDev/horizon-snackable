/**
 * ResourceService — Manages player economy (gold and lives).
 *
 * earn(n): adds gold, fires ResourceChanged.
 * spend(n): deducts gold if affordable, fires ResourceChanged. Returns false if insufficient.
 * loseLife(): decrements lives, fires ResourceChanged.
 * reset(): restores START_GOLD and START_LIVES, fires ResourceChanged.
 * canAfford(n): read-only check used by UI to grey out unaffordable options.
 * Resets on RestartGame.
 */
import { Service, EventService } from 'meta/worlds';
import { service, subscribe } from 'meta/worlds';
import { OnServiceReadyEvent } from 'meta/worlds';
import { Events } from '../Types';
import { START_GOLD, START_LIVES } from '../Constants';
import { LevelGeneratorService } from './LevelGeneratorService';

@service()
export class ResourceService extends Service {
  private _gold: number = 0;
  private _lives: number = 0;
  private _startGold: number = START_GOLD;
  private _startLives: number = START_LIVES;

  @subscribe(OnServiceReadyEvent)
  onReady(): void {
    this._gold = START_GOLD;
    this._lives = START_LIVES;
  }

  get gold(): number { return this._gold; }
  get lives(): number { return this._lives; }

  canAfford(amount: number): boolean { return this._gold >= amount; }

  spend(amount: number): boolean {
    if (!this.canAfford(amount)) return false;
    this._gold -= amount;
    this._notify();
    return true;
  }

  earn(amount: number): void {
    this._gold += amount;
    this._notify();
  }

  loseLife(): void {
    this._lives = Math.max(0, this._lives - 1);
    this._notify();
  }

  @subscribe(Events.CoinCollected)
  onCoinCollected(p: Events.CoinCollectedPayload): void {
    this.earn(p.amount);
  }

  @subscribe(Events.LevelSelected)
  onLevelSelected(p: Events.LevelSelectedPayload): void {
    const levelDef = LevelGeneratorService.get().getLevelDef(p.levelIndex);
    this._startGold = levelDef.startGold;
    this._startLives = levelDef.startLives;
  }

  reset(): void {
    this._gold = this._startGold;
    this._lives = this._startLives;
    this._notify();
  }

  private _notify(): void {
    const p = new Events.ResourceChangedPayload();
    p.gold = this._gold;
    p.lives = this._lives;
    EventService.sendLocally(Events.ResourceChanged, p);
  }
}
