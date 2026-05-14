/**
 * SYS-05-JOURNAL: Journal Data Management
 * Manages: fish entry unlocking, observation recording, keepsake tracking.
 *
 * Now uses CharacterRegistry for fish data instead of hardcoded arrays.
 */

import { ExpressionState } from './Types';
import type { JournalFishEntry, JournalSaveData, LureReaction } from './Types';
import { characterRegistry } from './CharacterRegistry';
import { QuestSystem } from './QuestSystem';
import { FlagSystem } from './FlagSystem';
import { AffectionSystem } from './AffectionSystem';

/**
 * Get the display name for a character, using the trueName if its flag is set.
 */
function getCharDisplayName(charId: string, flags: Record<string, boolean | number>): string {
  return characterRegistry.getDisplayName(charId, flags);
}

// === Character Card Data (for journal teasing display) ===
export interface CharacterCardData {
  id: string;
  name: string;
  species: string;
  accentColor: string;
  unlocked: boolean;
  castsMade: number;
  observationCount: number;
  questHint: string;
  questName: string;
  tierName: string;
  tierColor: string;
  teaserHint: string; // Hint shown for locked characters
}

export class JournalSystem {
  private fishEntries: Map<string, JournalFishEntry> = new Map();

  constructor() {
    const allIds = characterRegistry.getAllCharacterIds();
    for (const fishId of allIds) {
      const character = characterRegistry.getCharacter(fishId);
      this.fishEntries.set(fishId, {
        fishId,
        unlocked: false,
        species: character?.species ?? 'Unknown',
        expressionsSeen: [],
        castsMade: 0,
      });
    }
  }

  // === Recording Observations ===

  /** Record a Cast completion for a fish. */
  recordCast(fishId: string, expressionsSeen: ExpressionState[]): void {
    const entry = this.fishEntries.get(fishId);
    if (!entry) return;

    if (!entry.unlocked) {
      entry.unlocked = true;
      console.log(`[JournalSystem] Unlocked fish entry: ${fishId}`);
    }

    entry.castsMade++;

    for (const expr of expressionsSeen) {
      if (!entry.expressionsSeen.includes(expr)) {
        entry.expressionsSeen.push(expr);
      }
    }
  }

  /**
   * Check all characters' fact flags and return newly discovered flag keys.
   * Does NOT store facts - they are rebuilt on demand from flags.
   */
  checkFactUnlocks(flags: Record<string, boolean | number>, previousFlags: Record<string, boolean | number>): string[] {
    const newlyDiscovered: string[] = [];

    for (const fishId of characterRegistry.getAllCharacterIds()) {
      const character = characterRegistry.getCharacter(fishId);
      if (!character?.facts) continue;

      for (const factDef of character.facts) {
        // Check if flag is newly set (wasn't set before, is set now)
        if (flags[factDef.flagKey] && !previousFlags[factDef.flagKey]) {
          newlyDiscovered.push(`${getCharDisplayName(fishId, flags)}: ${factDef.text}`);
          console.log(`[JournalSystem] Fact discovered for ${fishId}: ${factDef.text}`);
        }
      }
    }

    return newlyDiscovered;
  }



  // === Querying for Display ===

  getAllFishEntries(): JournalFishEntry[] {
    return Array.from(this.fishEntries.values());
  }

  getFishEntry(fishId: string): JournalFishEntry | undefined {
    return this.fishEntries.get(fishId);
  }

  getQuestHintForFish(fishId: string): string {
    const entry = this.fishEntries.get(fishId);
    if (!entry || !entry.unlocked) return '???';
    return characterRegistry.getQuestHint(fishId);
  }

  getQuestNameForFish(fishId: string): string {
    return characterRegistry.getQuestName(fishId);
  }


  isFishUnlocked(fishId: string): boolean {
    return this.fishEntries.get(fishId)?.unlocked ?? false;
  }

  // === Formatted Display Text (for ViewModel binding) ===

