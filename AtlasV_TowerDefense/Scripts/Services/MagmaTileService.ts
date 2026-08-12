/**
 * MagmaTileService — Spawns magma tiles in clusters on non-path grid cells in the volcano biome.
 *
 * Component Attachment: N/A (Service — instantiated globally)
 * Component Networking: Local (tiles are client-only visuals)
 * Component Ownership: Not Networked
 *
 * Behavior:
 *   - Only active in the 'volcano' biome
 *   - Places magma tiles in clusters (2×2, 2×3, 3×2, 1×3, 3×1, 2×1, 1×2) adjacent to path
 *   - Uses tiered scaling: +1/run (1-19), +1/2runs (20-49), +1/3runs (50-99), +1/4runs (100+)
 *   - Uses SDF rounded-rect shader with per-instance material params for smooth edges
 *   - Corners are rounded when BOTH adjacent edges have no magma neighbor
 *   - Exposes isMagmaCell(col, row) for placement blocking
 *   - Cleans up on RestartGame / LevelSelected
 */
import { Service, WorldService, NetworkMode, Vec3, Quaternion, Material, MaterialComponent } from 'meta/worlds';
import { service, subscribe } from 'meta/worlds';
import { OnServiceReadyEvent, NetworkingService } from 'meta/worlds';
import type { Entity } from 'meta/worlds';
import { GRID_COLS, GRID_ROWS, GROUND_Y, LOCKED_COLS } from '../Constants';
import { PathService } from './PathService';
import { LevelGeneratorService } from './LevelGeneratorService';
import { SaveService } from './SaveService';
import { Events } from '../Types';
import { Assets, Materials } from '../Assets';

const LOG_TAG = '[MagmaTileService]';
const TILE_Y_OFFSET = -0.005; // slightly above ground, below path tiles
const BASE_MAGMA_COUNT = 8;   // magma tiles in run 1

/** Cluster shape definitions as [col, row] offsets from the anchor cell. */
type ClusterShape = Array<{ dc: number; dr: number }>;

const CLUSTER_SHAPES: ClusterShape[] = [
  // 2×2 square (4 cells)
  [{ dc: 0, dr: 0 }, { dc: 1, dr: 0 }, { dc: 0, dr: 1 }, { dc: 1, dr: 1 }],
  // 2×3 vertical rectangle (6 cells)
  [{ dc: 0, dr: 0 }, { dc: 1, dr: 0 }, { dc: 0, dr: 1 }, { dc: 1, dr: 1 }, { dc: 0, dr: 2 }, { dc: 1, dr: 2 }],
  // 3×2 horizontal rectangle (6 cells)
  [{ dc: 0, dr: 0 }, { dc: 1, dr: 0 }, { dc: 2, dr: 0 }, { dc: 0, dr: 1 }, { dc: 1, dr: 1 }, { dc: 2, dr: 1 }],
  // 1×3 vertical strip (3 cells)
  [{ dc: 0, dr: 0 }, { dc: 0, dr: 1 }, { dc: 0, dr: 2 }],
  // 3×1 horizontal strip (3 cells)
  [{ dc: 0, dr: 0 }, { dc: 1, dr: 0 }, { dc: 2, dr: 0 }],
  // 2×1 horizontal (2 cells)
  [{ dc: 0, dr: 0 }, { dc: 1, dr: 0 }],
  // 1×2 vertical (2 cells)
  [{ dc: 0, dr: 0 }, { dc: 0, dr: 1 }],
];

/**
 * Neighbor bitmask constants.
 * Coordinate mapping (matches PathTileService):
 *   col → Z axis, row → X axis (row 0 = top of screen)
 * 
 * These flags are passed directly to the shader's neighborUp/Down/Left/Right params.
 * The shader uses a fixed halfSize=0.52 that extends past the mesh edge on ALL sides,
 * so gaps are impossible regardless of UV orientation. The neighbor flags only control
 * which corners get rounded (cosmetic shaping of the magma group outline).
 */
const N_UP = 1;
const N_DOWN = 2;
const N_LEFT = 4;
const N_RIGHT = 8;

@service()
export class MagmaTileService extends Service {
  private _tiles: Entity[] = [];
  private _materialInstances: Material[] = [];
  private _magmaCells: Set<string> = new Set();

