/**
 * TowerController — Per-frame targeting and firing logic for placed tower entities.
 *
 * Attached to: every spawned tower entity template.
 * onInit (InitTower event): reads ITowerDef from TowerService, stores col/row.
 * onUpdate: calls TargetingService.getBestTarget() each frame. Fires a projectile when
 *   cooldown expires and a target is in range. Acquires projectile from ProjectilePool,
 *   positions it at the tower base, sends InitProjectile to it.
 * Stats (damage, range, fireRate) are read live via TowerService.computeStats() so
 *   upgrades apply immediately without reinitializing the component.
 * Does NOT handle hit resolution — that is ProjectileController's responsibility.
 */
import { Component, TransformComponent, Vec3, Quaternion, EventService, ColorComponent, Color, MeshComponent } from 'meta/worlds';
import type { Entity, Maybe } from 'meta/worlds';
import { component, property, subscribe } from 'meta/worlds';
import { OnEntityStartEvent, OnWorldUpdateEvent } from 'meta/worlds';
import type { OnWorldUpdateEventPayload } from 'meta/worlds';
import { NetworkingService } from 'meta/worlds';
import { Events, TargetingMode, type ITowerStats } from '../Types';
import { TargetingService } from '../Services/TargetingService';
import { EnemyService } from '../Services/EnemyService';
import { TowerService } from '../Services/TowerService';
import { ProjectilePool } from '../Services/ProjectilePool';

// ── Bounce animation constants ───────────────────────────────────────────────
const BOUNCE_DURATION = 0.35;  // total bounce time in seconds
const BOUNCE_OVERSHOOT = 1.25; // peak scale multiplier

// ── Recoil animation constants ───────────────────────────────────────────────
const RECOIL_KICK_DURATION  = 0.06; // time to reach max recoil (s)
const RECOIL_RETURN_DURATION = 0.14; // time to return to rest (s)
const RECOIL_DISTANCE = 0.15;        // local units of kickback

@component()
export class TowerController extends Component {
  private _transform!: TransformComponent;
  private _col: number = 0;
  private _row: number = 0;
  private _cooldown: number = 0;
  private _ready: boolean = false;
  // Targeting rule for this tower, read from its def on init (stable; upgrades never change it).
  private _targeting: TargetingMode = TargetingMode.First;
  // Sticky targeting: keep firing at the locked enemy while it stays alive and in range.
  // Only re-acquire (furthest-along) when the lock is lost. Lets the spool-up Laser hold a boss.
  private _lockedId: number = -1;
  // Spool-up: effective fire rate ramps (×1 → ×spoolPeak) the longer the tower holds ONE
  // target; resets on target switch. Gated by props.spoolPeak > 1. See _effectiveFireRate().
  private _spoolTime: number = 0;
  private _stats: ITowerStats = { damage: 0, range: 0, fireRate: 1, projectileSpeed: 1, props: {} };
  private _bouncing: boolean = false;
  private _bounceElapsed: number = 0;
  private _recoilElapsed: number = -1; // -1 = inactive
  private _barrelRestLocalX: number = 0;
  private _barrelRestLocalY: number = 0;
  private _barrelRestLocalZ: number = 0;
  private _barrelRestCaptured: boolean = false;
  private _recoilDirX: number = 0;
  private _recoilDirZ: number = 0;

  @property() barrel: Maybe<Entity> = null;
  @property() spawnPoint: Maybe<Entity> = null;
  @property() shadow: Maybe<Entity> = null;
  @property() modelTier1: Maybe<Entity> = null;
  @property() modelTier2: Maybe<Entity> = null;
  @property() modelTier3: Maybe<Entity> = null;
  private _shadowColor: Color = new Color(0, 0, 0, 0.4);
  private _currentTier: number = 0;
  // Adjust if barrel mesh is not aligned: 180 = mesh forward is +Z (default for this project)
  @property() barrelForwardOffsetDeg: number = 180;

  @subscribe(OnEntityStartEvent)
  onStart(): void {
    if (NetworkingService.get().isServerContext()) return;
    this._transform = this.entity.getComponent(TransformComponent)!;
    if (this.shadow) {
      const cc = this.shadow.getComponent(ColorComponent);
      if (cc) this._shadowColor = cc.color;
    }
    this._setShadowAlpha(0);
    this._setVisible(this.modelTier1, false);
    this._setVisible(this.modelTier2, false);
    this._setVisible(this.modelTier3, false);
  }

