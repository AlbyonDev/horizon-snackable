/**
 * FloatingTextService — Pool manager for floating text visual effects.
 *
 * prewarm(): spawns FLOATING_TEXT_POOL_SIZE entities at park position during game init.
 * show(x, z, value): displays "+N" gold text in gold color at world position.
 * showCrit(x, z, multiplier): displays "xN" crit text in red at world position.
 * Subscribes to EnemyDied → show gold reward above the death position.
 * Subscribes to TakeDamage → if props.critHit present, show crit multiplier above enemy.
 * Uses round-robin pool; animation and parking handled by FloatingTextController.
 */
import { Service, WorldService, NetworkMode, Vec3, Quaternion, NetworkingService, EventService } from 'meta/worlds';
import { service, subscribe } from 'meta/worlds';
import type { Entity } from 'meta/worlds';
import { ExecuteOn } from 'meta/worlds';
import { Assets } from '../Assets';
import { Events } from '../Types';
import { FLOATING_TEXT_POOL_SIZE, FLOATING_TEXT_PARK_Y } from '../Constants';

const PARK_POS = new Vec3(0, FLOATING_TEXT_PARK_Y, 0);

@service()
export class FloatingTextService extends Service {
  private _pool: Entity[] = [];
  private _poolIndex: number = 0;

  async prewarm(): Promise<void> {
    if (NetworkingService.get().isServerContext()) return;
    const entities = await Promise.all(
      Array.from({ length: FLOATING_TEXT_POOL_SIZE }, () =>
        WorldService.get().spawnTemplate({
          templateAsset: Assets.FloatingText,
          position: PARK_POS,
          scale: Vec3.one,
          networkMode: NetworkMode.LocalOnly,
        }).catch(() => null),
      ),
    );
    for (const entity of entities) { if (entity) this._pool.push(entity); }
  }

  showCrit(worldX: number, worldZ: number, multiplier: number): void {
    if (this._pool.length === 0) return;
    const entity = this._pool[this._poolIndex];
    this._poolIndex = (this._poolIndex + 1) % this._pool.length;
    const p = new Events.ActivateFloatingTextPayload();
    p.text   = `x${multiplier}`;
    p.worldX = worldX;
    p.worldZ = worldZ;
    p.colorR = 1.0;
    p.colorG = 0.15;
    p.colorB = 0.15;
    EventService.sendLocally(Events.ActivateFloatingText, p, { eventTarget: entity });
  }

  showMiss(worldX: number, worldZ: number): void {
    if (this._pool.length === 0) return;
    const entity = this._pool[this._poolIndex];
    this._poolIndex = (this._poolIndex + 1) % this._pool.length;
    const p = new Events.ActivateFloatingTextPayload();
    p.text   = 'Miss';
    p.worldX = worldX;
    p.worldZ = worldZ;
    p.colorR = 0.7;
    p.colorG = 0.75;
    p.colorB = 0.8;
    EventService.sendLocally(Events.ActivateFloatingText, p, { eventTarget: entity });
  }

  show(worldX: number, worldZ: number, value: number): void {
    if (this._pool.length === 0) return;
    const entity = this._pool[this._poolIndex];
    this._poolIndex = (this._poolIndex + 1) % this._pool.length;
    const p = new Events.ActivateFloatingTextPayload();
    p.text   = `+${value}`;
    p.worldX = worldX;
    p.worldZ = worldZ;
    EventService.sendLocally(Events.ActivateFloatingText, p, { eventTarget: entity });
  }

  @subscribe(Events.TakeDamage, { execution: ExecuteOn.Owner })
  onTakeDamage(p: Events.TakeDamagePayload): void {
    if (!p.props['isCrit']) return;
    const multiplier = p.props['critMultiplier'] as number | undefined;
    if (multiplier === undefined) return;
    this.showCrit(p.originX, p.originZ, multiplier);
  }

  @subscribe(Events.EnemyDied, { execution: ExecuteOn.Owner })
  onEnemyDied(p: Events.EnemyDiedPayload): void {
    if (NetworkingService.get().isServerContext()) return;
    this.show(p.worldX, p.worldZ, p.reward);
  }
}

