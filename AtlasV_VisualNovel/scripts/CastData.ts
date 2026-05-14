/**
 * CastData — Backward-compatible hub that delegates to CharacterRegistry.
 * Existing code can continue importing from here without changes.
 * New code should use characterRegistry directly.
 */

import type { Beat, FishCharacter, CastData } from './Types';
import { characterRegistry } from './CharacterRegistry';

/** Build the initial FishCharacter for the registry's default character. */
export function createDefaultCharacter(): FishCharacter {
  const id = characterRegistry.getDefaultCharacterId();
  const config = characterRegistry.getCharacter(id);
  if (!config) throw new Error(`[CastData] Default character '${id}' not registered`);
  return config.initialState();
}

/** Build the initial FishCharacter for any registered character id. */
export function createCharacter(characterId: string): FishCharacter {
  const config = characterRegistry.getCharacter(characterId);
  if (!config) throw new Error(`[CastData] Character '${characterId}' not registered`);
  return config.initialState();
}

/** @deprecated Use createDefaultCharacter() — kept for any unmigrated callers. */
export function createNereia(): FishCharacter {
  return createDefaultCharacter();
}

/** Get the cast at a given index for a character. Defaults to the registry's first character. */
export function getCast(castIndex: number, characterId: string = characterRegistry.getDefaultCharacterId()): CastData {
  const cast = characterRegistry.getCast(characterId, castIndex);
  if (!cast) throw new Error(`[CastData] No cast found for ${characterId} at index ${castIndex}`);
  return cast;
}

/** Returns fresh beat copies (seen = false) for the cast at the given index. */
export function getBeats(castIndex: number = 0, characterId: string = characterRegistry.getDefaultCharacterId()): Beat[] {
  return characterRegistry.getBeats(characterId, castIndex);
}

/** Total cast count for a character. */
export function getCastCount(characterId: string = characterRegistry.getDefaultCharacterId()): number {
  return characterRegistry.getCastCount(characterId);
}

/** Whether the player has progressed past the last cast. */
export function isArcExhausted(castIndex: number, characterId: string = characterRegistry.getDefaultCharacterId()): boolean {
  return characterRegistry.isArcExhausted(characterId, castIndex);
}
