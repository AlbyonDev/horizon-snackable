/**
 * SkillTreeService — Manages permanent skill tree unlocks and provides bonus getters.
 *
 * Component Attachment: none (@service() singleton)
 * Component Networking: Client-only (save data is client-authoritative via SaveService)
 * Component Ownership: N/A (singleton service)
 *
 * Stores which skill indices are unlocked (persisted via SaveService `st` field).
 * Provides getters consumed by TowerService, ResourceService, CritService, WaveService.
 *
 * Purchase prerequisite logic uses the explicit graph connections in SkillTreeDefs:
 * a node is purchasable when at least one of its incoming-connected nodes is already unlocked.
 * The root node (index 0) has no incoming edges and is always purchasable if affordable.
 */
import { Service, EventService } from 'meta/worlds';
import { service, subscribe } from 'meta/worlds';
import { OnServiceReadyEvent } from 'meta/worlds';
import {
  SKILL_NODES,
  TOTAL_SKILLS,
  ROOT_SKILL_INDEX,
  INFINITE_SKILL_NODES,
  getNodeDef,
  getPrerequisites,
} from '../Defs/SkillTreeDefs';

/** Skill node index that unlocks the Laser tower in the shop. */
export const LASER_UNLOCK_NODE_INDEX = 8;

/** Skill node index that unlocks the Snow biome. */
export const SNOW_UNLOCK_NODE_INDEX = 14;

/** Skill node index that unlocks the Volcano biome. */
export const VOLCANO_UNLOCK_NODE_INDEX = 20;

/** Skill node index that unlocks the Fire Cannon tower for all biomes. */
export const FIRE_CANNON_UNLOCK_NODE_INDEX = 16;

/** Skill node index that unlocks the Frost tower for all biomes. */
export const FROST_UNLOCK_NODE_INDEX = 19;

/** Skill node index that unlocks the Poison tower. */
export const POISON_UNLOCK_NODE_INDEX = 10;

/** Skill node index that unlocks the Lightning tower. */
export const LIGHTNING_UNLOCK_NODE_INDEX = 18;

/** Skill node index that unlocks the Pillar tower. */
export const PILLAR_UNLOCK_NODE_INDEX = 9;
import type { ISkillNodeDef } from '../Defs/SkillTreeDefs';
import { Events } from '../Types';
import { SaveService } from './SaveService';

@service()
export class SkillTreeService extends Service {
  /** Set of unlocked skill indices (0-39). */
  private _unlocked: Set<number> = new Set();

  /** Purchase counts for infinite (re-buyable) nodes. */
  private _infiniteCounts: Map<number, number> = new Map();

  @subscribe(OnServiceReadyEvent)
  onReady(): void {
    console.log('[SkillTreeService] Initialized');
  }

  /** Restore skill tree state from saved data. Called on session load. */
  @subscribe(Events.SaveRestored)
  onSaveRestored(p: Events.SaveRestoredPayload): void {
    this._unlocked.clear();
    this._infiniteCounts.clear();
    if (p.skillTree && p.skillTree.length > 0) {
      for (const idx of p.skillTree) {
        if (typeof idx === 'number' && idx >= 0 && idx < TOTAL_SKILLS) {
          this._unlocked.add(idx);
        }
      }
    }
    // Restore infinite node purchase counts
    if (p.skillTreeCounts) {
      for (const key of Object.keys(p.skillTreeCounts)) {
        const idx = parseInt(key, 10);
        const count = p.skillTreeCounts[key];
        if (!isNaN(idx) && INFINITE_SKILL_NODES.has(idx) && count > 0) {
          this._infiniteCounts.set(idx, count);
        }
      }
    }
    console.log(`[SkillTreeService] Restored ${this._unlocked.size} unlocked skills: [${[...this._unlocked].join(',')}], infinite counts: ${JSON.stringify(Object.fromEntries(this._infiniteCounts))}`);
  }

  // ── Public API ────────────────────────────────────────────────────────────

  /** Check if a specific skill index is unlocked. */
  isUnlocked(skillIndex: number): boolean {
    return this._unlocked.has(skillIndex);
  }

  /** Get all unlocked skill indices as an array (for save persistence). */
  getUnlockedIndices(): number[] {
    return [...this._unlocked];
  }

  /** Get the number of unlocked skills. */
  get unlockedCount(): number {
    return this._unlocked.size;
  }

  /** Get the purchase count for an infinite skill node (0 if not purchased or not infinite). */
  getInfiniteCount(skillIndex: number): number {
    return this._infiniteCounts.get(skillIndex) ?? 0;
  }

