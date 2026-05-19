/**
 * CharacterData_Soma — Sōma's character configuration.
 *
 * Dialogue content lives in Story_Soma.ts. This file only holds metadata,
 * catch sequence, recipes, and character config.
 */

import type { CharacterConfig, CGData, CastData, FishCharacter, EndingData, Recipe } from './Types';
import { DriftState, ExpressionState, Phase, ANY_LURE } from './Types';
import { inkCast } from './InkBeatAdapter';
import { somaNeutralTexture, cgSomaLoveEndTexture, cgSomaReleaseEndTexture } from './Assets';

const CHARACTER_ID = 'soma';
const SOMA_PORTRAIT_SPRITE = 'sprites/soma_neutral.png';

// ============================================================
// Cast definitions — dialogue pulled from Ink
// ============================================================

interface CastDef {
  start: string;
  name: string;
}

const SOMA_CAST_DEFS: CastDef[] = [
  { start: 'soma_t1_c1_b1',  name: 'The Bench'        },
  { start: 'soma_t1_c2_b1',  name: 'Cold Coffee'      },
  { start: 'soma_t2_c3_b1',  name: 'The Plaza'        },
  { start: 'soma_t2_c4_b1',  name: 'Noticing Absence' },
  { start: 'soma_t3_c5_b1',  name: 'The Staircase'    },
  { start: 'soma_t3_c6_b1',  name: 'Without Purpose'  },
  { start: 'soma_t4_c7_b1',  name: 'The Problem'      },
  { start: 'soma_t4_c8_b1',  name: 'The Wall'         },
  { start: 'soma_t5_c9_b1',  name: 'Deep Water'       },
  { start: 'soma_t5_c10_b1', name: 'The Choice'       },
];

// ============================================================
// Catch sequence + drift-away journal text
// ============================================================

const SOMA_ENDINGS: Record<string, EndingData> = {
  reel: {
    epitaph: 'The coffee is warm.\n\nHe did not ask for it.\n\nBut he did not refuse.',
  },
  release: {
    epitaph: 'The bench is empty.\n\nThe coffee is cold.\n\nHe will sit somewhere else tomorrow.\n\nThat is enough.',
  },
  // No drift_away — Sōma's arc is not designed with a bad ending path.
};

// ============================================================
// Cast lookup — built lazily on demand (adapter caches internally)
// ============================================================

function getCasts(): CastData[] {
  return SOMA_CAST_DEFS.map(d => inkCast(CHARACTER_ID, d.start, d.name));
}

// ============================================================
// Encounter recipes — Sōma's narrative meeting points
// ============================================================
// `home` is his default spot (the bench, mid + night). It stays active across
// the arc and toggles off only when a cast tells the player "I am elsewhere
// now". The home dispatcher (in Story_Soma.ts) routes by quest flags so a
// single recipe covers c1, c2, c4, c6 and any "wrong-lure" loop.
//
// Other recipes are punctual rendez-vous that intercept home when they match:
//   cafe       → c3 — the player brings something warm (gold_teardrop)
//   staircase  → c5 — daytime parenthesis at the same bench (mid + day)
//   parkT4     → c7/c8 — he has retreated to the far banks in daylight
//   riverT5    → c9 — far + night, waiting before the climax
//   climaxT5   → c10 — final cast, gold_teardrop required
//
// Main-fish recipes use higher priority to win ties over ambient NPCs.
const SOMA_RECIPES: Recipe[] = [
  { id: 'home',      zone: 'mid', phase: Phase.Night, lure: ANY_LURE,        initial: true, priority: 1 },
  { id: 'cafe',      zone: 'mid', phase: Phase.Night, lure: 'gold_teardrop', priority: 3 },
  { id: 'staircase', zone: 'mid', phase: Phase.Day,   lure: ANY_LURE,        priority: 3 },
  { id: 'parkT4',    zone: 'far', phase: Phase.Day,   lure: ANY_LURE,        priority: 4 },
  { id: 'riverT5',   zone: 'far', phase: Phase.Night, lure: ANY_LURE,        priority: 5 },
  { id: 'climaxT5',  zone: 'far', phase: Phase.Night, lure: 'gold_teardrop', priority: 6 },
];