  @subscribe(Events.InitTower)
  onInit(p: Events.InitTowerPayload): void {
    this._col      = p.col;
    this._row      = p.row;
    this._cooldown = 0;
    this._lockedId = -1;
    this._spoolTime = 0;
    const rec = TowerService.get().getAt(p.col, p.row);
    const def = rec ? TowerService.get().find(rec.defId) : undefined;
    this._targeting = def?.targeting ?? TargetingMode.First;
    this._ready    = true;
    this._bouncing = true;
    this._bounceElapsed = 0;
    this._barrelRestCaptured = false;
    this._currentTier = 0;
    this._transform.localScale = Vec3.zero;
    this._setShadowAlpha(0);
    this._refreshStats();
    this._applyTierModel();
  }

  @subscribe(Events.TowerUpgraded)
  onTowerUpgraded(p: Events.TowerUpgradedPayload): void {
    if (p.col !== this._col || p.row !== this._row) return;
    this._currentTier = p.tier;
    this._refreshStats();
    this._applyTierModel();
  }

  @subscribe(OnWorldUpdateEvent)
  onUpdate(p: OnWorldUpdateEventPayload): void {
    if (!this._ready) return;

    const dt = p.deltaTime;

    // Bounce animation: scale 0 → overshoot → settle at CELL_SIZE
    if (this._bouncing) {
      this._bounceElapsed += dt;
      const t = Math.min(this._bounceElapsed / BOUNCE_DURATION, 1);
      // Ease-out elastic: overshoot then settle
      const s = t < 0.5
        ? BOUNCE_OVERSHOOT * (t / 0.5)               // 0 → overshoot
        : BOUNCE_OVERSHOOT + (1 - BOUNCE_OVERSHOOT) * ((t - 0.5) / 0.5); // overshoot → 1
      const scale = s;
      this._transform.localScale = new Vec3(scale, scale, scale);
      // Fade shadow in during second half of bounce
      const shadowAlpha = Math.max(0, (t - 0.5) / 0.5);
      this._setShadowAlpha(shadowAlpha);

      if (t >= 1) {
        this._bouncing = false;
        this._transform.localScale = new Vec3(scale, scale, scale);
      }
    }

    if (this._cooldown > 0) this._cooldown -= dt;

    // Recoil animation: barrel kicks back in world space opposite to aim direction
    if (this._recoilElapsed >= 0 && this.barrel) {
      this._recoilElapsed += dt;
      const barrelT = this.barrel.getComponent(TransformComponent);
      if (barrelT) {
        const total = RECOIL_KICK_DURATION + RECOIL_RETURN_DURATION;
        let offset = 0;
        if (this._recoilElapsed < RECOIL_KICK_DURATION) {
          offset = RECOIL_DISTANCE * (this._recoilElapsed / RECOIL_KICK_DURATION);
        } else if (this._recoilElapsed < total) {
          offset = RECOIL_DISTANCE * (1 - (this._recoilElapsed - RECOIL_KICK_DURATION) / RECOIL_RETURN_DURATION);
        } else {
          this._recoilElapsed = -1;
          barrelT.localPosition = new Vec3(this._barrelRestLocalX, this._barrelRestLocalY, this._barrelRestLocalZ);
        }
        if (this._recoilElapsed >= 0) {
          // Reset to rest local first, then apply world-space offset
          barrelT.localPosition = new Vec3(this._barrelRestLocalX, this._barrelRestLocalY, this._barrelRestLocalZ);
          const restWorld = barrelT.worldPosition;
          barrelT.worldPosition = new Vec3(
            restWorld.x - this._recoilDirX * offset,
            restWorld.y,
            restWorld.z - this._recoilDirZ * offset,
          );
        }
      }
    }

    const pos = this._transform.worldPosition;

    const targetId = this._acquireTarget(pos.x, pos.z);
    if (targetId === -1) { this._spoolTime = 0; return; }

    // Spool-up: accumulate time-on-target; effective fire rate ramps ×1 → ×spoolPeak.
    this._spoolTime += dt;

    if (this.barrel) {
      const target = EnemyService.get().get(targetId);
      if (target) {
        const barrelT = this.barrel.getComponent(TransformComponent);
        if (barrelT) {
          const bPos = barrelT.worldPosition;
          const dx = target.worldX - bPos.x;
          const dz = target.worldZ - bPos.z;
          // barrel mesh forward is +Z in RUB: negate yaw from the standard -Z formula
          const yawDeg = Math.atan2(dx, -dz) * (180 / Math.PI) + this.barrelForwardOffsetDeg;
          barrelT.localRotation = Quaternion.fromEuler(new Vec3(0, -yawDeg, 0));
        }
      }
    }

    if (this._cooldown > 0) return;

    const entity = ProjectilePool.get().acquire();
    if (!entity) return;

    this._cooldown = 1 / this._effectiveFireRate();

    if (this.barrel) {
      const barrelT = this.barrel.getComponent(TransformComponent);
      if (barrelT) {
        if (!this._barrelRestCaptured) {
          const bl = barrelT.localPosition;
          this._barrelRestLocalX = bl.x;
          this._barrelRestLocalY = bl.y;
          this._barrelRestLocalZ = bl.z;
          this._barrelRestCaptured = true;
        }
        const target2 = EnemyService.get().get(targetId);
        if (target2) {
          const bw = barrelT.worldPosition;
          const dx2 = target2.worldX - bw.x;
          const dz2 = target2.worldZ - bw.z;
          const len = Math.sqrt(dx2 * dx2 + dz2 * dz2) || 1;
          this._recoilDirX = dx2 / len;
          this._recoilDirZ = dz2 / len;
        }
      }
    }
    this._recoilElapsed = 0;

    const spawnPos = this.spawnPoint
      ? (this.spawnPoint.getComponent(TransformComponent)?.worldPosition ?? pos)
      : this.barrel
        ? (this.barrel.getComponent(TransformComponent)?.worldPosition ?? pos)
        : pos;
    const t = entity.getComponent(TransformComponent);
    if (t) t.worldPosition = spawnPos;

    const initP = new Events.InitProjectilePayload();
    initP.targetEnemyId = targetId;
    initP.damage        = this._stats.damage;
    initP.speed         = this._stats.projectileSpeed;
    initP.props         = this._stats.props;
    initP.originX       = pos.x;
    initP.originZ       = pos.z;
    EventService.sendLocally(Events.InitProjectile, initP, { eventTarget: entity });
  }

