/**
 * LevelGeneratorService — Procedural, SEEDED level generation for each run.
 *
 * On StartGame, generates TOTAL_LEVELS ILevelDef instances deterministically
 * from a numeric seed (owned/persisted by SaveService). The same seed always
 * yields the same run — waves, paths, node types, AND boss modifier — so
 * reloading mid-run reproduces exactly what the player saw.
 *
 * Each level has:
 *   - IWaveDef[] with escalating difficulty (via wave pack system)
 *   - pathWaypoints forming a valid zigzag path on the grid
 *   - Fixed startGold / startLives from Constants
 *   - bossModifier (boss level only)
 * The overworld node-type layout (combat / boss / minigame) is also assigned
 * here deterministically: every 3rd node is a minigame (indices 2, 5, 8, ...)
 * unless it's the last node (always boss).
 *
 * Read by WaveService and PathService via getLevelDef(index), and by
 * OverworldHud via getNodeType(index).
 *
 * IMPORTANT: never call Math.random() in this service — always use this._rng()
 * so generation stays deterministic.
 */
import { Service } from 'meta/worlds';
import { service, subscribe } from 'meta/worlds';
import { EventService } from 'meta/worlds';
import { Events, BossModifier, BOSS_MODIFIER_SKULL_REWARDS } from '../Types';
import type { IWaveDef, IWaveGroup } from '../Types';
import type { ILevelDef } from '../Defs/LevelDefs';
import { OverworldNodeType } from '../Defs/NodeDefs';
import { SaveService } from './SaveService';
import { TOTAL_LEVELS, START_GOLD, START_LIVES, GRID_COLS, GRID_ROWS, LOCKED_COLS, PATH_SPAWN_ROW_OFFSET, RUN_BOSS_SKULL_BONUS } from '../Constants';
import { LEVEL_TIER_PATTERNS, getPackPoolForTier, getPackPoolForTierAndBiome } from '../Defs/WavePackDefs';
import type { IWavePack } from '../Defs/WavePackDefs';

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

// ——— Service ———————————————————————————————————————————————————————————

@service()
export class LevelGeneratorService extends Service {
  private readonly _saveService = Service.inject(SaveService);

  private _levels: ILevelDef[] = [];
  private _nodeTypes: OverworldNodeType[] = [];
  private _generated: boolean = false;
  private _seed: number = 0;
  private _runCount: number = 1;
  private _modifierBag: number[] = [];
  private _modifierBagIndex: number = 0;

  /** Seeded RNG for the current run. Reset by generate(); never use Math.random. */
  private _rng: () => number = mulberry32(1);

  get isGenerated(): boolean { return this._generated; }
  get runCount(): number { return this._runCount; }

  /** Restore run count from saved progress (called on session load). */
  setRunCount(count: number): void {
    this._runCount = count;
    console.log(`[LevelGeneratorService] Run count restored to ${count}`);
  }

  /** Advance to the next run: increment run count, reset generation state. */
  advanceRun(): void {
    this._runCount++;
    this._generated = false;
    this._levels = [];
    this._nodeTypes = [];
    console.log(`[LevelGeneratorService] Advanced to run ${this._runCount}`);
  }

  /** Reset generation state without advancing the run count.
   *  Used when switching biomes to force regeneration with the new biome's seed.
   *  NOTE: The modifier bag is intentionally NOT cleared here. It must persist
   *  across biome switches so each boss draws the NEXT modifier from the bag
   *  rather than re-shuffling to the same order (the PRNG reseeds identically). */
  resetGeneration(): void {
    this._generated = false;
    this._levels = [];
    this._nodeTypes = [];
    console.log(`[LevelGeneratorService] Generation state reset (biome switch), bag preserved idx=${this._modifierBagIndex}/${this._modifierBag.length}`);
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
    console.log(`[LevelGeneratorService] Boss modifier bag restored: [${this._modifierBag.map((m: number) => BossModifier[m]).join(', ')}] idx=${this._modifierBagIndex}`);
  }

  /** Clear the in-memory bag state (used when switching to a biome with no saved bag). */
  clearBagState(): void {
    this._modifierBag = [];
    this._modifierBagIndex = 0;
    console.log(`[LevelGeneratorService] Boss modifier bag cleared (new biome, no saved state)`);
  }

  @subscribe(Events.StartGame)
  onStartGame(_p: Events.StartGamePayload): void {
    // Resume the saved run's seed, or mint a fresh one for a new run.
    const seed = this._saveService.ensureRunSeed();
    this.generate(TOTAL_LEVELS, seed);
  }

  /** When a boss level is beaten, advance the bag so the NEXT boss gets a
   *  different modifier. Non-boss completions are ignored. */
  @subscribe(Events.LevelCompleted)
  onLevelCompleted(p: Events.LevelCompletedPayload): void {
    if (!this._generated) return;
    if (p.levelIndex < 0 || p.levelIndex >= this._nodeTypes.length) return;
    if (this._nodeTypes[p.levelIndex] === OverworldNodeType.Boss) {
      console.log(`[LevelGeneratorService] Boss node ${p.levelIndex} beaten, consuming modifier`);
      this.consumeBossModifier();
    }
  }