  getPondNotesText(fishId: string, flags: Record<string, boolean | number> = {}): string {
    const entry = this.fishEntries.get(fishId);
    if (!entry || !entry.unlocked) {
      return '[ Unknown Fish ]\n\nA dark shape seen beneath the surface.\nNot yet approached.';
    }

    const character = characterRegistry.getCharacter(fishId);
    const lines: string[] = [];
    lines.push(`${fishId.charAt(0).toUpperCase() + fishId.slice(1)} \u2014 ${entry.species}`);
    lines.push(`Casts: ${entry.castsMade}`);
    lines.push('');

    lines.push('\u2014 Observations \u2014');
    if (character?.facts) {
      for (const factDef of character.facts) {
        if (flags[factDef.flagKey]) {
          lines.push(`\u2022 ${factDef.text}`);
        } else {
          lines.push(`\u2022 ${factDef.hintText ?? '???'}`);
        }
      }
    }
    lines.push('');

    lines.push(`\u2014 Personal Quest: ${this.getQuestNameForFish(fishId)} \u2014`);
    lines.push(this.getQuestHintForFish(fishId));

    return lines.join('\n');
  }

  getQuestStatusText(questSystem: QuestSystem, flagSystem: FlagSystem): string {
    const allCharacters = characterRegistry.getAllCharacters();
    const flags = flagSystem.serialize();
    const lines: string[] = [];
    lines.push('\u2014 Active Quests \u2014');
    lines.push('');

    let hasActiveQuests = false;
    for (const char of allCharacters) {
      if (!char.questRequirement) continue;
      const progressText = questSystem.getQuestProgressText(char.id, char.questRequirement, flagSystem);
      const isComplete = progressText.startsWith('\u2713');
      if (!isComplete) {
        hasActiveQuests = true;
        lines.push(`\u25c6 ${getCharDisplayName(char.id, flags)}`);
        lines.push(`  ${progressText}`);
        lines.push('');
      }
    }

    if (!hasActiveQuests) {
      lines.push('No active quests.');
      lines.push('');
    }

    const completedLines: string[] = [];
    for (const char of allCharacters) {
      if (!char.questRequirement) continue;
      const progressText = questSystem.getQuestProgressText(char.id, char.questRequirement, flagSystem);
      if (progressText.startsWith('\u2713')) {
        completedLines.push(`\u2713 ${getCharDisplayName(char.id, flags)} \u2014 ${progressText.substring(2)}`);
      }
    }

    if (completedLines.length > 0) {
      lines.push('\u2014 Completed \u2014');
      for (const cl of completedLines) {
        lines.push(cl);
      }
    }

    return lines.join('\n');
  }

  getAllPondNotesText(flags: Record<string, boolean | number> = {}): string {
    const allIds = characterRegistry.getAllCharacterIds();
    const sections: string[] = [];
    for (const fishId of allIds) {
      sections.push(this.getPondNotesText(fishId, flags));
    }
    return sections.join('\n\n\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\n\n');
  }

  getLureBoxText(ownedLureIds: string[], reactions: LureReaction[]): string {
    if (ownedLureIds.length === 0) {
      return 'No lures in inventory.';
    }

    const lureNames: Record<string, string> = {
      red_spinner: 'Red Spinner',
      gold_teardrop: 'Gold Teardrop',
      feather_fly: 'Feather Fly',
      night_lure: 'Night Lure',
      shell_hook: 'Shell Hook',
      bare_hook: 'Bare Hook',
    };

    const lines: string[] = [];
    for (const lureId of ownedLureIds) {
      const name = lureNames[lureId] ?? lureId;
      lines.push(`\u25c6 ${name}`);

      const lureReactions = reactions.filter(r => r.lureId === lureId);
      if (lureReactions.length === 0) {
        lines.push('  No observations recorded yet.');
      } else {
        for (const r of lureReactions) {
          const fishName = r.fishId.charAt(0).toUpperCase() + r.fishId.slice(1);
          const sentiment = r.positiveActions > r.negativeActions ? '(positive)' :
                           r.negativeActions > r.positiveActions ? '(wary)' : '(neutral)';
          lines.push(`  \u2022 Used with ${fishName} \u00d7${r.castCount} ${sentiment}`);
        }
      }
      lines.push('');
    }

    return lines.join('\n');
  }


  // === Character Teasing System ===

