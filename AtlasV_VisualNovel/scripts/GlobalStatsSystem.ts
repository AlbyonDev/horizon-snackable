/**
 * GlobalStatsSystem — Tracks overall player statistics and badges/achievements.
 * Provides data for the journal's Stats & Badges section.
 *
 * Badges unlock automatically when conditions are met after each Cast.
 * All data serializes to SaveData for persistence.
 */

import { characterRegistry } from './CharacterRegistry';
import type { JournalFishEntry, GlobalStatsSaveData } from './Types';

/** Internal runtime stats — always has all fields populated (derived stats reconstructed on load) */
interface RuntimeStats {
  totalCasts: number;
  totalCharactersMet: number;
  totalFactsDiscovered: number;
  totalPlaySessions: number;
  unlockedBadges: string[];
}

// === Badge Definitions ===
export interface BadgeDefinition {
  id: string;
  name: string;
  description: string;
  icon: string; // emoji icon for display
  condition: (stats: RuntimeStats, entries: JournalFishEntry[]) => boolean;
}

const BADGE_DEFINITIONS: BadgeDefinition[] = [
  {
    id: 'first_cast',
    name: 'First Line',
    description: 'Complete your first Cast',
    icon: '🎣',
    condition: (s) => s.totalCasts >= 1,
  },
  {
    id: 'first_meeting',
    name: 'First Ripple',
    description: 'Meet your first fish',
    icon: '🐟',
    condition: (s) => s.totalCharactersMet >= 1,
  },
  {
    id: 'five_casts',
    name: 'Patient Angler',
    description: 'Complete 5 Casts',
    icon: '⏳',
    condition: (s) => s.totalCasts >= 5,
  },
  {
    id: 'ten_casts',
    name: 'Dedicated Fisher',
    description: 'Complete 10 Casts',
    icon: '🌟',
    condition: (s) => s.totalCasts >= 10,
  },
  {
    id: 'meet_all',
    name: 'Full Pond',
    description: 'Meet every character',
    icon: '✨',
    condition: (s) => {
      const totalChars = characterRegistry.getAllCharacterIds().length;
      return s.totalCharactersMet >= totalChars;
    },
  },
  {
    id: 'first_keepsake',
    name: 'Treasured Gift',
    description: 'Unlock your first CG',
    icon: '🎁',
    condition: (s) => (s as any).totalKeepsakes >= 1 || false,
  },
  {
    id: 'ten_facts',
    name: 'Deep Listener',
    description: 'Discover 10 facts about fish',
    icon: '📖',
    condition: (s) => s.totalFactsDiscovered >= 10,
  },
  {
    id: 'twenty_casts',
    name: 'Night Owl',
    description: 'Complete 20 Casts',
    icon: '🦉',
    condition: (s) => s.totalCasts >= 20,
  },
];

export class GlobalStatsSystem {
  private stats: RuntimeStats = {
    totalCasts: 0,
    totalCharactersMet: 0,
    totalFactsDiscovered: 0,
    totalPlaySessions: 0,
    unlockedBadges: [],
  };

  /** Record a completed Cast and update stats from current journal entries */
  recordCast(fishEntries: JournalFishEntry[], flags: Record<string, boolean | number> = {}): string[] {
    this.stats.totalCasts++;

    // Recalculate derived stats from entries
    let met = 0;
    let facts = 0;
    for (const entry of fishEntries) {
      if (entry.unlocked) {
        met++;
        // Count only facts with flags set
        const character = characterRegistry.getCharacter(entry.fishId);
        if (character?.facts) {
          for (const factDef of character.facts) {
            if (flags[factDef.flagKey]) facts++;
          }
        }
      }
    }
    this.stats.totalCharactersMet = met;
    this.stats.totalFactsDiscovered = facts;

    // Check for newly unlocked badges
    const newBadges = this.checkBadges(fishEntries);
    return newBadges;
  }

  /** Update keepsake count (deprecated, kept for backward compat) */
  setKeepsakeCount(count: number): void {
    // No-op: keepsakes removed
  }

  /** Increment play sessions */
  incrementPlaySession(): void {
    this.stats.totalPlaySessions++;
  }

  /** Check all badge conditions and unlock new ones */
  private checkBadges(fishEntries: JournalFishEntry[]): string[] {
    const newlyUnlocked: string[] = [];
    for (const badge of BADGE_DEFINITIONS) {
      if (this.stats.unlockedBadges.includes(badge.id)) continue;
      if (badge.condition(this.stats, fishEntries)) {
        this.stats.unlockedBadges.push(badge.id);
        newlyUnlocked.push(badge.id);
        console.log(`[GlobalStatsSystem] Badge unlocked: ${badge.name}`);
      }
    }
    return newlyUnlocked;
  }

  // === Display Text Generation ===