  /** Generate N levels deterministically from a seed. Called on StartGame. */
  generate(count: number, seed: number): void {
    this._seed = seed || 1;
    this._rng = mulberry32(this._seed);
    console.log(`[LevelGeneratorService] Generating ${count} levels from seed ${this._seed}`);
    this._levels = [];
    this._assignNodeTypes(count);

    // Initialize the shuffle bag only if it's completely empty (first-ever run
    // for this biome). Once populated, the bag persists across generate() calls
    // and only reshuffles when exhausted (handled inside _peekBag / consumeBossModifier).
    if (this._modifierBag.length === 0) {
      this._initShuffleBag();
    }

    for (let i = 0; i < count; i++) {
      this._levels.push(this._generateLevel(i, count));
    }
    this._generated = true;

    // Update SaveService with the actual generated level count so beaten array
    // adapts dynamically instead of being hardcoded to TOTAL_LEVELS.
    this._saveService.setLevelCount(this._levels.length);

    console.log(`[LevelGeneratorService] Generation complete`);
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

  /** Boss skull reward for a level, including the +1-per-run bonus (not the skill-tree earn-rate multiplier — apply that separately). */
  getBossSkullReward(levelIndex: number): number {
    const levelDef = this.getLevelDef(levelIndex);
    return (levelDef.bossSkullReward ?? 3) + (this._runCount - 1) * RUN_BOSS_SKULL_BONUS;
  }

  /** Fall back to the saved run's seed if a getter is called before StartGame. */
  private _ensureGenerated(): void {
    if (this._generated && this._levels.length > 0) return;
    console.warn(`[LevelGeneratorService] No levels generated yet, generating now`);
    this.generate(TOTAL_LEVELS, this._saveService.getSeed() || this._seed);
  }

  // ——— Node-type layout (deterministic) —————————————————————————————————————
  //   Last node = Boss. Every 3rd node (indices 2, 5, 8, ...) = Minigame (unless last). Rest = Combat.
  //   Pattern: Combat, Combat, Minigame, Combat, Combat, Minigame, ... Boss
  private _assignNodeTypes(count: number): void {
    this._nodeTypes = [];
    for (let i = 0; i < count; i++) this._nodeTypes.push(OverworldNodeType.Combat);
    // Last node is always boss
    if (count > 0) this._nodeTypes[count - 1] = OverworldNodeType.Boss;
    // Every 3rd node (index 2, 5, 8, ...) is a minigame, unless it's the last (boss) node
    for (let i = 2; i < count; i += 3) {
      if (i !== count - 1) {
        this._nodeTypes[i] = OverworldNodeType.Minigame;
        console.log(`[LevelGeneratorService] Minigame node at level ${i + 1}`);
      }
    }
  }

  // ——— Private generation logic —————————————————————————————————————————————

  private _generateLevel(levelIndex: number, totalLevels: number): ILevelDef {
    const waves = this._generateWaves(levelIndex, totalLevels);
    const pathWaypoints = this._generatePath();
    const isBoss = this._nodeTypes[levelIndex] === OverworldNodeType.Boss;
    const bossModifier = isBoss
      ? this._peekBag()
      : undefined;
    // Skull reward determined by the boss modifier difficulty
    const bossSkullReward = isBoss
      ? BOSS_MODIFIER_SKULL_REWARDS[bossModifier!]
      : undefined;
    if (isBoss) {
      console.log(`[LevelGeneratorService] Boss level ${levelIndex} assigned modifier: ${BossModifier[bossModifier!]} (bag ${this._modifierBagIndex}/${this._modifierBag.length}), skullReward: ${bossSkullReward}`);
    }
    return {
      startGold: START_GOLD,
      startLives: START_LIVES,
      pathWaypoints,
      waves,
      bossModifier,
      bossSkullReward,
    };
  }

  // ——— Wave generation (wave pack system) ————————————————————————————————————

  private _generateWaves(levelIndex: number, _totalLevels: number): IWaveDef[] {
    // Compute combat-order index by counting only preceding Combat nodes
    // (skips minigame and boss nodes so combat tier matches combat order)
    let combatIndex = 0;
    for (let i = 0; i < levelIndex; i++) {
      if (this._nodeTypes[i] === OverworldNodeType.Combat) {
        combatIndex++;
      }
    }
    const patternIdx = Math.min(combatIndex, LEVEL_TIER_PATTERNS.length - 1);
    const tierPattern = LEVEL_TIER_PATTERNS[patternIdx];

    // Use biome-aware pack pools so snow biome includes yeti packs
    const activeBiome = this._saveService.activeBiome ?? 'grass';

    const waves: IWaveDef[] = [];
    let lastPackName: string = '';

    for (let w = 0; w < tierPattern.length; w++) {
      const tier = tierPattern[w];
      const fullPool = getPackPoolForTierAndBiome(tier, activeBiome);
      // Filter out packs gated behind a higher run number
      const filtered = fullPool.filter(p => !p.minRun || p.minRun <= this._runCount);
      const pool = filtered.length > 0 ? filtered : fullPool;

      // Pick a random pack from this tier's pool, avoiding back-to-back repeats
      let pack: IWavePack;
      if (pool.length === 1) {
        pack = pool[0];
      } else {
        let attempts = 0;
        do {
          const idx = Math.floor(this._rng() * pool.length);
          pack = pool[idx];
          attempts++;
        } while (pack.name === lastPackName && attempts < 10);
      }

      lastPackName = pack.name;

      // Convert readonly groups to mutable IWaveGroup[] for IWaveDef compatibility
      // Propagate minRun so WaveService can filter splitter groups on early runs
      const groups: IWaveGroup[] = pack.groups.map(g => ({
        enemyId: g.enemyId,
        count: g.count,
        ...(g.minRun !== undefined ? { minRun: g.minRun } : {}),
      }));
      waves.push({ groups });
    }

    return waves;
  }

  // ——— Shuffle bag helpers ——————————————————————————————————————————————————

  /** Initialize a shuffled bag with all 6 boss modifiers using the seeded PRNG. */
  private _initShuffleBag(): void {
    this._modifierBag = [0, 1, 2, 3, 4, 5]; // All BossModifier enum values
    // Fisher-Yates shuffle using the seeded PRNG
    for (let i = this._modifierBag.length - 1; i > 0; i--) {
      const j = Math.floor(this._rng() * (i + 1));
      const tmp = this._modifierBag[i];
      this._modifierBag[i] = this._modifierBag[j];
      this._modifierBag[j] = tmp;
    }
    this._modifierBagIndex = 0;
    console.log(`[LevelGeneratorService] Shuffle bag initialized: [${this._modifierBag.map((m: number) => BossModifier[m]).join(', ')}]`);

    // Persist the freshly-shuffled bag so returning to this biome later
    // restores the same order (before any boss is beaten).
    const bagState = this.getBagState();
    const bossModState = JSON.stringify(bagState);
    EventService.sendLocally(Events.BossModAssigned, { bossModState });
  }

  /** Peek at the current bag position WITHOUT advancing the index.
   *  Used during level generation so the same modifier is produced every
   *  time a biome is regenerated (deterministic per seed + bag state). */
  private _peekBag(): BossModifier {
    if (this._modifierBagIndex >= this._modifierBag.length) {
      this._initShuffleBag();
    }
    return this._modifierBag[this._modifierBagIndex] as BossModifier;
  }

  /** Advance the bag index after a boss level is actually beaten.
   *  This is the ONLY place the bag index moves forward, ensuring the
   *  modifier stays stable across biome switches / regenerations. */
  consumeBossModifier(): void {
    if (this._modifierBagIndex >= this._modifierBag.length) {
      this._initShuffleBag();
    }
    const consumed = this._modifierBag[this._modifierBagIndex] as BossModifier;
    this._modifierBagIndex++;
    console.log(`[LevelGeneratorService] Boss modifier consumed: ${BossModifier[consumed]} (bag now at ${this._modifierBagIndex}/${this._modifierBag.length})`);

    // Persist the updated bag state
    const bagState = this.getBagState();
    const bossModState = JSON.stringify(bagState);
    EventService.sendLocally(Events.BossModAssigned, { bossModState });
  }

  // ——— Path generation ——————————————————————————————————————————————————————

  private _generatePath(): ReadonlyArray<readonly [number, number]> {
    // Generate a zigzag path from top to bottom of the grid
    // Path goes from row 0 (top) to row GRID_ROWS-1 (bottom)
    // Alternates left/right at random row intervals
    // Path must stay within unlocked columns (avoid LOCKED_COLS)

    // Find first unlocked column (smallest col not in LOCKED_COLS)
    let minCol = 0;
    while (minCol < GRID_COLS && LOCKED_COLS.includes(minCol)) minCol++;
    // Find last unlocked column (largest col not in LOCKED_COLS)
    let maxCol = GRID_COLS - 1;
    while (maxCol >= 0 && LOCKED_COLS.includes(maxCol)) maxCol--;
    const colRange = maxCol - minCol + 1; // number of usable columns

    const waypoints: Array<readonly [number, number]> = [];

    // Start off-screen above the visible grid so enemies walk in from beyond the top edge
    let col = minCol + Math.floor(this._rng() * colRange);
    let row = PATH_SPAWN_ROW_OFFSET;
    waypoints.push([col, row] as const);
    // Add an entry waypoint at the top of the visible grid (row 0)
    row = 0;
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

      // Move horizontally (zigzag), clamped to unlocked columns
      const maxHorizontal = goingRight
        ? maxCol - col
        : col - minCol;
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
