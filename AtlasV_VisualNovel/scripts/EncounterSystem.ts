/**
 * EncounterSystem — Deterministic recipe-based fish selection.
 *
 * Recipes are stable slots (id + zone + phase + lure). Ink activates them via
 * `<fishId>.recipe.<id>.on` flags; the encounter system reads those flags
 * (treating `initial: true` recipes as default-on unless explicitly disabled),
 * matches the player's cast (zone, phase, lure), and signals the winning
 * recipe to Ink by setting `<fishId>.from.<id> = true` right before launching
 * the fish's entry knot.
 *
 * Selection (zero RNG):
 *   1. Each fish's enabled recipes are filtered by zone + phase exact match.
 *   2. Exact lure match wins over ANY_LURE wildcard.
 *   3. Tie-break: fishId alphabetic, then recipe array order.
 *
 * Cast power → zone:  Near 0-33  |  Mid 34-66  |  Far 67-100.
 */

import type { CharacterConfig, LakeZone, Recipe } from './Types';
import { Phase, ANY_LURE } from './Types';
import { FlagSystem } from './FlagSystem';
import { characterRegistry } from './CharacterRegistry';

/** Determine which zone a cast power value falls into */
export function getZoneFromPower(castPower: number): LakeZone {
  if (castPower <= 33) return 'near';
  if (castPower <= 66) return 'mid';
  return 'far';
}

/** Result of an encounter resolution. */
export interface EncounterResult {
  character: CharacterConfig;
  recipe: Recipe;
}

/** Build the flag key for a recipe's activation state. */
export function recipeActivationFlag(fishId: string, recipeId: string): string {
  return `recipe.${fishId}.${recipeId}`;
}

/** Build the flag key for a recipe's one-shot "I just matched" signal. */
export function recipeFromFlag(fishId: string, recipeId: string): string {
  return `from.${fishId}.${recipeId}`;
}

/**
 * Decide whether a recipe is active given the current flag state.
 *
 * Rules:
 *   - If the activation flag is set truthy → active.
 *   - If the activation flag is set falsy (explicitly false / 0) → inactive.
 *   - If the activation flag is absent and `initial: true` → active.
 *   - Otherwise → inactive.
 */
export function isRecipeActive(
  fishId: string,
  recipe: Recipe,
  flagSystem: FlagSystem,
): boolean {
  const key = recipeActivationFlag(fishId, recipe.id);
  if (flagSystem.has(key)) {
    return flagSystem.check(key);
  }
  return recipe.initial === true;
}

export class EncounterSystem {
  /**
   * Select a character + recipe based on cast conditions.
   *
   * @param zone - Lake zone (derived from cast power)
   * @param phase - Day or Night
   * @param equippedLureId - Equipped lure id, or null/'none' for no lure
   * @param flagSystem - Game flag system
   * @returns Match result, or null if nothing bites
   */
  selectCharacter(
    zone: LakeZone,
    phase: Phase,
    equippedLureId: string | null,
    flagSystem: FlagSystem,
  ): EncounterResult | null {
    const lureKey = equippedLureId && equippedLureId !== 'none' ? equippedLureId : null;
    console.log(`[EncounterSystem] Selecting: zone=${zone}, phase=${phase}, lure=${lureKey ?? 'none'}`);

    type Candidate = { character: CharacterConfig; recipe: Recipe; specific: boolean };
    const specificMatches: Candidate[] = [];
    const wildcardMatches: Candidate[] = [];

    for (const character of characterRegistry.getAllCharacters()) {
      // Skip if ending already resolved
      if (flagSystem.check(`${character.id}.ending_complete`)) continue;

      for (const recipe of character.recipes) {
        if (!isRecipeActive(character.id, recipe, flagSystem)) continue;
        if (recipe.zone !== zone) continue;
        if (recipe.phase !== phase) continue;

        if (lureKey !== null && recipe.lure === lureKey) {
          specificMatches.push({ character, recipe, specific: true });
        } else if (recipe.lure === ANY_LURE) {
          wildcardMatches.push({ character, recipe, specific: false });
        }
      }
    }

    const pool = specificMatches.length > 0 ? specificMatches : wildcardMatches;
    if (pool.length === 0) {
      console.log('[EncounterSystem] No recipe matched — nothing bites');
      return null;
    }

    // Tie-break: higher priority first (main fish win over ambient NPCs),
    // then fishId alphabetic for deterministic stable order.
    pool.sort((a, b) => {
      const pa = a.recipe.priority ?? 0;
      const pb = b.recipe.priority ?? 0;
      if (pa !== pb) return pb - pa;
      return a.character.id.localeCompare(b.character.id);
    });

    const winner = pool[0];
    console.log(`[EncounterSystem] Matched: ${winner.character.id} / recipe="${winner.recipe.id}" (${winner.specific ? 'specific' : 'wildcard'}, priority=${winner.recipe.priority ?? 0})`);
    return { character: winner.character, recipe: winner.recipe };
  }
}
