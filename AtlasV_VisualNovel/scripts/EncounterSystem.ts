/**
 * EncounterSystem — Selects which character appears when the player casts.
 * Implements the priority-based selection algorithm:
 *
 * 1. Filter out characters with incomplete quests (NEVER appear)
 * 2. Filter by zone match (cast power → zone → character zones)
 * 3. Prioritize recently quest-completed characters
 * 4. Prioritize characters who prefer the equipped lure
 * 5. Weighted random among remaining candidates by encounterRate
 *
 * Cast power zones (0-100 scale):
 * - Near: 0-33
 * - Mid: 34-66
 * - Far: 67-100
 */

import type { CharacterConfig, LakeZone } from './Types';
import { FlagSystem } from './FlagSystem';
import { QuestSystem } from './QuestSystem';
import { characterRegistry } from './CharacterRegistry';

/** Determine which zone a cast power value falls into */
export function getZoneFromPower(castPower: number): LakeZone {
  if (castPower <= 33) return 'near';
  if (castPower <= 66) return 'mid';
  return 'far';
}

export class EncounterSystem {
  /**
   * Select a character to encounter based on cast conditions.
   *
   * @param castPower - Power gauge value (0-100)
   * @param equippedLureId - Currently equipped lure ID, or null
   * @param flagSystem - Game flag system for quest checks
   * @param questSystem - Quest tracking system
   * @returns Selected character config, or null if no valid candidates
   */
  selectCharacter(
    castPower: number,
    equippedLureId: string | null,
    flagSystem: FlagSystem,
    questSystem: QuestSystem,
  ): CharacterConfig | null {
    const allCharacters = characterRegistry.getAllCharacters();
    const zone = getZoneFromPower(castPower);

    console.log(`[EncounterSystem] Selecting character: power=${castPower.toFixed(1)}, zone=${zone}, lure=${equippedLureId ?? 'none'}`);

    // Step 0: Filter out characters whose ending has been triggered
    const notEnded = allCharacters.filter(c =>
      !flagSystem.check(`${c.id}.ending_complete`)
    );
    console.log(`[EncounterSystem] After ending filter: ${notEnded.length}/${allCharacters.length}`);

    if (notEnded.length === 0) return null;

    // Step 1: Filter out characters with incomplete quests
    const questEligible = notEnded.filter(c =>
      questSystem.isQuestComplete(c.id, c.questRequirement, flagSystem)
    );
    console.log(`[EncounterSystem] After quest filter: ${questEligible.length}/${notEnded.length}`);

    if (questEligible.length === 0) return null;

    // Step 2: Filter by zone match
    const zoneMatched = questEligible.filter(c =>
      c.lakeZones.includes(zone)
    );
    console.log(`[EncounterSystem] After zone filter (${zone}): ${zoneMatched.length}/${questEligible.length}`);

    if (zoneMatched.length === 0) {
      // No characters match the zone — return null so "nothing bites" can trigger
      console.log('[EncounterSystem] No zone matches, returning null (nothing bites)');
      return null;
    }

    return this.weightedSelect(zoneMatched, equippedLureId, questSystem);
  }

  /**
   * Perform weighted random selection with priority boosting.
   */
  private weightedSelect(
    candidates: CharacterConfig[],
    equippedLureId: string | null,
    questSystem: QuestSystem,
  ): CharacterConfig | null {
    if (candidates.length === 0) return null;
    if (candidates.length === 1) return candidates[0];

    // Calculate weights with priority boosting
    const weights: number[] = candidates.map(c => {
      let weight = c.encounterRate;

      // Priority 1: Recently quest-completed characters get 3x boost
      if (questSystem.isRecentlyCompleted(c.id)) {
        weight *= 3.0;
      }

      // Priority 2: Lure preference boost (2x for preferred, 0.5x for disliked)
      if (equippedLureId) {
        if (c.preferredLures.includes(equippedLureId)) {
          weight *= 2.0;
        } else if (c.dislikedLures.includes(equippedLureId)) {
          weight *= 0.5;
        }
      }

      return weight;
    });

    // Weighted random selection
    const totalWeight = weights.reduce((sum, w) => sum + w, 0);
    if (totalWeight <= 0) return candidates[0];

    let roll = Math.random() * totalWeight;
    for (let i = 0; i < candidates.length; i++) {
      roll -= weights[i];
      if (roll <= 0) {
        console.log(`[EncounterSystem] Selected: ${candidates[i].id} (weight=${weights[i].toFixed(2)}, total=${totalWeight.toFixed(2)})`);
        return candidates[i];
      }
    }

    // Fallback (shouldn't reach here due to floating point)
    return candidates[candidates.length - 1];
  }

  /**
   * Get all valid candidates for the current conditions (for debug/display).
   */
  getValidCandidates(
    castPower: number,
    equippedLureId: string | null,
    flagSystem: FlagSystem,
    questSystem: QuestSystem,
  ): CharacterConfig[] {
    const allCharacters = characterRegistry.getAllCharacters();
    const zone = getZoneFromPower(castPower);

    return allCharacters.filter(c =>
      !flagSystem.check(`${c.id}.ending_complete`) &&
      questSystem.isQuestComplete(c.id, c.questRequirement, flagSystem) &&
      c.lakeZones.includes(zone)
    );
  }
}
