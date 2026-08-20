/**
 * TeepeeController — Repositions the Teepee to the last waypoint of
 * the procedurally generated path (the path destination / final enemy target)
 * whenever a level is selected.
 *
 * Component Attachment: Scene Entity (Teepee template instance in space.hstf)
 * Component Networking: Local (game runs client-side)
 * Component Ownership: Not Networked
 *
 * Listens to Events.LevelSelected, reads the generated path from
 * LevelGeneratorService, converts the last [col,row] waypoint to world
 * coordinates via PathService.cellToWorld, and teleports the entity there.
 *
 * The last waypoint is where enemies are heading — the village/base to defend.
 */
import {
  Component,
  TransformComponent,
  Vec3,
  ExecuteOn,
  NetworkingService,
} from 'meta/worlds';
import { component, subscribe } from 'meta/worlds';
import { OnEntityStartEvent } from 'meta/worlds';
import type { Maybe } from 'meta/worlds';
import { Events } from '../Types';
import { LevelGeneratorService } from '../Services/LevelGeneratorService';
import { PathService } from '../Services/PathService';

/**
 * Offset applied to the Teepee's X position relative to the last waypoint.
 * Adjust this value to move the teepee closer to or further from the path end.
 */
const TEEPEE_X_OFFSET_FROM_PATH_END = -1;

@component()
export class TeepeeController extends Component {
  private _transform: Maybe<TransformComponent> = null;

  @subscribe(OnEntityStartEvent, { execution: ExecuteOn.Everywhere })
  onStart(): void {
    this._transform = this.entity.getComponent(TransformComponent);
    console.log(`[TeepeeController] onStart - transform: ${this._transform ? 'OK' : 'NULL'}`);
  }

  @subscribe(Events.LevelSelected, { execution: ExecuteOn.Everywhere })
  onLevelSelected(p: Events.LevelSelectedPayload): void {
    if (NetworkingService.get().isServerContext()) return;
    console.log(`[TeepeeController] LevelSelected received, levelIndex=${p.levelIndex}`);
    if (!this._transform) {
      console.log('[TeepeeController] _transform is null, cannot move teepee');
      return;
    }

    const levelDef = LevelGeneratorService.get().getLevelDef(p.levelIndex);
    const waypoints = levelDef.pathWaypoints;
    if (waypoints.length === 0) {
      console.log('[TeepeeController] No waypoints in level, skipping reposition');
      return;
    }

    const [col, row] = waypoints[waypoints.length - 1];
    const worldPos = PathService.get().cellToWorld(col, row);

    // Use teleportTo() — direct localPosition assignment is silently blocked by
    // the StaticCollision PhysicsBodyComponent on this entity.
    const targetPos = new Vec3(worldPos.x + TEEPEE_X_OFFSET_FROM_PATH_END, this._transform.worldPosition.y, worldPos.z);
    this._transform.teleportTo(targetPos, this._transform.worldRotation);
    console.log(`[TeepeeController] Teleported teepee to last waypoint [${col},${row}] -> world (${targetPos.x.toFixed(2)}, ${targetPos.y.toFixed(2)}, ${targetPos.z.toFixed(2)})`);
  }
}
