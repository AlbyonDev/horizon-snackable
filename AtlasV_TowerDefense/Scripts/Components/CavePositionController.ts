/**
 * CavePositionController — Dynamically repositions the cave entrance entity
 * to align with the first waypoint of the procedurally generated path.
 *
 * Component Attachment: Scene Entity (CaveEntrance in space.hstf)
 * Component Networking: Local (scene-placed entity, same result on all clients from deterministic path)
 * Component Ownership: Not Networked (local scene entity)
 *
 * On each LevelSelected event, reads the first path waypoint from the level def
 * and moves this entity so its Z matches that waypoint's Z, and X sits 1 cell
 * behind (higher X) the waypoint's X.
 */
import {
  Component,
  component,
  subscribe,
  TransformComponent,
  Vec3,
  Service,
  ExecuteOn,
} from 'meta/worlds';
import type { Maybe } from 'meta/worlds';
import { Events } from '../Types';
import { LevelGeneratorService } from '../Services/LevelGeneratorService';
import { GRID_ORIGIN_X, GRID_ORIGIN_Z, GRID_ROWS, CELL_WIDTH, CELL_HEIGHT, GROUND_Y } from '../Constants';
import { OnEntityStartEvent } from 'meta/worlds';

@component()
export class CavePositionController extends Component {
  private transform: Maybe<TransformComponent> = null;

  @subscribe(OnEntityStartEvent, { execution: ExecuteOn.Everywhere })
  onStart(): void {
    this.transform = this.entity.getComponent(TransformComponent);
  }

  @subscribe(Events.LevelSelected, { execution: ExecuteOn.Everywhere })
  onLevelSelected(p: Events.LevelSelectedPayload): void {
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
  }
}
