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

export interface ISkillNodeDef {
  /** Unique index used in the saved unlock array. */
  index: number;
  /** Human-readable label shown in UI. */
  label: string;
  /** Skull cost to unlock this node. */
  cost: number;
  /** Branch this node belongs to (for UI grouping/coloring). null = root. */
  branch: string | null;
  /** Description shown in the popup overlay when the node is tapped. */
  description: string;
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
  { index: 0, label: 'UNLOCK TREE', cost: 1, branch: null, description: 'Unlock the skill tree to access all branches.' },

  // Tier 1 (indices 1, 2, 3)
  { index: 1, label: '+10% Damage',        cost: 3, branch: 'war', description: 'All towers deal 10% more damage.' },
  { index: 2, label: '+2 Starting Lives',   cost: 3, branch: 'fortify', description: 'Start each run with 2 extra lives.' },
  { index: 3, label: '+30 Starting Gold',   cost: 3, branch: 'fortune', description: 'Begin each run with 30 extra gold.' },

  // Tier 2 (indices 4, 5, 6)
  { index: 4, label: '+5 Starting Lives',   cost: 10, branch: 'fortify', description: 'Start each run with 5 extra lives.' },
  { index: 5, label: '+20% Tower Range',    cost: 6, branch: 'fortify', description: 'All towers gain 20% increased range.' },
  { index: 6, label: '+25% Wave Bonus Gold', cost: 6, branch: 'fortune', description: 'Earn 25% more bonus gold per wave.' },

  // Tier 3 (indices 7, 8, 9)
  // NOTE: Tower unlock nodes (indices 8, 9, 10, 16, 18, 19) all share the same crimson red
  // styling and enlarged size in the XAML skill tree UI (SkillTree.xaml) to visually
  // distinguish them from stat-bonus nodes. When adding new tower unlock nodes,
  // replicate the crimson style: outer ellipse Stroke="#C0392B", Fill="#FF2E0E0E",
  // 210x210 grid, 130x130 icon viewbox, and tower texture icon from Textures/.
  { index: 7, label: '+25% Crit Chance',    cost: 10, branch: 'war', description: 'All towers gain 25% increased critical hit chance.' },
  { index: 8, label: 'Unlock Laser Canon',  cost: 6, branch: 'war', description: 'Highest DPS tower. Long range (3.6), rapid fire rate (5.0/s), 200g cost.' },
  { index: 9, label: 'Unlock Pillar',       cost: 8, branch: 'fortune', description: 'Unlocks the Pillar tower for all biomes. Single-use trap that tips over onto the first enemy in range, instant-killing it, then self-destructs. 30g cost.' },

  // Tier 4 (indices 10, 11, 12)
  { index: 10, label: 'Unlock Poison Tower', cost: 8, branch: 'war', description: 'Unlocks the Poison Tower for all biomes. DoT tower that lobs toxic globs stacking lingering poison. 90g cost.' },
  { index: 11, label: '+15% Slow Duration', cost: 3, branch: 'fortify', description: 'Slow effects last 15% longer.' },
  { index: 12, label: '+20% Interest Rate', cost: 3, branch: 'fortune', description: 'Earn 20% more interest on banked gold.' },

  // Tier 5 (indices 13, 14, 15)
  { index: 13, label: '+20% Damage',        cost: 4, branch: 'war', description: 'All towers deal 20% more damage.' },
  { index: 14, label: '+50 Starting Gold',  cost: 4, branch: 'fortune', description: 'Begin each run with 50 extra gold.' },
  { index: 15, label: 'Unlock Snow Biome',  cost: 10, branch: 'fortify', description: 'Unlock the Snow biome for new challenges.' },

  // Tier 6 (indices 16, 17, 18)
  { index: 16, label: 'Unlock Fire Cannon', cost: 12, branch: 'war', description: 'AoE fire damage with arc projectiles. Splash radius 0.6, 120g cost. Unlocked outside of volcano area.' },
  { index: 17, label: '+25% Fire Rate',     cost: 5, branch: 'fortify', description: 'All towers fire 25% faster.' },
  { index: 18, label: 'Unlock Lightning Tower', cost: 14, branch: 'fortune', description: 'Unlocks the Lightning Tower for all biomes. Chain lightning multi-target tower, bolts chain to nearby enemies. 300g cost.' },

  // Tier 7 (indices 19, 20, 21)
  { index: 19, label: 'Unlock Frost Tower',     cost: 12, branch: 'war', description: 'Slows enemies by 50% for 1.5s. 80g cost. Unlocked outside of snow area.' },
  { index: 20, label: 'Unlock Volcano Biome',   cost: 18, branch: 'fortify', description: 'Unlock the Volcano biome for fiery trials.' },
  { index: 21, label: '+75% Sell Refund',       cost: 6, branch: 'fortune', description: 'Refund 75% more gold when selling towers.' },

  // Tier 8 (indices 22, 23, 24)
  { index: 22, label: '+30% Splash Radius', cost: 7, branch: 'war', description: 'All splash towers gain 30% larger area.' },
  { index: 23, label: '+25% Slow Duration', cost: 7, branch: 'fortify', description: 'Slow effects last 25% longer.' },
  { index: 24, label: '+35% Interest Rate', cost: 7, branch: 'fortune', description: 'Earn 35% more interest on banked gold.' },

