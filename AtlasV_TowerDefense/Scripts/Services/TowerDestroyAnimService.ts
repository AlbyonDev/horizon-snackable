/**
 * TowerDestroyAnimService — Animated tower destruction for boss modifier waves.
 *
 * When a boss modifier triggers tower destruction (every 5th wave), this service
 * orchestrates a visual sequence instead of instantly removing the tower:
 * 1. Acquires a projectile from the pool, tints it red/dark, scales it up
 * 2. Flies it from the side (off-screen on X axis) toward the targeted tower over ~1s
 * 3. On arrival: shakes the tower entity, then scales it to 0 over ~0.4s
 * 4. After scale-down completes, destroys the entity and unregisters from TowerService
 *
 * Component Attachment: Scene Entity (force-instantiated alongside other services)
 * Component Networking: Local (single-player tower defense)
 * Component Ownership: Not Networked
 */
import { Service, TransformComponent, Vec3, Color, ColorComponent } from 'meta/worlds';
import type { Entity } from 'meta/worlds';
import { service, subscribe } from 'meta/worlds';
import { OnWorldUpdateEvent } from 'meta/worlds';
import type { OnWorldUpdateEventPayload } from 'meta/worlds';
import { Events } from '../Types';
import { ProjectilePool, POOL_PARK_POSITION } from './ProjectilePool';
import { TowerService } from './TowerService';
import { CameraShakeService } from './CameraShakeService';
import {
  TOWER_DESTROY_FLIGHT_DURATION,
  TOWER_DESTROY_SHAKE_DURATION,
  TOWER_DESTROY_SCALE_DURATION,
  TOWER_DESTROY_SPAWN_OFFSET_X,
  TOWER_DESTROY_PROJECTILE_SCALE,
  GROUND_Y,
} from '../Constants';

const enum AnimPhase {
  Flight = 0,
  Shake = 1,
  ScaleDown = 2,
  Done = 3,
}

interface ITowerDestroyAnim {
  phase: AnimPhase;
  elapsed: number;

  // Projectile
  projectileEntity: Entity | null;
  startPos: Vec3;
  targetPos: Vec3;

  // Tower
  towerEntity: Entity;
  col: number;
  row: number;
  towerBaseScale: Vec3;

  // Shake state
  shakeOriginalPos: Vec3;
}

@service()
export class TowerDestroyAnimService extends Service {
  private _anims: ITowerDestroyAnim[] = [];

  /**
   * Begin the animated destruction of a tower.
   * Call this instead of immediately destroying the entity.
   */
  beginDestroy(towerEntity: Entity, col: number, row: number): void {
    const towerTransform = towerEntity.getComponent(TransformComponent);
    if (!towerTransform) {
      // Fallback: just destroy immediately
      towerEntity.destroy();
      TowerService.get().removeTowerAt(col, row);
      return;
    }

    const targetPos = towerTransform.worldPosition;
    const startPos = new Vec3(targetPos.x + TOWER_DESTROY_SPAWN_OFFSET_X, GROUND_Y, targetPos.z);

    // Acquire a projectile from the pool for the "meteor" visual
    const projectileEntity = ProjectilePool.get().acquire();
    if (projectileEntity) {
      const pt = projectileEntity.getComponent(TransformComponent);
      if (pt) {
        pt.worldPosition = startPos;
        pt.localScale = new Vec3(TOWER_DESTROY_PROJECTILE_SCALE, TOWER_DESTROY_PROJECTILE_SCALE, TOWER_DESTROY_PROJECTILE_SCALE);
      }
      // Tint it earthy grey/brown to look like a rock
      const cc = projectileEntity.getComponent(ColorComponent);
      if (cc) cc.color = new Color(0.4, 0.3, 0.2, 1);
      for (const child of projectileEntity.getChildrenWithComponent(ColorComponent)) {
        const c = child.getComponent(ColorComponent);
        if (c) c.color = new Color(0.4, 0.3, 0.2, 1);
      }
    }

    const anim: ITowerDestroyAnim = {
      phase: AnimPhase.Flight,
      elapsed: 0,
      projectileEntity,
      startPos,
      targetPos,
      towerEntity,
      col,
      row,
      towerBaseScale: towerTransform.localScale,
      shakeOriginalPos: targetPos,
    };

    this._anims.push(anim);
    console.log(`[TowerDestroyAnimService] Starting destruction anim for tower at col=${col}, row=${row}`);
  }

