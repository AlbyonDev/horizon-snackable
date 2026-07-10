/**
 * HealthBarService — Pre-spawned pool of health bar entities that follow enemies.
 *
 * prewarm(): spawns HEALTHBAR_POOL_SIZE entities at park position during game init.
 * Each health bar entity has a HealthBarController that handles positioning and fill.
 * Bars are assigned to enemies via UpdateHealthBar event (targeted to the bar entity),
 * and returned to the pool via ParkHealthBar event on enemy death.
 * Pool size tuned in Constants.ts (HEALTHBAR_POOL_SIZE).
 */
import { Service, WorldService, NetworkMode, Vec3, Quaternion, NetworkingService, EventService } from 'meta/worlds';
import { service, subscribe } from 'meta/worlds';
import { OnWorldUpdateEvent } from 'meta/worlds';
import type { Entity } from 'meta/worlds';
import { ExecuteOn } from 'meta/worlds';
import { Assets } from '../Assets';
import { HEALTHBAR_POOL_SIZE, HEALTHBAR_OFFSET_X, HEALTHBAR_OFFSET_Y, HEALTHBAR_WIDTH, HEALTHBAR_HEIGHT, HEALTHBAR_DEPTH, PROJECTILE_POOL_Y, GROUND_Y } from '../Constants';
import { EnemyService } from './EnemyService';
import { Events } from '../Types';

const PARK = new Vec3(0, PROJECTILE_POOL_Y, 0);

@service()
export class HealthBarService extends Service {
  private _free:   Entity[] = [];
  private _active: Map<number, Entity> = new Map(); // enemyId → bar entity

  async prewarm(): Promise<void> {
    if (NetworkingService.get().isServerContext()) return;
    const entities = await Promise.all(
      Array.from({ length: HEALTHBAR_POOL_SIZE }, () =>
        WorldService.get().spawnTemplate({
          templateAsset: Assets.HealthBar,
          position: PARK,
          rotation: Quaternion.identity,
          scale: new Vec3(HEALTHBAR_HEIGHT, HEALTHBAR_DEPTH, HEALTHBAR_WIDTH),
          networkMode: NetworkMode.LocalOnly,
        }).catch(() => null),
      ),
    );
    for (const entity of entities) { if (entity) this._free.push(entity); }
  }

  @subscribe(Events.RestartGame)
  onRestart(_p: Events.RestartGamePayload): void {
    for (const bar of this._active.values()) {
      EventService.sendLocally(Events.ParkHealthBar, new Events.ParkHealthBarPayload(), { eventTarget: bar });
      this._free.push(bar);
    }
    this._active.clear();
  }

  @subscribe(Events.EnemyDied)
  onEnemyDied(p: Events.EnemyDiedPayload): void {
    this._release(p.enemyId);
  }

  @subscribe(Events.EnemyReachedEnd)
  onEnemyReachedEnd(p: Events.EnemyReachedEndPayload): void {
    this._release(p.enemyId);
  }

  @subscribe(OnWorldUpdateEvent, { execution: ExecuteOn.Owner })
  onUpdate(): void {
    const registry = EnemyService.get();

    for (const [id] of registry.getAll()) {
      if (!this._active.has(id)) {
        const bar = this._free.pop();
        if (bar) this._active.set(id, bar);
      }
    }

    for (const [id, bar] of this._active) {
      const rec = registry.get(id);
      if (!rec) continue;
      const p = new Events.UpdateHealthBarPayload();
      p.worldX = rec.worldX + HEALTHBAR_OFFSET_X;
      p.worldY = GROUND_Y + 1.5 + 0.02 + HEALTHBAR_OFFSET_Y;
      p.worldZ = rec.worldZ;
      p.hp     = rec.hp;
      p.maxHp  = rec.maxHp;
      EventService.sendLocally(Events.UpdateHealthBar, p, { eventTarget: bar });
    }
  }

  private _release(enemyId: number): void {
    const bar = this._active.get(enemyId);
    if (!bar) return;
    this._active.delete(enemyId);
    EventService.sendLocally(Events.ParkHealthBar, new Events.ParkHealthBarPayload(), { eventTarget: bar });
    this._free.push(bar);
  }
}