  // Tier 9 (indices 25, 26, 27)
  { index: 25, label: '+30% Damage',        cost: 8, branch: 'war', description: 'All towers deal 30% more damage.' },
  { index: 26, label: '+40% Tower HP',      cost: 8, branch: 'fortify', description: 'All towers gain 40% more hit points.' },
  { index: 27, label: '+80 Starting Gold',  cost: 8, branch: 'fortune', description: 'Begin each run with 80 extra gold.' },

  // Tier 10 (indices 28, 29, 30)
  { index: 28, label: '+35% Fire Rate',     cost: 9, branch: 'war', description: 'All towers fire 35% faster.' },
  { index: 29, label: '+40% Tower Range',   cost: 9, branch: 'fortify', description: 'All towers gain 40% increased range.' },
  { index: 30, label: '+60% Wave Bonus Gold', cost: 9, branch: 'fortune', description: 'Earn 60% more bonus gold per wave.' },
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
  [1, 4], [4, 7], [7, 10], [10, 13], /*[13, 16],*/ [16, 19], [19, 22], [22, 25], /*[25, 28],*/
  [4, 1], [7, 4], [10, 7], [13, 10], /*[16, 13],*/ [19, 16], [22, 19], [25, 22], /*[28, 25],*/

  // Fortify branch vertical: T1→T2→...→T10
  [2, 5], [5, 8], [8, 11], [11, 14], [14, 17],/* [17, 20],*/ [20, 23], [23, 26], [26, 29],
  [5, 2], [8, 5], [11, 8], [14, 11], [17, 14],/* [20, 17],*/ [23, 20], [26, 23], [29, 26],

  // Fortune branch vertical: T1→T2→...→T10
  [3, 6], [6, 9], [9, 12], [12, 15], [15, 18], [18, 21], /*[21, 24],*/ [24, 27], [27, 30],
  [6, 3], [9, 6], [12, 9], [15, 12], [18, 15], [21, 18], /*[24, 21],*/ [27, 24], [30, 27],

  // Cross-branch lateral connections (tier 1)
  /*[1, 2], [2, 1], [2, 3], [3, 2],*/
  // Cross-branch lateral connections (tier 2)
    /*[4, 5], [5, 4], [5, 6], [6, 5],*/
  // Cross-branch lateral connections (tier 3)
  /*[7, 8], [8, 7], [8, 9], [9, 8],*/
  // Cross-branch lateral connections (tier 5)
  /*[13, 14], [14, 13],*/ [14, 15], [15, 14],
  // Cross-branch lateral connections (tier 7)
  [19, 20], [20, 19], /*[20, 21], [21, 20],*/
  // Cross-branch lateral connections (tier 9)
  /*[25, 26], [26, 25], [26, 27], [27, 26],*/
  // Cross-branch lateral connections (tier 10)
  [28, 29], [29, 28], [29, 30], [30, 29],

    // Cross-tier
  [4, 8], [8, 4], [6, 8], [8, 6], [17, 13], [13, 17], [23, 21], [21, 23],
];

// --- Helpers -----------------------------------------------------------------

/** Index of the root skill. */
export const ROOT_SKILL_INDEX = 0;

/** Total number of skills across all branches + root. */
export const TOTAL_SKILLS = 31;

/** Get the node def for a given index. */
export function getNodeDef(index: number): ISkillNodeDef | undefined {
  return SKILL_NODES.find(n => n.index === index);
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

export interface ISkillBranchDef {
  id: string;
  name: string;
  icon: string;
  tiers: readonly ISkillTierDef[];
}

const WAR_BRANCH: ISkillBranchDef = {
  id: 'war',
  name: 'War',
  icon: '⚔️',
  tiers: [
    { index: 1, label: '+10% Damage',      cost: 3 },
    { index: 8, label: 'Unlock Laser Canon',  cost: 6 },
    { index: 7, label: '+25% Crit Chance', cost: 10 },
  ],
};

const FORTIFY_BRANCH: ISkillBranchDef = {
  id: 'fortify',
  name: 'Fortify',
  icon: '🛡️',
  tiers: [
    { index: 2, label: '+2 Starting Lives',  cost: 3 },
    { index: 5, label: '+20% Tower Range',   cost: 6 },
    { index: 4, label: '+5 Starting Lives',  cost: 10 },
  ],
};

const FORTUNE_BRANCH: ISkillBranchDef = {
  id: 'fortune',
  name: 'Fortune',
  icon: '💰',
  tiers: [
    { index: 3, label: '+30 Starting Gold',    cost: 3 },
    { index: 6, label: '+25% Wave Bonus Gold', cost: 6 },
    { index: 9, label: 'Unlock Pillar',        cost: 8 },
  ],
};

export const SKILL_BRANCHES: readonly ISkillBranchDef[] = [WAR_BRANCH, FORTIFY_BRANCH, FORTUNE_BRANCH];

/** The root skill that must be unlocked to access any branch. */
export const ROOT_SKILL: ISkillTierDef = { index: 0, label: 'UNLOCK TREE', cost: 1 };