  private _setVisible(entity: Maybe<Entity>, visible: boolean): void {
    if (!entity) return;
    const mesh = entity.getComponent(MeshComponent);
    if (mesh) mesh.isVisibleSelf = visible;
  }

  private _applyTierModel(): void {
    const tiers: Array<Maybe<Entity>> = [this.modelTier1, this.modelTier2, this.modelTier3];
    for (let i = 0; i < tiers.length; i++) {
      this._setVisible(tiers[i], i === this._currentTier);
    }
  }

  private _setShadowAlpha(alpha: number): void {
    if (!this.shadow) return;
    const cc = this.shadow.getComponent(ColorComponent);
    if (cc) cc.color = new Color(this._shadowColor.r, this._shadowColor.g, this._shadowColor.b, this._shadowColor.a * alpha);
  }

  private _refreshStats(): void {
    const stats = TowerService.get().getEffectiveStats(this._col, this._row);
    if (stats) this._stats = stats;
  }

  // Pick the enemy this tower fires at this frame, per its TargetingMode.
  // Returns an enemyId, or -1 if nothing in range. Resets the spool when the target changes.
  // To add a new mode: add it to TargetingMode (Types.ts) and a case here.
  private _acquireTarget(x: number, z: number): number {
    let targetId = -1;

    switch (this._targeting) {
      case TargetingMode.Sticky: {
        // Keep the locked enemy while it is alive and still within range.
        if (this._lockedId !== -1) {
          const locked = EnemyService.get().get(this._lockedId);
          if (locked) {
            const dx = locked.worldX - x;
            const dz = locked.worldZ - z;
            if (dx * dx + dz * dz <= this._stats.range * this._stats.range) targetId = this._lockedId;
          }
        }
        // Lost the lock → re-acquire furthest-along.
        if (targetId === -1) targetId = TargetingService.get().getBestTarget(x, z, this._stats.range);
        break;
      }
      case TargetingMode.First:
      default:
        targetId = TargetingService.get().getBestTarget(x, z, this._stats.range);
        break;
    }

    if (targetId !== this._lockedId) this._spoolTime = 0; // target switched → reset spool ramp
    this._lockedId = targetId;
    return targetId;
  }

  // Spool-up fire rate. Spool is a MULTIPLIER on the tower's base fireRate stat (composes
  // like crit/splash) so it works on ANY tower and stacks with Rate upgrades:
  //   effectiveRate = fireRate × ( 1 → spoolPeak ), ramped over props.spoolTime seconds of
  //   holding one target (_spoolTime). spoolPeak ≤ 1 (or absent) = no spool.
  // Ramp metric is time-on-target; this is the single extension point if a future spool
  // wants to ramp by shots-landed / time-targeting instead — change how _spoolTime is fed.
  private _effectiveFireRate(): number {
    const peak = this._stats.props['spoolPeak'] as number | undefined;
    if (peak === undefined || peak <= 1) return this._stats.fireRate;
    const time = (this._stats.props['spoolTime'] as number | undefined) ?? 2.5;
    const ramp = time > 0 ? Math.min(1, this._spoolTime / time) : 1;
    return this._stats.fireRate * (1 + (peak - 1) * ramp);
  }
}
