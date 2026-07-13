/**
 * OrcishFlagController — Repositions the OrcishFlag to the first waypoint of
 * the procedurally generated path whenever a level is selected, and swaps
 * its mesh/material to match the active biome.
 *
 * Component Attachment: Scene Entity (OrcishFlag in space.hstf)
 * Component Networking: Local (game runs client-side)
 * Component Ownership: Not Networked
 *
 * Listens to Events.LevelSelected, reads the generated path from
 * LevelGeneratorService, converts the first [col,row] waypoint to world
 * coordinates via PathService.cellToWorld, and moves the flag there.
 *
 * Listens to Events.BiomeChanged and swaps the Visuals child's mesh and
 * material to the biome-specific flag variant defined in BIOME_DEFS.
 */
import {
  Component,
  TransformComponent,
  Vec3,
  Quaternion,
  ExecuteOn,
  MeshAsset,
  MeshComponent,
  MaterialAsset,
  MaterialComponent,
  Material,
  NetworkingService,
} from 'meta/worlds';
import { component, subscribe } from 'meta/worlds';
import { OnEntityStartEvent } from 'meta/worlds';
import type { Entity, Maybe } from 'meta/worlds';
import { Events } from '../Types';
import { LevelGeneratorService } from '../Services/LevelGeneratorService';
import { PathService } from '../Services/PathService';
import { BIOME_DEFS } from '../Defs/BiomeDefs';

/**
 * Offset applied to the flag's X position relative to the first waypoint.
 * In world space -X = "up on screen" (one row before the path starts).
 * Adjust this value to move the flag closer to or further from the path entrance.
 */
const FLAG_X_OFFSET_FROM_PATH_START = 0;

// Pre-defined mesh asset references per biome
const GRASS_MESH = new MeshAsset('@Models/GameplayObjects/GrassFlag/GrassFlag.fbx:mesh:/RootNode');
const SNOW_MESH = new MeshAsset('@Models/GameplayObjects/SnowFlag/SnowFlag.fbx:mesh:/RootNode');
const VOLCANO_MESH = new MeshAsset('@Models/GameplayObjects/VolcanoFlag/VolcanoFlag.fbx:mesh:/RootNode');

// Pre-defined material asset references per biome
const GRASS_MATERIAL = new MaterialAsset('@Models/GameplayObjects/GrassFlag/GrassFlag.material');
const SNOW_MATERIAL = new MaterialAsset('@Models/GameplayObjects/SnowFlag/SnowFlag.material');
const VOLCANO_MATERIAL = new MaterialAsset('@Models/GameplayObjects/VolcanoFlag/VolcanoFlag.material');

/** Map biome ID → mesh + material */
const BIOME_FLAG_MAP: Record<string, { mesh: MeshAsset; material: MaterialAsset }> = {
  grass: { mesh: GRASS_MESH, material: GRASS_MATERIAL },
  snow: { mesh: SNOW_MESH, material: SNOW_MATERIAL },
  volcano: { mesh: VOLCANO_MESH, material: VOLCANO_MATERIAL },
};

@component()
export class OrcishFlagController extends Component {
  private _transform: Maybe<TransformComponent> = null;
  private _visualsEntity: Maybe<Entity> = null;
  private _meshComp: Maybe<MeshComponent> = null;
  private _materialComp: Maybe<MaterialComponent> = null;

  @subscribe(OnEntityStartEvent, { execution: ExecuteOn.Everywhere })
  onStart(): void {
    this._transform = this.entity.getComponent(TransformComponent);

    // Cache Visuals child entity and its mesh/material components
    const children = this.entity.findChildrenWithName('Visuals', false, {});
    if (children.length > 0) {
      this._visualsEntity = children[0];
      this._meshComp = this._visualsEntity.getComponent(MeshComponent);
      this._materialComp = this._visualsEntity.getComponent(MaterialComponent);
    }

    console.log(`[OrcishFlagController] onStart - transform: ${this._transform ? 'OK' : 'NULL'}, visuals: ${this._visualsEntity ? 'OK' : 'NULL'}, mesh: ${this._meshComp ? 'OK' : 'NULL'}, material: ${this._materialComp ? 'OK' : 'NULL'}`);
  }

  @subscribe(Events.LevelSelected, { execution: ExecuteOn.Everywhere })
  onLevelSelected(p: Events.LevelSelectedPayload): void {
    if (NetworkingService.get().isServerContext()) return;
    console.log(`[OrcishFlagController] LevelSelected received, levelIndex=${p.levelIndex}`);
    if (!this._transform) {
      console.log('[OrcishFlagController] _transform is null, cannot move flag');
      return;
    }

    const levelDef = LevelGeneratorService.get().getLevelDef(p.levelIndex);
    const waypoints = levelDef.pathWaypoints;
    if (waypoints.length === 0) {
      console.log('[OrcishFlagController] No waypoints in level, skipping reposition');
      return;
    }

    const [col, row] = waypoints[0];
    const worldPos = PathService.get().cellToWorld(col, row);

    // Use teleportTo() — direct localPosition assignment is silently blocked by
    // the StaticCollision PhysicsBodyComponent on this entity.
    const targetPos = new Vec3(worldPos.x + FLAG_X_OFFSET_FROM_PATH_START, this._transform.worldPosition.y, worldPos.z);
    this._transform.teleportTo(targetPos, this._transform.worldRotation);
    console.log(`[OrcishFlagController] Teleported flag to offset from first waypoint [${col},${row}] -> world (${targetPos.x.toFixed(2)}, ${targetPos.y.toFixed(2)}, ${targetPos.z.toFixed(2)}), X offset=${FLAG_X_OFFSET_FROM_PATH_START}`);
  }

  @subscribe(Events.BiomeChanged, { execution: ExecuteOn.Everywhere })
  onBiomeChanged(payload: Events.BiomeChangedPayload): void {
    if (NetworkingService.get().isServerContext()) return;
    console.log(`[OrcishFlagController] BiomeChanged received, biomeId=${payload.biomeId}`);
    void this._applyBiomeFlag(payload.biomeId);
  }

  private async _applyBiomeFlag(biomeId: string): Promise<void> {
    const flagDef = BIOME_FLAG_MAP[biomeId] ?? BIOME_FLAG_MAP['grass'];

    // Swap mesh
    if (this._meshComp) {
      this._meshComp.mesh = flagDef.mesh;
      console.log(`[OrcishFlagController] Mesh swapped for biome: ${biomeId}`);
    }

    // Swap material
    if (this._materialComp) {
      try {
        const mat = await Material.loadAsset(flagDef.material);
        this._materialComp.setPartMaterial(0, mat);
        console.log(`[OrcishFlagController] Material applied for biome: ${biomeId}`);
      } catch (e) {
        console.log(`[OrcishFlagController] Failed to load material for biome: ${biomeId}`);
      }
    }
  }
}
