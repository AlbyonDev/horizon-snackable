/**
 * SkillTreeDefs.ts — Skill tree node definitions with explicit graph connections.
 *
 * 1 root node + 30 branch nodes (10 tiers × 3 branches). Connections between nodes
 * are defined explicitly as edge pairs [fromIndex, toIndex], allowing:
 *   - Lateral connections (cross-branch links)
 *   - Removal of default vertical connections
 *   - Any node linking to any other node
 *
 * Skill indices follow a modulo-3 pattern by branch:
 *   Root 0
 *   War   = index % 3 == 1: 1, 4, 7, 10, 13, 16, 19, 22, 25, 28
 *   Fortify = index % 3 == 2: 2, 5, 8, 11, 14, 17, 20, 23, 26, 29
 *   Fortune = index % 3 == 0 (excl 0): 3, 6, 9, 12, 15, 18, 21, 24, 27, 30
 *
 * To add a connection: add a [from, to] pair to SKILL_CONNECTIONS.
 * To remove a connection: delete the pair from SKILL_CONNECTIONS.
 * To add a lateral link: add [nodeA, nodeB] between any two nodes.
 *
 * ─── DOCUMENTATION RULE: Cannon Unlock Node Descriptions ───────────────────────
 * Tower unlock nodes: indices 8 (Laser), 9 (Pillar), 10 (Poison), 16 (Fire Cannon),
 *                     18 (Lightning), 19 (Frost)
 *
 * Convention for tower unlock nodes in the skill tree:
 *   1. ICON: Must use the tower's shop icon texture from Textures/ folder
 *      (e.g., Textures/laser_tower.png, Textures/poison_tower.png) -- NOT a
 *      generic skilltree icon from sprites/skilltree/.
 *   2. STYLING: Must use the crimson red + enlarged node style in SkillTree.xaml:
 *      - Outer ellipse: Stroke="#C0392B", Fill="#FF2E0E0E"
 *      - Grid size: 210x210 (vs regular 180x180)
 *      - Icon viewbox: 130x130 (vs regular 110x110)
 *      This visually distinguishes tower unlock nodes from stat-bonus nodes.
 *   3. DESCRIPTION: Must always reflect the current stats and properties of
 *      the tower as defined in TowerDefs.ts (damage, range, cost, fire rate,
 *      special effects like splash radius or slow duration).
 *
 * When adding a NEW tower unlock node:
 *   - Add the node here with appropriate description from TowerDefs.ts
 *   - In SkillTree.xaml, replicate the crimson style from nodes 8/10/16/18/19
 *   - Use the tower's texture from Textures/<tower_name>_tower.png as icon
 *
 * Additionally:
 *   - Fire Cannon (index 16) and Frost Tower (index 19) descriptions must always
 *     mention "Unlocked outside of [home biome] area" (they have biomeExclusive but are available
 *     via skill tree in all biomes).
 * ────────────────────────────────────────────────────────────────────────────────
 */

// --- Node Definition ---------------------------------------------------------

/**
 * Icon category for a skill node. Drives which icon (and, for unlock nodes,
 * which frame style — crimson for TowerUnlock, purple for BiomeUnlock*) is
 * rendered in the skill tree UI. Keeping this on the node def (rather than
 * derived from `index`) means swapping two nodes' content keeps their icon
 * in sync automatically.
 */
export enum SkillIconType {
  Skull = 0,
  Sword = 1,
  Heart = 2,
  Coin = 3,
  Range = 4,
  Treasure = 5,
  Crosshair = 6,
  Snow = 7,
  Lightning = 8,
  Refund = 9,
  TowerUnlock = 10,
  BiomeUnlockSnow = 11,
  BiomeUnlockVolcano = 12,
}

/**
 * Stable content identity for a skill node — what bonus/unlock it grants.
 * `SkillTreeService` looks up nodes by tag (via `getIndexForTag`) instead of
 * hardcoding raw indices, so a node's content can never silently drift out
 * of sync with the index a service getter happens to check.
 */
