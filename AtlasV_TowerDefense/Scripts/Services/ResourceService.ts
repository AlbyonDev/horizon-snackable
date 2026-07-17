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
import { RelicService } from './RelicService';

@service()
export class ResourceService extends Service {
  private _gold: number = 0;
  private _lives: number = 0;
  private _startGold: number = START_GOLD;
  private _startLives: number = START_LIVES;
  private _goldMalus: number = 0;
  private _goldBonus: number = 0;

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

  /** Apply a gold malus that will be deducted at the start of the next level. */
  applyMalus(amount: number): void {
    this._goldMalus += amount;
    console.log(`[ResourceService] Gold malus set: -${this._goldMalus} on next level`);
  }

  /** Apply a gold bonus that will be added at the start of the next level. */
  applyBonus(amount: number): void {
    this._goldBonus += amount;
    console.log(`[ResourceService] Gold bonus set: +${this._goldBonus} on next level`);
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
    const relics = RelicService.get();
    this._gold = Math.floor(this._startGold * relics.getGoldMultiplier());
    this._lives = this._startLives + relics.getBonusLives();

    // Apply gold malus from minigame (if any)
    if (this._goldMalus > 0) {
      console.log(`[ResourceService] Applying gold malus: -${this._goldMalus}`);
      this._gold = Math.max(0, this._gold - this._goldMalus);
      this._goldMalus = 0;
    }

    // Apply gold bonus from minigame (if any)
    if (this._goldBonus > 0) {
      console.log(`[ResourceService] Applying gold bonus: +${this._goldBonus}`);
      this._gold += this._goldBonus;
      this._goldBonus = 0;
    }

    this._notify();
  }

  private _notify(): void {
    const p = new Events.ResourceChangedPayload();
    p.gold = this._gold;
    p.lives = this._lives;
    EventService.sendLocally(Events.ResourceChanged, p);
  }
}