  @subscribe(OnServiceReadyEvent)
  onReady(): void {
    console.log(`${LOG_TAG} Service ready`);
  }

  @subscribe(Events.LevelSelected)
  onLevelSelected(_p: Events.LevelSelectedPayload): void {
    this._cleanup();
  }

  @subscribe(Events.RestartGame)
  onRestart(_p: Events.RestartGamePayload): void {
    this._cleanup();
  }

  /** Check if a cell is occupied by a magma tile (blocks tower placement). */
  isMagmaCell(col: number, row: number): boolean {
    return this._magmaCells.has(`${col},${row}`);
  }

  /** Prewarm: spawn magma tiles if in volcano biome. Called after PathTileService. */
  async prewarm(): Promise<void> {
    if (NetworkingService.get().isServerContext()) return;

    const activeBiome = SaveService.get().activeBiome;
    if (activeBiome !== 'volcano') {
      console.log(`${LOG_TAG} Skipping prewarm — biome is '${activeBiome}', not volcano`);
      return;
    }

    // Clean up any existing tiles
    this._cleanup();

    const runCount = LevelGeneratorService.get().runCount;
    const magmaCount = this._computeMagmaCount(runCount);
    const pathSvc = PathService.get();

    // Count total available cells to enforce the "at least 5 non-magma cells" constraint
    let totalAvailableCells = 0;
    for (let col = 0; col < GRID_COLS; col++) {
      if (LOCKED_COLS.includes(col)) continue;
      for (let row = 0; row < GRID_ROWS; row++) {
        if (row === GRID_ROWS - 1) continue;
        if (pathSvc.isPathCell(col, row)) continue;
        if (pathSvc.isCaveBlockedCell(col, row)) continue;
        totalAvailableCells++;
      }
    }
    const maxMagma = Math.max(0, totalAvailableCells - 5);
    const targetCount = Math.min(magmaCount, maxMagma);

    // Place clusters until target cell count is reached
    const selectedCells = this._placeClusteredMagma(targetCount, pathSvc);

    console.log(`${LOG_TAG} Placed ${selectedCells.length} magma cells in clusters (run ${runCount}, target ${targetCount})`);

    // Mark all cells first so adjacency lookups are valid
    for (const cell of selectedCells) {
      this._magmaCells.add(`${cell.col},${cell.row}`);
    }

    // Spawn all tiles using the single MagmaTileStraight template (a flat plane)
    const worldService = WorldService.get();
    const spawnPromises: Promise<Entity>[] = [];
    const neighborData: number[] = [];

    for (const cell of selectedCells) {
      const pos = pathSvc.cellToWorld(cell.col, cell.row);
      const spawnPos = new Vec3(pos.x, GROUND_Y + TILE_Y_OFFSET, pos.z);

      // Build neighbor bitmask
      let neighbors = 0;
      if (this._magmaCells.has(`${cell.col},${cell.row - 1}`)) neighbors |= N_UP;
      if (this._magmaCells.has(`${cell.col},${cell.row + 1}`)) neighbors |= N_DOWN;
      if (this._magmaCells.has(`${cell.col - 1},${cell.row}`)) neighbors |= N_LEFT;
      if (this._magmaCells.has(`${cell.col + 1},${cell.row}`)) neighbors |= N_RIGHT;

      neighborData.push(neighbors);

      spawnPromises.push(
        worldService.spawnTemplate({
          templateAsset: Assets.MagmaTileStraight,
          position: spawnPos,
          rotation: Quaternion.identity,
          networkMode: NetworkMode.LocalOnly,
        })
      );
    }

    const spawnedEntities = await Promise.all(spawnPromises);
    this._tiles = spawnedEntities;

    // Apply per-instance materials with neighbor-based corner rounding.
    // The shader now uses a fixed halfSize=0.52 that always extends past the mesh edge,
    // so the direction mapping ONLY affects which corners get rounded (cosmetic), NOT gaps.
    // We pass neighbor flags directly to the shader without axis remapping.
    // The plane.usda UV layout: texcoord0.x → world X, texcoord0.y → world Z.
    // Grid coords: row → X axis (row-1 = +X = "up" in UV), col → Z axis (col+1 = +Z = "right" in UV).
    // Mapping: gridUp(row-1) → +X → +uv.y → neighborUp, gridRight(col+1) → +Z → +uv.x → neighborRight
    for (let i = 0; i < spawnedEntities.length; i++) {
      const entity = spawnedEntities[i];
      const neighbors = neighborData[i];

      const matInstance = await Material.createInstance(Materials.MagmaTile);
      this._materialInstances.push(matInstance);

      const hasUp = (neighbors & N_UP) !== 0 ? 1.0 : 0.0;
      const hasDown = (neighbors & N_DOWN) !== 0 ? 1.0 : 0.0;
      const hasLeft = (neighbors & N_LEFT) !== 0 ? 1.0 : 0.0;
      const hasRight = (neighbors & N_RIGHT) !== 0 ? 1.0 : 0.0;

      // Pass directly — shader halfSize=0.52 prevents gaps regardless of UV orientation.
      // Corner rounding: neighborUp/Down/Left/Right control which corners stay sharp.
      matInstance.setConstantParam('MaterialParams', 'neighborUp', hasUp);
      matInstance.setConstantParam('MaterialParams', 'neighborDown', hasDown);
      matInstance.setConstantParam('MaterialParams', 'neighborLeft', hasLeft);
      matInstance.setConstantParam('MaterialParams', 'neighborRight', hasRight);

      const matComp = entity.getComponent(MaterialComponent);
      if (matComp) {
        matComp.setPartMaterial(0, matInstance);
      }
    }

    console.log(`${LOG_TAG} Spawned ${this._tiles.length} rounded magma tiles for ${selectedCells.length} cells (run ${runCount}, target ${magmaCount})`);
  }