  @subscribe(OnWorldUpdateEvent)
  onUpdate(payload: OnWorldUpdateEventPayload): void {
    const dt = payload.deltaTime;

    for (let i = this._anims.length - 1; i >= 0; i--) {
      const anim = this._anims[i];
      anim.elapsed += dt;

      switch (anim.phase) {
        case AnimPhase.Flight:
          this._tickFlight(anim);
          break;
        case AnimPhase.Shake:
          this._tickShake(anim);
          break;
        case AnimPhase.ScaleDown:
          this._tickScaleDown(anim);
          break;
        case AnimPhase.Done:
          this._finalize(anim);
          this._anims.splice(i, 1);
          break;
      }
    }
  }

  private _tickFlight(anim: ITowerDestroyAnim): void {
    const t = Math.min(anim.elapsed / TOWER_DESTROY_FLIGHT_DURATION, 1);

    if (anim.projectileEntity) {
      const pt = anim.projectileEntity.getComponent(TransformComponent);
      if (pt) {
        // Lerp horizontally from side spawn to target with a slight upward arc
        const arcHeight = 1.5;
        const arcY = arcHeight * 4 * t * (1 - t); // parabolic arc above ground
        const pos = Vec3.lerp(anim.startPos, anim.targetPos, t);
        pt.worldPosition = new Vec3(pos.x, pos.y + arcY, pos.z);
      }
    }

    if (t >= 1) {
      // Projectile arrived — return it to pool
      if (anim.projectileEntity) {
        const pt = anim.projectileEntity.getComponent(TransformComponent);
        if (pt) pt.worldPosition = POOL_PARK_POSITION;
        ProjectilePool.get().release(anim.projectileEntity);
        anim.projectileEntity = null;
      }

      // Camera shake on impact
      CameraShakeService.get().shake(0.2, 0.3);

      // Transition to shake phase
      anim.phase = AnimPhase.Shake;
      anim.elapsed = 0;
      const towerTransform = anim.towerEntity.getComponent(TransformComponent);
      if (towerTransform) {
        anim.shakeOriginalPos = towerTransform.worldPosition;
      }
    }
  }

  private _tickShake(anim: ITowerDestroyAnim): void {
    const t = Math.min(anim.elapsed / TOWER_DESTROY_SHAKE_DURATION, 1);
    const towerTransform = anim.towerEntity.getComponent(TransformComponent);

    if (towerTransform) {
      // Rapid random offset that decays over time
      const intensity = 0.15 * (1 - t);
      const offsetX = (Math.random() * 2 - 1) * intensity;
      const offsetZ = (Math.random() * 2 - 1) * intensity;
      towerTransform.worldPosition = new Vec3(
        anim.shakeOriginalPos.x + offsetX,
        anim.shakeOriginalPos.y,
        anim.shakeOriginalPos.z + offsetZ,
      );
    }

    if (t >= 1) {
      // Reset position before scale-down
      if (towerTransform) {
        towerTransform.worldPosition = anim.shakeOriginalPos;
      }
      anim.phase = AnimPhase.ScaleDown;
      anim.elapsed = 0;
    }
  }

  private _tickScaleDown(anim: ITowerDestroyAnim): void {
    const t = Math.min(anim.elapsed / TOWER_DESTROY_SCALE_DURATION, 1);
    const towerTransform = anim.towerEntity.getComponent(TransformComponent);

    if (towerTransform) {
      // Ease-in (accelerate toward zero) for a "sucked in" feel
      const scale = (1 - t * t);
      towerTransform.localScale = anim.towerBaseScale.mul(scale);
    }

    if (t >= 1) {
      anim.phase = AnimPhase.Done;
    }
  }

  private _finalize(anim: ITowerDestroyAnim): void {
    console.log(`[TowerDestroyAnimService] Finalized destruction at col=${anim.col}, row=${anim.row}`);
    anim.towerEntity.destroy();
    TowerService.get().removeTowerAt(anim.col, anim.row);
  }

  @subscribe(Events.RestartGame)
  onRestart(_p: Events.RestartGamePayload): void {
    // Clean up any in-progress animations
    for (const anim of this._anims) {
      if (anim.projectileEntity) {
        const pt = anim.projectileEntity.getComponent(TransformComponent);
        if (pt) pt.worldPosition = POOL_PARK_POSITION;
        ProjectilePool.get().release(anim.projectileEntity);
      }
      // Tower entity cleanup handled by TowerService restart
    }
    this._anims = [];
  }
}
