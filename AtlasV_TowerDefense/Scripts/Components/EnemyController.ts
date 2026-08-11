/**
 * EnemyController — Path-following, damage handling, and death animation for enemy entities.
 *
 * Attached to: every spawned enemy entity template.
 * onInit (InitEnemy event): reads IEnemyDef, registers with EnemyService, sets HP and color.
 * onUpdate: advances along the waypoint path using _wpIndex + _subT. Calls PathService
 *   for world positions, applies speedFactor from EnemyService (slow debuffs). Calls
 *   lookAt() toward movement direction so the entity faces forward. Calls _reachEnd()
 *   when past the last waypoint.
 * onTakeDamage: reduces _hp, updates EnemyService registry, triggers _die() at 0 HP.
 * _die(): unregisters from EnemyService, rewards gold, fires EnemyDied, starts death anim.
 * Death animation: squash Y scale to 0 over DEATH_DURATION seconds, then destroys entity.
 */
import { Component, EventService, TransformComponent, MeshComponent, Color, ColorComponent, Vec3, Quaternion, WorldService, NetworkMode } from 'meta/worlds';
import type { Entity } from 'meta/worlds';
import { component, property, subscribe } from 'meta/worlds';
import { OnEntityStartEvent, OnWorldUpdateEvent } from 'meta/worlds';
import type { OnWorldUpdateEventPayload } from 'meta/worlds';
import { NetworkingService } from 'meta/worlds';
import { Events } from '../Types';
import { HP_SCALE_PER_WAVE, RUN_HP_SCALE, RUN_SPEED_SCALE, RUN_REWARD_SCALE } from '../Constants';
import { PathService } from '../Services/PathService';
import { EnemyService } from '../Services/EnemyService';
import { ResourceService } from '../Services/ResourceService';
import { BossModifierService } from '../Services/BossModifierService';
import { LevelGeneratorService } from '../Services/LevelGeneratorService';
import { SkillTreeService } from '../Services/SkillTreeService';
import { Assets } from '../Assets';

@component()
export class EnemyController extends Component {
  @property() bodyPivot: Entity | null = null;
  @property() shadow: Entity | null = null;
  @property() tiltAngle: number = 45;

  private _transform!: TransformComponent;
  private _enemyId: number = -1;
  private _defId: string = '';

  private _hp: number = 0;
  private _maxHp: number = 0;
  private _regenPerSec: number = 0;
  private _speed: number = 0;
  private _reward: number = 0;
  private _alive: boolean = false;
  private _dying: boolean = false;
  private _deathTimer: number = 0;
  private _baseScale: number = 1;

  private _colorComponents: ColorComponent[] = [];
  private _baseColor: Color = new Color(1, 1, 1, 1);
  private _persistentTint: Color | null = null; // e.g. slow tint, survives hit flash
  private _hitFlashTimer: number = 0;
  private static readonly HIT_FLASH_DURATION = 0.12;
  private static readonly HIT_COLOR = new Color(1.0, 0.1, 0.1, 1.0);

  private _squashTimer: number = 0;
  private static readonly SQUASH_DURATION = 0.12;
  private static readonly SQUASH_XZ = 1.12;
  private static readonly SQUASH_Y  = 0.88;

  private static readonly DEATH_DURATION = 0.35;

  private _wpIndex: number = 0;
  private _subT: number = 0;

  // Shield mechanic
  private _shieldTimer: number = 0;
  private _shieldActive: boolean = false;
  private _shieldEntity: Entity | null = null;
  private _shieldMeshComp: MeshComponent | null = null;
  private static readonly SHIELD_FLICKER_THRESHOLD = 2.0; // seconds before expiry to start flickering
  private _shieldFlickerAccum: number = 0; // accumulated phase for flicker oscillation

  @subscribe(OnEntityStartEvent)
  onStart(): void {
    if (NetworkingService.get().isServerContext()) return;
    this._transform = this.entity.getComponent(TransformComponent)!;
  }

