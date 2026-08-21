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
import { NetworkingService, ExecuteOn } from 'meta/worlds';
import { Events, type ITowerStats } from '../Types';
import { TargetingService } from '../Services/TargetingService';
import { EnemyService } from '../Services/EnemyService';
import { TowerService } from '../Services/TowerService';
import { ProjectilePool } from '../Services/ProjectilePool';
import { BossModifierService } from '../Services/BossModifierService';
import { ResourceService } from '../Services/ResourceService';

// ── Bounce animation constants ───────────────────────────────────────────────
const BOUNCE_DURATION = 0.35;  // total bounce time in seconds
const BOUNCE_OVERSHOOT = 1.25; // peak scale multiplier

// ── Breathing/pulse animation constants (upgradeable indicator) ───────────
const BREATH_SPEED = 5.24;     // radians per second (~1.2s cycle)
const BREATH_MIN = 1.0;
const BREATH_MAX = 1.12;

// ── Recoil animation constants ───────────────────────────────────────────────
const RECOIL_KICK_DURATION  = 0.06; // time to reach max recoil (s)
const RECOIL_RETURN_DURATION = 0.14; // time to return to rest (s)
const RECOIL_DISTANCE = 0.15;        // local units of kickback

// ── Single-use fall animation constants ──────────────────────────────────────
const FALL_DURATION = 0.35;   // seconds for the pillar to tip over

// ── Selection tint ───────────────────────────────────────────────────────
const SELECTED_TINT = new Color(1.0, 0.85, 0.2, 1.0); // golden highlight
const DEFAULT_TINT  = new Color(1.0, 1.0, 1.0, 1.0);  // neutral white
const FROZEN_TINT   = new Color(0.3, 0.55, 1.0, 1.0); // blue/ice freeze

@component()
export class TowerController extends Component {
  private _transform!: TransformComponent;
  private _defId: string = '';
  private _col: number = 0;
  private _row: number = 0;
  private _cooldown: number = 0;
  private _ready: boolean = false;
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

  // ── Breathing pulse state ──────────────────────────────────────────────────
  private _breathing: boolean = false;
  private _breathTime: number = 0;
  private _selected: boolean = false;
  private _frozen: boolean = false; // true when blizzard freeze is active

  // ── Single-use fall state ──────────────────────────────────────────────────
  private _singleUseFalling: boolean = false;
  private _fallElapsed: number = 0;
  private _fallTargetId: number = -1;
  private _fallStartRot: Quaternion = Quaternion.identity;
  private _fallEndRot: Quaternion = Quaternion.identity;

