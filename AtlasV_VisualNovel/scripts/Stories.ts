/**
 * Stories — central registry for parsed Ink stories.
 *
 * Imports each character's Ink source string, parses on demand, caches the
 * result.
 *
 * Public surface:
 *   getStory(characterId) → parsed Story
 */

import { parseInk, type Story } from './InkParser';
import { KASHA_STORY } from './Story_Kasha';
import { FUGU_STORY } from './Story_Fugu';
import { NEREIA_STORY } from './Story_Nereia';
import { CATFISH_STORY } from './Story_Catfish';
import { CARP_STORY } from './Story_Carp';
import { PERCH_STORY } from './Story_Perch';
import { EEL_STORY } from './Story_Eel';
import { PIKE_STORY } from './Story_Pike';
import { TROUT_STORY } from './Story_Trout';
import { SOMA_STORY } from './Story_Soma';

const STORY_SOURCES: Record<string, string> = {
  kasha: KASHA_STORY,
  fugu: FUGU_STORY,
  nereia: NEREIA_STORY,
  soma: SOMA_STORY,
  catfish: CATFISH_STORY,
  carp: CARP_STORY,
  perch: PERCH_STORY,
  eel: EEL_STORY,
  pike: PIKE_STORY,
  trout: TROUT_STORY,
};

const STORY_CACHE: Record<string, Story> = {};

export function getStory(characterId: string): Story {
  const cached = STORY_CACHE[characterId];
  if (cached) return cached;
  const src = STORY_SOURCES[characterId];
  if (!src) {
    throw new Error(`[Stories] No story registered for character '${characterId}'`);
  }
  const parsed = parseInk(src);
  STORY_CACHE[characterId] = parsed;
  return parsed;
}
