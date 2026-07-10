/**
 * ResourceService — Manages player economy (gold and lives).
 *
 * earn(n): adds gold, fires ResourceChanged. By default counts toward totalEarned;
 *   pass countAsEarned=false for sell refunds (refunds are not income).
 * spend(n): deducts gold if affordable, fires ResourceChanged. Returns false if insufficient.
 * loseLife(): decrements lives, fires ResourceChanged.
 * reset(): restores START_GOLD and START_LIVES, fires ResourceChanged.
 * canAfford(n): read-only check used by UI to grey out unaffordable options.
 * totalEarned: cumulative gold gained across the run (starting gold + bounty + wave bonus
 *   + income), excluding sell refunds. Read by the Game Over screen.
 * Resets on RestartGame.
 */
import { Service, EventService } from 'meta/worlds';
import { service, subscribe } from 'meta/worlds';
import { OnServiceReadyEvent } from 'meta/worlds';
import { Events } from '../Types';
import { START_GOLD, START_LIVES } from '../Constants';

@service()
export class ResourceService extends Service {
  private _gold: number = 0;
  private _lives: number = 0;
  private _totalEarned: number = 0;

  @subscribe(OnServiceReadyEvent)
  onReady(): void {
    this._gold = START_GOLD;
    this._lives = START_LIVES;
    this._totalEarned = START_GOLD;
  }

  get gold(): number { return this._gold; }
  get lives(): number { return this._lives; }
  get totalEarned(): number { return this._totalEarned; }

  canAfford(amount: number): boolean { return this._gold >= amount; }

  spend(amount: number): boolean {
    if (!this.canAfford(amount)) return false;
    this._gold -= amount;
    this._notify();
    return true;
  }

  earn(amount: number, countAsEarned: boolean = true): void {
    this._gold += amount;
    if (countAsEarned) this._totalEarned += amount;
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

  reset(): void {
    this._gold = START_GOLD;
    this._lives = START_LIVES;
    this._totalEarned = START_GOLD;
    this._notify();
  }

  private _notify(): void {
    const p = new Events.ResourceChangedPayload();
    p.gold = this._gold;
    p.lives = this._lives;
    EventService.sendLocally(Events.ResourceChanged, p);
  }
}