  @property() barrel: Maybe<Entity> = null;
  @property() spawnPoint: Maybe<Entity> = null;
  @property() shadow: Maybe<Entity> = null;
  @property() modelTier1: Maybe<Entity> = null;
  @property() modelTier2: Maybe<Entity> = null;
  @property() modelTier3: Maybe<Entity> = null;
  @property() glowRing: Maybe<Entity> = null;
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
    this._setVisible(this.glowRing, false);
  }

  @subscribe(Events.InitTower)
  onInit(p: Events.InitTowerPayload): void {
    this._defId    = p.defId;
    this._col      = p.col;
    this._row      = p.row;
    this._cooldown = 0;
    this._ready    = true;
    this._bouncing = true;
    this._bounceElapsed = 0;
    this._barrelRestCaptured = false;
    this._currentTier = 0;
    this._transform.localScale = Vec3.zero;
    this._setShadowAlpha(0);
    this._refreshStats();
    this._applyTierModel();
    // Breathing will be evaluated after bounce completes
  }

  @subscribe(Events.TowerUpgraded)
  onTowerUpgraded(p: Events.TowerUpgradedPayload): void {
    if (p.col !== this._col || p.row !== this._row) return;
    this._currentTier = p.tier;
    this._refreshStats();
    this._applyTierModel();
    this._updateBreathing();
  }

  @subscribe(Events.ResourceChanged)
  onResourceChanged(_p: Events.ResourceChangedPayload): void {
    if (!this._ready || this._bouncing) return;
    this._updateBreathing();
  }

  @subscribe(Events.TowerSelected)
  onTowerSelected(p: Events.TowerSelectedPayload): void {
    if (p.col !== this._col || p.row !== this._row) return;
    this._selected = true;
    // Frozen tint takes priority over selection tint
    if (!this._frozen) {
      this._applyTint(SELECTED_TINT);
    }
    console.log(`[TowerController] Tower selected at col=${this._col}, row=${this._row}`);
  }

  @subscribe(Events.TowerDeselected)
  onTowerDeselected(_p: Events.TowerDeselectedPayload): void {
    if (!this._selected) return;
    this._selected = false;
    // Only restore default if not frozen (frozen tint stays)
    if (!this._frozen) {
      this._applyTint(DEFAULT_TINT);
    }
    console.log(`[TowerController] Tower deselected at col=${this._col}, row=${this._row}`);
  }

  @subscribe(Events.BlizzardFreeze)
  onBlizzardFreeze(p: Events.BlizzardFreezePayload): void {
    if (!this._ready) return;
    // Immune tower types are never frozen by the blizzard
    if (this._defId === 'pillar' || this._defId === 'fire_cannon' || this._defId === 'frost') {
      return;
    }
    // Tier-based immunity: rank 3 (tier >= 2) is fully immune
    if (p.active && this._currentTier >= 2) {
      console.log(`[TowerController] Tower immune (tier ${this._currentTier}) at col=${this._col}, row=${this._row}`);
      return;
    }

    if (p.active) {
      this._frozen = true;
      this._applyTintWithBarrel(FROZEN_TINT);
      console.log(`[TowerController] Tower frozen (tier ${this._currentTier}) at col=${this._col}, row=${this._row}`);

      // Tier 1 (rank 2): self-unfreeze after half duration (3s instead of 6s)
      if (this._currentTier === 1) {
        setTimeout(() => {
          if (!this._frozen) return; // already unfrozen by global event
          this._frozen = false;
          this._applyTintWithBarrel(this._selected ? SELECTED_TINT : DEFAULT_TINT);
          console.log(`[TowerController] Tower self-unfrozen (tier 1 half-duration) at col=${this._col}, row=${this._row}`);
        }, 3000);
      }
    } else {
      // Global unfreeze event — only apply if still frozen (tier 1 may have self-unfrozen)
      if (!this._frozen) return;
      this._frozen = false;
      this._applyTintWithBarrel(this._selected ? SELECTED_TINT : DEFAULT_TINT);
      console.log(`[TowerController] Tower unfrozen at col=${this._col}, row=${this._row}`);
    }
  }

  /** Enable breathing if the player can afford at least one upgrade for this tower. */
  private _updateBreathing(): void {
    const options = TowerService.get().getNextUpgradeOptions(this._col, this._row);
    if (!options) {
      // Tower is maxed — stop breathing
      this._breathing = false;
      return;
    }
    const gold = ResourceService.get().gold;
    const canAfford = gold >= options[0].cost || gold >= options[1].cost;
    this._breathing = canAfford;
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
        this._updateBreathing();
      }
    }

    // Breathing pulse: gentle scale oscillation when tower is upgradeable
    if (this._breathing && !this._bouncing) {
      this._breathTime += dt;
      const breathT = (Math.sin(this._breathTime * BREATH_SPEED) + 1) * 0.5; // 0..1
      const s = BREATH_MIN + (BREATH_MAX - BREATH_MIN) * breathT;
      this._transform.localScale = new Vec3(s, s, s);
    } else if (!this._bouncing && !this._singleUseFalling) {
      // Ensure scale is exactly 1 when not breathing (avoid stuck at non-1)
      if (this._breathTime > 0) {
        this._breathTime = 0;
        this._transform.localScale = new Vec3(1, 1, 1);
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

    // ── Single-use fall animation tick ─────────────────────────────────────────
    if (this._singleUseFalling) {
      this._fallElapsed += dt;
      const t = Math.min(this._fallElapsed / FALL_DURATION, 1);
      // Ease-out quad for a satisfying slam
      const eased = 1 - (1 - t) * (1 - t);

      if (this.barrel) {
        const barrelT = this.barrel.getComponent(TransformComponent);
        if (barrelT) {
          // Slerp worldRotation from upright to tipped-toward-enemy
          barrelT.worldRotation = this._fallStartRot.slerp(this._fallEndRot, eased);
        }
      }

      if (t >= 1) {
        // Fall complete → deal damage and self-destruct
        console.log(`[TowerController] Pillar fall complete at col=${this._col}, row=${this._row}`);
        const pos2 = this._transform.worldPosition;
        const dmgPayload = new Events.TakeDamagePayload();
        dmgPayload.enemyId = this._fallTargetId;
        dmgPayload.damage = this._stats.damage * BossModifierService.get().damageMultiplier;
        dmgPayload.props = { ...this._stats.props, towerDefId: this._defId };
        dmgPayload.originX = pos2.x;
        dmgPayload.originZ = pos2.z;
        const enemyData = EnemyService.get().get(this._fallTargetId);
        dmgPayload.hitX = enemyData ? enemyData.worldX : pos2.x;
        dmgPayload.hitZ = enemyData ? enemyData.worldZ : pos2.z;
        EventService.sendLocally(Events.TakeDamage, dmgPayload);
        TowerService.get().removeTowerAt(this._col, this._row);
        this._ready = false;
        this.entity.destroy();
      }
      return; // Skip normal targeting/firing while falling
    }

    const pos = this._transform.worldPosition;

    // Skip targeting and firing while frozen by blizzard
    if (this._frozen) return;

    const targetId = TargetingService.get().getBestTarget(pos.x, pos.z, this._stats.range);
    if (targetId === -1) return;

    // ── Single-use tower: start fall animation toward first target ────────────
    if (this._stats.props.singleUse) {
      const target = EnemyService.get().get(targetId);
      if (target && this.barrel) {
        const barrelT = this.barrel.getComponent(TransformComponent);
        if (barrelT) {
          // Capture starting world rotation of the barrel
          this._fallStartRot = barrelT.worldRotation;
          // Compute horizontal direction from barrel to enemy
          const bPos = barrelT.worldPosition;
          const dx = target.worldX - bPos.x;
          const dz = target.worldZ - bPos.z;
          const len = Math.sqrt(dx * dx + dz * dz) || 1;
          const fallDir = new Vec3(dx / len, 0, dz / len);
          // Stone's current "up" in world space (direction its top points)
          const stoneUp = this._fallStartRot.mulVec3(Vec3.up);
          // Rotation that tips stoneUp toward the fall direction
          const tipRotation = Quaternion.rotationTo(stoneUp, fallDir);
          this._fallEndRot = tipRotation.mul(this._fallStartRot);
        }
      }
      this._singleUseFalling = true;
      this._fallElapsed = 0;
      this._fallTargetId = targetId;
      console.log(`[TowerController] Pillar fall started toward enemy ${targetId}`);
      return;
    }

    if (this.barrel && this._defId !== 'lightning') {
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

    this._cooldown = 1 / this._stats.fireRate;

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
    if (this._defId !== 'lightning') {
      this._recoilElapsed = 0;
    }

    const spawnPos = this.spawnPoint
      ? (this.spawnPoint.getComponent(TransformComponent)?.worldPosition ?? pos)
      : this.barrel
        ? (this.barrel.getComponent(TransformComponent)?.worldPosition ?? pos)
        : pos;
    const trf = entity.getComponent(TransformComponent);
    if (trf) trf.worldPosition = spawnPos;

    const initP = new Events.InitProjectilePayload();
    initP.targetEnemyId = targetId;
    initP.damage        = this._stats.damage * BossModifierService.get().damageMultiplier;
    initP.speed         = this._stats.projectileSpeed;
    initP.props         = { ...this._stats.props, towerDefId: this._defId };
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
      // Badges visible only at tier >= 1 (no badge at tier 0)
      this._setVisible(tiers[i], i === this._currentTier && this._currentTier >= 1);
    }
    // Gold glow ring: visible only at max tier (tier >= 2)
    this._setVisible(this.glowRing, this._currentTier >= 2);
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

  /** Apply a color tint to the active tier model AND barrel via ColorComponent.
   *  Used by the blizzard freeze to tint both parts of the tower. */
  private _applyTintWithBarrel(tint: Color): void {
    const tiers: Array<Maybe<Entity>> = [this.modelTier1, this.modelTier2, this.modelTier3];
    const model = tiers[this._currentTier];
    const colorComponents: ColorComponent[] = [];
    if (model) this._collectColorComponents(model, colorComponents);
    if (this.barrel) this._collectColorComponents(this.barrel, colorComponents);
    for (const cc of colorComponents) {
      cc.color = tint;
    }
  }

  /** Recursively collect all ColorComponents from an entity and its children (excluding shadow). */
  private _collectColorComponents(entity: Entity, out: ColorComponent[]): void {
    if (entity === this.shadow) return;
    const cc = entity.getComponent(ColorComponent);
    if (cc) out.push(cc);
    for (const child of entity.getChildren()) {
      this._collectColorComponents(child, out);
    }
  }

  /** Apply a color tint to ALL mesh children of the currently visible tier model entity. */
  private _applyTint(tint: Color): void {
    const tiers: Array<Maybe<Entity>> = [this.modelTier1, this.modelTier2, this.modelTier3];
    const model = tiers[this._currentTier];
    if (!model) return;
    const colorComponents: ColorComponent[] = [];
    this._collectColorComponents(model, colorComponents);
    for (const cc of colorComponents) {
      cc.color = tint;
    }
  }
}
