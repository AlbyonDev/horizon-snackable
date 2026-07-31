/**
 * SkillTreeService — Manages permanent skill tree unlocks and provides bonus getters.
 *
 * Component Attachment: none (@service() singleton)
 * Component Networking: Client-only (save data is client-authoritative via SaveService)
 * Component Ownership: N/A (singleton service)
 *
 * Stores which skill indices are unlocked (persisted via SaveService `st` field).
 * Provides getters consumed by TowerService, ResourceService, CritService, WaveService.
 * Purchase logic deducts skulls from SaveService and persists immediately.
 *
 * Root node (index 9) is the prerequisite for ALL other skills.
 */
import { Service, EventService } from 'meta/worlds';
import { service, subscribe } from 'meta/worlds';
import { OnServiceReadyEvent } from 'meta/worlds';
import { SKILL_BRANCHES, TOTAL_SKILLS, ROOT_SKILL, ROOT_SKILL_INDEX } from '../Defs/SkillTreeDefs';
import type { ISkillBranchDef, ISkillTierDef } from '../Defs/SkillTreeDefs';
import { Events } from '../Types';
import { SaveService } from './SaveService';

@service()
export class SkillTreeService extends Service {
  /** Set of unlocked skill indices (0-9). */
  private _unlocked: Set<number> = new Set();

  @subscribe(OnServiceReadyEvent)
  onReady(): void {
    console.log('[SkillTreeService] Initialized');
  }

  /** Restore skill tree state from saved data. Called on session load. */
  @subscribe(Events.SaveRestored)
  onSaveRestored(p: Events.SaveRestoredPayload): void {
    this._unlocked.clear();
    if (p.skillTree && p.skillTree.length > 0) {
      for (const idx of p.skillTree) {
        if (typeof idx === 'number' && idx >= 0 && idx < TOTAL_SKILLS) {
          this._unlocked.add(idx);
        }
      }
    }
    console.log(`[SkillTreeService] Restored ${this._unlocked.size} unlocked skills: [${[...this._unlocked].join(',')}]`);
  }

  // ── Public API ────────────────────────────────────────────────────────

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

  /** Check if the root skill (index 9) is unlocked. */
  isRootUnlocked(): boolean {
    return this._unlocked.has(ROOT_SKILL_INDEX);
  }

  /**
   * Attempt to purchase a skill tier. Returns true if successful.
   * Validates: root prerequisite, sequential unlock within branch, sufficient skulls, not already unlocked.
   */
  purchase(skillIndex: number): boolean {
    if (this._unlocked.has(skillIndex)) {
      console.log(`[SkillTreeService] Skill ${skillIndex} already unlocked`);
      return false;
    }

    // Root node (index 9) — no prerequisite, just needs skulls
    if (skillIndex === ROOT_SKILL_INDEX) {
      const save = SaveService.get();
      if (save.getSkullCount() < ROOT_SKILL.cost) {
        console.log(`[SkillTreeService] Not enough skulls for root: have ${save.getSkullCount()}, need ${ROOT_SKILL.cost}`);
        return false;
      }
      save.spendSkulls(ROOT_SKILL.cost);
      this._unlocked.add(ROOT_SKILL_INDEX);
      console.log(`[SkillTreeService] Purchased root skill (UNLOCK TREE) for ${ROOT_SKILL.cost} skull`);
      save.setSkillTreeState(this.getUnlockedIndices());
      return true;
    }

    // All other skills require the root to be unlocked first
    if (!this.isRootUnlocked()) {
      console.log(`[SkillTreeService] Cannot unlock skill ${skillIndex} — root node not yet unlocked`);
      return false;
    }

    // Find which branch and tier this skill belongs to
    const { branch, tierIdx } = this._findSkill(skillIndex);
    if (!branch) {
      console.log(`[SkillTreeService] Unknown skill index ${skillIndex}`);
      return false;
    }

    // Validate sequential unlock: all previous tiers in this branch must be unlocked
    for (let i = 0; i < tierIdx; i++) {
      if (!this._unlocked.has(branch.tiers[i].index)) {
        console.log(`[SkillTreeService] Cannot unlock tier ${tierIdx} without prior tiers in branch ${branch.id}`);
        return false;
      }
    }

    // Check skull cost
    const tier = branch.tiers[tierIdx];
    const save = SaveService.get();
    if (save.getSkullCount() < tier.cost) {
      console.log(`[SkillTreeService] Not enough skulls: have ${save.getSkullCount()}, need ${tier.cost}`);
      return false;
    }

    // Deduct skulls and mark unlocked
    save.spendSkulls(tier.cost);
    this._unlocked.add(skillIndex);
    console.log(`[SkillTreeService] Purchased skill ${skillIndex} (${tier.label}) for ${tier.cost} skulls`);

    // Persist the skill tree state
    save.setSkillTreeState(this.getUnlockedIndices());

    return true;
  }

