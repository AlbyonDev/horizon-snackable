/**
 * GroundBiomeController — Swaps the ground plane's material based on the active biome.
 * Also toggles mesh visibility based on game phase so the ground plane is hidden
 * during non-gameplay screens (Overworld, Idle, GameOver, Victory).
 *
 * Component Attachment: Scene entity (the ground Plane in space.hstf)
 * Component Networking: Local (client-only visual, not networked)
 * Component Ownership: Not Networked — executes on all clients via ExecuteOn.Owner
 *
 * Listens for Events.BiomeChanged, loads the corresponding material asset,
 * and applies it to this entity's MaterialComponent part 0.
 * Listens for Events.GamePhaseChanged to show/hide the ground mesh.
 */
import {
  Component,
  OnEntityStartEvent,
  NetworkingService,
  ExecuteOn,
  component,
  subscribe,
  property,
  Material,
  MaterialAsset,
  MaterialComponent,
  MeshComponent,
} from 'meta/worlds';
import type { Maybe } from 'meta/worlds';

import { Events, GamePhase } from '../Types';

// Pre-defined material asset references (static string literals required by MHS)
const GRASS_MATERIAL = new MaterialAsset('@Models/Environment/Grass.material');
const SNOW_MATERIAL = new MaterialAsset('@Models/Environment/Snow.material');
const VOLCANO_MATERIAL = new MaterialAsset('@Models/Environment/Volcano.material');

@component()
export class GroundBiomeController extends Component {
  private materialComp: Maybe<MaterialComponent> = null;
  private meshComp: Maybe<MeshComponent> = null;

  @subscribe(OnEntityStartEvent, { execution: ExecuteOn.Owner })
  onStart(): void {
    if (NetworkingService.get().isServerContext()) return;
    this.materialComp = this.entity.getComponent(MaterialComponent);
    if (!this.materialComp) {
      console.log('[GroundBiomeController] No MaterialComponent found on entity');
    }
    this.meshComp = this.entity.getComponent(MeshComponent);
    // Hide by default — ground should not be visible until gameplay starts
    if (this.meshComp) {
      this.meshComp.isVisibleSelf = false;
    }
  }

  @subscribe(Events.GamePhaseChanged, { execution: ExecuteOn.Owner })
  onGamePhaseChanged(payload: Events.GamePhaseChangedPayload): void {
    if (NetworkingService.get().isServerContext()) return;
    if (!this.meshComp) return;

    // Show ground only during gameplay phases (including Victory so it stays visible behind relic choice UI)
    const isGameplay =
      payload.phase === GamePhase.Build ||
      payload.phase === GamePhase.Wave ||
      payload.phase === GamePhase.WaveClear ||
      payload.phase === GamePhase.Victory;

    this.meshComp.isVisibleSelf = isGameplay;
    console.log(`[GroundBiomeController] Mesh visible: ${isGameplay} (phase: ${payload.phase})`);
  }

  @subscribe(Events.BiomeChanged, { execution: ExecuteOn.Owner })
  onBiomeChanged(payload: Events.BiomeChangedPayload): void {
    if (NetworkingService.get().isServerContext()) return;
    if (!this.materialComp) return;

    console.log(`[GroundBiomeController] Applying biome: ${payload.biomeId}`);
    void this._applyBiomeMaterial(payload.biomeId);
  }

  private async _applyBiomeMaterial(biomeId: string): Promise<void> {
    let matAsset: MaterialAsset;
    switch (biomeId) {
      case 'snow':
        matAsset = SNOW_MATERIAL;
        break;
      case 'volcano':
        matAsset = VOLCANO_MATERIAL;
        break;
      case 'grass':
      default:
        matAsset = GRASS_MATERIAL;
        break;
    }

    try {
      const mat = await Material.loadAsset(matAsset);
      if (this.materialComp) {
        this.materialComp.setPartMaterial(0, mat);
        console.log(`[GroundBiomeController] Material applied for biome: ${biomeId}`);
      }
    } catch (e) {
      console.log(`[GroundBiomeController] Failed to load material for biome: ${biomeId}`);
    }
  }
}
