/**
 * PathService — Waypoint path management and world coordinate conversion.
 *
 * Reads PATH_WAYPOINTS_LEVEL_0 from LevelDefs in onReady(). Builds ISubPath segments.
 * prewarm(): no-op — path is baked into the scene as a texture/decor.
 * getWorldPositionInSubPath(wpIndex, subT): interpolates world position along a segment.
 * getGlobalT(wpIndex, subT): converts segment position to global path progress (used for targeting).
 * isPathCell(col, row): checks if a grid cell is occupied by the path (blocks tower placement).
 * cellToWorld(col, row): converts grid coords to world coords.
 * Note: col → Z axis, row → X axis (row 0 = top of screen).
 */
import { Service, Vec3 } from 'meta/worlds';
import { service, subscribe } from 'meta/worlds';
import { OnServiceReadyEvent } from 'meta/worlds';
import { CELL_WIDTH, CELL_HEIGHT, GRID_COLS, GRID_ROWS, GRID_ORIGIN_X, GRID_ORIGIN_Z, GROUND_Y } from '../Constants';
import { LEVEL_DEFS } from '../Defs/LevelDefs';

interface IPathSegment {
  startX: number;
  startZ: number;
  endX: number;
  endZ: number;
  length: number;
  cumLength: number;
}

interface ISubPath {
  segments: IPathSegment[];
  length: number;
}

@service()
export class PathService extends Service {
  private _waypoints: ReadonlyArray<readonly [number, number]> = [];
  private _subPaths:   ISubPath[] = [];
  private _pathCells:  Set<number> = new Set();

  @subscribe(OnServiceReadyEvent)
  onReady(): void {
    this._waypoints = LEVEL_DEFS[0].pathWaypoints;
    this._buildPath();
  }

  async prewarm(): Promise<void> {
    // Path is baked into the scene as a texture — nothing to spawn.
  }

  getWaypointCount(): number { return this._waypoints.length; }

  getSubPathLength(wpIndex: number): number {
    return this._subPaths[wpIndex]?.length ?? 0;
  }

  getWorldPositionInSubPath(wpIndex: number, subT: number): Vec3 {
    const sub = this._subPaths[wpIndex];
    if (!sub || sub.segments.length === 0) {
      const [c, r] = this._waypoints[Math.min(wpIndex, this._waypoints.length - 1)];
      return this.cellToWorld(c, r);
    }
    const t = Math.max(0, Math.min(subT, sub.length));
    for (const seg of sub.segments) {
      const localT = t - seg.cumLength;
      if (localT <= seg.length) {
        const alpha = seg.length > 0 ? localT / seg.length : 0;
        return new Vec3(
          seg.startX + (seg.endX - seg.startX) * alpha,
          GROUND_Y,
          seg.startZ + (seg.endZ - seg.startZ) * alpha,
        );
      }
    }
    const last = sub.segments[sub.segments.length - 1];
    return new Vec3(last.endX, GROUND_Y, last.endZ);
  }

  getGlobalT(wpIndex: number, subT: number): number {
    let total = 0;
    for (let i = 0; i < wpIndex && i < this._subPaths.length; i++) {
      total += this._subPaths[i].length;
    }
    return total + subT;
  }

  isPathCell(col: number, row: number): boolean {
    return this._pathCells.has(col * 100 + row);
  }

  // col → Z axis, row → X axis (row 0 = top)
  cellToWorld(col: number, row: number): Vec3 {
    return new Vec3(
      GRID_ORIGIN_X + (GRID_ROWS - 1 - row) * CELL_WIDTH,
      GROUND_Y,
      GRID_ORIGIN_Z + col * CELL_HEIGHT,
    );
  }

  // ── Private ──────────────────────────────────────────────────────────────────

  private _buildPath(): void {
    this._subPaths  = [];
    this._pathCells = new Set();

    for (let i = 0; i < this._waypoints.length - 1; i++) {
      const [c0, r0] = this._waypoints[i];
      const [c1, r1] = this._waypoints[i + 1];

      const start = this.cellToWorld(c0, r0);
      const end   = this.cellToWorld(c1, r1);
      const dx     = end.x - start.x;
      const dz     = end.z - start.z;
      const length = Math.sqrt(dx * dx + dz * dz);

      const subSeg: IPathSegment = { startX: start.x, startZ: start.z, endX: end.x, endZ: end.z, length, cumLength: 0 };
      this._subPaths.push({ segments: [subSeg], length });

      // Mark all cells along this waypoint segment
      const steps = Math.max(Math.abs(c1 - c0), Math.abs(r1 - r0));
      for (let step = 0; step <= steps; step++) {
        const col = Math.round(c0 + (c1 - c0) * (step / steps));
        const row = Math.round(r0 + (r1 - r0) * (step / steps));
        this._pathCells.add(col * 100 + row);
      }
    }
  }
}
