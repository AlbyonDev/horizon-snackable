/**
 * VfxService — Hit flash, impact particles, and death explosion VFX.
 *
 * Subscribes to TakeDamage: flashes enemy white for 80ms, spawns 3 impact particles.
 * Subscribes to EnemyDied: spawns 6 death explosion particles at death location.
 * Particles use a pre-warmed pool of Projectile entities (small spheres).
 * Each particle has velocity, gravity, lifetime, and fades/shrinks over time.
 * Force-instantiated in GameManager._startGame().
 */
import { Service, WorldService, NetworkMode, Vec3, Quaternion, Color, ColorComponent, TransformComponent, NetworkingService } from 'meta/worlds';
import { service, subscribe } from 'meta/worlds';
import type { Entity } from 'meta/worlds';
import { OnWorldUpdateEvent } from 'meta/worlds';
import type { OnWorldUpdateEventPayload } from 'meta/worlds';
import { ExecuteOn } from 'meta/worlds';
import { Events } from '../Types';
import { EnemyService } from './EnemyService';
import { Assets } from '../Assets';
import { PARTICLE_POOL_SIZE } from '../Constants';

const PARK_POS = new Vec3(0, -100, 0);
const WHITE = new Color(1, 1, 1, 1);
const FLASH_DURATION = 0.08; // 80ms white flash

interface IParticle {
  entity: Entity;
  vx: number;
  vy: number;
  vz: number;
  age: number;
  life: number;
  r: number;
  g: number;
  b: number;
  baseScale: number;
}

interface IFlash {
  enemyId: number;
  expiresAt: number;
  originalColors: Map<ColorComponent, Color>;
}

@service()
export class VfxService extends Service {
  private _pool: Entity[] = [];
  private _poolIndex: number = 0;
  private _particles: IParticle[] = [];
  private _flashes: IFlash[] = [];

  async prewarm(): Promise<void> {
    if (NetworkingService.get().isServerContext()) return;
    const entities = await Promise.all(
      Array.from({ length: PARTICLE_POOL_SIZE }, () =>
        WorldService.get().spawnTemplate({
          templateAsset: Assets.Particles,
          position: PARK_POS,
          rotation: Quaternion.identity,
          scale: new Vec3(0.08, 0.08, 0.08),
          networkMode: NetworkMode.LocalOnly,
        }).catch(() => null),
      ),
    );
    for (const e of entities) { if (e) this._pool.push(e); }
  }

  // ── Hit flash + impact particles ──────────────────────────────────────────

  @subscribe(Events.TakeDamage, { execution: ExecuteOn.Owner })
  onTakeDamage(p: Events.TakeDamagePayload): void {
    const rec = EnemyService.get().get(p.enemyId);
    if (!rec) return;

    // Impact particles (3 small particles at enemy position)
    const col = p.props['projectileColor'] as { r: number; g: number; b: number } | undefined;
    const r = col?.r ?? 1;
    const g = col?.g ?? 1;
    const b = col?.b ?? 0.3;
    this._spawnImpactParticles(rec.worldX, rec.worldZ, r, g, b);
  }

  // ── Projectile trail ───────────────────────────────────────────────────────

  spawnTrail(worldX: number, worldY: number, worldZ: number, r: number, g: number, b: number): void {
    const entity = this._acquireParticle();
    if (!entity) return;

    const tc = entity.getComponent(TransformComponent);
    if (tc) {
      tc.worldPosition = new Vec3(worldX, worldY, worldZ);
      tc.localScale = new Vec3(0.04, 0.04, 0.04);
    }
    const color = new Color(r, g, b, 0.8);
    const cc = entity.getComponent(ColorComponent);
    if (cc) cc.color = color;
    for (const child of entity.getChildrenWithComponent(ColorComponent)) {
      const c = child.getComponent(ColorComponent);
      if (c) c.color = color;
    }

    this._particles.push({
      entity,
      vx: 0, vy: 0, vz: 0,
      age: 0,
      life: 0.15,
      r, g, b,
      baseScale: 0.04,
    });
  }

