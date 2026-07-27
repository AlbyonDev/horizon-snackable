/**
 * EnemyService — Enemy def catalog, live registry, and spawn logic.
 *
 * Catalog: find(id), all() — reads ENEMY_DEFS in onReady().
 * Registry: register(), unregister(), update(), get(), getAll() — tracks live enemies.
 *   Each IEnemyRecord stores: entity, defId, worldX, worldZ, pathT, hp, maxHp, speedFactor.
 *   worldX/Z updated every frame by EnemyController — used by TargetingService and FloatingTextService.
 *   speedFactor modified by SlowService; read by EnemyController each frame.
 * spawn(enemyId, waveIndex): spawns enemy entity from template, sends InitEnemy to it.
 * Destroys all live entities and clears registry on RestartGame.
 */
import { Service, EventService, WorldService, NetworkMode, Quaternion, Vec3 } from 'meta/worlds';
import type { Entity } from 'meta/worlds';
import { service, subscribe } from 'meta/worlds';
import { OnServiceReadyEvent } from 'meta/worlds';
import type { IEnemyDef } from '../Types';
import { Events } from '../Types';
import { ENEMY_DEFS } from '../Defs/EnemyDefs';
import {  } from '../Constants';

// ── Record ────────────────────────────────────────────────────────────────────

export interface IEnemyRecord {
  entity: Entity;
  defId: string;
  worldX: number;
  worldZ: number;
  pathT: number;
  hp: number;
  maxHp: number;
  speedFactor: number; // multiplier applied each frame; 1 = normal, <1 = slowed
}

// ── Service ───────────────────────────────────────────────────────────────────

@service()
export class EnemyService extends Service {

  // ── Catalog ──────────────────────────────────────────────────────────────────
  private _defs: Map<string, IEnemyDef> = new Map();

  @subscribe(OnServiceReadyEvent)
  onReady(): void {
    for (const def of ENEMY_DEFS) this._defs.set(def.id, def);
  }

  find(id: string): IEnemyDef | undefined { return this._defs.get(id); }
  all(): IEnemyDef[] { return [...this._defs.values()]; }

  // ── Registry ─────────────────────────────────────────────────────────────────
  private _enemies: Map<number, IEnemyRecord> = new Map();
  private _nextId: number = 0;

  register(entity: Entity, defId: string, maxHp: number, worldX: number, worldZ: number): number {
    const id = this._nextId++;
    this._enemies.set(id, { entity, defId, worldX, worldZ, pathT: 0, hp: maxHp, maxHp, speedFactor: 1 });
    return id;
  }

  unregister(id: number): void {
    this._enemies.delete(id);
  }

  update(id: number, worldX: number, worldZ: number, pathT: number, hp: number): void {
    const rec = this._enemies.get(id);
    if (!rec) return;
    rec.worldX = worldX;
    rec.worldZ = worldZ;
    rec.pathT  = pathT;
    rec.hp     = hp;
  }

  setSpeedFactor(id: number, factor: number): void {
    const rec = this._enemies.get(id);
    if (rec) rec.speedFactor = factor;
  }

  get(id: number): IEnemyRecord | undefined { return this._enemies.get(id); }
  getAll(): ReadonlyMap<number, IEnemyRecord> { return this._enemies; }
  get count(): number { return this._enemies.size; }

  @subscribe(Events.LevelSelected)
  onLevelSelected(_p: Events.LevelSelectedPayload): void {
    // Destroy any leftover enemies from previous level
    console.log(`[EnemyService] LevelSelected — destroying ${this._enemies.size} leftover enemies`);
    for (const rec of this._enemies.values()) rec.entity.destroy();
    this.clear();
  }

  @subscribe(Events.RestartGame)
  onRestart(_p: Events.RestartGamePayload): void {
    for (const rec of this._enemies.values()) rec.entity.destroy();
    this.clear();
  }

  clear(): void {
    this._enemies.clear();
    this._nextId = 0;
  }

  // ── Spawn ─────────────────────────────────────────────────────────────────────

  async spawn(enemyId: string, waveIndex: number): Promise<void> {
    const def = this._defs.get(enemyId);
    if (!def) return;

    const entity = await WorldService.get().spawnTemplate({
      templateAsset: def.template,
      position: new Vec3(0, -100, 0),
      rotation: Quaternion.identity,
      networkMode: NetworkMode.LocalOnly,
    }).catch(() => null);

    if (!entity) return;

    const initP = new Events.InitEnemyPayload();
    initP.defId     = enemyId;
    initP.waveIndex = waveIndex;
    EventService.sendLocally(Events.InitEnemy, initP, { eventTarget: entity });
  }
}