  /** Can the player afford and unlock this skill? */
  canPurchase(skillIndex: number): boolean {
    if (this._unlocked.has(skillIndex)) return false;

    // Root node — just check skull cost
    if (skillIndex === ROOT_SKILL_INDEX) {
      return SaveService.get().getSkullCount() >= ROOT_SKILL.cost;
    }

    // All other skills require root unlocked
    if (!this.isRootUnlocked()) return false;

    const { branch, tierIdx } = this._findSkill(skillIndex);
    if (!branch) return false;
    // Check previous tiers
    for (let i = 0; i < tierIdx; i++) {
      if (!this._unlocked.has(branch.tiers[i].index)) return false;
    }
    return SaveService.get().getSkullCount() >= branch.tiers[tierIdx].cost;
  }

  /** Is this skill the next unlockable in its branch (previous tiers done + root unlocked)? */
  isNextInBranch(skillIndex: number): boolean {
    if (this._unlocked.has(skillIndex)) return false;

    // Root node is always "next" if not unlocked
    if (skillIndex === ROOT_SKILL_INDEX) return true;

    // All other skills require root
    if (!this.isRootUnlocked()) return false;

    const { branch, tierIdx } = this._findSkill(skillIndex);
    if (!branch) return false;
    for (let i = 0; i < tierIdx; i++) {
      if (!this._unlocked.has(branch.tiers[i].index)) return false;
    }
    return true;
  }

  // ── Bonus Getters (consumed by gameplay services) ─────────────────────

  /** War T1: +10% tower damage → multiplier 1.1 */
  getDamageMultiplier(): number {
    return this._unlocked.has(0) ? 1.10 : 1.0;
  }

  /** War T2: +15% fire rate → multiplier 1.15 */
  getFireRateMultiplier(): number {
    return this._unlocked.has(1) ? 1.15 : 1.0;
  }

  /** War T3: +25% crit chance → flat bonus 0.25 */
  getCritChanceBonus(): number {
    return this._unlocked.has(2) ? 0.25 : 0;
  }

  /** Fortify T1: +2 starting lives */
  getBonusLivesTier1(): number {
    return this._unlocked.has(3) ? 2 : 0;
  }

  /** Fortify T2: +20% tower range → multiplier 1.2 */
  getRangeMultiplier(): number {
    return this._unlocked.has(4) ? 1.20 : 1.0;
  }

  /** Fortify T3: +5 starting lives */
  getBonusLivesTier3(): number {
    return this._unlocked.has(5) ? 5 : 0;
  }

  /** Total bonus lives from skill tree (T1 + T3). */
  getTotalBonusLives(): number {
    return this.getBonusLivesTier1() + this.getBonusLivesTier3();
  }

  /** Fortune T1: +30 starting gold → flat bonus */
  getStartingGoldBonus(): number {
    return this._unlocked.has(6) ? 30 : 0;
  }

  /** Fortune T2: +25% wave bonus gold → multiplier 1.25 */
  getWaveBonusGoldMultiplier(): number {
    return this._unlocked.has(7) ? 1.25 : 1.0;
  }

  /** Fortune T3: +50% sell refund → flat addition to sell ratio (0.5) */
  getSellRefundBonus(): number {
    return this._unlocked.has(8) ? 0.5 : 0;
  }

  // ── Private ───────────────────────────────────────────────────────────

  private _findSkill(skillIndex: number): { branch: ISkillBranchDef | null; tierIdx: number } {
    for (const branch of SKILL_BRANCHES) {
      for (let i = 0; i < branch.tiers.length; i++) {
        if (branch.tiers[i].index === skillIndex) {
          return { branch, tierIdx: i };
        }
      }
    }
    return { branch: null, tierIdx: -1 };
  }
}