// ============================================================
// CG Gallery
// ============================================================

const SOMA_CGS: CGData[] = [
  {
    id: 'portrait_soma',
    characterId: CHARACTER_ID,
    name: 'Sōma',
    description: 'First encounter with the exhausted tench.',
    unlockCondition: 'Meet Sōma for the first time',
    thumbnailPath: SOMA_PORTRAIT_SPRITE,
    thumbnailTexture: somaNeutralTexture,
  },
  {
    id: 'ending_soma_reel',
    characterId: CHARACTER_ID,
    name: 'The Warm Thing',
    description: 'The coffee is warm. He did not ask for it. But he did not refuse.',
    unlockCondition: 'Choose "Reel" in Sōma\'s catch sequence',
    thumbnailPath: SOMA_PORTRAIT_SPRITE,
    thumbnailTexture: cgSomaLoveEndTexture,
  },
  {
    id: 'ending_soma_release',
    characterId: CHARACTER_ID,
    name: 'The Empty Bench',
    description: 'The bench is empty. The coffee is cold. He will sit somewhere else tomorrow.',
    unlockCondition: 'Choose "Release" in Sōma\'s catch sequence',
    thumbnailPath: SOMA_PORTRAIT_SPRITE,
    thumbnailTexture: cgSomaReleaseEndTexture,
  },
];

// ============================================================
// Character configuration (exported)
// ============================================================

export const SOMA_CHARACTER: CharacterConfig = {
  id: CHARACTER_ID,
  name: 'Sōma',
  species: 'Tench',
  accentColor: '#5B8A72',

  portraitAssets: {
    neutral: '@sprites/soma_neutral.png',
  },
  portraitTexture: somaNeutralTexture,
  portraitSpritePath: SOMA_PORTRAIT_SPRITE,

  recipes: SOMA_RECIPES,

  unlockCondition: () => true,

  questName: 'The Exhausted Caretaker',
  questHint: 'He sits alone, pretending not to notice. Come without pretense...',

  getCasts,

  initialState: (): FishCharacter => ({
    id: CHARACTER_ID,
    name: 'Sōma',
    species: 'Tench',
    accentColor: '#5B8A72',
    currentExpression: ExpressionState.Neutral,
    affection: 0,
    currentDrift: DriftState.None,
    portrait: somaNeutralTexture,
  }),

  endings: SOMA_ENDINGS,

  // 10-step narrative progression for the HUD gauge.
  progressionMilestones: [
    'met.soma',                   // c1 first contact
    'quest.soma.t1_done',         // c2 end of T1
    'quest.soma.t2_c3_done',      // c3
    'quest.soma.t2_done',         // c4 end of T2
    'quest.soma.t3_c5_done',      // c5
    'quest.soma.t3_done',         // c6 end of T3
    'quest.soma.t4_c7_done',      // c7
    'quest.soma.t4_done',         // c8 end of T4
    'quest.soma.t5_c9_done',      // c9
    'soma.ending_complete',       // c10 ending reached
  ],

  facts: [
    {
      flagKey: 'fact.soma.appearance',
      text: 'Olive-green with tired eyes. Slow but precise movements — like someone conserving energy.',
    },
    {
      flagKey: 'fact.soma.reads',
      text: 'Reads compulsively — anything to avoid being still.',
    },
    {
      flagKey: 'fact.soma.deflects',
      text: 'Deflects personal questions with clinical precision.',
    },
    {
      flagKey: 'fact.soma.burnout',
      text: 'Burned out from years of caring for others. Forgot to stop.',
    },
    {
      flagKey: 'fact.soma.collapse',
      text: 'Collapsed one night and nobody noticed for three hours.',
    },
    {
      flagKey: 'fact.soma.afraid',
      text: 'Afraid that needing help makes him a burden.',
    },
    {
      flagKey: 'fact.soma.confession',
      text: 'Admitted he doesn\'t remember the last time he wanted something for himself.',
    },
    {
      flagKey: 'fact.soma.wall',
      text: 'The wall isn\'t to keep people out. It\'s to keep himself from asking them to stay.',
    },
  ],

  cgs: SOMA_CGS,
};