  /** Get all infinite node counts as a Record (for save persistence). */
  getInfiniteCountsRecord(): Record<string, number> {
    const result: Record<string, number> = {};
    for (const [idx, count] of this._infiniteCounts.entries()) {
      result[String(idx)] = count;
    }
    return result;
  }

  /** Check if the root skill (index 0) is unlocked. */
  isRootUnlocked(): boolean {
    return this._unlocked.has(ROOT_SKILL_INDEX);
  }

  /** Check if the Laser tower has been unlocked via the skill tree (node index 8). */
  isLaserUnlocked(): boolean {
    return this._unlocked.has(LASER_UNLOCK_NODE_INDEX);
  }

  /** Check if the Snow biome has been unlocked via the skill tree (node index 14). */
  isSnowUnlocked(): boolean {
    return this._unlocked.has(SNOW_UNLOCK_NODE_INDEX);
  }

  /** Check if the Volcano biome has been unlocked via the skill tree (node index 20). */
  isVolcanoUnlocked(): boolean {
    return this._unlocked.has(VOLCANO_UNLOCK_NODE_INDEX);
  }

  /** Check if the Fire Cannon tower has been unlocked for all biomes (node index 17). */
  isFireCannonUnlocked(): boolean {
    return this._unlocked.has(FIRE_CANNON_UNLOCK_NODE_INDEX);
  }

  /** Check if the Frost tower has been unlocked for all biomes (node index 19). */
  isFrostUnlocked(): boolean {
    return this._unlocked.has(FROST_UNLOCK_NODE_INDEX);
  }

  /** Check if the Poison tower has been unlocked via the skill tree (node index 10). */
  isPoisonUnlocked(): boolean {
    return this._unlocked.has(POISON_UNLOCK_NODE_INDEX);
  }

  /** Check if the Lightning tower has been unlocked via the skill tree (node index 18). */
  isLightningUnlocked(): boolean {
    return this._unlocked.has(LIGHTNING_UNLOCK_NODE_INDEX);
  }

  /** Check if the Pillar tower has been unlocked via the skill tree (node index 8). */
  isPillarUnlocked(): boolean {
    return this._unlocked.has(PILLAR_UNLOCK_NODE_INDEX);
  }

  /**
   * Attempt to purchase a skill node. Returns true if successful.
   */
  purchase(skillIndex: number): boolean {
    // For infinite nodes, allow re-purchase even if already unlocked
    const isInfinite = INFINITE_SKILL_NODES.has(skillIndex);

    if (!isInfinite && this._unlocked.has(skillIndex)) {
      console.log(`[SkillTreeService] Skill ${skillIndex} already unlocked`);
      return false;
    }

    const nodeDef = getNodeDef(skillIndex);
    if (!nodeDef) {
      console.log(`[SkillTreeService] Unknown skill index ${skillIndex}`);
      return false;
    }

    if (!this._meetsPrerequisites(skillIndex) && !this._unlocked.has(skillIndex)) {
      console.log(`[SkillTreeService] Prerequisites not met for skill ${skillIndex}`);
      return false;
    }

    const save = SaveService.get();
    if (save.getSkullCount() < nodeDef.cost) {
      console.log(`[SkillTreeService] Not enough skulls for skill ${skillIndex}: have ${save.getSkullCount()}, need ${nodeDef.cost}`);
      return false;
    }

    save.spendSkulls(nodeDef.cost);
    this._unlocked.add(skillIndex);

    if (isInfinite) {
      const currentCount = this._infiniteCounts.get(skillIndex) ?? 0;
      this._infiniteCounts.set(skillIndex, currentCount + 1);
      console.log(`[SkillTreeService] Purchased infinite skill ${skillIndex} (${nodeDef.label}) x${currentCount + 1} for ${nodeDef.cost} skulls`);
      save.setSkillTreeCounts(this.getInfiniteCountsRecord());
    } else {
      console.log(`[SkillTreeService] Purchased skill ${skillIndex} (${nodeDef.label}) for ${nodeDef.cost} skulls`);
    }

    save.setSkillTreeState(this.getUnlockedIndices());

    return true;
  }

