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
import { OnEntityStartEvent, OnEntityDestroyEvent, OnWorldUpdateEvent } from 'meta/worlds';
import type { OnWorldUpdateEventPayload } from 'meta/worlds';
import { NetworkingService } from 'meta/worlds';
import { Events } from '../Types';
import { HP_SCALE_PER_WAVE, RUN_HP_SCALE, RUN_SPEED_SCALE, RUN_REWARD_SCALE, GRID_ORIGIN_X, GRID_ORIGIN_Z, CELL_WIDTH, CELL_HEIGHT, GRID_ROWS, GRID_COLS } from '../Constants';
import { PathService } from '../Services/PathService';
import { EnemyService } from '../Services/EnemyService';
import { ResourceService } from '../Services/ResourceService';
import { BossModifierService } from '../Services/BossModifierService';
import { LevelGeneratorService } from '../Services/LevelGeneratorService';
import { SkillTreeService } from '../Services/SkillTreeService';
import { TowerService } from '../Services/TowerService';
import { TowerDestroyAnimService } from '../Services/TowerDestroyAnimService';
import { RelicService } from '../Services/RelicService';
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

  private _lastHitTowerDefId: string = '';
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

  // Spawn scale-up animation
  private _spawnScaleTimer: number = 0;
  private _spawnScaling: boolean = false;
  private _spawnScaleDuration: number = 1; // computed per-enemy based on speed
  private static readonly SPAWN_SCALE_BASE_SPEED = 1.0;
  private static readonly SPAWN_SCALE_BASE_DURATION = 1.7;
  private static readonly SPAWN_SCALE_MIN_DURATION = 0.1;
  private static readonly SPAWN_SCALE_MAX_DURATION = 6.0;
  private static readonly SPAWN_SCALE_START = 0; // fraction of _baseScale to start at

  private _wpIndex: number = 0;
  private _subT: number = 0;

  // Straight-line boss mode
  private _straightLine: boolean = false;
  private _straightLineStartX: number = 0;
  private _straightLineStartZ: number = 0;
  private _straightLineEndX: number = 0;
  private _lastCheckedCol: number = -1;
  private _lastCheckedRow: number = -1;

  // Shield mechanic
  private _shieldTimer: number = 0;
  private _shieldActive: boolean = false;
  private _shieldEntity: Entity | null = null;
  private _shieldMeshComp: MeshComponent | null = null;
  private static readonly SHIELD_FLICKER_THRESHOLD = 2.0; // seconds before expiry to start flickering
  private _shieldFlickerAccum: number = 0; // accumulated phase for flicker oscillation

  // Shield spawn scale-up animation (mirrors enemy spawn grow)
  private _shieldScaling: boolean = false;
  private _shieldScaleTimer: number = 0;
  private _shieldBaseScale: Vec3 = Vec3.one;

  @subscribe(OnEntityStartEvent)
  onStart(): void {
    if (NetworkingService.get().isServerContext()) return;
    this._transform = this.entity.getComponent(TransformComponent)!;
  }

  @subscribe(OnEntityDestroyEvent)
  onDestroy(): void {
    // Catch-all: if the entity is destroyed externally (e.g. level transition cleanup),
    // ensure the shield sphere is also destroyed. The null-check in _destroyShieldVisual
    // makes this safe to call even if _die() or _reachEnd() already cleaned it up.
    this._destroyShieldVisual();
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

    // Glacial Lens relic: reduce fireball speed by 40%
    if (this._defId === 'fireball') {
      const fireballReduction = RelicService.get().getFireballSpeedReduction();
      if (fireballReduction > 0) {
        this._speed *= (1 - fireballReduction);
        console.log(`[EnemyController] Glacial Lens reduced fireball speed by ${(fireballReduction * 100).toFixed(0)}%`);
      }
    }
    this._reward      = Math.round(def.reward * runRewardMult);
    this._wpIndex = 0;
    this._subT    = 0;
    this._alive   = true;

    this._baseScale = this._transform.localScale.x;
    const startPos = PathService.get().getWorldPositionInSubPath(0, 0);
    this._transform.worldPosition = startPos;
    this._enemyId = EnemyService.get().register(this.entity, this._defId, this._hp, startPos.x, startPos.z);

    // Straight-line mode (followPath: false or legacy straightLine: true)
    this._straightLine = def.followPath === false || (def.straightLine ?? false);
    if (this._straightLine) {
      this._straightLineStartX = startPos.x;
      this._straightLineStartZ = startPos.z;
      // End X is the base (last waypoint row). Use row GRID_ROWS-1 mapped to world X.
      const endPos = PathService.get().cellToWorld(Math.round((startPos.z - GRID_ORIGIN_Z) / CELL_HEIGHT), GRID_ROWS - 1);
      this._straightLineEndX = endPos.x;
      this._lastCheckedCol = -1;
      this._lastCheckedRow = -1;
      console.log(`[EnemyController] Straight-line boss spawned at X=${startPos.x.toFixed(2)}, targeting endX=${this._straightLineEndX.toFixed(2)}`);
    }

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

    // Compute spawn scale duration: inversely proportional to speed
    // Slower enemies (e.g. 0.35) get longer duration (~2s), faster enemies (e.g. 2.5) get shorter (~0.4s)
    this._spawnScaleDuration = Math.min(
      EnemyController.SPAWN_SCALE_MAX_DURATION,
      Math.max(
        EnemyController.SPAWN_SCALE_MIN_DURATION,
        EnemyController.SPAWN_SCALE_BASE_DURATION * (EnemyController.SPAWN_SCALE_BASE_SPEED / this._speed)
      )
    );
    console.log(`[EnemyController] Enemy ${this._defId} speed=${this._speed.toFixed(2)} spawnScaleDuration=${this._spawnScaleDuration.toFixed(2)}s`);

    // Start spawn scale-up animation
    this._spawnScaling = true;
    this._spawnScaleTimer = 0;
    const startScale = this._baseScale * EnemyController.SPAWN_SCALE_START;
    this._transform.localScale = new Vec3(startScale, startScale, startScale);
  }

  private static readonly PILLAR_BOSS_DAMAGE_CAP = 20;

  @subscribe(Events.TakeDamage)
  onTakeDamage(p: Events.TakeDamagePayload): void {
    if (!this._alive || p.enemyId !== this._enemyId) return;

    // Ward Breaker relic: instantly destroy shield on hit
    if (this._shieldActive && RelicService.get().getWardBreaker() > 0) {
      this._shieldActive = false;
      EnemyService.get().setShieldActive(this._enemyId, false);
      this._destroyShieldVisual();
      console.log(`[EnemyController] Ward Breaker destroyed shield on enemy ${this._enemyId}`);
      // Damage passes through below
    } else if (this._shieldActive) {
      console.log(`[EnemyController] Shield blocked ${p.damage} damage on enemy ${this._enemyId}`);
      return;
    }

    // Cap pillar (singleUse) damage against boss enemies
    let damage = p.damage;
    if (p.props.singleUse === true) {
      const def = EnemyService.get().find(this._defId);
      if (def && def.isBoss) {
        damage = Math.min(damage, EnemyController.PILLAR_BOSS_DAMAGE_CAP);
        console.log(`[EnemyController] Pillar damage capped to ${damage} for boss ${this._defId}`);
      }
    }

    this._lastHitTowerDefId = (p.props.towerDefId as string) ?? '';
    this._hitFlashTimer = EnemyController.HIT_FLASH_DURATION;
    this._squashTimer = EnemyController.SQUASH_DURATION;
    this._applyColor(EnemyController.HIT_COLOR);

    this._hp -= damage;
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
      if (this._squashTimer <= 0 && !this._spawnScaling) {
        this._transform.localScale = new Vec3(this._baseScale, this._baseScale, this._baseScale);
      } else if (!this._spawnScaling) {
        const t = this._squashTimer / EnemyController.SQUASH_DURATION;
        const s = t * t * (3 - 2 * t);
        const xz = this._baseScale * (1 + (EnemyController.SQUASH_XZ - 1) * s);
        const y  = this._baseScale * (1 + (EnemyController.SQUASH_Y  - 1) * s);
        this._transform.localScale = new Vec3(xz, y, xz);
      }
    }

    // Spawn scale-up animation (ease-out)
    if (this._spawnScaling) {
      this._spawnScaleTimer += p.deltaTime;
      const t = Math.min(this._spawnScaleTimer / this._spawnScaleDuration, 1.0);
      // Ease-out: 1 - (1-t)^2
      const eased = 1 - (1 - t) * (1 - t);
      const scale = this._baseScale * (EnemyController.SPAWN_SCALE_START + (1 - EnemyController.SPAWN_SCALE_START) * eased);
      this._transform.localScale = new Vec3(scale, scale, scale);
      if (t >= 1.0) {
        this._spawnScaling = false;
        this._transform.localScale = new Vec3(this._baseScale, this._baseScale, this._baseScale);
      }
    }

    // Shield sphere scale-up animation (matches enemy spawn grow)
    if (this._shieldScaling && this._shieldEntity) {
      this._shieldScaleTimer += p.deltaTime;
      const t = Math.min(this._shieldScaleTimer / this._spawnScaleDuration, 1.0);
      const eased = 1 - (1 - t) * (1 - t);
      const fraction = EnemyController.SPAWN_SCALE_START + (1 - EnemyController.SPAWN_SCALE_START) * eased;
      const shieldTransform = this._shieldEntity.getComponent(TransformComponent);
      if (shieldTransform) {
        shieldTransform.localScale = new Vec3(
          this._shieldBaseScale.x * fraction,
          this._shieldBaseScale.y * fraction,
          this._shieldBaseScale.z * fraction,
        );
      }
      if (t >= 1.0) {
        this._shieldScaling = false;
        if (shieldTransform) {
          shieldTransform.localScale = this._shieldBaseScale;
        }
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

    // --- Straight-line boss movement ---
    if (this._straightLine) {
      const speedFactor = EnemyService.get().get(this._enemyId)?.speedFactor ?? 1;
      const moveAmount = this._speed * speedFactor * dt;
      const pos = this._transform.worldPosition;
      // Move along -X axis (toward base, which is lower X)
      const newX = pos.x - moveAmount;
      this._transform.worldPosition = new Vec3(newX, pos.y, pos.z);

      // Check grid cell for tower destruction
      const col = Math.round((pos.z - GRID_ORIGIN_Z) / CELL_HEIGHT);
      const row = GRID_ROWS - 1 - Math.round((newX - GRID_ORIGIN_X) / CELL_WIDTH);
      if (col >= 0 && col < GRID_COLS && row >= 0 && row < GRID_ROWS) {
        if (col !== this._lastCheckedCol || row !== this._lastCheckedRow) {
          this._lastCheckedCol = col;
          this._lastCheckedRow = row;
          const tower = TowerService.get().getAt(col, row);
          if (tower) {
            console.log(`[EnemyController] Cave boss destroying tower at col=${col}, row=${row}`);
            TowerService.get().removeTowerAt(col, row);
            TowerDestroyAnimService.get().beginCollapseOnly(tower.entity);
          }
        }
      }

      // Update enemy service record
      EnemyService.get().update(this._enemyId, newX, pos.z, 0, this._hp);

      // Face toward -X (forward movement direction)
      const ahead = new Vec3(newX - 1, pos.y, pos.z);
      this._transform.lookAt(ahead, Vec3.up);

      // Update shield sphere position
      if (this._shieldEntity) {
        const shieldTransform = this._shieldEntity.getComponent(TransformComponent);
        if (shieldTransform) {
          shieldTransform.worldPosition = new Vec3(newX, pos.y, pos.z);
        }
      }

      // Check if reached the end
      if (newX <= this._straightLineEndX) {
        console.log(`[EnemyController] Cave boss reached the base`);
        this._reachEnd();
      }
      return;
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
    this._spawnScaling = false;
    EnemyService.get().unregister(this._enemyId);
    this._destroyShieldVisual();

    const pos = this._transform.worldPosition;
    const p = new Events.EnemyDiedPayload();
    p.enemyId = this._enemyId;
    p.reward  = this._reward + SkillTreeService.get().getGoldPerKillBonus();
    p.worldX  = pos.x;
    p.worldZ  = pos.z;
    p.killerTowerDefId = this._lastHitTowerDefId;
    p.defId = this._defId;
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

    // Cave boss instant-kills (sets lives to 0) instead of removing 1 life
    if (this._defId === 'caveBoss') {
      console.log('[EnemyController] Cave boss reached the base — instant kill!');
      ResourceService.get().loseAllLives();
    } else {
      ResourceService.get().loseLife();
    }

    const p = new Events.EnemyReachedEndPayload();
    p.enemyId = this._enemyId;
    EventService.sendLocally(Events.EnemyReachedEnd, p);
    this._destroyShieldVisual();
    this.entity.destroy();
  }

  // ── Shield Visual ──────────────────────────────────────────────────────────

  private _spawnShieldVisual(): void {
    this._shieldFlickerAccum = 0;
    this._shieldScaling = true;
    this._shieldScaleTimer = 0;
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
      // Start shield at 25% scale and grow to full
      const shieldTransform = entity.getComponent(TransformComponent);
      if (shieldTransform) {
        this._shieldBaseScale = shieldTransform.localScale;
        const startFraction = EnemyController.SPAWN_SCALE_START;
        shieldTransform.localScale = new Vec3(
          this._shieldBaseScale.x * startFraction,
          this._shieldBaseScale.y * startFraction,
          this._shieldBaseScale.z * startFraction,
        );
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
