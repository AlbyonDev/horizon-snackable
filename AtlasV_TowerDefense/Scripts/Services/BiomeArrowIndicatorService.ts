/**
 * BiomeArrowIndicatorService — Spawns floating arrow sprites above placed towers
 * to indicate active biome buffs/debuffs.
 *
 * Attached to: scene (auto-registered service).
 * Lifecycle:
 *   - On TowerPlaced: checks biome modifier state, spawns buff/debuff arrow above tower.
 *   - On TowerSold: destroys the arrow for that tower.
 *   - On RestartGame / LevelSelected: destroys all arrows.
 *   - Per-frame: bobs all active arrows with a gentle Y oscillation.
 */
import { Service, WorldService, NetworkMode, Vec3, Quaternion, TransformComponent, NetworkingService } from 'meta/worlds';
import type { Entity } from 'meta/worlds';
import { service, subscribe } from 'meta/worlds';
import { OnWorldUpdateEvent, ExecuteOn } from 'meta/worlds';
import type { OnWorldUpdateEventPayload } from 'meta/worlds';
import { Events } from '../Types';
import { Assets } from '../Assets';
import { GROUND_Y } from '../Constants';
import { getBiomeModifierState } from '../Defs/BiomeModifierDefs';
import { SaveService } from './SaveService';
import { PathService } from './PathService';
import { TowerService } from './TowerService';

// — Arrow indicator constants ———————————————————————————————————
const ARROW_Y_OFFSET = 1.8;          // height above ground (Y axis = depth toward camera)
const BOB_AMPLITUDE  = 0.1;          // how far the arrow bobs on screen (X axis = screen vertical)
const BOB_SPEED      = 5.0;          // radians per second (faster oscillation)
const SCALE_MIN      = 0.6;          // scale pulse minimum
const SCALE_MAX      = 0.75;         // scale pulse maximum
const SCALE_SPEED    = 4.0;          // scale pulse speed (radians per second)

/** Key for the active arrows map: "col,row" */
function cellKey(col: number, row: number): string { return `${col},${row}`; }

@service()
export class BiomeArrowIndicatorService extends Service {
  private _arrows: Map<string, Entity> = new Map();
  private _baseX: Map<string, number> = new Map();  // store base X position per arrow
  private _elapsed: number = 0;

  // ——— Tower placed: check modifier and spawn arrow ———————————————

  @subscribe(Events.TowerPlaced)
  onTowerPlaced(p: Events.TowerPlacedPayload): void {
    if (NetworkingService.get().isServerContext()) return;
    this._spawnArrowForTower(p.defId, p.col, p.row);
  }

  // ——— Tower sold: remove arrow ———————————————————————————————————

  @subscribe(Events.TowerSold)
  onTowerSold(p: Events.TowerSoldPayload): void {
    this._removeArrow(p.col, p.row);
  }

  // ——— Restart / Level change: clear all arrows ——————————————————

  @subscribe(Events.RestartGame)
  onRestart(_p: Events.RestartGamePayload): void {
    this._destroyAll();
  }

  @subscribe(Events.LevelSelected)
  onLevelSelected(_p: Events.LevelSelectedPayload): void {
    this._destroyAll();
  }

  // ——— Biome changed: refresh all active towers ——————————————————

  @subscribe(Events.BiomeChanged)
  onBiomeChanged(_p: Events.BiomeChangedPayload): void {
    if (NetworkingService.get().isServerContext()) return;
    this._refreshAll();
  }

  // ——— Per-frame bob ——————————————————————————————————————————————

  @subscribe(OnWorldUpdateEvent, { execution: ExecuteOn.Owner })
  onUpdate(p: OnWorldUpdateEventPayload): void {
    if (this._arrows.size === 0) return;
    this._elapsed += p.deltaTime;
    // Bob along X axis (screen vertical: -X = up, +X = down)
    const xOffset = Math.sin(this._elapsed * BOB_SPEED) * BOB_AMPLITUDE;
    // Scale pulse (breathing effect between SCALE_MIN and SCALE_MAX)
    const scaleMid = (SCALE_MIN + SCALE_MAX) / 2;
    const scaleRange = (SCALE_MAX - SCALE_MIN) / 2;
    const scale = scaleMid + Math.sin(this._elapsed * SCALE_SPEED) * scaleRange;

    for (const [key, entity] of this._arrows.entries()) {
      const t = entity.getComponent(TransformComponent);
      if (t) {
        const baseX = this._baseX.get(key) ?? t.worldPosition.x;
        // Set X position absolutely from base + bob offset; Y fixed (depth); Z unchanged
        t.worldPosition = new Vec3(baseX + xOffset, GROUND_Y + ARROW_Y_OFFSET, t.worldPosition.z);
        t.worldScale = new Vec3(scale, scale, scale);
      }
    }
  }

  // ——— Internal ————————————————————————————————————————————————————

  private async _spawnArrowForTower(defId: string, col: number, row: number): Promise<void> {
    const biome = SaveService.get().activeBiome;
    const state = getBiomeModifierState(defId, biome);
    if (state === 'neutral') return;

    // Remove any existing arrow at this cell first
    this._removeArrow(col, row);

    const template = state === 'buff' ? Assets.BiomeArrowBuff : Assets.BiomeArrowDebuff;
    const worldPos = PathService.get().cellToWorld(col, row);
    const spawnPos = new Vec3(worldPos.x, GROUND_Y + ARROW_Y_OFFSET, worldPos.z);

    const entity = await WorldService.get().spawnTemplate({
      templateAsset: template,
      position: spawnPos,
      rotation: Quaternion.identity,
      scale: Vec3.one,
      networkMode: NetworkMode.LocalOnly,
    }).catch(() => null);

    if (entity) {
      const key = cellKey(col, row);
      this._arrows.set(key, entity);
      this._baseX.set(key, worldPos.x);
      console.log(`[BiomeArrowIndicatorService] Spawned ${state} arrow at col=${col} row=${row}`);
    }
  }

  private _removeArrow(col: number, row: number): void {
    const key = cellKey(col, row);
    const entity = this._arrows.get(key);
    if (entity) {
      entity.destroy();
      this._arrows.delete(key);
      this._baseX.delete(key);
    }
  }

  private _destroyAll(): void {
    for (const entity of this._arrows.values()) {
      entity.destroy();
    }
    this._arrows.clear();
    this._baseX.clear();
  }

  private _refreshAll(): void {
    // Destroy existing arrows and re-evaluate all placed towers
    this._destroyAll();
    const towers = TowerService.get().getAll();
    for (const rec of towers.values()) {
      this._spawnArrowForTower(rec.defId, rec.col, rec.row);
    }
  }
}