  /** Are the prerequisites for this skill met? (not bought, not checking affordability) */
  hasPrerequisitesMet(skillIndex: number): boolean {
    // Infinite nodes that are already bought remain buyable (prereqs always met)
    if (INFINITE_SKILL_NODES.has(skillIndex) && this._unlocked.has(skillIndex)) return true;
    if (!INFINITE_SKILL_NODES.has(skillIndex) && this._unlocked.has(skillIndex)) return false;
    const nodeDef = getNodeDef(skillIndex);
    if (!nodeDef) return false;
    return this._meetsPrerequisites(skillIndex);
  }

  /** Can the player afford and unlock this skill? */
  canPurchase(skillIndex: number): boolean {
    // Infinite nodes can always be re-purchased if affordable + prereqs met
    if (INFINITE_SKILL_NODES.has(skillIndex)) {
      if (!this._unlocked.has(skillIndex) && !this._meetsPrerequisites(skillIndex)) return false;
      const nodeDef = getNodeDef(skillIndex);
      if (!nodeDef) return false;
      return SaveService.get().getSkullCount() >= nodeDef.cost;
    }

    if (this._unlocked.has(skillIndex)) return false;

    const nodeDef = getNodeDef(skillIndex);
    if (!nodeDef) return false;

    if (!this._meetsPrerequisites(skillIndex)) return false;

    return SaveService.get().getSkullCount() >= nodeDef.cost;
  }

  // ── Bonus Getters (consumed by gameplay services) ─────────────────────────
  // Each getter accumulates bonuses from ALL relevant unlocked nodes in a branch.
  // Multiple tiers of the same bonus type stack additively.

  /** War branch: total bonus damage multiplier (stacks: T1 +10%, T5 +20%, T9 +30%). */
  getDamageMultiplier(): number {
    let bonus = 0;
    if (this._unlocked.has(1)) bonus += 0.05;
    if (this._unlocked.has(13)) bonus += 0.20;
    // Node 25 is infinite: stacks per purchase count
    if (this._unlocked.has(25)) bonus += 0.05 * Math.max(1, this._infiniteCounts.get(25) ?? 1);
    return 1.0 + bonus;
  }

  /** War branch: total fire rate multiplier (stacks: T2 +15%, T6 +25%, T10 +35%). */
  getFireRateMultiplier(): number {
    let bonus = 0;
    if (this._unlocked.has(4)) bonus += 0.15;
    if (this._unlocked.has(17)) bonus += 0.25;
    // Node 28 is infinite: stacks per purchase count
    if (this._unlocked.has(28)) bonus += 0.35 * Math.max(1, this._infiniteCounts.get(28) ?? 1);
    return 1.0 + bonus;
  }

  /** War branch: total crit chance bonus (stacks: T3 +25%). */
  getCritChanceBonus(): number {
    let bonus = 0;
    if (this._unlocked.has(7)) bonus += 0.25;
    return bonus;
  }

  /** War branch: crit damage multiplier (no longer has dedicated nodes after tree rework). */
  getCritDamageMultiplier(): number {
    return 1.0;
  }

  /** War branch: total splash radius bonus (stacks: T8 +30%). */
  getSplashRadiusMultiplier(): number {
    let bonus = 0;
    if (this._unlocked.has(22)) bonus += 0.30;
    return 1.0 + bonus;
  }

  /** Fortify T1: +2 starting lives */
  getBonusLivesTier1(): number {
    return this._unlocked.has(2) ? 2 : 0;
  }

  /** Fortify branch: tower range multiplier (stacks: T2 +5%, T10 +40%). */
  getRangeMultiplier(): number {
    let bonus = 0;
    if (this._unlocked.has(5)) bonus += 0.05;
    if (this._unlocked.has(29)) bonus += 0.40;
    return 1.0 + bonus;
  }

  /** Fortify T3: +5 starting lives */
  getBonusLivesTier3(): number {
    return this._unlocked.has(8) ? 5 : 0;
  }

  /** Total bonus lives from skill tree (all fortify life nodes). */
  getTotalBonusLives(): number {
    let lives = 0;
    if (this._unlocked.has(2)) lives += 2;   // T1
    if (this._unlocked.has(8)) lives += 5;   // T3
    return lives;
  }

  /** Fortify branch: slow duration bonus (stacks: T4 +15%, T8 +25%). */
  getSlowDurationMultiplier(): number {
    let bonus = 0;
    if (this._unlocked.has(11)) bonus += 0.15;
    if (this._unlocked.has(23)) bonus += 0.25;
    return 1.0 + bonus;
  }

  /** Fortify branch: tower HP bonus (stacks: T9 +40%). */
  getTowerHpMultiplier(): number {
    let bonus = 0;
    if (this._unlocked.has(26)) bonus += 0.40;
    return 1.0 + bonus;
  }

