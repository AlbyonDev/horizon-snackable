/**
 * AchievementDefs — Grouped tier-based achievement definitions.
 *
 * Each achievement group is a single conceptual achievement with multiple
 * tier thresholds along a progress gauge. Progress is tracked via SaveService
 * global stats (ek, rg, ri, rv).
 *
 * 8 groups total:
 *   - Slayer (enemies killed) — 9 tiers
 *   - Grass Explorer (grass biome runs) — 8 tiers
 *   - Ice Explorer (ice biome runs) — 8 tiers
 *   - Volcano Explorer (volcano biome runs) — 8 tiers
 *   - Towers Bought (total towers placed) — 9 tiers
 *   - Towers Sold (total towers sold) — 9 tiers
 *   - Perfect Runs (levels without losing a life) — 9 tiers
 *   - Gold Earned (total gold earned) — 8 tiers
 */

export interface IAchievementGroupDef {
  /** Unique group identifier */
  readonly id: string;
  /** Display name shown in the UI */
  readonly name: string;
  /** Short description of the achievement goal */
  readonly description: string;
  /**
   * Description template with {0} placeholder for the current tier target.
   * E.g. "Kill {0} enemies" → "Kill 50 enemies"
   */
  readonly descriptionTemplate: string;
  /** The stat key in global save data: 'ek' | 'rg' | 'ri' | 'rv' */
  readonly statKey: string;
  /** Ordered tier thresholds (ascending) */
  readonly tiers: readonly number[];
  /**
   * Display names per tier. One entry per tier (name while working toward that tier)
   * plus one extra entry at the end for "all tiers complete".
   * Length must be tiers.length + 1.
   */
  readonly tierNames: readonly string[];
}

/**
 * Skull rewards per tier index. Tier 1 = 1 skull, scaling up for later tiers.
 * If an achievement has fewer tiers than this array, use the first N values.
 */
export const TIER_REWARDS: readonly number[] = [3, 8, 15, 25, 50, 100, 150, 200, 500];