  /**
   * Spawns a chain-lightning particle with configurable scale, lifetime, velocity, and alpha.
   * Used by ChainLightningService for dramatic arc visuals.
   */
  spawnChainParticle(
    worldX: number, worldY: number, worldZ: number,
    r: number, g: number, b: number,
    scale: number, life: number,
    vx: number = 0, vy: number = 0, vz: number = 0,
  ): void {
    const entity = this._acquireParticle();
    if (!entity) return;

    const tc = entity.getComponent(TransformComponent);
    if (tc) {
      tc.worldPosition = new Vec3(worldX, worldY, worldZ);
      tc.localScale = new Vec3(scale, scale, scale);
    }
    const color = new Color(r, g, b, 1.0);
    const cc = entity.getComponent(ColorComponent);
    if (cc) cc.color = color;
    for (const child of entity.getChildrenWithComponent(ColorComponent)) {
      const c = child.getComponent(ColorComponent);
      if (c) c.color = color;
    }

    this._particles.push({
      entity,
      vx, vy, vz,
      age: 0,
      life,
      r, g, b,
      baseScale: scale,
    });
  }

  // ── Death explosion ───────────────────────────────────────────────────────

  @subscribe(Events.EnemyBlinked, { execution: ExecuteOn.Owner })
  onEnemyBlinked(p: Events.EnemyBlinkedPayload): void {
    this.spawnBlinkVfx(p.oldWorldX, p.oldWorldZ);
    this.spawnBlinkVfx(p.newWorldX, p.newWorldZ);
  }

  spawnBlinkVfx(worldX: number, worldZ: number): void {
    for (let i = 0; i < 5; i++) {
      const entity = this._acquireParticle();
      if (!entity) break;

      const angle = (i / 5) * Math.PI * 2 + Math.random() * 0.4;
      const speed = 1.5 + Math.random() * 1.0;

      const tc = entity.getComponent(TransformComponent);
      if (tc) {
        tc.worldPosition = new Vec3(worldX, 0.25, worldZ);
        tc.localScale = new Vec3(0.1, 0.1, 0.1);
      }
      // Purple/violet magical colors
      const r = 0.5 + Math.random() * 0.2;
      const g = 0.05 + Math.random() * 0.1;
      const b = 0.8 + Math.random() * 0.2;
      const cc = entity.getComponent(ColorComponent);
      if (cc) cc.color = new Color(r, g, b, 1);
      for (const child of entity.getChildrenWithComponent(ColorComponent)) {
        const c = child.getComponent(ColorComponent);
        if (c) c.color = new Color(r, g, b, 1);
      }

      this._particles.push({
        entity,
        vx: Math.cos(angle) * speed,
        vy: 2.5 + Math.random() * 1.5,
        vz: Math.sin(angle) * speed,
        age: 0,
        life: 0.25 + Math.random() * 0.1,
        r, g, b,
        baseScale: 0.1,
      });
    }
  }

  @subscribe(Events.EnemyDied, { execution: ExecuteOn.Owner })
  onEnemyDied(p: Events.EnemyDiedPayload): void {
    this._spawnDeathParticles(p.worldX, p.worldZ);
  }

  // ── Update loop ───────────────────────────────────────────────────────────

  @subscribe(OnWorldUpdateEvent, { execution: ExecuteOn.Owner })
  onUpdate(payload: OnWorldUpdateEventPayload): void {
    const dt = payload.deltaTime;
    const now = Date.now();

    // Update flash timers
    for (let i = this._flashes.length - 1; i >= 0; i--) {
      if (now >= this._flashes[i].expiresAt) {
        this._restoreColors(this._flashes[i].originalColors);
        this._flashes.splice(i, 1);
      }
    }

    // Update particles
    for (let i = this._particles.length - 1; i >= 0; i--) {
      const p = this._particles[i];
      p.age += dt;
      p.vy -= 9.8 * dt; // gravity

      const tc = p.entity.getComponent(TransformComponent);
      if (tc) {
        const pos = tc.worldPosition;
        tc.worldPosition = new Vec3(pos.x + p.vx * dt, pos.y + p.vy * dt, pos.z + p.vz * dt);
        const frac = 1 - p.age / p.life;
        const sc = p.baseScale * Math.max(0, frac);
        tc.localScale = new Vec3(sc, sc, sc);
      }

      // Fade alpha
      const frac = Math.max(0, 1 - p.age / p.life);
      const cc = p.entity.getComponent(ColorComponent);
      if (cc) cc.color = new Color(p.r, p.g, p.b, frac);
      for (const child of p.entity.getChildrenWithComponent(ColorComponent)) {
        const c = child.getComponent(ColorComponent);
        if (c) c.color = new Color(p.r, p.g, p.b, frac);
      }

      if (p.age >= p.life) {
        this._parkParticle(p.entity);
        this._particles.splice(i, 1);
      }
    }
  }

