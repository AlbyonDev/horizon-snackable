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
import { Events, BossModifier } from '../Types';
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
  private _runCount: number = 1;

  // Shuffle-bag for boss modifiers: guarantees all 6 appear before any repeats
  private _modifierBag: BossModifier[] = [];
  private _modifierBagIndex: number = 0;

  // Flag: true if bag was restored from save this session (prevents StartGame from wiping it)
  private _bagRestoredFromSave: boolean = false;

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

  /** Restore shuffle-bag state from saved progress (called on session load). */
  restoreBagState(state: { bag: number[]; idx: number }): void {
    this._modifierBag = [...state.bag];
    this._modifierBagIndex = state.idx;
    this._bagRestoredFromSave = true;
    console.log(`[LevelGeneratorService] Boss modifier bag restored: [${this._modifierBag.map(m => BossModifier[m]).join(', ')}] idx=${this._modifierBagIndex}`);
  }

  @subscribe(Events.StartGame)
  onStartGame(_p: Events.StartGamePayload): void {
    if (this._bagRestoredFromSave) {
      // Bag was restored from save. The saved idx already reflects the boss modifier
      // consumed during advanceRun(). Rewind by 1 so generate() re-draws the same
      // modifier that was originally assigned (generate always consumes 1 for the boss level).
      this._bagRestoredFromSave = false;
      if (this._modifierBagIndex > 0) {
        this._modifierBagIndex--;
      }
      console.log(`[LevelGeneratorService] StartGame: bag restored from save, rewound idx to ${this._modifierBagIndex}`);
    } else {
      this._resetModifierBag();
    }
    this.generate(TOTAL_LEVELS);
    console.log(`[LevelGeneratorService] New game started, run count = ${this._runCount}`);
  }

  /** Advance to the next run: increment counter and regenerate levels. */
  advanceRun(): void {
    this._runCount++;
    // Do NOT reset the modifier bag here — _nextBossModifier() handles reshuffling
    // only when all 6 entries are exhausted. Resetting every run was causing the
    // bag to always draw index 0 (same modifier every run).
    this.generate(TOTAL_LEVELS);
    console.log(`[LevelGeneratorService] Advanced to run ${this._runCount}, bag ${this._modifierBagIndex}/${this._modifierBag.length}`);
  }

  // ─── Shuffle-bag for boss modifiers ─────────────────────────────────────────

  /** Reset and reshuffle the modifier bag (called on new game / new run). */
  private _resetModifierBag(): void {
    this._modifierBag = [];
    this._modifierBagIndex = 0;
    console.log(`[LevelGeneratorService] Boss modifier shuffle-bag reset`);
  }

  /** Draw next modifier from the shuffle-bag. Reshuffles when exhausted. */
  private _nextBossModifier(): BossModifier {
    if (this._modifierBagIndex >= this._modifierBag.length) {
      this._shuffleNewBag();
    }
    const modifier = this._modifierBag[this._modifierBagIndex];
    this._modifierBagIndex++;
    return modifier;
  }

  /** Fill the bag with all 6 modifiers and Fisher-Yates shuffle. */
  private _shuffleNewBag(): void {
    this._modifierBag = [
      BossModifier.HpUp,
      BossModifier.SpeedUp,
      BossModifier.DmgDown,
      BossModifier.OneLife,
      BossModifier.NoIncome,
      BossModifier.TowerDestroy,
    ];
    // Fisher-Yates shuffle
    for (let i = this._modifierBag.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const tmp = this._modifierBag[i];
      this._modifierBag[i] = this._modifierBag[j];
      this._modifierBag[j] = tmp;
    }
    this._modifierBagIndex = 0;
    console.log(`[LevelGeneratorService] Shuffled new modifier bag: [${this._modifierBag.map(m => BossModifier[m]).join(', ')}]`);
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
    const isBoss = levelIndex === totalLevels - 1;
    const bossModifier = isBoss
      ? this._nextBossModifier()
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