  @subscribe(Events.InitEnemy)
  onInit(p: Events.InitEnemyPayload): void {
    const def = EnemyService.get().find(p.defId);
    if (!def) return;

    const hpMult = 1 + p.waveIndex * HP_SCALE_PER_WAVE;
    const bossMods = BossModifierService.get();
    const runCount = LevelGeneratorService.get().runCount;
    const runHpMult     = 1 + (runCount - 1) * RUN_HP_SCALE;
    const runSpeedMult  = 1 + (runCount - 1) * RUN_SPEED_SCALE;
    const runRewardMult = 1 + (runCount - 1) * RUN_REWARD_SCALE;

    this._defId       = p.defId;
    this._hp          = Math.round(def.hp * hpMult * bossMods.hpMultiplier * runHpMult);
    this._maxHp       = this._hp;
    this._regenPerSec = def.regenPerSec ?? 0;
    this._speed       = def.speed * bossMods.speedMultiplier * runSpeedMult;
    this._reward      = Math.round(def.reward * runRewardMult);
    this._wpIndex = 0;
    this._subT    = 0;
    this._alive   = true;

    this._baseScale = this._transform.localScale.x;
    const startPos = PathService.get().getWorldPositionInSubPath(0, 0);
    this._transform.worldPosition = startPos;
    this._enemyId = EnemyService.get().register(this.entity, this._defId, this._hp, startPos.x, startPos.z);

    this._colorComponents = [];
    this._collectColorComponents(this.entity);
    this._baseColor = this._colorComponents[0]?.color ?? new Color(1, 1, 1, 1);
    this.resetTint();

    // Shield initialization
    const shieldDuration = def.shield ?? 0;
    if (shieldDuration > 0) {
      this._shieldTimer = shieldDuration;
      this._shieldActive = true;
      EnemyService.get().setShieldActive(this._enemyId, true);
      this._spawnShieldVisual();
    } else {
      this._shieldTimer = 0;
      this._shieldActive = false;
    }
  }

  @subscribe(Events.TakeDamage)
  onTakeDamage(p: Events.TakeDamagePayload): void {
    if (!this._alive || p.enemyId !== this._enemyId) return;

    // Shield blocks all damage while active
    if (this._shieldActive) {
      console.log(`[EnemyController] Shield blocked ${p.damage} damage on enemy ${this._enemyId}`);
      return;
    }

    this._hitFlashTimer = EnemyController.HIT_FLASH_DURATION;
    this._squashTimer = EnemyController.SQUASH_DURATION;
    this._applyColor(EnemyController.HIT_COLOR);

    this._hp -= p.damage;
    const pos = this._transform.worldPosition;
    EnemyService.get().update(this._enemyId, pos.x, pos.z, PathService.get().getGlobalT(this._wpIndex, this._subT), this._hp);

    if (this._hp <= 0) this._die();
  }

  @subscribe(OnWorldUpdateEvent)
  onUpdate(p: OnWorldUpdateEventPayload): void {
    if (this._hitFlashTimer > 0) {
      this._hitFlashTimer -= p.deltaTime;
      if (this._hitFlashTimer <= 0) this._applyColor(this._persistentTint ?? this._baseColor);
    }

    if (this._squashTimer > 0) {
      this._squashTimer -= p.deltaTime;
      if (this._squashTimer <= 0) {
        this._transform.localScale = new Vec3(this._baseScale, this._baseScale, this._baseScale);
      } else {
        const t = this._squashTimer / EnemyController.SQUASH_DURATION;
        const s = t * t * (3 - 2 * t);
        const xz = this._baseScale * (1 + (EnemyController.SQUASH_XZ - 1) * s);
        const y  = this._baseScale * (1 + (EnemyController.SQUASH_Y  - 1) * s);
        this._transform.localScale = new Vec3(xz, y, xz);
      }
    }

    if (this._dying) {
      this._deathTimer += p.deltaTime;
      const t = Math.min(this._deathTimer / EnemyController.DEATH_DURATION, 1.0);
      this._transform.localScale = new Vec3(this._baseScale * (1 - t), this._baseScale * (1 - t), this._baseScale * (1 - t));
      if (t >= 1.0) this._finishDie();
      return;
    }
    if (!this._alive) return;

    const dt = p.deltaTime;

    // Shield countdown + flicker during last 2 seconds
    if (this._shieldActive) {
      this._shieldTimer -= dt;
      if (this._shieldTimer <= 0) {
        this._shieldActive = false;
        EnemyService.get().setShieldActive(this._enemyId, false);
        this._destroyShieldVisual();
        console.log(`[EnemyController] Shield expired on enemy ${this._enemyId}`);
      } else if (this._shieldTimer <= EnemyController.SHIELD_FLICKER_THRESHOLD && this._shieldMeshComp) {
        // Flicker intensifies as timer approaches 0
        // Frequency ramps from ~3Hz at 2s to ~10Hz at 0s
        const urgency = 1 - (this._shieldTimer / EnemyController.SHIELD_FLICKER_THRESHOLD); // 0..1
        const freq = 3 + urgency * 7; // 3Hz -> 10Hz
        this._shieldFlickerAccum += dt * freq * 2 * Math.PI; // accumulate phase, not time
        const sine = Math.sin(this._shieldFlickerAccum);
        this._shieldMeshComp.isVisibleSelf = sine > 0;
      }
    }

    if (this._regenPerSec > 0 && this._hp < this._maxHp) {
      this._hp = Math.min(this._hp + this._regenPerSec * dt, this._maxHp);
      const pos = this._transform.worldPosition;
      EnemyService.get().update(this._enemyId, pos.x, pos.z, PathService.get().getGlobalT(this._wpIndex, this._subT), this._hp);
    }

    const pathService = PathService.get();
    this._subT += this._speed * (EnemyService.get().get(this._enemyId)?.speedFactor ?? 1) * dt;

    const waypointCount = pathService.getWaypointCount();
    while (this._wpIndex < waypointCount - 1) {
      const subLen = pathService.getSubPathLength(this._wpIndex);
      if (this._subT < subLen) break;
      this._subT -= subLen;
      this._wpIndex++;
    }

    if (this._wpIndex >= waypointCount - 1) {
      this._reachEnd();
      return;
    }

    const pos = pathService.getWorldPositionInSubPath(this._wpIndex, this._subT);
    this._transform.worldPosition = pos;
    const ahead = pathService.getWorldPositionInSubPath(this._wpIndex, this._subT + 0.1);
    this._transform.lookAt(ahead, Vec3.up);
    EnemyService.get().update(this._enemyId, pos.x, pos.z, pathService.getGlobalT(this._wpIndex, this._subT), this._hp);

    // Update shield sphere position to follow enemy
    if (this._shieldEntity) {
      const shieldTransform = this._shieldEntity.getComponent(TransformComponent);
      if (shieldTransform) {
        shieldTransform.worldPosition = pos;
      }
    }

    const dx = ahead.x - pos.x;
    const dz = ahead.z - pos.z;
    this._updateBodyPivot(dx, dz);
  }

