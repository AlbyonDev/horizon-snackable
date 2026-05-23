/**
 * DustParticleComponent — Spawns a burst of small cube "dust" particles
 * at the world position where the player taps.
 *
 * Component Attachment: Scene Entity (dedicated DustParticles entity in space.hstf)
 * Component Networking: Local (client-only visual effect)
 * Component Ownership: Not Networked
 *
 * Listens to OnFocusedInteractionInputStartedEvent, intersects the ray with
 * the Y=0 ground plane, spawns pooled cube entities, and animates them
 * (scale up → scatter outward → scale down → recycle).
 */
import {
  Component,
  component,
  subscribe,
  property,
  OnEntityStartEvent,
  OnWorldUpdateEvent,
  ExecuteOn,
  NetworkingService,
  NetworkMode,
  WorldService,
  TransformComponent,
  OnFocusedInteractionInputStartedEvent,
  OnFocusedInteractionInputEventPayload,
  Vec3,
  Quaternion,
  TemplateAsset,
} from 'meta/worlds';
import type { Entity, Maybe } from 'meta/worlds';
import type { OnWorldUpdateEventPayload } from 'meta/worlds';

/** Maximum simultaneous particles in the pool */
const POOL_SIZE = 24;
/** Particles per tap burst */
const BURST_COUNT = 6;
/** Total lifetime of one particle burst in seconds */
const PARTICLE_LIFETIME = 0.6;
/** Max outward scatter radius */
const SCATTER_RADIUS = 0.3;
/** Peak scale during pop-in */
const PEAK_SCALE = 0.15;

interface ActiveParticle {
  entity: Entity;
  elapsed: number;
  startPos: Vec3;
  scatterDir: Vec3;
}

@component()
export class DustParticleComponent extends Component {
  @property()
  dustTemplate: Maybe<TemplateAsset> = null;

  private pool: Entity[] = [];
  private poolReady = false;
  private activeParticles: ActiveParticle[] = [];
  private postHotReloadFrame = false;

  @subscribe(OnEntityStartEvent, { execution: ExecuteOn.Everywhere })
  async onStart(): Promise<void> {
    // Client-only effect
    if (!NetworkingService.get().isPlayerContext()) return;

    if (!this.dustTemplate) {
      console.error('[DustParticleComponent] dustTemplate not assigned');
      return;
    }

    // Pre-allocate pool
    console.log('[DustParticleComponent] Initializing particle pool...');
    for (let i = 0; i < POOL_SIZE; i++) {
      const e = await WorldService.get().spawnTemplate({
        templateAsset: this.dustTemplate,
        networkMode: NetworkMode.LocalOnly,
        position: new Vec3(0, -100, 0), // hide off-screen
        rotation: Quaternion.identity,
      });
      this.pool.push(e);
    }
    this.poolReady = true;
    console.log('[DustParticleComponent] Pool ready with ' + this.pool.length + ' particles');
  }

  @subscribe(OnFocusedInteractionInputStartedEvent, { execution: ExecuteOn.Everywhere })
  onTouchStart(payload: OnFocusedInteractionInputEventPayload): void {
    if (!NetworkingService.get().isPlayerContext()) return;
    if (!this.poolReady) return;

    // Ray-plane intersection: find where the ray hits Y=0
    const o = payload.worldRayOrigin;
    const d = payload.worldRayDirection;

    // Avoid division by zero (ray parallel to ground)
    if (Math.abs(d.y) < 0.001) return;

    const t = -o.y / d.y;
    if (t < 0) return; // plane is behind camera

    const worldPos = new Vec3(o.x + d.x * t, 0, o.z + d.z * t);

    console.log('[DustParticleComponent] Tap at world: ' + worldPos.x.toFixed(2) + ', ' + worldPos.z.toFixed(2));

    // Spawn a burst of particles
    this.spawnBurst(worldPos);
  }

  private spawnBurst(center: Vec3): void {
    for (let i = 0; i < BURST_COUNT; i++) {
      const entity = this.getFromPool();
      if (!entity) break; // pool exhausted

      // Random scatter direction on XZ plane
      const angle = Math.random() * Math.PI * 2;
      const scatterDir = new Vec3(Math.cos(angle), 0, Math.sin(angle));

      const transform = entity.getComponent(TransformComponent);
      if (transform) {
        transform.worldPosition = center;
        transform.localScale = new Vec3(0.01, 0.01, 0.01); // start tiny
        // Random slight rotation for variety
        transform.localRotation = Quaternion.fromEuler(
          new Vec3(Math.random() * 360, Math.random() * 360, Math.random() * 360)
        );
      }


      this.activeParticles.push({
        entity,
        elapsed: 0,
        startPos: center,
        scatterDir,
      });
    }
  }

  @subscribe(OnWorldUpdateEvent, { execution: ExecuteOn.Everywhere })
  onUpdate(payload: OnWorldUpdateEventPayload): void {
    if (!NetworkingService.get().isPlayerContext()) return;

    // Skip the first frame after hot reload to avoid teleportation
    if (this.postHotReloadFrame) {
      this.postHotReloadFrame = false;
      return;
    }

    const dt = payload.deltaTime;

    for (let i = this.activeParticles.length - 1; i >= 0; i--) {
      const p = this.activeParticles[i];
      p.elapsed += dt;

      const progress = p.elapsed / PARTICLE_LIFETIME;

      if (progress >= 1.0) {
        // Recycle particle
        this.pool.push(p.entity);
        this.activeParticles.splice(i, 1);
        continue;
      }

      // Animation: scale up quickly then shrink, scatter outward
      const transform = p.entity.getComponent(TransformComponent);
      if (!transform) continue;

      // Scale: quick pop-in (0→peak in first 30%), then shrink to 0
      let scale: number;
      if (progress < 0.3) {
        scale = (progress / 0.3) * PEAK_SCALE;
      } else {
        scale = PEAK_SCALE * (1.0 - (progress - 0.3) / 0.7);
      }
      transform.localScale = new Vec3(scale, scale, scale);

      // Position: scatter outward over time with slight upward drift
      const scatterDist = progress * SCATTER_RADIUS;
      const yOffset = progress * 0.15; // slight upward drift
      transform.worldPosition = new Vec3(
        p.startPos.x + p.scatterDir.x * scatterDist,
        p.startPos.y + yOffset,
        p.startPos.z + p.scatterDir.z * scatterDist,
      );
    }
  }

  private getFromPool(): Maybe<Entity> {
    // Find an available (disabled) entity from the pool
    const entity = this.pool.pop();
    return entity ?? null;
  }

  // MANDATORY hot-reload hooks
  override onBeforeHotReload(): Maybe<Record<string, unknown>> {
    // activeParticles contain Entity refs which serialize fine via default
    // pool contains Entity refs too - let default handle them
    return super.onBeforeHotReload();
  }

  override onAfterHotReload(savedState: Record<string, unknown>): void {
    super.onAfterHotReload(savedState);
    this.postHotReloadFrame = true;
  }
}
