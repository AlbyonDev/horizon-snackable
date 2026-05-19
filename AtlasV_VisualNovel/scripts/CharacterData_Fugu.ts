/**
 * CharacterData_Fugu — Fugu's character configuration.
 *
 * Dialogue content (including the fish's goodbye lines per Ink Authoring
 * Guide §4.4) lives in Story_Fugu.ts. This file only holds metadata,
 * catch sequence, and character config.
 */

import type { CharacterConfig, CGData, CastData, FishCharacter, EndingData, Recipe } from './Types';
import { DriftState, ExpressionState, Phase, ANY_LURE } from './Types';
import { inkCast } from './InkBeatAdapter';
import { fuguNeutralTexture, cgFuguDriftAwayTexture, cgFuguLoveEndTexture, cgFuguReleaseEndTexture } from './Assets';

const CHARACTER_ID = 'fugu';
const FUGU_PORTRAIT_SPRITE = 'sprites/char_pufferfish_neutral.png';

// ============================================================
// Cast definitions — dialogue pulled from Ink
// ============================================================

interface CastDef {
  start: string;
  name: string;
}

const FUGU_CAST_DEFS: CastDef[] = [
  { start: 'fugu_t1_c1_b1',  name: 'Someone Sees Me!'          },
  { start: 'fugu_t1_c2_b1',  name: 'The Return'                },
  { start: 'fugu_t2_c3_b1',  name: 'The Spines'                },
  { start: 'fugu_t2_c4_b1',  name: 'Control'                   },
  { start: 'fugu_t3_c5_b1',  name: 'Imaginary Friends'         },
  { start: 'fugu_t3_c6_b1',  name: 'The Monster'               },
  { start: 'fugu_t4_c7_b1',  name: 'The First Silence'         },
  { start: 'fugu_t4_c8_b1',  name: 'My First Friend'           },
  { start: 'fugu_t5_c9_b1',  name: 'Hope'                      },
  { start: 'fugu_t5_c10_b1', name: 'The Choice'                },
];

// ============================================================
// Catch sequence + drift-away journal text
// ============================================================

const FUGU_ENDINGS: Record<string, EndingData> = {
  reel: {
    epitaph: 'In a small apartment, Fugu paces in tight circles.\n\nHe smiles.\n\nFor the first time, he\'s not alone.\n\nEven if it\'s forever.',
  },
  release: {
    epitaph: 'Fugu walks home alone, then loops back twice to wave.\n\nHe still keeps his sleeves down past his wrists.\n\nBut he learned that you can be loved without being possessed.\n\nHe comes back every morning. Every morning.',
  },
  drift_away: {
    epitaph: 'The alley is empty.\n\nFugu has gone back to the rocks.\n\nMaybe he still talks to them.',
  },
};

// ============================================================
// Cast lookup — built lazily on demand (adapter caches internally)
// ============================================================

function getCasts(): CastData[] {
  return FUGU_CAST_DEFS.map(d => inkCast(CHARACTER_ID, d.start, d.name));
}

// ============================================================
// Character configuration (exported)
// ============================================================

const FUGU_CGS: CGData[] = [
  {
    id: 'portrait_fugu',
    characterId: CHARACTER_ID,
    name: 'Fugu',
    description: 'First encounter with the lonesome poison-skinned boy.',
    unlockCondition: 'Meet Fugu for the first time',
    thumbnailPath: FUGU_PORTRAIT_SPRITE,
    thumbnailTexture: fuguNeutralTexture,
  },
  {
    id: 'ending_fugu_drift_away',
    characterId: CHARACTER_ID,
    name: 'The Alley Is Empty',
    description: 'Fugu has gone back to the alleys. Maybe he still talks to the rocks.',
    unlockCondition: 'Fugu drifts away after being scared 3 times',
    thumbnailPath: 'sprites/fugu_drift_away.png',
    thumbnailTexture: cgFuguDriftAwayTexture,
  },
  {
    id: 'ending_fugu_reel',
    characterId: CHARACTER_ID,
    name: 'Tight Circles',
    description: 'For the first time, he\'s not alone. Even if it\'s forever.',
    unlockCondition: 'Choose "Reel" in Fugu\'s catch sequence',
    thumbnailPath: 'sprites/fugu_love_end.png',
    thumbnailTexture: cgFuguLoveEndTexture,
  },
  {
    id: 'ending_fugu_release',
    characterId: CHARACTER_ID,
    name: 'Walks Home Alone',
    description: 'Fugu walks home alone, then turns around to wave.\n\nHe loops back twice just to make sure you saw.\n\nHe learned that you can be loved without being possessed.\n\nHe comes back every morning. Every morning.',
    unlockCondition: 'Choose "Release" in Fugu\'s catch sequence',
    thumbnailPath: 'sprites/fugu_release_end.png',
    thumbnailTexture: cgFuguReleaseEndTexture,
  },
];