/** All achievement group definitions in display order. */
export const ACHIEVEMENT_GROUPS: readonly IAchievementGroupDef[] = [
  {
    id: 'slayer',
    name: 'Slayer',
    description: 'Kill enemies',
    descriptionTemplate: 'Kill {0} enemies',
    statKey: 'ek',
    tiers: [50, 100, 200, 500, 1000, 2000, 5000, 10000, 100000],
    tierNames: [
      'Baby Slayer',   // working toward 50
      'Slayer',        // working toward 100
      'Great Slayer',  // working toward 200
      'Super Slayer',  // working toward 500
      'Hyper Slayer',  // working toward 1000
      'Master Slayer', // working toward 2000
      'World Slayer',  // working toward 5000
      'God Slayer',    // working toward 10000
      'Eternal Slayer', // working toward 50000
      'Eternal Slayer', // all tiers complete
    ],
  },
  {
    id: 'grass_explorer',
    name: 'Grass Explorer',
    description: 'Reach runs in grass',
    descriptionTemplate: 'Reach run {0} in grass biome',
    statKey: 'rg',
    tiers: [1, 5, 10, 20, 50, 100, 200, 500],
    tierNames: [
      'Sprout',          // working toward 1
      'Sapling',         // working toward 5
      'Seedling',        // working toward 10
      'Grassrooter',     // working toward 20
      'Grass-eater',     // working toward 50
      'Grass-toucher',   // working toward 100
      'Weed Planter',    // working toward 200
      'Budding Genius',  // working toward 500
      'Budding Genius',  // all tiers complete
    ],
  },
  {
    id: 'ice_explorer',
    name: 'Ice Explorer',
    description: 'Reach runs in ice',
    descriptionTemplate: 'Reach run {0} in snow biome',
    statKey: 'ri',
    tiers: [1, 5, 10, 20, 50, 100, 200, 500],
    tierNames: [
      'Chilly',          // working toward 1
      'Frost Nip',       // working toward 5
      'Snowflake',       // working toward 10
      'Ice Breaker',     // working toward 20
      'Frostbite',       // working toward 50
      'Cold Blooded',    // working toward 100
      'Blizzard Walker', // working toward 200
      'Absolute Zero',   // working toward 500
      'Absolute Zero',   // all tiers complete
    ],
  },
  {
    id: 'volcano_explorer',
    name: 'Volcano Explorer',
    description: 'Reach runs in volcano',
    descriptionTemplate: 'Reach run {0} in volcano biome',
    statKey: 'rv',
    tiers: [1, 5, 10, 20, 50, 100, 200, 500],
    tierNames: [
      'Ember',           // working toward 1
      'Smolder',         // working toward 5
      'Spark',           // working toward 10
      'Hot Head',        // working toward 20
      'Lava Lover',      // working toward 50
      'Eruption Expert', // working toward 100
      'Magma Maniac',    // working toward 200
      'Core Dweller',    // working toward 500
      'Core Dweller',    // all tiers complete
    ],
  },
  {
    id: 'towers_bought',
    name: 'Towers Bought',
    description: 'Buy towers',
    descriptionTemplate: 'Buy {0} towers',
    statKey: 'tb',
    tiers: [50, 100, 200, 500, 1000, 2000, 5000, 10000, 100000],
    tierNames: [
      'Apprentice Builder', // working toward 10
      'Brick Layer',        // working toward 25
      'Tower Stacker',      // working toward 50
      'Architect',          // working toward 100
      'Master Builder',     // working toward 250
      'Fortress Maker',     // working toward 500
      'Tower God',          // working toward 1000
      'City Planner',       // working toward 5000
      'Eternal Builder',    // working toward 10000
      'Eternal Builder',    // all tiers complete
    ],
  },
  {
    id: 'towers_sold',
    name: 'Towers Sold',
    description: 'Sell towers',
    descriptionTemplate: 'Sell {0} towers',
    statKey: 'ts',
    tiers: [5, 15, 30, 75, 150, 300, 500, 5000, 10000],
    tierNames: [
      'Pawnbroker',        // working toward 5
      'Haggler',           // working toward 15
      'Deal Maker',        // working toward 30
      'Merchant',          // working toward 75
      'Trade Baron',       // working toward 150
      'Black Market King', // working toward 300
      'Sell God',          // working toward 500
      'Auction Lord',      // working toward 5000
      'Eternal Merchant',  // working toward 10000
      'Eternal Merchant',  // all tiers complete
    ],
  },
  {
    id: 'perfect_runs',
    name: 'Perfect Runs',
    description: 'Complete levels without losing a life',
    descriptionTemplate: 'Complete {0} levels without losing a life',
    statKey: 'pr',
    tiers: [1, 10, 20, 50, 100, 500, 1000, 5000, 10000],
    tierNames: [
      'Lucky Shot',       // working toward 1
      'Clean Hands',      // working toward 3
      'Untouchable',      // working toward 5
      'Flawless',         // working toward 10
      'Perfectionist',    // working toward 25
      'Invincible',       // working toward 50
      'God Mode',         // working toward 100
      'Immortal',         // working toward 500
      'Eternal Guardian', // working toward 1000
      'Eternal Guardian', // all tiers complete
    ],
  },
  {
    id: 'gold_earned',
    name: 'Gold Earned',
    description: 'Earn gold',
    descriptionTemplate: 'Earn {0} gold',
    statKey: 'ge',
    tiers: [500, 2000, 5000, 15000, 50000, 150000, 500000, 1000000],
    tierNames: [
      'Penny Pincher',    // working toward 500
      'Coin Collector',   // working toward 2000
      'Gold Digger',      // working toward 5000
      'Treasure Hunter',  // working toward 15000
      'Wealthy',          // working toward 50000
      'Midas Touch',      // working toward 150000
      'Gold God',         // working toward 500000
      'Eternal Fortune',  // working toward 1000000
      'Eternal Fortune',  // all tiers complete
    ],
  },
];
