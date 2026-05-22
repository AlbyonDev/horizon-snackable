/**
 * PathTileService — Spawns visual path tiles on every path cell using 5 templates.
 *
 * Component Attachment: N/A (Service — instantiated globally)
 * Component Networking: Local (tiles are client-only visuals)
 * Component Ownership: Not Networked
 *
 * Uses 5 templates total:
 *   - 4 pre-rotated corner templates (TL, TR, BR, BL) — spawned with identity rotation
 *   - 1 straight template — rotated at spawn: 0° for horizontal (Left/Right), 90° for vertical (Up/Down)
 *
 * prewarm(): Client-only. Iterates all cells between path waypoints,
 * selects the correct template and rotation based on entry/exit directions.
 *
 * Coordinate mapping: col → Z axis, row → X axis (row 0 = top of screen).
 */
import { Service, Vec3, Quaternion, NetworkMode, WorldService, TemplateAsset } from 'meta/worlds';
import { service, subscribe } from 'meta/worlds';
import { OnServiceReadyEvent, NetworkingService } from 'meta/worlds';
import { GROUND_Y } from '../Constants';
import { PathService } from './PathService';
import { LEVEL_DEFS } from '../Defs/LevelDefs';
import { Assets } from '../Assets';

const LOG_TAG = '[PathTileService]';
const TILE_Y_OFFSET = -0.01;

// Direction vectors in grid space [dCol, dRow]
// col → Z, row → X
enum Dir {
  Up = 0,    // row decreasing (dCol=0, dRow=-1) → moving toward top of screen
  Down = 1,  // row increasing (dCol=0, dRow=+1) → moving toward bottom
  Left = 2,  // col decreasing (dCol=-1, dRow=0) → moving left
  Right = 3, // col increasing (dCol=+1, dRow=0) → moving right
}

function getDir(dCol: number, dRow: number): Dir {
  if (dCol === 0 && dRow < 0) return Dir.Up;
  if (dCol === 0 && dRow > 0) return Dir.Down;
  if (dCol < 0 && dRow === 0) return Dir.Left;
  return Dir.Right;
}

interface TileSelection {
  template: TemplateAsset;
  rotationY: number; // degrees to apply on spawn (Y-axis)
}

/**
 * Select the pre-rotated corner template — no runtime rotation needed.
 *
 * Corner template orientations (baked into the templates):
 *   TL (0°): path connects from Left→Down or Up→Right
 *   TR (90°): path connects from Right→Down or Up→Left
 *   BR (180°): path connects from Right→Up or Down→Left
 *   BL (270°): path connects from Left→Up or Down→Right
 */
function getCornerTile(fromDir: Dir, toDir: Dir): TileSelection {
  if ((fromDir === Dir.Left && toDir === Dir.Down) || (fromDir === Dir.Up && toDir === Dir.Right)) {
    return { template: Assets.PathTileCornerTL, rotationY: 0 };
  }
  if ((fromDir === Dir.Right && toDir === Dir.Down) || (fromDir === Dir.Up && toDir === Dir.Left)) {
    return { template: Assets.PathTileCornerTR, rotationY: 0 };
  }
  if ((fromDir === Dir.Down && toDir === Dir.Left) || (fromDir === Dir.Right && toDir === Dir.Up)) {
    return { template: Assets.PathTileCornerBR, rotationY: 0 };
  }
  // BL: (Down,Right) or (Left,Up)
  return { template: Assets.PathTileCornerBL, rotationY: 0 };
}

/**
 * Select the straight tile with rotation.
 * Single template (Assets.PathTileStraight) rotated:
 *   - Horizontal (Left/Right): rotationY = 0°
 *   - Vertical (Up/Down): rotationY = 90°
 */
function getStraightTile(dir: Dir): TileSelection {
  if (dir === Dir.Left || dir === Dir.Right) {
    return { template: Assets.PathTileStraight, rotationY: 0 };
  }
  // Vertical
  return { template: Assets.PathTileStraight, rotationY: 90 };
}

@service()
export class PathTileService extends Service {
  @subscribe(OnServiceReadyEvent)
  onReady(): void {
    console.log(`${LOG_TAG} Service ready`);
  }

  async prewarm(): Promise<void> {
    if (NetworkingService.get().isServerContext()) return;

    console.log(`${LOG_TAG} Prewarming path tiles...`);

    const waypoints = LEVEL_DEFS[0].pathWaypoints;
    const pathService = PathService.get();

    // Build ordered list of cells with inDir/outDir
    interface CellInfo {
      col: number;
      row: number;
      inDir: Dir | null;
      outDir: Dir | null;
    }

    const orderedCells: CellInfo[] = [];
    const orderedSet = new Set<string>();

    for (let i = 0; i < waypoints.length - 1; i++) {
      const [c0, r0] = waypoints[i];
      const [c1, r1] = waypoints[i + 1];
      const steps = Math.max(Math.abs(c1 - c0), Math.abs(r1 - r0));
      const dColSign = Math.sign(c1 - c0);
      const dRowSign = Math.sign(r1 - r0);
      const segDir = getDir(dColSign, dRowSign);

      // Determine the previous segment direction for the first cell (waypoint)
      let prevDir: Dir | null = null;
      if (i > 0) {
        const [pc0, pr0] = waypoints[i - 1];
        prevDir = getDir(Math.sign(c0 - pc0), Math.sign(r0 - pr0));
      }

      for (let step = 0; step <= steps; step++) {
        if (step === steps && i < waypoints.length - 2) continue;

        const col = Math.round(c0 + (c1 - c0) * step / steps);
        const row = Math.round(r0 + (r1 - r0) * step / steps);
        const key = `${col},${row}`;

        if (orderedSet.has(key)) continue;
        orderedSet.add(key);

        let inDir: Dir | null = null;
        let outDir: Dir | null = null;

        if (step === 0) {
          // Waypoint — may be a corner
          inDir = prevDir;
          outDir = segDir;
        } else if (step === steps) {
          // Last waypoint of entire path
          inDir = segDir;
          outDir = null;
        } else {
          // Mid-segment cell — always straight
          inDir = segDir;
          outDir = segDir;
        }

        orderedCells.push({ col, row, inDir, outDir });
      }
    }

    // Spawn tiles — uses 5 templates (4 corners + 1 straight with rotation)
    const worldService = WorldService.get();
    const spawnPromises: Promise<unknown>[] = [];

    for (const cell of orderedCells) {
      const pos = pathService.cellToWorld(cell.col, cell.row);
      const spawnPos = new Vec3(pos.x, GROUND_Y + TILE_Y_OFFSET, pos.z);

      let tile: TileSelection;

      if (cell.inDir !== null && cell.outDir !== null && cell.inDir !== cell.outDir) {
        // Corner tile — select pre-rotated template
        tile = getCornerTile(cell.inDir, cell.outDir);
      } else {
        // Straight tile — single template with rotation
        const dir = cell.outDir ?? cell.inDir ?? Dir.Down;
        tile = getStraightTile(dir);
      }

      const rotation = tile.rotationY === 0
        ? Quaternion.identity
        : Quaternion.fromEuler(new Vec3(0, tile.rotationY, 0));

      spawnPromises.push(
        worldService.spawnTemplate({
          templateAsset: tile.template,
          position: spawnPos,
          rotation,
          networkMode: NetworkMode.LocalOnly,
        })
      );
    }

    await Promise.all(spawnPromises);
    console.log(`${LOG_TAG} Spawned ${spawnPromises.length} path tiles`);
  }
}
