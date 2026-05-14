/**
 * CharacterData_Trout — NPC fish: quick, curious. Single 4-beat cast.
 *
 * Combo: WAIT → TWITCH → DRIFT → REEL (balanced, variety-seeking).
 */

import type { CharacterConfig, CGData, CastData, FishCharacter, CatchSequenceData } from './Types';
import { DriftState, EmotionIconType, ExpressionState } from './Types';
import { inkCast } from './InkBeatAdapter';
import { troutNeutralTexture } from './Assets';

const CHARACTER_ID = 'trout';
const TROUT_PORTRAIT_SPRITE = 'sprites/trout_neutral.png';

const TROUT_DEPARTURES: CastData['departures'] = {
  [DriftState.Warm]: {
    dialogue: ['*The trout flashes silver and disappears downstream.*', '*The ripples fade.*'],
    icon: EmotionIconType.None,
  },
};

const TROUT_CATCH_SEQUENCE_DATA: CatchSequenceData = {
  reelEpitaph: 'The trout has been caught.',
};

function getCasts(): CastData[] {
  return [
    inkCast(CHARACTER_ID, 'trout_t1_c1_b1', 'The Trout', TROUT_DEPARTURES),
  ];
}

const TROUT_CGS: CGData[] = [
  {
    id: 'portrait_trout',
    characterId: CHARACTER_ID,
    name: 'Trout',
    description: 'A silver flash — quick, curious, always moving.',
    unlockCondition: 'Encounter the trout',
    thumbnailPath: TROUT_PORTRAIT_SPRITE,
    thumbnailTexture: troutNeutralTexture,
  },
];

export const TROUT_CHARACTER: CharacterConfig = {
  id: CHARACTER_ID,
  name: 'Trout',
  species: 'Trout',
  accentColor: '#6B8FA3',

  portraitAssets: {
    neutral: '@sprites/trout_neutral.png',
  },
  portraitTexture: troutNeutralTexture,
  portraitSpritePath: TROUT_PORTRAIT_SPRITE,

  preferredLures: [],
  dislikedLures: [],

  lakeZones: ['near'],

  unlockCondition: () => true,

  encounterRate: 1.0,

  questName: 'The Trout',
  questHint: 'Show it everything. Wait, twitch, drift — it craves variety.',

  getCasts,

  initialState: (): FishCharacter => ({
    id: CHARACTER_ID,
    name: 'Trout',
    species: 'Trout',
    accentColor: '#6B8FA3',
    currentExpression: ExpressionState.Neutral,
    affection: 0,
    currentDrift: DriftState.None,
    portrait: troutNeutralTexture,
  }),

  catchSequenceData: TROUT_CATCH_SEQUENCE_DATA,

  facts: [
    {
      flagKey: 'fact.trout.curious',
      text: 'Fascinated by stillness — it studies what does not move.',
    },
    {
      flagKey: 'fact.trout.playful',
      text: 'Loves a good chase — the dance is half the fun.',
    },
    {
      flagKey: 'fact.trout.balanced',
      text: 'A balanced soul — it craves variety in all things.',
    },
  ],

  cgs: TROUT_CGS,
};