export enum SkillTag {
  Root = 'root',
  DamageT1 = 'damage-t1', LivesT1 = 'lives-t1', StartingGoldT1 = 'starting-gold-t1',
  LivesT2 = 'lives-t2', RangeT1 = 'range-t1', SellRefundT1 = 'sell-refund-t1',
  CritChanceT1 = 'crit-chance-t1', UnlockLaser = 'unlock-laser', UnlockPillar = 'unlock-pillar',
  UnlockPoison = 'unlock-poison', SlowDurationT1 = 'slow-duration-t1', InterestRateT1 = 'interest-rate-t1',
  DamageT2 = 'damage-t2', StartingGoldT2 = 'starting-gold-t2', UnlockSnowBiome = 'unlock-snow-biome',
  UnlockFireCannon = 'unlock-fire-cannon', FireRateT1 = 'fire-rate-t1', UnlockLightning = 'unlock-lightning',
  UnlockFrost = 'unlock-frost', UnlockVolcanoBiome = 'unlock-volcano-biome', SellRefundT2 = 'sell-refund-t2',
  SplashRadiusT1 = 'splash-radius-t1', SlowDurationT2 = 'slow-duration-t2', GoldPerEnemy = 'gold-per-enemy',
  DamageT3 = 'damage-t3', TowerHpT1 = 'tower-hp-t1', StartingGoldT3 = 'starting-gold-t3',
  FireRateT2 = 'fire-rate-t2', RangeT2 = 'range-t2', SkullRewardDouble = 'skull-reward-double',
}

export interface ISkillNodeDef {
  /** Unique index used in the saved unlock array and for tree position (see header comment). */
  index: number;
  /** Stable content identity — see SkillTag. */
  tag: SkillTag;
  /** Primary bonus magnitude this node grants (0 for tower/biome unlocks and the root, which have no stat magnitude). For infinite nodes, this is the per-purchase amount. */
  value: number;
  /** Secondary bonus magnitude, for nodes whose primary unlock also grants a smaller related effect (e.g. a fire-rate node also boosting projectile speed). Omitted when the node has no secondary effect. */
  secondaryValue?: number;
  /** Human-readable label shown in UI. */
  label: string;
  /** Skull cost to unlock this node. */
  cost: number;
  /** Branch this node belongs to (for UI grouping/coloring). null = root. */
  branch: string | null;
  /** Description shown in the popup overlay when the node is tapped. */
  description: string;
  /** Icon category — see SkillIconType. */
  iconType: SkillIconType;
}

// --- Connection (Edge) -------------------------------------------------------

/**
 * Directed edge in the skill graph: [fromIndex, toIndex].
 * A node is purchasable if at least one node that connects TO it is unlocked.
 * The root node (index 0) has no incoming edges — it's always purchasable if affordable.
 */
export type SkillConnection = readonly [number, number];

// --- Node Definitions --------------------------------------------------------

