/**
 * CoinService — Pool manager for coin VFX entities.
 *
 * prewarm(): spawns COIN_POOL_SIZE entities at park position during game init.
 * On EnemyDied: spawns 1–4 coins proportional to reward, round-robin from pool.
 * release(): called by CoinController when collect animation finishes.
 * Pool uses a simple round-robin — active coins are never forcibly recalled,
 * so at high enemy density old coins just get recycled (no visual glitch since
 * they're already animating away).
 */
import { Service, WorldService, NetworkMode, Vec3, Quaternion, NetworkingService, EventService } from 'meta/worlds';
import { service, subscribe } from 'meta/worlds';
import type { Entity } from 'meta/worlds';
import { Assets } from '../Assets';
import { Events } from '../Types';

const COIN_POOL_SIZE = 75;
const COINS_MIN = 3; // minimum coins regardless of reward
const COINS_PER_REWARD_UNIT = 3; // 1 extra coin per N gold reward
const MAX_COINS_PER_KILL = 8;

export const COIN_PARK_POSITION = new Vec3(0, -200, 0);

@service()
export class CoinService extends Service {
  private _pool: Entity[] = [];
  private _index: number = 0;

  async prewarm(): Promise<void> {
    if (NetworkingService.get().isServerContext()) return;
    const entities = await Promise.all(
      Array.from({ length: COIN_POOL_SIZE }, () =>
        WorldService.get().spawnTemplate({
          templateAsset: Assets.Coin,
          position: COIN_PARK_POSITION,
          rotation: Quaternion.identity,
          scale: new Vec3(0.1, 0.1, 0.1),
          networkMode: NetworkMode.LocalOnly,
        }).catch(() => null),
      ),
    );
    for (const e of entities) { if (e) this._pool.push(e); }
  }

  release(_entity: Entity): void {
    // Entity is already parked by CoinController — nothing else needed
  }

  @subscribe(Events.EnemyDied)
  onEnemyDied(p: Events.EnemyDiedPayload): void {
if (this._pool.length === 0) return;
    const count = Math.min(Math.max(COINS_MIN, Math.floor(p.reward / COINS_PER_REWARD_UNIT)), MAX_COINS_PER_KILL);
    const amountPerCoin = Math.floor(p.reward / count);
    const remainder = p.reward - amountPerCoin * count;
    for (let i = 0; i < count; i++) {
      const entity = this._pool[this._index];
      this._index = (this._index + 1) % this._pool.length;

      const payload = new Events.ActivateCoinPayload();
      payload.worldX = p.worldX;
      payload.worldZ = p.worldZ;
      payload.amount = amountPerCoin + (i === 0 ? remainder : 0); // first coin carries remainder
      EventService.sendLocally(Events.ActivateCoin, payload, { eventTarget: entity });
    }
  }

  @subscribe(Events.RestartGame)
  onRestart(_p: Events.RestartGamePayload): void {
    this._index = 0;
  }

  @subscribe(Events.LevelSelected)
  onLevelSelected(_p: Events.LevelSelectedPayload): void {
    this._index = 0;
  }
}
