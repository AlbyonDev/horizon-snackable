/**
 * CharacterData_Kasha — Kasha's character configuration.
 *
 * Dialogue content (including the fish's goodbye lines per Ink Authoring
 * Guide §4.4) lives in Story_Kasha.ts. This file only holds metadata,
 * catch sequence, recipes, and character config.
 */

import type { CharacterConfig, CGData, CastData, FishCharacter, CatchSequenceData, Recipe } from './Types';
import { DriftState, ExpressionState, Phase, ANY_LURE } from './Types';
import { inkCast } from './InkBeatAdapter';
import { kashaNeutralTexture, cgKashaLoveEndTexture, cgKashaReleaseEndTexture, cgKashaDriftAwayTexture } from './Assets';

const CHARACTER_ID = 'kasha';
const KASHA_PORTRAIT_SPRITE = 'sprites/char_veiltail_neutral.png';

// ============================================================
// Cast definitions (start node + display name) — dialogue from Ink
// ============================================================

interface CastDef {
  start: string;
  name: string;
}

const KASHA_CAST_DEFS: CastDef[] = [
  { start: 'kasha_t1_c1_b1',  name: 'The Champion'           },
  { start: 'kasha_t1_c2_b1',  name: 'The Audience'           },
  { start: 'kasha_t2_c3_b1',  name: 'The Test'               },
  { start: 'kasha_t2_c4_b1',  name: 'The Lie She Told'       },
  { start: 'kasha_t3_c5_b1',  name: 'The Thing About Before' },
  { start: 'kasha_t3_c6_b1',  name: 'The Day After'          },
  { start: 'kasha_t3_c7_b1',  name: 'The Question She Asks'  },
  { start: 'kasha_t4_c8_b1',  name: 'The Offer'              },
  { start: 'kasha_t4_c9_b1',  name: 'The Trophy Refused'     },
  // T5 has two parallel branches locked in by the T4 c8_b2 choice:
  //   - release branch (default, neutral, or DRIFT at T4) = 'The Name'
  //   - catch branch (REEL at T4)                         = 'The Name We Walk With'
  // For the journal cast list we expose the release branch as the canonical
  // T5 entry. The catch branch is reached purely via the dispatcher.
  { start: 'kasha_t5_release_b1', name: 'The Name'               },
];

// ============================================================
// Catch sequence + drift-away journal text
// ============================================================

const KASHA_CATCH_SEQUENCE_DATA: CatchSequenceData = {
  reelEpitaph: 'She wanted to be chosen.\n\nChosen is not the same as taken.\n\nShe had told you the difference.',
  releaseEpitaph: 'She wanted to be a person.\n\nNot a prize.\n\nYou let her be the person she was.\n\nShe comes back tomorrow.\n\nShe will keep coming back.',
};

const KASHA_DRIFT_AWAY_JOURNAL_TEXT =
  'The corner is empty.\n\nOther voices, briefly, mention that she talked about you a lot.\n\nThey are surprised that you are not surprised.';

// ============================================================
// Cast lookup — built lazily on demand (adapter caches internally)
// ============================================================

function getCasts(): CastData[] {
  return KASHA_CAST_DEFS.map(d => inkCast(CHARACTER_ID, d.start, d.name));
}

// ============================================================
// Encounter recipes — Kasha's 5-tier arc (mid waters)
// ============================================================
// Main-fish recipes use priority: 1 to win ties over ambient NPCs.
// T1 is accessible day OR night for first contact.
const KASHA_RECIPES: Recipe[] = [
  { id: 'home',      zone: 'mid', phase: Phase.Day,   lure: ANY_LURE,      initial: true, priority: 1 },
  { id: 'homeNight', zone: 'mid', phase: Phase.Night, lure: ANY_LURE,      initial: true, priority: 1 },
  { id: 'challenge', zone: 'mid', phase: Phase.Day,   lure: 'red_spinner', priority: 1 },
  { id: 'corner',    zone: 'mid', phase: Phase.Night, lure: 'bare_hook',   priority: 1 },
  { id: 'offer',     zone: 'mid', phase: Phase.Night, lure: ANY_LURE,      priority: 1 },
  { id: 'name',      zone: 'mid', phase: Phase.Day,   lure: ANY_LURE,      priority: 1 },
];

// ============================================================
// Character configuration (exported)
// ============================================================

