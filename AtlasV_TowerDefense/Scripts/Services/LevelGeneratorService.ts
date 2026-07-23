/**
 * LevelGeneratorService — Procedural, SEEDED level generation for each run.
 *
 * On StartGame, generates TOTAL_LEVELS ILevelDef instances deterministically
 * from a numeric seed (owned/persisted by SaveService). The same seed always
 * yields the same run — waves, paths, node types, AND boss modifier — so
 * reloading mid-run reproduces exactly what the player saw.
 *
 * Each level has:
 *   - IWaveDef[] with escalating difficulty
 *   - pathWaypoints forming a valid zigzag path on the grid
 *   - Fixed startGold / startLives from Constants
 *   - bossModifier (boss level only)
 * The overworld node-type layout (combat / boss / minigame) is also assigned
 * here so the minigame position is part of the seeded run, not re-rolled by UI.
 *
 * Read by WaveService and PathService via getLevelDef(index), and by
 * OverworldHud via getNodeType(index).
 *
 * IMPORTANT: never call Math.random() in this service — always use this._rng()
 * so generation stays deterministic.
 */
import { Service } from 'meta/worlds';
import { service, subscribe } from 'meta/worlds';
import { Events, BossModifier } from '../Types';
import type { IWaveDef, IWaveGroup } from '../Types';
import type { ILevelDef } from '../Defs/LevelDefs';
import { OverworldNodeType } from '../Defs/NodeDefs';
import { SaveService } from './SaveService';
import { TOTAL_LEVELS, START_GOLD, START_LIVES, GRID_COLS, GRID_ROWS } from '../Constants';

/** Deterministic PRNG (mulberry32). Returns a function producing [0, 1). */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

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
  private readonly _saveService = Service.inject(SaveService);

  private _levels: ILevelDef[] = [];
  private _nodeTypes: OverworldNodeType[] = [];
  private _generated: boolean = false;
  private _seed: number = 0;

  /** Seeded RNG for the current run. Reset by generate(); never use Math.random. */
  private _rng: () => number = mulberry32(1);

  get isGenerated(): boolean { return this._generated; }
  get runCount(): number { return this._runCount; }

  /** Restore run count from saved progress (called on session load). */
  setRunCount(count: number): void {
    this._runCount = count;
    console.log(`[LevelGeneratorService] Run count restored to ${count}`);
  }

  /** Get current shuffle-bag state for persistence. */
  getBagState(): { bag: number[]; idx: number } {
    return { bag: [...this._modifierBag], idx: this._modifierBagIndex };
  }

  /** Returns true when all modifiers in the current bag have been consumed. */
  isBagExhausted(): boolean {
    return this._modifierBagIndex >= this._modifierBag.length;
  }

  /** Restore shuffle-bag state from saved progress (called on session load). */
  restoreBagState(state: { bag: number[]; idx: number }): void {
    this._modifierBag = [...state.bag];
    this._modifierBagIndex = state.idx;
    this._bagRestoredFromSave = true;
    console.log(`[LevelGeneratorService] Boss modifier bag restored: [${this._modifierBag.map(m => BossModifier[m]).join(', ')}] idx=${this._modifierBagIndex}`);
  }

  @subscribe(Events.StartGame)
  onStartGame(_p: Events.StartGamePayload): void {
    // Resume the saved run's seed, or mint a fresh one for a new run.
    const seed = this._saveService.ensureRunSeed();
    this.generate(TOTAL_LEVELS, seed);
  }

  /** Generate N levels deterministically from a seed. Called on StartGame. */
  generate(count: number, seed: number): void {
    this._seed = seed || 1;
    this._rng = mulberry32(this._seed);
    console.log(`[LevelGeneratorService] Generating ${count} levels from seed ${this._seed}`);
    this._levels = [];
    this._assignNodeTypes(count);
    for (let i = 0; i < count; i++) {
      this._levels.push(this._generateLevel(i, count));
    }
    this._generated = true;
    console.log(`[LevelGeneratorService] Generation complete`);

    // Persist boss modifier bag state immediately after generation
    const bagState = this.getBagState();
    const bossModState = JSON.stringify(bagState);
    console.log(`[LevelGeneratorService] Firing BossModAssigned with state: ${bossModState}`);
    EventService.sendLocally(Events.BossModAssigned, { bossModState });
  }

  /** Retrieve the generated level def for a given index. */
  getLevelDef(index: number): ILevelDef {
    this._ensureGenerated();
    const clamped = Math.min(index, this._levels.length - 1);
    return this._levels[clamped];
  }

  /** Overworld node type (combat / boss / minigame) for a level index. */
  getNodeType(index: number): OverworldNodeType {
    this._ensureGenerated();
    if (index < 0 || index >= this._nodeTypes.length) return OverworldNodeType.Combat;
    return this._nodeTypes[index];
  }

  /** Total number of generated levels */
  get levelCount(): number { return this._levels.length; }

  /** Fall back to the saved run's seed if a getter is called before StartGame. */
  private _ensureGenerated(): void {
    if (this._generated && this._levels.length > 0) return;
    console.warn(`[LevelGeneratorService] No levels generated yet, generating now`);
    this.generate(TOTAL_LEVELS, this._saveService.getSeed() || this._seed);
  }

  // ─── Node-type layout (seeded) ────────────────────────────────────────────────
  //   Last node = Boss. One middle node = Minigame. Rest = Combat.
  private _assignNodeTypes(count: number): void {
    this._nodeTypes = [];
    for (let i = 0; i < count; i++) this._nodeTypes.push(OverworldNodeType.Combat);
    if (count > 0) this._nodeTypes[count - 1] = OverworldNodeType.Boss;
    if (count > 2) {
      const minigameIndex = 1 + Math.floor(this._rng() * (count - 2));
      this._nodeTypes[minigameIndex] = OverworldNodeType.Minigame;
      console.log(`[LevelGeneratorService] Minigame node at level ${minigameIndex + 1}`);
    }
  }



  // ─── Private generation logic ─────────────────────────────────────────────────

  private _generateLevel(levelIndex: number, totalLevels: number): ILevelDef {
    const waves = this._generateWaves(levelIndex, totalLevels);
    const pathWaypoints = this._generatePath();
    const isBoss = this._nodeTypes[levelIndex] === OverworldNodeType.Boss;
    const bossModifier = isBoss
      ? Math.floor(this._rng() * 6) as BossModifier
      : undefined;
    if (isBoss) {
      console.log(`[LevelGeneratorService] Boss level ${levelIndex} assigned modifier: ${BossModifier[bossModifier!]} (bag ${this._modifierBagIndex}/${this._modifierBag.length})`);
    }
    return {
      startGold: START_GOLD,
      startLives: START_LIVES,
      pathWaypoints,
      waves,
      bossModifier,
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
      const roll = this._rng();
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
    let col = Math.floor(this._rng() * (GRID_COLS - 2)) + 1; // avoid edges
    let row = 0;
    waypoints.push([col, row] as const);

    // Generate zigzag segments moving downward
    const maxRow = GRID_ROWS - 1;
    let goingRight = this._rng() > 0.5;

    while (row < maxRow) {
      // Move down by 2-4 rows
      const downStep = Math.min(2 + Math.floor(this._rng() * 3), maxRow - row);
      row += downStep;
      waypoints.push([col, row] as const);

      if (row >= maxRow) break;

      // Move horizontally (zigzag)
      const maxHorizontal = goingRight
        ? GRID_COLS - 1 - col
        : col;
      if (maxHorizontal > 0) {
        const hStep = Math.min(2 + Math.floor(this._rng() * 3), maxHorizontal);
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
