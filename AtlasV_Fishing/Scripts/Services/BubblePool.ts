import {
  EventService,
  NetworkMode,
  OnServiceReadyEvent,
  Quaternion,
  Service,
  TransformComponent,
  Vec3,
  WorldService,
  service,
  subscribe,
  type Entity,
} from 'meta/worlds';

import { Assets } from '../Assets';
import { FISH_LEFT, FISH_RIGHT, WATER_SURFACE_Y, BUBBLE_SPAWN_MIN_Y, BUBBLE_POOL_SIZE, POOL_PARK_Y } from '../Constants';
import { Events } from '../Types';

// =============================================================================
//  BubblePool
//
//  Pre-instantiates POOL_SIZE bubble entities at service start. Keeps inactive
//  bubbles disabled. FishDataService calls acquire(x, y) to activate one,
//  BubbleController calls release(entity) when it reaches the surface.
// =============================================================================

@service()
export class BubblePool extends Service {

  private _free: Entity[] = [];
  private _ready = false;
  private _poolPosition = new Vec3(0, POOL_PARK_Y, 0);
  private _index : number = 0;

  async prewarm(): Promise<void> {
    for (let i = 0; i < BUBBLE_POOL_SIZE; i++) {
      const entity = await WorldService.get().spawnTemplate({
        templateAsset: Assets.BubbleTemplate,
        position:      this._poolPosition,
        networkMode:   NetworkMode.LocalOnly,
      });
      this._free.push(entity);
    }
    this._ready = true;
  }

  /** Activate a pooled bubble at world position (x, y). No-op if pool is empty. */
  acquire(x: number, y: number): void {
    if (this._free.length === 0) return;
    const entity = this._free[this._index];
    this._index = (this._index + 1) % this._free.length;
    EventService.sendLocally(Events.InitBubble, { x, y }, { eventTarget: entity });
  }

  /** Return a bubble to the pool and disable it. Called by BubbleController. */
  release(entity: Entity): void {
    const tc = entity.getComponent(TransformComponent);
    if (tc) tc.worldPosition = this._poolPosition;
  }
}