  @subscribe(Events.RestartGame)
  onRestart(_p: Events.RestartGamePayload): void {
    for (const p of this._particles) this._parkParticle(p.entity);
    this._particles = [];
    this._flashes = [];
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  private _spawnImpactParticles(worldX: number, worldZ: number, r: number, g: number, b: number): void {
    for (let i = 0; i < 3; i++) {
      const entity = this._acquireParticle();
      if (!entity) break;

      const angle = Math.random() * Math.PI * 2;
      const speed = 1.5 + Math.random() * 1.5;

      const tc = entity.getComponent(TransformComponent);
      if (tc) {
        tc.worldPosition = new Vec3(worldX, 0.3, worldZ);
        tc.localScale = new Vec3(0.08, 0.08, 0.08);
      }
      const cc = entity.getComponent(ColorComponent);
      if (cc) cc.color = new Color(r, g, b, 1);
      for (const child of entity.getChildrenWithComponent(ColorComponent)) {
        const c = child.getComponent(ColorComponent);
        if (c) c.color = new Color(r, g, b, 1);
      }

      this._particles.push({
        entity,
        vx: Math.cos(angle) * speed,
        vy: 2 + Math.random() * 2,
        vz: Math.sin(angle) * speed,
        age: 0,
        life: 0.3 + Math.random() * 0.1,
        r, g, b,
        baseScale: 0.08,
      });
    }
  }

  private _spawnDeathParticles(worldX: number, worldZ: number): void {
    for (let i = 0; i < 6; i++) {
      const entity = this._acquireParticle();
      if (!entity) break;

      const angle = (i / 6) * Math.PI * 2 + Math.random() * 0.5;
      const speed = 2 + Math.random() * 1.5;

      const tc = entity.getComponent(TransformComponent);
      if (tc) {
        tc.worldPosition = new Vec3(worldX, 0.2, worldZ);
        tc.localScale = new Vec3(0.12, 0.12, 0.12);
      }
      // Bright warm explosion colors
      const r = 0.9 + Math.random() * 0.1;
      const g = 0.3 + Math.random() * 0.4;
      const b = 0.05 + Math.random() * 0.1;
      const cc = entity.getComponent(ColorComponent);
      if (cc) cc.color = new Color(r, g, b, 1);
      for (const child of entity.getChildrenWithComponent(ColorComponent)) {
        const c = child.getComponent(ColorComponent);
        if (c) c.color = new Color(r, g, b, 1);
      }

      this._particles.push({
        entity,
        vx: Math.cos(angle) * speed,
        vy: 3 + Math.random() * 2,
        vz: Math.sin(angle) * speed,
        age: 0,
        life: 0.45 + Math.random() * 0.15,
        r, g, b,
        baseScale: 0.12,
      });
    }
  }

  private _acquireParticle(): Entity | null {
    if (this._pool.length === 0) return null;
    const entity = this._pool[this._poolIndex];
    this._poolIndex = (this._poolIndex + 1) % this._pool.length;

    // If this entity is still active, recycle it (remove from active list, park it)
    const activeIdx = this._particles.findIndex(p => p.entity === entity);
    if (activeIdx !== -1) {
      this._parkParticle(entity);
      this._particles.splice(activeIdx, 1);
    }

    return entity;
  }

  private _parkParticle(entity: Entity): void {
    const tc = entity.getComponent(TransformComponent);
    if (tc) tc.worldPosition = PARK_POS;
  }

  private _captureColors(entity: Entity): Map<ColorComponent, Color> {
    const map = new Map<ColorComponent, Color>();
    for (const child of entity.getChildren()) {
      const c = child.getComponent(ColorComponent);
      if (c) map.set(c, new Color(c.color.r, c.color.g, c.color.b, c.color.a));
      for (const [cc, col] of this._captureColors(child)) map.set(cc, col);
    }
    return map;
  }

  private _applyWhite(entity: Entity): void {
    for (const child of entity.getChildren()) {
      const c = child.getComponent(ColorComponent);
      if (c) c.color = WHITE;
      this._applyWhite(child);
    }
  }

  private _restoreColors(map: Map<ColorComponent, Color>): void {
    for (const [c, orig] of map) c.color = orig;
  }
}