export const SKILL_NODES: readonly ISkillNodeDef[] = [
  // Root
  { index: 0, tag: SkillTag.Root, value: 0, label: 'UNLOCK TREE', cost: 1, branch: null, description: 'Unlock the skill tree to access all branches.', iconType: SkillIconType.Skull },

  // Tier 1 (indices 1, 2, 3)
  { index: 1, tag: SkillTag.DamageT1, value: 0.05, label: '+5% Damage',        cost: 7, branch: 'war', description: 'All towers deal 5% more damage.', iconType: SkillIconType.Sword },
  { index: 2, tag: SkillTag.LivesT1, value: 2, label: '+2 Starting Lives',   cost: 3, branch: 'fortify', description: 'Start each run with 2 extra lives.', iconType: SkillIconType.Heart },
  { index: 3, tag: SkillTag.StartingGoldT1, value: 10, label: '+10 Starting Gold',   cost: 5, branch: 'fortune', description: 'Begin each run with 10 extra gold.', iconType: SkillIconType.Coin },

  // Tier 2 (indices 4, 5, 6)
  { index: 4, tag: SkillTag.LivesT2, value: 5, label: '+5 Starting Lives',   cost: 6, branch: 'fortify', description: 'Start each run with 5 extra lives.', iconType: SkillIconType.Heart },
  { index: 5, tag: SkillTag.RangeT1, value: 0.05, label: '+5% Tower Range',    cost: 10, branch: 'fortify', description: 'All towers gain 5% increased range.', iconType: SkillIconType.Range },
  { index: 6, tag: SkillTag.SellRefundT1, value: 0.25, label: '+25% Sell Refund',       cost: 9, branch: 'fortune', description: 'Earn 25% more bonus gold per wave.', iconType: SkillIconType.Treasure },

  // Tier 3 (indices 7, 8, 9)
  // NOTE: Tower unlock nodes (indices 8, 9, 10, 16, 18, 19) all share the same crimson red
  // styling and enlarged size in the XAML skill tree UI (SkillTree.xaml) to visually
  // distinguish them from stat-bonus nodes. When adding new tower unlock nodes,
  // replicate the crimson style: outer ellipse Stroke="#C0392B", Fill="#FF2E0E0E",
  // 210x210 grid, 130x130 icon viewbox, and tower texture icon from Textures/.
  { index: 7, tag: SkillTag.UnlockPoison, value: 0, label: 'Unlock Poison Tower', cost: 10, branch: 'war', description: 'Unlocks the Poison Tower for all biomes. DoT tower that lobs toxic globs stacking lingering poison. 90g cost.', iconType: SkillIconType.TowerUnlock },
  { index: 8, tag: SkillTag.UnlockPillar, value: 0, label: 'Unlock Pillar',       cost: 10, branch: 'fortune', description: 'Unlocks the Pillar tower for all biomes. Single-use trap that tips over onto the first enemy in range, instant-killing it, then self-destructs. 30g cost.', iconType: SkillIconType.TowerUnlock },
  { index: 9, tag: SkillTag.UnlockLaser, value: 0, label: 'Unlock Laser Canon',  cost: 20, branch: 'war', description: 'Highest DPS tower. Long range (3.6), rapid fire rate (5.0/s), 200g cost.', iconType: SkillIconType.TowerUnlock },

  // Tier 4 (indices 10, 11, 12)
  { index: 10, tag: SkillTag.CritChanceT1, value: 0.25, label: '+25% Crit Chance',    cost: 15, branch: 'war', description: 'All towers gain 25% increased critical hit chance.', iconType: SkillIconType.Crosshair },
  { index: 11, tag: SkillTag.UnlockSnowBiome, value: 0, label: 'Unlock Snow Biome',  cost: 25, branch: 'fortify', description: 'Unlock the Snow biome for new challenges.', iconType: SkillIconType.BiomeUnlockSnow },
  { index: 12, tag: SkillTag.InterestRateT1, value: 0.20, label: '+20% Interest Rate', cost: 18, branch: 'fortune', description: 'Earn 20% more interest on banked gold.', iconType: SkillIconType.Treasure },

  // Tier 5 (indices 13, 14, 15)
  { index: 13, tag: SkillTag.DamageT2, value: 0.20, label: '+20% Damage',        cost: 20, branch: 'war', description: 'All towers deal 20% more damage.', iconType: SkillIconType.Sword },
  { index: 14, tag: SkillTag.StartingGoldT2, value: 30, label: '+30 Starting Gold',  cost: 20, branch: 'fortune', description: 'Begin each run with 30 extra gold.', iconType: SkillIconType.Coin },
  { index: 15, tag: SkillTag.SlowDurationT1, value: 0.15, secondaryValue: 0.05, label: '+15% Slow Duration', cost: 3, branch: 'fortify', description: 'Slow effects last 15% longer.', iconType: SkillIconType.Snow },

  // Tier 6 (indices 16, 17, 18)
  { index: 16, tag: SkillTag.UnlockFireCannon, value: 0, label: 'Unlock Fire Cannon', cost: 20, branch: 'war', description: 'AoE fire damage with arc projectiles. Splash radius 0.6, 120g cost. Unlocked outside of volcano area.', iconType: SkillIconType.TowerUnlock },
  { index: 17, tag: SkillTag.FireRateT1, value: 0.25, secondaryValue: 0.15, label: '+25% Fire Rate',     cost: 28, branch: 'fortify', description: 'All towers fire 25% faster.', iconType: SkillIconType.Lightning },
  { index: 18, tag: SkillTag.TowerHpT1, value: 0.40, secondaryValue: 2, label: '+40% Tower HP',      cost: 40, branch: 'fortify', description: 'All towers gain 40% more hit points.', iconType: SkillIconType.Heart },

  // Tier 7 (indices 19, 20, 21)
  { index: 19, tag: SkillTag.UnlockFrost, value: 0, label: 'Unlock Frost Tower',     cost: 20, branch: 'war', description: 'Slows enemies by 50% for 1.5s. 80g cost. Unlocked outside of snow area.', iconType: SkillIconType.TowerUnlock },
  { index: 20, tag: SkillTag.UnlockVolcanoBiome, value: 0, label: 'Unlock Volcano Biome',   cost: 30, branch: 'fortify', description: 'Unlock the Volcano biome for fiery trials.', iconType: SkillIconType.BiomeUnlockVolcano },
  { index: 21, tag: SkillTag.SellRefundT2, value: 0.75, secondaryValue: 0.20, label: '+75% Sell Refund',       cost: 17, branch: 'fortune', description: 'Refund 75% more gold when selling towers.', iconType: SkillIconType.Refund },

  // Tier 8 (indices 22, 23, 24)
  { index: 22, tag: SkillTag.SlowDurationT2, value: 0.25, secondaryValue: 0.10, label: '+25% Slow Duration', cost: 30, branch: 'fortify', description: 'Slow effects last 25% longer.', iconType: SkillIconType.Snow },
  { index: 23, tag: SkillTag.SplashRadiusT1, value: 0.30, label: '+30% Splash Radius', cost: 30, branch: 'war', description: 'All splash towers gain 30% larger area.', iconType: SkillIconType.Sword },
  { index: 24, tag: SkillTag.GoldPerEnemy, value: 1, label: '+1 Gold per enemy', cost: 50, branch: 'fortune', description: 'Earn 1 more gold per enemy killed.', iconType: SkillIconType.Treasure },

  // Tier 9 (indices 25, 26, 27)
  { index: 25, tag: SkillTag.DamageT3, value: 0.05, label: '+5% Damage',        cost: 50, branch: 'war', description: 'All towers deal 5% more damage.', iconType: SkillIconType.Sword },
  { index: 26, tag: SkillTag.UnlockLightning, value: 0, label: 'Unlock Lightning Tower', cost: 29, branch: 'fortune', description: 'Unlocks the Lightning Tower for all biomes. Chain lightning multi-target tower, bolts chain to nearby enemies. 300g cost.', iconType: SkillIconType.TowerUnlock },
  { index: 27, tag: SkillTag.StartingGoldT3, value: 50, secondaryValue: 0.25, label: '+80 Starting Gold',  cost: 40, branch: 'fortune', description: 'Begin each run with 50 extra gold.', iconType: SkillIconType.Coin },

  // Tier 10 (indices 28, 29, 30)
  { index: 28, tag: SkillTag.FireRateT2, value: 0.35, secondaryValue: 0.05, label: '+5% Fire Rate',     cost: 50, branch: 'war', description: 'All towers fire 5% faster.', iconType: SkillIconType.Lightning },
  { index: 29, tag: SkillTag.RangeT2, value: 0.40, label: '+40% Tower Range',   cost: 45, branch: 'fortify', description: 'All towers gain 40% increased range.', iconType: SkillIconType.Range },
  { index: 30, tag: SkillTag.SkullRewardDouble, value: 1.00, label: 'Double skull reward', cost: 100, branch: 'fortune', description: 'Beating a run gives twice as many skulls.', iconType: SkillIconType.Treasure },
];