  /**
   * Places magma cells in clusters. Picks random path-adjacent anchors and tries to fit
   * cluster shapes. Returns an array of selected cells.
   */
  private _placeClusteredMagma(
    targetCount: number,
    pathSvc: PathService
  ): Array<{ col: number; row: number }> {
    const selectedCells: Array<{ col: number; row: number }> = [];
    const occupied = new Set<string>();

    // Collect all valid path-adjacent anchor cells
    const anchorCandidates: Array<{ col: number; row: number }> = [];
    for (let col = 0; col < GRID_COLS; col++) {
      if (LOCKED_COLS.includes(col)) continue;
      for (let row = 0; row < GRID_ROWS; row++) {
        if (row === GRID_ROWS - 1) continue;
        if (pathSvc.isPathCell(col, row)) continue;
        if (pathSvc.isCaveBlockedCell(col, row)) continue;
        const isAdjacentToPath =
          pathSvc.isPathCell(col - 1, row) ||
          pathSvc.isPathCell(col + 1, row) ||
          pathSvc.isPathCell(col, row - 1) ||
          pathSvc.isPathCell(col, row + 1);
        if (isAdjacentToPath) {
          anchorCandidates.push({ col, row });
        }
      }
    }

    // Shuffle anchors (Fisher-Yates)
    for (let i = anchorCandidates.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const tmp = anchorCandidates[i];
      anchorCandidates[i] = anchorCandidates[j];
      anchorCandidates[j] = tmp;
    }

    let placedCount = 0;
    let anchorIdx = 0;
    const maxAttempts = anchorCandidates.length * 3; // safety limit
    let attempts = 0;

    while (placedCount < targetCount && attempts < maxAttempts) {
      attempts++;
      if (anchorIdx >= anchorCandidates.length) {
        // Reshuffle anchors for another pass
        for (let i = anchorCandidates.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          const tmp = anchorCandidates[i];
          anchorCandidates[i] = anchorCandidates[j];
          anchorCandidates[j] = tmp;
        }
        anchorIdx = 0;
      }

      const anchor = anchorCandidates[anchorIdx];
      anchorIdx++;

      // Skip if this anchor is already occupied
      if (occupied.has(`${anchor.col},${anchor.row}`)) continue;

      const remaining = targetCount - placedCount;

      // Filter shapes that fit the remaining quota (sorted largest first for natural pools)
      const viableShapes = CLUSTER_SHAPES
        .filter(s => s.length <= remaining)
        .sort((a, b) => b.length - a.length);

      // Shuffle among same-size groups for variety
      const shuffledShapes = this._shuffleShapes(viableShapes);

      let placed = false;
      for (const shape of shuffledShapes) {
        const cells = this._tryFitCluster(anchor, shape, occupied, pathSvc);
        if (cells !== null) {
          // Commit this cluster
          for (const cell of cells) {
            occupied.add(`${cell.col},${cell.row}`);
            selectedCells.push(cell);
          }
          placedCount += cells.length;
          placed = true;
          break;
        }
      }

      // If no shape fit at this anchor, continue to next
      if (!placed) continue;
    }

    if (placedCount < targetCount) {
      console.log(`${LOG_TAG} Could only place ${placedCount}/${targetCount} magma cells in clusters`);
    }

    return selectedCells;
  }

