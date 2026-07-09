/**
 * OrcishFlagController — Repositions the OrcishFlag to the first waypoint of
 * the procedurally generated path whenever a level is selected.
 *
 * Component Attachment: Scene Entity (OrcishFlag in space.hstf)
 * Component Networking: Local (game runs client-side)
 * Component Ownership: Not Networked
 *
 * Listens to Events.LevelSelected, reads the generated path from
 * LevelGeneratorService, converts the first [col,row] waypoint to world
 * coordinates via PathService.cellToWorld, and moves the flag there.
 */
import { Component, TransformComponent, Vec3, Quaternion, ExecuteOn } from 'meta/worlds';
import { component, subscribe } from 'meta/worlds';
import { OnEntityStartEvent } from 'meta/worlds';
import { NetworkingService } from 'meta/worlds';
import type { Maybe } from 'meta/worlds';
import { Events } from '../Types';
import { LevelGeneratorService } from '../Services/LevelGeneratorService';
import { PathService } from '../Services/PathService';

/**
 * Offset applied to the flag's X position relative to the first waypoint.
 * In world space -X = "up on screen" (one row before the path starts).
 * Adjust this value to move the flag closer to or further from the path entrance.
 */
const FLAG_X_OFFSET_FROM_PATH_START = 1;

@component()
export class OrcishFlagController extends Component {
  private _transform: Maybe<TransformComponent> = null;

  @subscribe(OnEntityStartEvent, { execution: ExecuteOn.Everywhere })
  onStart(): void {
    this._transform = this.entity.getComponent(TransformComponent);
    console.log(`[OrcishFlagController] onStart - transform: ${this._transform ? 'OK' : 'NULL'}`);
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
}