// ============================================================
// Encounter recipes — Fugu's 5-tier arc
// ============================================================
// Each tier transition activates the next recipe via Ink (`#flag:recipe.fugu.X`)
// and clears the previous one. `home` is the only `initial: true` slot.
//
//   home       → T1 introduction      (Near + Day + any lure)
//   nightT2    → T2 quieter night     (Near + Night + any lure)
//   spinnerT3  → T3 he wants the red  (Near + Night + red_spinner)
//   parkT4     → T4 daytime in park   (Near + Day + any lure)
//   climaxT5   → T5 the feather fly   (Near + Day + feather_fly)
// Main-fish recipes use priority: 1 to win ties over ambient NPCs.
// T1 is accessible day OR night for first contact (home + homeNight, both initial).
// Their dispatcher routes both to the same beat; the dialogue is time-agnostic.
const FUGU_RECIPES: Recipe[] = [
  { id: 'home',      zone: 'near', phase: Phase.Day,   lure: ANY_LURE,     initial: true, priority: 1 },
  { id: 'nightT2',   zone: 'near', phase: Phase.Night, lure: ANY_LURE,     priority: 2 },
  { id: 'spinnerT3', zone: 'near', phase: Phase.Night, lure: 'red_spinner', priority: 3 },
  { id: 'parkT4',    zone: 'near', phase: Phase.Day,   lure: ANY_LURE,     priority: 4},
  { id: 'climaxT5',  zone: 'near', phase: Phase.Day,   lure: 'feather_fly', priority: 5 },
];

export const FUGU_CHARACTER: CharacterConfig = {
  id: CHARACTER_ID,
  name: 'Fugu',
  species: 'Pufferfish',
  accentColor: '#FFB84D',

  portraitAssets: {
    neutral: '@sprites/char_pufferfish_neutral.png',
  },
  portraitTexture: fuguNeutralTexture,
  portraitSpritePath: FUGU_PORTRAIT_SPRITE,

  recipes: FUGU_RECIPES,

  unlockCondition: () => true,

  questName: 'The True Friend',
  questHint: 'He just wants to be heard. Come back. Play. Stay. Don\'t take. Time is the proof — every visit counts.',

  getCasts,

  initialState: (): FishCharacter => ({
    id: CHARACTER_ID,
    name: 'Fugu',
    species: 'Pufferfish',
    accentColor: '#FFB84D',
    currentExpression: ExpressionState.Neutral,
    affection: 0,
    currentDrift: DriftState.None,
    portrait: fuguNeutralTexture,
  }),

  endings: FUGU_ENDINGS,

  // 10-step narrative progression for the HUD gauge. Each cast set its flag
  // at the terminal beat; reaching them all means the full arc is unlocked.
  progressionMilestones: [
    'met.fugu',                // c1 first contact
    'quest.fugu.t1_done',      // c2 end of T1
    'quest.fugu.t2_c3_done',   // c3 end
    'quest.fugu.t2_done',      // c4 end of T2
    'quest.fugu.t3_c5_done',   // c5 end
    'quest.fugu.t3_done',      // c6 end of T3
    'quest.fugu.t4_c7_done',   // c7 end
    'quest.fugu.t4_done',      // c8 end of T4
    'quest.fugu.t5_c9_done',   // c9 end
    'fugu.ending_complete',    // c10 ending reached (any of Reel/Release/DriftAway)
  ],

  facts: [
    {
      flagKey: 'fact.fugu.appearance',
      text: 'Warm orange and gold, always layered in long sleeves.',
    },
    {
      flagKey: 'fact.fugu.talks',
      text: 'Talks nonstop to fill the silence.',
    },
    {
      flagKey: 'fact.fugu.toxic',
      text: 'Carries a hidden poison in his skin — spines that rise when he panics.',
    },
    {
      flagKey: 'fact.fugu.alone',
      text: 'Grew up alone. His family called his condition a curse and left him.',
    },
    {
      flagKey: 'fact.fugu.dream',
      text: "Dreams of having a friend who isn't afraid of him.",
    },
    {
      flagKey: 'fact.fugu.puffs',
      text: 'The spines bristle through his sleeves when he gets too excited or too scared.',
    },
  ],

  cgs: FUGU_CGS,
};
