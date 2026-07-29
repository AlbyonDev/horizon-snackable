/**
 * SkillTreeDefs.ts — Skill tree branch and tier definitions.
 *
 * 3 branches × 3 tiers of permanent meta-progression bonuses purchased with skulls.
 * Each tier must be unlocked sequentially (tier 0 before tier 1, etc.).
 * Skill indices: War 0-2, Fortify 3-5, Fortune 6-8.
 */

export interface ISkillTierDef {
  /** Unique index (0-8) used in the saved unlock array. */
  index: number;
  /** Human-readable label shown in UI. */
  label: string;
  /** Skull cost to unlock this tier. */
  cost: number;
}

export interface ISkillBranchDef {
  id: string;
  name: string;
  icon: string;
  tiers: readonly ISkillTierDef[];
}

// War (Offense)
const WAR_BRANCH: ISkillBranchDef = {
  id: 'war',
  name: 'War',
  icon: '⚔️',
  tiers: [
    { index: 0, label: '+10% Damage',     cost: 3 },
    { index: 1, label: '+15% Fire Rate',   cost: 6 },
    { index: 2, label: '+25% Crit Chance', cost: 10 },
  ],
};

// Fortify (Defense)
const FORTIFY_BRANCH: ISkillBranchDef = {
  id: 'fortify',
  name: 'Fortify',
  icon: '🛡️',
  tiers: [
    { index: 3, label: '+2 Starting Lives',  cost: 3 },
    { index: 4, label: '+20% Tower Range',   cost: 6 },
    { index: 5, label: '+5 Starting Lives',  cost: 10 },
  ],
};

// Fortune (Economy)
const FORTUNE_BRANCH: ISkillBranchDef = {
  id: 'fortune',
  name: 'Fortune',
  icon: '💰',
  tiers: [
    { index: 6, label: '+30 Starting Gold',    cost: 3 },
    { index: 7, label: '+25% Wave Bonus Gold', cost: 6 },
    { index: 8, label: '+50% Sell Refund',     cost: 10 },
  ],
};

export const SKILL_BRANCHES: readonly ISkillBranchDef[] = [WAR_BRANCH, FORTIFY_BRANCH, FORTUNE_BRANCH];

/** Total number of skills across all branches. */
export const TOTAL_SKILLS = 9;