  /** Get structured stat items for polished Tab 3 UI */
  getStructuredStats(): Array<{icon: string; label: string; value: string; valueColor?: string}> {
    const totalChars = characterRegistry.getAllCharacterIds().length;
    return [
      { icon: '\ud83c\udfa3', label: 'Total Casts', value: String(this.stats.totalCasts), valueColor: '#E8A84C' },
      { icon: '\ud83d\udc1f', label: 'Characters Met', value: `${this.stats.totalCharactersMet}/${totalChars}`, valueColor: '#9B7FCC' },
      { icon: '\ud83d\udcd6', label: 'Facts Discovered', value: String(this.stats.totalFactsDiscovered), valueColor: '#48C8B0' },
      { icon: '\ud83c\udf19', label: 'Play Sessions', value: String(this.stats.totalPlaySessions), valueColor: '#C8D8E8' },
    ];
  }

  /** Get structured badge items for polished Tab 3 UI */
  getStructuredBadges(): Array<{icon: string; name: string; description: string; unlocked: boolean}> {
    return BADGE_DEFINITIONS.map(badge => ({
      icon: badge.icon,
      name: badge.name,
      description: badge.description,
      unlocked: this.stats.unlockedBadges.includes(badge.id),
    }));
  }

  /** Get formatted stats text for journal display */
  getStatsText(): string {
    const totalChars = characterRegistry.getAllCharacterIds().length;
    const lines: string[] = [];
    lines.push('— Angler Statistics —');
    lines.push('');
    lines.push(`🎣 Total Casts: ${this.stats.totalCasts}`);
    lines.push(`🐟 Characters Met: ${this.stats.totalCharactersMet}/${totalChars}`);
    lines.push(`📖 Facts Discovered: ${this.stats.totalFactsDiscovered}`);
    lines.push(`🌙 Sessions: ${this.stats.totalPlaySessions}`);
    return lines.join('\n');
  }

  /** Get formatted badges text for journal display */
  getBadgesText(): string {
    const lines: string[] = [];
    lines.push('— Achievements —');
    lines.push('');

    const unlocked = BADGE_DEFINITIONS.filter(b =>
      this.stats.unlockedBadges.includes(b.id));
    const locked = BADGE_DEFINITIONS.filter(b =>
      !this.stats.unlockedBadges.includes(b.id));

    if (unlocked.length > 0) {
      for (const badge of unlocked) {
        lines.push(`${badge.icon} ${badge.name}`);
        lines.push(`   ${badge.description}`);
        lines.push('');
      }
    }

    if (locked.length > 0) {
      lines.push('— Locked —');
      for (const badge of locked) {
        lines.push(`🔒 ${badge.name}`);
        lines.push(`   ${badge.description}`);
        lines.push('');
      }
    }

    lines.push(`${unlocked.length}/${BADGE_DEFINITIONS.length} earned`);
    return lines.join('\n');
  }

  /** Get the character met counter string */
  getMetCounterText(): string {
    const total = characterRegistry.getAllCharacterIds().length;
    return `${this.stats.totalCharactersMet}/${total} characters met`;
  }

  /** Get raw stats data */
  getStats(): RuntimeStats {
    return { ...this.stats };
  }

  // === Save/Load ===

  serialize(): GlobalStatsSaveData {
    return {
      totalCasts: this.stats.totalCasts,
      totalPlaySessions: this.stats.totalPlaySessions,
      unlockedBadges: [...this.stats.unlockedBadges],
    };
  }

  deserialize(data: GlobalStatsSaveData, fishEntries?: JournalFishEntry[], flags?: Record<string, boolean | number>): void {
    this.stats = {
      totalCasts: data.totalCasts ?? 0,
      totalCharactersMet: 0, // will be reconstructed below
      totalFactsDiscovered: 0, // will be reconstructed below
      totalPlaySessions: data.totalPlaySessions ?? 0,
      unlockedBadges: data.unlockedBadges ?? [],
    };
    // Reconstruct derived stats from source data
    this.reconstructDerivedStats(fishEntries, flags);
  }

  /** Reconstruct totalCharactersMet and totalFactsDiscovered from source data */
  reconstructDerivedStats(fishEntries?: JournalFishEntry[], flags?: Record<string, boolean | number>): void {
    if (fishEntries) {
      let met = 0;
      let facts = 0;
      for (const entry of fishEntries) {
        if (entry.unlocked) {
          met++;
          if (flags) {
            const character = characterRegistry.getCharacter(entry.fishId);
            if (character?.facts) {
              for (const factDef of character.facts) {
                if (flags[factDef.flagKey]) facts++;
              }
            }
          }
        }
      }
      this.stats.totalCharactersMet = met;
      this.stats.totalFactsDiscovered = facts;
    }
  }
}
