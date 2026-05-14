/**
 * CharacterRegistry — Central registry for all fish characters.
 * Provides lookup by ID, listing of available characters, and
 * convenience functions for game logic.
 *
 * To add a new character:
 * 1. Create CharacterData_<Name>.ts (copy CharacterData_Nereia.ts as template)
 * 2. Import and register here with characterRegistry.register(YOUR_CHARACTER)
 */

import type { CharacterConfig, CastData, Beat, CatchSequenceData, CGData, LakeZone } from './Types';
import type { TextureAsset } from 'meta/worlds';
import { NEREIA_CHARACTER } from './CharacterData_Nereia';
import { KASHA_CHARACTER } from './CharacterData_Kasha';
import { FUGU_CHARACTER } from './CharacterData_Fugu';
import { CATFISH_CHARACTER } from './CharacterData_Catfish';
import { CARP_CHARACTER } from './CharacterData_Carp';
import { PERCH_CHARACTER } from './CharacterData_Perch';
import { EEL_CHARACTER } from './CharacterData_Eel';
import { PIKE_CHARACTER } from './CharacterData_Pike';
import { TROUT_CHARACTER } from './CharacterData_Trout';

class CharacterRegistry {
  private characters: Map<string, CharacterConfig> = new Map();
  private orderedIds: string[] = [];

  /** Register a character configuration. Insertion order is preserved. */
  register(config: CharacterConfig): void {
    if (!this.characters.has(config.id)) this.orderedIds.push(config.id);
    this.characters.set(config.id, config);
  }

  /** First-registered character id, used as the default starting fish. */
  getDefaultCharacterId(): string {
    if (this.orderedIds.length === 0) {
      throw new Error('[CharacterRegistry] No characters registered');
    }
    return this.orderedIds[0];
  }

  /** Get a character by ID */
  getCharacter(id: string): CharacterConfig | undefined {
    return this.characters.get(id);
  }

  /** Get all registered character IDs (registration order). */
  getAllCharacterIds(): string[] {
    return this.orderedIds.slice();
  }

  /** Get all registered characters (registration order). */
  getAllCharacters(): CharacterConfig[] {
    const out: CharacterConfig[] = [];
    for (const id of this.orderedIds) {
      const c = this.characters.get(id);
      if (c) out.push(c);
    }
    return out;
  }

  /**
   * Get characters available given current flags and equipped lure.
   * Checks unlockCondition and lure attraction.
   */
  getAvailableCharacters(
    flags: Record<string, boolean | number>,
    equippedLureId?: string,
  ): CharacterConfig[] {
    return this.getAllCharacters().filter(c => {
      if (!c.unlockCondition(flags)) return false;
      if (equippedLureId) {
        return c.preferredLures.includes(equippedLureId) ||
               !c.dislikedLures.includes(equippedLureId);
      }
      return true;
    });
  }

  /** Get characters that prefer a given lure */
  getCharactersByLure(lureId: string): CharacterConfig[] {
    return this.getAllCharacters().filter(c =>
      c.preferredLures.includes(lureId) && !c.dislikedLures.includes(lureId),
    );
  }

  /** Get characters that dislike a given lure */
  getCharactersDislikingLure(lureId: string): CharacterConfig[] {
    return this.getAllCharacters().filter(c => c.dislikedLures.includes(lureId));
  }

  /** Get characters that appear in a given lake zone */
  getCharactersByZone(zone: LakeZone): CharacterConfig[] {
    return this.getAllCharacters().filter(c => c.lakeZones.includes(zone));
  }

  /** Get characters that match both a zone and lure preference */
  getCharactersForZoneAndLure(zone: LakeZone, lureId: string): CharacterConfig[] {
    return this.getAllCharacters().filter(c =>
      c.lakeZones.includes(zone) &&
      c.preferredLures.includes(lureId) &&
      !c.dislikedLures.includes(lureId),
    );
  }

  /** Get a cast by index for a character (clamped to valid range). */
  getCast(characterId: string, castIndex: number): CastData | undefined {
    const character = this.characters.get(characterId);
    if (!character) return undefined;
    const casts = character.getCasts();
    if (casts.length === 0) return undefined;
    const idx = Math.min(Math.max(castIndex, 0), casts.length - 1);
    return casts[idx];
  }

  /** Get the beats of the cast at the given index for a character. */
  getBeats(characterId: string, castIndex: number = 0): Beat[] {
    const cast = this.getCast(characterId, castIndex);
    if (!cast) return [];
    return cast.beats.map(b => ({ ...b, seen: false }));
  }

  /** Total number of casts in this character's arc. */
  getCastCount(characterId: string): number {
    const character = this.characters.get(characterId);
    if (!character) return 0;
    return character.getCasts().length;
  }

  /** Whether the player has progressed past the last available cast. */
  isArcExhausted(characterId: string, castIndex: number): boolean {
    return castIndex >= this.getCastCount(characterId);
  }

  /** Get catch sequence data for a character */
  getCatchSequenceData(characterId: string): CatchSequenceData | undefined {
    return this.characters.get(characterId)?.catchSequenceData;
  }

  /** Get the (single) quest hint string for a character. */
  getQuestHint(characterId: string): string {
    return this.characters.get(characterId)?.questHint ?? 'A mystery remains...';
  }

  /** Get quest name for a character */
  getQuestName(characterId: string): string {
    return this.characters.get(characterId)?.questName ?? 'Unknown Quest';
  }

  /** Get every CG declared by every registered character. */
  getAllCGs(): CGData[] {
    const out: CGData[] = [];
    for (const c of this.getAllCharacters()) {
      if (c.cgs) out.push(...c.cgs);
    }
    return out;
  }

  /** Map from CG id → TextureAsset (for fullscreen viewer + thumbnails). */
  getCGTextureMap(): Record<string, TextureAsset> {
    const map: Record<string, TextureAsset> = {};
    for (const cg of this.getAllCGs()) {
      map[cg.id] = cg.thumbnailTexture;
    }
    return map;
  }

  /**
   * Get the display name for a character, taking into account
   * the trueName/trueNameFlag system. If the character has a trueName
   * and the associated flag is set, returns trueName; otherwise returns name.
   */
  getDisplayName(characterId: string, flags: Record<string, boolean | number>): string {
    const char = this.characters.get(characterId);
    if (!char) return '???';
    if (char.trueName && char.trueNameFlag && flags[char.trueNameFlag]) {
      return char.trueName;
    }
    return char.name;
  }
}

// === Singleton Registry ===
export const characterRegistry = new CharacterRegistry();

// === Register all implemented characters ===
characterRegistry.register(NEREIA_CHARACTER);
characterRegistry.register(KASHA_CHARACTER);
characterRegistry.register(FUGU_CHARACTER);
characterRegistry.register(CATFISH_CHARACTER);
characterRegistry.register(CARP_CHARACTER);
characterRegistry.register(PERCH_CHARACTER);
characterRegistry.register(EEL_CHARACTER);
characterRegistry.register(PIKE_CHARACTER);
characterRegistry.register(TROUT_CHARACTER);
