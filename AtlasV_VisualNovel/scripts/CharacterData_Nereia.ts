/**
 * CharacterData_Nereia — Nereia's character configuration.
 *
 * Dialogue content (including the fish's goodbye lines per Ink Authoring
 * Guide §4.4) lives in Story_Nereia.ts. This file only holds metadata,
 * catch sequence, recipes, and character config.
 */

import type { CharacterConfig, CGData, CastData, FishCharacter, EndingData, Recipe } from './Types';
import { DriftState, ExpressionState, Phase, ANY_LURE } from './Types';
import { inkCast } from './InkBeatAdapter';
import { nereiaNeutralTexture, cgNereiaLoveEndTexture, cgNereiaReleaseEndTexture } from './Assets';

const CHARACTER_ID = 'nereia';
const NEREIA_PORTRAIT_SPRITE = 'sprites/nereia_neutral.png';

// ============================================================
// Cast definitions — dialogue pulled from Ink
// ============================================================

interface CastDef {
  start: string;
  name: string;
}

const NEREIA_CAST_DEFS: CastDef[] = [
  { start: 'nereia_t1_c1_b1',  name: 'First Contact'                },
  { start: 'nereia_t1_c2_b1',  name: 'The Compliment'               },
  { start: 'nereia_t2_c3_b1',  name: 'The Discrepancy'              },
  { start: 'nereia_t2_c4_b1',  name: 'The Morning You Did Not Come' },
  { start: 'nereia_t3_c5_b1',  name: 'The Directive'                },
  { start: 'nereia_t3_c6_b1',  name: '340 Years'                    },
  { start: 'nereia_t3_c7_b1',  name: 'The Choice'                   },
  { start: 'nereia_t4_c8_b1',  name: 'What Must Be Known'           },
  { start: 'nereia_t4_c9_b1',  name: 'What She Wanted To Say'       },
  { start: 'nereia_t5_c10_b1', name: 'The Last Night'               },
];

// ============================================================
// Catch sequence + drift-away journal text
// ============================================================

const NEREIA_ENDINGS: Record<string, EndingData> = {
  reel: {
    epitaph: 'The data ends here.\n\nThe lake remembers.\n\nShe had said it would be enough.',
  },
  release: {
    epitaph: 'The file is closed.\n\nThe lake remembers.\n\nYou will remember.\n\nIt is more than enough.',
  },
  // No drift_away ending for Nereia — her arc cannot reach affection ≤ -10
  // (min reachable is -4; see __audit_drift_away.js).
};

// ============================================================
// Cast lookup — built lazily on demand (adapter caches internally)
// ============================================================

function getCasts(): CastData[] {
  return NEREIA_CAST_DEFS.map(d => inkCast(CHARACTER_ID, d.start, d.name));
}

// ============================================================
// Encounter recipes — Nereia's 5-tier arc (far waters)
// ============================================================
// Recipe ids match the `from.nereia.<id>` branches in nereia_entry.
//   home          → T1 first contact   (initial)
//   anomalyT2     → T2 the file cracks (gold teardrop offering)
//   directiveT3   → T3 the directive   (gold teardrop after dark)
//   inheritanceT4 → T4 what she leaves (gold locket again, near the willow)
//   dawnT5        → T5 the last night (the only night she has ever had)
// Main-fish recipes use priority: 1 to win ties over ambient NPCs.
// T1 is accessible day OR night for first contact.
const NEREIA_RECIPES: Recipe[] = [
  { id: 'home',          zone: 'far',  phase: Phase.Day,   lure: ANY_LURE,        initial: true, priority: 1 },
  { id: 'anomalyT2',     zone: 'far',  phase: Phase.Day,   lure: 'gold_teardrop', priority: 1 },
  { id: 'directiveT3',   zone: 'far',  phase: Phase.Day,   lure: 'gold_teardrop', priority: 1 },
  { id: 'inheritanceT4', zone: 'near', phase: Phase.Day,   lure: 'gold_teardrop', priority: 1 },
  { id: 'dawnT5',        zone: 'far',  phase: Phase.Night, lure: ANY_LURE,        priority: 1 },
];

