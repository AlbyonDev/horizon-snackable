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
  SkillTag,
  getNodeDef,
  getPrerequisites,
  getIndexForTag,
  getNodeByTag,
} from '../Defs/SkillTreeDefs';
import type { ISkillNodeDef } from '../Defs/SkillTreeDefs';
import { Events } from '../Types';
import { SaveService } from './SaveService';

/** Growth factor applied to an infinite node's skull cost per purchase: cost(n) = ceil(baseCost * 1.10^n). */
const INFINITE_COST_GROWTH = 1.10;

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

  /** Check if the Laser tower has been unlocked via the skill tree. */
  isLaserUnlocked(): boolean {
    return this._hasTag(SkillTag.UnlockLaser);
  }

  /** Check if the Snow biome has been unlocked via the skill tree. */
  isSnowUnlocked(): boolean {
    return this._hasTag(SkillTag.UnlockSnowBiome);
  }

  /** Check if the Volcano biome has been unlocked via the skill tree. */
  isVolcanoUnlocked(): boolean {
    return this._hasTag(SkillTag.UnlockVolcanoBiome);
  }

  /** Check if the Fire Cannon tower has been unlocked for all biomes. */
  isFireCannonUnlocked(): boolean {
    return this._hasTag(SkillTag.UnlockFireCannon);
  }

  /** Check if the Frost tower has been unlocked for all biomes. */
  isFrostUnlocked(): boolean {
    return this._hasTag(SkillTag.UnlockFrost);
  }

  /** Check if the Poison tower has been unlocked via the skill tree. */
  isPoisonUnlocked(): boolean {
    return this._hasTag(SkillTag.UnlockPoison);
  }

  /** Check if the Lightning tower has been unlocked via the skill tree. */
  isLightningUnlocked(): boolean {
    return this._hasTag(SkillTag.UnlockLightning);
  }

  /** Check if the Pillar tower has been unlocked via the skill tree. */
  isPillarUnlocked(): boolean {
    return this._hasTag(SkillTag.UnlockPillar);
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

    const cost = this._costFor(nodeDef);
    const save = SaveService.get();
    if (save.getSkullCount() < cost) {
      console.log(`[SkillTreeService] Not enough skulls for skill ${skillIndex}: have ${save.getSkullCount()}, need ${cost}`);
      return false;
    }

    save.spendSkulls(cost);
    this._unlocked.add(skillIndex);

    if (isInfinite) {
      const currentCount = this._infiniteCounts.get(skillIndex) ?? 0;
      this._infiniteCounts.set(skillIndex, currentCount + 1);
      console.log(`[SkillTreeService] Purchased infinite skill ${skillIndex} (${nodeDef.label}) x${currentCount + 1} for ${cost} skulls`);
      save.setSkillTreeCounts(this.getInfiniteCountsRecord());
    } else {
      console.log(`[SkillTreeService] Purchased skill ${skillIndex} (${nodeDef.label}) for ${cost} skulls`);
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
      return SaveService.get().getSkullCount() >= this._costFor(nodeDef);
    }

    if (this._unlocked.has(skillIndex)) return false;

    const nodeDef = getNodeDef(skillIndex);
    if (!nodeDef) return false;

    if (!this._meetsPrerequisites(skillIndex)) return false;

    return SaveService.get().getSkullCount() >= nodeDef.cost;
  }

  /** Current skull cost to purchase this node — escalates for infinite nodes based on purchase count. */
  getCurrentCost(skillIndex: number): number {
    const nodeDef = getNodeDef(skillIndex);
    return nodeDef ? this._costFor(nodeDef) : 0;
  }

  // ── Bonus Getters (consumed by gameplay services) ─────────────────────────
  // Each getter accumulates bonuses from ALL relevant unlocked nodes in a branch.
  // Multiple tiers of the same bonus type stack additively.

  /** War branch: total bonus damage multiplier (stacks DamageT1/T2/T3; T3 is infinite). */
  getDamageMultiplier(): number {
    return 1.0 + this._tagBonus(SkillTag.DamageT1) + this._tagBonus(SkillTag.DamageT2) + this._tagBonus(SkillTag.DamageT3);
  }

  /** War branch: total fire rate multiplier (stacks FireRateT1/T2; T2 is infinite). */
  getFireRateMultiplier(): number {
    return 1.0 + this._tagBonus(SkillTag.FireRateT1) + this._tagBonus(SkillTag.FireRateT2);
  }

  /** War branch: total crit chance bonus. */
  getCritChanceBonus(): number {
    return this._tagBonus(SkillTag.CritChanceT1);
  }

  /** War branch: crit damage multiplier (no longer has dedicated nodes after tree rework). */
  getCritDamageMultiplier(): number {
    return 1.0;
  }

  /** War branch: total splash radius bonus. */
  getSplashRadiusMultiplier(): number {
    return 1.0 + this._tagBonus(SkillTag.SplashRadiusT1);
  }

  /** Fortify T1: +2 starting lives */
  getBonusLivesTier1(): number {
    return this._tagBonus(SkillTag.LivesT1);
  }

  /** Fortify branch: tower range multiplier (stacks RangeT1/T2). */
  getRangeMultiplier(): number {
    return 1.0 + this._tagBonus(SkillTag.RangeT1) + this._tagBonus(SkillTag.RangeT2);
  }

  /** Total bonus lives from skill tree (all fortify life nodes). */
  getTotalBonusLives(): number {
    return this._tagBonus(SkillTag.LivesT1) + this._tagBonus(SkillTag.LivesT2);
  }

  /** Fortify branch: slow duration bonus (stacks SlowDurationT1/T2). */
  getSlowDurationMultiplier(): number {
    return 1.0 + this._tagBonus(SkillTag.SlowDurationT1) + this._tagBonus(SkillTag.SlowDurationT2);
  }

  /** Fortify branch: tower HP bonus. */
  getTowerHpMultiplier(): number {
    return 1.0 + this._tagBonus(SkillTag.TowerHpT1);
  }

  /** Fortune branch: starting gold flat bonus (stacks StartingGoldT1/T2/T3). */
  getStartingGoldBonus(): number {
    return this._tagBonus(SkillTag.StartingGoldT1) + this._tagBonus(SkillTag.StartingGoldT2) + this._tagBonus(SkillTag.StartingGoldT3);
  }

  /** Fortune branch: wave bonus gold multiplier — disabled, no dedicated node. */
  getWaveBonusGoldMultiplier(): number {
    return 1.0;
  }

  /** Fortune branch: sell refund bonus (stacks SellRefundT1/T2). */
  getSellRefundBonus(): number {
    return this._tagBonus(SkillTag.SellRefundT1) + this._tagBonus(SkillTag.SellRefundT2);
  }

  /** Fortune branch: interest rate bonus. */
  getInterestRateBonus(): number {
    return this._tagBonus(SkillTag.InterestRateT1);
  }

  // ── NEW Bonus Getters (higher-tier secondary effects) ─────────────────────

  /** War branch: projectile speed multiplier (secondary on the fire rate nodes). */
  getProjectileSpeedMultiplier(): number {
    return 1.0 + this._tagSecondaryBonus(SkillTag.FireRateT1) + this._tagSecondaryBonus(SkillTag.FireRateT2);
  }

  /** War branch: crit multiplier escalation — disabled, no dedicated secondary. */
  getCritMultiplierBonus(): number {
    return 1.0;
  }

  /** Fortify branch: slow factor bonus — increases the magnitude of slow applied (secondary on the slow duration nodes). */
  getSlowFactorBonus(): number {
    return this._tagSecondaryBonus(SkillTag.SlowDurationT1) + this._tagSecondaryBonus(SkillTag.SlowDurationT2);
  }

  /** Fortify branch: armor bonus — flat damage reduction per hit (secondary on the tower HP node). */
  getArmorBonus(): number {
    return this._tagSecondaryBonus(SkillTag.TowerHpT1);
  }

  /** Fortune branch: skull earn rate multiplier — bonus skulls earned per run. */
  getSkullEarnRateMultiplier(): number {
    return 1.0 + this._tagBonus(SkillTag.SkullRewardDouble);
  }

  /** Fortune branch: flat gold per kill bonus (infinite: stacks per purchase). */
  getGoldPerKillBonus(): number {
    return this._tagBonus(SkillTag.GoldPerEnemy);
  }

  /** Fortune branch: income rate multiplier — passive gold per wave multiplier (secondary on sell refund T2 and starting gold T3). */
  getIncomeRateMultiplier(): number {
    return 1.0 + this._tagSecondaryBonus(SkillTag.SellRefundT2) + this._tagSecondaryBonus(SkillTag.StartingGoldT3);
  }

  // ── Private ───────────────────────────────────────────────────────────────

  /** Resolves a content tag to its current node index and checks if it's unlocked. */
  private _hasTag(tag: SkillTag): boolean {
    return this._unlocked.has(getIndexForTag(tag));
  }

  /** Primary bonus magnitude for a tag if unlocked (× purchase count for infinite nodes), else 0. */
  private _tagBonus(tag: SkillTag): number {
    const node = getNodeByTag(tag);
    if (!this._unlocked.has(node.index)) return 0;
    const count = this._infiniteCounts.get(node.index);
    return node.value * (count ? Math.max(1, count) : 1);
  }

  /** Secondary bonus magnitude for a tag if unlocked (× purchase count for infinite nodes), else 0. */
  private _tagSecondaryBonus(tag: SkillTag): number {
    const node = getNodeByTag(tag);
    if (!this._unlocked.has(node.index) || node.secondaryValue === undefined) return 0;
    const count = this._infiniteCounts.get(node.index);
    return node.secondaryValue * (count ? Math.max(1, count) : 1);
  }

  /** Skull cost for a node — flat for one-time nodes, escalating per purchase for infinite nodes. */
  private _costFor(nodeDef: ISkillNodeDef): number {
    if (!INFINITE_SKILL_NODES.has(nodeDef.index)) return nodeDef.cost;
    const count = this._infiniteCounts.get(nodeDef.index) ?? 0;
    return Math.ceil(nodeDef.cost * Math.pow(INFINITE_COST_GROWTH, count));
  }

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
