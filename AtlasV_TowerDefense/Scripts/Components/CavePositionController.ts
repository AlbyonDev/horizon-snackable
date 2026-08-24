/**
 * CavePositionController — Dynamically repositions the cave entrance entity
 * to align with the first waypoint of the procedurally generated path.
 * Swaps the cave mesh/material to match the active biome:
 *   - snow → igloo mesh + igloo material
 *   - grass/volcano → cave mesh + cave material (or boss variant on boss levels)
 *
 * Component Attachment: Scene Entity (CaveEntrance in space.hstf)
 * Component Networking: Local (scene-placed entity, same result on all clients from deterministic path)
 * Component Ownership: Not Networked (local scene entity)
 */
import {
  Component,
  component,
  subscribe,
  TransformComponent,
  Vec3,
  ExecuteOn,
  Material,
  MaterialComponent,
  MeshAsset,
  MeshComponent,
  MaterialAsset,
  NetworkingService,
} from 'meta/worlds';
import type { Maybe } from 'meta/worlds';
import { Events } from '../Types';
import { LevelGeneratorService } from '../Services/LevelGeneratorService';
import { GRID_ORIGIN_X, GRID_ORIGIN_Z, GRID_ROWS, CELL_WIDTH, CELL_HEIGHT, GROUND_Y } from '../Constants';
import { OnEntityStartEvent } from 'meta/worlds';
import { Materials } from '../Assets';
import { OverworldNodeType } from '../Defs/NodeDefs';

// --- Biome-specific mesh & material constants ---
const CAVE_MESH = new MeshAsset('@Models/Cave/CaveEntrance (2).fbx:mesh:/RootNode');
const IGLOO_MESH = new MeshAsset('@Models/Igloo/Igloo (4).fbx:mesh:/RootNode');
const IGLOO_MATERIAL = new MaterialAsset('@Models/Igloo/Igloo (4).material');

@component()
export class CavePositionController extends Component {
  private transform: Maybe<TransformComponent> = null;
  private materialComp: Maybe<MaterialComponent> = null;
  private meshComp: Maybe<MeshComponent> = null;
  private normalMaterial: Maybe<Material> = null;
  private bossMaterial: Maybe<Material> = null;
  private iglooMaterial: Maybe<Material> = null;

  private _currentBiome: string = 'grass';
  private _isBossLevel: boolean = false;

  @subscribe(OnEntityStartEvent, { execution: ExecuteOn.Everywhere })
  onStart(): void {
    this.transform = this.entity.getComponent(TransformComponent);
    this.materialComp = this.entity.getComponent(MaterialComponent);
    this.meshComp = this.entity.getComponent(MeshComponent);

    // Pre-load material variants
    void Material.loadAsset(Materials.CaveEntrance).then((mat) => {
      this.normalMaterial = mat;
    });
    void Material.loadAsset(Materials.BossCaveEntrance).then((mat) => {
      this.bossMaterial = mat;
    });
    void Material.loadAsset(IGLOO_MATERIAL).then((mat) => {
      this.iglooMaterial = mat;
    });
  }

  @subscribe(Events.BiomeChanged, { execution: ExecuteOn.Everywhere })
  onBiomeChanged(payload: Events.BiomeChangedPayload): void {
    if (NetworkingService.get().isServerContext()) return;
    this._currentBiome = payload.biomeId;
    console.log(`[CavePositionController] BiomeChanged received, biomeId=${payload.biomeId}`);
    void this._updateVisuals();
  }

  @subscribe(Events.LevelSelected, { execution: ExecuteOn.Everywhere })
  onLevelSelected(p: Events.LevelSelectedPayload): void {
    if (NetworkingService.get().isServerContext()) return;
    if (!this.transform) {
      this.transform = this.entity.getComponent(TransformComponent);
    }
    if (!this.transform) {
      console.log('[CavePositionController] No TransformComponent found on cave entity');
      return;
    }

    // Get the first waypoint from the level def directly (avoids event-ordering dependency on PathService)
    const levelDef = LevelGeneratorService.get().getLevelDef(p.levelIndex);
    const waypoints = levelDef.pathWaypoints;
    if (!waypoints || waypoints.length === 0) {
      console.log('[CavePositionController] No waypoints in level def');
      return;
    }

    const [col, row] = waypoints[0];

    // Replicate cellToWorld: col → Z, row → X
    const firstWaypointX = GRID_ORIGIN_X + (GRID_ROWS - 1 - row) * CELL_WIDTH;
    const firstWaypointZ = GRID_ORIGIN_Z + col * CELL_HEIGHT;

    // Position cave 1 cell behind the first waypoint (higher X = behind enemy travel direction)
    const caveX = firstWaypointX + 1.2;
    // Offset 0.1 of a cell to the left (screen-left = -Z in world space)
    const caveZ = firstWaypointZ - 0.1;

    this.transform.worldPosition = new Vec3(caveX, GROUND_Y, caveZ);
    console.log(`[CavePositionController] Cave moved to (${caveX}, ${GROUND_Y}, ${caveZ}) — first waypoint col=${col} row=${row}`);

    // Track boss status and update visuals
    this._isBossLevel = p.nodeType === OverworldNodeType.Boss;
    void this._updateVisuals();
  }

  /**
   * Unified visual update: picks mesh + material based on biome and boss state.
   * Snow biome always shows igloo (no boss variant for igloo).
   * Grass/volcano biomes show cave with boss or normal material.
   */
  private async _updateVisuals(): Promise<void> {
    if (!this.meshComp) {
      this.meshComp = this.entity.getComponent(MeshComponent);
    }
    if (!this.materialComp) {
      this.materialComp = this.entity.getComponent(MaterialComponent);
    }

    if (this._currentBiome === 'snow') {
      // Swap to igloo mesh + igloo material; scale up to match cave footprint (~2-3 tiles)
      if (this.meshComp) {
        this.meshComp.mesh = IGLOO_MESH;
        console.log('[CavePositionController] Mesh swapped to igloo (snow biome)');
      }
      if (this.transform) {
        this.transform.localScale = new Vec3(2, 2, 2);
      }
      if (this.materialComp) {
        let mat = this.iglooMaterial;
        if (!mat) {
          try {
            mat = await Material.loadAsset(IGLOO_MATERIAL);
            this.iglooMaterial = mat;
          } catch (e) {
            console.log('[CavePositionController] Failed to load igloo material');
            return;
          }
        }
        this.materialComp.setPartMaterial(0, mat);
        console.log('[CavePositionController] Material swapped to igloo');
      }
    } else {
      // Swap to cave mesh + appropriate cave material; reset scale to default
      if (this.meshComp) {
        this.meshComp.mesh = CAVE_MESH;
        console.log(`[CavePositionController] Mesh swapped to cave (${this._currentBiome} biome)`);
      }
      if (this.transform) {
        this.transform.localScale = new Vec3(1, 1, 1);
      }
      if (this.materialComp) {
        const isBoss = this._isBossLevel;
        let mat = isBoss ? this.bossMaterial : this.normalMaterial;
        if (!mat) {
          const matAsset = isBoss ? Materials.BossCaveEntrance : Materials.CaveEntrance;
          try {
            mat = await Material.loadAsset(matAsset);
            if (isBoss) { this.bossMaterial = mat; } else { this.normalMaterial = mat; }
          } catch (e) {
            console.log(`[CavePositionController] Failed to load cave material (boss=${isBoss})`);
            return;
          }
        }
        this.materialComp.setPartMaterial(0, mat);
        console.log(`[CavePositionController] Material swapped to ${isBoss ? 'boss' : 'normal'} cave`);
      }
    }
  }
}