// ============================================================
// Character configuration (exported)
// ============================================================

const NEREIA_CGS: CGData[] = [
  {
    id: 'portrait_nereia',
    characterId: CHARACTER_ID,
    name: 'Nereia',
    description: 'First encounter with the midnight koi.',
    unlockCondition: 'Meet Nereia for the first time',
    thumbnailPath: NEREIA_PORTRAIT_SPRITE,
    thumbnailTexture: nereiaNeutralTexture,
  },
  {
    id: 'ending_nereia_reel',
    characterId: CHARACTER_ID,
    name: 'The Last Night',
    description: 'The data ends here. The lake remembers.',
    unlockCondition: 'Choose "Reel" in Nereia\'s catch sequence',
    thumbnailPath: 'sprites/nereia_love_end.png',
    thumbnailTexture: cgNereiaLoveEndTexture,
  },
  {
    id: 'ending_nereia_release',
    characterId: CHARACTER_ID,
    name: 'The File Is Closed',
    description: 'The lake remembers. You will remember. It is more than enough.',
    unlockCondition: 'Choose Nereia\'s name in the catch sequence',
    thumbnailPath: 'sprites/nereia_release_end.png',
    thumbnailTexture: cgNereiaReleaseEndTexture,
  },
];

export const NEREIA_CHARACTER: CharacterConfig = {
  id: CHARACTER_ID,
  name: 'Nereia',
  species: 'Koi',
  accentColor: '#9B7FCC',

  portraitAssets: {
    neutral: '@sprites/nereia_neutral.png',
  },
  portraitTexture: nereiaNeutralTexture,
  portraitSpritePath: NEREIA_PORTRAIT_SPRITE,

  recipes: NEREIA_RECIPES,

  unlockCondition: () => true,

  questName: 'The Patient Offering',
  questHint: 'Gold catches her eye. Patience holds her gaze. The lure and the silence are both the gift — staying long enough is the proof.',

  getCasts,

  initialState: (): FishCharacter => ({
    id: CHARACTER_ID,
    name: 'Nereia',
    species: 'Koi',
    accentColor: '#9B7FCC',
    currentExpression: ExpressionState.Neutral,
    affection: 0,
    currentDrift: DriftState.None,
    portrait: nereiaNeutralTexture,
  }),

  endings: NEREIA_ENDINGS,

  // 10-step narrative progression for the HUD gauge.
  progressionMilestones: [
    'met.nereia',                    // c1 first contact
    'quest.nereia.t1_done',          // c2 end of T1
    'quest.nereia.t2_c3_done',       // c3
    'quest.nereia.t2_done',          // c4 end of T2
    'quest.nereia.t3_c5_done',       // c5
    'quest.nereia.t3_c6_done',       // c6
    'quest.nereia.t3_done',          // c7 end of T3
    'quest.nereia.t4_c8_done',       // c8
    'quest.nereia.t4_done',          // c9 end of T4
    'nereia.ending_complete',        // c10 ending reached (any of Reel/Release/DriftAway)
  ],

  facts: [
    {
      flagKey: 'fact.nereia.ancient',
      text: 'Ancient resident of the pond.',
    },
    {
      flagKey: 'fact.nereia.ornamental',
      text: 'Ornamental scales that shimmer purple and gold.',
    },
    {
      flagKey: 'fact.nereia.formal',
      text: 'Speaks with formal precision.',
    },
    {
      flagKey: 'fact.nereia.counter',
      text: 'Maintains a counter system (T-XXXX) tracking something.',
    },
    {
      flagKey: 'fact.nereia.340years',
      text: 'Has been in the pond for 340 years.',
    },
    {
      flagKey: 'fact.nereia.directive',
      text: 'Received a directive she refuses to follow.',
    },
    {
      flagKey: 'fact.nereia.file',
      text: 'Keeps detailed files on pond visitors.',
    },
    {
      flagKey: 'fact.nereia.counter_meaning',
      text: 'The T-counter measures the time she has left before she must leave.',
    },
  ],

  cgs: NEREIA_CGS,
};
