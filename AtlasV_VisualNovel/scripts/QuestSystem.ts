/**
 * QuestSystem — Tracks quest progress and checks completion conditions.
 * Quests are optional per-character unlock gates: a character with an incomplete
 * quest NEVER appears in the encounter pool.
 *
 * Quest types:
 * - use_lure: Player must use a specific lure in at least one cast
 * - talk_to_fish: Player must have talked to a specific other fish
 * - talk_to_x_fish: Player must have talked to X different fish total
 * - make_fish_leave: A specific fish must have departed at least once
 * - custom: A specific flag key must be truthy in FlagSystem
 *
 * Progress is persisted via QuestSaveData in the main save file.
 */

import type { QuestRequirement, QuestSaveData } from './Types';
import { FlagSystem } from './FlagSystem';

export class QuestSystem {
  // Tracking arrays (persisted in save)
  private fishTalkedTo: Set<string> = new Set();
  private fishMadeLeave: Set<string> = new Set();
  private luresUsed: Set<string> = new Set();
  private completedQuests: Set<string> = new Set();

  // === Progress Recording ===

  /** Record that the player talked to a fish (completed a cast with them) */
  recordTalkedToFish(fishId: string): void {
    if (!this.fishTalkedTo.has(fishId)) {
      this.fishTalkedTo.add(fishId);
      console.log(`[QuestSystem] Recorded talk: ${fishId} (total: ${this.fishTalkedTo.size})`);
    }
  }

  /** Record that a fish left (departed/drifted away) */
  recordFishLeft(fishId: string): void {
    if (!this.fishMadeLeave.has(fishId)) {
      this.fishMadeLeave.add(fishId);
      console.log(`[QuestSystem] Recorded leave: ${fishId}`);
    }
  }

  /** Record that a lure was used in a cast */
  recordLureUsed(lureId: string): void {
    if (!this.luresUsed.has(lureId)) {
      this.luresUsed.add(lureId);
      console.log(`[QuestSystem] Recorded lure used: ${lureId}`);
    }
  }

  /** Manually mark a quest as complete (for forced unlocks) */
  markQuestComplete(characterId: string): void {
    this.completedQuests.add(characterId);
    console.log(`[QuestSystem] Quest marked complete for: ${characterId}`);
  }

  // === Completion Checking ===

  /**
   * Check if a character's quest requirement is satisfied.
   * Returns true if:
   * - The character has no quest requirement (always available)
   * - The quest has been previously completed
   * - The quest conditions are currently met
   */
  isQuestComplete(characterId: string, requirement: QuestRequirement | undefined, flagSystem: FlagSystem): boolean {
    // No quest = always available
    if (!requirement) return true;

    // Already completed = always available
    if (this.completedQuests.has(characterId)) return true;

    // Check condition
    const met = this.checkRequirement(requirement, flagSystem);
    if (met) {
      // Cache completion so we don't re-evaluate
      this.completedQuests.add(characterId);
      console.log(`[QuestSystem] Quest completed for ${characterId}: ${requirement.type}`);
    }
    return met;
  }

  /** Check if a quest requirement is currently met (without caching) */
  private checkRequirement(req: QuestRequirement, flagSystem: FlagSystem): boolean {
    switch (req.type) {
      case 'use_lure':
        return this.luresUsed.has(req.lureId);

      case 'talk_to_fish':
        return this.fishTalkedTo.has(req.fishId);

      case 'talk_to_x_fish':
        return this.fishTalkedTo.size >= req.count;

      case 'make_fish_leave':
        return this.fishMadeLeave.has(req.fishId);

      case 'custom':
        return flagSystem.check(req.flagKey);

      default:
        return false;
    }
  }

  /**
   * Check if a quest was RECENTLY completed (quest complete but character
   * hasn't been encountered yet). Used for priority boosting.
   */
  isRecentlyCompleted(characterId: string): boolean {
    return this.completedQuests.has(characterId);
  }

  // === Display ===

  /** Get human-readable progress text for a quest requirement */
  getQuestProgressText(characterId: string, requirement: QuestRequirement | undefined, flagSystem: FlagSystem): string {
    if (!requirement) return 'No quest needed';
    if (this.completedQuests.has(characterId)) return '✓ Complete';

    switch (requirement.type) {
      case 'use_lure': {
        const done = this.luresUsed.has(requirement.lureId);
        return done ? '✓ Lure used' : `Use lure: ${requirement.lureId}`;
      }
      case 'talk_to_fish': {
        const done = this.fishTalkedTo.has(requirement.fishId);
        return done ? '✓ Fish met' : `Talk to: ${requirement.fishId}`;
      }
      case 'talk_to_x_fish': {
        const current = this.fishTalkedTo.size;
        return current >= requirement.count
          ? '✓ Enough fish met'
          : `Talk to ${current}/${requirement.count} fish`;
      }
      case 'make_fish_leave': {
        const done = this.fishMadeLeave.has(requirement.fishId);
        return done ? '✓ Fish departed' : `Let ${requirement.fishId} leave`;
      }
      case 'custom': {
        const done = flagSystem.check(requirement.flagKey);
        return done ? '✓ Condition met' : 'Special condition not met';
      }
      default:
        return 'Unknown quest type';
    }
  }

  /** Get all active (incomplete) quest descriptions for Journal display */
  getActiveQuestDescriptions(
    characters: { id: string; name: string; questRequirement?: QuestRequirement }[],
    flagSystem: FlagSystem,
  ): { characterName: string; progressText: string }[] {
    const quests: { characterName: string; progressText: string }[] = [];
    for (const char of characters) {
      if (!char.questRequirement) continue;
      if (this.completedQuests.has(char.id)) continue;
      quests.push({
        characterName: char.name,
        progressText: this.getQuestProgressText(char.id, char.questRequirement, flagSystem),
      });
    }
    return quests;
  }

  // === Save/Load ===

  serialize(): QuestSaveData {
    return {
      // completedQuests not saved — re-derived from conditions on load
      fishTalkedTo: Array.from(this.fishTalkedTo),
      fishMadeLeave: Array.from(this.fishMadeLeave),
      luresUsed: Array.from(this.luresUsed),
    };
  }

  deserialize(data: QuestSaveData): void {
    this.completedQuests = new Set(data.completedQuests ?? []);
    this.fishTalkedTo = new Set(data.fishTalkedTo ?? []);
    this.fishMadeLeave = new Set(data.fishMadeLeave ?? []);
    this.luresUsed = new Set(data.luresUsed ?? []);
    console.log(`[QuestSystem] Loaded: ${this.completedQuests.size} completed, ${this.fishTalkedTo.size} talked, ${this.fishMadeLeave.size} left, ${this.luresUsed.size} lures`);
  }

  /** Reconstruct completedQuests from current conditions. Call after deserialize + flags loaded. */
  reconstructCompletedQuests(characters: { id: string; questRequirement?: QuestRequirement }[], flagSystem: FlagSystem): void {
    for (const char of characters) {
      if (!char.questRequirement) continue;
      if (this.completedQuests.has(char.id)) continue;
      if (this.checkRequirement(char.questRequirement, flagSystem)) {
        this.completedQuests.add(char.id);
      }
    }
    console.log(`[QuestSystem] Reconstructed ${this.completedQuests.size} completed quests`);
  }

  /** Reset all quest progress */
  reset(): void {
    this.completedQuests.clear();
    this.fishTalkedTo.clear();
    this.fishMadeLeave.clear();
    this.luresUsed.clear();
  }
}