  /**
   * Tries to fit a cluster shape at the given anchor position.
   * Returns the array of absolute cells if valid, or null if the shape doesn't fit.
   * Validates: all cells are valid (not path, not locked, not last row, not occupied),
   * and at least one cell in the cluster is path-adjacent.
   */
  private _tryFitCluster(
    anchor: { col: number; row: number },
    shape: ClusterShape,
    occupied: Set<string>,
    pathSvc: PathService
  ): Array<{ col: number; row: number }> | null {
    const cells: Array<{ col: number; row: number }> = [];
    let hasPathAdjacent = false;

    for (const offset of shape) {
      const col = anchor.col + offset.dc;
      const row = anchor.row + offset.dr;

      // Bounds and validity checks
      if (col < 0 || col >= GRID_COLS) return null;
      if (row < 0 || row >= GRID_ROWS) return null;
      if (row === GRID_ROWS - 1) return null;
      if (LOCKED_COLS.includes(col)) return null;
      if (pathSvc.isPathCell(col, row)) return null;
      if (pathSvc.isCaveBlockedCell(col, row)) return null;
      if (occupied.has(`${col},${row}`)) return null;

      // Check path adjacency for this cell
      if (!hasPathAdjacent) {
        const isAdjacentToPath =
          pathSvc.isPathCell(col - 1, row) ||
          pathSvc.isPathCell(col + 1, row) ||
          pathSvc.isPathCell(col, row - 1) ||
          pathSvc.isPathCell(col, row + 1);
        if (isAdjacentToPath) hasPathAdjacent = true;
      }

      cells.push({ col, row });
    }

    // At least one cell must be adjacent to the path
    if (!hasPathAdjacent) return null;

    return cells;
  }

  /** Shuffles shapes array with bias toward larger shapes first but with randomness. */
  private _shuffleShapes(shapes: ClusterShape[]): ClusterShape[] {
    const result = [...shapes];
    // Group by size, shuffle within each group
    let i = 0;
    while (i < result.length) {
      const size = result[i].length;
      let j = i;
      while (j < result.length && result[j].length === size) j++;
      // Shuffle [i, j) range
      for (let k = j - 1; k > i; k--) {
        const r = i + Math.floor(Math.random() * (k - i + 1));
        const tmp = result[k];
        result[k] = result[r];
        result[r] = tmp;
      }
      i = j;
    }
    return result;
  }

  /**
   * Tiered magma count scaling:
   *   Runs  1-19:  +1 per run
   *   Runs 20-49:  +1 every 2 runs (cumulative on tier 1)
   *   Runs 50-99:  +1 every 3 runs (cumulative on tier 2)
   *   Runs 100+:   +1 every 4 runs (cumulative on tier 3)
   */
  private _computeMagmaCount(runCount: number): number {
    const tier1Runs = Math.min(runCount, 19);
    let count = BASE_MAGMA_COUNT + (tier1Runs - 1);

    if (runCount <= 19) return count;

    const tier2Runs = Math.min(runCount, 49) - 19;
    count += Math.floor(tier2Runs / 2);

    if (runCount <= 49) return count;

    const tier3Runs = Math.min(runCount, 99) - 49;
    count += Math.floor(tier3Runs / 3);

    if (runCount <= 99) return count;

    const tier4Runs = runCount - 99;
    count += Math.floor(tier4Runs / 4);

    return count;
  }

  private _cleanup(): void {
    for (const mat of this._materialInstances) {
      mat.destroy();
    }
    this._materialInstances = [];
    for (const tile of this._tiles) {
      tile.destroy();
    }
    this._tiles = [];
    this._magmaCells.clear();
    console.log(`${LOG_TAG} Cleaned up magma tiles`);
  }
}