const KASHA_CGS: CGData[] = [
  {
    id: 'portrait_kasha',
    characterId: CHARACTER_ID,
    name: 'Kasha',
    description: 'First encounter with the crimson veiltail.',
    unlockCondition: 'Meet Kasha for the first time',
    thumbnailPath: KASHA_PORTRAIT_SPRITE,
    thumbnailTexture: kashaNeutralTexture,
  },
  {
    id: 'ending_kasha_reel',
    characterId: CHARACTER_ID,
    name: 'The Trophy',
    description: 'She wanted to be chosen.',
    unlockCondition: "Complete Kasha's Reel ending",
    thumbnailPath: '@sprites/kasha_love_end.png',
    thumbnailTexture: cgKashaLoveEndTexture,
  },
  {
    id: 'ending_kasha_release',
    characterId: CHARACTER_ID,
    name: 'The Name',
    description: 'She wanted to be a person, not a prize.\n\nYou let her be.\n\nShe comes back tomorrow. She will keep coming back.',
    unlockCondition: "Choose \"Release\" in Kasha's catch sequence",
    thumbnailPath: '@sprites/kasha_release_end.png',
    thumbnailTexture: cgKashaReleaseEndTexture,
  },
  {
    id: 'ending_kasha_drift_away',
    characterId: CHARACTER_ID,
    name: 'The Empty Corner',
    description: 'The corner is empty.',
    unlockCondition: 'Kasha leaves after repeated DRIFT_SCARED',
    thumbnailPath: '@sprites/kasha_drift_away.png',
    thumbnailTexture: cgKashaDriftAwayTexture,
  },
];

export const KASHA_CHARACTER: CharacterConfig = {
  id: CHARACTER_ID,
  name: 'Kasha',
  trueName: 'Aki',
  trueNameFlag: 'secret.kasha.real_name_given',
  species: 'Siamese Fighting Fish (Betta)',
  accentColor: '#D33A2C',

  portraitAssets: {
    neutral: '@sprites/char_veiltail_neutral.png',
  },
  portraitTexture: kashaNeutralTexture,
  portraitSpritePath: KASHA_PORTRAIT_SPRITE,

  recipes: KASHA_RECIPES,

  unlockCondition: () => true,

  questName: 'The Championship',
  questHint: "She tests everyone. Stay when she tells you to leave. Push back without being cruel. Listen when she goes quiet.",

  getCasts,

  initialState: (): FishCharacter => ({
    id: CHARACTER_ID,
    name: 'Kasha',
    species: 'Siamese Fighting Fish (Betta)',
    accentColor: '#D4833A',
    currentExpression: ExpressionState.Neutral,
    affection: 0,
    currentDrift: DriftState.None,
    portrait: kashaNeutralTexture,
  }),

  catchSequenceData: KASHA_CATCH_SEQUENCE_DATA,
  driftAwayJournalText: KASHA_DRIFT_AWAY_JOURNAL_TEXT,

  // 10-step narrative progression for the HUD gauge.
  progressionMilestones: [
    'met.kasha',                  // c1
    'quest.kasha.t1_done',        // c2 end of T1
    'quest.kasha.t2_c3_done',     // c3
    'quest.kasha.t2_done',        // c4 end of T2
    'quest.kasha.t3_c5_done',     // c5
    'quest.kasha.t3_c6_done',     // c6
    'quest.kasha.t3_done',        // c7 end of T3
    'quest.kasha.t4_c8_done',     // c8
    'quest.kasha.t4_done',        // c9 end of T4
    'kasha.ending_complete',      // c10 ending reached (any of Reel/Release/DriftAway)
  ],

  facts: [
    {
      flagKey: 'fact.kasha.appearance',
      text: 'A vivid red betta with orange-gold fin tips.',
    },
    {
      flagKey: 'fact.kasha.champion',
      text: 'Claims to be the champion of her corner.',
    },
    {
      flagKey: 'fact.kasha.baka',
      text: 'Calls Floater "baka" as a term of endearment.',
    },
    {
      flagKey: 'fact.kasha.third_person',
      text: 'Refers to herself in third person when stressed.',
    },
    {
      flagKey: 'fact.kasha.origin',
      text: 'Came from somewhere else. Left because she was second.',
    },
    {
      flagKey: 'fact.kasha.real_name',
      text: 'Her real name is Aki (revealed in final cast).',
    },
  ],

  cgs: KASHA_CGS,
};