  /** Fortune T1: +30 starting gold → flat bonus. */
  getStartingGoldBonus(): number {
    let bonus = 0;
    if (this._unlocked.has(3)) bonus += 10;
    if (this._unlocked.has(14)) bonus += 30;
    if (this._unlocked.has(27)) bonus += 50;
    return bonus;
  }

  /** Fortune branch: wave bonus gold multiplier (stacks: T2 +25%, T10 +60%). */
  getWaveBonusGoldMultiplier(): number {
    let bonus = 0;
    //if (this._unlocked.has(30)) bonus += 0.60;
    return 1.0 + bonus;
  }

  /** Fortune branch: sell refund bonus (stacks: T7 +75%). */
  getSellRefundBonus(): number {
    let bonus = 0;
    if (this._unlocked.has(6)) bonus += 0.25;
    if (this._unlocked.has(21)) bonus += 0.75;
    return bonus;
  }

  /** Fortune branch: interest rate bonus (stacks: T4 +20%, T8 +35%). */
  getInterestRateBonus(): number {
    let bonus = 0;
    if (this._unlocked.has(12)) bonus += 0.20;
    // Node 24 is infinite: stacks per purchase count
    return bonus;
  }

  // ── NEW Bonus Getters (higher-tier secondary effects) ─────────────────────

  /** War branch: projectile speed multiplier (secondary on fire rate nodes). */
  getProjectileSpeedMultiplier(): number {
    let bonus = 0;
    if (this._unlocked.has(4)) bonus += 0.10;   // T2 fire rate node
    if (this._unlocked.has(17)) bonus += 0.15;  // T6 fire rate node
    // Node 28 is infinite: stacks per purchase count
    if (this._unlocked.has(28)) bonus += 0.05 * Math.max(1, this._infiniteCounts.get(28) ?? 1);
    return 1.0 + bonus;
  }

  /** War branch: crit multiplier escalation (secondary on damage nodes). */
  getCritMultiplierBonus(): number {
    let bonus = 0;
    //if (this._unlocked.has(25)) bonus += 0.05 * Math.max(1, this._infiniteCounts.get(25) ?? 1);
    return 1.0 + bonus;
  }

  /** Fortify branch: slow factor bonus — increases the magnitude of slow applied. */
  getSlowFactorBonus(): number {
    let bonus = 0;
    if (this._unlocked.has(11)) bonus += 0.05;  // T4 slow duration node
    if (this._unlocked.has(23)) bonus += 0.10;  // T8 slow duration node
    if (this._unlocked.has(29)) bonus += 0.15;
    return bonus;
  }

  /** Fortify branch: armor bonus — flat damage reduction per hit. */
  getArmorBonus(): number {
    let bonus = 0;
    if (this._unlocked.has(26)) bonus += 2;   // T9 tower HP node
    if (this._unlocked.has(29)) bonus += 3;
    return bonus;
  }

  /** Fortune branch: skull earn rate multiplier — bonus skulls earned per run. */
  getSkullEarnRateMultiplier(): number {
    let bonus = 0;
    // Node 24 is infinite: stacks per purchase count
    if (this._unlocked.has(30)) bonus += 1.00;  // T10 wave bonus node
    return 1.0 + bonus;
  }

  /** Fortune branch: flat gold per kill bonus. */
  getGoldPerKillBonus(): number {
    let bonus = 0;
    if (this._unlocked.has(24)) bonus += 1 * Math.max(1, this._infiniteCounts.get(24) ?? 1);
    return bonus;
  }

  /** Fortune branch: income rate multiplier — passive gold per wave multiplier. */
  getIncomeRateMultiplier(): number {
    let bonus = 0;
    if (this._unlocked.has(15)) bonus += 0.15;  // T5 starting gold node
    if (this._unlocked.has(21)) bonus += 0.20;  // T7 sell refund node
    if (this._unlocked.has(27)) bonus += 0.25;  // T9 starting gold node
    return 1.0 + bonus;
  }

  // ── Private ───────────────────────────────────────────────────────────────

  private _meetsPrerequisites(skillIndex: number): boolean {
    if (skillIndex === ROOT_SKILL_INDEX) return true;

    const prereqs = getPrerequisites(skillIndex);
    if (prereqs.length === 0) return false;

    for (const prereq of prereqs) {
      if (this._unlocked.has(prereq)) return true;
    }
    return false;
  }
}