  getCharacterCardsData(affectionValues?: Record<string, number>, flags?: Record<string, boolean | number>): CharacterCardData[] {
    const allCharacters = characterRegistry.getAllCharacters();
    const cards: CharacterCardData[] = [];
    const affectionSystem = new AffectionSystem();

    for (const char of allCharacters) {
      const entry = this.fishEntries.get(char.id);
      const unlocked = entry?.unlocked ?? false;
      const affectionValue = affectionValues?.[char.id] ?? 0;
      const tierInfo = affectionSystem.getTierInfo(affectionValue);

      // Count only unlocked facts
      let unlockedFactCount = 0;
      if (flags && char.facts) {
        for (const factDef of char.facts) {
          if (flags[factDef.flagKey]) unlockedFactCount++;
        }
      }

      cards.push({
        id: char.id,
        name: unlocked ? getCharDisplayName(char.id, flags ?? {}) : '???',
        species: unlocked ? char.species : 'Unknown',
        accentColor: unlocked ? char.accentColor : '#3A4A5A',
        unlocked,
        castsMade: entry?.castsMade ?? 0,
        observationCount: unlockedFactCount,
        questHint: unlocked ? this.getQuestHintForFish(char.id) : '???',
        questName: unlocked ? this.getQuestNameForFish(char.id) : '???',
        teaserHint: this.getTeaserHint(char),
        tierName: unlocked ? tierInfo.name : '???',
        tierColor: unlocked ? tierInfo.color : '#3A4A5A',
      });
    }

    return cards;
  }

  private getTeaserHint(char: { id: string; species: string; lakeZones: string[] }): string {
    const zoneHints: Record<string, string> = {
      near: 'Likes shallow waters...',
      mid: 'Dwells in the middle depths...',
      far: 'Hides in the deep...',
    };
    const zone = char.lakeZones[0] ?? 'mid';
    return zoneHints[zone] ?? 'A mysterious presence beneath the surface...';
  }

  getMetCounterText(): string {
    const total = characterRegistry.getAllCharacterIds().length;
    let met = 0;
    for (const entry of this.fishEntries.values()) {
      if (entry.unlocked) met++;
    }
    return `${met}/${total} characters met`;
  }

  getMetCount(): number {
    let met = 0;
    for (const entry of this.fishEntries.values()) {
      if (entry.unlocked) met++;
    }
    return met;
  }

  getCharacterListText(): string {
    const cards = this.getCharacterCardsData();
    const lines: string[] = [];

    lines.push(`\u2014 ${this.getMetCounterText()} \u2014`);
    lines.push('');

    for (const card of cards) {
      if (card.unlocked) {
        const nameCapitalized = card.name.charAt(0).toUpperCase() + card.name.slice(1);
        lines.push(`\u25c8 ${nameCapitalized} \u2014 ${card.species}`);
        lines.push(`  ${card.castsMade} casts \u00b7 ${card.observationCount} observations`);
        lines.push(`  Quest: ${card.questName}`);
        lines.push(`  \u21b3 ${card.questHint}`);
      } else {
        lines.push('\ud83d\udd12 ??? \u2014 Unknown');
        lines.push(`  ${card.teaserHint}`);
      }
      lines.push('');
    }

    return lines.join('\n');
  }

  // === Save/Load ===

  serialize(): JournalSaveData {
    const fishEntries: Record<string, JournalFishEntry> = {};
    for (const [id, entry] of this.fishEntries) {
      // Only save dynamic fields — fishId (= key) and species (static from
      // CharacterRegistry) are NOT persisted to reduce save size.
      fishEntries[id] = {
        fishId: '', // not persisted — rebuilt from key on deserialize
        unlocked: entry.unlocked,
        species: '', // not persisted — rebuilt from CharacterRegistry on deserialize
        expressionsSeen: [...entry.expressionsSeen],
        castsMade: entry.castsMade,
      };
    }
    return {
      fishEntries,
    };
  }

  deserialize(data: JournalSaveData): void {
    if (data.fishEntries) {
      for (const [id, entry] of Object.entries(data.fishEntries)) {
        // Reconstruct static fields from CharacterRegistry instead of reading
        // from save data — species/fishId are redundant (key = fishId, species
        // is defined in CharacterConfig and never changes at runtime).
        const character = characterRegistry.getCharacter(id);
        this.fishEntries.set(id, {
          fishId: id,
          unlocked: entry.unlocked,
          species: character?.species ?? entry.species ?? 'Unknown',
          expressionsSeen: entry.expressionsSeen ?? [],
          castsMade: entry.castsMade ?? 0,
        });
      }
    }
    // Old saves may have data.keepsakes — ignored (deprecated)
  }
}