// --- Explicit Graph Connections ----------------------------------------------

/**
 * All connections in the skill tree as directed edges [from, to].
 * "from" being unlocked is a prerequisite for "to" becoming purchasable.
 */
export const SKILL_CONNECTIONS: readonly SkillConnection[] = [
  // Root → branch T1 nodes
  [0, 1],  [0, 2], [0, 3],

  // War branch vertical: T1→T2→...→T10
  [1, 4], /*[4, 7],*/ [7, 10], [10, 13], /*[13, 16],*/ [16, 19], [19, 22], [22, 25], /*[25, 28],*/
  [4, 1], /*[7, 4],*/ [10, 7], [13, 10], /*[16, 13],*/ [19, 16], [22, 19], [25, 22], /*[28, 25],*/

  // Fortify branch vertical: T1→T2→...→T10
  [2, 5], [5, 8], [8, 11], [11, 14], [14, 17],/* [17, 20],*/ [20, 23], [23, 26], [26, 29],
  [5, 2], [8, 5], [11, 8], [14, 11], [17, 14],/* [20, 17],*/ [23, 20], [26, 23], [29, 26],

  // Fortune branch vertical: T1→T2→...→T10
  [3, 6], /*[6, 9],*/ [9, 12], [12, 15], [15, 18], [18, 21], /*[21, 24],*/ [24, 27], [27, 30],
  [6, 3], /*[9, 6],*/ [12, 9], [15, 12], [18, 15], [21, 18], /*[24, 21],*/ [27, 24], [30, 27],

  // Cross-branch lateral connections (tier 1)
  /*[1, 2], [2, 1], [2, 3], [3, 2],*/
  // Cross-branch lateral connections (tier 2)
    /*[4, 5], [5, 4], [5, 6], [6, 5],*/
  // Cross-branch lateral connections (tier 3)
  /*[7, 8], [8, 7], [8, 9], [9, 8],*/
  // Cross-branch lateral connections (tier 5)
  [13, 14], [14, 13], [14, 15], [15, 14],
  // Cross-branch lateral connections (tier 7)
  [19, 20], [20, 19], [20, 21], [21, 20],
  // Cross-branch lateral connections (tier 9)
  /*[25, 26], [26, 25], [26, 27], [27, 26],*/
  // Cross-branch lateral connections (tier 10)
  [28, 29], [29, 28], [29, 30], [30, 29],

    // Cross-tier
  [4, 8], [8, 4],
  [6, 8], [8, 6],
  /*[17, 13], [13, 17],*/
  //[23, 21], [21, 23],
];