  public applyTint(color: Color): void {
    this._persistentTint = color;
    if (this._hitFlashTimer <= 0) this._applyColor(color);
  }

  public resetTint(): void {
    this._persistentTint = null;
    if (this._hitFlashTimer <= 0) this._applyColor(this._baseColor);
  }

  private _collectColorComponents(entity: Entity): void {
    if (entity === this.shadow) return;
    const cc = entity.getComponent(ColorComponent);
    if (cc) this._colorComponents.push(cc);
    for (const child of entity.getChildren()) {
      this._collectColorComponents(child);
    }
  }

  private _applyColor(color: Color): void {
    for (const cc of this._colorComponents) {
      cc.color = color;
    }
  }

  private _die(): void {
    this._alive = false;
    this._dying = true;
    this._deathTimer = 0;
    EnemyService.get().unregister(this._enemyId);
    this._destroyShieldVisual();

    const pos = this._transform.worldPosition;
    const p = new Events.EnemyDiedPayload();
    p.enemyId = this._enemyId;
    p.reward  = this._reward + SkillTreeService.get().getGoldPerKillBonus();
    p.worldX  = pos.x;
    p.worldZ  = pos.z;
    EventService.sendLocally(Events.EnemyDied, p);
  }

  private _finishDie(): void {
    this._dying = false;
    this.entity.destroy();
  }

  private _updateBodyPivot(dx: number, dz: number): void {
    if (!this.bodyPivot) return;
    const pivot = this.bodyPivot.getComponent(TransformComponent);
    if (!pivot) return;

    let angle = new Vec3(0, 0, 0);
    if (dx > 0)       angle = new Vec3(-30, 0, 0);
    else if (dx < 0)  angle = new Vec3(30, 0, 0);
    else if (dz > 0)  angle = new Vec3(0, 0, 45);
    else if (dz < 0)  angle = new Vec3(0, 0, -45);
    pivot.localRotation = Quaternion.fromEuler(angle);
  }

  private _reachEnd(): void {
    this._alive = false;
    EnemyService.get().unregister(this._enemyId);
    ResourceService.get().loseLife();

    const p = new Events.EnemyReachedEndPayload();
    p.enemyId = this._enemyId;
    EventService.sendLocally(Events.EnemyReachedEnd, p);
    this._destroyShieldVisual();
    this.entity.destroy();
  }

  // ── Shield Visual ──────────────────────────────────────────────────────────

  private _spawnShieldVisual(): void {
    this._shieldFlickerAccum = 0;
    WorldService.get().spawnTemplate({
      templateAsset: Assets.ShieldSphere,
      position: this._transform.worldPosition,
      rotation: Quaternion.identity,
      networkMode: NetworkMode.LocalOnly,
    }).then((entity) => {
      this._shieldEntity = entity;
      // MeshComponent is on the child entity, not the root
      const children = entity.getChildren();
      if (children.length > 0) {
        this._shieldMeshComp = children[0].getComponent(MeshComponent);
      }
      console.log(`[EnemyController] Shield sphere spawned for enemy ${this._enemyId}`);
    }).catch(() => {
      console.log(`[EnemyController] Failed to spawn shield sphere`);
    });
  }

  private _destroyShieldVisual(): void {
    if (this._shieldEntity) {
      this._shieldEntity.destroy();
      this._shieldEntity = null;
      this._shieldMeshComp = null;
    }
  }
}
