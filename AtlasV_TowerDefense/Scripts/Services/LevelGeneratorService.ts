/**
 * LevelGeneratorService — Procedural level generation for each game run.
 *
 * On StartGame event, generates TOTAL_LEVELS random ILevelDef instances.
 * Each level has:
 *   - Random IWaveDef[] array with escalating difficulty
 *   - Random pathWaypoints that form a valid zigzag path on the grid
 *   - Fixed startGold / startLives from Constants
 *
 * Read by WaveService and PathService via getLevelDef(index).
 * Resets and regenerates on each StartGame.
 */
import { Service, EventService } from 'meta/worlds';
import { service, subscribe } from 'meta/worlds';
import { Events } from '../Types';
import type { IWaveDef, IWaveGroup } from '../Types';
import type { ILevelDef } from '../Defs/LevelDefs';
import { TOTAL_LEVELS, START_GOLD, START_LIVES, GRID_COLS, GRID_ROWS } from '../Constants';

// ─── Enemy pool for random generation ─────────────────────────────────────────

const ENEMY_IDS = ['basic', 'fast', 'tank', 'boss'] as const;

// Difficulty weights: probability of each enemy type per difficulty tier
// Tier progresses per-level (level 0 = easiest, last level = hardest)
const DIFFICULTY_TIERS: Array<{ basic: number; fast: number; tank: number; boss: number }> = [
  { basic: 0.70, fast: 0.20, tank: 0.10, boss: 0.00 },
  { basic: 0.50, fast: 0.25, tank: 0.15, boss: 0.10 },
  { basic: 0.35, fast: 0.30, tank: 0.20, boss: 0.15 },
  { basic: 0.25, fast: 0.25, tank: 0.25, boss: 0.25 },
  { basic: 0.15, fast: 0.25, tank: 0.30, boss: 0.30 },
];

// ─── Service ───────────────────────────────────────────────────────────────────

@service()
export class LevelGeneratorService extends Service {
  private _levels: ILevelDef[] = [];
  private _generated: boolean = false;

  get isGenerated(): boolean { return this._generated; }

  @subscribe(Events.StartGame)
  onStartGame(_p: Events.StartGamePayload): void {
    this.generate(TOTAL_LEVELS);
  }

  /** Generate N random levels. Called automatically on StartGame. */
  generate(count: number): void {
    console.log(`[LevelGeneratorService] Generating ${count} random levels`);
    this._levels = [];
    for (let i = 0; i < count; i++) {
      this._levels.push(this._generateLevel(i, count));
    }
    this._generated = true;
    console.log(`[LevelGeneratorService] Generation complete`);
  }

  /** Retrieve the generated level def for a given index. */
  getLevelDef(index: number): ILevelDef {
    if (!this._generated || this._levels.length === 0) {
      console.warn(`[LevelGeneratorService] No levels generated yet, generating now`);
      this.generate(TOTAL_LEVELS);
    }
    const clamped = Math.min(index, this._levels.length - 1);
    return this._levels[clamped];
  }

  /** Total number of generated levels */
  get levelCount(): number { return this._levels.length; }



  // ─── Private generation logic ─────────────────────────────────────────────────

  private _generateLevel(levelIndex: number, totalLevels: number): ILevelDef {
    const waves = this._generateWaves(levelIndex, totalLevels);
    const pathWaypoints = this._generatePath();
    return {
      startGold: START_GOLD,
      startLives: START_LIVES,
      pathWaypoints,
      waves,
    };
  }

  // ─── Wave generation ──────────────────────────────────────────────────────────

  private _generateWaves(levelIndex: number, totalLevels: number): IWaveDef[] {
    // Number of waves scales with level progression: 5 → 20
    const minWaves = 5;
    const maxWaves = 20;
    const t = totalLevels > 1 ? levelIndex / (totalLevels - 1) : 0;
    const waveCount = Math.round(minWaves + t * (maxWaves - minWaves));

    // Pick difficulty tier based on level index
    const tierIndex = Math.min(
      Math.floor(t * DIFFICULTY_TIERS.length),
      DIFFICULTY_TIERS.length - 1,
    );
    const tier = DIFFICULTY_TIERS[tierIndex];

    const waves: IWaveDef[] = [];
    for (let w = 0; w < waveCount; w++) {
      waves.push(this._generateSingleWave(w, waveCount, tier));
    }
    return waves;
  }

  private _generateSingleWave(
    waveIndex: number,
    totalWaves: number,
    tier: { basic: number; fast: number; tank: number; boss: number },
  ): IWaveDef {
    // Total enemies in this wave scales from 3 up to 30 based on wave progression
    const waveT = totalWaves > 1 ? waveIndex / (totalWaves - 1) : 0;
    const totalEnemies = Math.round(3 + waveT * 27);

    // Distribute enemies across types based on tier weights (with randomness)
    const groups: IWaveGroup[] = [];
    const counts: Record<string, number> = { basic: 0, fast: 0, tank: 0, boss: 0 };

    for (let i = 0; i < totalEnemies; i++) {
      const roll = Math.random();
      let cumulative = 0;
      let picked = 'basic';
      for (const id of ENEMY_IDS) {
        cumulative += tier[id];
        if (roll < cumulative) {
          picked = id;
          break;
        }
      }
      counts[picked]++;
    }

    // Early waves shouldn't have bosses (first 20% of waves)
    if (waveT < 0.2 && counts['boss'] > 0) {
      counts['basic'] += counts['boss'];
      counts['boss'] = 0;
    }

    // Build groups (only include non-zero counts)
    for (const id of ENEMY_IDS) {
      if (counts[id] > 0) {
        groups.push({ enemyId: id, count: counts[id] });
      }
    }

    // Ensure at least one group
    if (groups.length === 0) {
      groups.push({ enemyId: 'basic', count: 3 });
    }

    return { groups };
  }

  // ─── Path generation ──────────────────────────────────────────────────────────

  private _generatePath(): ReadonlyArray<readonly [number, number]> {
    // Generate a zigzag path from top to bottom of the grid
    // Path goes from row 0 (top) to row GRID_ROWS-1 (bottom)
    // Alternates left/right at random row intervals

    const waypoints: Array<readonly [number, number]> = [];

    // Start at random column, row 0
    let col = Math.floor(Math.random() * (GRID_COLS - 2)) + 1; // avoid edges
    let row = 0;
    waypoints.push([col, row] as const);

    // Generate zigzag segments moving downward
    const maxRow = GRID_ROWS - 1;
    let goingRight = Math.random() > 0.5;

    while (row < maxRow) {
      // Move down by 2-4 rows
      const downStep = Math.min(2 + Math.floor(Math.random() * 3), maxRow - row);
      row += downStep;
      waypoints.push([col, row] as const);

      if (row >= maxRow) break;

      // Move horizontally (zigzag)
      const maxHorizontal = goingRight
        ? GRID_COLS - 1 - col
        : col;
      if (maxHorizontal > 0) {
        const hStep = Math.min(2 + Math.floor(Math.random() * 3), maxHorizontal);
        col = goingRight ? col + hStep : col - hStep;
        waypoints.push([col, row] as const);
      }
      goingRight = !goingRight;
    }

    // Ensure last waypoint is at maxRow
    if (waypoints[waypoints.length - 1][1] !== maxRow) {
      waypoints.push([col, maxRow] as const);
    }

    return waypoints;
  }
}