// --- Infinite (re-purchasable) nodes -----------------------------------------

/**
 * Skill node indices that can be purchased infinitely. Each re-purchase stacks
 * the bonus additively (e.g. +30% damage × 3 purchases = +90%).
 */
export const INFINITE_SKILL_NODES: ReadonlySet<number> = new Set([24, 25, 28]);

// --- Helpers -----------------------------------------------------------------

/** Index of the root skill. */
export const ROOT_SKILL_INDEX = 0;

/** Total number of skills across all branches + root. */
export const TOTAL_SKILLS = 31;

/** Get the node def for a given index. */
export function getNodeDef(index: number): ISkillNodeDef | undefined {
  return SKILL_NODES.find(n => n.index === index);
}

/** Resolves a content tag to whichever node currently holds it. */
const TAG_TO_NODE: ReadonlyMap<SkillTag, ISkillNodeDef> = new Map(SKILL_NODES.map(n => [n.tag, n]));
export function getNodeByTag(tag: SkillTag): ISkillNodeDef {
  const node = TAG_TO_NODE.get(tag);
  if (!node) throw new Error(`No skill node has tag ${tag}`);
  return node;
}

/** Resolves a content tag to whichever index currently holds that node. */
export function getIndexForTag(tag: SkillTag): number {
  return getNodeByTag(tag).index;
}

/**
 * Get all incoming connections for a node (i.e., which nodes point TO it).
 * A node is purchasable when at least one of its incoming-connected nodes is unlocked.
 */
export function getPrerequisites(nodeIndex: number): number[] {
  const prereqs: number[] = [];
  for (const [from, to] of SKILL_CONNECTIONS) {
    if (to === nodeIndex) {
      prereqs.push(from);
    }
  }
  return prereqs;
}

/**
 * Get all outgoing connections from a node (i.e., which nodes it leads to).
 * Used by the UI to render connecting lines FROM this node.
 */
export function getOutgoingConnections(nodeIndex: number): number[] {
  const outgoing: number[] = [];
  for (const [from, to] of SKILL_CONNECTIONS) {
    if (from === nodeIndex) {
      outgoing.push(to);
    }
  }
  return outgoing;
}

// --- Legacy compatibility exports --------------------------------------------

export interface ISkillTierDef {
  index: number;
  label: string;
  cost: number;
}

/** The root skill that must be unlocked to access any branch. */
export const ROOT_SKILL: ISkillTierDef = { index: 0, label: 'UNLOCK TREE', cost: 1 };
